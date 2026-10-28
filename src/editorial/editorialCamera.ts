import gsap from 'gsap';
import {
  EDITORIAL_CAMERA_PRESETS,
  type EditorialCameraPose,
  type EditorialCameraPresetId,
  poseFromPreset,
} from '../design/editorialMonograph';

const SCRATCH_POSE: EditorialCameraPose = poseFromPreset('01_INIT');

export function createEditorialPoseState(
  initial: EditorialCameraPresetId = '01_INIT'
): EditorialCameraPose {
  return { ...poseFromPreset(initial) };
}

/**
 * Concurrently tweens camera position + lookAt target + FOV (avoids lookAt snap).
 * Mutates `pose` in place so React can read the same object each frame via rAF.
 */
export function tweenEditorialPose(
  pose: EditorialCameraPose,
  to: EditorialCameraPresetId,
  options: {
    duration?: number;
    reducedMotion?: boolean;
    onUpdate?: () => void;
  } = {}
): gsap.core.Tween {
  const target = poseFromPreset(to);
  const duration = options.reducedMotion ? 0.01 : (options.duration ?? 1.65);
  return gsap.to(pose, {
    x: target.x,
    y: target.y,
    z: target.z,
    tx: target.tx,
    ty: target.ty,
    tz: target.tz,
    fov: target.fov,
    duration,
    ease: 'power3.inOut',
    overwrite: 'auto',
    onUpdate: options.onUpdate,
  });
}

export function applyPointerParallax(
  pose: EditorialCameraPose,
  base: EditorialCameraPose,
  pointer: { x: number; y: number },
  amount = 0.35
): void {
  // pointer in [-1,1]; clamp margins already applied by caller
  pose.x = base.x + pointer.x * amount;
  pose.y = base.y + pointer.y * amount * 0.55;
  pose.z = base.z;
  pose.tx = base.tx + pointer.x * amount * 0.15;
  pose.ty = base.ty - pointer.y * amount * 0.1;
  pose.tz = base.tz;
  pose.fov = base.fov;
  Object.assign(SCRATCH_POSE, pose);
}

export function describePreset(id: EditorialCameraPresetId): string {
  const p = EDITORIAL_CAMERA_PRESETS[id];
  return `${p.id} · ${p.designator} · ${p.fov}°`;
}
