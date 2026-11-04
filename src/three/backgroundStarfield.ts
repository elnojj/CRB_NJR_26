import * as THREE from 'three';

export const STARFIELD_ALPHA = 0.18;
export const STARFIELD_MIN_RADIUS = 70;
export const STARFIELD_MAX_RADIUS = 115;

export interface BackgroundStarfield {
  group: THREE.Group;
  update: (elapsedSeconds: number, motionEnabled: boolean) => void;
  dispose: () => void;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSoftDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildLayer(
  count: number,
  minR: number,
  maxR: number,
  size: number,
  tint: THREE.Color,
  seed: number,
  map: THREE.Texture
): THREE.Points {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const r = minR + (maxR - minR) * Math.cbrt(rand());
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = r * s * Math.cos(phi);
    positions[i * 3 + 1] = r * u;
    positions[i * 3 + 2] = r * s * Math.sin(phi);
    c.copy(tint).lerp(new THREE.Color(0xffffff), rand() * 0.5);
    const lum = 0.45 + rand() * 0.55;
    colors[i * 3] = c.r * lum;
    colors[i * 3 + 1] = c.g * lum;
    colors[i * 3 + 2] = c.b * lum;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size,
    map,
    vertexColors: true,
    transparent: true,
    opacity: STARFIELD_ALPHA,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: false,
    sizeAttenuation: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = -10;
  return points;
}

/**
 * Sparse far-background star drift. Two shells at different radii rotate at different rates so a
 * moving camera reads parallax and scale. Additive, ~18% alpha, never writes depth, ignores fog.
 */
export function createBackgroundStarfield(): BackgroundStarfield {
  const map = createSoftDotTexture();
  const group = new THREE.Group();
  group.name = 'background-starfield';
  const far = buildLayer(
    320,
    (STARFIELD_MIN_RADIUS + STARFIELD_MAX_RADIUS) / 2,
    STARFIELD_MAX_RADIUS,
    2.2,
    new THREE.Color(0x9fc4ff),
    0x51a7,
    map
  );
  const near = buildLayer(
    110,
    STARFIELD_MIN_RADIUS,
    (STARFIELD_MIN_RADIUS + STARFIELD_MAX_RADIUS) / 2,
    3.4,
    new THREE.Color(0x7fe9ff),
    0x7b3d,
    map
  );
  group.add(far, near);
  return {
    group,
    update: (elapsedSeconds, motionEnabled) => {
      if (!motionEnabled) return;
      far.rotation.y = elapsedSeconds * 0.0035;
      far.rotation.x = Math.sin(elapsedSeconds * 0.01) * 0.04;
      near.rotation.y = -elapsedSeconds * 0.0075;
      near.rotation.z = Math.sin(elapsedSeconds * 0.013) * 0.05;
    },
    dispose: () => {
      for (const layer of [far, near]) {
        layer.geometry.dispose();
        (layer.material as THREE.Material).dispose();
      }
      map.dispose();
    },
  };
}
