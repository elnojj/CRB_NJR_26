import React, { useState } from 'react';
import {
  CheckpointSnapshot,
  DecisionQueueItem,
} from '../data/blueprintData';
import {
  CREW_ROSTER_V1_5,
  MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER,
  buildCrewFallbackAvatar,
} from '../data/crewRegistry';

export interface DecisionResolvedEventEnvelope {
  eventId: string;
  eventType: 'decision.resolved';
  decisionId: string;
  resolution: 'APPROVED' | 'HELD' | 'REVISION_REQUESTED';
  resolvedBy: '39 (Tarek Nojara)';
  checkpointId: string;
  timestampIso: string;
}

interface CheckpointTimelineProps {
  checkpoints: CheckpointSnapshot[];
  activeCheckpointId: string;
  liveCheckpointId: string;
  decisions: DecisionQueueItem[];
  decisionEvents: DecisionResolvedEventEnvelope[];
  selectedCrewAgentId: string | null;
  annotationCount: number;
  onSelectCheckpoint: (checkpointId: string) => void;
  onReturnToLive: () => void;
  onResolveDecision: (
    decisionId: string,
    resolution: 'APPROVED' | 'HELD' | 'REVISION_REQUESTED'
  ) => void;
  onSelectCrewAgent: (agentId: string | null) => void;
  onSelectTaskFromCrew: (taskId: string) => void;
  onOpenVisualFeedback: () => void;
}

/**
 * CheckpointTimeline.tsx, DecisionQueue.tsx & CrewRosterPanel.tsx:
 * Bottom dock of the Tracker-First Portal UI.
 */
