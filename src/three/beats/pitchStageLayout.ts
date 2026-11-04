import { ENVIRONMENTS, getNode, type EnvironmentId } from '../../data/environmentRegistry';
import { PITCH_FILM_GAUGE_MM, type PitchBeat } from '../../data/pitchBeats';
import { sphereCenterVec } from '../sphereNetwork';
import type { Vec3Tuple } from './beatTypes';

/** Reference stand-off at which the stage content frames comfortably; other lenses move to keep that framing. */
const STANDOFF_PER_MM = 0.135;
const MAX_CONTENT_SCALE = 3.4;

/** `env_about__people__shweekar` -> registry association id `about__people__shweekar`. */
export function pitchTargetToAssociation(envId: EnvironmentId, targetId: string): string {
  const prefix = `${envId}__`;
  const rest = targetId.startsWith(prefix) ? targetId.slice(prefix.length) : targetId;
  return `${ENVIRONMENTS[envId].key}__${rest}`;
}

export interface PitchPlacement {
  jId: string;
  /** Where the beat's content stands, in world space. */
  anchor: Vec3Tuple;
  /** Where the camera rests for the beat, in world space. */
  cameraPosition: Vec3Tuple;
  /** Rotation about Y that turns the content's front toward the camera. */
  yawRad: number;
  standoff: number;
  /** Content grows only when an anchor overrides the lens-derived distance, so wide shots stay legible. */
  contentScale: number;
}

export const pitchStandoff = (focalMm: number): number => STANDOFF_PER_MM * focalMm;

/** Resolve a beat to world space through the registry. Returns null when the target or its anchor is missing. */
export function resolvePitchPlacement(beat: PitchBeat): PitchPlacement | null {
  const node = getNode(pitchTargetToAssociation(beat.envId, beat.targetId));
  if (!node || !node.anchor || node.envId !== beat.envId) return null;
  const center = sphereCenterVec(ENVIRONMENTS[beat.envId].sphereId);
  const anchor: Vec3Tuple = [
    center.x + node.anchor.position[0],
    center.y + node.anchor.position[1],
    center.z + node.anchor.position[2],
  ];
  const yaw = (node.anchor.approachYawDeg * Math.PI) / 180;
  const standoff = node.anchor.standoffOverride ?? pitchStandoff(beat.camera.focalMm);
  const cameraPosition: Vec3Tuple = [
    anchor[0] + Math.sin(yaw) * standoff,
    anchor[1] + standoff * 0.12,
    anchor[2] + Math.cos(yaw) * standoff,
  ];
  return {
    jId: beat.jId,
    anchor,
    cameraPosition,
    yawRad: Math.atan2(cameraPosition[0] - anchor[0], cameraPosition[2] - anchor[2]),
    standoff,
    contentScale: Math.min(MAX_CONTENT_SCALE, Math.max(1, standoff / pitchStandoff(beat.camera.focalMm))),
  };
}

/** Vertical FOV for a lens on the 36 mm gauge, the same relation `PerspectiveCamera.setFocalLength` uses. */
export function pitchVerticalFovDeg(focalMm: number, aspect: number): number {
  return (2 * Math.atan((0.5 * PITCH_FILM_GAUGE_MM) / Math.max(aspect, 1) / Math.max(1, focalMm)) * 180) / Math.PI;
}

/** The focal length that gives the same vertical FOV on the app's 24 mm sensor-height model. */
export function equivalentLegacyFocalMm(focalMm: number, aspect: number): number {
  const fov = (pitchVerticalFovDeg(focalMm, aspect) * Math.PI) / 180;
  return 12 / Math.tan(fov / 2);
}
