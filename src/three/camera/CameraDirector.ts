/**
 * Blueprint v2.0 CameraDirector — single owner of camera travel semantics.
 * Emits CameraCommandPayload verbs consumed by CosmographCanvas.
 * Does not teleport: travel always begins from the current pose snapshot.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import type { CameraCommandPayload } from '../../components/CosmographCanvas';
import { GUI_CAMERA_PRESETS, type GuiCameraPresetId } from '../../gui/cameraPresets';
import type { HandDetectionMode, HandState } from '../handStateRef';
import type { UiInteractResult } from '../nodeInteraction';
import {
  JOURNEY_BASE_DURATION_SEC,
  JOURNEY_BEATS,
  buildJourneyStops,
  journeyBeatAt,
  type JourneyBeat,
  type JourneyStop,
} from './journeyConfig';
import { OneHandGestureTracker } from './oneHandGestures';
import { TwoHandGestureTracker } from './twoHandGestures';
import { isPointingPose } from '../nodeInteraction';

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
  /** Reduced motion: the pose jumped to the next stop, so the view should dissolve instead of fly. */
  onCut?: () => void;
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
  private startedAtMs = 0;
  private reduced = false;
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

  elapsedMs(nowMs: number): number {
    return this.active ? nowMs - this.startedAtMs : 0;
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
    this.startedAtMs = performance.now();
    this.stops = buildJourneyStops();
    this.reduced = options.reducedMotion === true;
    const scale = (options.durationSec ?? JOURNEY_BASE_DURATION_SEC) / JOURNEY_BASE_DURATION_SEC;
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
      defaults: { ease: 'power3.inOut' },
      onComplete: () => this.finish('complete'),
    });
    tl.addLabel('stop-0', 0);
    for (let i = 0; i < last; i += 1) {
      const from = this.stops[i];
      const to = this.stops[i + 1];
      const departAt = (from.departSec ?? from.atSec) * scale;
      const duration = Math.max(0.2, to.atSec * scale - departAt);
      if (this.reduced) {
        const beat = JOURNEY_BEATS[i];
        const at = (beat ? beat.startSec : JOURNEY_BASE_DURATION_SEC) * scale;
        tl.set(this.proxy, { u: (i + 1) / last, focal: to.focalMm }, at);
        tl.call(() => this.callbacks.onCut?.(), undefined, at);
        tl.addLabel(`stop-${i + 1}`, at);
      } else {
        tl.to(this.proxy, { u: (i + 1) / last, focal: to.focalMm, duration }, departAt);
        tl.addLabel(`stop-${i + 1}`, departAt + duration);
      }
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
    if (this.reduced) {
      tl.seek(`stop-${next}`);
      this.proxy.u = next / last;
      this.proxy.focal = this.stops[next].focalMm;
      this.callbacks.onCut?.();
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
// Hand interaction state machine. Strict order, first match wins:
//   UI_INTERACT > CAMERA_TWO_HAND | CAMERA_ONE_HAND
// The Hands toggle picks exactly one camera authority, so the two can never fight:
//   2 hands  both hands tracked together drive dolly, roll, pitch and pan; a lone hand only points,
//            lights a hover and pokes a node (NodeInteractionLayer).
//   1 hand   only one hand is tracked. An open or pointing hand points and pokes; a pinching hand grabs
//            the scene and orbits it.
// ---------------------------------------------------------------------------------------------

export type HandInteractionState = 'IDLE' | 'UI_INTERACT' | 'CAMERA_TWO_HAND' | 'CAMERA_ONE_HAND';

export interface HandCameraIntent {
  state: HandInteractionState;
  /** Pan as a fraction of the viewport this frame (parallel open palms, hand right / up positive). */
  panX: number;
  panY: number;
  /** One-hand orbit in radians (hand right turns the scene right). */
  dAzimuth: number;
  /** Pitch in radians, from either camera authority. */
  dPolar: number;
  /** Two-hand dolly in metres of pinch-midpoint distance change. Positive pushes the camera forward. */
  dolly: number;
  /** Two-hand horizon roll in radians. */
  roll: number;
  /** The camera is being moved by hand this frame (interrupts a running journey). */
  steering: boolean;
}

const HAND_TUNING = {
  uiReleaseHoldMs: 350,
  freshMs: 250,
} as const;

function idleIntent(state: HandInteractionState): HandCameraIntent {
  return { state, panX: 0, panY: 0, dAzimuth: 0, dPolar: 0, dolly: 0, roll: 0, steering: false };
}

export class HandInteractionMachine {
  private uiHoldUntil = 0;
  private state: HandInteractionState = 'IDLE';
  private readonly twoHand = new TwoHandGestureTracker();
  private readonly oneHand = new OneHandGestureTracker();
  private mode: HandDetectionMode = 'two-hands';

  setFrustum(halfW: number, halfH: number): void {
    this.twoHand.setFrustum(halfW, halfH);
    this.oneHand.setFrustum(halfW, halfH);
  }

  setMode(mode: HandDetectionMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.reset();
  }

  getState(): HandInteractionState {
    return this.state;
  }

  reset(): void {
    this.state = 'IDLE';
    this.twoHand.reset();
    this.oneHand.reset();
  }

  evaluate(nowMs: number, dt: number, ui: UiInteractResult | null, hands: HandState): HandCameraIntent {
    const fresh = hands.active && hands.tracking && nowMs - hands.updatedAtMs <= HAND_TUNING.freshMs;

    // 1. UI_INTERACT: an engaged poke on a node never moves the camera.
    if (ui?.locked) {
      this.uiHoldUntil = nowMs + HAND_TUNING.uiReleaseHoldMs;
      this.reset();
      this.state = 'UI_INTERACT';
      return idleIntent('UI_INTERACT');
    }
    if (nowMs < this.uiHoldUntil) {
      this.state = 'UI_INTERACT';
      return idleIntent('UI_INTERACT');
    }

    if (this.mode === 'one-hand') return this.evaluateOneHand(nowMs, hands, fresh);

              // 2. CAMERA_TWO_HAND: Hands active for interaction only - do not move camera
    if (fresh) {
      this.twoHand.evaluate(nowMs, hands.hands, dt);
    } else {
      this.twoHand.reset();
    }
    this.state = 'IDLE';
    return idleIntent('IDLE');

    private evaluateOneHand(nowMs: number, hands: HandState, fresh: boolean): HandCameraIntent {
    const slot = fresh ? hands.hands.find((h) => h.present) : undefined;
    if (slot) {
      this.oneHand.evaluate(nowMs, slot, isPointingPose(slot.landmarks));
    } else {
      this.oneHand.reset();
    }
    this.state = 'IDLE';
    return idleIntent('IDLE');
  }
    this.state = 'CAMERA_ONE_HAND';
    return {
      ...idleIntent(this.state),
      dAzimuth: grab.dAzimuth,
      dPolar: grab.dPolar,
      steering: grab.dAzimuth !== 0 || grab.dPolar !== 0,
    };
  }
}

/**
 * Short filter that keeps an accidental twitch from taking over an automated camera move. Deliberate
 * input that persists for `holdMs` opens the gate; the gate closes the moment the input stops.
 * It is a jitter filter, not a lockout: nothing is ignored for a fixed period after a move starts.
 */
export class IntentJitterGate {
  private since = -1;

  constructor(private readonly holdMs: number) {}

  update(nowMs: number, active: boolean): boolean {
    if (!active) {
      this.since = -1;
      return false;
    }
    if (this.since < 0) this.since = nowMs;
    return nowMs - this.since >= this.holdMs;
  }

  reset(): void {
    this.since = -1;
  }
}

export const splineJourney = new SplineJourney();
export const handInteractionMachine = new HandInteractionMachine();

// ---------------------------------------------------------------------------------------------
// Framing, reframe transaction and shared scene helpers (formerly spatialNavigation.tsx).
// ---------------------------------------------------------------------------------------------

export const SPATIAL_SCALE = 1.0;
export const MASTER_RADIUS = 5;
export const IDLE_MS = 5000;

export const CDE_TAXONOMY = {
  dimensions: ['Projects', 'Files', 'Media', 'Tasks', 'People'] as const,
  glass: {
    metalness: 0.0,
    roughness: 0.04,
    ior: 1.48,
    transmission: 0.98,
    thickness: 1.2,
    specularIntensity: 1.0,
    specularColor: '#B4DDFF',
    sheen: 0.6,
    sheenRoughness: 0.3,
    sheenColor: '#FFF4D0',
    opacity: 0.95,
  },
  bloomThresholdProposal: {
    threshold: 0.88,
    strength: 0.24,
    radius: 0.35,
  },
} as const;

export const DEFAULT_FIVE_AXIS_STATE = {
  connection: 'live',
  input: 'idle',
  output: 'visual',
  execution: 'ready',
  persistence: 'synced',
} as const;

export interface Pose {
  target: [number, number, number];
  azimuth: number;
  elevation: number;
  fov: number;
  distance: number;
}

export function fitDistance(
  radius: number,
  fovDeg: number,
  aspect: number,
  margin = 1.15
): number {
  const safeAspect = Math.max(0.25, aspect || 1);
  const vFov = THREE.MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect);
  const limiting = Math.min(vFov, hFov);
  return (radius * margin) / Math.sin(limiting / 2);
}

export function masterPose(aspect: number): Pose {
  const fov = aspect < 0.8 ? 52 : 46; // Wider FOV for phone portrait
  return {
    target: [0, 0, 0],
    azimuth: 0.22,
    elevation: 0.19,
    fov,
    distance: fitDistance(MASTER_RADIUS * SPATIAL_SCALE, fov, aspect),
  };
}

export function applyViewShift(
  cam: THREE.PerspectiveCamera,
  w: number,
  h: number,
  occludedBottomPx = 0
): void {
  if (w <= 0 || h <= 0) return;
  if (Math.abs(occludedBottomPx) <= 1) {
    cam.clearViewOffset();
  } else {
    cam.setViewOffset(w, h, 0, occludedBottomPx / 2, w, h);
  }
  cam.updateProjectionMatrix();
}

export const flightMs = (length: number): number =>
  THREE.MathUtils.clamp(length * 140, 900, 2600);

export interface ResizeSnapshot {
  width: number;
  height: number;
  aspect: number;
  generation: number;
  pose: Pose;
  occludedBottomPx: number;
}

let activeResizeGeneration = 0;

export function createResizeSnapshot(
  width: number,
  height: number,
  occludedBottomPx = 0
): ResizeSnapshot {
  activeResizeGeneration++;
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const aspect = safeW / safeH;
  const pose = masterPose(aspect);
  return {
    width: safeW,
    height: safeH,
    aspect,
    generation: activeResizeGeneration,
    pose,
    occludedBottomPx,
  };
}

/**
 * Executes the D0 Atomic Resize Reframe Transaction:
 * Computes viewport width/height, visible panel/sheet occlusion,
 * masterPose(aspect) (fov: aspect < 0.8 ? 52 : 46, fitDistance(MASTER_RADIUS * SPATIAL_SCALE, fov, aspect, 1.15)),
 * and cam.setViewOffset(w, h, 0, occludedBottomPx / 2, w, h) in one atomic snapshot,
 * plus triggers a post-Home transaction refresh.
 */
export function executeAtomicReframe(
  cam: THREE.PerspectiveCamera,
  width: number,
  height: number,
  occludedBottomPx = 0
): ResizeSnapshot {
  const snap = createResizeSnapshot(width, height, occludedBottomPx);
  cam.aspect = snap.aspect;
  cam.fov = snap.pose.fov;
  applyViewShift(cam, snap.width, snap.height, occludedBottomPx);
  cam.updateProjectionMatrix();
  return snap;
}

/**
 * readHomeComposition:
 * Reads .orb-slot-spacer, [data-orb-slot] or viewport bounds.
 * Accounts for mobile sheet occlusion (< 720px) and returns framing data.
 */
export function readHomeComposition(domContainer?: HTMLElement | null): {
  width: number;
  height: number;
  aspect: number;
  occludedBottomPx: number;
  pose: Pose;
  slotRect?: DOMRect | null;
} {
  const w = domContainer?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1440);
  const h = domContainer?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 900);
  const aspect = w / Math.max(1, h);

  let occludedBottomPx = 0;
  if (typeof document !== 'undefined') {
    const isMobile = w < 720;
    const sheetEl = document.querySelector('[data-sheet-open="true"], [data-bottom-sheet="true"]');
    if (isMobile && sheetEl) {
      const rect = sheetEl.getBoundingClientRect();
      occludedBottomPx = Math.max(0, h - rect.top);
    }
  }

  let slotRect: DOMRect | null = null;
  if (typeof document !== 'undefined') {
    const slotEl = document.querySelector('.orb-slot-spacer, [data-orb-slot]');
    if (slotEl) {
      slotRect = slotEl.getBoundingClientRect();
    }
  }

  return {
    width: w,
    height: h,
    aspect,
    occludedBottomPx,
    pose: masterPose(aspect),
    slotRect,
  };
}

