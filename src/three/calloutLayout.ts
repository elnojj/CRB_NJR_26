import * as THREE from 'three';

export type CalloutRect = { x: number; y: number; w: number; h: number };
export type CalloutSphere = { id: string; center: readonly [number, number, number]; radius: number };

export function selectCallout<T extends { id: string; focused?: boolean; priority?: number }>(specs: readonly T[]): T | null {
  return specs.filter(s => s.focused).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))[0] ?? null;
}

export function overlapsCallout(a: CalloutRect, b: CalloutRect, gap = 8): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

/** One card, four alignments plus reserved side rails. No simulation or moving secondary labels. */
export function placeCallout(anchor: { x: number; y: number }, size: { w: number; h: number }, safe: CalloutRect, blocked: readonly CalloutRect[] = []): CalloutRect | null {
  const inset = 8, gap = 18;
  const area = { x: safe.x + inset, y: safe.y + inset, w: safe.w - inset * 2, h: safe.h - inset * 2 };
  if (size.w > area.w || size.h > area.h) return null;
  const candidates = [
    { x: anchor.x + gap, y: anchor.y - size.h - gap },
    { x: anchor.x - size.w - gap, y: anchor.y - size.h - gap },
    { x: anchor.x + gap, y: anchor.y + gap },
    { x: anchor.x - size.w - gap, y: anchor.y + gap },
    { x: area.x + area.w - size.w, y: area.y },
    { x: area.x, y: area.y },
    { x: area.x + area.w - size.w, y: area.y + area.h - size.h },
    { x: area.x, y: area.y + area.h - size.h },
  ];
  for (const candidate of candidates) {
    const rect = { ...candidate, ...size };
    if (rect.x < area.x || rect.y < area.y || rect.x + rect.w > area.x + area.w || rect.y + rect.h > area.y + area.h) continue;
    if (!blocked.some(b => overlapsCallout(rect, b))) return rect;
  }
  return null;
}

function renderedOpaque(object: THREE.Object3D, materialIndex?: number): boolean {
  for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible) return false;
  if (!(object as THREE.Mesh).isMesh) return false;
  const materials = (object as THREE.Mesh).material;
  const material = Array.isArray(materials) ? materials[materialIndex ?? 0] : materials;
  return Boolean(material?.visible && (!material.transparent || material.opacity >= 0.95) && !((material as THREE.MeshPhysicalMaterial).transmission > 0));
}

/** Anchor visibility, independent of label depthTest. Ignore the target's own mesh and glass host. */
export function projectCalloutAnchor(camera: THREE.PerspectiveCamera, anchor: THREE.Vector3, viewport: { w: number; h: number }, options: {
  minDepth?: number; maxDepth?: number; ownerSphereId?: string;
  spheres?: readonly CalloutSphere[]; occluders?: THREE.Object3D[]; target?: THREE.Object3D;
} = {}): { x: number; y: number; depth: number } | null {
  const local = anchor.clone().applyMatrix4(camera.matrixWorldInverse);
  const depth = -local.z;
  if (depth <= Math.max(camera.near, options.minDepth ?? camera.near) || depth >= Math.min(camera.far, options.maxDepth ?? camera.far)) return null;
  const projected = anchor.clone().project(camera);
  if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1) return null;
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const direction = anchor.clone().sub(origin);
  const distance = direction.length();
  const ray = new THREE.Ray(origin, direction.normalize());
  for (const sphere of options.spheres ?? []) {
    if (sphere.id === options.ownerSphereId) continue;
    const bounds = new THREE.Sphere(new THREE.Vector3(...sphere.center), sphere.radius);
    const intersection = ray.intersectSphere(bounds, new THREE.Vector3());
    if (intersection && (bounds.containsPoint(origin) || origin.distanceTo(intersection) < distance - 0.01)) return null;
  }
  if (options.occluders?.length) {
    const cast = new THREE.Raycaster(origin, direction, 0.01, distance - 0.01);
    const hit = cast.intersectObjects(options.occluders, true).some(hit => {
      for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) if (object === options.target) return false;
      return renderedOpaque(hit.object, hit.face?.materialIndex);
    });
    if (hit) return null;
  }
  return { x: (projected.x * 0.5 + 0.5) * viewport.w, y: (-projected.y * 0.5 + 0.5) * viewport.h, depth };
}
