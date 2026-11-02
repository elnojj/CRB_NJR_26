/**
 * Optional 60-second explainer edition (R06).
 * Does not mutate or shorten the 180-second intro timeline.
 */
import type { ConnectedSphereId } from '../three/sphereNetwork';

export const EXPLAINER_60_META = {
  durationSeconds: 60,
  fps: 60,
  totalFrames: 3600,
  beatCount: 15,
  framesPerBeat: 240,
} as const;

export type ExplainerEdition = 'intro-180' | 'explainer-60' | 'default' | 'none';

export type Explainer60Beat = {
  frames: [number, number];
  focus: string;
  copyEn: string;
  copyAr: string;
  mediaId?: string;
  assetGate?: 'PROPOSED';
};

export type Explainer60Config = {
  schema: string;
  meta: typeof EXPLAINER_60_META & { title: string };
  beats: Explainer60Beat[];
  cameraKeys: Array<{
    frame: number;
    position: [number, number, number];
    target: [number, number, number];
    focalMm: number;
  }>;
};

let cached: Explainer60Config | null = null;

export async function loadExplainer60(): Promise<Explainer60Config> {
  if (cached) return cached;
  const res = await fetch('/cerebro.explainer60.json');
  if (!res.ok) {
    throw new Error(`explainer60 unavailable: HTTP ${res.status}`);
  }
  const json = (await res.json()) as Explainer60Config & {
    meta: { durationSeconds: number; timelineFps: number; totalFrames: number };
  };
  if (json.meta.durationSeconds !== 60 || json.meta.totalFrames !== 3600) {
    throw new Error('explainer60 contract mismatch');
  }
  cached = json;
  return json;
}

export function beatAtFrame(config: Explainer60Config, frame: number): Explainer60Beat | null {
  const f = Math.max(0, Math.min(3599, Math.floor(frame)));
  return config.beats.find((b) => f >= b.frames[0] && f < b.frames[1]) ?? null;
}

export function sampleExplainer60Pose(
  config: Explainer60Config,
  timeSec: number
): {
  position: [number, number, number];
  target: [number, number, number];
  focalMm: number;
  frame: number;
  beat: Explainer60Beat | null;
} {
  const frame = Math.max(0, Math.min(3599, Math.floor(timeSec * 60)));
  const keys = config.cameraKeys;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].frame <= frame) i += 1;
  const a = keys[i];
  const b = keys[Math.min(keys.length - 1, i + 1)];
  const span = Math.max(1, b.frame - a.frame);
  const u = a === b ? 0 : (frame - a.frame) / span;
  const lerp3 = (
    p: [number, number, number],
    q: [number, number, number],
    t: number
  ): [number, number, number] => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
  ];
  return {
    position: lerp3(a.position, b.position, u),
    target: lerp3(a.target, b.target, u),
    focalMm: a.focalMm + (b.focalMm - a.focalMm) * u,
    frame,
    beat: beatAtFrame(config, frame),
  };
}

export function resolveEditionFromSearch(search: string): ExplainerEdition {
  const params = new URLSearchParams(search);
  if (params.get('explainer') === '60' || params.get('edition') === '60') return 'explainer-60';
  if (params.get('intro') === '0' || params.get('movie') === '0') return 'none';
  if (params.get('intro') === '1' || params.get('edition') === '180') return 'intro-180';
  if (params.get('view') === 'hq' || params.get('view') === 'cde') return 'explainer-60';
  return 'default';
}

export function sphereHintForBeatFocus(focus: string): ConnectedSphereId {
  const f = focus.toLowerCase();
  if (f.includes('cde')) return 'cde';
  if (f.includes('campaign')) return 'campaign-os';
  if (f.includes('about')) return 'about-us';
  return 'hq';
}
