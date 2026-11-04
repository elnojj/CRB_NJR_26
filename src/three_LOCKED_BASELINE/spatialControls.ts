import * as THREE from 'three';
import { GLOVE_PLANE_Z, type HandSlot } from './handStateRef';

/**
 * Camera-parented 3D controls driven by the glove: pinch rails (1-2-3 scrubbers) and poke buttons.
 * They live in camera-local space at the same plane as the glove, so a 0.08 m snap radius means the
 * same thing for every control and they travel with the camera along every spline and orbit.
 */

export const MAGNETIC_SNAP_RADIUS = 0.08;
const COBALT = new THREE.Color('#1E5EFF');
const INK = new THREE.Color('#0A0D14');
const TEXT = '#E8EEF8';
const POKE_FIRE = 0.6;
const POKE_REARM = 0.25;
const POKE_MIN_REACH = 0.012;
const POKE_FULL_REACH = 0.06;

export type SpatialButtonId = 'journey' | 'overview' | 'media';

export interface SpatialControlActions {
  onZoomDetent: (index: number) => void;
  onSphereDetent: (index: number) => void;
  onButton: (id: SpatialButtonId) => void;
  /** Hit-test a node near a camera-local point; returns null when none is within the snap radius. */
  probeNode: (point: THREE.Vector3, snapRadius: number) => string | null;
  onNodeGrab: (nodeId: string) => void;
}

export interface UiInteractResult {
  /** Camera must not move: a control is grabbed, poked or pinched. */
  locked: boolean;
  /** A hand is within snap range of a control (suppresses pan/orbit even before pinching). */
  hovering: boolean;
  grabbedId: string | null;
}

