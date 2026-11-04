import * as THREE from 'three';
import gsap from 'gsap';
import { PROJECT_MEDIA_TUBE_SPECS, buildProjectMediaTubeItems, type ProjectMediaTubeItem } from './mediaTubeItems';
import { coverFit, type MediaPlaybackManager, type VideoSlot } from './mediaPlayback';
import { drawTokenGlyph, paintMediaSlotToken, paintTokenRing } from './nodeTokens';

/**
 * The cylindrical media tube: 24 slots around a ring. A slot with approved media shows its poster and, for
 * video, upgrades to a live texture as soon as the playback manager grants it a decoder. A slot without
 * media shows a generated token (never a stand-in photo) so the tube reads as complete without clutter.
 */

const TILE_TEX_W = 640;
const TILE_TEX_H = 360;
const TOKEN_TEX_PX = 256;
const TOKEN_RADIUS = 0.46;
const TILE_OPACITY = 0.94;
const TILE_SCALE = 0.62;
const REVEAL_SECONDS = 0.9;
const REVEAL_STAGGER = 0.05;
const FOCUS_BOOST = 100;
const VIDEO_URL = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export const tubeItemHasMedia = (item: ProjectMediaTubeItem | undefined): boolean => Boolean(item?.url || item?.posterUrl);

export const tubeItemVideoUrl = (item: ProjectMediaTubeItem | undefined): string | null =>
  item && item.kind === 'video' && item.url && VIDEO_URL.test(item.url) ? item.url : null;

export const tubeVideoKey = (projectId: string, index: number): string => `tube:${projectId}:${index}`;

interface SlotRuntime {
  tile: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  token: THREE.Group;
  tokenRing: THREE.Mesh;
  poster: THREE.CanvasTexture | null;
  video: VideoSlot | null;
  videoKey: string | null;
  reveal: { k: number };
  focusScale: number;
}

export interface MediaTubeFrame {
  camera: THREE.Camera;
  active: boolean;
  focusedTileIndex: number | null;
  reducedMotion: boolean;
}

export interface MediaTubeLayerOptions {
  playback: MediaPlaybackManager;
  anisotropy: number;
}

export class MediaTubeLayer {
  readonly group = new THREE.Group();
  readonly tileMeshes: THREE.Mesh[] = [];

  private readonly slots: SlotRuntime[] = [];
  private readonly tokenFaceCache = new Map<string, THREE.CanvasTexture>();
  private readonly tokenFaceGeo = new THREE.CircleGeometry(TOKEN_RADIUS, 48);
  private readonly tokenRingGeo = new THREE.PlaneGeometry(TOKEN_RADIUS * 2.36, TOKEN_RADIUS * 2.36);
  private readonly tokenRingTexture: THREE.CanvasTexture;
  private mountedProjectId = '';
  private revealTimeline: gsap.core.Timeline | null = null;
  private readonly worldPos = new THREE.Vector3();
  private readonly groupQuat = new THREE.Quaternion();

  constructor(private readonly options: MediaTubeLayerOptions) {
    this.group.visible = false;

    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = ringCanvas.height = TOKEN_TEX_PX;
    const ringCtx = ringCanvas.getContext('2d');
    if (ringCtx) paintTokenRing(ringCtx, TOKEN_TEX_PX, '#b4ddff');
    this.tokenRingTexture = new THREE.CanvasTexture(ringCanvas);
    this.tokenRingTexture.colorSpace = THREE.SRGBColorSpace;

    const [tileW, tileH] = PROJECT_MEDIA_TUBE_SPECS.slotSizeU;
    const { columns, radiusU: r, rowPitchU, maxMountedTiles } = PROJECT_MEDIA_TUBE_SPECS;
    for (let idx = 0; idx < maxMountedTiles; idx += 1) {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const theta = (col / columns) * Math.PI * 2;
      const y = (1 - row) * rowPitchU;

      const tileGeo = new THREE.PlaneGeometry(tileW * TILE_SCALE, tileH * TILE_SCALE, 8, 1);
      const pos = tileGeo.attributes.position;
      for (let v = 0; v < pos.count; v += 1) {
        pos.setZ(v, (1 - Math.cos(pos.getX(v) / r)) * r * 0.35);
      }
      tileGeo.computeVertexNormals();

      const tile = new THREE.Mesh(
        tileGeo,
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: TILE_OPACITY })
      );
      tile.position.set(Math.sin(theta) * r, y, Math.cos(theta) * r);
      tile.lookAt(0, y, 0);
      tile.userData = { isMediaTubeTile: true, tileIndex: idx };
      tile.visible = false;
      this.group.add(tile);
      this.tileMeshes.push(tile);

