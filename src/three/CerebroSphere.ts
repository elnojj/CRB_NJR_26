import * as THREE from 'three';
import { LG_V7_OPTICAL, LG_V7_PARTICLES } from '../design/liquidGlassV7';
import { WEBGL_RENDER_ORDER } from './renderOrder';

export interface CerebroSphere {
  group: THREE.Group;
  material: THREE.MeshPhysicalMaterial | null;
  points: THREE.Points;
  /** Call each frame from the EXISTING render loop. Pass the CURRENT
   *  reduced-motion preference so mid-session changes are respected. */
  update: (delta: number, reducedMotion: boolean) => void;
  dispose: () => void;
}

export interface CreateCerebroSphereOptions {
  /**
   * When true, skip the MeshPhysicalMaterial core mesh so an existing
   * HQ shell can remain the glass body (orbits + particles only).
   */
  omitCore?: boolean;
  /** Parent object; when omitted the group is added to `scene`. */
  parent?: THREE.Object3D;
  /** Optional voice level meter (0–1) for emissive rim reactivity. */
  getAudioLevel?: () => number;
}

/**
 * Blueprint V2.0 shared-screen Cerebro sphere:
 * transmission glass + Fresnel rim (`<opaque_fragment>` guard) +
 * three closed orbital tubes + 1800 soft Points with bounded drift.
 */
export function createCerebroSphere(
  scene: THREE.Scene,
  options: CreateCerebroSphereOptions = {}
): CerebroSphere {
  const { omitCore = false, parent, getAudioLevel } = options;
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  let material: THREE.MeshPhysicalMaterial | null = null;

  if (!omitCore) {
    const [segW, segH] = LG_V7_PARTICLES.sphereSegments.navigation;
    const geometry = new THREE.SphereGeometry(6.2, segW, segH);
    material = new THREE.MeshPhysicalMaterial({
      color: 0x4c8dff,
      metalness: LG_V7_OPTICAL.metalness,
      roughness: LG_V7_OPTICAL.roughness,
      transmission: LG_V7_OPTICAL.transmission,
      thickness: LG_V7_OPTICAL.thickness,
      ior: LG_V7_OPTICAL.ior,
      clearcoat: LG_V7_OPTICAL.clearcoat,
      clearcoatRoughness: LG_V7_OPTICAL.clearcoatRoughness,
      attenuationColor: new THREE.Color(0x4c8dff),
      attenuationDistance: 2.5,
      emissive: new THREE.Color(0x1a3a6e),
      emissiveIntensity: 0.35,
    });
    disposables.push(geometry, material);

    material.onBeforeCompile = (shader) => {
      const target = '#include <opaque_fragment>';
      if (!shader.fragmentShader.includes(target)) {
        console.warn(
          `[CerebroSphere] ${target} not found (three r${THREE.REVISION}). ` +
            'Fresnel rim skipped — check the installed three version.'
        );
        return;
      }
      shader.fragmentShader = shader.fragmentShader.replace(
        target,
        /* glsl */ `
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(
          1.0 - clamp(dot(normalize(normal), viewDir), 0.0, 1.0),
          ${LG_V7_OPTICAL.fresnelExponent.toFixed(1)}
        );
        outgoingLight += vec3(0.45, 0.7, 1.0) * fresnel * ${LG_V7_OPTICAL.rimIntensity.toFixed(2)};
        #include <opaque_fragment>
      `
      );
    };

    const sphere = new THREE.Mesh(geometry, material);
    sphere.renderOrder = WEBGL_RENDER_ORDER.refractiveGlassShell;
    material.depthWrite = false;
    material.transparent = true;
    group.add(sphere);
  }

  // v7: exactly two thin orbital rings
  const arcRadii = [7.8, 8.9].slice(0, LG_V7_PARTICLES.rings.count);
  arcRadii.forEach((r, i) => {
    const curve = new THREE.EllipseCurve(0, 0, r, r * 0.35, 0, Math.PI * 2, false, 0);
    const points3D = curve
      .getPoints(LG_V7_PARTICLES.rings.segments)
      .slice(0, -1)
      .map((p) => new THREE.Vector3(p.x, p.y, 0));
    const path = new THREE.CatmullRomCurve3(points3D, true);
    const tubeGeo = new THREE.TubeGeometry(
      path,
      LG_V7_PARTICLES.rings.segments,
      LG_V7_PARTICLES.rings.tubeRadiusWorldUnits,
      8,
      true
    );
    const arcMat = new THREE.MeshBasicMaterial({
      color: i === 1 ? 0xb4ddff : 0x65acff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: true,
    });
    disposables.push(tubeGeo, arcMat);
    const loop = new THREE.Mesh(tubeGeo, arcMat);
    loop.renderOrder = WEBGL_RENDER_ORDER.orbitalRings;
    loop.rotation.x = Math.PI / 2 + i * 0.4;
    loop.rotation.z = i * 0.25;
    group.add(loop);
  });

  const sprite = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  disposables.push(sprite);

  const particleCount = 1800;
  const basePositions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    const rad = 6.4 + Math.random() * 3.2;
    basePositions[i * 3] = rad * Math.sin(theta) * Math.cos(phi);
    basePositions[i * 3 + 1] = rad * Math.sin(theta) * Math.sin(phi);
    basePositions[i * 3 + 2] = rad * Math.cos(theta);
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(basePositions.slice(), 3));
  const pMat = new THREE.PointsMaterial({
    map: sprite,
    color: 0xb4ddff,
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(pGeo, pMat);
  const points = new THREE.Points(pGeo, pMat);
  points.renderOrder = WEBGL_RENDER_ORDER.galaxyParticles;
  group.renderOrder = WEBGL_RENDER_ORDER.cerebroSphereFx;
  group.add(points);

  if (parent) {
    parent.add(group);
  } else {
    scene.add(group);
  }

  let elapsed = 0;
  const AMPLITUDE = 0.06;
  const update = (delta: number, reducedMotion: boolean) => {
    if (material && getAudioLevel) {
      const level = Math.max(0, Math.min(1, getAudioLevel()));
      material.emissiveIntensity = 0.35 + level * 0.5;
    }
    if (reducedMotion) return;
    elapsed += Math.min(delta, 0.05);
    const pos = pGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < particleCount; i++) {
      pos.setY(
        i,
        basePositions[i * 3 + 1] + Math.sin(elapsed * 0.6 + seeds[i]) * AMPLITUDE
      );
    }
    pos.needsUpdate = true;
    group.rotation.y += delta * 0.02;
  };

  const dispose = () => {
    if (parent) {
      parent.remove(group);
    } else {
      scene.remove(group);
    }
    disposables.forEach((d) => d.dispose());
  };

  return { group, material, points, update, dispose };
}
