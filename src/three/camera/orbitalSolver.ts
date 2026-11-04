import { CONTRACT_ORBITAL_SOLVER } from '../../design/systemContract';

export type SpringChannel = { value: number; velocity: number };

export type SpringConfig = {
  stiffnessK: number;
  dampingFactor: number;
  timeStep: number;
};

export const CONTRACT_SPRING: SpringConfig = {
  stiffnessK: CONTRACT_ORBITAL_SOLVER.stiffnessK,
  dampingFactor: CONTRACT_ORBITAL_SOLVER.dampingFactor,
  timeStep: CONTRACT_ORBITAL_SOLVER.timeStep,
};

/** Frames longer than this are clamped so a stalled tab cannot inject a huge impulse. */
const MAX_FRAME_SECONDS = 0.25;
const SETTLE_POSITION_EPSILON = 1e-4;
const SETTLE_VELOCITY_EPSILON = 1e-4;

export function createSpringChannel(value: number): SpringChannel {
  return { value, velocity: 0 };
}

/** One fixed step of a damped spring (semi-implicit Euler); `dampingFactor` is the damping ratio. */
export function stepSpringFixed(channel: SpringChannel, target: number, config: SpringConfig = CONTRACT_SPRING): void {
  const dt = config.timeStep;
  const dampingCoefficient = 2 * config.dampingFactor * Math.sqrt(config.stiffnessK);
  channel.velocity += (config.stiffnessK * (target - channel.value) - dampingCoefficient * channel.velocity) * dt;
  channel.value += channel.velocity * dt;
}

/**
 * Advance a set of channels by `frameSeconds` using the fixed contract timestep.
 * Returns the unused remainder so callers can carry it into the next frame.
 */
export function advanceSprings(
  channels: ReadonlyArray<{ channel: SpringChannel; target: number }>,
  frameSeconds: number,
  carrySeconds: number,
  config: SpringConfig = CONTRACT_SPRING
): number {
  let budget = Math.min(MAX_FRAME_SECONDS, Math.max(0, frameSeconds)) + carrySeconds;
  while (budget >= config.timeStep) {
    for (const { channel, target } of channels) stepSpringFixed(channel, target, config);
    budget -= config.timeStep;
  }
  for (const { channel, target } of channels) {
    if (
      Math.abs(channel.value - target) < SETTLE_POSITION_EPSILON &&
      Math.abs(channel.velocity) < SETTLE_VELOCITY_EPSILON
    ) {
      channel.value = target;
      channel.velocity = 0;
    }
  }
  return budget;
}

export type RepulsionSphere = {
  id: string;
  center: readonly [number, number, number];
  radius: number;
};

export type Vec3Like = { x: number; y: number; z: number };

export type RepulsionOptions = {
  bufferUnits: number;
  damping: number;
  /** Spheres the camera is deliberately inside of (interior dome mode). */
  exemptIds?: ReadonlySet<string>;
  /** 1 = default framing; repulsion stays active for any scale down to this floor. */
  zoomScale: number;
  zoomScaleFloor: number;
};

/**
 * Push `position` out of every non-exempt bounding sphere (+buffer). Returns true when moved.
 * `damping` scales the correction so the push-out eases instead of snapping.
 */
export function applyBoundingSphereRepulsion(
  position: Vec3Like,
  spheres: readonly RepulsionSphere[],
  options: RepulsionOptions
): boolean {
  if (!CONTRACT_ORBITAL_SOLVER.boundingSphereRepulsion.enabled) return false;
  if (options.zoomScale < options.zoomScaleFloor) return false;
  let moved = false;
  for (const sphere of spheres) {
    if (options.exemptIds?.has(sphere.id)) continue;
    const dx = position.x - sphere.center[0];
    const dy = position.y - sphere.center[1];
    const dz = position.z - sphere.center[2];
    const dist = Math.hypot(dx, dy, dz);
    const minDist = sphere.radius + options.bufferUnits;
    if (dist >= minDist) continue;
    const nx = dist > 1e-6 ? dx / dist : 0;
    const ny = dist > 1e-6 ? dy / dist : 1;
    const nz = dist > 1e-6 ? dz / dist : 0;
    const push = (minDist - dist) * options.damping;
    position.x += nx * push;
    position.y += ny * push;
    position.z += nz * push;
    moved = true;
  }
  return moved;
}

export type OrbitPose = {
  azimuth: number;
  polar: number;
  radius: number;
  targetAzimuth: number;
  targetPolar: number;
  targetRadius: number;
};

/**
 * Drives azimuth / polar / radius toward their targets with the contract spring.
 * If other code writes the pose directly (journey hand-off, snap), residual velocity is dropped
 * so the camera never lurches.
 */
export class OrbitSpringRig {
  private readonly azimuth = createSpringChannel(0);
  private readonly polar = createSpringChannel(0);
  private readonly radius = createSpringChannel(0);
  private carry = 0;
  private lastWritten: OrbitPose | null = null;

  step(pose: OrbitPose, frameSeconds: number): void {
    const last = this.lastWritten;
    const external = (a: number, b: number) => Math.abs(a - b) > 1e-6;
    if (!last || external(pose.azimuth, last.azimuth)) this.azimuth.velocity = 0;
    if (!last || external(pose.polar, last.polar)) this.polar.velocity = 0;
    if (!last || external(pose.radius, last.radius)) this.radius.velocity = 0;
    this.azimuth.value = pose.azimuth;
    this.polar.value = pose.polar;
    this.radius.value = pose.radius;
    this.carry = advanceSprings(
      [
        { channel: this.azimuth, target: pose.targetAzimuth },
        { channel: this.polar, target: pose.targetPolar },
        { channel: this.radius, target: pose.targetRadius },
      ],
      frameSeconds,
      this.carry
    );
    pose.azimuth = this.azimuth.value;
    pose.polar = this.polar.value;
    pose.radius = this.radius.value;
    this.lastWritten = {
      azimuth: pose.azimuth,
      polar: pose.polar,
      radius: pose.radius,
      targetAzimuth: pose.targetAzimuth,
      targetPolar: pose.targetPolar,
      targetRadius: pose.targetRadius,
    };
  }
}
