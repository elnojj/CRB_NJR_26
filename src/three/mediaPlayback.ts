import * as THREE from 'three';

/**
 * One owner for every video that plays inside the WebGL scene (media tube tiles and node medallions).
 * Videos start on their own, muted, looping and inline, but only as many as the device can decode at once:
 * the highest-priority slots play, the rest keep showing their poster and release their decoder.
 *
 * Autoplay is never assumed. A rejected `play()` marks the slot `blocked`; the first user gesture anywhere
 * on the page retries every blocked slot. Reduced-motion users get posters only, and a hidden tab releases
 * every decoder and restarts its videos when it returns.
 */

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'blocked' | 'error';

export interface VideoSlot {
  readonly key: string;
  readonly url: string;
  readonly state: PlaybackState;
  /** First frame has been decoded; the texture can replace the poster. */
  readonly live: boolean;
  /** Intrinsic width / height once known. */
  readonly aspect: number | null;
  readonly texture: THREE.VideoTexture | null;
}

export interface RankEntry {
  key: string;
  priority: number;
  active: boolean;
}

/** Slots allowed to play: highest priority first, already-playing slots get a margin so they do not thrash. */
export function rankPlayable(entries: readonly RankEntry[], budget: number, stickyMargin = 4): Set<string> {
  const wanted = entries
    .filter((e) => e.priority > 0)
    .map((e) => ({ key: e.key, score: e.priority + (e.active ? stickyMargin : 0) }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return new Set(wanted.slice(0, Math.max(0, budget)).map((e) => e.key));
}

export interface PlaybackOptions {
  maxVideos: number;
  reducedMotion: () => boolean;
  createVideo?: () => HTMLVideoElement;
  createTexture?: (video: HTMLVideoElement) => THREE.VideoTexture;
}

interface InternalSlot {
  key: string;
  url: string;
  priority: number;
  state: PlaybackState;
  failed: boolean;
  live: boolean;
  aspect: number | null;
  video: HTMLVideoElement | null;
  texture: THREE.VideoTexture | null;
  teardown: (() => void) | null;
  view: VideoSlot;
}

function defaultCreateVideo(): HTMLVideoElement {
  return document.createElement('video');
}

function defaultCreateTexture(video: HTMLVideoElement): THREE.VideoTexture {
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

export class MediaPlaybackManager {
  private readonly slots = new Map<string, InternalSlot>();
  private maxVideos: number;
  private disposed = false;
  private readonly onGesture = (): void => this.unlock();
  private readonly onVisibility = (): void => this.reconcile();

  constructor(private readonly options: PlaybackOptions) {
    this.maxVideos = options.maxVideos;
    if (typeof window !== 'undefined') {
      for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
        window.addEventListener(type, this.onGesture, { passive: true });
      }
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
  }

  setBudget(maxVideos: number): void {
    this.maxVideos = maxVideos;
    this.reconcile();
  }

  /** Idempotent. Returns a live view that updates as the video loads and plays. */
  register(key: string, url: string): VideoSlot {
    const existing = this.slots.get(key);
    if (existing && existing.url === url) return existing.view;
    if (existing) this.unregister(key);
    const slot: InternalSlot = {
      key,
      url,
      priority: 0,
      state: 'idle',
      failed: false,
      live: false,
      aspect: null,
      video: null,
      texture: null,
      teardown: null,
      view: null as unknown as VideoSlot,
    };
    slot.view = {
      key,
      url,
      get state() {
        return slot.state;
      },
      get live() {
        return slot.live;
      },
      get aspect() {
        return slot.aspect;
      },
      get texture() {
        return slot.texture;
      },
    };
    this.slots.set(key, slot);
    return slot.view;
  }

  unregister(key: string): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    this.deactivate(slot);
    this.slots.delete(key);
  }

  /** Priority above zero asks to play; the budget decides who actually does. */
  setPriority(key: string, priority: number): void {
    const slot = this.slots.get(key);
    if (slot) slot.priority = priority;
  }

  activeCount(): number {
    let n = 0;
    for (const slot of this.slots.values()) if (slot.video) n += 1;
    return n;
  }

  reconcile(): void {
    if (this.disposed) return;
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const allowed =
      hidden || this.options.reducedMotion()
        ? new Set<string>()
        : rankPlayable(
            Array.from(this.slots.values(), (s) => ({ key: s.key, priority: s.failed ? 0 : s.priority, active: s.video !== null })),
            this.maxVideos
          );
    // Release first so a swap never briefly exceeds the decoder budget.
    for (const slot of this.slots.values()) {
      if (slot.video && !allowed.has(slot.key)) this.deactivate(slot);
    }
    for (const slot of this.slots.values()) {
      if (!slot.video && allowed.has(slot.key)) this.activate(slot);
    }
  }

  /** Retry every blocked slot from inside a user gesture. */
  unlock(): void {
    for (const slot of this.slots.values()) {
      if (slot.state === 'blocked' && slot.video) this.tryPlay(slot);
    }
  }

  dispose(): void {
    this.disposed = true;
    if (typeof window !== 'undefined') {
      for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
        window.removeEventListener(type, this.onGesture);
      }
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    for (const slot of this.slots.values()) this.deactivate(slot);
    this.slots.clear();
  }

  private activate(slot: InternalSlot): void {
    const video = (this.options.createVideo ?? defaultCreateVideo)();
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    slot.video = video;
    slot.state = 'loading';
    slot.live = false;

    const onMeta = (): void => {
      if (video.videoWidth > 0 && video.videoHeight > 0) slot.aspect = video.videoWidth / video.videoHeight;
    };
    const onPlaying = (): void => {
      onMeta();
      slot.state = 'playing';
      slot.live = true;
    };
    const onPause = (): void => {
      if (slot.state !== 'playing' || !video.paused) return;
      // The browser paused it (Low Power Mode, backgrounding): the next gesture may resume it.
      slot.live = false;
      slot.state = 'blocked';
    };
    const onError = (): void => {
      // Release the decoder slot now; a dead URL must not starve healthy videos.
      slot.failed = true;
      this.deactivate(slot);
      slot.state = 'error';
    };
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);
    slot.teardown = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
    };

    slot.texture = (this.options.createTexture ?? defaultCreateTexture)(video);
    video.src = slot.url;
    this.tryPlay(slot);
  }

  private tryPlay(slot: InternalSlot): void {
    const video = slot.video;
    if (!video) return;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch((err: unknown) => {
        if (slot.video !== video) return;
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'AbortError') return;
        if (name === 'NotAllowedError') {
          slot.state = 'blocked';
          return;
        }
        slot.failed = true;
        this.deactivate(slot);
        slot.state = 'error';
      });
    }
  }

  private deactivate(slot: InternalSlot): void {
    const video = slot.video;
    slot.teardown?.();
    slot.teardown = null;
    slot.texture?.dispose();
    slot.texture = null;
    slot.live = false;
    slot.state = 'idle';
    slot.video = null;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }
}

/** Centre-crop a video texture so it fills the 16:9 tile without stretching. */
export function coverFit(texture: THREE.Texture, contentAspect: number, frameAspect = 16 / 9): void {
  if (contentAspect > frameAspect) {
    const k = frameAspect / contentAspect;
    texture.repeat.set(k, 1);
    texture.offset.set((1 - k) / 2, 0);
  } else {
    const k = contentAspect / frameAspect;
    texture.repeat.set(1, k);
    texture.offset.set(0, (1 - k) / 2);
  }
}
