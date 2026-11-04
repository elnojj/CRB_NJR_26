/**
 * State-driven master shell swapping. Only the outer shell meshes change geometry; the shared
 * liquid-glass materials, the sphere root transform and the core/node groups are untouched.
 */
import { getMountedSphereInstance, type ConnectedSphereId } from './sphereNetwork';
import { getShellGeometry, preloadGltfShape, type ShapeKey } from './geometryRegistry';

export const SPHERE_SHAPE_EVENT = 'cerebro:sphere-shape';

export type SphereShapeRequest = {
  sphere: ConnectedSphereId | 'all';
  shape: ShapeKey;
  /** Required for custom (GLB) shapes that are not cached yet. */
  url?: string;
};

const activeShape = new Map<ConnectedSphereId, ShapeKey>();
const transitions = new Map<ConnectedSphereId, number>();

export function getActiveSphereShape(id: ConnectedSphereId): ShapeKey {
  return activeShape.get(id) ?? 'sphere';
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/** Dip the shell, swap geometry at the lowest point, then spring back (~600ms total). */
function animateSwap(id: ConnectedSphereId, apply: () => void): void {
  const inst = getMountedSphereInstance(id);
  if (!inst) return;
  const group = inst.shellGroup;
  const prev = transitions.get(id);
  if (prev) cancelAnimationFrame(prev);
  if (prefersReducedMotion()) {
    apply();
    group.scale.setScalar(1);
    return;
  }
  const start = performance.now();
  const dipMs = 170;
  const springMs = 430;
  let swapped = false;
  const step = (now: number) => {
    const t = now - start;
    let s: number;
    if (t < dipMs) {
      const u = t / dipMs;
      s = 1 - 0.18 * u * u;
    } else {
      if (!swapped) {
        swapped = true;
        apply();
      }
      const u = Math.min(1, (t - dipMs) / springMs);
      s = 1 - 0.18 * Math.exp(-5.5 * u) * Math.cos(u * Math.PI * 2.2);
    }
    group.scale.setScalar(s);
    if (t < dipMs + springMs) {
      transitions.set(id, requestAnimationFrame(step));
    } else {
      group.scale.setScalar(1);
      transitions.delete(id);
    }
  };
  transitions.set(id, requestAnimationFrame(step));
}

function applyToSphere(id: ConnectedSphereId, shape: ShapeKey): boolean {
  const inst = getMountedSphereInstance(id);
  const geo = getShellGeometry(shape);
  if (!inst?.shellMeshes?.length || !geo) return false;
  if (getActiveSphereShape(id) === shape) return true;
  animateSwap(id, () => {
    for (const mesh of inst.shellMeshes ?? []) mesh.geometry = geo;
    activeShape.set(id, shape);
  });
  return true;
}

export async function setMasterSphereShape(req: SphereShapeRequest): Promise<boolean> {
  if (!getShellGeometry(req.shape)) {
    if (!req.url) return false;
    try {
      await preloadGltfShape(req.shape, req.url);
    } catch (err) {
      console.warn('[sphere-shape] failed to load', req.url, err);
      return false;
    }
  }
  const ids: ConnectedSphereId[] =
    req.sphere === 'all' ? ['hq', 'cde', 'campaign-os', 'about-us'] : [req.sphere];
  let ok = false;
  for (const id of ids) ok = applyToSphere(id, req.shape) || ok;
  return ok;
}

export function requestSphereShape(req: SphereShapeRequest): void {
  window.dispatchEvent(new CustomEvent<SphereShapeRequest>(SPHERE_SHAPE_EVENT, { detail: req }));
}

export function resetSphereShapes(): void {
  activeShape.clear();
  for (const id of transitions.keys()) cancelAnimationFrame(transitions.get(id)!);
  transitions.clear();
}
