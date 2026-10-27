import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { motionTokens } from '../motionTokens';

export type ConnectionLivenessState =
  | 'Live'
  | 'Reconnecting'
  | 'Polling'
  | 'Stale'
  | 'Disconnected'
  | 'Demo playback';

interface VerifiedProgressProps {
  completed: number;
  total: number;
  rtl?: boolean;
}

/**
 * VerifiedProgress.tsx:
 * Driven by useSpring(completed / total) showing exact verified acceptance criteria count.
 * Supports RTL transformOrigin: "right center".
 */
export const VerifiedProgress: React.FC<VerifiedProgressProps> = ({
  completed,
  total,
  rtl = false,
}) => {
  const safeTotal = Math.max(1, total);
  const ratio = Math.max(0, Math.min(1, completed / safeTotal));
  const springRatio = useSpring(ratio, motionTokens.spring.progress);

  useEffect(() => {
    springRatio.set(ratio);
  }, [ratio, springRatio]);

  const scaleX = useTransform(springRatio, (v) => Math.max(0.02, Math.min(1, v)));

  return (
    <div
      data-testid="verified-progress"
      className="flex items-center gap-2.5 min-w-[180px]"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <div className="flex-1 h-2 rounded-full bg-[#05070B] border border-[rgba(148,163,184,0.2)] overflow-hidden">
        <motion.div
          style={{
            scaleX,
            transformOrigin: rtl ? 'right center' : 'left center',
          }}
          className="h-full w-full bg-[#10B981]"
        />
      </div>
      <span className="font-mono text-[11px] text-[#F8FAFC] whitespace-nowrap">
        {completed}/{total} Verified
      </span>
    </div>
  );
};

interface BuildActivityHeaderProps {
  projectName: string;
  checkpointId: string;
  gitHash: string;
  connectionState: ConnectionLivenessState;
  lastEventIso: string;
  recordedStartTimeMs: number;
  recordedPausedDurationMs: number;
  verifiedCriteriaCount: number;
  totalCriteriaCount: number;
  isHistoricalMode: boolean;
  portalHudOpen: boolean;
  rtl?: boolean;
  onChangeConnectionState: (state: ConnectionLivenessState) => void;
  onTogglePortalHud: () => void;
  onReturnToLive: () => void;
}

/**
 * BuildActivityHeader.tsx & ConnectionStatus.tsx:
 * Plain-language summary bar with durable 1Hz elapsed timer (currentTime - recordedStartTime - recordedPausedDuration).
 * Never uses fake looping spinners.
 */
export const BuildActivityHeader: React.FC<BuildActivityHeaderProps> = ({
  projectName,
  checkpointId,
  gitHash,
  connectionState,
  lastEventIso,
  recordedStartTimeMs,
  recordedPausedDurationMs,
  verifiedCriteriaCount,
  totalCriteriaCount,
  isHistoricalMode,
  portalHudOpen,
  rtl = false,
  onChangeConnectionState,
  onTogglePortalHud,
  onReturnToLive,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const elapsedSec = Math.max(
    0,
    Math.floor((nowMs - recordedStartTimeMs - recordedPausedDurationMs) / 1000)
  );
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const formattedElapsed = `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;

  const stateColorMap: Record<ConnectionLivenessState, string> = {
    Live: '#10B981',
    Reconnecting: '#F59E0B',
    Polling: '#38BDF8',
    Stale: '#F59E0B',
    Disconnected: '#EF4444',
    'Demo playback': '#A855F7',
  };

  return (
    <div
      data-testid="build-activity-header"
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed top-16 left-4 right-4 z-30 pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#0C111A]/85 border border-[rgba(148,163,184,0.18)] backdrop-blur-md text-xs"
    >
      {/* Left: Active Project & Checkpoint */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display font-semibold text-[#F8FAFC] tracking-wide">
          {projectName}
        </span>
        <span className="text-[#64748B]" aria-hidden="true">
          —
        </span>
        <span className="font-mono text-[11px] text-[#38BDF8]">
          Checkpoint {checkpointId} ({gitHash})
        </span>
        {isHistoricalMode && (
          <button
            type="button"
            onClick={onReturnToLive}
            className="px-2 py-0.5 rounded bg-[#F59E0B]/20 border border-[#F59E0B] font-mono text-[10px] text-[#F59E0B] hover:bg-[#F59E0B]/30 cursor-pointer"
          >
            Historical Mode · Return to Live (View Diff)
          </button>
        )}
      </div>

      {/* Center: Connection State Pill & Durable 1Hz Elapsed Timer */}
      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: stateColorMap[connectionState] }}
          />
          <select
            aria-label="Connection state"
            value={connectionState}
            onChange={(e) =>
              onChangeConnectionState(e.target.value as ConnectionLivenessState)
            }
            className="bg-[#121926] text-[#F8FAFC] border border-[rgba(148,163,184,0.22)] rounded px-1.5 py-0.5 text-[10px] cursor-pointer"
          >
            {(
              [
                'Live',
                'Reconnecting',
                'Polling',
                'Stale',
                'Disconnected',
                'Demo playback',
              ] as ConnectionLivenessState[]
            ).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <span className="text-[#94A3B8] hidden sm:inline">
            Last event {lastEventIso.slice(11, 19)} UTC
          </span>
        </div>

        <span className="text-[#64748B]" aria-hidden="true">
          ·
        </span>

        <span
          data-testid="durable-elapsed-timer"
          className="text-[#94A3B8]"
          title="Computed strictly from durable timestamps (currentTime - recordedStartTime - recordedPausedDuration)"
        >
          Elapsed {formattedElapsed}
        </span>
      </div>

      {/* Right: Verified Progress Bar & Portal Tracker Toggle */}
      <div className="flex items-center gap-3">
        <VerifiedProgress
          completed={verifiedCriteriaCount}
          total={totalCriteriaCount}
          rtl={rtl}
        />
        <button
          type="button"
          data-testid="toggle-tracker-portal-btn"
          onClick={onTogglePortalHud}
          className={`min-h-[32px] px-3 py-1 rounded-lg font-mono text-[11px] border transition-colors cursor-pointer ${
            portalHudOpen
              ? 'bg-[#38BDF8] text-[#05070B] border-[#38BDF8] font-semibold'
              : 'bg-[#121926] text-[#F8FAFC] border-[rgba(148,163,184,0.28)] hover:border-[#38BDF8]'
          }`}
        >
          {portalHudOpen ? 'Hide Portal HUD' : 'Observation Portal (v1.5)'}
        </button>
      </div>
    </div>
  );
};
