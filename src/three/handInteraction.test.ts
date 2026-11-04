import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { HandInteractionMachine, IntentJitterGate } from './camera/CameraDirector.ts';
import { TWO_HAND_TUNING, TwoHandGestureTracker } from './camera/twoHandGestures.ts';
import { createHandState, type HandSlot, type HandState } from './handStateRef.ts';
import {
  NODE_HOVER_DWELL_MS,
  NODE_HOVER_ENTER_RADIUS,
  NODE_HOVER_EXIT_RADIUS,
  NodeInteractionLayer,
  POKE_FIRE,
  POKE_REARM,
  isPointingPose,
  type UiInteractResult,
} from './nodeInteraction.ts';

const PALM = 0.09;

type HandSpec = {
  x: number;
  y: number;
  pinching?: boolean;
  /** Pinch-midpoint centre override, camera-local. */
  pinchAt?: [number, number, number];
  pointing?: boolean;
  /** How far the index tip sits in front of the palm plane (positive toward the lens). */
  reach?: number;
  tip?: [number, number];
  confidence?: number;
  velocity?: [number, number];
};

function setHand(slot: HandSlot, spec: HandSpec): void {
  const L = slot.landmarks;
  const z = -1.2;
  const put = (i: number, x: number, y: number, zz: number) => {
    L[i * 3] = x;
    L[i * 3 + 1] = y;
    L[i * 3 + 2] = zz;
  };
  put(0, spec.x, spec.y, z);
  put(5, spec.x - 0.03, spec.y + PALM * 0.9, z);
  put(9, spec.x, spec.y + PALM, z);
  put(13, spec.x + 0.03, spec.y + PALM * 0.85, z);
  put(17, spec.x + 0.055, spec.y + PALM * 0.7, z);
  const pointing = spec.pointing ?? false;
  const tipX = spec.tip?.[0] ?? spec.x - 0.03;
  const tipY = spec.tip?.[1] ?? spec.y + (pointing ? PALM * 2.2 : PALM * 1.2);
  put(8, tipX, tipY, z + (spec.reach ?? 0));
  put(12, spec.x, spec.y + (pointing ? PALM * 1.1 : PALM * 1.9), z);
  put(16, spec.x + 0.03, spec.y + (pointing ? PALM * 1.0 : PALM * 1.8), z);
  const pinchAt = spec.pinchAt ?? [spec.x - 0.02, spec.y + PALM * 1.2, z];
  put(4, pinchAt[0] - 0.01, pinchAt[1], pinchAt[2]);
  if (spec.pinching) put(8, pinchAt[0] + 0.01, pinchAt[1], pinchAt[2]);
  slot.present = true;
  slot.pinching = spec.pinching ?? false;
  slot.confidence = spec.confidence ?? 1;
  slot.velocity = [spec.velocity?.[0] ?? 0, spec.velocity?.[1] ?? 0, 0];
}

function twoHands(nowMs: number, left: HandSpec, right: HandSpec, frameId = 1): HandState {
  const state = createHandState();
  state.active = true;
  state.tracking = true;
  state.frameId = frameId;
  state.updatedAtMs = nowMs;
  setHand(state.hands[0], left);
  setHand(state.hands[1], right);
  return state;
}

function oneHand(nowMs: number, spec: HandSpec, frameId = 1): HandState {
  const state = createHandState();
  state.active = true;
  state.tracking = true;
  state.frameId = frameId;
  state.updatedAtMs = nowMs;
  setHand(state.hands[0], spec);
  return state;
}

const NO_UI: UiInteractResult = { locked: false, hovering: false, grabbedId: null };

