/**
 * Central cache of master-shell geometries. Every entry is normalised to the 6.2u base shell
 * radius so per-sphere mesh scale keeps working, and entries are created once and reused —
 * swapping shapes never allocates per frame or per swap.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const BASE_SHELL_RADIUS = 6.2;

export type PrimitiveShapeKey = 'sphere' | 'box' | 'torus' | 'octahedron' | 'icosahedron';
export type ShapeKey = PrimitiveShapeKey | (string & {});

export const PRIMITIVE_SHAPE_KEYS: readonly PrimitiveShapeKey[] = [
  'sphere',
  'box',
  'torus',
  'octahedron',
  'icosahedron',
];

const cache = new Map<string, THREE.BufferGeometry>();
const pending = new Map<string, Promise<THREE.BufferGeometry>>();

/** Scale and centre so the bounding sphere matches the base shell radius. */
export function normaliseToShellRadius(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.computeBoundingSphere();
  const bs = geo.boundingSphere;
  if (bs && bs.radius > 0) {
    geo.translate(-bs.center.x, -bs.center.y, -bs.center.z);
    geo.scale(BASE_SHELL_RADIUS / bs.radius, BASE_SHELL_RADIUS / bs.radius, BASE_SHELL_RADIUS / bs.radius);
  }
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  return geo;
}

function buildPrimitive(key: PrimitiveShapeKey): THREE.BufferGeometry {
  const r = BASE_SHELL_RADIUS;
  switch (key) {
    case 'sphere':
      return new THREE.SphereGeometry(r, 64, 48);
    case 'box': {
      const side = (2 * r) / Math.sqrt(3);
      return normaliseToShellRadius(new THREE.BoxGeometry(side, side, side, 8, 8, 8));
    }
    case 'torus':
      return normaliseToShellRadius(new THREE.TorusGeometry(r * 0.68, r * 0.3, 32, 96));
    case 'octahedron':
      return new THREE.OctahedronGeometry(r, 0);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(r, 1);
    default: {
      const unreachable: never = key;
      throw new Error(`Unknown primitive shape: ${String(unreachable)}`);
    }
  }
}

export function isPrimitiveShapeKey(key: string): key is PrimitiveShapeKey {
  return (PRIMITIVE_SHAPE_KEYS as readonly string[]).includes(key);
}

/** Cached geometry for a key, or null when a custom (GLB) key has not finished loading. */
export function getShellGeometry(key: ShapeKey): THREE.BufferGeometry | null {
  const hit = cache.get(key);
  if (hit) return hit;
  if (!isPrimitiveShapeKey(key)) return null;
  const geo = buildPrimitive(key);
  geo.name = `shell-shape:${key}`;
  cache.set(key, geo);
  return geo;
}

/** Seed a key with an existing geometry (e.g. the live shared shell) without copying it. */
export function seedShellGeometry(key: ShapeKey, geo: THREE.BufferGeometry): void {
  if (!cache.has(key)) cache.set(key, geo);
}

/**
 * Load a .glb/.gltf once, merge its meshes into a single position+normal geometry and cache it
 * under `key`. Repeat calls share the same promise.
 */
export function preloadGltfShape(key: string, url: string): Promise<THREE.BufferGeometry> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const p = new GLTFLoader()
    .loadAsync(url)
    .then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const parts: THREE.BufferGeometry[] = [];
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry) return;
        const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        const lean = new THREE.BufferGeometry();
        lean.setAttribute('position', g.getAttribute('position'));
        if (g.getAttribute('normal')) lean.setAttribute('normal', g.getAttribute('normal'));
        if (g.index) lean.setIndex(g.index);
        parts.push(lean.index ? lean.toNonIndexed() : lean);
        g.dispose();
      });
      if (!parts.length) throw new Error(`No meshes in ${url}`);
      const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
      if (!merged) throw new Error(`Could not merge meshes in ${url}`);
      merged.name = `shell-shape:${key}`;
      normaliseToShellRadius(merged);
      cache.set(key, merged);
      return merged;
    })
    .finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

export function listCachedShapeKeys(): string[] {
  return Array.from(cache.keys());
}

/** Dispose everything except geometries owned elsewhere (seeded live shells). */
export function disposeShellGeometryCache(keep: readonly THREE.BufferGeometry[] = []): void {
  for (const [key, geo] of cache) {
    if (!keep.includes(geo)) geo.dispose();
    cache.delete(key);
  }
  pending.clear();
}
