import React from 'react';
import { JOURNEY_BEATS, type BeatEvidence, type JourneyBeat } from '../three/camera/journeyConfig';

interface JourneyCaptionProps {
  beat: JourneyBeat | null;
  onSkip: () => void;
  /** Reduced motion replaces fly-throughs with cuts, so each cut dissolves in instead. */
  reducedMotion?: boolean;
}

const EVIDENCE_LABEL: Record<BeatEvidence, string | null> = {
  assets: null,
  gap: 'NO VERIFIED MEDIA',
  concept: 'CONCEPT',
  example: 'EXAMPLE',
  'registry-only': null,
};

/**
 * While the 25 Beats explainer plays the screen belongs to the scene and its in-world typography. This
 * component adds no visible caption card. It gives assistive technology each beat's full sentence once
 * (the word-by-word reveal is a visual treatment only) and keeps one small Stop control.
 */
export function JourneyCaption({ beat, onSkip, reducedMotion = false }: JourneyCaptionProps) {
  if (!beat) return null;
  const tag = EVIDENCE_LABEL[beat.evidence];
  return (
    <>
      {reducedMotion ? (
        <>
          <style>{'@keyframes journey-dissolve{from{opacity:.85}to{opacity:0}}'}</style>
          <div
            key={beat.id}
            data-testid="journey-dissolve"
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-(--z-journey-scrim) bg-[#03060c]"
            style={{ animation: 'journey-dissolve 900ms ease-out forwards' }}
          />
        </>
      ) : null}
      <div data-testid="journey-caption" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`${beat.jId}, ${beat.order} of ${JOURNEY_BEATS.length}. ${beat.headlineEn}. ${beat.narrationEn} ${beat.supportEn}.`}
        {tag || beat.honestNoteEn ? ` ${tag ? `${tag}. ` : ''}${beat.honestNoteEn ?? ''}` : ''}
      </div>
      <button
        type="button"
        data-testid="journey-skip"
        aria-label="Stop the 25 Beats explainer (Escape)"
        onClick={onSkip}
        className="fixed left-3 top-3 z-(--z-journey-chrome) min-h-[44px] rounded-full border border-white/15 bg-black/30 px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:border-white/40 hover:text-white/90 focus-visible:text-white"
        style={{ top: 'max(12px, env(safe-area-inset-top))' }}
      >
        Esc · Stop
      </button>
    </>
  );
}
