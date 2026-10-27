import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BlueprintNodeItem,
  DecisionQueueItem,
  FourTierState,
} from '../../data/blueprintData';
import {
  buildCrewFallbackAvatar,
  getCrewMemberById,
  MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER,
} from '../../data/crewRegistry';
import { getTierColor } from '../BlueprintMap/BlueprintNode';
import { motionTokens } from '../../motionTokens';

interface TaskInspectorProps {
  node: BlueprintNodeItem;
  effectiveFourTier: FourTierState;
  decisions: DecisionQueueItem[];
  onSelectDependency: (nodeId: string) => void;
  onOpenDecisionQueue: (decisionId: string) => void;
  onOpenCrewMember: (agentId: string) => void;
  onOpenVisualFeedback: (targetLabel: string) => void;
}

/**
 * TaskInspector.tsx & TaskExplanationCard.tsx:
 * Right Dock explanation card (AnimatePresence mode="wait" initial={false})
 * displaying all 9 mandatory fields + Four-Tier Truthful State Separation.
 */
export const TaskInspector: React.FC<TaskInspectorProps> = ({
  node,
  effectiveFourTier,
  decisions,
  onSelectDependency,
  onOpenDecisionQueue,
  onOpenCrewMember,
  onOpenVisualFeedback,
}) => {
  const owner = getCrewMemberById(node.agentOwnerId);
  const provenance =
    MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER.find(
      (p) => p.assetId === owner.provenanceId
    ) || MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER[0];
  const pendingDecision = node.waitingForDecisionId
    ? decisions.find((d) => d.id === node.waitingForDecisionId)
    : null;

  return (
    <div
      id="task-inspector"
      data-testid="task-inspector-panel"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="cerebro-hud-panel flex flex-col h-full overflow-hidden p-4"
    >
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[rgba(148,163,184,0.14)] shrink-0">
        <div>
          <div className="font-mono text-[10px] text-[#38BDF8] uppercase">
            TASK EXPLANATION CARD · 9 MANDATORY FIELDS
          </div>
          <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
            {node.code} — {node.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onOpenVisualFeedback(`${node.code} (${node.title})`)}
          className="px-2.5 py-1 rounded-lg bg-[#121926] border border-[rgba(148,163,184,0.25)] hover:border-[#38BDF8] font-mono text-[10px] text-[#F8FAFC] cursor-pointer"
        >
          Critique UI
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: motionTokens.duration.panel }}
          className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs"
        >
          {/* Field 1: What this is */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)]">
            <div className="font-mono text-[10px] text-[#94A3B8] uppercase mb-1">
              1. What this is
            </div>
            <p className="text-[#F8FAFC] leading-relaxed">{node.whatThisIs}</p>
          </div>

          {/* Field 2: Why it exists */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)]">
            <div className="font-mono text-[10px] text-[#94A3B8] uppercase mb-1">
              2. Why it exists
            </div>
            <p className="text-[#F8FAFC] leading-relaxed">{node.whyItExists}</p>
          </div>

          {/* Field 3: What to expect */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)]">
            <div className="font-mono text-[10px] text-[#94A3B8] uppercase mb-1">
              3. What to expect
            </div>
            <p className="text-[#F8FAFC] leading-relaxed">{node.whatToExpect}</p>
          </div>

          {/* Field 4: Current status (All 4 tiers + Honesty Label) */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#94A3B8] uppercase">
                4. Current status (4-Tier Separation)
              </span>
              <span className="font-mono text-[10px] text-[#10B981]">
                {effectiveFourTier.honestyLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px] pt-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getTierColor(
                      'implementation',
                      effectiveFourTier.implementation
                    ),
                  }}
                />
                <span className="text-[#94A3B8]">Implementation:</span>
                <span className="text-[#F8FAFC] font-semibold">
                  {effectiveFourTier.implementation}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getTierColor(
                      'verification',
                      effectiveFourTier.verification
                    ),
                  }}
                />
                <span className="text-[#94A3B8]">Verification:</span>
                <span className="text-[#F8FAFC] font-semibold">
                  {effectiveFourTier.verification}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getTierColor(
                      'visualApproval',
                      effectiveFourTier.visualApproval
                    ),
                  }}
                />
                <span className="text-[#94A3B8]">Visual Approval:</span>
                <span className="text-[#F8FAFC] font-semibold">
                  {effectiveFourTier.visualApproval}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getTierColor(
                      'releaseAcceptance',
                      effectiveFourTier.releaseAcceptance
                    ),
                  }}
                />
                <span className="text-[#94A3B8]">Release:</span>
                <span className="text-[#F8FAFC] font-semibold">
                  {effectiveFourTier.releaseAcceptance}
                </span>
              </div>
            </div>
          </div>

          {/* Field 5: Dependencies & Holds */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)] space-y-1.5">
            <div className="font-mono text-[10px] text-[#94A3B8] uppercase">
              5. Dependencies & Standing Holds
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {node.dependencies.length > 0 ? (
                node.dependencies.map((depId) => (
                  <button
                    key={depId}
                    type="button"
                    onClick={() => onSelectDependency(depId)}
                    className="px-2 py-0.5 rounded bg-[#121926] border border-[rgba(148,163,184,0.25)] hover:border-[#38BDF8] font-mono text-[10px] text-[#38BDF8] cursor-pointer"
                  >
                    → {depId}
                  </button>
                ))
              ) : (
                <span className="font-mono text-[10px] text-[#64748B]">
                  Root gate (no upstream task dependencies)
                </span>
              )}
            </div>
            {node.holds.length > 0 && (
              <div className="pt-1 space-y-1">
                {node.holds.map((hold) => (
                  <div
                    key={hold}
                    className="font-mono text-[10px] text-[#A855F7]"
                  >
                    Hold: {hold}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Field 6: Preview */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-[#94A3B8] uppercase">
                6. Preview State
              </span>
              <span className="font-mono text-[10px] text-[#38BDF8]">
                {node.previewState} · {effectiveFourTier.honestyLabel}
              </span>
            </div>
            <p className="text-[#F8FAFC]">{node.previewSummary}</p>
          </div>

          {/* Field 7: Verification & Evidence */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] text-[#94A3B8] uppercase">
                7. Verification & Evidence
              </span>
              <span className="font-mono text-[10px] text-[#10B981]">
                {node.verificationEvidenceId}
              </span>
            </div>
            <p className="text-[#F8FAFC]">{node.verificationEvidenceSummary}</p>
          </div>

          {/* Field 8: Waiting for your decision */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)]">
            <div className="font-mono text-[10px] text-[#94A3B8] uppercase mb-1">
              8. Waiting for your decision (ASK_OF_39)
            </div>
            {pendingDecision ? (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-[11px] font-semibold text-[#F59E0B]">
                    {pendingDecision.code}: {pendingDecision.title}
                  </div>
                  <div className="font-mono text-[10px] text-[#94A3B8]">
                    Status: {pendingDecision.status}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDecisionQueue(pendingDecision.id)}
                  className="px-2.5 py-1 rounded bg-[#F59E0B] text-[#05070B] font-mono text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  Review Decision
                </button>
              </div>
            ) : (
              <div className="font-mono text-[10px] text-[#10B981]">
                No blocking executive decisions pending from 39.
              </div>
            )}
          </div>

          {/* Field 9: Agent Owner (Bound to v1.5 AgentCard avatar & Musa Provenance) */}
          <div className="p-2.5 rounded-lg bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src={owner.portraitUrl}
                onError={(e) => {
                  const target = e.currentTarget;
                  const fallback = buildCrewFallbackAvatar(
                    owner.callsign,
                    owner.accentHex
                  );
                  if (target.src !== fallback) target.src = fallback;
                }}
                alt={owner.callsign}
                className="w-10 h-10 rounded-lg object-cover border border-[rgba(148,163,184,0.3)]"
              />
              <div>
                <div className="font-mono text-[10px] text-[#94A3B8] uppercase">
                  9. Agent Owner (Seat #{owner.seatNumber})
                </div>
                <div className="font-display text-xs font-semibold text-[#F8FAFC]">
                  {owner.callsign} ({owner.arabicName}) — {owner.roleTitle}
                </div>
                <div className="font-mono text-[9px] text-[#38BDF8]">
                  Provenance: {provenance.assetId} · SHA {provenance.sha256Prefix}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenCrewMember(owner.id)}
              className="px-2.5 py-1 rounded bg-[#121926] border border-[rgba(148,163,184,0.28)] hover:border-[#38BDF8] font-mono text-[10px] text-[#F8FAFC] cursor-pointer shrink-0"
            >
              Inspect Seat
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
