/**
 * Blueprint v2.0 CameraDirector — single owner of camera travel semantics.
 * Emits CameraCommandPayload verbs consumed by CosmographCanvas.
 * Does not teleport: travel always begins from the current pose snapshot.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import type { CameraCommandPayload } from '../../components/CosmographCanvas';
import { GUI_CAMERA_PRESETS, type GuiCameraPresetId } from '../../gui/cameraPresets';
import type { HandState } from '../handStateRef';
import type { UiInteractResult } from '../spatialControls';
import {
  JOURNEY_BASE_DURATION_SEC,
  buildJourneyStops,
  journeyBeatAt,
  type JourneyBeat,
  type JourneyStop,
} from './journeyConfig';

export type CameraDirectorMode =
  | 'idle'
  | 'orbit'
  | 'approach'
  | 'overview'
  | 'travel'
  | 'settle'
  | 'stopped';

export interface CameraPoseSnapshot {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
  timestamp: number;
}

export interface CameraTravelRequest {
  destinationId: string;
  targetPose: CameraPoseSnapshot;
  durationMs?: number;
  settleMs?: number;
  reducedMotion?: boolean;
}

export type CameraDirectorEmitter = (payload: Omit<CameraCommandPayload, 'id'> & { id?: number }) => void;

const CROSS_PROJECT_MS = { min: 2400, max: 4000 } as const;
const SETTLE_MS = { min: 300, max: 420 } as const;
const LOCAL_SELECTION_MS = 700;

export class CameraDirector {
  private mode: CameraDirectorMode = 'idle';
  private origin: CameraPoseSnapshot | null = null;
  private destinationId: string | null = null;
  private path: THREE.CatmullRomCurve3 | null = null;
  private travelStartedAt = 0;
  private travelDurationMs = 3200;
  private settleMs = 360;
  private cmdSeq = 0;
  private frozen = false;
  private reducedMotion = false;
  private emitter: CameraDirectorEmitter | null = null;

  attach(emitter: CameraDirectorEmitter): void {
    this.emitter = emitter;
  }

  getMode(): CameraDirectorMode {
    return this.mode;
  }

  getDestinationId(): string | null {
    return this.destinationId;
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  /** Stop camera motion while reading / editing / inspecting media. */
  freeze(reason: 'reading' | 'editing' | 'media' | 'manual' = 'manual'): void {
    this.frozen = true;
    this.stop();
    void reason;
  }

  unfreeze(): void {
    this.frozen = false;
  }

  private emit(verb: CameraCommandPayload['verb'], options: Partial<CameraCommandPayload> = {}): void {
    if (!this.emitter) return;
    this.cmdSeq += 1;
    this.emitter({ id: this.cmdSeq, verb, ...options });
  }

  snapshotCurrent(pose: CameraPoseSnapshot): CameraPoseSnapshot {
    return {
      position: pose.position.clone(),
      lookAt: pose.lookAt.clone(),
      fov: pose.fov,
      timestamp: performance.now(),
    };
  }

  /**
   * Begin travel from the current pose. New selection interrupts immediately
   * and restarts from the latest pose (never a preset start).
   */
  travelTo(current: CameraPoseSnapshot, request: CameraTravelRequest): void {
    if (this.frozen) return;

    this.origin = this.snapshotCurrent(current);
    this.destinationId = request.destinationId;

    const mid = this.origin.position.clone().lerp(request.targetPose.position, 0.5);
    mid.y += Math.max(1.2, this.origin.position.distanceTo(request.targetPose.position) * 0.18);

    this.path = new THREE.CatmullRomCurve3([
      this.origin.position.clone(),
      mid,
      request.targetPose.position.clone(),
    ]);

    const span = this.origin.position.distanceTo(request.targetPose.position);
    const base =
      request.durationMs ??
      THREE.MathUtils.clamp(1800 + span * 220, CROSS_PROJECT_MS.min, CROSS_PROJECT_MS.max);
    this.travelDurationMs = this.reducedMotion || request.reducedMotion ? LOCAL_SELECTION_MS : base;
    this.settleMs = THREE.MathUtils.clamp(
      request.settleMs ?? 360,
      SETTLE_MS.min,
      SETTLE_MS.max
    );
    this.travelStartedAt = performance.now();
    this.mode = 'travel';

    this.emit('fly_in', {
      targetNodeId: request.destinationId,
      focalLengthMm: this.fovToApproxFocal(request.targetPose.fov),
    });
  }

  approachNode(nodeId: string, preset: GuiCameraPresetId = 'approach'): void {
    if (this.frozen) return;
    this.destinationId = nodeId;
    this.mode = 'approach';
    const ms = this.reducedMotion
      ? LOCAL_SELECTION_MS
      : GUI_CAMERA_PRESETS[preset]?.travelMs ?? 2400;
    void ms;
    this.emit('focus_node', { targetNodeId: nodeId });
  }

  overview(sphere: 'hq' | 'cde' = 'hq'): void {
    if (this.frozen) return;
    this.mode = 'overview';
    this.destinationId = null;
    this.emit('center', { targetSphere: sphere });
  }

  orbit(deltaAzimuth = 0.12): void {
    if (this.frozen) return;
    this.mode = 'orbit';
    this.emit('orbit', { deltaAzimuth });
  }

  returnToOrigin(): void {
    if (!this.origin) {
      this.overview('hq');
      return;
    }
    this.travelTo(
      {
        position: this.origin.position.clone().add(new THREE.Vector3(0.01, 0, 0)),
        lookAt: this.origin.lookAt.clone(),
        fov: this.origin.fov,
        timestamp: performance.now(),
      },
      {
        destinationId: 'origin-restore',
        targetPose: this.origin,
        durationMs: this.reducedMotion ? LOCAL_SELECTION_MS : 2800,
      }
    );
  }

  stop(): void {
    this.mode = 'stopped';
    this.path = null;
    this.emit('stop');
  }

  skipToEnd(): void {
    if (!this.destinationId) {
      this.stop();
      return;
    }
    this.mode = 'settle';
    this.emit('focus_node', { targetNodeId: this.destinationId });
    this.path = null;
  }

  /** Sample path progress 0..1 for renderer integration / tests. */
  sampleProgress(now = performance.now()): {
    t: number;
    position: THREE.Vector3 | null;
    mode: CameraDirectorMode;
  } {
    if (!this.path || this.mode !== 'travel') {
      return { t: this.mode === 'settle' ? 1 : 0, position: null, mode: this.mode };
    }
    const elapsed = now - this.travelStartedAt;
    const t = THREE.MathUtils.clamp(elapsed / this.travelDurationMs, 0, 1);
    const eased = t * t * (3 - 2 * t);
    const position = this.path.getPoint(eased);
    if (t >= 1) {
      this.mode = 'settle';
      window.setTimeout(() => {
        if (this.mode === 'settle') this.mode = 'idle';
      }, this.settleMs);
    }
    return { t: eased, position, mode: this.mode };
  }

  private fovToApproxFocal(fov: number): number {
    // vertical FOV → 24mm sensor focal approximation
    const rad = THREE.MathUtils.degToRad(Math.max(5, fov));
    return Number((24 / (2 * Math.tan(rad / 2))).toFixed(1));
  }
}

