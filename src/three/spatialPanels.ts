import type { ReactNode } from 'react';
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import type { ConnectedSphereId } from './sphereNetwork';

export type SpatialPanelSpec = {
  id: string;
  /** Canonical node id the panel is anchored to. */
  nodeId: string;
  sphere: ConnectedSphereId;
  /** Panels sharing a node sit side by side; slot 0 is closest to the node. */
  slot: number;
  content: ReactNode;
};

export type SpatialPanelLayout = Pick<SpatialPanelSpec, 'id' | 'nodeId' | 'sphere' | 'slot'>;

/** Camera distance (scene units) at which the detailed card is fully shown. */
export const PANEL_FULL_DISTANCE = 11;
/** Camera distance beyond which the card collapses to its compact badge. */
export const PANEL_BADGE_DISTANCE = 20;
const BADGE_ZOOM = 0.7;
const EDGE_MARGIN_PX = 10;
const TOP_RESERVE_PX = 112;
const BOTTOM_RESERVE_PX = 140;
const MIN_FIT_ZOOM = 0.55;
const NODE_CLEARANCE_PX = 64;
const PIN_DEPTH = 6;

type PanelState = {
  object: CSS3DObject;
  host: HTMLElement;
  /** 1 = detailed card, 0 = compact badge. */
  detail: number;
  alpha: number;
  lod: 'full' | 'badge';
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Floating glass dashboard cards rendered with CSS3D so they live in the scene: anchored beside their node,
 * facing the camera, detailed when close and a compact badge when far. When the anchor is behind the camera or
 * off screen (for example inside a media tube) the card pins to the lower-left of the view instead.
 */
export class SpatialPanelLayer {
  private readonly renderer: CSS3DRenderer;
  private readonly scene = new THREE.Scene();
  private readonly panels = new Map<string, PanelState>();
  private width = 1;
  private height = 1;
  private readonly viewPos = new THREE.Vector3();
  private readonly ndc = new THREE.Vector3();
  private readonly anchor = new THREE.Vector3();

  constructor(container: HTMLElement, private readonly hostFor: (id: string) => HTMLElement | null) {
    this.renderer = new CSS3DRenderer({ element: document.createElement('div') });
    const el = this.renderer.domElement;
    el.className = 'cerebro-spatial-layer';
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    el.style.overflow = 'hidden';
    container.appendChild(el);
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height);
  }

  sync(specs: readonly SpatialPanelLayout[]): void {
    const wanted = new Set(specs.map((s) => s.id));
    for (const [id, state] of this.panels) {
      if (!wanted.has(id)) {
        this.scene.remove(state.object);
        this.panels.delete(id);
      }
    }
    for (const spec of specs) {
      if (this.panels.has(spec.id)) continue;
      const host = this.hostFor(spec.id);
      if (!host) continue;
      host.classList.add('cerebro-spatial-panel');
      const object = new CSS3DObject(host);
      this.scene.add(object);
      this.panels.set(spec.id, { object, host, detail: 1, alpha: 0, lod: 'full' });
    }
  }

  update(
    camera: THREE.PerspectiveCamera,
    specs: readonly SpatialPanelLayout[],
    resolveAnchor: (spec: SpatialPanelLayout, out: THREE.Vector3) => boolean,
    dt: number
  ): void {
    this.sync(specs);
    if (this.panels.size === 0) return;
    camera.updateMatrixWorld();
    const fovPx = (camera.projectionMatrix.elements[5] * this.height) / 2;
    const blend = Math.min(1, dt * 7);

    for (const spec of specs) {
      const state = this.panels.get(spec.id);
      if (!state) continue;
      const w = state.host.offsetWidth || 280;
      const h = state.host.offsetHeight || 200;

      const hasAnchor = resolveAnchor(spec, this.anchor);
      let inView = false;
      let depth = PIN_DEPTH;
      let nodeXpx = 0;
      let nodeYpx = 0;
      let distance = 0;
      if (hasAnchor) {
        this.viewPos.copy(this.anchor).applyMatrix4(camera.matrixWorldInverse);
        depth = -this.viewPos.z;
        distance = this.anchor.distanceTo(camera.position);
        if (depth > 0.5) {
          nodeXpx = (this.viewPos.x / depth) * fovPx;
          nodeYpx = (this.viewPos.y / depth) * fovPx;
          this.ndc.set(nodeXpx / (this.width / 2), nodeYpx / (this.height / 2), 0);
          inView = Math.abs(this.ndc.x) < 1.05 && Math.abs(this.ndc.y) < 1.05;
        }
      }

      const detailTarget = inView ? 1 - smoothstep(PANEL_FULL_DISTANCE, PANEL_BADGE_DISTANCE, distance) : 1;
      state.detail += (detailTarget - state.detail) * blend;
      const fit = Math.max(
        MIN_FIT_ZOOM,
        Math.min(1, (this.height - TOP_RESERVE_PX - BOTTOM_RESERVE_PX) / Math.max(1, h))
      );
      const zoom = (BADGE_ZOOM + (1 - BADGE_ZOOM) * state.detail) * fit;
      const lod = state.detail < 0.5 ? 'badge' : 'full';
      if (lod !== state.lod) {
        state.lod = lod;
        state.host.dataset.lod = lod;
      } else if (!state.host.dataset.lod) {
        state.host.dataset.lod = lod;
      }

      const panelW = w * zoom;
      const panelH = h * zoom;
      let xPx: number;
      let yPx: number;
      let useDepth: number;
      if (inView) {
        const side = nodeXpx > 0 ? -1 : 1;
        xPx = nodeXpx + side * (panelW / 2 + NODE_CLEARANCE_PX + spec.slot * (panelW + 14));
        yPx = nodeYpx + 10;
        useDepth = depth;
      } else {
        xPx = -(this.width / 2 - EDGE_MARGIN_PX - panelW / 2) + spec.slot * (panelW + 14);
        yPx = -(this.height / 2 - BOTTOM_RESERVE_PX - panelH / 2);
        useDepth = PIN_DEPTH;
      }
      const maxX = this.width / 2 - EDGE_MARGIN_PX - panelW / 2;
      const maxY = this.height / 2 - TOP_RESERVE_PX - panelH / 2;
      const minY = -(this.height / 2 - BOTTOM_RESERVE_PX - panelH / 2);
      xPx = Math.max(-maxX, Math.min(maxX, xPx));
      yPx = Math.max(Math.min(minY, maxY), Math.min(maxY, yPx));

      const unitsPerPx = useDepth / fovPx;
      this.viewPos.set(xPx * unitsPerPx, yPx * unitsPerPx, -useDepth);
      this.viewPos.applyMatrix4(camera.matrixWorld);
      state.object.position.copy(this.viewPos);
      state.object.quaternion.copy(camera.quaternion);
      state.object.scale.setScalar(unitsPerPx * zoom);
      state.object.visible = true;

      state.alpha += (1 - state.alpha) * blend;
      const opacity = Math.min(1, state.alpha);
      const css = state.host.style;
      const opacityText = opacity.toFixed(2);
      if (css.opacity !== opacityText) css.opacity = opacityText;
      css.pointerEvents = opacity < 0.2 ? 'none' : 'auto';
    }
    this.renderer.render(this.scene, camera);
  }

  dispose(): void {
    for (const state of this.panels.values()) this.scene.remove(state.object);
    this.panels.clear();
    this.renderer.domElement.remove();
  }
}
