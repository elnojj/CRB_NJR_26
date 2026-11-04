import React from 'react';
import type { JourneyBeat } from '../three/camera/journeyConfig';

interface JourneyCaptionProps {
  beat: JourneyBeat | null;
  onSkip: () => void;
}

export function JourneyCaption({ beat, onSkip }: JourneyCaptionProps) {
  if (!beat) return null;
  return (
    <div
      data-testid="journey-caption"
      className="pointer-events-none fixed left-1/2 z-[60] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 bottom-[148px] flex flex-col items-center gap-2 text-center"
      aria-live="polite"
    >
      <div className="rounded-xl border border-[#1E5EFF] bg-[#0A0D14]/90 px-5 py-3">
        <div className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-[#E8EEF8]">
          {beat.headlineEn}
        </div>
        {beat.supportEn ? (
          <div className="mt-1 font-mono text-[11px] tracking-wider text-[#9FB2CC]">{beat.supportEn}</div>
        ) : null}
        <div className="mt-2 text-[13px] leading-snug text-[#C9D4E6]">{beat.narrationEn}</div>
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
  );
}