function paintLabel(text: string, width: number, height: number, size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = TEXT;
    ctx.font = `600 ${size}px "JetBrains Mono", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelPlane(text: string, w: number, h: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: paintLabel(text, 256, Math.round(256 * (h / w)), 44), transparent: true, depthTest: false })
  );
  mesh.renderOrder = 1002;
  return mesh;
}

function outline(geometry: THREE.BufferGeometry, color: THREE.Color): THREE.LineSegments {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color, depthTest: false })
  );
  line.renderOrder = 1001;
  return line;
}

export class SpatialPinchRail {
  readonly id: string;
  readonly group = new THREE.Group();
  private readonly bead: THREE.Mesh;
  private readonly beadMat: THREE.MeshBasicMaterial;
  private readonly trackMat: THREE.MeshBasicMaterial;
  private value = 0;
  private displayValue = 0;
  private lastDetent = -1;
  grabbed = false;

  constructor(
    id: string,
    private readonly orientation: 'vertical' | 'horizontal',
    private length: number,
    private readonly detents: number,
    labels: string[],
    private readonly onDetent: (index: number) => void
  ) {
    this.id = id;
    const thickness = 0.008;
    this.trackMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.9, depthTest: false });
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(orientation === 'vertical' ? thickness : 1, orientation === 'vertical' ? 1 : thickness, thickness),
      this.trackMat
    );
    track.name = 'track';
    track.renderOrder = 1000;
    this.group.add(track);
    const edge = outline(track.geometry as THREE.BufferGeometry, COBALT);
    edge.name = 'track-edge';
    this.group.add(edge);

    for (let i = 0; i < detents; i += 1) {
      const tick = new THREE.Mesh(
        new THREE.CircleGeometry(0.011, 16),
        new THREE.MeshBasicMaterial({ color: COBALT, depthTest: false })
      );
      tick.name = `tick-${i}`;
      tick.renderOrder = 1001;
      this.group.add(tick);
      const label = labelPlane(labels[i] ?? String(i + 1), 0.07, 0.035);
      label.name = `label-${i}`;
      this.group.add(label);
    }

    this.beadMat = new THREE.MeshBasicMaterial({ color: INK, depthTest: false });
    this.bead = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), this.beadMat);
    this.bead.renderOrder = 1003;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.026, 0.031, 32),
      new THREE.MeshBasicMaterial({ color: COBALT, depthTest: false })
    );
    ring.renderOrder = 1004;
    this.bead.add(ring);
    this.group.add(this.bead);
    this.layout(length);
  }

  layout(length: number): void {
    this.length = length;
    const vertical = this.orientation === 'vertical';
    const track = this.group.getObjectByName('track') as THREE.Mesh;
    const edge = this.group.getObjectByName('track-edge') as THREE.LineSegments;
    track.scale.set(vertical ? 1 : length, vertical ? length : 1, 1);
    edge.scale.copy(track.scale);
    for (let i = 0; i < this.detents; i += 1) {
      const t = this.detents === 1 ? 0.5 : i / (this.detents - 1);
      const along = (t - 0.5) * length;
      const pos = vertical ? new THREE.Vector3(0, along, 0.001) : new THREE.Vector3(along, 0, 0.001);
      this.group.getObjectByName(`tick-${i}`)?.position.copy(pos);
      const labelPos = vertical ? new THREE.Vector3(0.062, along, 0.001) : new THREE.Vector3(along, -0.05, 0.001);
      this.group.getObjectByName(`label-${i}`)?.position.copy(labelPos);
    }
  }

  /** Bead centre in the rail's parent (camera-local) space. */
  beadLocal(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.bead.position).applyMatrix4(this.group.matrix);
  }

  private axisPosition(value: number): number {
    return (value - 0.5) * this.length;
  }

  private placeBead(): void {
    const along = this.axisPosition(this.displayValue);
    if (this.orientation === 'vertical') this.bead.position.set(0, along, 0.004);
    else this.bead.position.set(along, 0, 0.004);
  }

  setValue(value: number): void {
    this.value = THREE.MathUtils.clamp(value, 0, 1);
  }

  grab(): void {
    this.grabbed = true;
  }

  /** Bind the bead 1:1 to the hand point (camera-local). */
  drag(point: THREE.Vector3): void {
    _drag.copy(point).applyMatrix4(_inv.copy(this.group.matrix).invert());
    const along = this.orientation === 'vertical' ? _drag.y : _drag.x;
    this.value = THREE.MathUtils.clamp(along / this.length + 0.5, 0, 1);
    this.displayValue = this.value;
    const detent = Math.round(this.value * (this.detents - 1));
    if (detent !== this.lastDetent) {
      this.lastDetent = detent;
      this.onDetent(detent);
    }
  }

  release(): void {
    if (!this.grabbed) return;
    this.grabbed = false;
    const detent = Math.round(this.value * (this.detents - 1));
    this.value = this.detents === 1 ? 0.5 : detent / (this.detents - 1);
    this.lastDetent = detent;
    this.onDetent(detent);
  }

  update(dt: number, hovered: boolean): void {
    if (!this.grabbed) this.displayValue = THREE.MathUtils.damp(this.displayValue, this.value, 16, dt);
    this.placeBead();
    const active = hovered || this.grabbed;
    this.beadMat.color.copy(this.grabbed ? COBALT : INK);
    this.beadMat.opacity = active ? 1 : 0.92;
    this.bead.scale.setScalar(this.grabbed ? 1.12 : hovered ? 1.06 : 1);
  }

  dispose(): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) {
        (mat as THREE.MeshBasicMaterial).map?.dispose();
        mat.dispose();
      }
    });
  }
}

const _drag = new THREE.Vector3();
const _inv = new THREE.Matrix4();

export class SpatialPokeButton {
  readonly id: SpatialButtonId;
  readonly group = new THREE.Group();
  readonly halfW: number;
  readonly halfH: number;
  private readonly body: THREE.Mesh;
  private readonly bodyMat: THREE.MeshBasicMaterial;
  private depress = 0;
  private armed = true;
  private flash = 0;

  constructor(id: SpatialButtonId, label: string, w: number, h: number, private readonly onFire: (id: SpatialButtonId) => void) {
    this.id = id;
    this.halfW = w / 2;
    this.halfH = h / 2;
    this.bodyMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.92, depthTest: false });
    const geo = new THREE.BoxGeometry(w, h, 0.012);
    this.body = new THREE.Mesh(geo, this.bodyMat);
    this.body.renderOrder = 1000;
    this.group.add(this.body);
    this.body.add(outline(geo, COBALT));
    const text = labelPlane(label, w * 0.9, h * 0.6);
    text.position.z = 0.008;
    this.body.add(text);
  }

  /** Distance in the button plane from a camera-local point, 0 inside the rectangle. */
  planarDistance(point: THREE.Vector3): number {
    _inv.copy(this.group.matrix).invert();
    _drag.copy(point).applyMatrix4(_inv);
    const dx = Math.max(Math.abs(_drag.x) - this.halfW, 0);
    const dy = Math.max(Math.abs(_drag.y) - this.halfH, 0);
    return Math.hypot(dx, dy);
  }

  /** Set the finger reach 0..1 (index tip toward the lens beyond the palm). Fires once per press. */
  push(reach: number): boolean {
    this.depress = reach;
    if (this.armed && reach >= POKE_FIRE) {
      this.armed = false;
      this.flash = 1;
      this.onFire(this.id);
      return true;
    }
    if (!this.armed && reach <= POKE_REARM) this.armed = true;
    return false;
  }

  tap(): void {
    if (!this.armed) return;
    this.armed = false;
    this.flash = 1;
    this.onFire(this.id);
    window.setTimeout(() => {
      this.armed = true;
    }, 450);
  }

  update(dt: number, hovered: boolean): void {
    this.flash = Math.max(0, this.flash - dt * 4);
    const pressed = Math.max(this.depress, this.flash);
    this.body.position.z = -0.014 * pressed;
    this.bodyMat.color.copy(INK).lerp(COBALT, hovered ? 0.35 : 0).lerp(COBALT, pressed);
    this.depress = THREE.MathUtils.damp(this.depress, 0, 14, dt);
  }

  dispose(): void {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | undefined;
      if (mat) {
        (mat as THREE.MeshBasicMaterial).map?.dispose();
        mat.dispose();
      }
    });
  }
}

type Grab = { handIndex: number; kind: 'rail'; rail: SpatialPinchRail } | { handIndex: number; kind: 'node'; nodeId: string };

const _pinch = new THREE.Vector3();
const _tip = new THREE.Vector3();
const _palm = new THREE.Vector3();
const _bead = new THREE.Vector3();

/** Owns every spatial control, lays them out in the camera frustum and arbitrates hand interaction. */
export class SpatialControlLayer {
  readonly group = new THREE.Group();
  private readonly zoomRail: SpatialPinchRail;
  private readonly sphereRail: SpatialPinchRail;
  private readonly buttons: SpatialPokeButton[];
  private readonly grabs = new Map<number, Grab>();
  private readonly wasPinching = [false, false];
  private hoveredId: string | null = null;
  private fade = 0;
  private lastHalfW = 0;
  private lastHalfH = 0;

  constructor(private readonly actions: SpatialControlActions) {
    this.group.renderOrder = 1000;
    this.zoomRail = new SpatialPinchRail('rail-zoom', 'vertical', 0.5, 3, ['1', '2', '3'], actions.onZoomDetent);
    this.zoomRail.setValue(0);
    this.sphereRail = new SpatialPinchRail('rail-sphere', 'horizontal', 0.6, 4, ['HQ', 'CDE', 'OS', 'ABT'], actions.onSphereDetent);
    this.buttons = [
      new SpatialPokeButton('journey', 'JOURNEY', 0.16, 0.075, actions.onButton),
      new SpatialPokeButton('overview', 'OVERVIEW', 0.16, 0.075, actions.onButton),
      new SpatialPokeButton('media', 'MEDIA', 0.16, 0.075, actions.onButton),
    ];
    this.group.add(this.zoomRail.group, this.sphereRail.group);
    for (const button of this.buttons) this.group.add(button.group);
    this.group.visible = false;
  }

  setSphereValue(index: number): void {
    if (!this.sphereRail.grabbed) this.sphereRail.setValue(index / 3);
  }

  layout(halfW: number, halfH: number): void {
    if (halfW === this.lastHalfW && halfH === this.lastHalfH) return;
    this.lastHalfW = halfW;
    this.lastHalfH = halfH;
    const z = GLOVE_PLANE_Z;
    const railLen = Math.min(0.5, halfH * 1.0);
    this.zoomRail.layout(railLen);
    this.zoomRail.group.position.set(-halfW * 0.86, 0, z);
    this.sphereRail.layout(Math.min(0.6, halfW * 0.9));
    this.sphereRail.group.position.set(0, halfH * 0.66, z);
    const spacing = Math.min(0.17, halfH * 0.34);
    this.buttons.forEach((button, i) => {
      button.group.position.set(halfW * 0.84, (1 - i) * spacing, z + 0.03);
    });
    this.group.updateMatrixWorld(true);
    for (const obj of [this.zoomRail.group, this.sphereRail.group, ...this.buttons.map((b) => b.group)]) {
      obj.updateMatrix();
    }
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (!visible) this.fade = 0;
  }

  /** Strict first-priority arbitration. Returns whether the camera must stay still this frame. */
  update(dt: number, hands: HandSlot[], handsFresh: boolean): UiInteractResult {
    this.fade = Math.min(1, this.fade + dt * 4);
    this.hoveredId = null;
    let controlHover = false;
    let locked = false;
    let grabbedId: string | null = null;

    for (let hi = 0; hi < hands.length; hi += 1) {
      const hand = hands[hi];
      const present = hand.present && handsFresh;
      const pinching = present && hand.pinching;
      const justPinched = pinching && !this.wasPinching[hi];
      this.wasPinching[hi] = pinching;

      const grab = this.grabs.get(hi);
      if (!present) {
        if (grab?.kind === 'rail') grab.rail.release();
        this.grabs.delete(hi);
        continue;
      }
      const L = hand.landmarks;
      _pinch.set((L[12] + L[24]) / 2, (L[13] + L[25]) / 2, (L[14] + L[26]) / 2);
      _tip.set(L[24], L[25], L[26]);
      _palm.set((L[0] + L[15] + L[27] + L[39] + L[51]) / 5, (L[1] + L[16] + L[28] + L[40] + L[52]) / 5, (L[2] + L[17] + L[29] + L[41] + L[53]) / 5);

      if (grab) {
        if (pinching) {
          locked = true;
          if (grab.kind === 'rail') {
            grab.rail.drag(_pinch);
            grabbedId = grab.rail.id;
          } else {
            grabbedId = grab.nodeId;
          }
          continue;
        }
        if (grab.kind === 'rail') grab.rail.release();
        this.grabs.delete(hi);
        continue;
      }

      let bestDist = MAGNETIC_SNAP_RADIUS;
      let bestRail: SpatialPinchRail | null = null;
      for (const rail of [this.zoomRail, this.sphereRail]) {
        const d = rail.beadLocal(_bead).distanceTo(_pinch);
        if (d < bestDist + 0.03) {
          bestDist = d;
          bestRail = rail;
        }
      }
      if (bestRail) {
        controlHover = true;
        this.hoveredId = bestRail.id;
        if (justPinched || pinching) {
          locked = true;
          bestRail.grab();
          this.grabs.set(hi, { handIndex: hi, kind: 'rail', rail: bestRail });
          grabbedId = bestRail.id;
        }
        continue;
      }

      let hoveredButton: SpatialPokeButton | null = null;
      let buttonDist = MAGNETIC_SNAP_RADIUS;
      for (const button of this.buttons) {
        const d = Math.min(button.planarDistance(_tip), button.planarDistance(_pinch));
        const depthGap = Math.abs(_tip.z - (button.group.position.z));
        if (d < buttonDist && depthGap < 0.3) {
          buttonDist = d;
          hoveredButton = button;
        }
      }
      if (hoveredButton) {
        controlHover = true;
        this.hoveredId = hoveredButton.id;
        const reach = THREE.MathUtils.clamp((_tip.z - _palm.z - POKE_MIN_REACH) / (POKE_FULL_REACH - POKE_MIN_REACH), 0, 1);
        const pointing = hand.control?.posture === 'point';
        hoveredButton.push(pointing ? reach : 0);
        if (justPinched) hoveredButton.tap();
        if (pointing && reach > 0.05) locked = true;
        if (pinching) locked = true;
        continue;
      }

      const nodeId = this.actions.probeNode(_pinch, MAGNETIC_SNAP_RADIUS);
      if (nodeId) {
        this.hoveredId = nodeId;
        if (justPinched) {
          locked = true;
          this.grabs.set(hi, { handIndex: hi, kind: 'node', nodeId });
          this.actions.onNodeGrab(nodeId);
          grabbedId = nodeId;
        }
      }
    }

    this.zoomRail.update(dt, this.hoveredId === this.zoomRail.id);
    this.sphereRail.update(dt, this.hoveredId === this.sphereRail.id);
    for (const button of this.buttons) button.update(dt, this.hoveredId === button.id);

    return { locked, hovering: controlHover, grabbedId };
  }

  dispose(): void {
    this.zoomRail.dispose();
    this.sphereRail.dispose();
    for (const button of this.buttons) button.dispose();
  }
}
