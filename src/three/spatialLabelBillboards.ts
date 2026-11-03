/**
 * Spatial 3D label billboards — canvas-textured sprites that face the camera
 * and auto depth-sort with the WebGL scene (replaces dense HTML pill overlays).
 */
import * as THREE from 'three';

export type SpatialBillboardSpec = {
  id: string;
  label: string;
  sublabel?: string;
  colour: string;
  worldPos: THREE.Vector3;
  focused?: boolean;
};

type SpriteEntry = {
  sprite: THREE.Sprite;
  fingerprint: string;
};

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
  ctx.font = '600 36px ui-monospace, SFMono-Regular, Menlo, monospace';
  const titleW = ctx.measureText(label).width;
  ctx.font = '500 24px ui-monospace, SFMono-Regular, Menlo, monospace';
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
  ctx.font = '600 36px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width / 2, y + (sublabel ? 38 : boxH / 2));
  if (sublabel) {
    ctx.fillStyle = 'rgba(189, 203, 211, 0.95)';
    ctx.font = '500 24px ui-monospace, SFMono-Regular, Menlo, monospace';
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

export class SpatialLabelBillboardLayer {
  readonly group = new THREE.Group();
  private sprites = new Map<string, SpriteEntry>();

  constructor() {
    this.group.name = 'spatial-label-billboards';
    this.group.renderOrder = 40;
  }

  sync(specs: SpatialBillboardSpec[], camera: THREE.Camera) {
    const seen = new Set<string>();
    for (const spec of specs) {
      seen.add(spec.id);
      const fingerprint = `${spec.label}|${spec.sublabel ?? ''}|${spec.colour}|${spec.focused ? 1 : 0}`;
      let entry = this.sprites.get(spec.id);
      if (!entry) {
        const map = new THREE.CanvasTexture(
          paintLabelCanvas(spec.label, spec.sublabel, spec.colour, !!spec.focused)
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
        entry = { sprite, fingerprint };
        this.sprites.set(spec.id, entry);
        this.group.add(sprite);
      } else if (entry.fingerprint !== fingerprint) {
        const mat = entry.sprite.material as THREE.SpriteMaterial;
        const map = mat.map as THREE.CanvasTexture;
        map.image = paintLabelCanvas(spec.label, spec.sublabel, spec.colour, !!spec.focused);
        map.needsUpdate = true;
        entry.fingerprint = fingerprint;
      }
      const sprite = entry.sprite;
      sprite.position.copy(spec.worldPos);
      sprite.position.y += 1.15;
      const dist = camera.position.distanceTo(sprite.position);
      const s = THREE.MathUtils.clamp(dist * 0.085, 2.4, 5.2);
      sprite.scale.set(s, s * 0.32, 1);
      sprite.renderOrder = Math.round(1000 - dist);
    }
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