export const cameraDirector = new CameraDirector();

// ---------------------------------------------------------------------------------------------
// Spline journey: ten camera stops on a CatmullRomCurve3, sequenced by one GSAP timeline.
// ---------------------------------------------------------------------------------------------

export interface JourneyPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  focalMm: number;
}

export interface JourneyCallbacks {
  onBeat?: (beat: JourneyBeat, index: number) => void;
  onEnd?: (reason: 'complete' | 'skipped' | 'interrupted') => void;
}

export class SplineJourney {
  private stops: JourneyStop[] = [];
  private positionCurve: THREE.CatmullRomCurve3 | null = null;
  private targetCurve: THREE.CatmullRomCurve3 | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private readonly proxy = { u: 0, focal: 28 };
  private beatIndex = -1;
  private active = false;
  private sampled = false;
  private callbacks: JourneyCallbacks = {};
  private readonly pose: JourneyPose = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    focalMm: 28,
  };

  setCallbacks(callbacks: JourneyCallbacks): void {
    this.callbacks = callbacks;
  }

  isActive(): boolean {
    return this.active;
  }

  /** Last sampled pose, kept after the journey ends so the orbit rig can adopt it. */
  lastPose(): JourneyPose | null {
    return this.sampled ? this.pose : null;
  }

  getBeatIndex(): number {
    return this.beatIndex;
  }

  getStopCount(): number {
    return this.stops.length;
  }

  start(options: { reducedMotion?: boolean; durationSec?: number } = {}): void {
    this.dispose();
    this.sampled = false;
    this.stops = buildJourneyStops();
    const scale = (options.durationSec ?? (options.reducedMotion ? 36 : JOURNEY_BASE_DURATION_SEC)) / JOURNEY_BASE_DURATION_SEC;
    this.positionCurve = new THREE.CatmullRomCurve3(
      this.stops.map((s) => new THREE.Vector3(...s.position)),
      false,
      'centripetal'
    );
    this.targetCurve = new THREE.CatmullRomCurve3(
      this.stops.map((s) => new THREE.Vector3(...s.target)),
      false,
      'centripetal'
    );
    this.proxy.u = 0;
    this.proxy.focal = this.stops[0].focalMm;
    this.beatIndex = -1;
    this.active = true;

    const last = this.stops.length - 1;
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => this.finish('complete'),
    });
    tl.addLabel('stop-0', 0);
    for (let i = 0; i < last; i += 1) {
      const from = this.stops[i];
      const to = this.stops[i + 1];
      const duration = Math.max(0.2, (to.atSec - from.atSec) * scale);
      tl.to(this.proxy, { u: (i + 1) / last, focal: to.focalMm, duration }, `stop-${i}`);
      tl.addLabel(`stop-${i + 1}`, `>`);
    }
    this.timeline = tl;
    this.sample();
  }

  /** Advance or rewind one stop (flick / twist while the journey is playing). */
  step(direction: -1 | 1): void {
    const tl = this.timeline;
    if (!tl || !this.active) return;
    const last = this.stops.length - 1;
    const current = Math.round(this.proxy.u * last);
    const next = THREE.MathUtils.clamp(current + direction, 0, last);
    if (next === last && direction === 1 && current === last) {
      this.finish('skipped');
      return;
    }
    tl.tweenTo(`stop-${next}`, { duration: 1.4, ease: 'power2.inOut' });
  }

  /** Per-frame pose sample (also fires beat captions). Null when the journey is not running. */
  sample(): JourneyPose | null {
    if (!this.active || !this.positionCurve || !this.targetCurve) return null;
    const u = THREE.MathUtils.clamp(this.proxy.u, 0, 1);
    this.positionCurve.getPoint(u, this.pose.position);
    this.targetCurve.getPoint(u, this.pose.target);
    this.pose.focalMm = this.proxy.focal;
    this.sampled = true;
    const editorial = (this.timeline ? this.timeline.time() / Math.max(0.001, this.timeline.duration()) : 0) * JOURNEY_BASE_DURATION_SEC;
    const { beat, index } = journeyBeatAt(editorial);
    if (index !== this.beatIndex) {
      this.beatIndex = index;
      this.callbacks.onBeat?.(beat, index);
    }
    return this.pose;
  }

  stop(reason: 'skipped' | 'interrupted'): void {
    if (!this.active) return;
    this.finish(reason);
  }

  private finish(reason: 'complete' | 'skipped' | 'interrupted'): void {
    this.sample();
    this.timeline?.kill();
    this.timeline = null;
    this.active = false;
    this.callbacks.onEnd?.(reason);
  }

  dispose(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.active = false;
  }
}