/**
 * Fix #1: Targets `#include <opaque_fragment>` (Three r154+ chunk name)
 * with an explicit guard that warns instead of silently skipping.
 */
export function patchFresnelRimOnOpaqueFragment(
  shader: { fragmentShader: string },
  rimColor: THREE.Color,
  bodyColor: THREE.Color,
  fresnelPower = 2.6,
  rimIntensity = 0.22
): boolean {
  const targetChunk = '#include <opaque_fragment>';
  if (!shader.fragmentShader.includes(targetChunk)) {
    console.warn(
      '[Cerebro v2 Shader Guard] Expected #include <opaque_fragment> in Three.js r154+ MeshPhysicalMaterial shader, falling back to #include <dithering_fragment>.'
    );
    return false;
  }

  // Stable rim: view-space fresnel (not fixed +Z) + time-only wave (not gl_FragCoord).
  // Screen-space caustics + fixed-axis fresnel strobe when the camera moves around the sphere.
  shader.fragmentShader = shader.fragmentShader.replace(
    targetChunk,
    `${targetChunk}
    {
      vec3 v2N = normalize(vNormal);
      vec3 v2V = normalize(vViewPosition);
      float v2Fresnel = pow(1.0 - clamp(abs(dot(v2N, v2V)), 0.0, 1.0), ${fresnelPower.toFixed(2)});
      vec3 v2RimCol = vec3(${rimColor.r.toFixed(3)}, ${rimColor.g.toFixed(3)}, ${rimColor.b.toFixed(
      3
    )});
      vec3 v2BodyCol = vec3(${bodyColor.r.toFixed(3)}, ${bodyColor.g.toFixed(
      3
    )}, ${bodyColor.b.toFixed(3)});
      float v2Wave = 0.5 + 0.5 * sin(uTime * 0.55);
      vec3 v2Tint = mix(v2BodyCol, v2RimCol, v2Wave) * v2Fresnel * (${rimIntensity.toFixed(3)} + uAudioRms * 0.1);
      gl_FragColor.rgb += v2Tint;
    }`
  );
  return true;
}

