import React from 'react';
import { motion } from 'motion/react';
import {
  BlueprintNodeItem,
  DependencyEdgeItem,
  FourTierState,
} from '../../data/blueprintData';
import { getCrewMemberById } from '../../data/crewRegistry';
import { motionTokens } from '../../motionTokens';

export function getTierColor(
  tier: 'implementation' | 'verification' | 'visualApproval' | 'releaseAcceptance',
  value: string
): string {
  if (tier === 'implementation') {
    if (value === 'implemented') return 'var(--status-implemented)';
    if (value === 'running') return 'var(--status-running)';
    if (value === 'blocked') return 'var(--status-blocked)';
    return 'var(--status-planned)';
  }
  if (tier === 'verification') {
    if (value === 'tests-passed') return 'var(--status-verified)';
    if (value === 'checks-running') return 'var(--status-running)';
    if (value === 'tests-failed') return 'var(--status-blocked)';
    return 'var(--status-planned)';
  }
  if (tier === 'visualApproval') {
    if (value === 'visually-approved') return 'var(--status-verified)';
    if (value === 'changes-requested') return 'var(--status-blocked)';
    return 'var(--status-awaiting)';
  }
  if (value === 'released') return 'var(--status-verified)';
  if (value === 'held') return 'var(--status-held)';
  return 'var(--status-planned)';
}

interface BlueprintNodeProps {
  node: BlueprintNodeItem;
  effectiveFourTier: FourTierState;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  asMapPin?: boolean;
}

/**
 * BlueprintNode.tsx:
 * Renders each node via motion.button with aria-pressed, aria-controls="task-inspector", initial={false}.
 * Displays all 4 truthful status tiers + Honesty Label (never a single "Done" badge).
 */