describe('two-hand gating', () => {
  it('returns null unless both hands are present', () => {
    const tracker = new TwoHandGestureTracker();
    const one = oneHand(1000, { x: -0.2, y: 0, pinching: true });
    assert.equal(tracker.evaluate(1000, one.hands, 0.033), null);
  });

  it('dollies forward when pinched hands move apart and back when they close', () => {
    const tracker = new TwoHandGestureTracker();
    const at = (t: number, gap: number) => twoHands(t, { x: -gap, y: 0, pinching: true }, { x: gap, y: 0, pinching: true });
    tracker.evaluate(1000, at(1000, 0.2).hands, 0.033);
    const apart = tracker.evaluate(1033, at(1033, 0.24).hands, 0.033);
    assert.equal(apart?.mode, 'pinch');
    assert.ok((apart?.dolly ?? 0) > 0, 'expanding must push the camera forward');
    const closer = tracker.evaluate(1066, at(1066, 0.2).hands, 0.033);
    assert.ok((closer?.dolly ?? 0) < 0, 'contracting must pull the camera back');
  });

  it('treats slot order as irrelevant: the hand further left is always P_L', () => {
    const forward = new TwoHandGestureTracker();
    const swapped = new TwoHandGestureTracker();
    const a = (t: number, gap: number) => twoHands(t, { x: -gap, y: 0, pinching: true }, { x: gap, y: 0.02, pinching: true });
    const b = (t: number, gap: number) => twoHands(t, { x: gap, y: 0.02, pinching: true }, { x: -gap, y: 0, pinching: true });
    forward.evaluate(1000, a(1000, 0.2).hands, 0.033);
    swapped.evaluate(1000, b(1000, 0.2).hands, 0.033);
    const fa = forward.evaluate(1033, a(1033, 0.25).hands, 0.033);
    const fb = swapped.evaluate(1033, b(1033, 0.25).hands, 0.033);
    assert.ok(Math.abs((fa?.roll ?? 0) - (fb?.roll ?? 1)) < 1e-9);
    assert.ok(Math.abs((fa?.dolly ?? 0) - (fb?.dolly ?? 1)) < 1e-9);
  });

  it('rolls with the angle of P_R - P_L and ignores tracking noise below the deadzone', () => {
    const tracker = new TwoHandGestureTracker();
    tracker.evaluate(1000, twoHands(1000, { x: -0.2, y: 0, pinching: true }, { x: 0.2, y: 0, pinching: true }).hands, 0.033);
    const tilt = tracker.evaluate(1033, twoHands(1033, { x: -0.2, y: -0.03, pinching: true }, { x: 0.2, y: 0.03, pinching: true }).hands, 0.033);
    assert.ok((tilt?.roll ?? 0) > 0.1);
    const still = new TwoHandGestureTracker();
    still.evaluate(1000, twoHands(1000, { x: -0.2, y: 0, pinching: true }, { x: 0.2, y: 0, pinching: true }).hands, 0.033);
    const jitter = still.evaluate(1033, twoHands(1033, { x: -0.2, y: 0.0003, pinching: true }, { x: 0.2, y: 0, pinching: true }).hands, 0.033);
    assert.equal(jitter?.roll, 0);
    assert.equal(jitter?.dolly, 0);
  });

  it('does not turn a long gap between samples into a jump', () => {
    const tracker = new TwoHandGestureTracker();
    tracker.evaluate(1000, twoHands(1000, { x: -0.1, y: 0, pinching: true }, { x: 0.1, y: 0, pinching: true }).hands, 0.033);
    const lateAt = 1000 + TWO_HAND_TUNING.maxSampleGapMs + 50;
    const late = tracker.evaluate(lateAt, twoHands(lateAt, { x: -0.3, y: 0, pinching: true }, { x: 0.3, y: 0, pinching: true }).hands, 0.033);
    assert.equal(late?.dolly, 0);
    assert.equal(late?.roll, 0);
  });

  it('pans only when both open palms move in parallel', () => {
    const tracker = new TwoHandGestureTracker();
    const parallel = tracker.evaluate(
      1000,
      twoHands(1000, { x: -0.2, y: 0, velocity: [0.3, 0] }, { x: 0.2, y: 0, velocity: [0.3, 0] }).hands,
      0.033
    );
    assert.equal(parallel?.mode, 'pan');
    assert.ok((parallel?.panX ?? 0) > 0);
    const opposed = tracker.evaluate(
      1033,
      twoHands(1033, { x: -0.2, y: 0, velocity: [0.3, 0] }, { x: 0.2, y: 0, velocity: [-0.3, 0] }).hands,
      0.033
    );
    assert.equal(opposed?.mode, 'neutral');
    assert.equal(opposed?.panX, 0);
  });

  it('stays neutral when only one hand pinches', () => {
    const tracker = new TwoHandGestureTracker();
    const mixed = tracker.evaluate(1000, twoHands(1000, { x: -0.2, y: 0, pinching: true }, { x: 0.2, y: 0 }).hands, 0.033);
    assert.equal(mixed?.mode, 'neutral');
  });
});

