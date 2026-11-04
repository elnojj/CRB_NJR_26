import * as THREE from 'three';

/**
 * Recursive GPU resource release. Every geometry, material, texture and self-disposing object under a root
 * is disposed exactly once (shared resources are de-duplicated), then the subtree is detached so nothing
 * keeps a reference alive.
 */

export interface DisposalReport {
  objects: number;
  geometries: number;
  materials: number;
  textures: number;
}

export interface IsolationReport extends DisposalReport {
  /** Names of the top-level objects that were removed. */
  removed: string[];
  /** Names of the top-level objects that were kept. */
  retained: string[];
}

interface DisposalContext {
  seen: Set<unknown>;
  report: DisposalReport;
}

type Disposable = { dispose: () => void };

const hasDispose = (value: unknown): value is Disposable =>
  typeof value === 'object' && value !== null && typeof (value as Partial<Disposable>).dispose === 'function';

export const emptyDisposalReport = (): DisposalReport => ({ objects: 0, geometries: 0, materials: 0, textures: 0 });

function disposeTexture(texture: THREE.Texture, ctx: DisposalContext): void {
  if (ctx.seen.has(texture)) return;
  ctx.seen.add(texture);
  texture.dispose();
  ctx.report.textures += 1;
}

function disposeMaterial(material: THREE.Material, ctx: DisposalContext): void {
  if (ctx.seen.has(material)) return;
  ctx.seen.add(material);
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) disposeTexture(value, ctx);
  }
  if (material instanceof THREE.ShaderMaterial) {
    for (const uniform of Object.values(material.uniforms)) {
      if (uniform.value instanceof THREE.Texture) disposeTexture(uniform.value, ctx);
    }
  }
  material.dispose();
  ctx.report.materials += 1;
}

function disposeNode(node: THREE.Object3D, ctx: DisposalContext): void {
  ctx.report.objects += 1;
  const renderable = node as THREE.Object3D & {
    geometry?: THREE.BufferGeometry;
    material?: THREE.Material | THREE.Material[];
    skeleton?: THREE.Skeleton;
  };
  if (renderable.geometry && !ctx.seen.has(renderable.geometry)) {
    ctx.seen.add(renderable.geometry);
    renderable.geometry.dispose();
    ctx.report.geometries += 1;
  }
  if (Array.isArray(renderable.material)) {
    for (const material of renderable.material) disposeMaterial(material, ctx);
  } else if (renderable.material) {
    disposeMaterial(renderable.material, ctx);
  }
  renderable.skeleton?.dispose();
  // InstancedMesh, troika Text and similar own extra buffers behind their own dispose().
  if (hasDispose(node)) node.dispose();
}

function releaseSubtree(root: THREE.Object3D, ctx: DisposalContext): void {
  const nodes: THREE.Object3D[] = [];
  root.traverse((node) => nodes.push(node));
  for (const node of nodes) disposeNode(node, ctx);
  for (const node of nodes) node.clear();
  root.removeFromParent();
}

/** Dispose and detach one subtree. */
export function disposeObject3D(root: THREE.Object3D): DisposalReport {
  const ctx: DisposalContext = { seen: new Set(), report: emptyDisposalReport() };
  releaseSubtree(root, ctx);
  return ctx.report;
}

/** What the clean-slate scene keeps: lights, cameras, the audio listener and anything flagged on purpose. */
export function isCoreRigObject(node: THREE.Object3D): boolean {
  if (node.userData.retainInCleanSlate === true) return true;
  if (node instanceof THREE.Light || node instanceof THREE.Camera) return true;
  return typeof THREE.AudioListener === 'function' && node instanceof THREE.AudioListener;
}

export function markCoreRig<T extends THREE.Object3D>(node: T): T {
  node.userData.retainInCleanSlate = true;
  return node;
}

/**
 * Remove every top-level child of the scene that is not part of the core rig and dispose it.
 * `scene.environment` and `scene.background` are left to the renderer pipeline that owns them.
 */
export function isolateScene(
  scene: THREE.Scene,
  keep: (node: THREE.Object3D) => boolean = isCoreRigObject
): IsolationReport {
  const ctx: DisposalContext = { seen: new Set(), report: emptyDisposalReport() };
  const removed: string[] = [];
  const retained: string[] = [];
  for (const child of [...scene.children]) {
    const label = child.name || child.type;
    if (keep(child)) {
      retained.push(label);
      continue;
    }
    removed.push(label);
    releaseSubtree(child, ctx);
  }
  return { ...ctx.report, removed, retained };
}
