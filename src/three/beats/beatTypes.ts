import type * as THREE from 'three';
import type { MediaPlaybackManager } from '../mediaPlayback';

/**
 * Contracts for the 25-beat walkthrough. Nothing here carries copy, media or numbers: content arrives
 * through `BeatContentProvider`, and the way each slot is drawn arrives through `BeatSlotFactories`.
 */

export const BEAT_COUNT = 25;

export type Vec3Tuple = readonly [number, number, number];

/** Named speed ramps for the per-segment ease. Any GSAP ease string or `(t) => t` function also works. */
export const SPEED_RAMPS = {
  cruise: 'none',
  glide: 'sine.inOut',
  ease: 'power2.inOut',
  launch: 'power3.in',
  brake: 'power3.out',
  whip: 'expo.inOut',
} as const;

export type SpeedRampName = keyof typeof SPEED_RAMPS;

export interface SpeedRamp {
  ease: string | ((progress: number) => number);
  /** Flight time from the previous stop to this beat, seconds. */
  travelSec: number;
  /** Time the camera rests on this beat before departing, seconds. */
  holdSec: number;
}

export interface BeatCameraKeyframe {
  position: Vec3Tuple;
  target: Vec3Tuple;
  /** 35mm-equivalent focal length. */
  focalMm: number;
  rollDeg: number;
  ramp: SpeedRamp;
}

export interface BeatTextContent {
  /** One entry per animated word; whitespace is added between them. */
  words: readonly string[];
  fontSize?: number;
  colorHex?: string;
  /** Delay between consecutive words, seconds. */
  staggerSec?: number;
  /** Extra pause after a word that ends a sentence, seconds. */
  sentencePauseSec?: number;
}

export type BeatMediaKind = 'image' | 'video' | 'title';

export interface BeatMediaContent {
  kind: BeatMediaKind;
  /** Approved asset URL. Required for `image` and `video`. */
  url?: string;
  /** Text for a `title` node. */
  title?: string;
  /** Small status line under the title, e.g. "Playback pending". */
  caption?: string;
  /** Width / height. Defaults to 16:9. */
  aspect?: number;
  accentHex?: string;
}

export interface BeatMetricContent {
  /** A number counts up on reveal; a string is shown as given. */
  value: number | string;
  label: string;
  unit?: string;
  decimals?: number;
  accentHex?: string;
}

export interface BeatContent {
  /** Stable editorial id shown in the caption, e.g. "J17". */
  label?: string;
  title?: string;
  /** Second caption line, e.g. the environment and timeline slot. */
  supportLine?: string;
  /** Shown under the caption when the beat cannot show real evidence. */
  honestNote?: string;
  text?: BeatTextContent | null;
  media?: BeatMediaContent | null;
  metric?: BeatMetricContent | null;
  camera?: Partial<Omit<BeatCameraKeyframe, 'ramp'>> & { ramp?: Partial<SpeedRamp> };
}

/** Called once per beat index [0..24]. Return null for a beat that has no content yet. */
export type BeatContentProvider = (index: number) => BeatContent | null | undefined;

export interface BeatSlotContext {
  index: number;
  count: number;
  playback: MediaPlaybackManager;
}

export interface BeatSlot<C> {
  readonly object: THREE.Object3D;
  /** Replace the content; null or undefined empties the slot. */
  apply(content: C | null | undefined): void;
  /** 0 hidden, 1 fully shown. The container animates this on activation. */
  setReveal(reveal: number): void;
  setActive?(active: boolean): void;
  /** Preferred reveal length, seconds. The container falls back to its default when absent. */
  revealSec?(): number;
  update?(dtSec: number, timeSec: number): void;
  dispose(): void;
}

/** The numbered ring that stays visible whether or not a beat's content is shown. */
export interface BeatMarkerSlot {
  readonly object: THREE.Object3D;
  /** 0 resting, 1 this beat is the current one. */
  setActivity(activity: number): void;
  dispose(): void;
}

export interface BeatSlotFactories {
  createText(ctx: BeatSlotContext): BeatSlot<BeatTextContent>;
  createMedia(ctx: BeatSlotContext): BeatSlot<BeatMediaContent>;
  createMetric(ctx: BeatSlotContext): BeatSlot<BeatMetricContent>;
  createMarker(ctx: BeatSlotContext): BeatMarkerSlot;
}

export interface BeatPlacement {
  index: number;
  angleRad: number;
  anchor: Vec3Tuple;
  /** Rotation about Y that turns the anchor's +Z face toward the beat's camera stop. */
  yawRad: number;
  cameraPosition: Vec3Tuple;
  cameraTarget: Vec3Tuple;
}
