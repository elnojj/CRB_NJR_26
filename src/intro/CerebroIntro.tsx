import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorialCameraPose } from '../design/editorialMonograph';
import { soundEngine } from '../utils/soundEngine';
import { assertIntroBridgeClean, spawnIntroBackgroundMedia } from './bridge';
import {
  JOURNEY_DURATION_SECONDS,
  OPENING_HEADLINE,
  resolveMasterMixUrl,
  sampleJourneyPose,
} from './cinematicJourney';

export interface CerebroIntroProps {
  /** When false (default), reuse the app's shared ExperienceCanvas — never create a second WebGL root. */
  embedCanvas?: boolean;
  reducedMotion: boolean;
  initialPhase?: 'keypad' | 'loader';
  journeyActive: boolean;
  onJourneyPose: (pose: EditorialCameraPose | null) => void;
  onJourneyStart: () => void;
  onComplete: () => void;
}

/**
 * Opening gate + 72s cinematic journey overlay on the continuous 3D canvas.
 * Holds Frame 0000 until ENTER CEREBRO; then unlocks audio and drives the timeline.
 */
export const CerebroIntro: React.FC<CerebroIntroProps> = ({
  embedCanvas = false,
  reducedMotion,
  journeyActive,
  onJourneyPose,
  onJourneyStart,
  onComplete,
}) => {
  assertIntroBridgeClean();
  spawnIntroBackgroundMedia();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const [headline, setHeadline] = useState(OPENING_HEADLINE);
  const [frameLabel, setFrameLabel] = useState('0000');
  const completingRef = useRef(false);

  if (embedCanvas) {
    console.warn('[CerebroIntro] embedCanvas=true ignored — using overlay-only mode');
  }

  const finish = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    onJourneyPose(null);
    onComplete();
  }, [onComplete, onJourneyPose]);

  // Hold Frame 0000 wide master sphere while the gate is showing.
  useEffect(() => {
    if (journeyActive) return;
    const pose = sampleJourneyPose(0);
    onJourneyPose(pose);
    setHeadline(OPENING_HEADLINE);
    setFrameLabel('0000');
  }, [journeyActive, onJourneyPose]);

  // Drive the 72s continuous camera timeline once ENTER unlocks audio.
  useEffect(() => {
    if (!journeyActive) return;
    completingRef.current = false;
    startedAtRef.current = performance.now();

    const tick = () => {
      const audio = audioRef.current;
      const elapsed =
        audio && !audio.paused && Number.isFinite(audio.currentTime)
          ? audio.currentTime
          : (performance.now() - startedAtRef.current) / 1000;
      const t = Math.min(JOURNEY_DURATION_SECONDS, Math.max(0, elapsed));
      const pose = sampleJourneyPose(reducedMotion ? Math.min(t * 2.4, JOURNEY_DURATION_SECONDS) : t);
      onJourneyPose(pose);
      setHeadline(pose.headline);
      setFrameLabel(String(pose.frame).padStart(4, '0'));
      if (t >= JOURNEY_DURATION_SECONDS - 0.02) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [finish, journeyActive, onJourneyPose, reducedMotion]);

  const enterCerebro = useCallback(async () => {
    soundEngine.unlock();
    soundEngine.setMuted(false);

    if (!audioRef.current) {
      const audio = new Audio(resolveMasterMixUrl());
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.muted = false;
    try {
      await audio.play();
    } catch {
      // Gesture unlocked Web Audio; visual journey continues even if media play is blocked.
    }
    onJourneyStart();
  }, [onJourneyStart]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[200]"
      data-cerebro-intro="overlay"
      data-journey-active={journeyActive ? 'true' : 'false'}
      data-embed-canvas="false"
    >
      {/* Soft atmospheric scrim — sphere remains visible underneath */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(16,29,39,0.18) 0%, rgba(5,9,14,0.55) 70%, rgba(5,9,14,0.78) 100%)',
        }}
      />

      {!journeyActive && (
        <div
          className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          role="dialog"
          aria-label="Enter Cerebro"
          data-testid="cinematic-opening-gate"
        >
          <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#B4DDFF]/80 mb-5">
            Frame {frameLabel}
          </p>
          <h1
            className="max-w-4xl font-display text-[clamp(1.75rem,5vw,3.75rem)] leading-[1.05] tracking-[0.04em] text-[#F2F6F8]"
            data-testid="opening-headline"
          >
            {OPENING_HEADLINE}
          </h1>
          <button
            type="button"
            data-testid="enter-cerebro"
            onClick={() => void enterCerebro()}
            className="mt-10 min-h-[52px] px-8 rounded-xl border border-[#65ACFF]/55 bg-[#4C8DFF]/18 font-mono text-sm tracking-[0.18em] uppercase text-[#F2F6F8] hover:bg-[#4C8DFF]/32 hover:border-[#65ACFF] cursor-pointer backdrop-blur-md transition-colors"
          >
            ENTER CEREBRO
          </button>
        </div>
      )}

      {journeyActive && (
        <>
          <div className="absolute inset-x-0 top-[18%] flex flex-col items-center px-6 text-center pointer-events-none">
            <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-[#B4DDFF]/70 mb-3">
              Frame {frameLabel}
            </p>
            <h2 className="max-w-3xl font-display text-[clamp(1.35rem,3.6vw,2.6rem)] leading-[1.1] tracking-[0.03em] text-[#F2F6F8]/95">
              {headline}
            </h2>
          </div>
          <button
            type="button"
            data-testid="skip-intro"
            onClick={finish}
            className="pointer-events-auto absolute top-5 right-5 md:top-7 md:right-7 min-h-[44px] px-4 rounded-lg border border-white/20 bg-black/35 font-mono text-[11px] tracking-[0.16em] uppercase text-[#F2F6F8]/90 hover:bg-black/55 hover:border-white/35 cursor-pointer backdrop-blur-md"
          >
            SKIP INTRO
          </button>
        </>
      )}
    </div>
  );
};
