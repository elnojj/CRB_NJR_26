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
      } p-2.5 rounded-lg text-left transition-colors cursor-pointer border ${
        isSelected
          ? 'bg-[rgba(20,38,50,0.88)] border-[#65ACFF] shadow-[0_0_20px_rgba(101,172,255,0.22)]'
          : 'bg-[rgba(20,38,50,0.72)] border-[rgba(180,221,255,0.16)] hover:border-[#65ACFF]'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className="font-mono tabular-nums text-[10px] font-semibold text-[#4C8DFF]">
          {node.code}
        </span>
        <span className="font-mono tabular-nums text-[9px] text-[#BDCBD3]">
          {owner.callsign} · {node.criteriaVerified}/{node.criteriaTotal}
        </span>
      </div>

      <div className="font-display text-xs font-semibold text-[#F2F6F8] line-clamp-1 mb-1.5">
        {node.title}
      </div>

      {/* 4-Tier Truthful Status Dots + Text (Never collapsed into "Done") */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono tabular-nums text-[9px] text-[#BDCBD3] border-t border-[rgba(255,255,255,0.14)] pt-1.5">
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

      <div className="mt-1.5 font-mono tabular-nums text-[9px] text-[#36E88D] truncate">
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
              stroke={isHighlighted ? '#65ACFF' : 'rgba(180, 221, 255, 0.24)'}
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
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[rgba(255,255,255,0.14)] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4C8DFF] shrink-0" />
            <h2 className="font-display text-xs font-semibold tracking-[0.08em] uppercase text-[#F2F6F8]">
              BLUEPRINT v0.2 ·Four-Tier Topology
            </h2>
          </div>
          <div className="font-mono tabular-nums text-[10px] text-[#BDCBD3] pl-4 mt-0.5">
            TASK_REGISTER.md ({nodes.length} NODES)
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#101D27] p-1 rounded-lg border border-[rgba(180,221,255,0.16)]">
          <button
            type="button"
            data-testid="blueprint-view-map-btn"
            onClick={() => onToggleViewMode('map')}
            className={`px-2.5 py-1 rounded font-mono text-[10px] transition-colors cursor-pointer ${
              viewMode === 'map'
                ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
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
                ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
            }`}
          >
            Accessible Keyboard List
          </button>
        </div>
      </div>

      {/* Body: Spatial 2D/3D Map vs Accessible Keyboard List View */}
      {viewMode === 'map' ? (
        <div className="relative flex-1 min-h-[360px] rounded-lg bg-[#101D27]/75 border border-[rgba(180,221,255,0.16)] overflow-auto">
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
