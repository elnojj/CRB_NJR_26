import * as THREE from 'three';

export type HudGlassMode = 'transmission' | 'flat' | 'matte';

export const HUD_COLORS = {
  carbon: 0x080a0f,
  cobalt: 0x1e5eff,
  cobaltBright: 0x6f9bff,
  text: 0xe9eef5,
  muted: 0x8fa0b4,
  mint: 0x9affe0,
  blue: 0x65acff,
  light: 0xf2f6f8,
  plate: 0x101826,
  plateHover: 0x1a2a46,
} as const;

/**
 * WebKit cannot be trusted with live multi-layer glass behind 3D transforms, so it gets matte carbon-black. Software
 * rasterisers cannot do transmission at interactive rates and get a flat translucent pane instead.
 */
export function resolveHudGlassMode(softwareGl: boolean, webkit: boolean): HudGlassMode {
  if (webkit) return 'matte';
  if (softwareGl) return 'flat';
  return 'transmission';
}

export type HudBend = (x: number, y: number) => THREE.Vector3;

/** Concave bend around the vertical axis: the edges of the slab swing toward the viewer. */
export function createBend(curveRadius: number): HudBend {
  if (curveRadius <= 0) return (x, y) => new THREE.Vector3(x, y, 0);
  return (x, y) => {
    const a = x / curveRadius;
    return new THREE.Vector3(curveRadius * Math.sin(a), y, curveRadius * (1 - Math.cos(a)));
  };
}

/** Pulls points that fall outside a rounded corner back onto the arc; degenerate triangles are invisible. */
function clampToRoundedRect(x: number, y: number, w: number, h: number, r: number): [number, number] {
  const hx = w / 2 - r;
  const hy = h / 2 - r;
  if (Math.abs(x) > hx && Math.abs(y) > hy) {
    const cx = Math.sign(x) * hx;
    const cy = Math.sign(y) * hy;
    let dx = x - cx;
    let dy = y - cy;
    const len = Math.hypot(dx, dy);
    if (len > r) {
      dx *= r / len;
      dy *= r / len;
    }
    return [cx + dx, cy + dy];
  }
  return [x, y];
}

function axisCoords(length: number, radius: number, midSteps: number): number[] {
  const cornerSteps = 8;
  const half = length / 2;
  const out: number[] = [];
  for (let k = 0; k <= cornerSteps; k += 1) out.push(-half + (radius * k) / cornerSteps);
  const innerStart = -half + radius;
  const innerLen = length - radius * 2;
  for (let k = 1; k < midSteps; k += 1) out.push(innerStart + (innerLen * k) / midSteps);
  for (let k = 0; k <= cornerSteps; k += 1) out.push(half - radius + (radius * k) / cornerSteps);
  return out;
}

export function createSlabGeometry(
  w: number,
  h: number,
  radius: number,
  curveRadius: number,
  midStepsX: number,
  midStepsY: number
): THREE.BufferGeometry {
  const r = Math.min(radius, w / 2 - 0.5, h / 2 - 0.5);
  const bend = createBend(curveRadius);
  const xs = axisCoords(w, r, midStepsX);
  const ys = axisCoords(h, r, midStepsY);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const y of ys) {
    for (const x of xs) {
      const [px, py] = clampToRoundedRect(x, y, w, h, r);
      const p = bend(px, py);
      positions.push(p.x, p.y, p.z);
      uvs.push(px / w + 0.5, py / h + 0.5);
    }
  }
  const cols = xs.length;
  for (let j = 0; j < ys.length - 1; j += 1) {
    for (let i = 0; i < cols - 1; i += 1) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = a + cols;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createOutlineGeometry(
  w: number,
  h: number,
  radius: number,
  curveRadius: number,
  zLift = 0.4
): THREE.BufferGeometry {
  const r = Math.min(radius, w / 2 - 0.5, h / 2 - 0.5);
  const bend = createBend(curveRadius);
  const pts: Array<[number, number]> = [];
  const arc = (cx: number, cy: number, from: number) => {
    for (let k = 0; k <= 10; k += 1) {
      const a = from + (Math.PI / 2) * (k / 10);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  const straight = (x0: number, y0: number, x1: number, y1: number) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 14));
    for (let k = 1; k < steps; k += 1) pts.push([x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps]);
  };
  const hx = w / 2 - r;
  const hy = h / 2 - r;
  arc(hx, hy, 0);
  straight(hx, h / 2, -hx, h / 2);
  arc(-hx, hy, Math.PI / 2);
  straight(-w / 2, hy, -w / 2, -hy);
  arc(-hx, -hy, Math.PI);
  straight(-hx, -h / 2, hx, -h / 2);
  arc(hx, -hy, Math.PI * 1.5);
  straight(w / 2, -hy, w / 2, hy);
  const positions: number[] = [];
  for (const [x, y] of pts) {
    const p = bend(x, y);
    positions.push(p.x, p.y, p.z + zLift);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export type HudGlassMaterials = {
  mode: HudGlassMode;
  glass: THREE.Material & { opacity: number };
  tint: (THREE.MeshBasicMaterial & { opacity: number }) | null;
  edge: THREE.LineBasicMaterial;
  glassBaseOpacity: number;
  tintBaseOpacity: number;
  edgeBaseOpacity: number;
};

export function createHudGlassMaterials(mode: HudGlassMode): HudGlassMaterials {
  const edge = new THREE.LineBasicMaterial({
    color: HUD_COLORS.cobalt,
    transparent: true,
    opacity: 0.8,
    depthTest: false,
    depthWrite: false,
  });
  if (mode === 'matte') {
    const glass = new THREE.MeshBasicMaterial({
      color: HUD_COLORS.carbon,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
      depthWrite: false,
    });
    return { mode, glass, tint: null, edge, glassBaseOpacity: 0.92, tintBaseOpacity: 0, edgeBaseOpacity: 0.8 };
  }
  const transmissive = mode === 'transmission';
  const glass = new THREE.MeshPhysicalMaterial({
    color: transmissive ? 0x0c1422 : 0x0b1220,
    transmission: transmissive ? 0.88 : 0,
    roughness: 0.12,
    ior: 1.45,
    thickness: 1.2,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    specularIntensity: 0.8,
    attenuationColor: new THREE.Color(0x0a1a3a),
    attenuationDistance: 2.5,
    envMapIntensity: 0.7,
    transparent: true,
    opacity: transmissive ? 1 : 0.7,
    depthTest: false,
    depthWrite: false,
  });
  const tintBase = transmissive ? 0.34 : 0.2;
  const tint = new THREE.MeshBasicMaterial({
    color: HUD_COLORS.carbon,
    transparent: true,
    opacity: tintBase,
    depthTest: false,
    depthWrite: false,
  });
  return {
    mode,
    glass,
    tint,
    edge,
    glassBaseOpacity: transmissive ? 1 : 0.7,
    tintBaseOpacity: tintBase,
    edgeBaseOpacity: 0.8,
  };
}
