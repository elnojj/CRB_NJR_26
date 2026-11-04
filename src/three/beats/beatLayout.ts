import { BASE_SHELL_RADIUS } from '../geometryRegistry';
import {
  BEAT_COUNT,
  type BeatCameraKeyframe,
  type BeatContent,
  type BeatPlacement,
  type SpeedRamp,
  SPEED_RAMPS,
  type Vec3Tuple,
} from './beatTypes';

export const SPHERE1_SHELL_RADIUS = BASE_SHELL_RADIUS;

export interface BeatLayoutOptions {
  count: number;
  shellRadius: number;
  /** Where the beat panels sit, as a fraction of the shell radius. */
  anchorRadiusFactor: number;
  /** How far in front of a beat its camera stop is, in world units. */
  standoff: number;
  /** Full turns the spiral makes between the first and last beat. */
  turns: number;
  /** Half the vertical extent of the spiral, as a fraction of the shell radius. */
  ySpanFactor: number;
}

export const DEFAULT_BEAT_LAYOUT: BeatLayoutOptions = {
  count: BEAT_COUNT,
  shellRadius: SPHERE1_SHELL_RADIUS,
  anchorRadiusFactor: 0.62,
  standoff: 3.5,
  turns: 2.5,
  ySpanFactor: 0.5,
};

export const DEFAULT_BEAT_RAMP: SpeedRamp = { ease: SPEED_RAMPS.ease, travelSec: 3.4, holdSec: 2.6 };
/** The first beat is reached from the outside orbit, so its flight is longer and eases in and out harder. */
export const DEFAULT_FIRST_BEAT_RAMP: SpeedRamp = { ease: SPEED_RAMPS.ease, travelSec: 4.6, holdSec: 2.6 };
export const DEFAULT_BEAT_FOCAL_MM = 26;

/**
 * Beats climb a spiral inside the shell, bottom to top. Each beat's camera stop sits on the inner side of
 * its anchor, so one continuous curve through the stops reads as a single flight up the sphere.
 */
export function computeBeatPlacements(options: Partial<BeatLayoutOptions> = {}): BeatPlacement[] {
  const o = { ...DEFAULT_BEAT_LAYOUT, ...options };
  const radius = o.shellRadius * o.anchorRadiusFactor;
  const ySpan = o.shellRadius * o.ySpanFactor;
  return Array.from({ length: o.count }, (_, index) => {
    const t = o.count > 1 ? index / (o.count - 1) : 0;
    const angleRad = t * o.turns * Math.PI * 2;
    const sin = Math.sin(angleRad);
    const cos = Math.cos(angleRad);
    const y = (t - 0.5) * 2 * ySpan;
    const anchor: Vec3Tuple = [radius * sin, y, radius * cos];
    const cameraPosition: Vec3Tuple = [anchor[0] - sin * o.standoff, y, anchor[2] - cos * o.standoff];
    return {
      index,
      angleRad,
      anchor,
      yawRad: Math.atan2(-sin, -cos),
      cameraPosition,
      cameraTarget: anchor,
    };
  });
}

export function resolveRamp(base: SpeedRamp, override?: Partial<SpeedRamp>): SpeedRamp {
  return {
    ease: override?.ease ?? base.ease,
    travelSec: Math.max(0, override?.travelSec ?? base.travelSec),
    holdSec: Math.max(0, override?.holdSec ?? base.holdSec),
  };
}

/** Default keyframes with any per-beat camera override from the content provider laid on top. */
export function buildBeatKeyframes(
  placements: readonly BeatPlacement[],
  contents: ReadonlyArray<BeatContent | null | undefined> = []
): BeatCameraKeyframe[] {
  return placements.map((placement) => {
    const override = contents[placement.index]?.camera;
    return {
      position: override?.position ?? placement.cameraPosition,
      target: override?.target ?? placement.cameraTarget,
      focalMm: override?.focalMm ?? DEFAULT_BEAT_FOCAL_MM,
      rollDeg: override?.rollDeg ?? 0,
      ramp: resolveRamp(placement.index === 0 ? DEFAULT_FIRST_BEAT_RAMP : DEFAULT_BEAT_RAMP, override?.ramp),
    };
  });
}

export interface WordBox {
  width: number;
}

export interface WordSlot {
  x: number;
  y: number;
  line: number;
}

/**
 * Wrap measured words into centred lines. Positions are the left edge of each word, with y measured
 * downward from the block's first line (y = 0) as negative numbers.
 */
export function layoutWords(
  words: readonly WordBox[],
  options: { maxWidth: number; gap: number; lineHeight: number }
): WordSlot[] {
  const lines: Array<{ items: number[]; width: number }> = [];
  let current = { items: [] as number[], width: 0 };
  words.forEach((word, i) => {
    const next = current.items.length === 0 ? word.width : current.width + options.gap + word.width;
    if (current.items.length > 0 && next > options.maxWidth) {
      lines.push(current);
      current = { items: [i], width: word.width };
    } else {
      current.items.push(i);
      current.width = next;
    }
  });
  if (current.items.length > 0) lines.push(current);

  const slots: WordSlot[] = new Array(words.length);
  lines.forEach((line, lineIndex) => {
    let x = -line.width / 2;
    for (const i of line.items) {
      slots[i] = { x, y: -lineIndex * options.lineHeight, line: lineIndex };
      x += words[i].width + options.gap;
    }
  });
  return slots;
}

/** Staggered 0..1 progress for word `index` of `count`, given the block's overall reveal 0..1. */
export function wordReveal(reveal: number, index: number, count: number, overlap = 2.2): number {
  if (count <= 0) return 0;
  const span = count - 1 + overlap;
  const local = (reveal * span - index) / overlap;
  return Math.min(1, Math.max(0, local));
}
