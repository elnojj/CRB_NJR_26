/**
 * Intro soundtrack — one HTMLAudioElement for the open-sequence master mix.
 * Playback must start inside a user gesture (first tap or key press on the live scene);
 * mobile Safari/Chrome reject unmuted play() outside one.
 */

export type IntroSoundtrackState = 'idle' | 'loading' | 'playing' | 'muted' | 'blocked' | 'error';

const LOCAL_MIX_PATH = 'assets/audio/cerebro-master-mix.m4a';
const DEFAULT_REMOTE_MIX =
  'https://video.wixstatic.com/video/227dff_5eb47ff9d6fc4753802d517fa87f3a43/720p/mp4/file.mp4';
const TARGET_VOLUME = 0.85;

type Listener = (state: IntroSoundtrackState) => void;

function baseUrl(): string {
  const base = (import.meta.env?.BASE_URL as string | undefined) || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

class IntroSoundtrack {
  private audio: HTMLAudioElement | null = null;
  private sources: string[] = [];
  private sourceIndex = 0;
  private state: IntroSoundtrackState = 'idle';
  private listeners = new Set<Listener>();
  private fadeRaf = 0;
  private remoteSrc = DEFAULT_REMOTE_MIX;

  /** Remote master from cerebro.intro.json `audio.masterSrc`; used if the local mix fails. */
  setRemoteSource(src: string | null | undefined): void {
    if (src && /^https?:\/\//.test(src)) this.remoteSrc = src;
  }

  getState(): IntroSoundtrackState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setState(next: IntroSoundtrackState): void {
    if (this.state === next) return;
    this.state = next;
    for (const fn of this.listeners) fn(next);
  }

  /** Create the element and start buffering before the entry gesture. */
  preload(): void {
    if (typeof window === 'undefined' || this.audio) return;
    this.sources = [`${baseUrl()}${LOCAL_MIX_PATH}`, this.remoteSrc];
    this.sourceIndex = 0;
    const el = new Audio();
    el.preload = 'auto';
    el.loop = false;
    el.volume = TARGET_VOLUME;
    el.setAttribute('playsinline', '');
    el.dataset.testid = 'intro-soundtrack';
    el.addEventListener('error', () => this.handleSourceError());
    el.addEventListener('ended', () => this.setState('idle'));
    el.src = this.sources[0];
    el.load();
    this.audio = el;
  }

  private handleSourceError(): void {
    const el = this.audio;
    if (!el) return;
    if (this.sourceIndex + 1 < this.sources.length) {
      this.sourceIndex += 1;
      const resumeAt = el.currentTime || 0;
      const wasPlaying = this.state === 'playing' || this.state === 'loading';
      el.src = this.sources[this.sourceIndex];
      el.load();
      if (wasPlaying) {
        if (resumeAt > 0) el.currentTime = resumeAt;
        void el.play().catch(() => this.setState('blocked'));
      }
      return;
    }
    this.setState('error');
  }

  /**
   * Call synchronously from a click/tap handler. play() is issued before any await
   * so the browser counts it as user-activated.
   */
  startFromGesture(atSec = 0): void {
    this.preload();
    const el = this.audio;
    if (!el) {
      this.setState('error');
      return;
    }
    cancelAnimationFrame(this.fadeRaf);
    el.muted = false;
    el.volume = TARGET_VOLUME;
    if (atSec > 0.25) {
      try {
        el.currentTime = atSec;
      } catch {
        /* metadata not loaded yet; audio starts from the top */
      }
    }
    this.setState('loading');
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => this.setState('playing')).catch(() => this.setState('blocked'));
    } else {
      this.setState('playing');
    }
  }

  setMuted(muted: boolean): void {
    const el = this.audio;
    if (!el) return;
    el.muted = muted;
    if (this.state === 'playing' || this.state === 'muted') {
      this.setState(muted ? 'muted' : 'playing');
    }
  }

  isAudible(): boolean {
    return this.state === 'playing';
  }

  fadeOut(durationMs = 600): Promise<void> {
    const el = this.audio;
    if (!el || el.paused) {
      this.stop();
      return Promise.resolve();
    }
    cancelAnimationFrame(this.fadeRaf);
    const from = el.volume;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / Math.max(1, durationMs));
        el.volume = Math.max(0, from * (1 - k));
        if (k < 1) {
          this.fadeRaf = requestAnimationFrame(step);
        } else {
          this.stop();
          resolve();
        }
      };
      this.fadeRaf = requestAnimationFrame(step);
    });
  }

  stop(): void {
    cancelAnimationFrame(this.fadeRaf);
    const el = this.audio;
    if (el) {
      el.pause();
      el.volume = TARGET_VOLUME;
      try {
        el.currentTime = 0;
      } catch {
        /* not seekable yet */
      }
    }
    this.setState('idle');
  }
}

export const introSoundtrack = new IntroSoundtrack();
