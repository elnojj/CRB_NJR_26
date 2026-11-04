import * as THREE from 'three';
import { coverFit, type MediaPlaybackManager, type VideoSlot } from './mediaPlayback';

/**
 * Nodes that carry approved video play it inside their circular medallion. The still poster stays on the
 * sprite until the playback manager grants the node a decoder and the first frame arrives; then the sprite
 * swaps to the live texture, masked to the same disc, and swaps back when the decoder is taken away.
 */

const MASK_PX = 128;
const RING_PX = 256;
const NEAR_FULL_PRIORITY = 16;
const FOCUS_BOOST = 60;

interface Entry {
  nodeId: string;
  key: string;
  sprite: THREE.Sprite;
  poster: THREE.Texture | null;
  ring: THREE.Sprite;
  ringMat: THREE.SpriteMaterial;
  ringTexture: THREE.CanvasTexture;
  video: VideoSlot;
}

export interface NodeVideoFrame {
  camera: THREE.Camera;
  focusedNodeId: string | null;
  /** Media tube open: its tiles take priority over node medallions. */
  suspended: boolean;
}

export class NodeVideoMedallions {
  private readonly entries = new Map<string, Entry>();
  private readonly mask: THREE.CanvasTexture;
  private readonly world = new THREE.Vector3();
  private readonly ndc = new THREE.Vector3();

  constructor(private readonly playback: MediaPlaybackManager) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = MASK_PX;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, MASK_PX, MASK_PX);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(MASK_PX / 2, MASK_PX / 2, MASK_PX / 2 - (10 * MASK_PX) / 256, 0, Math.PI * 2);
      ctx.fill();
    }
    this.mask = new THREE.CanvasTexture(canvas);
  }

  register(nodeId: string, sprite: THREE.Sprite, videoUrl: string, accentCss: string): void {
    if (this.entries.has(nodeId)) return;
    const key = `node:${nodeId}`;
    const video = this.playback.register(key, videoUrl);

    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = ringCanvas.height = RING_PX;
    const ringCtx = ringCanvas.getContext('2d');
    if (ringCtx) {
      ringCtx.beginPath();
      ringCtx.arc(RING_PX / 2, RING_PX / 2, RING_PX / 2 - 10, 0, Math.PI * 2);
      ringCtx.lineWidth = 12;
      ringCtx.strokeStyle = accentCss;
      ringCtx.stroke();
    }
    const ringTexture = new THREE.CanvasTexture(ringCanvas);
    ringTexture.colorSpace = THREE.SRGBColorSpace;
    const ringMat = new THREE.SpriteMaterial({ map: ringTexture, transparent: true, toneMapped: false, depthWrite: false });
    const ring = new THREE.Sprite(ringMat);
    ring.visible = false;
    ring.renderOrder = 2;
    sprite.add(ring);

    this.entries.set(nodeId, {
      nodeId,
      key,
      sprite,
      poster: (sprite.material as THREE.SpriteMaterial).map,
      ring,
      ringMat,
      ringTexture,
      video,
    });
  }

  update(frame: NodeVideoFrame): void {
    for (const entry of this.entries.values()) {
      this.playback.setPriority(entry.key, frame.suspended ? 0 : this.priorityFor(entry, frame));
      this.syncTexture(entry);
    }
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      this.playback.unregister(entry.key);
      entry.sprite.remove(entry.ring);
      entry.ringMat.dispose();
      entry.ringTexture.dispose();
    }
    this.entries.clear();
    this.mask.dispose();
  }

  private priorityFor(entry: Entry, frame: NodeVideoFrame): number {
    entry.sprite.getWorldPosition(this.world);
    this.ndc.copy(this.world).project(frame.camera);
    const onScreen = this.ndc.z < 1 && Math.abs(this.ndc.x) <= 1.05 && Math.abs(this.ndc.y) <= 1.05;
    if (!onScreen) return 0;
    const distance = this.world.distanceTo(frame.camera.position);
    const proximity = Math.max(0.5, NEAR_FULL_PRIORITY - distance * 0.4);
    return proximity + (frame.focusedNodeId === entry.nodeId ? FOCUS_BOOST : 0);
  }

  private syncTexture(entry: Entry): void {
    const material = entry.sprite.material as THREE.SpriteMaterial;
    const live = entry.video.live && entry.video.texture !== null;
    const wanted = live ? entry.video.texture : entry.poster;
    if (material.map === wanted) return;
    if (live && entry.video.texture && entry.video.aspect) coverFit(entry.video.texture, entry.video.aspect, 1);
    material.map = wanted;
    material.alphaMap = live ? this.mask : null;
    material.needsUpdate = true;
    entry.ring.visible = live;
  }
}
