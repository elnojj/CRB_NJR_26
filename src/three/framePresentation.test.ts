import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Camera, Scene } from 'three';
import { presentFrame } from './framePresentation';

test('a resolution change finishes with a painted buffer on both direct and post-processed paths', () => {
  for (const postProcessed of [false, true]) {
    let buffer = 'previous frame';
    const events: string[] = [];
    const renderer = {
      setPixelRatio(ratio: number) { assert.equal(ratio, 1.25); buffer = 'cleared'; events.push('resize'); },
      render() { buffer = 'painted'; events.push('direct paint'); },
    };
    const composer = postProcessed ? {
      setPixelRatio(ratio: number) { assert.equal(ratio, 1.25); events.push('resize targets'); },
      render() { buffer = 'painted'; events.push('composed paint'); },
    } : null;
    presentFrame(renderer, new Scene(), new Camera(), 1.25, composer);
    assert.equal(buffer, 'painted', 'Never present a cleared canvas after changing resolution');
    assert.deepEqual(events, postProcessed ? ['resize', 'resize targets', 'composed paint'] : ['resize', 'direct paint']);
    events.length = 0;
    presentFrame(renderer, new Scene(), new Camera(), null, composer);
    assert.deepEqual(events, [postProcessed ? 'composed paint' : 'direct paint']);
  }
});
