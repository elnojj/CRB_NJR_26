import * as THREE from 'three';
import { coverFit, type VideoSlot } from '../mediaPlayback';
import { WEBGL_RENDER_ORDER } from '../renderOrder';
import type { BeatMediaContent, BeatSlot, BeatSlotContext } from './beatTypes';

const VIEWPORT_HEIGHT = 0.84;
const DEFAULT_ASPECT = 16 / 9;
const DEFAULT_ACCENT = '#5cc8ff';
const TITLE_TEXTURE_PX = 512;
const ACTIVE_VIDEO_PRIORITY = 10;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

function paintTitleCard(canvas: HTMLCanvasElement, title: string, caption: string | undefined, accentHex: string, sources?: BeatMediaContent['sources']): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, 'rgba(8,18,38,0.96)');
  bg.addColorStop(1, 'rgba(4,10,22,0.96)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accentHex;
  ctx.fillRect(width * 0.08, height * 0.2, width * 0.012, height * 0.6);
  ctx.fillStyle = '#f2f6f8';
  ctx.font = `600 ${Math.round(height * 0.16)}px "Inter", "Helvetica Neue", sans-serif`;
  ctx.textBaseline = 'middle';
  const grouped = Boolean(sources?.length);
  ctx.fillText(title, width * 0.13, height * (grouped ? 0.25 : caption ? 0.44 : 0.5), width * 0.78);
  if (grouped) {
    ctx.font = `500 ${Math.round(height * 0.065)}px "Inter", sans-serif`;
    sources!.slice(0, 3).forEach((source, index) => ctx.fillText(source.title, width * 0.13, height * (0.44 + index * 0.12), width * 0.78));
    if (sources!.length > 3) ctx.fillText(`${sources!.length - 3} additional sources`, width * 0.13, height * 0.8, width * 0.78);
  }
  if (caption) {
    ctx.fillStyle = 'rgba(159,183,216,0.92)';
    ctx.font = `500 ${Math.round(height * 0.075)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText(caption.toUpperCase(), width * 0.13, height * (grouped ? 0.92 : 0.64), width * 0.8);
  }
}

/**
 * A framed viewport for one beat. It always draws its outline, so an empty slot reads as a deliberate
 * placeholder; an image, a live video or a generated title card fills it once content arrives. Videos go
 * through the shared playback manager, so only as many decode as the device allows.
 */
export class MediaViewportSlot implements BeatSlot<BeatMediaContent> {
  readonly object = new THREE.Group();

  private readonly planeGeometry = new THREE.PlaneGeometry(1, 1);
  private readonly frameGeometry = new THREE.EdgesGeometry(this.planeGeometry);
  private readonly frameMaterial = new THREE.LineBasicMaterial({ color: 0x8fb4e8, transparent: true, depthWrite: false });
  private readonly surfaceMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  private readonly surface = new THREE.Mesh(this.planeGeometry, this.surfaceMaterial);
  private readonly frame = new THREE.LineSegments(this.frameGeometry, this.frameMaterial);
  private readonly videoKey: string;

  private aspect = DEFAULT_ASPECT;
  private reveal = 0;
  private active = false;
  private staticTexture: THREE.Texture | null = null;
  private video: VideoSlot | null = null;
  private loadToken = 0;
  private showingVideo = false;

  constructor(private readonly ctx: BeatSlotContext) {
    this.videoKey = `beat-${ctx.index}-media`;
    this.object.name = 'BeatMediaViewport';
    this.surface.visible = false;
    this.surface.renderOrder = WEBGL_RENDER_ORDER.beatsContent;
    this.frame.renderOrder = WEBGL_RENDER_ORDER.beatsContent;
    this.object.add(this.surface, this.frame);
    this.object.visible = false;
    this.fitFrame();
  }

  apply(content: BeatMediaContent | null | undefined): void {
    this.releaseMedia();
    this.aspect = content?.aspect ?? DEFAULT_ASPECT;
    this.fitFrame();
    if (!content) {
      this.setMap(null);
      return;
    }
    const kind = content.kind;
    switch (kind) {
      case 'image':
        if (content.url) this.loadImage(content.url);
        break;
      case 'video':
        if (content.url) {
          this.video = this.ctx.playback.register(this.videoKey, content.url);
          this.ctx.playback.setPriority(this.videoKey, this.active ? ACTIVE_VIDEO_PRIORITY : 0);
        }
        break;
      case 'title': {
        const canvas = document.createElement('canvas');
        canvas.width = TITLE_TEXTURE_PX;
        canvas.height = Math.round(TITLE_TEXTURE_PX / this.aspect);
        paintTitleCard(canvas, content.title ?? '', content.caption, content.accentHex ?? DEFAULT_ACCENT, content.sources);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.staticTexture = texture;
        this.setMap(texture);
        break;
      }
      default: {
        const unreachable: never = kind;
        throw new Error(`Unhandled media kind ${String(unreachable)}`);
      }
    }
  }

  setActive(active: boolean): void {
    this.active = active;
    if (this.video) this.ctx.playback.setPriority(this.videoKey, active ? ACTIVE_VIDEO_PRIORITY : 0);
  }

  setReveal(reveal: number): void {
    this.reveal = reveal;
    const e = easeOutCubic(reveal);
    this.object.visible = reveal > 0.001;
    this.surfaceMaterial.opacity = e;
    this.frameMaterial.opacity = 0.18 + 0.5 * e;
    this.object.scale.setScalar(0.94 + 0.06 * e);
  }

  update(): void {
    const video = this.video;
    if (!video) return;
    if (video.live && video.texture) {
      if (this.surfaceMaterial.map !== video.texture) {
        coverFit(video.texture, video.aspect ?? this.aspect, this.aspect);
        this.setMap(video.texture);
        this.showingVideo = true;
      }
    } else if (this.showingVideo) {
      // The manager released the decoder and disposed the texture; drop it before the next draw.
      this.showingVideo = false;
      this.setMap(null);
    }
  }

  dispose(): void {
    this.releaseMedia();
    this.planeGeometry.dispose();
    this.frameGeometry.dispose();
    this.frameMaterial.dispose();
    this.surfaceMaterial.dispose();
    this.object.removeFromParent();
  }

  private fitFrame(): void {
    this.surface.scale.set(VIEWPORT_HEIGHT * this.aspect, VIEWPORT_HEIGHT, 1);
    this.frame.scale.copy(this.surface.scale).multiplyScalar(1.03);
  }

  private setMap(map: THREE.Texture | null): void {
    this.surfaceMaterial.map = map;
    this.surfaceMaterial.needsUpdate = true;
    this.surface.visible = map !== null;
  }

  private loadImage(url: string): void {
    const token = (this.loadToken += 1);
    new THREE.TextureLoader().load(url, (texture) => {
      if (token !== this.loadToken) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      const image = texture.image as { width?: number; height?: number } | undefined;
      if (image?.width && image.height) coverFit(texture, image.width / image.height, this.aspect);
      this.staticTexture = texture;
      this.setMap(texture);
    });
  }

  private releaseMedia(): void {
    this.loadToken += 1;
    this.showingVideo = false;
    if (this.video) {
      this.ctx.playback.unregister(this.videoKey);
      this.video = null;
    }
    this.setMap(null);
    this.staticTexture?.dispose();
    this.staticTexture = null;
  }
}
