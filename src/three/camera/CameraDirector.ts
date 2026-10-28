/**
 * Blueprint v2.0 CameraDirector — single owner of camera travel semantics.
 * Emits CameraCommandPayload verbs consumed by CosmographCanvas.
 * Does not teleport: travel always begins from the current pose snapshot.
 */

import * as THREE from 'three';
import type { CameraCommandPayload } from '../../components/CosmographCanvas';
import { GUI_CAMERA_PRESETS, type GuiCameraPresetId } from '../../gui/cameraPresets';

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