/**
 * Fix #3 & #7: Bounded particle drift from immutable basePositions with per-frame reducedMotion check.
 * Never compounds `pos.setY(pos.getY() + ...)` across frames.
 */
export function updateBoundedParticleDrift(
  positionAttr: THREE.BufferAttribute,
  basePositions: Float32Array,
  phases: Float32Array,
  elapsedSec: number,
  reducedMotion: boolean,
  amplitude = 0.075
): void {
  const count = Math.min(positionAttr.count, Math.floor(basePositions.length / 3));
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const bx = basePositions[idx];
    const by = basePositions[idx + 1];
    const bz = basePositions[idx + 2];
    if (reducedMotion) {
      positionAttr.setXYZ(i, bx, by, bz);
    } else {
      const ph = phases[i] ?? (i * 0.37) % (Math.PI * 2);
      const dy = Math.sin(elapsedSec * 0.65 + ph) * amplitude;
      const dx = Math.cos(elapsedSec * 0.45 + ph * 1.3) * (amplitude * 0.45);
      positionAttr.setXYZ(i, bx + dx, by + dy, bz);
    }
  }
  positionAttr.needsUpdate = true;
}

/**
 * Fix #4: Closed orbital loop helper.
 * Drops the duplicate endpoint returned by `EllipseCurve.getPoints(segments)`
 * and constructs a closed `CatmullRomCurve3(pts3D, true, 'centripetal')`.
 */
export function buildClosedOrbitalLoopPoints(
  radiusX: number,
  radiusY = radiusX,
  segments = 72
): { curve: THREE.CatmullRomCurve3; points: THREE.Vector3[] } {
  const ellipse = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, 0);
  // EllipseCurve.getPoints(N) returns N+1 points where the last point duplicates the first
  const raw2D = ellipse.getPoints(segments).slice(0, -1);
  const controlPts3D = raw2D.map((p) => new THREE.Vector3(p.x, p.y, 0));
  const closedCurve = new THREE.CatmullRomCurve3(controlPts3D, true, 'centripetal');
  const sampledPoints = closedCurve.getPoints(segments);
  return { curve: closedCurve, points: sampledPoints };
}