// ---------------------------------------------------------------------------------------------
// Hand interaction priority state machine. Strict order, first match wins:
//   UI_INTERACT > CAMERA_CLAW_ZOOM > CAMERA_SPHERE_ORBIT > CAMERA_FLICK_THROW > CAMERA_PALM_PAN
// ---------------------------------------------------------------------------------------------

export type HandInteractionState =
  | 'IDLE'
  | 'UI_INTERACT'
  | 'CAMERA_CLAW_ZOOM'
  | 'CAMERA_SPHERE_ORBIT'
  | 'CAMERA_FLICK_THROW'
  | 'CAMERA_PALM_PAN';

export interface HandCameraIntent {
  state: HandInteractionState;
  /** Pan as a fraction of the viewport this frame (hand right / up positive). */
  panX: number;
  panY: number;
  dAzimuth: number;
  dPolar: number;
  /** 0..1 while the claw is held. */
  zoomOut: number;
  /** Hand-direction step to the neighbouring node / journey stop (flip or horizontal throw). */
  step: -1 | 0 | 1;
  /** The camera is being moved by hand this frame (interrupts a running journey). */
  steering: boolean;
}

const HAND_TUNING = {
  motionDampRate: 30,
  throwAzimuthGain: 3.2,
  throwAzimuthMax: 5,
  throwPolarGain: 1.4,
  throwPolarMax: 2,
  throwDecayPerSec: 2.4,
  throwRestVelocity: 0.05,
  throwStepDelayMs: 240,
  uiReleaseHoldMs: 350,
  freshMs: 250,
} as const;

function idleIntent(state: HandInteractionState): HandCameraIntent {
  return { state, panX: 0, panY: 0, dAzimuth: 0, dPolar: 0, zoomOut: 0, step: 0, steering: false };
}

export class HandInteractionMachine {
  private lastFrameId = -1;
  private pendingPanX = 0;
  private pendingPanY = 0;
  private pendingAz = 0;
  private throwAz = 0;
  private throwPolar = 0;
  private pendingStep: { dir: -1 | 1; at: number } | null = null;
  private uiHoldUntil = 0;
  private state: HandInteractionState = 'IDLE';

  getState(): HandInteractionState {
    return this.state;
  }

  reset(): void {
    this.pendingPanX = 0;
    this.pendingPanY = 0;
    this.pendingAz = 0;
    this.throwAz = 0;
    this.throwPolar = 0;
    this.pendingStep = null;
    this.state = 'IDLE';
  }

