/**
 * Hand gesture engine — turns one hand of 21 MediaPipe landmarks (already mirrored and mapped
 * to screen pixels) into continuous camera-control frames. Pure maths, no DOM, no three.js.
 *
 * Gestures
 *  1. claw  — five fingertips converged (relative to their MCP base joints)  → hold to zoom out
 *  2. grab  — fingers curled as if holding a ball; roll/shift the hand        → orbit, twist far enough to flip node
 *  3. throw — fast flick, usually right after letting go of a grab           → momentum impulse
 *  4. pan   — open palm or pointing finger, no grab/claw                      → 1:1 smoothed translation
 *
 * Direction convention: `pan`, `flip` and `throw` all describe the hand's own motion on screen
 * (right = +x, up = +y). The camera layer decides how the scene follows the hand.
 */

export type HandPosture = 'none' | 'open' | 'point' | 'claw' | 'grab';

export interface ScreenPoint {
  x: number;
  y: number;
}

export const FINGERTIP_LANDMARKS = [4, 8, 12, 16, 20] as const;
export const FINGER_MCP_LANDMARKS = [2, 5, 9, 13, 17] as const;
const PALM_LANDMARKS = [0, 5, 9, 13, 17] as const;

export const GESTURE_THRESHOLDS = {
  clawConvergence: 0.45,
  clawMinExtension: 1.15,
  openMinExtension: 1.55,
  openMinConvergence: 0.8,
  pointIndexExtension: 1.55,
  pointOthersMaxExtension: 1.3,
  grabMinExtension: 0.7,
  postureHoldFrames: 2,
  panDeadzonePx: 1.5,
  panMaxStepFraction: 0.12,
  panSmoothing: 0.6,
  rollDeadzoneRad: 0.012,
  orbitPerRadian: 1,
  orbitPerScreenWidth: 2.4,
  flipTwistRad: 0.9,
  flipCooldownMs: 700,
  throwWindowMs: 140,
  throwSpeedAfterGrab: 1.2,
  throwSpeedOpenHand: 2.8,
  throwGrabMemoryMs: 450,
  throwCooldownMs: 1000,
  zoomAttack: 0.35,
} as const;

export interface HandMetrics {
  palmLen: number;
  /** Fingertip cluster radius divided by MCP cluster radius. ~0.2–0.4 claw, ~1.5+ open. */
  convergence: number;
  /** Mean tip-to-wrist distance in palm lengths. ~1.9 open, ~1.3 ball hold, <1 fist. */
  extension: number;
  indexExtension: number;
  othersExtension: number;
  /** Clockwise tilt of the hand from upright, radians. */
  roll: number;
  palm: ScreenPoint;
}

export interface HandControlFrame {
  tMs: number;
  tracking: boolean;
  posture: HandPosture;
  /** Hand translation this frame as a fraction of the viewport (open palm or pointing only). */
  pan: { x: number; y: number };
  /** 0..1 strength while the claw is held. */
  zoomOut: number;
  /** Azimuth change in radians while grabbing (positive turns the camera the same way as +x scene drift left). */
  orbit: number;
  /** -1 / +1 when a grab-and-twist has gone far enough to move to the neighbouring node. */
  flip: -1 | 0 | 1;
  /** Hand velocity in viewport fractions per second when a flick is detected. */
  throw: { vx: number; vy: number } | null;
  grabbing: boolean;
}

