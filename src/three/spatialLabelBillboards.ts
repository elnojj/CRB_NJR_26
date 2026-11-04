/**
 * Spatial 3D label billboards — canvas-textured sprites that face the camera
 * and auto depth-sort with the WebGL scene (replaces dense HTML pill overlays).
 * Back-face occlusion + distance LOD + screen-space collision (min 28px).
 */
import * as THREE from 'three';

export type SpatialBillboardSpec = {
  id: string;
  label: string;
  sublabel?: string;
  colour: string;
  worldPos: THREE.Vector3;
  /** Sphere / cluster center used for back-face occlusion. */
  sphereCenter?: THREE.Vector3;
  focused?: boolean;
};

type SpriteEntry = {
  sprite: THREE.Sprite;
  fingerprint: string;
};

const _toCam = new THREE.Vector3();
const _outward = new THREE.Vector3();
const _projected = new THREE.Vector3();

const MIN_LABEL_GAP_PX = 28;
/** Beyond this camera distance, hide secondary metadata (LOD). */
const MACRO_DIST = 14;

function paintLabelCanvas(
  label: string,
  sublabel: string | undefined,
  colour: string,
  focused: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padX = 28;
  ctx.font = '400 36px "JaapokkiSubtract", "Sora", "Inter", sans-serif';
  const titleW = ctx.measureText(label).width;
  ctx.font = '500 24px "JetBrains Mono", ui-monospace, monospace';
  const subW = sublabel ? ctx.measureText(sublabel).width : 0;
  const boxW = Math.min(480, Math.max(titleW, subW) + padX * 2);
  const boxH = sublabel ? 112 : 78;
  const x = (canvas.width - boxW) / 2;
  const y = (canvas.height - boxH) / 2;

  ctx.fillStyle = focused ? 'rgba(12, 22, 34, 0.82)' : 'rgba(8, 14, 22, 0.72)';
  ctx.strokeStyle = focused ? colour : 'rgba(180, 221, 255, 0.35)';
  ctx.lineWidth = focused ? 3 : 2;
  roundRect(ctx, x, y, boxW, boxH, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colour;
  ctx.font = '400 36px "JaapokkiSubtract", "Sora", "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, y + (sublabel ? 38 : boxH / 2));
  if (sublabel) {
    ctx.fillStyle = 'rgba(189, 203, 211, 0.95)';
    ctx.font = '500 24px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(sublabel, canvas.width / 2, y + 78);
  }
  return canvas;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function isFrontFacing(
  worldPos: THREE.Vector3,
  sphereCenter: THREE.Vector3 | undefined,
  camera: THREE.Camera
): boolean {
  if (!sphereCenter) return true;
  _toCam.copy(camera.position).sub(worldPos).normalize();
  _outward.copy(worldPos).sub(sphereCenter).normalize();
  return _outward.dot(_toCam) > 0.05;
}

export class SpatialLabelBillboardLayer {
  readonly group = new THREE.Group();
  private sprites = new Map<string, SpriteEntry>();

  constructor() {
    this.group.name = 'spatial-label-billboards';
    this.group.renderOrder = 40;
  }

  sync(specs: SpatialBillboardSpec[], camera: THREE.Camera) {
    const seen = new Set<string>();
    const screenAnchors: { id: string; x: number; y: number; sprite: THREE.Sprite }[] = [];
    const camDist = camera.position.length();

    for (const spec of specs) {
      seen.add(spec.id);
      const front = isFrontFacing(spec.worldPos, spec.sphereCenter, camera);
      const dist = camera.position.distanceTo(spec.worldPos);
      const showMeta = Boolean(spec.focused) || dist < MACRO_DIST || camDist < MACRO_DIST;
      const effectiveSub = showMeta ? spec.sublabel : undefined;
      const fingerprint = `${spec.label}|${effectiveSub ?? ''}|${spec.colour}|${spec.focused ? 1 : 0}|${front ? 1 : 0}`;

      let entry = this.sprites.get(spec.id);
      if (!entry) {
        const map = new THREE.CanvasTexture(
          paintLabelCanvas(spec.label, effectiveSub, spec.colour, !!spec.focused)
        );
        map.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.SpriteMaterial({
          map,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          sizeAttenuation: true,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3.6, 1.15, 1);
        entry = { sprite, fingerprint: '' };
        this.sprites.set(spec.id, entry);
        this.group.add(sprite);
      }

      if (entry.fingerprint !== fingerprint) {
        const mat = entry.sprite.material as THREE.SpriteMaterial;
        const map = mat.map as THREE.CanvasTexture;
        map.image = paintLabelCanvas(spec.label, effectiveSub, spec.colour, !!spec.focused);
        map.needsUpdate = true;
        entry.fingerprint = fingerprint;
      }

      const sprite = entry.sprite;
      sprite.visible = front;
      if (!front) continue;

      sprite.position.copy(spec.worldPos);
      sprite.position.y += 1.15;
      // Constant angular size: labels shrink with the camera instead of filling the screen up close.
      const s = THREE.MathUtils.clamp(dist * 0.085, 0.3, 5.2);
      sprite.scale.set(s, s * 0.32, 1);
      sprite.renderOrder = Math.round(1000 - dist);

      _projected.copy(sprite.position).project(camera);
      screenAnchors.push({
        id: spec.id,
        x: _projected.x,
        y: _projected.y,
        sprite,
      });
    }

    // Screen-space collision: nudge overlapping labels vertically (NDC ≈ px via later scale).
    screenAnchors.sort((a, b) => a.y - b.y);
    for (let i = 0; i < screenAnchors.length; i++) {
      for (let j = i + 1; j < screenAnchors.length; j++) {
        const a = screenAnchors[i];
        const b = screenAnchors[j];
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        // ~28px at typical viewport → ~0.04 NDC on 720p-tall; use conservative threshold.
        if (dx < 0.22 && dy < 0.08) {
          const push = (0.08 - dy) * 0.5 + 0.01;
          a.sprite.position.y += push * 1.2;
          b.sprite.position.y -= push * 1.2;
          a.y += push;
          b.y -= push;
        }
      }
    }
    void MIN_LABEL_GAP_PX;

    for (const [id, entry] of this.sprites) {
      if (seen.has(id)) continue;
      this.group.remove(entry.sprite);
      const mat = entry.sprite.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.sprites.delete(id);
    }
  }

  dispose() {
    for (const entry of this.sprites.values()) {
      this.group.remove(entry.sprite);
      const mat = entry.sprite.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.sprites.clear();
  }
}
