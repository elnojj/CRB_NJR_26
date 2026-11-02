/**
 * MAT_CARDIAC_CONNECTOR — animated energy tube for sphere/node connectors.
 * Double-peaked cardiac pulse + traveling flow along CatmullRom / Bezier tubes.
 * Additive, transparent; never invents alternate glass recipes.
 */
import * as THREE from 'three';

export const MAT_CARDIAC_CONNECTOR_ID = 'MAT_CARDIAC_CONNECTOR' as const;

export type CardiacConnectorUniforms = {
  uTime: { value: number };
  uDimFactor: { value: number };
  uSpeed: { value: number };
  uAudioRms: { value: number };
  uColor: { value: THREE.Color };
  uPulseColor: { value: THREE.Color };
};

export type CardiacConnectorHandle = {
  material: THREE.ShaderMaterial;
  uniforms: CardiacConnectorUniforms;
  dispose: () => void;
};

export type CardiacConnectorOptions = {
  color?: string | number | THREE.Color;
  pulseColor?: string | number | THREE.Color;
  /** Travel speed along the tube (UV units / second). */
  speed?: number;
  /** Starting dim (1 = full, 0.25 = dormant). */
  dimFactor?: number;
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uDimFactor;
  uniform float uSpeed;
  uniform float uAudioRms;
  uniform vec3 uColor;
  uniform vec3 uPulseColor;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormalW;

  void main() {
    // Traveling double-peak cardiac wave along the tube length (vUv.x).
    float phase = fract(vUv.x - uTime * uSpeed);
    float peak1 = exp(-pow((phase - 0.16) * 16.0, 2.0));
    float peak2 = 0.55 * exp(-pow((phase - 0.30) * 20.0, 2.0));
    float heartbeat = peak1 + peak2;

    // Secondary flow dashes — continuous energy, not only systolic spikes.
    float flow = 0.35 + 0.65 * pow(0.5 + 0.5 * sin((vUv.x * 28.0) - uTime * uSpeed * 6.2831), 2.0);

    // Soft tube rim (view-independent normal falloff in world space).
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - clamp(abs(dot(normalize(vNormalW), viewDir)), 0.0, 1.0), 1.8);

    float audio = clamp(uAudioRms, 0.0, 1.0);
    float energy = mix(0.55, 1.15, heartbeat) * mix(0.85, 1.2, flow) * (1.0 + audio * 0.35);
    vec3 base = mix(uColor * 0.7, uPulseColor, heartbeat * 0.82 + audio * 0.12);
    base += uPulseColor * rim * 0.35;

    float alpha = (0.10 + heartbeat * 0.42 + flow * 0.12 + rim * 0.18) * uDimFactor;
    alpha = clamp(alpha, 0.0, 0.92);

    gl_FragColor = vec4(base * energy, alpha);
  }
`;

export function createMatCardiacConnector(
  options: CardiacConnectorOptions = {}
): CardiacConnectorHandle {
  const uniforms: CardiacConnectorUniforms = {
    uTime: { value: 0 },
    uDimFactor: { value: options.dimFactor ?? 1 },
    uSpeed: { value: options.speed ?? 0.38 },
    uAudioRms: { value: 0 },
    uColor: { value: new THREE.Color(options.color ?? 0x65acff) },
    uPulseColor: { value: new THREE.Color(options.pulseColor ?? 0xfff1d4) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  material.name = MAT_CARDIAC_CONNECTOR_ID;

  return {
    material,
    uniforms,
    dispose: () => {
      material.dispose();
    },
  };
}

/** Build a tube mesh on a curve with the cardiac connector shader. */
export function createCardiacConnectorTube(options: {
  curve: THREE.Curve<THREE.Vector3>;
  tubularSegments?: number;
  radius?: number;
  radialSegments?: number;
  color?: string | number | THREE.Color;
  pulseColor?: string | number | THREE.Color;
  speed?: number;
}): {
  mesh: THREE.Mesh;
  geometry: THREE.TubeGeometry;
  handle: CardiacConnectorHandle;
  dispose: () => void;
} {
  const geometry = new THREE.TubeGeometry(
    options.curve,
    options.tubularSegments ?? 48,
    options.radius ?? 0.028,
    options.radialSegments ?? 8,
    false
  );
  const handle = createMatCardiacConnector({
    color: options.color,
    pulseColor: options.pulseColor,
    speed: options.speed,
  });
  const mesh = new THREE.Mesh(geometry, handle.material);
  mesh.name = 'cardiac-connector';
  mesh.renderOrder = 5;
  return {
    mesh,
    geometry,
    handle,
    dispose: () => {
      geometry.dispose();
      handle.dispose();
    },
  };
}
