import * as THREE from 'three';

/**
 * Ambient cosmetics (floating wireframes, constellation lines, particle clouds) must never take a
 * pick and must never occlude the node or media being inspected. This marks them once:
 *   - raycast is a no-op
 *   - depthWrite off, depthTest on
 *   - opacity is scaled by `fade.value` at draw time and restored afterwards, so it composes with
 *     whatever animation already drives the material's opacity
 * Anything under a node group (userData.nodeId) or flagged userData.interactive keeps its behaviour.
 */

export interface CosmeticFade {
  /** 0 = fully visible, 1 = hidden. */
  value: number;
}

const noopRaycast: THREE.Object3D['raycast'] = () => {};

type Maybe<T> = T | undefined;

function materialsOf(obj: THREE.Object3D): THREE.Material[] {
  const material = (obj as THREE.Mesh).material as Maybe<THREE.Material | THREE.Material[]>;
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function isWireframeMesh(obj: THREE.Object3D): boolean {
  if (!(obj as THREE.Mesh).isMesh) return false;
  const mats = materialsOf(obj);
  return mats.length > 0 && mats.every((m) => (m as THREE.MeshBasicMaterial).wireframe === true);
}

function isCosmeticKind(obj: THREE.Object3D): boolean {
  return (obj as THREE.Points).isPoints === true || (obj as THREE.Line).isLine === true || isWireframeMesh(obj);
}

function ownedByNodeOrInteractive(obj: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = obj;
  while (cursor) {
    if (cursor.userData?.interactive === true || cursor.userData?.nodeId) return true;
    cursor = cursor.parent;
  }
  return false;
}

const scaledBase = new WeakMap<THREE.Material, number>();

function installFade(obj: THREE.Object3D, fade: CosmeticFade): void {
  const prevBefore = obj.onBeforeRender;
  const prevAfter = obj.onAfterRender;
  obj.onBeforeRender = function (this: THREE.Object3D, ...args: Parameters<THREE.Object3D['onBeforeRender']>) {
    prevBefore.apply(this, args);
    if (fade.value <= 0) return;
    for (const m of materialsOf(obj)) {
      if (scaledBase.has(m)) continue;
      scaledBase.set(m, m.opacity);
      m.opacity = m.opacity * (1 - fade.value);
    }
  };
  obj.onAfterRender = function (this: THREE.Object3D, ...args: Parameters<THREE.Object3D['onAfterRender']>) {
    prevAfter.apply(this, args);
    for (const m of materialsOf(obj)) {
      const base = scaledBase.get(m);
      if (base === undefined) continue;
      m.opacity = base;
      scaledBase.delete(m);
    }
  };
}

export interface IsolationReport {
  isolated: number;
  alreadyIsolated: number;
}

/** Idempotent. Call again after new content is added; objects already handled are skipped. */
export function isolateDecorativeGeometry(root: THREE.Object3D, fade: CosmeticFade, skipSubtree: THREE.Object3D | null): IsolationReport {
  const report: IsolationReport = { isolated: 0, alreadyIsolated: 0 };
  const visit = (obj: THREE.Object3D): void => {
    if (obj === skipSubtree) return;
    if (isCosmeticKind(obj) && !ownedByNodeOrInteractive(obj)) {
      if (obj.userData.cosmeticIsolated === true) {
        report.alreadyIsolated += 1;
      } else {
        obj.userData.cosmeticIsolated = true;
        obj.raycast = noopRaycast;
        for (const m of materialsOf(obj)) {
          m.depthWrite = false;
          m.depthTest = true;
          if (!m.transparent) {
            m.transparent = true;
            m.needsUpdate = true;
          }
        }
        installFade(obj, fade);
        report.isolated += 1;
      }
    }
    for (const child of obj.children) visit(child);
  };
  visit(root);
  return report;
}