describe('HandInteractionMachine with two hands', () => {
  const FRAME = 33;
  it('enters CAMERA_TWO_HAND only with both hands, and a single hand cannot dolly', () => {
    const machine = new HandInteractionMachine();
    let now = 1000;
    const step = (hands: HandState) => {
      now += FRAME;
      hands.frameId = now;
      hands.updatedAtMs = now;
      return machine.evaluate(now, FRAME / 1000, NO_UI, hands);
    };
    step(twoHands(now, { x: -0.2, y: 0, pinching: true }, { x: 0.2, y: 0, pinching: true }));
    const both = step(twoHands(now, { x: -0.25, y: 0, pinching: true }, { x: 0.25, y: 0, pinching: true }));
    assert.equal(both.state, 'CAMERA_TWO_HAND');
    assert.ok(both.dolly > 0);
    const single = step(oneHand(now, { x: -0.25, y: 0, pinching: true }));
    assert.notEqual(single.state, 'CAMERA_TWO_HAND');
    assert.equal(single.dolly, 0);
    assert.equal(single.roll, 0);
  });

  it('lets UI_INTERACT outrank the two-hand transform', () => {
    const machine = new HandInteractionMachine();
    const hands = twoHands(1000, { x: -0.2, y: 0, pinching: true }, { x: 0.2, y: 0, pinching: true });
    const intent = machine.evaluate(1010, 0.033, { locked: true, hovering: true, grabbedId: 'n' }, hands);
    assert.equal(intent.state, 'UI_INTERACT');
    assert.equal(intent.dolly, 0);
  });

  it('no longer pans the camera while the hand is only pointing', () => {
    const machine = new HandInteractionMachine();
    const hands = oneHand(1000, { x: 0, y: 0 });
    hands.hands[0].control = {
      tMs: 1000,
      tracking: true,
      posture: 'point',
      pan: { x: 0.2, y: 0 },
      zoomOut: 0,
      orbit: 0,
      flip: 0,
      throw: null,
      grabbing: false,
    };
    const intent = machine.evaluate(1010, 0.033, NO_UI, hands);
    assert.equal(intent.panX, 0);
    assert.equal(intent.steering, false);
  });
});

describe('IntentJitterGate', () => {
  it('opens only after sustained input and closes immediately when it stops', () => {
    const gate = new IntentJitterGate(120);
    assert.equal(gate.update(0, true), false);
    assert.equal(gate.update(60, true), false);
    assert.equal(gate.update(130, true), true);
    assert.equal(gate.update(140, false), false);
    assert.equal(gate.update(150, true), false);
  });

  it('is not a lockout: a twitch shorter than the filter never opens it, a deliberate move does at once after', () => {
    const gate = new IntentJitterGate(120);
    gate.update(0, true);
    gate.update(50, false);
    assert.equal(gate.update(60, true), false);
    assert.equal(gate.update(190, true), true);
  });
});