      const token = new THREE.Group();
      token.position.copy(tile.position);
      token.lookAt(0, y, 0);
      token.userData = { isMediaTokenSlot: true, tileIndex: idx };
      token.visible = false;
      const tokenRing = new THREE.Mesh(
        this.tokenRingGeo,
        new THREE.MeshBasicMaterial({
          map: this.tokenRingTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      tokenRing.position.z = -0.002;
      token.add(tokenRing);
      this.group.add(token);

      this.slots.push({
        tile,
        token,
        tokenRing,
        poster: null,
        video: null,
        videoKey: null,
        reveal: { k: 1 },
        focusScale: 1,
      });
    }
  }

  get projectId(): string {
    return this.mountedProjectId;
  }

  /** Rebuild every slot for one project's media. Cheap when the project is already mounted. */
  mount(projectId: string, reducedMotion: boolean): void {
    if (projectId === this.mountedProjectId) return;
    this.mountedProjectId = projectId;
    const items = buildProjectMediaTubeItems(projectId);
    this.revealTimeline?.kill();

    this.slots.forEach((slot, idx) => {
      this.releaseSlot(slot);
      const item = items[idx];
      const hasMedia = tubeItemHasMedia(item);
      slot.tile.visible = hasMedia;
      slot.token.visible = !hasMedia;

      if (hasMedia && item) {
        slot.poster = this.buildPosterTexture(item);
        slot.tile.material.map = slot.poster;
        slot.tile.material.needsUpdate = true;
        const videoUrl = tubeItemVideoUrl(item);
        if (videoUrl) {
          slot.videoKey = tubeVideoKey(projectId, idx);
          slot.video = this.options.playback.register(slot.videoKey, videoUrl);
        }
      } else {
        this.setTokenFace(slot, idx, item);
      }
    });

    this.playReveal(reducedMotion);
  }

  /** Per-frame: slot scale, token spin, poster/video swap and decoder priorities. */
  update(dt: number, frame: MediaTubeFrame): void {
    const { playback } = this.options;
    // Tokens carry text, so they always face the viewer instead of the tube axis.
    this.group.getWorldQuaternion(this.groupQuat).invert().multiply(frame.camera.quaternion);
    for (let idx = 0; idx < this.slots.length; idx += 1) {
      const slot = this.slots[idx];
      const focused = frame.focusedTileIndex === idx;

      if (slot.videoKey) {
        if (!frame.active || !slot.tile.visible) {
          playback.setPriority(slot.videoKey, 0);
        } else {
          slot.tile.getWorldPosition(this.worldPos);
          const distance = this.worldPos.distanceTo(frame.camera.position);
          playback.setPriority(slot.videoKey, Math.max(1, 30 - distance) + (focused ? FOCUS_BOOST : 0));
        }
        this.syncVideoTexture(slot);
      }

      const targetScale = focused ? 1.18 : 1;
      slot.focusScale = THREE.MathUtils.damp(slot.focusScale, targetScale, 8, dt);
      const reveal = slot.reveal.k;
      slot.tile.scale.setScalar(slot.focusScale * (0.92 + 0.08 * reveal));
      slot.tile.material.opacity = TILE_OPACITY * reveal;

      if (slot.token.visible) {
        slot.token.quaternion.copy(this.groupQuat);
        slot.token.scale.setScalar((focused ? 1.3 : 1) * (0.8 + 0.2 * reveal));
        for (const child of slot.token.children) {
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = reveal;
        }
        if (!frame.reducedMotion) slot.tokenRing.rotation.z -= dt * 0.35;
      }
    }
  }

  dispose(): void {
    this.revealTimeline?.kill();
    for (const slot of this.slots) {
      this.releaseSlot(slot);
      slot.tile.geometry.dispose();
      slot.tile.material.dispose();
      for (const child of slot.token.children) ((child as THREE.Mesh).material as THREE.Material).dispose();
    }
    for (const tex of this.tokenFaceCache.values()) tex.dispose();
    this.tokenFaceCache.clear();
    this.tokenFaceGeo.dispose();
    this.tokenRingGeo.dispose();
    this.tokenRingTexture.dispose();
  }

  private releaseSlot(slot: SlotRuntime): void {
    if (slot.videoKey) this.options.playback.unregister(slot.videoKey);
    slot.videoKey = null;
    slot.video = null;
    slot.tile.material.map = null;
    slot.poster?.dispose();
    slot.poster = null;
  }

  private syncVideoTexture(slot: SlotRuntime): void {
    const video = slot.video;
    if (!video) return;
    const material = slot.tile.material;
    const live = video.live && video.texture !== null;
    const wanted = live ? video.texture : slot.poster;
    if (material.map === wanted) return;
    if (live && video.texture && video.aspect) coverFit(video.texture, video.aspect);
    material.map = wanted;
    material.needsUpdate = true;
  }

  private playReveal(reducedMotion: boolean): void {
    const proxies = this.slots.map((s) => s.reveal);
    if (reducedMotion) {
      for (const p of proxies) p.k = 1;
      return;
    }
    for (const p of proxies) p.k = 0;
    this.revealTimeline = gsap.timeline().to(proxies, {
      k: 1,
      duration: REVEAL_SECONDS,
      ease: 'power3.out',
      stagger: REVEAL_STAGGER,
    });
  }

  private setTokenFace(slot: SlotRuntime, idx: number, item: ProjectMediaTubeItem | undefined): void {
    const kind = item?.kind ?? 'image';
    const accent = item?.accentHex ?? '#B4DDFF';
    const key = `${kind}|${accent}|${idx}`;
    let tex = this.tokenFaceCache.get(key);
    if (!tex) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = TOKEN_TEX_PX;
      const ctx = canvas.getContext('2d');
      if (ctx) paintMediaSlotToken(ctx, TOKEN_TEX_PX, { kind, accentHex: accent, slot: idx + 1 });
      tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.options.anisotropy;
      this.tokenFaceCache.set(key, tex);
    }
    const existing = slot.token.children.find((c) => c !== slot.tokenRing) as THREE.Mesh | undefined;
    if (existing) {
      const mat = existing.material as THREE.MeshBasicMaterial;
      mat.map = tex;
      mat.needsUpdate = true;
      return;
    }
    const face = new THREE.Mesh(
      this.tokenFaceGeo,
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    slot.token.add(face);
  }

  private buildPosterTexture(tile: ProjectMediaTubeItem): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_TEX_W;
    canvas.height = TILE_TEX_H;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.options.anisotropy;
    if (!ctx) return tex;

    const frameStroke = () => {
      ctx.strokeStyle = tile.accentHex;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, TILE_TEX_W - 3, TILE_TEX_H - 3);
      ctx.globalAlpha = 1;
    };