export const CheckpointTimeline: React.FC<CheckpointTimelineProps> = ({
  checkpoints,
  activeCheckpointId,
  liveCheckpointId,
  decisions,
  decisionEvents,
  selectedCrewAgentId,
  annotationCount,
  onSelectCheckpoint,
  onReturnToLive,
  onResolveDecision,
  onSelectCrewAgent,
  onSelectTaskFromCrew,
  onOpenVisualFeedback,
}) => {
  const [activeTab, setActiveTab] = useState<
    'checkpoints' | 'decisions' | 'crew' | 'diff'
  >('checkpoints');

  const isHistorical = activeCheckpointId !== liveCheckpointId;
  const activeCp =
    checkpoints.find((c) => c.id === activeCheckpointId) ||
    checkpoints[checkpoints.length - 1];
  const liveCp =
    checkpoints.find((c) => c.id === liveCheckpointId) ||
    checkpoints[checkpoints.length - 1];
  const pendingDecisionsCount = decisions.filter(
    (d) => d.status === 'PENDING'
  ).length;

  return (
    <div
      data-testid="checkpoint-timeline-dock"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="cerebro-hud-panel p-3 space-y-2.5"
    >
      {/* Historical Checkpoint Mode Banner (never replays old alerts, initial={false}) */}
      {isHistorical && (
        <div
          data-testid="historical-checkpoint-banner"
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B] text-xs"
        >
          <div className="font-mono text-[11px] text-[#F59E0B]">
            <strong>HISTORICAL CHECKPOINT MODE:</strong> Viewing snapshot{' '}
            {activeCp.id} ({activeCp.gitHash}) recorded {activeCp.recordedAtIso} —
            Historical alerts muted.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className="px-2.5 py-1 rounded bg-[#121926] border border-[#F59E0B] font-mono text-[10px] text-[#F8FAFC] cursor-pointer"
            >
              View Diff vs Live
            </button>
            <button
              type="button"
              data-testid="return-to-live-btn"
              onClick={() => {
                onReturnToLive();
                setActiveTab('diff');
              }}
              className="px-2.5 py-1 rounded bg-[#F59E0B] text-[#05070B] font-mono text-[10px] font-semibold cursor-pointer"
            >
              Return to Live (View Diff)
            </button>
          </div>
        </div>
      )}

      {/* Bottom Dock Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(148,163,184,0.14)] pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('checkpoints')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer transition-colors ${
              activeTab === 'checkpoints'
                ? 'bg-[#38BDF8] text-[#05070B] font-semibold'
                : 'bg-[#121926] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Checkpoints ({checkpoints.length})
          </button>
          <button
            type="button"
            data-testid="decision-queue-tab-btn"
            onClick={() => setActiveTab('decisions')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer transition-colors ${
              activeTab === 'decisions'
                ? 'bg-[#F59E0B] text-[#05070B] font-semibold'
                : 'bg-[#121926] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Decision Queue · ASK_OF_39 ({pendingDecisionsCount} Pending)
          </button>
          <button
            type="button"
            data-testid="crew-roster-tab-btn"
            onClick={() => setActiveTab('crew')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer transition-colors ${
              activeTab === 'crew'
                ? 'bg-[#818CF8] text-[#05070B] font-semibold'
                : 'bg-[#121926] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Crew Roster v1.5 (20 Seats)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer transition-colors ${
              activeTab === 'diff'
                ? 'bg-[#10B981] text-[#05070B] font-semibold'
                : 'bg-[#121926] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Checkpoint Diff
          </button>
        </div>

        <button
          type="button"
          data-testid="open-visual-feedback-btn"
          onClick={onOpenVisualFeedback}
          className="px-3 py-1 rounded-lg bg-[#121926] border border-[#38BDF8]/50 hover:border-[#38BDF8] font-mono text-[10px] text-[#38BDF8] cursor-pointer"
        >
          Visual Feedback Mind Map ({annotationCount})
        </button>
      </div>

      {/* Tab 1: Checkpoint Timeline (.agent-ops/checkpoints/) */}
      {activeTab === 'checkpoints' && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {checkpoints.map((cp) => {
            const isSelected = cp.id === activeCheckpointId;
            const isLive = cp.id === liveCheckpointId;
            return (
              <button
                key={cp.id}
                type="button"
                data-testid={`checkpoint-card-${cp.id}`}
                onClick={() => onSelectCheckpoint(cp.id)}
                className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#121926] border-[#38BDF8]'
                    : 'bg-[#05070B]/70 border-[rgba(148,163,184,0.16)] hover:border-[#38BDF8]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
                  <span className="text-[#38BDF8] font-semibold">{cp.id}</span>
                  <span
                    className={
                      isLive ? 'text-[#10B981] font-semibold' : 'text-[#94A3B8]'
                    }
                  >
                    {isLive ? 'LIVE' : cp.gitHash}
                  </span>
                </div>
                <div className="font-display text-xs font-semibold text-[#F8FAFC] line-clamp-1 mt-1">
                  {cp.label}
                </div>
                <div className="font-mono text-[9px] text-[#94A3B8] mt-1">
                  {cp.authorAgent} · {cp.verifiedCriteriaCount}/{cp.totalCriteriaCount} Verified
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 2: Decision Queue (ASK_OF_39.md) with 1-Click decision.resolved Envelope Logging */}
      {activeTab === 'decisions' && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {decisions.map((dec) => (
            <div
              key={dec.id}
              data-testid={`decision-item-${dec.id}`}
              className="p-2.5 rounded-lg bg-[#05070B]/80 border border-[rgba(148,163,184,0.18)] flex flex-wrap items-center justify-between gap-3"
            >
              <div className="space-y-0.5 max-w-2xl">
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="text-[#F59E0B] font-semibold">{dec.code}</span>
                  <span className="text-[#94A3B8]">Asked by {dec.askedByAgentId}</span>
                  <span className="text-[#A855F7]">Hold: {dec.holdBranch}</span>
                  <span className="text-[#10B981]">Status: {dec.status}</span>
                </div>
                <div className="font-display text-xs font-semibold text-[#F8FAFC]">
                  {dec.title}
                </div>
                <p className="text-[11px] text-[#94A3B8]">{dec.summary}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid={`approve-decision-${dec.id}`}
                  onClick={() => onResolveDecision(dec.id, 'APPROVED')}
                  className="px-2.5 py-1 rounded bg-[#10B981] text-[#05070B] font-mono text-[10px] font-semibold cursor-pointer"
                >
                  Approve (39)
                </button>
                <button
                  type="button"
                  onClick={() => onResolveDecision(dec.id, 'REVISION_REQUESTED')}
                  className="px-2.5 py-1 rounded bg-[#F59E0B]/20 border border-[#F59E0B] text-[#F59E0B] font-mono text-[10px] cursor-pointer"
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => onResolveDecision(dec.id, 'HELD')}
                  className="px-2.5 py-1 rounded bg-[#A855F7]/20 border border-[#A855F7] text-[#A855F7] font-mono text-[10px] cursor-pointer"
                >
                  Keep Hold
                </button>
              </div>
            </div>
          ))}

          {decisionEvents.length > 0 && (
            <div className="pt-1 border-t border-white/10 font-mono text-[10px] text-[#10B981]">
              Last Envelope: {decisionEvents[decisionEvents.length - 1].eventType} ·{' '}
              {decisionEvents[decisionEvents.length - 1].decisionId} →{' '}
              {decisionEvents[decisionEvents.length - 1].resolution} (
              {decisionEvents[decisionEvents.length - 1].eventId})
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Crew Roster v1.5 (20 Seats) & Musa Provenance Register */}
      {activeTab === 'crew' && (
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {CREW_ROSTER_V1_5.map((seat) => {
              const isSelected = selectedCrewAgentId === seat.id;
              return (
                <button
                  key={seat.id}
                  type="button"
                  data-testid={`crew-seat-${seat.id}`}
                  onClick={() => {
                    onSelectCrewAgent(seat.id);
                    if (seat.assignedTaskIds[0]) {
                      onSelectTaskFromCrew(seat.assignedTaskIds[0]);
                    }
                  }}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#121926] border-[#38BDF8]'
                      : 'bg-[#05070B]/75 border-[rgba(148,163,184,0.16)] hover:border-[#38BDF8]/50'
                  }`}
                >
                  <img
                    src={seat.portraitUrl}
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fb = buildCrewFallbackAvatar(
                        seat.callsign,
                        seat.accentHex
                      );
                      if (target.src !== fb) target.src = fb;
                    }}
                    alt={seat.callsign}
                    className="w-8 h-8 rounded-md object-cover shrink-0 border border-white/15"
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] font-semibold text-[#F8FAFC] truncate">
                      #{seat.seatNumber} {seat.callsign}
                    </div>
                    <div className="font-mono text-[9px] text-[#94A3B8] truncate">
                      {seat.roleTitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2 rounded-lg bg-[#05070B] border border-[rgba(148,163,184,0.14)] font-mono text-[10px] text-[#94A3B8] flex flex-wrap items-center justify-between gap-2">
            <span>
              MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER:{' '}
              {MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER.length} verified asset groups
            </span>
            <span className="text-[#10B981]">
              Standing Hold feat/ds-v1-1: No howler.js · JaapokkiSubtract Locked
            </span>
          </div>
        </div>
      )}

      {/* Tab 4: Checkpoint Diff View */}
      {activeTab === 'diff' && (
        <div className="p-2.5 rounded-lg bg-[#05070B]/80 border border-[rgba(148,163,184,0.18)] space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-[#38BDF8]">
            <span>
              Comparing {activeCp.id} ({activeCp.gitHash}) ↔ Live {liveCp.id} (
              {liveCp.gitHash})
            </span>
            <span>
              Criteria Delta: {activeCp.verifiedCriteriaCount} →{' '}
              {liveCp.verifiedCriteriaCount} / {liveCp.totalCriteriaCount}
            </span>
          </div>
          <div className="space-y-1 pt-1">
            {activeCp.diffHighlights.map((line) => (
              <div key={line} className="text-[#10B981]">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