export const BlueprintNode: React.FC<BlueprintNodeProps> = ({
  node,
  effectiveFourTier,
  isSelected,
  onSelect,
  asMapPin = true,
}) => {
  const owner = getCrewMemberById(node.agentOwnerId);

  return (
    <motion.button
      type="button"
      initial={false}
      layoutId={`bp-node-${node.id}`}
      transition={motionTokens.spring.interface}
      aria-pressed={isSelected}
      aria-controls="task-inspector"
      data-testid={`blueprint-node-${node.id}`}
      onClick={() => onSelect(node.id)}
      style={
        asMapPin
          ? {
              left: `${node.position2D.x}%`,
              top: `${node.position2D.y}%`,
            }
          : undefined
      }
      className={`${
        asMapPin ? 'absolute -translate-x-1/2 -translate-y-1/2 w-52' : 'w-full'
      } p-2.5 rounded-xl text-left transition-colors cursor-pointer border ${
        isSelected
          ? 'bg-[#121926]/95 border-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.22)]'
          : 'bg-[#0C111A]/90 border-[rgba(148,163,184,0.18)] hover:border-[#38BDF8]/60'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className="font-mono text-[10px] font-semibold text-[#38BDF8]">
          {node.code}
        </span>
        <span className="font-mono text-[9px] text-[#94A3B8]">
          {owner.callsign} · {node.criteriaVerified}/{node.criteriaTotal}
        </span>
      </div>

      <div className="font-display text-xs font-semibold text-[#F8FAFC] line-clamp-1 mb-1.5">
        {node.title}
      </div>

      {/* 4-Tier Truthful Status Dots + Text (Never collapsed into "Done") */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9px] text-[#94A3B8] border-t border-white/10 pt-1.5">
        <div className="flex items-center gap-1 truncate">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: getTierColor(
                'implementation',
                effectiveFourTier.implementation
              ),
            }}
          />
          <span className="truncate">Impl: {effectiveFourTier.implementation}</span>
        </div>
        <div className="flex items-center gap-1 truncate">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: getTierColor(
                'verification',
                effectiveFourTier.verification
              ),
            }}
          />
          <span className="truncate">QA: {effectiveFourTier.verification}</span>
        </div>
        <div className="flex items-center gap-1 truncate">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: getTierColor(
                'visualApproval',
                effectiveFourTier.visualApproval
              ),
            }}
          />
          <span className="truncate">Vis: {effectiveFourTier.visualApproval}</span>
        </div>
        <div className="flex items-center gap-1 truncate">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: getTierColor(
                'releaseAcceptance',
                effectiveFourTier.releaseAcceptance
              ),
            }}
          />
          <span className="truncate">Rel: {effectiveFourTier.releaseAcceptance}</span>
        </div>
      </div>

      <div className="mt-1.5 font-mono text-[9px] text-[#10B981] truncate">
        Honesty: {effectiveFourTier.honestyLabel}
      </div>
    </motion.button>
  );
};

interface DependencyEdgeProps {
  edges: DependencyEdgeItem[];
  nodes: BlueprintNodeItem[];
  selectedNodeId: string;
}

/**
 * DependencyEdge.tsx:
 * Static truthful SVG dependency edges without fake continuous flow animations.
 */
export const DependencyEdgeSvg: React.FC<DependencyEdgeProps> = ({
  edges,
  nodes,
  selectedNodeId,
}) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        const isHighlighted =
          edge.from === selectedNodeId || edge.to === selectedNodeId;
        return (
          <g key={edge.id}>
            <line
              x1={fromNode.position2D.x}
              y1={fromNode.position2D.y}
              x2={toNode.position2D.x}
              y2={toNode.position2D.y}
              stroke={isHighlighted ? '#38BDF8' : 'rgba(148, 163, 184, 0.28)'}
              strokeWidth={isHighlighted ? '0.45' : '0.25'}
            />
          </g>
        );
      })}
    </svg>
  );
};

interface BlueprintMapProps {
  nodes: BlueprintNodeItem[];
  edges: DependencyEdgeItem[];
  selectedNodeId: string;
  viewMode: 'map' | 'list';
  nodeOverrides?: Partial<Record<string, Partial<FourTierState>>>;
  onSelectNode: (nodeId: string) => void;
  onToggleViewMode: (mode: 'map' | 'list') => void;
}

export const BlueprintMap: React.FC<BlueprintMapProps> = ({
  nodes,
  edges,
  selectedNodeId,
  viewMode,
  nodeOverrides,
  onSelectNode,
  onToggleViewMode,
}) => {
  const resolveTier = (node: BlueprintNodeItem): FourTierState => {
    const ov = nodeOverrides?.[node.id];
    return ov ? { ...node.fourTier, ...ov } : node.fourTier;
  };

  return (
    <div
      data-testid="blueprint-map-panel"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="cerebro-hud-panel flex flex-col h-full overflow-hidden p-3.5"
    >
      {/* Header & 1-Click Map / Accessible Keyboard List Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[rgba(148,163,184,0.14)] shrink-0">
        <div>
          <div className="font-mono text-[10px] text-[#38BDF8] uppercase">
            BLUEPRINT v0.2 · TASK_REGISTER.md ({nodes.length} NODES)
          </div>
          <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
            Four-Tier Truthful Dependency Topology
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[#05070B] p-1 rounded-lg border border-[rgba(148,163,184,0.18)]">
          <button
            type="button"
            data-testid="blueprint-view-map-btn"
            onClick={() => onToggleViewMode('map')}
            className={`px-2.5 py-1 rounded font-mono text-[10px] transition-colors cursor-pointer ${
              viewMode === 'map'
                ? 'bg-[#38BDF8] text-[#05070B] font-semibold'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Spatial 2D/3D Map
          </button>
          <button
            type="button"
            data-testid="blueprint-view-list-btn"
            onClick={() => onToggleViewMode('list')}
            className={`px-2.5 py-1 rounded font-mono text-[10px] transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#38BDF8] text-[#05070B] font-semibold'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Accessible Keyboard List
          </button>
        </div>
      </div>

      {/* Body: Spatial 2D/3D Map vs Accessible Keyboard List View */}
      {viewMode === 'map' ? (
        <div className="relative flex-1 min-h-[360px] rounded-xl bg-[#05070B]/70 border border-[rgba(148,163,184,0.12)] overflow-auto">
          <div className="relative w-full h-full min-w-[680px] min-h-[380px]">
            <DependencyEdgeSvg
              edges={edges}
              nodes={nodes}
              selectedNodeId={selectedNodeId}
            />
            {nodes.map((node) => (
              <BlueprintNode
                key={node.id}
                node={node}
                effectiveFourTier={resolveTier(node)}
                isSelected={node.id === selectedNodeId}
                onSelect={onSelectNode}
                asMapPin={true}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          role="region"
          aria-label="Accessible Blueprint Task List"
          className="flex-1 overflow-y-auto space-y-2 pr-1"
        >
          {nodes.map((node) => (
            <BlueprintNode
              key={node.id}
              node={node}
              effectiveFourTier={resolveTier(node)}
              isSelected={node.id === selectedNodeId}
              onSelect={onSelectNode}
              asMapPin={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
