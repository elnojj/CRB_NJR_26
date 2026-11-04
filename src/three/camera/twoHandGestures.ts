import type { HandSlot } from '../handStateRef';

/**
 * Two-hand camera transforms. They exist only while both hands are tracked at once; with a single
 * hand `evaluate` returns null and the caller falls back to pointing, hover glow and poke.
 *
 *   both pinching        -> dolly (distance between the two pinch midpoints), roll and pitch (angle of v = P_R - P_L)
 *   both open, parallel  -> spatial pan
 *   anything else        -> engaged but neutral, so a half-formed pose never moves the camera
 */

const THUMB_TIP = 4;
const INDEX_TIP = 8;

export const TWO_HAND_TUNING = {
  /** Metres of change in pinch-midpoint distance below this are tracking noise. */
  distanceDeadzone: 0.0015,
  rollDeadzone: 0.004,
  pitchDeadzone: 0.01,
  /** Samples further apart than this restart the delta so a lost frame never becomes a jump. */
  maxSampleGapMs: 200,
  pitchGain: 0.6,
  maxRollDeltaPerSample: 0.12,
  maxDollyDeltaPerSample: 0.08,
  /** Minimum speed (m/s) per hand and minimum direction agreement for a parallel pan. */
  panMinSpeed: 0.04,
  panMinAgreement: 0.75,
} as const;

export interface TwoHandIntent {
  mode: 'pinch' | 'pan' | 'neutral';
  /** Signed change in pinch-midpoint distance, metres. Positive (hands apart) pushes the camera forward. */
  dolly: number;
  /** Change in horizon angle of v, radians, counter-clockwise on screen positive. */
  roll: number;
  /** Change in the depth tilt of v, radians (already scaled by the pitch gain). */
  pitch: number;
  panX: number;
  panY: number;
}

export interface TwoHandFrustum {
  halfW: number;
  halfH: number;
}

type Sample = { distance: number; roll: number; tilt: number; atMs: number };

function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function deadzone(v: number, z: number): number {
  return Math.abs(v) < z ? 0 : v;
}

function clamp(v: number, lim: number): number {
  return Math.max(-lim, Math.min(lim, v));
}

function pinchMidpoint(slot: HandSlot, out: [number, number, number]): void {
  const L = slot.landmarks;
  out[0] = (L[THUMB_TIP * 3] + L[INDEX_TIP * 3]) / 2;
  out[1] = (L[THUMB_TIP * 3 + 1] + L[INDEX_TIP * 3 + 1]) / 2;
  out[2] = (L[THUMB_TIP * 3 + 2] + L[INDEX_TIP * 3 + 2]) / 2;
}

const NEUTRAL: TwoHandIntent = { mode: 'neutral', dolly: 0, roll: 0, pitch: 0, panX: 0, panY: 0 };

export class TwoHandGestureTracker {
  private prev: Sample | null = null;
  private frustum: TwoHandFrustum = { halfW: 0.68, halfH: 0.5 };
  private readonly pl: [number, number, number] = [0, 0, 0];
  private readonly pr: [number, number, number] = [0, 0, 0];

  setFrustum(halfW: number, halfH: number): void {
    this.frustum = { halfW, halfH };
  }

  reset(): void {
    this.prev = null;
  }

  /** Slots may arrive in either order; the hand further left in camera space is always P_L. */
  evaluate(nowMs: number, hands: readonly HandSlot[], dtSec: number): TwoHandIntent | null {
    const a = hands[0];
    const b = hands[1];
    if (!a || !b || !a.present || !b.present) {
      this.prev = null;
      return null;
    }
    const aIsLeft = a.landmarks[0] <= b.landmarks[0];
    const left = aIsLeft ? a : b;
    const right = aIsLeft ? b : a;

    if (left.pinching && right.pinching) {
      pinchMidpoint(left, this.pl);
      pinchMidpoint(right, this.pr);
      const dx = this.pr[0] - this.pl[0];
      const dy = this.pr[1] - this.pl[1];
      const dz = this.pr[2] - this.pl[2];
      const sample: Sample = {
        distance: Math.hypot(dx, dy, dz),
        roll: Math.atan2(dy, dx),
        tilt: Math.atan2(dz, Math.max(1e-4, Math.hypot(dx, dy))),
        atMs: nowMs,
      };
      const prev = this.prev;
      this.prev = sample;
      if (!prev || nowMs - prev.atMs > TWO_HAND_TUNING.maxSampleGapMs) return { ...NEUTRAL, mode: 'pinch' };
      return {
        mode: 'pinch',
        dolly: clamp(deadzone(sample.distance - prev.distance, TWO_HAND_TUNING.distanceDeadzone), TWO_HAND_TUNING.maxDollyDeltaPerSample),
        roll: clamp(deadzone(wrapAngle(sample.roll - prev.roll), TWO_HAND_TUNING.rollDeadzone), TWO_HAND_TUNING.maxRollDeltaPerSample),
        pitch: deadzone(wrapAngle(sample.tilt - prev.tilt), TWO_HAND_TUNING.pitchDeadzone) * TWO_HAND_TUNING.pitchGain,
        panX: 0,
        panY: 0,
      };
    }
    this.prev = null;

    if (!left.pinching && !right.pinching) {
      const lv = left.velocity;
      const rv = right.velocity;
      const ls = Math.hypot(lv[0], lv[1]);
      const rs = Math.hypot(rv[0], rv[1]);
      if (ls >= TWO_HAND_TUNING.panMinSpeed && rs >= TWO_HAND_TUNING.panMinSpeed) {
        const agreement = (lv[0] * rv[0] + lv[1] * rv[1]) / (ls * rs);
        if (agreement >= TWO_HAND_TUNING.panMinAgreement) {
          const mx = (lv[0] + rv[0]) / 2;
          const my = (lv[1] + rv[1]) / 2;
          return {
            mode: 'pan',
            dolly: 0,
            roll: 0,
            pitch: 0,
            panX: (mx * dtSec) / (2 * this.frustum.halfW),
            panY: (my * dtSec) / (2 * this.frustum.halfH),
          };
        }
      }
    }
    return { ...NEUTRAL };
  }
}
