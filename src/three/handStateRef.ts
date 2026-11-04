
/**
 * Mutable hand state shared between the MediaPipe tracker (writer), the 3D glove,
 * the spatial controls and the camera state machine (readers). Nothing here is React state:
 * the render loop reads `handStateRef.current` every frame, so tracking never triggers a re-render.
 *
 * Landmark space is camera-local metres at the glove plane: +x right, +y up, -z away from the lens.
 * Wrist position tracks where the hand is in the frustum; finger offsets are scaled to a real hand size
 * so a pinch distance of 0.035 means about 3.5 cm.
 */

export type HandDetectionMode = 'two-hands' | 'left-only' | 'right-only';

export const MAX_HANDS = 2;
export const LANDMARK_COUNT = 21;
export const GLOVE_PLANE_Z = -1.2;
export const PINCH_THRESHOLD = 0.035;
export const PINCH_RELEASE = 0.05;

export interface HandSlot {
  present: boolean;
  /** 21 smoothed landmarks, xyz interleaved, camera-local metres. */
  landmarks: Float32Array;
  /** Unit palm normal (pointing out of the palm toward the lens when palm faces camera). */
  palmNormal: [number, number, number];
  /** Wrist-to-middle-knuckle roll about the view axis, radians (clockwise positive). */
  wristRoll: number;
  /** Thumb tip to index tip distance in glove metres. */
  pinchDistance: number;
  pinching: boolean;
  /** Palm centre velocity in glove metres per second. */
  velocity: [number, number, number];
  /** Detector handedness score 0..1 for this hand; 1 when the runtime does not report one. */
  confidence: number;
}

export interface HandState {
  active: boolean;
  tracking: boolean;
  /** Bumped on every detection so consumers can tell fresh data from stale. */
  frameId: number;
  updatedAtMs: number;
  hands: HandSlot[];
}

function createSlot(): HandSlot {
  return {
    present: false,
    landmarks: new Float32Array(LANDMARK_COUNT * 3),
    palmNormal: [0, 0, 1],
    wristRoll: 0,
    pinchDistance: 1,
    pinching: false,
    velocity: [0, 0, 0],
    confidence: 1,
  };
}

export function createHandState(): HandState {
  return {
    active: false,
    tracking: false,
    frameId: 0,
    updatedAtMs: 0,
    hands: Array.from({ length: MAX_HANDS }, createSlot),
  };
}

export const handStateRef: { current: HandState } = { current: createHandState() };

export function resetHandState(): void {
  const s = handStateRef.current;
  s.active = false;
  s.tracking = false;
  s.frameId += 1;
  for (const hand of s.hands) {
    hand.present = false;
    hand.pinching = false;
    hand.pinchDistance = 1;
    hand.velocity = [0, 0, 0];
  }
}

/** A hand has been seen within the last 250 ms. */
export function handIsFresh(nowMs: number): boolean {
  const s = handStateRef.current;
  return s.tracking && nowMs - s.updatedAtMs <= 250;
}
