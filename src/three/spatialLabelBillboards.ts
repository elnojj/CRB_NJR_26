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
  /** What the node holds (media counts), drawn as a third line. */
  meta?: string;
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
/** Label width as a share of the view height (about 210px on a 768px-tall iPad). */
const LABEL_VIEW_SHARE = 0.28;
/** Beyond this camera distance, hide secondary metadata (LOD). */
const MACRO_DIST = 14;

const CARD_COBALT = '#0050FF';
const CARD_PAD_X = 20;
const CARD_PAD_Y = 20;
const CARD_MIN_WIDTH = 290;
const CARD_FONT_PX = 24;
const CARD_TITLE_BLOCK_PX = 49;
const CARD_LINE_PX = 30;
const CARD_META_GAP_PX = 10;
const CARD_TITLE_TRACKING_PX = 2.4;

type LetterSpacingContext = CanvasRenderingContext2D & { letterSpacing?: string };

function paintLabelCanvas(
  label: string,
  sublabel: string | undefined,
  meta: string | undefined,
  focused: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = meta ? 200 : 160;
  const ctx = canvas.getContext('2d')! as LetterSpacingContext;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const title = label.toUpperCase();
  const titleFont = `700 ${CARD_FONT_PX}px "Inter", "Helvetica Neue", sans-serif`;
  const bodyFont = `500 ${CARD_FONT_PX}px "JetBrains Mono", ui-monospace, monospace`;
  const hasDetail = Boolean(sublabel || meta);

  ctx.font = titleFont;
  ctx.letterSpacing = `${CARD_TITLE_TRACKING_PX}px`;
  const titleW = ctx.measureText(title).width;
  ctx.letterSpacing = '0px';
  ctx.font = bodyFont;
  const subW = sublabel ? ctx.measureText(sublabel).width : 0;
  const metaW = meta ? ctx.measureText(meta).width : 0;

  const boxW = Math.min(480, Math.max(CARD_MIN_WIDTH, titleW, subW, metaW) + CARD_PAD_X * 2);
  const titleBlock = hasDetail ? CARD_TITLE_BLOCK_PX : CARD_FONT_PX + 4;
  const boxH =
    CARD_PAD_Y * 2 +
    titleBlock +
    (sublabel ? CARD_LINE_PX : 0) +
    (meta ? CARD_LINE_PX + CARD_META_GAP_PX : 0);
  const x = (canvas.width - boxW) / 2;
  const y = (canvas.height - boxH) / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.strokeStyle = focused ? CARD_COBALT : 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = focused ? 3 : 2;
  roundRect(ctx, x, y, boxW, boxH, 24);
  ctx.fill();
  ctx.stroke();

  const innerLeft = x + CARD_PAD_X;
  const innerRight = x + boxW - CARD_PAD_X;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = CARD_COBALT;
  ctx.font = titleFont;
  ctx.letterSpacing = `${CARD_TITLE_TRACKING_PX}px`;
  const titleY = y + CARD_PAD_Y + CARD_FONT_PX / 2 + 2;
  ctx.fillText(title, innerLeft, titleY, innerRight - innerLeft);
  ctx.letterSpacing = '0px';

  let cursorY = y + CARD_PAD_Y + titleBlock;
  if (hasDetail) {
    const ruleY = y + CARD_PAD_Y + CARD_FONT_PX + 12;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(innerLeft, ruleY, innerRight - innerLeft, 2);
  }
  ctx.font = bodyFont;
  if (sublabel) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(sublabel, innerLeft, cursorY + CARD_LINE_PX / 2, innerRight - innerLeft);
    cursorY += CARD_LINE_PX;
  }
  if (meta) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(meta, innerLeft, cursorY + CARD_META_GAP_PX + CARD_LINE_PX / 2, innerRight - innerLeft);
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
      const fingerprint = `${spec.label}|${effectiveSub ?? ''}|${spec.meta ?? ''}|${spec.colour}|${spec.focused ? 1 : 0}|${front ? 1 : 0}`;

      let entry = this.sprites.get(spec.id);
      if (!entry) {
        const map = new THREE.CanvasTexture(
          paintLabelCanvas(spec.label, effectiveSub, spec.meta, !!spec.focused)
        );
        map.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.SpriteMaterial({
          map,
          transparent: true,
          // Drawn over the node cages so rings never cut through the text.
          depthTest: false,
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
        map.image = paintLabelCanvas(spec.label, effectiveSub, spec.meta, !!spec.focused);
        map.needsUpdate = true;
        entry.fingerprint = fingerprint;
      }

      const sprite = entry.sprite;
      sprite.visible = front;
      if (!front) continue;

      sprite.position.copy(spec.worldPos);
      sprite.position.y += 1.15;
      // Constant on-screen size for any distance and lens: a label spans a fixed share of the view height.
      const halfView = Math.tan(THREE.MathUtils.degToRad(((camera as THREE.PerspectiveCamera).fov ?? 40) / 2));
      const s = THREE.MathUtils.clamp(dist * halfView * LABEL_VIEW_SHARE * 2, 0.08, 6);
      sprite.scale.set(s, s * ((spec.meta ? 200 : 160) / 512), 1);
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
