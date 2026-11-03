import React from 'react';

export interface SystemStatusLayerProps {
  webglUnavailable?: boolean;
  voiceAuthFailed?: boolean;
  projectCount?: number;
  onRetryVoice?: () => void;
  onRetryWebgl?: () => void;
}

export const SystemStatusLayer: React.FC<SystemStatusLayerProps> = ({
  webglUnavailable = false,
  voiceAuthFailed = false,
  projectCount = 0,
  onRetryVoice,
  onRetryWebgl,
}) => {
  if (!webglUnavailable && !voiceAuthFailed) return null;
  return (
    <div
      className="fixed left-1/2 top-16 z-[120] w-[min(420px,calc(100vw-24px))] -translate-x-1/2 rounded-xl border border-white/15 bg-black/70 px-4 py-3 text-center backdrop-blur-md"
      role="status"
      data-testid="system-status-layer"
    >
      {webglUnavailable && (
        <div className="space-y-2">
          <p className="font-mono text-xs text-[#F2F6F8]">WebGL unavailable</p>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
            onClick={onRetryWebgl}
          >
            Reload
          </button>
        </div>
      )}
      {voiceAuthFailed && (
        <div className="space-y-2">
          <p className="font-mono text-xs text-[#F2F6F8]">
            Voice auth failed · {projectCount} projects loaded
          </p>
          <button
            type="button"
            className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs"
            onClick={onRetryVoice}
          >
            Retry voice
          </button>
        </div>
      )}
    </div>
  );
};
