/**
 * One focused node card drawn as a camera-facing WebGL sprite.
 * One detailed target, camera-space depth/frustum/occlusion checks, and pixel-space safe-area placement.
 */
import * as THREE from 'three';
import { placeCallout, projectCalloutAnchor, selectCallout, type CalloutRect, type CalloutSphere } from './calloutLayout';

export type SpatialBillboardSpec = {
  id: string;
  label: string;
  sublabel?: string;
  /** What the node holds (media counts), drawn as a third line. */
  meta?: string;
  colour: string;
  worldPos: THREE.Vector3;
  focused?: boolean;
  priority?: number;
  ownerSphereId?: string;
  target?: THREE.Object3D;
};

type SpriteEntry = {
  sprite: THREE.Sprite;
  fingerprint: string;
};

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

export class SpatialLabelBillboardLayer {
  readonly group = new THREE.Group();
  private sprites = new Map<string, SpriteEntry>();

  constructor() {
    this.group.name = 'spatial-label-billboards';
    this.group.renderOrder = 40;
  }

  sync(specs: SpatialBillboardSpec[], camera: THREE.PerspectiveCamera, options: {
    viewport: { w: number; h: number }; safeRect?: CalloutRect; blocked?: readonly CalloutRect[];
    spheres?: readonly CalloutSphere[]; occluders?: THREE.Object3D[]; maxDepth?: number;
  }): { id: string; x: number; y: number } | null {
    const spec = selectCallout(specs);
    for (const [id, entry] of this.sprites) {
      if (id === spec?.id) continue;
      this.group.remove(entry.sprite);
      const material = entry.sprite.material as THREE.SpriteMaterial;
      material.map?.dispose(); material.dispose();
      this.sprites.delete(id);
    }
    if (!spec) return null;
    let entry = this.sprites.get(spec.id);
    if (entry) entry.sprite.visible = false;
    const anchor = projectCalloutAnchor(camera, spec.worldPos, options.viewport, {
      spheres: options.spheres, ownerSphereId: spec.ownerSphereId,
      occluders: options.occluders, target: spec.target, maxDepth: options.maxDepth,
    });
    if (!anchor) return null;
    const safe = options.safeRect ?? { x: 0, y: 0, ...options.viewport };
    const width = Math.min(280, safe.w - 16);
    if (width < 256) return null;
    const placed = placeCallout(anchor, { w: width, h: width * (spec.meta ? 200 : 160) / 512 }, safe, options.blocked);
    if (!placed) return null;
    const fingerprint = `${spec.label}|${spec.sublabel ?? ''}|${spec.meta ?? ''}|${spec.colour}`;
    if (!entry) {
      const map = new THREE.CanvasTexture(paintLabelCanvas(spec.label, spec.sublabel, spec.meta, true));
      map.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: true });
      entry = { sprite: new THREE.Sprite(material), fingerprint };
      this.sprites.set(spec.id, entry);
      this.group.add(entry.sprite);
    } else if (entry.fingerprint !== fingerprint) {
      const map = (entry.sprite.material as THREE.SpriteMaterial).map as THREE.CanvasTexture;
      map.image = paintLabelCanvas(spec.label, spec.sublabel, spec.meta, true);
      map.needsUpdate = true;
      entry.fingerprint = fingerprint;
    }
    const projected = spec.worldPos.clone().project(camera);
    projected.x = ((placed.x + placed.w / 2) / options.viewport.w) * 2 - 1;
    projected.y = 1 - ((placed.y + placed.h / 2) / options.viewport.h) * 2;
    entry.sprite.position.copy(projected.unproject(camera));
    const worldPerPixel = 2 * anchor.depth * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / options.viewport.h;
    entry.sprite.scale.set(placed.w * worldPerPixel, placed.h * worldPerPixel, 1);
    entry.sprite.visible = true;
    entry.sprite.renderOrder = 1000;
    return { id: spec.id, x: anchor.x, y: anchor.y };
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
