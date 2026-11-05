import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitPointerTracker } from './orbitPointerTracker.ts';
import { resizeCameraViewport } from './viewport.ts';

describe('camera pointer ownership and touch handoff', () => {
  it('rebases the remaining finger after either finger lifts from a pinch', () => {
    for (const lifted of [1, 2]) {
      const tracker = new OrbitPointerTracker();
      tracker.begin(1, 100, 100);
      tracker.begin(2, 200, 100);
      tracker.move(1, 120, 110);
      tracker.move(2, 230, 120);
      assert.equal(tracker.end(lifted), false);
      const remaining = lifted === 1 ? 2 : 1;
      const [x, y] = remaining === 1 ? [120, 110] : [230, 120];
      const delta = tracker.move(remaining, x + 2, y + 1);
      assert.equal(delta?.mode, 'orbit');
      assert.equal(delta?.dx, 2);
      assert.equal(delta?.dy, 1);
      assert.equal(tracker.end(remaining), false, 'pinch release must never select a node');
    }
  });

  it('ignores other pointers without ending or moving the canvas gesture', () => {
    const tracker = new OrbitPointerTracker();
    tracker.begin(1, 10, 10);
    assert.equal(tracker.move(99, 500, 500), null);
    assert.equal(tracker.end(99), false);
    assert.equal(tracker.size, 1);
    assert.equal(tracker.move(1, 20, 10)?.dx, 10);
  });

  it('keeps tap selection and the drag threshold, but cancels never select', () => {
    const tracker = new OrbitPointerTracker();
    tracker.begin(1, 10, 10);
    assert.equal(tracker.move(1, 12, 10), null);
    assert.equal(tracker.end(1), true);
    tracker.begin(2, 100, 100);
    assert.equal(tracker.end(2, true), false);
    tracker.begin(3, 200, 200);
    tracker.reset();
    assert.equal(tracker.move(3, 400, 400), null);
    tracker.begin(4, 300, 300);
    assert.equal(tracker.move(4, 308, 300)?.dx, 8);
  });
});

describe('camera viewport resize', () => {
  it('preserves the live lens and pose through repeated tablet/keyboard layout changes', () => {
    const camera = new PerspectiveCamera(23.5, 16 / 9, 0.1, 200);
    camera.position.set(7, 3, 20);
    camera.lookAt(new Vector3(2, 0, 0));
    const position = camera.position.clone();
    const orientation = camera.quaternion.clone();
    for (const [w, h] of [[1180, 820], [1180, 520], [820, 1180], [820, 1180]]) {
      camera.setViewOffset(w, h, 0, 100, w, h);
      resizeCameraViewport(camera, w, h);
      assert.equal(camera.fov, 23.5, 'resize must not flash the Home lens');
      assert.equal(camera.aspect, w / h);
      assert.equal(camera.view?.enabled, false);
      assert.ok(camera.position.equals(position));
      assert.ok(camera.quaternion.equals(orientation));
    }
  });
});
