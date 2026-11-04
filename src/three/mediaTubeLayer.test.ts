import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { buildProjectMediaTubeItems } from './mediaTubeItems.ts';
import { coverFit } from './mediaPlayback.ts';
import { tubeItemHasMedia, tubeItemVideoUrl } from './mediaTubeLayer.ts';

describe('media tube wiring', () => {
  it('every real video in the NOJARA tube is wired to autoplay', () => {
    const items = buildProjectMediaTubeItems('NOJARA');
    const wired = items.filter((item) => tubeItemVideoUrl(item) !== null);
    assert.ok(wired.length >= 2, 'showreel and LaLiga film must both be wired');
    for (const item of wired) assert.ok(item.isRealVideo);
  });

  it('slots without approved media get a token instead of a panel and never a video', () => {
    const items = buildProjectMediaTubeItems('NOJARA');
    const empty = items.filter((item) => !tubeItemHasMedia(item));
    assert.ok(empty.length > 0);
    for (const item of empty) assert.equal(tubeItemVideoUrl(item), null);
  });

  it('only video files are treated as playable', () => {
    const seven = buildProjectMediaTubeItems('SEVEN');
    assert.equal(tubeItemVideoUrl(seven[0]), null);
    assert.equal(tubeItemVideoUrl(undefined), null);
  });
});

describe('coverFit', () => {
  it('crops the sides of a wider video and the top of a taller one, centred', () => {
    const wide = new THREE.Texture();
    coverFit(wide, 21 / 9);
    assert.ok(wide.repeat.x < 1 && wide.repeat.y === 1);
    assert.ok(Math.abs(wide.offset.x - (1 - wide.repeat.x) / 2) < 1e-9);

    const tall = new THREE.Texture();
    coverFit(tall, 4 / 3);
    assert.ok(tall.repeat.y < 1 && tall.repeat.x === 1);
  });

  it('leaves a matching aspect uncropped', () => {
    const tex = new THREE.Texture();
    coverFit(tex, 16 / 9);
    assert.ok(Math.abs(tex.repeat.x - 1) < 1e-9 && Math.abs(tex.repeat.y - 1) < 1e-9);
  });
});