function dist(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function centroid(points: ScreenPoint[]): ScreenPoint {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export function computeHandMetrics(pts: ScreenPoint[]): HandMetrics {
  const wrist = pts[0];
  const palmLen = Math.max(1e-3, dist(wrist, pts[9]));
  const tips = FINGERTIP_LANDMARKS.map((i) => pts[i]);
  const mcps = FINGER_MCP_LANDMARKS.map((i) => pts[i]);
  const tipCentre = centroid(tips);
  const mcpCentre = centroid(mcps);
  const tipRadius = tips.reduce((s, p) => s + dist(p, tipCentre), 0) / tips.length;
  const mcpRadius = Math.max(1e-3, mcps.reduce((s, p) => s + dist(p, mcpCentre), 0) / mcps.length);
  const tipDist = tips.map((p) => dist(p, wrist) / palmLen);
  return {
    palmLen,
    convergence: tipRadius / mcpRadius,
    extension: tipDist.reduce((s, d) => s + d, 0) / tipDist.length,
    indexExtension: tipDist[1],
    othersExtension: (tipDist[2] + tipDist[3] + tipDist[4]) / 3,
    roll: Math.atan2(pts[9].x - wrist.x, -(pts[9].y - wrist.y)),
    palm: centroid(PALM_LANDMARKS.map((i) => pts[i])),
  };
}

export function classifyPosture(m: HandMetrics): HandPosture {
  const t = GESTURE_THRESHOLDS;
  if (m.convergence < t.clawConvergence && m.extension > t.clawMinExtension) return 'claw';
  if (m.indexExtension > t.pointIndexExtension && m.othersExtension < t.pointOthersMaxExtension) {
    return 'point';
  }
  if (m.extension > t.openMinExtension && m.convergence >= t.openMinConvergence) return 'open';
  if (m.extension >= t.grabMinExtension && m.extension < t.openMinExtension) return 'grab';
  return 'none';
}

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

interface MotionSample {
  t: number;
  x: number;
  y: number;
}

const IDLE_FRAME = (tMs: number, tracking: boolean): HandControlFrame => ({
  tMs,
  tracking,
  posture: 'none',
  pan: { x: 0, y: 0 },
  zoomOut: 0,
  orbit: 0,
  flip: 0,
  throw: null,
  grabbing: false,
});

export class HandGestureEngine {
  private viewportW: number;
  private viewportH: number;
  private posture: HandPosture = 'none';
  private candidate: HandPosture = 'none';
  private candidateFrames = 0;
  private prevPalm: ScreenPoint | null = null;
  private prevRoll: number | null = null;
  private panOut = { x: 0, y: 0 };
  private zoom = 0;
  private twist = 0;
  private flipReadyAt = 0;
  private throwReadyAt = 0;
  private lastGrabAt = -Infinity;
  private panBlockedUntil = 0;
  private history: MotionSample[] = [];

  constructor(viewportW: number, viewportH: number) {
    this.viewportW = Math.max(1, viewportW);
    this.viewportH = Math.max(1, viewportH);
  }

  setViewport(w: number, h: number): void {
    this.viewportW = Math.max(1, w);
    this.viewportH = Math.max(1, h);
  }

  reset(): void {
    this.posture = 'none';
    this.candidate = 'none';
    this.candidateFrames = 0;
    this.prevPalm = null;
    this.prevRoll = null;
    this.panOut = { x: 0, y: 0 };
    this.zoom = 0;
    this.twist = 0;
    this.history = [];
  }

  private commitPosture(next: HandPosture, tMs: number): void {
    if (next === this.posture) return;
    if (this.posture === 'grab') this.lastGrabAt = tMs;
    this.posture = next;
    this.prevPalm = null;
    this.prevRoll = null;
    this.panOut = { x: 0, y: 0 };
    this.twist = 0;
  }

  private velocity(tMs: number): { vx: number; vy: number; speed: number } {
    const t = GESTURE_THRESHOLDS;
    const recent = this.history.filter((s) => tMs - s.t <= t.throwWindowMs);
    if (recent.length < 2) return { vx: 0, vy: 0, speed: 0 };
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dt = Math.max(1, last.t - first.t) / 1000;
    const vx = (last.x - first.x) / this.viewportW / dt;
    const vy = -(last.y - first.y) / this.viewportH / dt;
    return { vx, vy, speed: Math.hypot(vx, vy) };
  }

  update(pts: ScreenPoint[] | null, tMs: number): HandControlFrame {
    const t = GESTURE_THRESHOLDS;
    if (!pts || pts.length < 21) {
      this.reset();
      return IDLE_FRAME(tMs, false);
    }

    const m = computeHandMetrics(pts);
    const raw = classifyPosture(m);
    if (raw === this.candidate) {
      this.candidateFrames += 1;
    } else {
      this.candidate = raw;
      this.candidateFrames = 1;
    }
    if (this.candidateFrames >= t.postureHoldFrames) this.commitPosture(this.candidate, tMs);

    this.history.push({ t: tMs, x: m.palm.x, y: m.palm.y });
    while (this.history.length > 0 && tMs - this.history[0].t > t.throwWindowMs * 2) {
      this.history.shift();
    }

    const frame = IDLE_FRAME(tMs, true);
    frame.posture = this.posture;
    frame.grabbing = this.posture === 'grab';

    const claw = this.posture === 'claw';
    const targetZoom = claw ? 0.5 + Math.min(0.5, (t.clawConvergence - m.convergence) / 0.3) : 0;
    this.zoom += (targetZoom - this.zoom) * (targetZoom > this.zoom ? t.zoomAttack : 0.5);
    if (this.zoom < 0.02) this.zoom = 0;
    frame.zoomOut = this.zoom;

    const dxPx = this.prevPalm ? m.palm.x - this.prevPalm.x : 0;
    const dyPx = this.prevPalm ? m.palm.y - this.prevPalm.y : 0;
    this.prevPalm = m.palm;

    if (this.posture === 'grab') {
      const dRoll = this.prevRoll === null ? 0 : wrapAngle(m.roll - this.prevRoll);
      this.prevRoll = m.roll;
      const roll = Math.abs(dRoll) < t.rollDeadzoneRad ? 0 : dRoll;
      const shift = Math.abs(dxPx) < t.panDeadzonePx ? 0 : dxPx / this.viewportW;
      const handTurn = roll * t.orbitPerRadian + shift * t.orbitPerScreenWidth;
      frame.orbit = -handTurn;
      this.twist += handTurn;
      if (Math.abs(this.twist) >= t.flipTwistRad && tMs >= this.flipReadyAt) {
        frame.flip = this.twist > 0 ? 1 : -1;
        this.twist = 0;
        this.flipReadyAt = tMs + t.flipCooldownMs;
      }
    } else if (this.posture === 'open' || this.posture === 'point') {
      const moving = Math.hypot(dxPx, dyPx) >= t.panDeadzonePx;
      const rawX = moving ? Math.max(-t.panMaxStepFraction, Math.min(t.panMaxStepFraction, dxPx / this.viewportW)) : 0;
      const rawY = moving ? Math.max(-t.panMaxStepFraction, Math.min(t.panMaxStepFraction, -dyPx / this.viewportH)) : 0;
      this.panOut.x += (rawX - this.panOut.x) * t.panSmoothing;
      this.panOut.y += (rawY - this.panOut.y) * t.panSmoothing;
      if (tMs >= this.panBlockedUntil) {
        frame.pan = { x: this.panOut.x, y: this.panOut.y };
      }
    }

    if (tMs >= this.throwReadyAt && this.posture !== 'grab' && this.posture !== 'claw') {
      const v = this.velocity(tMs);
      const afterGrab = tMs - this.lastGrabAt <= t.throwGrabMemoryMs;
      const needed = afterGrab ? t.throwSpeedAfterGrab : t.throwSpeedOpenHand;
      if (v.speed >= needed) {
        frame.throw = { vx: v.vx, vy: v.vy };
        this.throwReadyAt = tMs + t.throwCooldownMs;
        this.panBlockedUntil = tMs + 400;
        frame.pan = { x: 0, y: 0 };
        this.panOut = { x: 0, y: 0 };
        this.lastGrabAt = -Infinity;
      }
    }

    return frame;
  }
}
