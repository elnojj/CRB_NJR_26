import type { HandSlot } from '../handStateRef';

/**
 * One-hand camera control, used only when the Hands toggle is set to "1 hand". The hand that is pinching
 * (thumb and index together) grabs the scene and orbits it; an open or pointing hand never moves the camera,
 * so pointing at and poking nodes stays free of conflicts. A short engage hold keeps a passing pinch from
 * grabbing the scene, and a hand that vanishes for a moment restarts the drag instead of jumping.
 */

export const ONE_HAND_TUNING = {
  /** Pinch must be held this long before the scene is grabbed. */
  engageHoldMs: 90,
  /** Pinch-midpoint travel below this many metres per sample is tracking noise. */
  deadzone: 0.0012,
  /** Orbit swept by moving the hand across the whole glove frustum. */
  azimuthPerFrustumWidth: Math.PI * 1.1,
  polarPerFrustumHeight: Math.PI * 0.85,
  maxStepM: 0.05,
  maxSampleGapMs: 200,
} as const;

export interface OneHandIntent {
  dAzimuth: number;
  dPolar: number;
}

const THUMB_TIP = 4;
const INDEX_TIP = 8;

export class OneHandGestureTracker {
  private frustum = { halfW: 0.68, halfH: 0.5 };
  private pinchSinceMs = -1;
  private prev: { x: number; y: number; atMs: number } | null = null;

  setFrustum(halfW: number, halfH: number): void {
    this.frustum = { halfW, halfH };
  }

  reset(): void {
    this.pinchSinceMs = -1;
    this.prev = null;
  }

  /** `pointing` hands never grab: a poke and a grab must not be able to fire from the same pose. */
  evaluate(nowMs: number, hand: HandSlot | undefined, pointing: boolean): OneHandIntent | null {
    if (!hand || !hand.present || !hand.pinching || pointing) {
      this.reset();
      return null;
    }
    if (this.pinchSinceMs < 0) this.pinchSinceMs = nowMs;

    const L = hand.landmarks;
    const x = (L[THUMB_TIP * 3] + L[INDEX_TIP * 3]) / 2;
    const y = (L[THUMB_TIP * 3 + 1] + L[INDEX_TIP * 3 + 1]) / 2;
    const prev = this.prev;
    this.prev = { x, y, atMs: nowMs };

    if (nowMs - this.pinchSinceMs < ONE_HAND_TUNING.engageHoldMs) return { dAzimuth: 0, dPolar: 0 };
    if (!prev || nowMs - prev.atMs > ONE_HAND_TUNING.maxSampleGapMs) return { dAzimuth: 0, dPolar: 0 };

    const dx = step(x - prev.x);
    const dy = step(y - prev.y);
    const { halfW, halfH } = this.frustum;
    return {
      // The scene follows the hand: hand right turns the world right, which is a negative azimuth change.
      dAzimuth: -(dx / (2 * halfW)) * ONE_HAND_TUNING.azimuthPerFrustumWidth,
      dPolar: (dy / (2 * halfH)) * ONE_HAND_TUNING.polarPerFrustumHeight,
    };
  }
}

function step(delta: number): number {
  if (Math.abs(delta) < ONE_HAND_TUNING.deadzone) return 0;
  return Math.max(-ONE_HAND_TUNING.maxStepM, Math.min(ONE_HAND_TUNING.maxStepM, delta));
}
