import { useMemo, useState } from 'react';
import './spatialHealth.css';
import { PEOPLE_DATA, PROJECTS_DATA, type ProjectSummary } from '../../data/sourceData';
import { COLOUR_TOKENS } from '../../tokens/colours';

type ChipNode = {
  id: string;
  label: string;
  kind: 'core' | 'person' | 'role' | 'station';
  x: number;
  y: number;
};

type ChipEdge = {
  from: string;
  to: string;
  tone: 'otp' | 'link' | 'risk';
};

function layoutForProject(project: ProjectSummary): { nodes: ChipNode[]; edges: ChipEdge[] } {
  const cx = 460;
  const cy = 270;
  const crew = PEOPLE_DATA.filter((p) => p.group !== 'HQ' || p.id === 'p-shweekar').slice(0, 6);

  const nodes: ChipNode[] = [
    { id: 'core', label: project.code, kind: 'core', x: cx, y: cy },
    { id: 'owner', label: 'Owner 39', kind: 'role', x: cx, y: cy - 150 },
    { id: 'pmo', label: 'PMO', kind: 'station', x: cx + 170, y: cy - 40 },
    { id: 'media', label: 'Media', kind: 'station', x: cx - 170, y: cy - 20 },
    { id: 'prod', label: 'Production', kind: 'station', x: cx - 130, y: cy + 130 },
    { id: 'talent', label: 'Talent', kind: 'station', x: cx + 140, y: cy + 120 },
  ];

  crew.forEach((person, i) => {
    const a = (i / Math.max(crew.length, 1)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: person.id,
      label: person.name.split('·')[0].trim().slice(0, 14),
      kind: 'person',
      x: cx + Math.cos(a) * 210,
      y: cy + Math.sin(a) * 155,
    });
  });

  const edges: ChipEdge[] = [
    { from: 'core', to: 'owner', tone: 'otp' },
    { from: 'core', to: 'pmo', tone: 'link' },
    { from: 'core', to: 'media', tone: 'link' },
    { from: 'core', to: 'prod', tone: project.health === 'Blocked' ? 'risk' : 'link' },
    { from: 'core', to: 'talent', tone: 'link' },
  ];

  for (const n of nodes) {
    if (n.kind === 'person') {
      edges.push({
        from: 'core',
        to: n.id,
        tone: project.health === 'At risk' ? 'risk' : 'otp',
      });
    }
  }

  return { nodes, edges };
}

export function ProjectNodeChipsChart({
  projectId,
  onClose,
  onSelectRelated,
}: {
  projectId: string;
  onClose?: () => void;
  onSelectRelated?: (projectId: string) => void;
}) {
  const project = PROJECTS_DATA.find((p) => p.id === projectId) || PROJECTS_DATA[0];
  const { nodes, edges } = useMemo(() => layoutForProject(project), [project]);
  const [activeId, setActiveId] = useState('core');
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div
      className="node-chips-stage"
      data-testid="project-node-chips-chart"
      aria-label={`${project.name} relationship map`}
    >
      <div className="node-chips-frame">
        <div className="node-chips-header">
          <div>
            <div className="node-chips-title">{project.name}</div>
            <div className="node-chips-meta">
              {project.health} · {project.progressLabel} · node-chip map
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {PROJECTS_DATA.slice(0, 4).map((p) => (
              <button
                key={p.id}
                type="button"
                className="node-chips-close"
                style={{
                  borderColor:
                    p.id === project.id ? COLOUR_TOKENS.cobaltAccent : 'rgba(180,221,255,0.28)',
                }}
                onClick={() => onSelectRelated?.(p.id)}
              >
                {p.code}
              </button>
            ))}
            <button type="button" className="node-chips-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <svg className="node-chips-svg" viewBox="0 0 920 520" role="img">
          <defs>
            <radialGradient id="chipGlow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="rgba(180,221,255,0.16)" />
              <stop offset="100%" stopColor="rgba(3,6,12,0)" />
            </radialGradient>
            <filter id="chipSoft" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="920" height="520" fill="url(#chipGlow)" />

          {edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const stroke =
              e.tone === 'risk'
                ? COLOUR_TOKENS.systemErrorRed
                : e.tone === 'otp'
                  ? '#F2B6C8'
                  : '#B4DDFF';
            return (
              <g key={`${e.from}-${e.to}-${i}`} className="node-edge" filter="url(#chipSoft)">
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeWidth={e.tone === 'otp' ? 2.4 : 1.5}
                  strokeOpacity={0.72}
                />
                <circle
                  cx={(a.x + b.x) / 2}
                  cy={(a.y + b.y) / 2}
                  r={3.2}
                  fill={stroke}
                  opacity={0.85}
                />
              </g>
            );
          })}

          {nodes.map((n) => (
            <g
              key={n.id}
              className={`node-chip${n.kind === 'core' ? ' is-core' : ''}${activeId === n.id ? ' is-active' : ''}`}
              transform={`translate(${n.x}, ${n.y})`}
              onClick={() => setActiveId(n.id)}
            >
              <circle className="chip-shadow" r={34} />
              <circle className="chip-ring" r={28} />
              <circle
                className="chip-fill"
                r={22}
                fill={
                  n.kind === 'core'
                    ? 'rgba(212,175,55,0.22)'
                    : n.kind === 'person'
                      ? 'rgba(101,172,255,0.18)'
                      : 'rgba(180,221,255,0.1)'
                }
              />
              <text textAnchor="middle" y={4}>
                {n.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="node-chips-legend">
          <span>
            <i style={{ background: '#F2B6C8' }} /> Primary link
          </span>
          <span>
            <i style={{ background: '#B4DDFF' }} /> Station
          </span>
          <span>
            <i style={{ background: COLOUR_TOKENS.systemErrorRed }} /> Risk path
          </span>
          <span>
            <i style={{ background: COLOUR_TOKENS.cobaltAccent }} /> Project core
          </span>
        </div>
      </div>
    </div>
  );
}
