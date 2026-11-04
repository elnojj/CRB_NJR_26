import gsap from 'gsap';
import * as THREE from 'three';
import {
  buildJourneyCurves,
  buildJourneyStops,
  buildJourneyTimeline,
  type JourneyCurves,
  type JourneyProxy,
} from './beatJourney';
import type { BeatCameraKeyframe } from './beatTypes';

/**
 * The only camera authority in the clean-slate scene. Three modes, one at a time:
 *   orbit    damped drag / wheel orbit around the sphere, with a slow idle drift
 *   journey  the one-shot flight through the beats (see beatJourney)
 *   return   a short flight from wherever the journey stopped back to the orbit pose
 * Pose is applied after every other update so nothing lags a frame behind.
 */

export type RigMode = 'orbit' | 'journey' | 'return';
export type JourneyEndReason = 'complete' | 'skipped' | 'interrupted';

export interface BeatsCameraRigOptions {
  homeRadius: number;
  reducedMotion: () => boolean;
  idleOrbitAllowed: () => boolean;
}

export interface BeatsCameraRigCallbacks {
  onBeat?: (beatIndex: number) => void;
  onEnd?: (reason: JourneyEndReason) => void;
}

const MIN_ORBIT_RADIUS = 7.5;
const MAX_ORBIT_RADIUS = 34;
export const FILM_GAUGE_MM = 36;
const RETURN_SEC = 1.6;
const RETURN_EASE = 'power2.inOut';

