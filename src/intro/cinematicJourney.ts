/**
 * 72-second continuous cinematic journey — Frame 0000 → 01:12.
 * Camera keys are a time-compressed Hermite path of the wide master-sphere reveal.
 */

import type { EditorialCameraPose } from '../design/editorialMonograph';
import { focalLengthToVFov } from '../components/CosmographCanvas';

export const JOURNEY_DURATION_SECONDS = 72;
export const JOURNEY_FPS = 60;
export const JOURNEY_TOTAL_FRAMES = JOURNEY_DURATION_SECONDS * JOURNEY_FPS;
export const OPENING_HEADLINE = 'WHAT HOLDS WORK TOGETHER?';
export const MASTER_MIX_SRC = 'assets/audio/cerebro-master-mix.m4a';

export type JourneyCameraKey = {
  frame: number;
  position: [number, number, number];
  target: [number, number, number];
  focalMm: number;
};

/** Compressed wide-sphere reveal through operational HQ arrival (0 → 72s @ 60fps). */
export const JOURNEY_CAMERA_KEYS: JourneyCameraKey[] = [
  { frame: 0, position: [4, 1.6, 28], target: [-4, 0, 0], focalMm: 35 },
  { frame: 480, position: [1, 1.8, 24], target: [-4, 0, 0], focalMm: 35 },
  { frame: 960, position: [5, 2.4, 21], target: [-2, 0, 0], focalMm: 35 },
  { frame: 1440, position: [8, 2.1, 20], target: [-1, 0, 0], focalMm: 35 },
  { frame: 1920, position: [10, 1.8, 19], target: [0, 0, 0], focalMm: 32 },
  { frame: 2400, position: [10, 1.2, 20], target: [-1, 0, 0], focalMm: 32 },
  { frame: 2880, position: [9, 1.6, 22], target: [-2, 0, 0], focalMm: 30 },
  { frame: 3360, position: [12, 2.8, 16], target: [2, 0.4, -2], focalMm: 28 },
  { frame: 3840, position: [14, 3.6, 12], target: [4, 0.6, -4], focalMm: 28 },
  { frame: 4320, position: [10, 2.4, 18], target: [0, 0, 0], focalMm: 35 },
];

export type JourneyChapter = {
  startSec: number;
  endSec: number;
  headline: string;
};

export const JOURNEY_CHAPTERS: JourneyChapter[] = [
  { startSec: 0, endSec: 12, headline: OPENING_HEADLINE },
  { startSec: 12, endSec: 28, headline: 'THE WORK. CONNECTED.' },
  { startSec: 28, endSec: 48, headline: 'EVERY THREAD HAS A PLACE.' },
  { startSec: 48, endSec: 72, headline: 'ENTER THE OPERATIONAL FIELD.' },
];

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

function hermite(keys: JourneyCameraKey[], tSec: number, key: 'position' | 'target' | 'focalMm') {
  const f = tSec * JOURNEY_FPS;
  let i = keys.findIndex((_x, j) => j < keys.length - 1 && f <= keys[j + 1].frame);
  if (i < 0) i = keys.length - 2;
  const a = keys[i];
  const b = keys[i + 1];
  const dt = (b.frame - a.frame) / JOURNEY_FPS;
  const u = clamp((f - a.frame) / (b.frame - a.frame));
  const vec = Array.isArray(a[key]);
  const av = vec ? (a[key] as number[]) : [a[key] as number];
  const bv = vec ? (b[key] as number[]) : [b[key] as number];
  const val = av.map((x, k) => {
    const prev = keys[Math.max(0, i - 1)];
    const next = keys[Math.min(keys.length - 1, i + 2)];
    const pv = Array.isArray(prev[key]) ? (prev[key] as number[])[k] : (prev[key] as number);
    const nv = Array.isArray(next[key]) ? (next[key] as number[])[k] : (next[key] as number);
    const m0 = i === 0 ? 0 : (bv[k] - pv) / ((b.frame - prev.frame) / JOURNEY_FPS);
    const m1 = i + 1 === keys.length - 1 ? 0 : (nv - x) / ((next.frame - a.frame) / JOURNEY_FPS);
    return (
      (2 * u * u * u - 3 * u * u + 1) * x +
      (u * u * u - 2 * u * u + u) * dt * m0 +
      (-2 * u * u * u + 3 * u * u) * bv[k] +
      (u * u * u - u * u) * dt * m1
    );
  });
  return vec ? (val as [number, number, number]) : val[0];
}

export function sampleJourneyPose(tSec: number): EditorialCameraPose & {
  frame: number;
  focalMm: number;
  headline: string;
} {
  const t = clamp(tSec, 0, JOURNEY_DURATION_SECONDS);
  const position = hermite(JOURNEY_CAMERA_KEYS, t, 'position') as [number, number, number];
  const target = hermite(JOURNEY_CAMERA_KEYS, t, 'target') as [number, number, number];
  const focalMm = hermite(JOURNEY_CAMERA_KEYS, t, 'focalMm') as number;
  const chapter =
    JOURNEY_CHAPTERS.find((c) => t >= c.startSec && t < c.endSec) ??
    JOURNEY_CHAPTERS[JOURNEY_CHAPTERS.length - 1];
  return {
    x: position[0],
    y: position[1],
    z: position[2],
    tx: target[0],
    ty: target[1],
    tz: target[2],
    fov: focalLengthToVFov(focalMm),
    frame: Math.round(t * JOURNEY_FPS),
    focalMm,
    headline: chapter.headline,
  };
}

export function resolveMasterMixUrl(baseUrl = import.meta.env.BASE_URL || '/'): string {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${root}${MASTER_MIX_SRC}`;
}
