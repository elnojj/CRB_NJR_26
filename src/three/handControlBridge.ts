import type { HandControlFrame, HandPosture } from '../components/handGestures';

/**
 * Hand → camera hand-off. The overlay pushes one frame per detection; the render loop drains the
 * accumulated deltas once per animation frame so detection rate and render rate stay decoupled.
 */

const STALE_MS = 300;

export interface HandControlConsumption {
  active: boolean;
  posture: HandPosture;
  panX: number;
  panY: number;
  orbit: number;
  zoomOut: number;
  throwImpulse: { vx: number; vy: number } | null;
}

class HandControlBridge {
  private panX = 0;
  private panY = 0;
  private orbit = 0;
  private zoomOut = 0;
  private posture: HandPosture = 'none';
  private tracking = false;
  private lastPushAt = 0;
  private throwImpulse: { vx: number; vy: number } | null = null;

  push(frame: HandControlFrame, nowMs: number): void {
    this.tracking = frame.tracking;
    this.posture = frame.posture;
    this.zoomOut = frame.zoomOut;
    this.lastPushAt = nowMs;
    this.panX += frame.pan.x;
    this.panY += frame.pan.y;
    this.orbit += frame.orbit;
    if (frame.throw) this.throwImpulse = frame.throw;
  }

  consume(nowMs: number): HandControlConsumption {
    const fresh = this.tracking && nowMs - this.lastPushAt <= STALE_MS;
    const out: HandControlConsumption = {
      active: fresh,
      posture: fresh ? this.posture : 'none',
      panX: this.panX,
      panY: this.panY,
      orbit: this.orbit,
      zoomOut: fresh ? this.zoomOut : 0,
      throwImpulse: this.throwImpulse,
    };
    this.panX = 0;
    this.panY = 0;
    this.orbit = 0;
    this.throwImpulse = null;
    return out;
  }

  reset(): void {
    this.panX = 0;
    this.panY = 0;
    this.orbit = 0;
    this.zoomOut = 0;
    this.posture = 'none';
    this.tracking = false;
    this.throwImpulse = null;
  }
}

export const handControlBridge = new HandControlBridge();
