/**
 * Tour Step Coordinator — state-driven pacing for camera → card → speech → cushion.
 * Keeps narration calm and prevents auto-advance while Cerebro is still speaking.
 */

import type { TourScreenStepSpec } from '../utils/cerebroTourAndCtaStore';

export const TOUR_PACE = {
  /** Camera glide settle (ms) before UI focus */
  cameraSettleMs: 1800,
  /** Brief eye-orient pause after card reveal */
  orientPauseMs: 400,
  /** Extra reading cushion after speech / before next step */
  readingCushionMs: 2000,
  /** Minimum dwell even if durationSec is short */
  minStepDwellSec: 14,
  /** Scale choreography durations for calmer tours */
  durationScale: 1.45,
  /** Hold countdown while agent is speaking / thinking */
  holdWhileSpeaking: true,
  /** Browser / local TTS rate (calm) */
  ttsRate: 0.9,
  /** ElevenLabs voice stability / similarity for measured delivery */
  stability: 0.7,
  similarityBoost: 0.65,
  /** Inserted pause between sentences for paced TTS */
  sentenceBreakMs: 750,
} as const;

export type TourSpeechGate =
  | 'Ready'
  | 'Connecting'
  | 'Listening'
  | 'Thinking'
  | 'Speaking'
  | 'Muted'
  | 'Reconnecting'
  | 'Disconnected'
  | 'Error'
  | 'Idle';

export function isTourSpeechBlocking(voiceState: TourSpeechGate): boolean {
  return voiceState === 'Speaking' || voiceState === 'Thinking';
}

export function pacedStepDurationSec(step: TourScreenStepSpec): number {
  const scaled = Math.ceil(step.durationSec * TOUR_PACE.durationScale);
  return Math.max(TOUR_PACE.minStepDwellSec, scaled);
}

export interface ProgressiveCaption {
  headline: string;
  bullets: string[];
  full: string;
  truncated: boolean;
}

/** Cap tour card copy to 1 headline + max 2 short lines. */
export function progressiveCaption(
  raw: string,
  maxBullets = 2,
  maxBulletChars = 110
): ProgressiveCaption {
  const full = (raw || '').replace(/\s+/g, ' ').trim();
  if (!full) {
    return { headline: '', bullets: [], full: '', truncated: false };
  }

  const parts = full
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const headline = (parts[0] || full).slice(0, 96);
  const rest = parts.slice(1);
  const bullets = rest.slice(0, maxBullets).map((b) =>
    b.length > maxBulletChars ? `${b.slice(0, maxBulletChars - 1)}…` : b
  );
  const truncated = rest.length > maxBullets || full.length > headline.length + 40;

  return { headline, bullets, full, truncated };
}

/** Insert SSML-style breaks between sentences for ElevenLabs / TTS. */
export function calmSpeechScript(text: string, breakMs = TOUR_PACE.sentenceBreakMs): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const breakTag = `<break time="${breakMs}ms" />`;
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(` ${breakTag} `);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Run one coordinated tour beat after camera has been dispatched.
 * Callers still own camera/panel mutations; this only enforces calm timing.
 */
export async function runTourStepCushion(options: {
  reducedMotion?: boolean;
  voiceState: TourSpeechGate;
  waitUntilQuiet: () => Promise<void>;
}): Promise<void> {
  const orient = options.reducedMotion ? 0 : TOUR_PACE.orientPauseMs;
  if (orient > 0) await sleep(orient);
  if (TOUR_PACE.holdWhileSpeaking && isTourSpeechBlocking(options.voiceState)) {
    await options.waitUntilQuiet();
  }
  const cushion = options.reducedMotion
    ? Math.min(600, TOUR_PACE.readingCushionMs)
    : TOUR_PACE.readingCushionMs;
  await sleep(cushion);
}
