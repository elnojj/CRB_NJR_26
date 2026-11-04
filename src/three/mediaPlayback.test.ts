import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type * as THREE from 'three';
import { MediaPlaybackManager, rankPlayable } from './mediaPlayback.ts';

class FakeVideo {
  muted = false;
  defaultMuted = false;
  loop = false;
  playsInline = false;
  preload = '';
  crossOrigin: string | null = null;
  disablePictureInPicture = false;
  src = '';
  videoWidth = 1280;
  videoHeight = 720;
  paused = true;
  playCalls = 0;
  rejectPlay: string | false = false;
  private listeners = new Map<string, Array<() => void>>();

  setAttribute(): void {}
  removeAttribute(name: string): void {
    if (name === 'src') this.src = '';
  }
  load(): void {}
  pause(): void {
    this.paused = true;
  }
  play(): Promise<void> {
    this.playCalls += 1;
    if (this.rejectPlay) return Promise.reject(new DOMException('rejected', this.rejectPlay));
    this.paused = false;
    queueMicrotask(() => this.emit('playing'));
    return Promise.resolve();
  }
  addEventListener(type: string, fn: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  removeEventListener(type: string, fn: () => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((f) => f !== fn));
  }
  emit(type: string): void {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
}

function build(maxVideos: number, reduced = false, rejectPlay: string | false = false) {
  const videos: FakeVideo[] = [];
  let disposedTextures = 0;
  const reducedRef = { value: reduced };
  const manager = new MediaPlaybackManager({
    maxVideos,
    reducedMotion: () => reducedRef.value,
    createVideo: () => {
      const v = new FakeVideo();
      v.rejectPlay = rejectPlay;
      videos.push(v);
      return v as unknown as HTMLVideoElement;
    },
    createTexture: () =>
      ({
        dispose: () => {
          disposedTextures += 1;
        },
      }) as unknown as THREE.VideoTexture,
  });
  return { manager, videos, reducedRef, disposed: () => disposedTextures };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('rankPlayable', () => {
  it('keeps only the highest priorities within the budget', () => {
    const picked = rankPlayable(
      [
        { key: 'a', priority: 3, active: false },
        { key: 'b', priority: 9, active: false },
        { key: 'c', priority: 6, active: false },
      ],
      2
    );
    assert.deepEqual([...picked].sort(), ['b', 'c']);
  });

  it('ignores zero priority and favours already playing slots by a margin', () => {
    const picked = rankPlayable(
      [
        { key: 'playing', priority: 5, active: true },
        { key: 'rival', priority: 8, active: false },
        { key: 'off', priority: 0, active: false },
      ],
      1
    );
    assert.deepEqual([...picked], ['playing']);
  });
});

describe('MediaPlaybackManager', () => {
  it('never decodes more videos than the budget and swaps by priority', () => {
    const { manager, videos } = build(1);
    manager.register('a', 'a.mp4');
    manager.register('b', 'b.mp4');
    manager.setPriority('a', 10);
    manager.setPriority('b', 2);
    manager.reconcile();
    assert.equal(manager.activeCount(), 1);
    assert.equal(videos.length, 1);

    manager.setPriority('b', 40);
    manager.reconcile();
    assert.equal(manager.activeCount(), 1);
    assert.equal(videos.length, 2);
    assert.equal(videos[0].src, '');
  });

  it('starts muted, looping and inline so autoplay is permitted', async () => {
    const { manager, videos } = build(2);
    const slot = manager.register('a', 'a.mp4');
    manager.setPriority('a', 5);
    manager.reconcile();
    await tick();
    const v = videos[0];
    assert.equal(v.muted, true);
    assert.equal(v.loop, true);
    assert.equal(v.playsInline, true);
    assert.equal(v.crossOrigin, 'anonymous');
    assert.equal(slot.state, 'playing');
    assert.equal(slot.live, true);
    assert.ok(Math.abs((slot.aspect ?? 0) - 16 / 9) < 1e-6);
  });

  it('marks a rejected autoplay as blocked and retries on the first gesture', async () => {
    const { manager, videos } = build(1, false, 'NotAllowedError');
    const slot = manager.register('a', 'a.mp4');
    manager.setPriority('a', 5);
    manager.reconcile();
    await tick();
    assert.equal(slot.state, 'blocked');

    videos[0].rejectPlay = false;
    manager.unlock();
    await tick();
    assert.equal(slot.state, 'playing');
  });

  it('frees the decoder slot of a video that errors so another can play', async () => {
    const { manager, videos } = build(1);
    const bad = manager.register('bad', 'bad.mp4');
    manager.register('good', 'good.mp4');
    manager.setPriority('bad', 9);
    manager.setPriority('good', 5);
    manager.reconcile();
    await tick();
    videos[0].emit('error');
    assert.equal(bad.state, 'error');
    assert.equal(manager.activeCount(), 0);
    manager.reconcile();
    await tick();
    assert.equal(manager.activeCount(), 1);
    assert.equal(videos[1].src, 'good.mp4');
  });

  it('treats an unsupported source as failed, not as a blocked autoplay', async () => {
    const { manager } = build(1, false, 'NotSupportedError');
    const slot = manager.register('a', 'a.mp4');
    manager.setPriority('a', 5);
    manager.reconcile();
    await tick();
    assert.equal(slot.state, 'error');
    assert.equal(manager.activeCount(), 0);
  });

  it('plays nothing under reduced motion and resumes when it is lifted', () => {
    const { manager, reducedRef } = build(2, true);
    manager.register('a', 'a.mp4');
    manager.setPriority('a', 5);
    manager.reconcile();
    assert.equal(manager.activeCount(), 0);
    reducedRef.value = false;
    manager.reconcile();
    assert.equal(manager.activeCount(), 1);
  });

  it('releases the texture and decoder when a slot is unregistered', () => {
    const { manager, disposed } = build(2);
    manager.register('a', 'a.mp4');
    manager.setPriority('a', 5);
    manager.reconcile();
    manager.unregister('a');
    assert.equal(manager.activeCount(), 0);
    assert.equal(disposed(), 1);
  });

  it('re-registering the same key and url keeps the same view', () => {
    const { manager } = build(2);
    const first = manager.register('a', 'a.mp4');
    assert.equal(manager.register('a', 'a.mp4'), first);
  });
});