  evaluate(nowMs: number, dt: number, ui: UiInteractResult | null, hands: HandState): HandCameraIntent {
    const fresh = hands.active && hands.tracking && nowMs - hands.updatedAtMs <= HAND_TUNING.freshMs;
    const control = fresh ? hands.hands[0].control : null;
    const newFrame = hands.frameId !== this.lastFrameId;
    this.lastFrameId = hands.frameId;

    // 1. UI_INTERACT — grabbing or poking a 3D control never moves the camera.
    if (ui && (ui.locked || ui.hovering)) {
      this.uiHoldUntil = nowMs + HAND_TUNING.uiReleaseHoldMs;
      this.reset();
      this.state = 'UI_INTERACT';
      return idleIntent('UI_INTERACT');
    }
    if (nowMs < this.uiHoldUntil) {
      this.state = 'UI_INTERACT';
      return idleIntent('UI_INTERACT');
    }

    const intent = idleIntent('IDLE');

    if (control && newFrame) {
      if (control.posture === 'grab') {
        this.pendingAz += control.orbit;
      } else if (control.posture === 'open' || control.posture === 'point') {
        this.pendingPanX += control.pan.x;
        this.pendingPanY += control.pan.y;
      }
      if (control.flip !== 0) this.queueStep(control.flip, nowMs, 0);
      if (control.throw) {
        const { vx, vy } = control.throw;
        this.throwAz = THREE.MathUtils.clamp(-vx * HAND_TUNING.throwAzimuthGain, -HAND_TUNING.throwAzimuthMax, HAND_TUNING.throwAzimuthMax);
        this.throwPolar = THREE.MathUtils.clamp(vy * HAND_TUNING.throwPolarGain, -HAND_TUNING.throwPolarMax, HAND_TUNING.throwPolarMax);
        if (Math.abs(vx) > Math.abs(vy)) this.queueStep(vx > 0 ? 1 : -1, nowMs, HAND_TUNING.throwStepDelayMs);
      }
    }

    // Smooth the 30 Hz detections over 60 fps frames (THREE.MathUtils.damp on the pending deltas).
    const k = 1 - Math.exp(-HAND_TUNING.motionDampRate * dt);
    const takePanX = this.pendingPanX * k;
    const takePanY = this.pendingPanY * k;
    const takeAz = this.pendingAz * k;
    this.pendingPanX -= takePanX;
    this.pendingPanY -= takePanY;
    this.pendingAz -= takeAz;

    const throwing = Math.abs(this.throwAz) + Math.abs(this.throwPolar) > HAND_TUNING.throwRestVelocity;
    const posture = control?.posture ?? 'none';

    // 2. CAMERA_CLAW_ZOOM
    if (posture === 'claw' && control) {
      this.state = 'CAMERA_CLAW_ZOOM';
      intent.state = this.state;
      intent.zoomOut = control.zoomOut;
      intent.steering = true;
    } else if (posture === 'grab') {
      // 3. CAMERA_SPHERE_ORBIT
      this.state = 'CAMERA_SPHERE_ORBIT';
      intent.state = this.state;
      intent.dAzimuth = takeAz;
      intent.steering = takeAz !== 0;
    } else if (throwing) {
      // 4. CAMERA_FLICK_THROW — inertial impulse with exponential decay.
      this.state = 'CAMERA_FLICK_THROW';
      intent.state = this.state;
      intent.dAzimuth = this.throwAz * dt;
      intent.dPolar = this.throwPolar * dt;
      intent.steering = true;
    } else if (posture === 'open' || posture === 'point') {
      // 5. CAMERA_PALM_PAN
      this.state = 'CAMERA_PALM_PAN';
      intent.state = this.state;
      intent.panX = takePanX;
      intent.panY = takePanY;
      intent.steering = takePanX !== 0 || takePanY !== 0;
    } else {
      this.state = 'IDLE';
    }

    if (throwing) {
      const decay = Math.exp(-HAND_TUNING.throwDecayPerSec * dt);
      this.throwAz *= decay;
      this.throwPolar *= decay;
      if (Math.abs(this.throwAz) + Math.abs(this.throwPolar) <= HAND_TUNING.throwRestVelocity) {
        this.throwAz = 0;
        this.throwPolar = 0;
      }
    }

    if (this.pendingStep && nowMs >= this.pendingStep.at) {
      intent.step = this.pendingStep.dir;
      this.pendingStep = null;
    }
    return intent;
  }

  private queueStep(dir: -1 | 1, nowMs: number, delayMs: number): void {
    if (this.pendingStep) return;
    this.pendingStep = { dir, at: nowMs + delayMs };
  }
}

export const splineJourney = new SplineJourney();
export const handInteractionMachine = new HandInteractionMachine();
