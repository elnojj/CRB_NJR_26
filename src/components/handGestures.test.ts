import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GESTURE_THRESHOLDS,
  HandGestureEngine,
  classifyPosture,
  computeHandMetrics,
  type ScreenPoint,
} from './handGestures.ts';

type Pose = 'open' | 'claw' | 'grab' | 'point';

interface HandOptions {
  pose: Pose;
  x?: number;
  y?: number;
  roll?: number;
}

const MCP_LOCAL: Record<number, [number, number]> = {
  2: [-50, -40],
  5: [-35, -95],
  9: [0, -100],
  13: [30, -92],
  17: [55, -75],
};
const TIP_OF_MCP: Record<number, number> = { 2: 4, 5: 8, 9: 12, 13: 16, 17: 20 };

function localTip(mcp: number, pose: Pose): [number, number] {
  const [mx, my] = MCP_LOCAL[mcp];
  const len = Math.hypot(mx, my);
  const reach = (ext: number): [number, number] => [(mx / len) * ext * 100, (my / len) * ext * 100];
  switch (pose) {
    case 'open':
      return reach(1.9);
    case 'grab':
      return reach(1.3);
    case 'point':
      return mcp === 5 ? reach(1.9) : reach(1.0);
    case 'claw':
      return [(mx / len) * 6, -150 + (my / len) * 6];
    default: {
      const _exhaustive: never = pose;
      return _exhaustive;
    }
  }
}

function makeHand({ pose, x = 320, y = 400, roll = 0 }: HandOptions): ScreenPoint[] {
  const local: Array<[number, number]> = Array.from({ length: 21 }, () => [0, -50]);
  local[0] = [0, 0];
  for (const key of Object.keys(MCP_LOCAL)) {
    const mcp = Number(key);
    local[mcp] = MCP_LOCAL[mcp];
    local[TIP_OF_MCP[mcp]] = localTip(mcp, pose);
  }
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  return local.map(([lx, ly]) => ({ x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos }));
}

const FRAME_MS = 33;

function newEngine(): HandGestureEngine {
  return new HandGestureEngine(640, 480);
}

describe('handGestures', () => {
  it('classifies the four postures from synthetic landmarks', () => {
    assert.equal(classifyPosture(computeHandMetrics(makeHand({ pose: 'open' }))), 'open');
    assert.equal(classifyPosture(computeHandMetrics(makeHand({ pose: 'claw' }))), 'claw');
    assert.equal(classifyPosture(computeHandMetrics(makeHand({ pose: 'grab' }))), 'grab');
    assert.equal(classifyPosture(computeHandMetrics(makeHand({ pose: 'point' }))), 'point');
  });

  it('reports no tracking when landmarks disappear', () => {
    const engine = newEngine();
    engine.update(makeHand({ pose: 'open' }), 0);
    const frame = engine.update(null, FRAME_MS);
    assert.equal(frame.tracking, false);
    assert.equal(frame.posture, 'none');
  });

  it('ramps zoom-out while the claw is held and releases when it opens', () => {
    const engine = newEngine();
    let last = engine.update(makeHand({ pose: 'claw' }), 0);
    for (let i = 1; i < 12; i += 1) last = engine.update(makeHand({ pose: 'claw' }), i * FRAME_MS);
    assert.equal(last.posture, 'claw');
    assert.ok(last.zoomOut > 0.4, `zoomOut ${last.zoomOut}`);
    for (let i = 12; i < 40; i += 1) last = engine.update(makeHand({ pose: 'open' }), i * FRAME_MS);
    assert.equal(last.zoomOut, 0);
  });

  it('ignores jitter inside the pan deadzone but pans 1:1 beyond it', () => {
    const engine = newEngine();
    for (let i = 0; i < 6; i += 1) {
      const f = engine.update(makeHand({ pose: 'open', x: 320 + (i % 2) * 0.5 }), i * FRAME_MS);
      assert.equal(f.pan.x, 0);
      assert.equal(f.pan.y, 0);
    }
    let last = engine.update(makeHand({ pose: 'open' }), 6 * FRAME_MS);
    for (let i = 1; i <= 6; i += 1) {
      last = engine.update(makeHand({ pose: 'open', x: 320 + i * 8, y: 400 - i * 6 }), (6 + i) * FRAME_MS);
    }
    assert.ok(last.pan.x > 0, `pan.x ${last.pan.x}`);
    assert.ok(last.pan.y > 0, `pan.y ${last.pan.y}`);
    assert.equal(last.throw, null);
  });

  it('does not pan while grabbing or clawing', () => {
    const engine = newEngine();
    let moved = 0;
    for (let i = 0; i < 10; i += 1) {
      const f = engine.update(makeHand({ pose: 'grab', x: 320 + i * 6 }), i * FRAME_MS);
      moved += Math.abs(f.pan.x) + Math.abs(f.pan.y);
    }
    assert.equal(moved, 0);
  });

  it('orbits against the roll and flips to the next node after a full twist', () => {
    const engine = newEngine();
    engine.update(makeHand({ pose: 'grab' }), 0);
    engine.update(makeHand({ pose: 'grab' }), FRAME_MS);
    let orbit = 0;
    let flip = 0;
    for (let i = 1; i <= 14; i += 1) {
      const f = engine.update(makeHand({ pose: 'grab', roll: i * 0.1 }), (i + 1) * FRAME_MS);
      orbit += f.orbit;
      if (f.flip !== 0) flip = f.flip;
    }
    assert.ok(orbit < 0, `orbit ${orbit}`);
    assert.equal(flip, 1);
  });

  it('flips the other way for a counter-clockwise twist', () => {
    const engine = newEngine();
    engine.update(makeHand({ pose: 'grab' }), 0);
    engine.update(makeHand({ pose: 'grab' }), FRAME_MS);
    let flip = 0;
    for (let i = 1; i <= 14; i += 1) {
      const f = engine.update(makeHand({ pose: 'grab', roll: -i * 0.1 }), (i + 1) * FRAME_MS);
      if (f.flip !== 0) flip = f.flip;
    }
    assert.equal(flip, -1);
  });

  it('fires a throw for a fast flick and then cools down', () => {
    const engine = newEngine();
    for (let i = 0; i < 4; i += 1) engine.update(makeHand({ pose: 'open' }), i * FRAME_MS);
    let thrown: { vx: number; vy: number } | null = null;
    let throwFrames = 0;
    for (let i = 1; i <= 6; i += 1) {
      const f = engine.update(makeHand({ pose: 'open', x: 320 + i * 120 }), (4 + i) * FRAME_MS);
      if (f.throw) {
        thrown = f.throw;
        throwFrames += 1;
      }
    }
    assert.ok(thrown, 'expected a throw');
    assert.ok(thrown.vx > GESTURE_THRESHOLDS.throwSpeedOpenHand);
    assert.equal(throwFrames, 1);
  });

  it('does not throw for a slow drag', () => {
    const engine = newEngine();
    for (let i = 0; i < 20; i += 1) {
      const f = engine.update(makeHand({ pose: 'open', x: 320 + i * 4 }), i * FRAME_MS);
      assert.equal(f.throw, null);
    }
  });
});
