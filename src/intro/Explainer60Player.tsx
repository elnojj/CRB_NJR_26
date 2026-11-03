import React from 'react';
import { assertIntroBridgeClean, spawnIntroBackgroundMedia } from './bridge';
import { GUI_Z_LAYERS } from '../gui/guiTokens';

export interface Explainer60PlayerProps {
  /** When false (default), render timeline/skip as overlay on the shared canvas. */
  embedCanvas?: boolean;
  open: boolean;
  title?: string;
  onSkip: () => void;
  onComplete?: () => void;
}

/**
 * 60s explainer chrome — transparent overlay only (no WebGL of its own).
 */
export const Explainer60Player: React.FC<Explainer60PlayerProps> = ({
  embedCanvas = false,
  open,
  title = 'Cerebro · 60s Explainer',
  onSkip,
  onComplete,
}) => {
  assertIntroBridgeClean();
  spawnIntroBackgroundMedia();

  if (!open) return null;

  if (embedCanvas) {
    console.warn('[Explainer60Player] embedCanvas=true ignored — using overlay-only mode');
  }

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 top-20 flex flex-col items-center gap-3 px-4"
      style={{ zIndex: GUI_Z_LAYERS.modalContent }}
      data-explainer60="overlay"
      data-embed-canvas="false"
      role="dialog"
      aria-label={title}
    >
      <div className="max-w-lg rounded-2xl border border-white/15 bg-black/45 px-5 py-4 text-center backdrop-blur-md shadow-2xl">
        <p className="font-sans text-sm font-medium text-[#F2F6F8]">{title}</p>
        <p className="mt-1 font-sans text-xs text-[#BDCBD3]">
          Playing over the continuous spatial canvas — no duplicate WebGL context.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-[#F2F6F8] hover:bg-white/20"
            onClick={onSkip}
          >
            Skip
          </button>
          <button
            type="button"
            className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs text-[#E8FFF4] hover:bg-emerald-500/30"
            onClick={() => {
              onComplete?.();
              onSkip();
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
