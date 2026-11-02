import { useState } from 'react';
import './spatialHealth.css';
import { PROJECTS_DATA, type ProjectHealth } from '../../data/sourceData';
import { COLOUR_TOKENS } from '../../tokens/colours';
import {
  selectIndexedRegisterRecordCount,
  selectOpenRegisterWorkCount,
  selectProjectsByHealth,
} from '../../data/projectPlanModel';
import { VectorExpandShape, type VectorExpandTone } from '../chrome/VectorExpandShape';

function healthColour(health: ProjectHealth): string {
  if (health === 'On track') return COLOUR_TOKENS.healthOnTrack;
  if (health === 'At risk') return COLOUR_TOKENS.healthAtRisk;
  return COLOUR_TOKENS.healthBlocked;
}

const CARD_LAYOUT: Array<{
  id: string;
  top: string;
  left: string;
  width: string;
  z: number;
  tilt: string;
}> = [
  { id: 'pulse', top: '8%', left: '6%', width: '240px', z: 40, tilt: 'translateZ(36px) rotateY(6deg)' },
  { id: 'risk', top: '22%', left: '38%', width: '220px', z: 55, tilt: 'translateZ(64px) rotateY(-4deg)' },
  { id: 'blocked', top: '48%', left: '10%', width: '230px', z: 48, tilt: 'translateZ(28px) rotateX(-4deg)' },
  { id: 'load', top: '58%', left: '42%', width: '250px', z: 42, tilt: 'translateZ(52px) rotateY(8deg)' },
];

export function DiskArHealthDashboard({
  onSelectProject,
  onOpenFilteredProjects,
}: {
  onSelectProject?: (projectId: string) => void;
  onOpenFilteredProjects?: (filter: 'all' | 'onTrack' | 'attention', projectId?: string) => void;
}) {
  const onTrack = selectProjectsByHealth('onTrack').length;
  const attention = selectProjectsByHealth('attention');
  const blocked = PROJECTS_DATA.filter((p) => p.health === 'Blocked').length;
  const atRisk = PROJECTS_DATA.filter((p) => p.health === 'At risk').length;
  const openWork = selectOpenRegisterWorkCount();
  const indexed = selectIndexedRegisterRecordCount();
  const spotlight = attention[0] || PROJECTS_DATA[0];

  // Always start collapsed — expand only when the vector ship is tapped.
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const cards: Array<{
    id: string;
    kicker: string;
    title: string;
    metric: string;
    sub: string;
    colour: string;
    className: string;
    tone: VectorExpandTone;
    onActivate: () => void;
  }> = [
    {
      id: 'pulse',
      kicker: 'Register pulse',
      title: 'Portfolio health',
      metric: `${onTrack}`,
      sub: `${onTrack} on track · ${PROJECTS_DATA.length} live programmes`,
      colour: COLOUR_TOKENS.healthOnTrack,
      className: 'is-gold',
      tone: 'gold',
      onActivate: () => onOpenFilteredProjects?.('onTrack'),
    },
    {
      id: 'risk',
      kicker: 'Attention',
      title: spotlight.name,
      metric: `${spotlight.progress}%`,
      sub: spotlight.healthNote.slice(0, 92),
      colour: healthColour(spotlight.health),
      className: spotlight.health === 'Blocked' ? 'is-urgent' : 'is-gold',
      tone: spotlight.health === 'Blocked' ? 'alert' : 'gold',
      onActivate: () => {
        onOpenFilteredProjects?.('attention', spotlight.id);
        onSelectProject?.(spotlight.id);
      },
    },
    {
      id: 'blocked',
      kicker: 'Gates',
      title: 'Blocked / at risk',
      metric: `${blocked + atRisk}`,
      sub: `${blocked} blocked · ${atRisk} at risk needing Owner 39`,
      colour: blocked > 0 ? COLOUR_TOKENS.healthBlocked : COLOUR_TOKENS.healthAtRisk,
      className: blocked > 0 ? 'is-urgent' : '',
      tone: blocked > 0 ? 'alert' : 'neutral',
      onActivate: () => onOpenFilteredProjects?.('attention'),
    },
    {
      id: 'load',
      kicker: 'Throughput',
      title: 'Open register work',
      metric: `${openWork.count}`,
      sub: `Sum of openTaskCount (as of ${openWork.asOf}) · indexed rows ${indexed.count}`,
      colour: '#B4DDFF',
      className: '',
      tone: 'ice',
      onActivate: () => onOpenFilteredProjects?.('all'),
    },
  ];

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="disk-ar-stage" data-testid="disk-ar-health-dashboard" aria-label="Desk AR health dashboard">
      <div className="disk-ar-plane">
        <div className="disk-ar-desk" aria-hidden="true" />
        <div className="disk-ar-dust" aria-hidden="true" />
        <div className="disk-ar-orb" style={{ width: 72, height: 72, top: '12%', right: '18%' }} />
        <div className="disk-ar-orb ice" style={{ width: 48, height: 48, bottom: '18%', left: '28%' }} />

        <div className="disk-ar-vector-dock" data-testid="disk-ar-vector-dock">
          {cards.map((card, idx) => {
            const expanded = Boolean(expandedIds[card.id]);
            const layout = CARD_LAYOUT.find((c) => c.id === card.id)!;
            return (
              <div
                key={card.id}
                className={`disk-ar-panel-slot${idx < 2 ? ' is-priority' : ' is-secondary'}${
                  expanded ? ' is-expanded' : ' is-collapsed'
                }`}
                style={{
                  top: layout.top,
                  left: layout.left,
                  width: layout.width,
                  zIndex: layout.z,
                  ['--disk-tilt' as string]: layout.tilt,
                  animationDelay: `${40 + idx * 70}ms`,
                }}
              >
                <VectorExpandShape
                  label={card.kicker}
                  metric={card.metric}
                  tone={card.tone}
                  expanded={expanded}
                  onToggle={() => toggleExpanded(card.id)}
                  testId={`vector-expand-${card.id}`}
                />
                {expanded ? (
                  <button
                    type="button"
                    className={`disk-ar-card ${card.className}`}
                    onClick={() => card.onActivate()}
                  >
                    <div className="disk-ar-sheen" aria-hidden="true" />
                    <div className="disk-ar-kicker">
                      <span className="disk-ar-dot" style={{ backgroundColor: card.colour }} />
                      {card.kicker}
                    </div>
                    <div className="disk-ar-title">{card.title}</div>
                    <div className="disk-ar-metric" style={{ color: card.colour }}>
                      {card.metric}
                    </div>
                    <div className="disk-ar-sub">{card.sub}</div>
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
