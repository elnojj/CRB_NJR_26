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
 * Bottom dock of the Tracker-First Portal UI unified under Neural Observatory v1.1.
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
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#F2B66D]/15 border border-[#F2B66D] text-xs"
        >
          <div className="font-mono tabular-nums text-[11px] text-[#F2B66D]">
            <strong>HISTORICAL CHECKPOINT MODE:</strong> Viewing snapshot{' '}
            {activeCp.id} ({activeCp.gitHash}) recorded {activeCp.recordedAtIso} —
            Historical alerts muted.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className="px-2.5 py-1 rounded-lg bg-[#142632] border border-[#F2B66D] font-mono text-[10px] text-[#F2F6F8] cursor-pointer"
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
              className="px-2.5 py-1 rounded-lg bg-[#F2B66D] text-[#101D27] font-mono text-[10px] font-semibold cursor-pointer"
            >
              Return to Live (View Diff)
            </button>
          </div>
        </div>
      )}

      {/* Bottom Dock Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.14)] pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('checkpoints')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer transition-colors ${
              activeTab === 'checkpoints'
                ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                : 'bg-[#142632] text-[#BDCBD3] hover:text-[#F2F6F8]'
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
                ? 'bg-[#F2B66D] text-[#101D27] font-semibold'
                : 'bg-[#142632] text-[#BDCBD3] hover:text-[#F2F6F8]'
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
                ? 'bg-[#7CE0B8] text-[#101D27] font-semibold'
                : 'bg-[#142632] text-[#BDCBD3] hover:text-[#F2F6F8]'
            }`}
          >
            Crew Roster v1.5 (20 Seats)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer transition-colors ${
              activeTab === 'diff'
                ? 'bg-[#36E88D] text-[#101D27] font-semibold'
                : 'bg-[#142632] text-[#BDCBD3] hover:text-[#F2F6F8]'
            }`}
          >
            Checkpoint Diff
          </button>
        </div>

        <button
          type="button"
          data-testid="open-visual-feedback-btn"
          onClick={onOpenVisualFeedback}
          className="px-3 py-1 rounded-lg bg-[#142632] border border-[rgba(180,221,255,0.16)] hover:border-[#65ACFF] font-mono text-[10px] text-[#65ACFF] cursor-pointer"
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
                    ? 'bg-[rgba(20,38,50,0.88)] border-[#65ACFF]'
                    : 'bg-[rgba(20,38,50,0.72)] border-[rgba(180,221,255,0.16)] hover:border-[#65ACFF]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 font-mono tabular-nums text-[10px]">
                  <span className="text-[#4C8DFF] font-semibold">{cp.id}</span>
                  <span
                    className={
                      isLive ? 'text-[#36E88D] font-semibold' : 'text-[#BDCBD3]'
                    }
                  >
                    {isLive ? 'LIVE' : cp.gitHash}
                  </span>
                </div>
                <div className="font-display text-xs font-semibold text-[#F2F6F8] line-clamp-1 mt-1">
                  {cp.label}
                </div>
                <div className="font-mono tabular-nums text-[9px] text-[#BDCBD3] mt-1">
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
              className="p-2.5 rounded-lg bg-[rgba(20,38,50,0.72)] border border-[rgba(180,221,255,0.16)] flex flex-wrap items-center justify-between gap-3"
            >
              <div className="space-y-0.5 max-w-2xl">
                <div className="flex items-center gap-2 font-mono tabular-nums text-[10px]">
                  <span className="text-[#F2B66D] font-semibold">{dec.code}</span>
                  <span className="text-[#BDCBD3]">Asked by {dec.askedByAgentId}</span>
                  <span className="text-[#5CC8D7]">Hold: {dec.holdBranch}</span>
                  <span className="text-[#36E88D]">Status: {dec.status}</span>
                </div>
                <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                  {dec.title}
                </div>
                <p className="text-[11px] text-[#BDCBD3]">{dec.summary}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid={`approve-decision-${dec.id}`}
                  onClick={() => onResolveDecision(dec.id, 'APPROVED')}
                  className="px-2.5 py-1 rounded-lg bg-[#36E88D] text-[#101D27] font-mono text-[10px] font-semibold cursor-pointer"
                >
                  Approve (39)
                </button>
                <button
                  type="button"
                  onClick={() => onResolveDecision(dec.id, 'REVISION_REQUESTED')}
                  className="px-2.5 py-1 rounded-lg bg-[#F2B66D]/20 border border-[#F2B66D] text-[#F2B66D] font-mono text-[10px] cursor-pointer"
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => onResolveDecision(dec.id, 'HELD')}
                  className="px-2.5 py-1 rounded-lg bg-[#5CC8D7]/20 border border-[#5CC8D7] text-[#5CC8D7] font-mono text-[10px] cursor-pointer"
                >
                  Keep Hold
                </button>
              </div>
            </div>
          ))}

          {decisionEvents.length > 0 && (
            <div className="pt-1 border-t border-[rgba(255,255,255,0.14)] font-mono tabular-nums text-[10px] text-[#36E88D]">
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
                      ? 'bg-[rgba(20,38,50,0.88)] border-[#65ACFF]'
                      : 'bg-[rgba(20,38,50,0.72)] border-[rgba(180,221,255,0.16)] hover:border-[#65ACFF]'
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
                    className="w-8 h-8 rounded-md object-cover shrink-0 border border-[rgba(180,221,255,0.16)]"
                  />
                  <div className="min-w-0">
                    <div className="font-mono tabular-nums text-[10px] font-semibold text-[#F2F6F8] truncate">
                      #{seat.seatNumber} {seat.callsign}
                    </div>
                    <div className="font-mono text-[9px] text-[#BDCBD3] truncate">
                      {seat.roleTitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2 rounded-lg bg-[#101D27] border border-[rgba(180,221,255,0.16)] font-mono tabular-nums text-[10px] text-[#BDCBD3] flex flex-wrap items-center justify-between gap-2">
            <span>
              MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER:{' '}
              {MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER.length} verified asset groups
            </span>
            <span className="text-[#36E88D]">
              Standing Hold feat/ds-v1-1: No howler.js · JaapokkiSubtract Locked
            </span>
          </div>
        </div>
      )}

      {/* Tab 4: Checkpoint Diff View */}
      {activeTab === 'diff' && (
        <div className="p-2.5 rounded-lg bg-[rgba(20,38,50,0.72)] border border-[rgba(180,221,255,0.16)] space-y-1.5 font-mono tabular-nums text-[11px]">
          <div className="flex items-center justify-between text-[#65ACFF]">
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
              <div key={line} className="text-[#36E88D]">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
