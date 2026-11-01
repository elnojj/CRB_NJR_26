import './spatialHealth.css';
import { PROJECTS_DATA, type ProjectHealth } from '../../data/sourceData';
import { COLOUR_TOKENS } from '../../tokens/colours';
import {
  selectIndexedRegisterRecordCount,
  selectOpenRegisterWorkCount,
  selectProjectsByHealth,
} from '../../data/projectPlanModel';

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

  const cards = [
    {
      id: 'pulse',
      kicker: 'Register pulse',
      title: 'Portfolio health',
      metric: `${onTrack}`,
      sub: `${onTrack} on track · ${PROJECTS_DATA.length} live programmes`,
      colour: COLOUR_TOKENS.healthOnTrack,
      className: 'is-gold',
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
      onActivate: () => onOpenFilteredProjects?.('all'),
    },
  ];

  return (
    <div className="disk-ar-stage" data-testid="disk-ar-health-dashboard" aria-label="Desk AR health dashboard">
      <div className="disk-ar-plane">
        <div className="disk-ar-desk" aria-hidden="true" />
        <div className="disk-ar-dust" aria-hidden="true" />
        <div className="disk-ar-orb" style={{ width: 72, height: 72, top: '12%', right: '18%' }} />
        <div className="disk-ar-orb ice" style={{ width: 48, height: 48, bottom: '18%', left: '28%' }} />

        {cards.map((card, idx) => {
          const layout = CARD_LAYOUT.find((c) => c.id === card.id)!;
          return (
            <button
              key={card.id}
              type="button"
              className={`disk-ar-card ${card.className}${idx < 2 ? ' is-priority' : ' is-secondary'}`}
              style={{
                top: layout.top,
                left: layout.left,
                width: layout.width,
                zIndex: layout.z,
                transform: layout.tilt,
                animationDelay: `${40 + idx * 70}ms`,
              }}
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
          );
        })}
      </div>
    </div>
  );
}
