import gsap from 'gsap';
import * as THREE from 'three';
import { resolveRamp } from './beatLayout';
import type { BeatCameraKeyframe, SpeedRamp, Vec3Tuple } from './beatTypes';

/**
 * One continuous camera path through every beat. Position and look-at target are each a single
 * centripetal Catmull-Rom curve through the stops, so the flight never kinks at a beat. One GSAP timeline
 * drives a single scalar along both curves; each segment brings its own ease (the speed ramp) and a hold.
 */

export interface JourneyPoseSpec {
  position: Vec3Tuple;
  target: Vec3Tuple;
  focalMm: number;
  rollDeg: number;
}

export interface JourneyStop extends JourneyPoseSpec {
  /** Null for the start and exit stops. */
  beatIndex: number | null;
  ramp: SpeedRamp;
}

export const EXIT_RAMP: SpeedRamp = { ease: 'power3.inOut', travelSec: 3.2, holdSec: 0 };

/** Fraction of a segment that has elapsed when its beat is announced, so reveals start on approach. */
export const ENTER_AT = 0.7;

export function buildJourneyStops(
  home: JourneyPoseSpec,
  keyframes: readonly BeatCameraKeyframe[],
  ramps: { exit?: Partial<SpeedRamp> } = {}
): JourneyStop[] {
  const exit = resolveRamp(EXIT_RAMP, ramps.exit);
  const stops: JourneyStop[] = [{ ...home, beatIndex: null, ramp: { ease: 'none', travelSec: 0, holdSec: 0 } }];
  keyframes.forEach((kf, index) => {
    stops.push({
      position: kf.position,
      target: kf.target,
      focalMm: kf.focalMm,
      rollDeg: kf.rollDeg,
      beatIndex: index,
      ramp: kf.ramp,
    });
  });
  stops.push({ ...home, beatIndex: null, ramp: exit });
  return stops;
}

export function journeyDurationSec(stops: readonly JourneyStop[]): number {
  return stops.slice(1).reduce((sum, stop) => sum + stop.ramp.travelSec + stop.ramp.holdSec, 0);
}

export interface JourneyCurves {
  position: THREE.CatmullRomCurve3;
  target: THREE.CatmullRomCurve3;
}

export function buildJourneyCurves(stops: readonly JourneyStop[]): JourneyCurves {
  const toVectors = (pick: (stop: JourneyStop) => Vec3Tuple): THREE.Vector3[] =>
    stops.map((stop) => new THREE.Vector3(...pick(stop)));
  return {
    position: new THREE.CatmullRomCurve3(toVectors((s) => s.position), false, 'centripetal'),
    target: new THREE.CatmullRomCurve3(toVectors((s) => s.target), false, 'centripetal'),
  };
}

export interface JourneyProxy {
  /** 0..1 along both curves. */
  u: number;
  focalMm: number;
  rollDeg: number;
}

export interface JourneyHooks {
  onEnter: (beatIndex: number) => void;
  onComplete: () => void;
}

export function buildJourneyTimeline(
  stops: readonly JourneyStop[],
  proxy: JourneyProxy,
  hooks: JourneyHooks,
  options: { reducedMotion: boolean; paused?: boolean }
): gsap.core.Timeline {
  const last = stops.length - 1;
  const tl = gsap.timeline({ paused: options.paused ?? false, onComplete: hooks.onComplete });
  proxy.u = 0;
  proxy.focalMm = stops[0].focalMm;
  proxy.rollDeg = stops[0].rollDeg;

  for (let i = 1; i <= last; i += 1) {
    const stop = stops[i];
    const { travelSec, holdSec, ease } = stop.ramp;
    const start = tl.duration();
    const values = { u: i / last, focalMm: stop.focalMm, rollDeg: stop.rollDeg };
    if (options.reducedMotion) {
      // Cut straight to the beat: no flight, the caller dissolves the view instead.
      tl.set(proxy, values, start);
    } else if (travelSec > 0) {
      tl.to(proxy, { ...values, duration: travelSec, ease }, start);
    } else {
      tl.set(proxy, values, start);
    }
    if (stop.beatIndex !== null) {
      const beatIndex = stop.beatIndex;
      const at = options.reducedMotion ? start : start + travelSec * ENTER_AT;
      tl.call(() => hooks.onEnter(beatIndex), undefined, at);
    }
    const flight = options.reducedMotion ? 0 : travelSec;
    // Padding keeps the timeline length equal to the sum of travel and hold even for zero-length tweens.
    tl.to({}, { duration: holdSec }, start + flight);
  }
  return tl;
}
