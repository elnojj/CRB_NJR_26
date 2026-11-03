import React, { useEffect, useState } from 'react';
import { GUI_Z_LAYERS } from '../gui/guiTokens';
import { introBridge } from './bridge';
import { loadExplainer60, resolveEditionFromSearch } from './explainer60';

export interface Explainer60PlayerProps {
  embedCanvas?: boolean;
  onEnterWorkspace: () => void;
}

/**
 * 60s explainer overlay — transparent controls on the continuous canvas.
 */
export const Explainer60Player: React.FC<Explainer60PlayerProps> = ({
  embedCanvas = false,
  onEnterWorkspace,
}) => {
  const [title, setTitle] = useState('Cerebro · 60s Explainer');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (embedCanvas) {
      console.warn('[Explainer60Player] embedCanvas=true ignored — overlay-only mode');
    }
    introBridge.enabled = true;
    let cancelled = false;
    loadExplainer60()
      .then((cfg) => {
        if (cancelled) return;
        setTitle(cfg.meta.title || title);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [embedCanvas, title]);

  const edition =
    typeof window !== 'undefined'
      ? resolveEditionFromSearch(window.location.search)
      : 'explainer-60';

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 top-20 flex flex-col items-center gap-3 px-4"
      style={{ zIndex: GUI_Z_LAYERS.modalContent ?? 100 }}
      data-explainer60="overlay"
      data-edition={edition}
      data-embed-canvas="false"
      role="dialog"
      aria-label={title}
    >
      <div className="max-w-lg rounded-2xl border border-white/15 bg-black/45 px-5 py-4 text-center backdrop-blur-md shadow-2xl">
        <p className="font-sans text-sm font-medium text-[#F2F6F8]">{title}</p>
        <p className="mt-1 font-sans text-xs text-[#BDCBD3]">
          {error
            ? `Explainer data unavailable (${error}) — continue to workspace.`
            : 'Playing over the continuous spatial canvas — no duplicate WebGL context.'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs text-[#E8FFF4]"
            onClick={onEnterWorkspace}
          >
            Enter workspace
          </button>
        </div>
      </div>
    </div>
  );
};
