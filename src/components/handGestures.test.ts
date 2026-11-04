import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GESTURE_THRESHOLDS,
  HandGestureEngine,
  classifyPosture,
  computeHandMetrics,
  type HandControlFrame,
  type HandPosture,
  type ScreenPoint,
} from './handGestures.ts';
import { HandInteractionMachine } from '../three/camera/CameraDirector.ts';
import { createHandState } from '../three/handStateRef.ts';
import type { UiInteractResult } from '../three/spatialControls.ts';

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

describe('HandInteractionMachine priority', () => {
  const FRAME_MS = 33;
  const NO_UI: UiInteractResult = { locked: false, hovering: false, grabbedId: null };
  const UI_GRAB: UiInteractResult = { locked: true, hovering: true, grabbedId: 'rail-zoom' };

  function control(posture: HandPosture, extra: Partial<HandControlFrame> = {}): HandControlFrame {
    return {
      tMs: 0,
      tracking: true,
      posture,
      pan: { x: 0, y: 0 },
      zoomOut: 0,
      orbit: 0,
      flip: 0,
      throw: null,
      grabbing: posture === 'grab',
      ...extra,
    };
  }

  function handsWith(frameId: number, nowMs: number, frame: HandControlFrame) {
    const state = createHandState();
    state.active = true;
    state.tracking = true;
    state.frameId = frameId;
    state.updatedAtMs = nowMs;
    state.hands[0].present = true;
    state.hands[0].control = frame;
    return state;
  }

  it('never moves the camera while a spatial control is grabbed, whatever the posture', () => {
    const postures: HandPosture[] = ['open', 'point', 'claw', 'grab'];
    for (const posture of postures) {
      const machine = new HandInteractionMachine();
      let now = 1000;
      for (let i = 0; i < 12; i += 1) {
        now += FRAME_MS;
        const intent = machine.evaluate(
          now,
          FRAME_MS / 1000,
          UI_GRAB,
          handsWith(i + 1, now, control(posture, { pan: { x: 0.2, y: 0.1 }, orbit: 0.4, zoomOut: 1 }))
        );
        assert.equal(intent.state, 'UI_INTERACT');
        assert.equal(intent.panX, 0);
        assert.equal(intent.panY, 0);
        assert.equal(intent.dAzimuth, 0);
        assert.equal(intent.dPolar, 0);
        assert.equal(intent.zoomOut, 0);
        assert.equal(intent.steering, false);
      }
    }
  });

  it('keeps the camera locked briefly after release, then hands control back', () => {
    const machine = new HandInteractionMachine();
    let now = 1000;
    machine.evaluate(now, FRAME_MS / 1000, UI_GRAB, handsWith(1, now, control('grab', { orbit: 0.3 })));
    now += 100;
    const held = machine.evaluate(now, FRAME_MS / 1000, NO_UI, handsWith(2, now, control('grab', { orbit: 0.3 })));
    assert.equal(held.state, 'UI_INTERACT');
    now += 400;
    const released = machine.evaluate(now, FRAME_MS / 1000, NO_UI, handsWith(3, now, control('grab', { orbit: 0.3 })));
    assert.equal(released.state, 'CAMERA_SPHERE_ORBIT');
    assert.ok(released.dAzimuth > 0);
  });

  it('ranks claw zoom, sphere orbit, flick throw and palm pan in that order', () => {
    const machine = new HandInteractionMachine();
    let now = 1000;
    const step = (frame: HandControlFrame, id: number) => {
      now += FRAME_MS;
      return machine.evaluate(now, FRAME_MS / 1000, NO_UI, handsWith(id, now, frame));
    };

    const flick = step(control('open', { throw: { vx: 1.2, vy: 0.1 } }), 1);
    assert.equal(flick.state, 'CAMERA_FLICK_THROW');

    const panWhileThrowing = step(control('open', { pan: { x: 0.1, y: 0 } }), 2);
    assert.equal(panWhileThrowing.state, 'CAMERA_FLICK_THROW');
    assert.equal(panWhileThrowing.panX, 0);

    const orbitOverThrow = step(control('grab', { orbit: 0.2 }), 3);
    assert.equal(orbitOverThrow.state, 'CAMERA_SPHERE_ORBIT');

    const clawOverAll = step(control('claw', { zoomOut: 0.8 }), 4);
    assert.equal(clawOverAll.state, 'CAMERA_CLAW_ZOOM');
    assert.equal(clawOverAll.zoomOut, 0.8);
    assert.equal(clawOverAll.dAzimuth, 0);
  });

  it('pans with an open palm when nothing outranks it', () => {
    const machine = new HandInteractionMachine();
    let now = 1000;
    let total = 0;
    for (let i = 0; i < 10; i += 1) {
      now += FRAME_MS;
      const intent = machine.evaluate(now, FRAME_MS / 1000, NO_UI, handsWith(i + 1, now, control('open', { pan: { x: 0.02, y: 0 } })));
      assert.equal(intent.state, 'CAMERA_PALM_PAN');
      total += intent.panX;
    }
    assert.ok(total > 0.1 && total <= 0.2 + 1e-9);
  });

  it('goes idle when the detections are stale', () => {
    const machine = new HandInteractionMachine();
    const intent = machine.evaluate(5000, FRAME_MS / 1000, NO_UI, handsWith(1, 1000, control('open', { pan: { x: 0.3, y: 0 } })));
    assert.equal(intent.state, 'IDLE');
    assert.equal(intent.panX, 0);
  });
});