    const baseCard = () => {
      const grad = ctx.createLinearGradient(0, 0, TILE_TEX_W, TILE_TEX_H);
      grad.addColorStop(0, '#16314a');
      grad.addColorStop(1, '#0c1a2a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, TILE_TEX_W, TILE_TEX_H);
      const rad = ctx.createRadialGradient(TILE_TEX_W / 2, TILE_TEX_H / 2, 20, TILE_TEX_W / 2, TILE_TEX_H / 2, TILE_TEX_W * 0.4);
      rad.addColorStop(0, `${tile.accentHex}55`);
      rad.addColorStop(1, 'rgba(12, 26, 42, 0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, TILE_TEX_W, TILE_TEX_H);
      if (tile.kind === 'video') {
        drawTokenGlyph(ctx, 'play', TILE_TEX_W / 2, TILE_TEX_H / 2, 46, 'rgba(255,255,255,0.85)', 5);
      }
      frameStroke();
    };

    baseCard();
    tex.needsUpdate = true;

    if (tile.posterUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const iw = img.naturalWidth || TILE_TEX_W;
        const ih = img.naturalHeight || TILE_TEX_H;
        const scale = Math.min(TILE_TEX_W / iw, TILE_TEX_H / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.fillStyle = '#05090E';
        ctx.fillRect(0, 0, TILE_TEX_W, TILE_TEX_H);
        ctx.drawImage(img, (TILE_TEX_W - dw) / 2, (TILE_TEX_H - dh) / 2, dw, dh);
        frameStroke();
        tex.needsUpdate = true;
      };
      img.src = tile.posterUrl;
    }
    return tex;
  }
}