describe('NodeInteractionLayer', () => {
  type Node = { id: string; x: number; y: number };

  function makeLayer(nodes: Node[]) {
    const selected: string[] = [];
    const hovers: Array<string | null> = [];
    const layer = new NodeInteractionLayer({
      probeNode: (point: THREE.Vector3, radius: number, preferId: string | null) => {
        const dist = (n: Node) => Math.hypot(point.x - n.x, point.y - n.y);
        if (preferId) {
          const n = nodes.find((m) => m.id === preferId);
          if (n && dist(n) <= radius) return preferId;
        }
        let best: string | null = null;
        let bestD = radius;
        for (const n of nodes) {
          const d = dist(n);
          if (d < bestD) {
            bestD = d;
            best = n.id;
          }
        }
        return best;
      },
      onNodeSelect: (id) => selected.push(id),
      onHover: (id) => hovers.push(id),
    });
    return { layer, selected, hovers };
  }

  const node: Node = { id: 'hq__proj__bat', x: 0, y: 0 };

  function pointAt(tipX: number, tipY: number, reach: number, confidence = 1): HandState {
    const s = createHandState();
    s.tracking = true;
    setHand(s.hands[0], { x: tipX + 0.03, y: tipY - PALM * 2.2, pointing: true, tip: [tipX, tipY], reach, confidence });
    return s;
  }

  it('recognises the pointing pose', () => {
    const s = pointAt(0, 0, 0);
    assert.equal(isPointingPose(s.hands[0].landmarks), true);
    const open = createHandState();
    setHand(open.hands[0], { x: 0, y: 0, pointing: false });
    assert.equal(isPointingPose(open.hands[0].landmarks), false);
  });

  it('pokes once, needs a stable hover dwell, and re-arms only after the finger pulls back', () => {
    const { layer, selected } = makeLayer([node]);
    let t = 1000;
    const frame = (reach: number) => {
      t += 20;
      return layer.update(t, pointAt(0.01, 0.01, reach).hands, true);
    };
    frame(0);
    frame(0.07);
    assert.equal(selected.length, 0, 'no poke before the hover dwell has elapsed');
    for (let i = 0; i < Math.ceil(NODE_HOVER_DWELL_MS / 20) + 1; i += 1) frame(0.02);
    frame(POKE_FIRE * 0.06 + 0.012 + 0.002);
    frame(0.07);
    frame(0.07);
    assert.equal(selected.length, 1);
    frame(0.07);
    assert.equal(selected.length, 1, 'holding the push does not fire again');
    frame((POKE_REARM + 0.1) * 0.048 + 0.012);
    frame(0.07);
    assert.equal(selected.length, 1, 'between re-arm and fire thresholds stays disarmed');
    for (let i = 0; i < 3; i += 1) frame(0);
    for (let i = 0; i < 3; i += 1) frame(0.07);
    assert.equal(selected.length, 2);
  });

  it('keeps hover inside the exit radius and drops it beyond', () => {
    const { layer, hovers } = makeLayer([node]);
    layer.update(1000, pointAt(NODE_HOVER_ENTER_RADIUS * 0.9, 0, 0).hands, true);
    assert.equal(layer.hoveredNodeId(), node.id);
    layer.update(1020, pointAt((NODE_HOVER_ENTER_RADIUS + NODE_HOVER_EXIT_RADIUS) / 2, 0, 0).hands, true);
    assert.equal(layer.hoveredNodeId(), node.id, 'hysteresis keeps the hover between the two radii');
    layer.update(1040, pointAt(NODE_HOVER_EXIT_RADIUS + 0.02, 0, 0).hands, true);
    assert.equal(layer.hoveredNodeId(), null);
    assert.deepEqual(hovers, [node.id, null]);
  });

  it('locks the camera while a poke is engaged but not on bare hover', () => {
    const { layer } = makeLayer([node]);
    const hover = layer.update(1000, pointAt(0.01, 0, 0).hands, true);
    assert.equal(hover.locked, false, 'hover alone never blocks the camera');
    const engaged = layer.update(1020, pointAt(0.01, 0, 0.05).hands, true);
    assert.equal(engaged.locked, true);
    assert.equal(engaged.hovering, true);
  });

  it('ignores low-confidence tracking', () => {
    const { layer, selected } = makeLayer([node]);
    for (let i = 0; i < 12; i += 1) {
      layer.update(1000 + i * 20, pointAt(0.01, 0, 0.07, 0.3).hands, true);
    }
    assert.equal(layer.hoveredNodeId(), null);
    assert.equal(selected.length, 0);
  });

  it('selects on pinch over a node and locks orbit until the pinch opens', () => {
    const { layer, selected } = makeLayer([node]);
    const pinchState = (pinching: boolean) => {
      const s = createHandState();
      s.tracking = true;
      setHand(s.hands[0], { x: 0, y: -0.1, pinching, pinchAt: [0.005, 0, -1.2] });
      return s;
    };
    layer.update(1000, pinchState(false).hands, true);
    const grab = layer.update(1020, pinchState(true).hands, true);
    assert.deepEqual(selected, [node.id]);
    assert.equal(grab.locked, true);
    assert.equal(grab.grabbedId, node.id);
    const still = layer.update(1040, pinchState(true).hands, true);
    assert.equal(still.locked, true);
    assert.equal(selected.length, 1, 'holding the pinch does not re-select');
    const released = layer.update(1060, pinchState(false).hands, true);
    assert.equal(released.locked, false);
  });
});