const damp = (current: number, target: number, rate: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** Mirrors `PerspectiveCamera.setFocalLength`: the 36 mm gauge spans the longer side, so focal length alone does not fix vertical FOV. */
export const focalToVerticalFovDeg = (focalMm: number, aspect = 16 / 9): number =>
  THREE.MathUtils.radToDeg(2 * Math.atan((0.5 * FILM_GAUGE_MM) / Math.max(aspect, 1) / Math.max(1, focalMm)));

export class BeatsCameraRig {
  private mode: RigMode = 'orbit';
  private callbacks: BeatsCameraRigCallbacks = {};
  private disposed = false;

  private yaw = 0.6;
  private pitch = 0.22;
  private radius: number;
  private targetYaw = 0.6;
  private targetPitch = 0.22;
  private targetRadius: number;
  private focalMm = 28;
  private rollDeg = 0;
  private drag: { id: number; x: number; y: number } | null = null;

  private readonly position = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  private readonly proxy: JourneyProxy = { u: 0, focalMm: 28, rollDeg: 0 };
  private curves: JourneyCurves | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private readonly flightFrom = { position: new THREE.Vector3(), target: new THREE.Vector3(), focalMm: 28, rollDeg: 0 };
  private readonly flight = { t: 0 };
  private flightTween: gsap.core.Tween | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly domElement: HTMLElement,
    private readonly options: BeatsCameraRigOptions
  ) {
    this.radius = options.homeRadius;
    this.targetRadius = options.homeRadius;
    domElement.addEventListener('pointerdown', this.onPointerDown);
    domElement.addEventListener('pointermove', this.onPointerMove);
    domElement.addEventListener('pointerup', this.onPointerUp);
    domElement.addEventListener('pointercancel', this.onPointerUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.writeOrbitPose();
  }

  setCallbacks(callbacks: BeatsCameraRigCallbacks): void {
    this.callbacks = callbacks;
  }

  getMode(): RigMode {
    return this.mode;
  }

  isJourneyActive(): boolean {
    return this.mode === 'journey';
  }

  /** Orbit-state snapshot for telemetry. */
  getOrbit(): { radius: number; yaw: number; pitch: number; focalMm: number; rollDeg: number } {
    return { radius: this.radius, yaw: this.yaw, pitch: this.pitch, focalMm: this.focalMm, rollDeg: this.rollDeg };
  }

  startJourney(keyframes: readonly BeatCameraKeyframe[]): void {
    if (this.disposed || this.mode === 'journey' || keyframes.length === 0) return;
    this.killMotion();
    this.writeOrbitPose();
    const stops = buildJourneyStops(
      {
        position: [this.position.x, this.position.y, this.position.z],
        target: [0, 0, 0],
        focalMm: this.focalMm,
        rollDeg: 0,
      },
      keyframes
    );
    this.curves = buildJourneyCurves(stops);
    this.mode = 'journey';
    this.timeline = buildJourneyTimeline(
      stops,
      this.proxy,
      {
        onEnter: (index) => this.callbacks.onBeat?.(index),
        onComplete: () => this.finishJourney('complete'),
      },
      { reducedMotion: this.options.reducedMotion() }
    );
  }

  stopJourney(reason: Exclude<JourneyEndReason, 'complete'> = 'skipped'): void {
    if (this.mode !== 'journey') return;
    this.finishJourney(reason);
  }

  /** Per-frame. Mutates the camera; call after every other scene update. */
  update(dtSec: number): void {
    if (this.disposed) return;
    const dt = Math.min(dtSec, 0.1);
    switch (this.mode) {
      case 'orbit':
        this.stepOrbit(dt);
        this.writeOrbitPose();
        break;
      case 'journey':
        this.sampleJourney();
        break;
      case 'return':
        this.sampleReturn();
        break;
      default: {
        const unreachable: never = this.mode;
        throw new Error(`Unhandled rig mode ${String(unreachable)}`);
      }
    }
    this.applyToCamera();
  }

  dispose(): void {
    this.disposed = true;
    this.killMotion();
    const el = this.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('wheel', this.onWheel);
  }

  private finishJourney(reason: JourneyEndReason): void {
    this.sampleJourney();
    this.flightFrom.position.copy(this.position);
    this.flightFrom.target.copy(this.lookAt);
    this.flightFrom.focalMm = this.focalMm;
    this.flightFrom.rollDeg = this.rollDeg;
    this.timeline?.kill();
    this.timeline = null;
    this.curves = null;
    // A completed journey ends on the home pose and a reduced-motion stop cuts, so neither needs the flight back.
    if (reason === 'complete' || this.options.reducedMotion()) {
      this.mode = 'orbit';
      this.rollDeg = 0;
    } else {
      this.mode = 'return';
      this.flight.t = 0;
      this.flightTween = gsap.to(this.flight, {
        t: 1,
        duration: RETURN_SEC,
        ease: RETURN_EASE,
        onComplete: () => {
          this.mode = 'orbit';
          this.rollDeg = 0;
          this.flightTween = null;
        },
      });
    }
    this.callbacks.onEnd?.(reason);
  }

  private sampleJourney(): void {
    if (!this.curves) return;
    const u = THREE.MathUtils.clamp(this.proxy.u, 0, 1);
    this.curves.position.getPoint(u, this.position);
    this.curves.target.getPoint(u, this.lookAt);
    this.focalMm = this.proxy.focalMm;
    this.rollDeg = this.proxy.rollDeg;
  }

  private sampleReturn(): void {
    const home = this.orbitPose();
    const t = this.flight.t;
    this.position.lerpVectors(this.flightFrom.position, home.position, t);
    this.lookAt.lerpVectors(this.flightFrom.target, home.target, t);
    this.focalMm = THREE.MathUtils.lerp(this.flightFrom.focalMm, home.focalMm, t);
    this.rollDeg = THREE.MathUtils.lerp(this.flightFrom.rollDeg, 0, t);
  }

  private orbitPose(): { position: THREE.Vector3; target: THREE.Vector3; focalMm: number } {
    const cosPitch = Math.cos(this.targetPitch);
    return {
      position: new THREE.Vector3(
        Math.sin(this.targetYaw) * cosPitch * this.targetRadius,
        Math.sin(this.targetPitch) * this.targetRadius,
        Math.cos(this.targetYaw) * cosPitch * this.targetRadius
      ),
      target: new THREE.Vector3(0, 0, 0),
      focalMm: 28,
    };
  }

  private stepOrbit(dt: number): void {
    if (!this.drag && this.options.idleOrbitAllowed() && !this.options.reducedMotion()) {
      this.targetYaw += dt * 0.045;
    }
    this.yaw = damp(this.yaw, this.targetYaw, 7, dt);
    this.pitch = damp(this.pitch, this.targetPitch, 7, dt);
    this.radius = damp(this.radius, this.targetRadius, 6, dt);
    this.focalMm = damp(this.focalMm, 28, 4, dt);
    this.rollDeg = damp(this.rollDeg, 0, 4, dt);
  }

  private writeOrbitPose(): void {
    const cosPitch = Math.cos(this.pitch);
    this.position.set(
      Math.sin(this.yaw) * cosPitch * this.radius,
      Math.sin(this.pitch) * this.radius,
      Math.cos(this.yaw) * cosPitch * this.radius
    );
    this.lookAt.set(0, 0, 0);
  }

  private applyToCamera(): void {
    const cam = this.camera;
    cam.position.copy(this.position);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.lookAt);
    if (this.rollDeg !== 0) cam.rotateZ(THREE.MathUtils.degToRad(this.rollDeg));
    const fov = focalToVerticalFovDeg(this.focalMm, cam.aspect);
    if (cam.filmGauge !== FILM_GAUGE_MM || Math.abs(cam.fov - fov) > 0.01) {
      cam.filmGauge = FILM_GAUGE_MM;
      cam.setFocalLength(this.focalMm);
    }
  }

  private killMotion(): void {
    this.timeline?.kill();
    this.timeline = null;
    this.flightTween?.kill();
    this.flightTween = null;
    this.curves = null;
    this.mode = 'orbit';
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.mode === 'journey') {
      this.stopJourney('interrupted');
      return;
    }
    if (this.mode !== 'orbit') return;
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.domElement.setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const h = Math.max(1, this.domElement.clientHeight);
    this.targetYaw -= ((event.clientX - this.drag.x) / h) * Math.PI * 1.2;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + ((event.clientY - this.drag.y) / h) * Math.PI, -1.25, 1.25);
    this.drag.x = event.clientX;
    this.drag.y = event.clientY;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.drag?.id !== event.pointerId) return;
    this.domElement.releasePointerCapture?.(event.pointerId);
    this.drag = null;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.mode !== 'orbit') return;
    event.preventDefault();
    this.targetRadius = THREE.MathUtils.clamp(this.targetRadius * Math.exp(event.deltaY * 0.0012), MIN_ORBIT_RADIUS, MAX_ORBIT_RADIUS);
  };
}
