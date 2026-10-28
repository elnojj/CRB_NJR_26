/**
 * Path A — WebGL GLSL liquid-glass card material.
 * Ports Codrops SDF bevel + UV refraction + Fresnel rim into MeshShaderMaterial
 * compatible with Three.js r186 (no WebGPU/TSL dependency).
 */

import * as THREE from 'three';
import { MEDIA_GLASS_PARAMS, MEDIA_GLASS_QUALITY } from './contracts';

export type MediaGlassQualityTier = 'desktop' | 'tablet' | 'mobile';

function tapsForTier(tier: MediaGlassQualityTier): number {
  switch (tier) {
    case 'desktop':
      return MEDIA_GLASS_QUALITY.desktopRefractionTaps;
    case 'tablet':
      return MEDIA_GLASS_QUALITY.tabletRefractionTaps;
    case 'mobile':
      return MEDIA_GLASS_QUALITY.mobileRefractionTaps;
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

export interface MediaGlassMaterialHandle {
  material: THREE.ShaderMaterial;
  setMap: (map: THREE.Texture | null) => void;
  setHover: (hover: boolean) => void;
  setSelected: (selected: boolean) => void;
  setRimMultiplier: (mult: number) => void;
  dispose: () => void;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

function buildFragment(tapCount: number): string {
  return /* glsl */ `
  uniform sampler2D uMap;
  uniform float uHasMap;
  uniform vec2 uPlaneSize;
  uniform float uCornerRadius;
  uniform float uBevelWidth;
  uniform float uBevelPower;
  uniform float uThickness;
  uniform float uIor;
  uniform float uDispersion;
  uniform float uRefractStrength;
  uniform float uFresnelF0;
  uniform float uEnvIntensity;
  uniform float uRimWidth;
  uniform float uRimIntensity;
  uniform float uRimMult;
  uniform vec3 uTint;
  uniform vec3 uRimColor;
  uniform vec3 uRimColorTop;
  uniform vec3 uAccent;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;

  float roundedBoxSDF(vec2 p, vec2 halfSize, float radius) {
    float r = min(radius, min(halfSize.x, halfSize.y));
    vec2 q = abs(p) - halfSize + r;
    return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
  }

  float bevelHeight(float dist) {
    float edge = clamp(1.0 + dist / max(uBevelWidth, 0.001), 0.0, 1.0);
    float power = max(uBevelPower, 1.0);
    float profile = pow(max(1.0 - pow(edge, power), 0.0), 1.0 / power);
    return profile * uThickness;
  }

  void main() {
    vec2 halfSize = vec2(0.5);
    vec2 p = vUv - 0.5;
    float dist = roundedBoxSDF(p, halfSize, uCornerRadius);

    // Soft AA edge discard
    float alpha = 1.0 - smoothstep(-0.002, 0.002, dist);
    if (alpha < 0.01) discard;

    // Height-derived normals (finite differences on SDF bevel)
    float eps = 0.0025;
    float hC = bevelHeight(dist);
    float hX = bevelHeight(roundedBoxSDF(p + vec2(eps, 0.0), halfSize, uCornerRadius));
    float hY = bevelHeight(roundedBoxSDF(p + vec2(0.0, eps), halfSize, uCornerRadius));
    vec3 normal = normalize(vec3(-(hX - hC) / eps, -(hY - hC) / eps, 1.0));

    vec3 viewDir = normalize(vViewDir);
    vec3 baseColor = uAccent * 0.18;
    if (uHasMap > 0.5) {
      baseColor = texture2D(uMap, vUv).rgb;
    }

    // Self-texture UV refraction with optional RGB dispersion taps
    vec3 refracted = vec3(0.0);
    float tapWeight = 1.0 / float(${tapCount});
    for (int i = 0; i < ${tapCount}; i++) {
      float offset = (float(i) - float(${tapCount - 1}) * 0.5) * uDispersion;
      float eta = 1.0 / max(uIor + offset, 1.0001);
      vec3 ray = refract(-viewDir, normal, eta);
      float travel = uThickness / max(abs(ray.z), 0.05);
      vec2 displaced = vUv + ray.xy * travel * uRefractStrength;
      displaced = clamp(displaced, 0.0, 1.0);
      vec3 sampleRgb = uHasMap > 0.5 ? texture2D(uMap, displaced).rgb : baseColor;
      // Channel bias per tap for light dispersion
      vec3 weight = vec3(tapWeight);
      if (${tapCount} > 1) {
        if (i == 0) weight = vec3(tapWeight * 1.4, tapWeight * 0.7, tapWeight * 0.5);
        else if (i == ${tapCount} - 1) weight = vec3(tapWeight * 0.5, tapWeight * 0.7, tapWeight * 1.4);
      }
      refracted += sampleRgb * weight;
    }

    // Fresnel environment (procedural cool sky — no extra light required)
    float ndotv = saturate(dot(normal, viewDir));
    float fresnel = uFresnelF0 + (1.0 - uFresnelF0) * pow(1.0 - ndotv, 5.0);
    vec3 envColor = mix(vec3(0.08, 0.14, 0.22), vec3(0.55, 0.72, 0.95), normal.y * 0.5 + 0.5);
    envColor += vec3(0.15, 0.25, 0.4) * pow(1.0 - ndotv, 2.0);

    float rim = smoothstep(-uRimWidth, 0.0, dist) * uRimIntensity * uRimMult;
    float rimGrad = saturate(vUv.y);
    vec3 rimColor = mix(uRimColor, uRimColorTop, rimGrad);

    vec3 finished = mix(refracted * uTint, envColor, saturate(fresnel * uEnvIntensity));
    finished += rimColor * rim;
    // Subtle idle shimmer — keep media readable
    finished += vec3(0.02) * sin(uTime * 0.7 + vUv.x * 6.0) * (1.0 - ndotv);

    gl_FragColor = vec4(finished, alpha);
  }
`;
}

export function createMediaGlassMaterial(
  options: {
    map?: THREE.Texture | null;
    accentHex?: string;
    qualityTier?: MediaGlassQualityTier;
  } = {}
): MediaGlassMaterialHandle {
  const tier = options.qualityTier ?? 'desktop';
  const tapCount = tapsForTier(tier);
  const accent = new THREE.Color(options.accentHex ?? '#65ACFF');
  const map = options.map ?? null;

  const uniforms = {
    uMap: { value: map },
    uHasMap: { value: map ? 1 : 0 },
    uPlaneSize: { value: new THREE.Vector2(1, 1) },
    uCornerRadius: { value: MEDIA_GLASS_PARAMS.cornerRadiusRatio },
    uBevelWidth: { value: MEDIA_GLASS_PARAMS.bevelWidthRatio },
    uBevelPower: { value: MEDIA_GLASS_PARAMS.bevelPower },
    uThickness: { value: MEDIA_GLASS_PARAMS.thickness },
    uIor: { value: MEDIA_GLASS_PARAMS.ior },
    uDispersion: { value: MEDIA_GLASS_PARAMS.dispersion },
    uRefractStrength: { value: MEDIA_GLASS_PARAMS.refractionStrength },
    uFresnelF0: { value: MEDIA_GLASS_PARAMS.fresnelF0 },
    uEnvIntensity: { value: MEDIA_GLASS_PARAMS.environmentIntensity },
    uRimWidth: { value: MEDIA_GLASS_PARAMS.rimWidthRatio },
    uRimIntensity: { value: MEDIA_GLASS_PARAMS.rimIntensity },
    uRimMult: { value: 1 },
    uTint: { value: new THREE.Vector3(...MEDIA_GLASS_PARAMS.tintRgb) },
    uRimColor: { value: new THREE.Vector3(...MEDIA_GLASS_PARAMS.rimColorRgb) },
    uRimColorTop: { value: new THREE.Vector3(...MEDIA_GLASS_PARAMS.rimColorTopRgb) },
    uAccent: { value: new THREE.Vector3(accent.r, accent.g, accent.b) },
    uTime: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: buildFragment(tapCount),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  return {
    material,
    setMap: (next) => {
      uniforms.uMap.value = next;
      uniforms.uHasMap.value = next ? 1 : 0;
      material.needsUpdate = true;
    },
    setHover: (hover) => {
      uniforms.uRimMult.value = hover
        ? MEDIA_GLASS_PARAMS.hoverRimMultiplier
        : 1;
    },
    setSelected: (selected) => {
      uniforms.uRimMult.value = selected
        ? MEDIA_GLASS_PARAMS.selectedRimMultiplier
        : 1;
    },
    setRimMultiplier: (mult) => {
      uniforms.uRimMult.value = mult;
    },
    dispose: () => {
      material.dispose();
    },
  };
}

export function tickMediaGlassTime(
  material: THREE.ShaderMaterial,
  elapsedSec: number
): void {
  if (material.uniforms?.uTime) {
    material.uniforms.uTime.value = elapsedSec;
  }
}
