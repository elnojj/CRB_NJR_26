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
            className="pointer-events-none fixed inset-0 z-[55] bg-[#03060c]"
            style={{ animation: 'journey-dissolve 900ms ease-out forwards' }}
          />
        </>
      ) : null}
      <div
        data-testid="journey-caption"
        className="pointer-events-none fixed left-1/2 z-[60] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 bottom-[148px] flex flex-col items-center gap-2 text-center"
        aria-live="polite"
      >
        <div className="rounded-xl border border-[#1E5EFF] bg-[#0A0D14]/90 px-5 py-3">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[#7F93B2]">
            {beat.jId} · {String(beat.order).padStart(2, '0')} / {JOURNEY_BEATS.length}
          </div>
          <div className="mt-1 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-[#E8EEF8]">
            {beat.headlineEn}
          </div>
          <div className="mt-1 font-mono text-[11px] tracking-wider text-[#9FB2CC]">{beat.supportEn}</div>
          <div className="mt-2 text-[13px] leading-snug text-[#C9D4E6]">{beat.narrationEn}</div>
          {tag || beat.honestNoteEn ? (
            <div data-testid="journey-honest-note" className="mt-2 font-mono text-[11px] leading-snug text-[#F2B66D]">
              {tag ? `${tag}. ` : ''}
              {beat.honestNoteEn ?? ''}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          data-testid="journey-skip"
          onClick={onSkip}
          className="pointer-events-auto min-h-[44px] rounded-full border border-[#1E5EFF] bg-[#0A0D14] px-4 font-mono text-[11px] uppercase tracking-wider text-[#E8EEF8]"
        >
          Skip journey
        </button>
      </div>
    </>
  );
}
