import { useEffect, useMemo, useRef, useState } from 'react';
import './interactiveProjectPlan.css';
import { PROJECTS_DATA } from '../../data/sourceData';
import {
  buildPlanGraph,
  layoutPlanGraph,
  personById,
  registerRecordById,
  type LaidOutNode,
  type PlanNode,
  type PlanViewId,
} from '../../data/projectPlanModel';

type HistorySnap = {
  projectId: string;
  view: PlanViewId;
  expandedWorkstreamId: string | null;
  selectedNodeId: string | null;
  pan: { x: number; y: number };
  zoom: number;
};

export function InteractiveProjectPlan({
  projectId,
  onClose,
  onSelectRelated,
  onOpenPerson,
  onOpenTaskPanel,
}: {
  projectId: string;
  onClose?: () => void;
  onSelectRelated?: (projectId: string) => void;
  onOpenPerson?: (personId: string) => void;
  onOpenTaskPanel?: (recordId: string) => void;
}) {
  const [activeProjectId, setActiveProjectId] = useState(projectId);
  const [view, setView] = useState<PlanViewId>('map');
  const [expandedWorkstreamId, setExpandedWorkstreamId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'blocked'>('all');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<HistorySnap[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 920, h: 520 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    setActiveProjectId(projectId);
    setExpandedWorkstreamId(null);
    setSelectedNodeId(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [projectId]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setStageSize({ w: Math.max(280, cr.width), h: Math.max(240, cr.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graph = useMemo(() => buildPlanGraph(activeProjectId), [activeProjectId]);
  const phone = stageSize.w < 640;

  const laidOut = useMemo(
    () =>
      layoutPlanGraph(graph, {
        width: stageSize.w,
        height: stageSize.h,
        expandedWorkstreamId,
        phone,
      }),
    [graph, stageSize.w, stageSize.h, expandedWorkstreamId, phone]
  );

  const byId = useMemo(() => new Map(laidOut.map((n) => [n.id, n])), [laidOut]);

  const selected = selectedNodeId ? byId.get(selectedNodeId) || graph.nodes.find((n) => n.id === selectedNodeId) : null;

  const pushHistory = () => {
    setHistory((h) => [
      ...h.slice(-19),
      {
        projectId: activeProjectId,
        view,
        expandedWorkstreamId,
        selectedNodeId,
        pan,
        zoom,
      },
    ]);
  };

  const handleBack = () => {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (!prev) {
        onClose?.();
        return h;
      }
      setActiveProjectId(prev.projectId);
      setView(prev.view);
      setExpandedWorkstreamId(prev.expandedWorkstreamId);
      setSelectedNodeId(prev.selectedNodeId);
      setPan(prev.pan);
      setZoom(prev.zoom);
      return h.slice(0, -1);
    });
  };

  const selectNode = (node: PlanNode | LaidOutNode) => {
    pushHistory();
    setSelectedNodeId(node.id);
    if (node.kind === 'workstream') {
      setExpandedWorkstreamId((cur) => (cur === node.id ? null : node.id));
    }
    if ((node.kind === 'person' || node.kind === 'agent') && node.linkedRecordId) {
      onOpenPerson?.(node.linkedRecordId);
    }
    if ((node.kind === 'task' || node.kind === 'milestone') && node.linkedRecordId) {
      onOpenTaskPanel?.(node.linkedRecordId);
    }
  };

  const filteredTasks = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (n.kind !== 'task' && n.kind !== 'milestone') return false;
      if (query && !`${n.label} ${n.status}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (statusFilter === 'open' && !/open|needs|pending/i.test(n.status)) return false;
      if (statusFilter === 'blocked' && !/block|fail|await/i.test(n.status)) return false;
      return true;
    });
  }, [graph.nodes, query, statusFilter]);

  const visibleEdges = useMemo(() => {
    return graph.edges.filter((e) => {
      const a = byId.has(e.from);
      const b = byId.has(e.to);
      return a && b;
    });
  }, [graph.edges, byId]);

  const switcherProjects = PROJECTS_DATA.filter(
    (p) =>
      !switcherQuery ||
      p.name.toLowerCase().includes(switcherQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(switcherQuery.toLowerCase())
  );

  const onPointerDownStage = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-plan-node]')) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMoveStage = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.x),
      y: dragRef.current.panY + (e.clientY - dragRef.current.y),
    });
  };
  const onPointerUpStage = () => {
    dragRef.current = null;
  };

  const onWheelStage = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(1.85, Math.max(0.65, zoom + (e.deltaY > 0 ? -0.08 : 0.08)));
    setZoom(next);
  };

  const fitPlan = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const kindClass = (kind: PlanNode['kind']) => `ipp-node is-${kind}`;

  return (
    <div
      className="ipp-stage"
      data-testid="interactive-project-plan"
      aria-label={`${graph.project.name} project plan`}
    >
      <div className="ipp-frame">
        <header className="ipp-header">
          <div className="ipp-header-main">
            <button type="button" className="ipp-icon-btn" onClick={handleBack} aria-label="Back">
              ← Back
            </button>
            <div className="ipp-title-block">
              <h2 className="ipp-title" dir="auto">
                {graph.project.name}
              </h2>
              <p className="ipp-meta">
                {graph.project.health} · {graph.project.progressLabel} · as of {graph.asOf.slice(0, 10)}
              </p>
            </div>
          </div>
          <div className="ipp-header-actions">
            <div className="ipp-switcher">
              <button
                type="button"
                className="ipp-chip-btn"
                aria-expanded={switcherOpen}
                onClick={() => setSwitcherOpen((v) => !v)}
              >
                Switch project
              </button>
              {switcherOpen && (
                <div className="ipp-switcher-pop" role="listbox">
                  <input
                    type="search"
                    value={switcherQuery}
                    onChange={(e) => setSwitcherQuery(e.target.value)}
                    placeholder="Search projects…"
                    className="ipp-search"
                    aria-label="Search projects"
                  />
                  <div className="ipp-switcher-list">
                    {switcherProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={p.id === activeProjectId}
                        className={`ipp-switcher-item${p.id === activeProjectId ? ' is-active' : ''}`}
                        onClick={() => {
                          pushHistory();
                          setActiveProjectId(p.id);
                          onSelectRelated?.(p.id);
                          setExpandedWorkstreamId(null);
                          setSelectedNodeId(null);
                          setSwitcherOpen(false);
                          fitPlan();
                        }}
                      >
                        <span>{p.code}</span>
                        <span dir="auto">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="ipp-chip-btn is-close" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <nav className="ipp-views" aria-label="Plan views">
          {(['map', 'timeline', 'tasks', 'people'] as PlanViewId[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`ipp-view-btn${view === v ? ' is-active' : ''}`}
              onClick={() => {
                pushHistory();
                setView(v);
              }}
            >
              {v === 'map' ? 'Map' : v === 'timeline' ? 'Timeline' : v === 'tasks' ? 'Tasks' : 'People'}
            </button>
          ))}
        </nav>

        <div className="ipp-toolbar">
          <input
            type="search"
            className="ipp-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            aria-label="Search plan nodes"
          />
          <select
            className="ipp-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="open">Open / needs review</option>
            <option value="blocked">Blocked / awaiting</option>
          </select>
          {view === 'map' && (
            <>
              <button type="button" className="ipp-chip-btn" onClick={fitPlan}>
                Fit plan
              </button>
              <button
                type="button"
                className="ipp-chip-btn"
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  setZoom(1);
                  setExpandedWorkstreamId(null);
                }}
              >
                Reset view
              </button>
            </>
          )}
        </div>

        <div className="ipp-body">
          {view === 'map' && (
            <div
              ref={stageRef}
              className="ipp-map"
              data-testid="project-plan-map"
              onPointerDown={onPointerDownStage}
              onPointerMove={onPointerMoveStage}
              onPointerUp={onPointerUpStage}
              onPointerCancel={onPointerUpStage}
              onWheel={onWheelStage}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-plan-node]')) return;
                setSelectedNodeId(null);
              }}
            >
              <svg
                className="ipp-svg"
                width={stageSize.w}
                height={stageSize.h}
                role="img"
                aria-label="Project relationship map"
              >
                <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  {visibleEdges.map((e) => {
                    const a = byId.get(e.from)!;
                    const b = byId.get(e.to)!;
                    const dim =
                      expandedWorkstreamId &&
                      e.from !== expandedWorkstreamId &&
                      e.to !== expandedWorkstreamId &&
                      a.kind !== 'project' &&
                      b.kind !== 'project';
                    return (
                      <line
                        key={e.id}
                        className={`ipp-edge is-${e.kind}${dim ? ' is-dim' : ''}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                      />
                    );
                  })}
                  {laidOut.map((n) => {
                    if (query && !`${n.label} ${n.status}`.toLowerCase().includes(query.toLowerCase())) {
                      return null;
                    }
                    const dim =
                      expandedWorkstreamId &&
                      n.kind !== 'project' &&
                      n.id !== expandedWorkstreamId &&
                      !n.relationshipIds.includes(expandedWorkstreamId) &&
                      n.kind !== 'task' &&
                      n.kind !== 'milestone' &&
                      n.kind !== 'file';
                    const r =
                      n.kind === 'project' ? 28 : n.kind === 'workstream' ? 22 : n.kind === 'file' ? 14 : 18;
                    return (
                      <g
                        key={n.id}
                        data-plan-node={n.id}
                        className={`${kindClass(n.kind)}${selectedNodeId === n.id ? ' is-selected' : ''}${dim ? ' is-dim' : ''}`}
                        transform={`translate(${n.x}, ${n.y})`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          selectNode(n);
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${n.kind}: ${n.label}`}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            selectNode(n);
                          }
                        }}
                      >
                        <circle className="ipp-hit" r={Math.max(22, r + 8)} />
                        <circle className="ipp-ring" r={r} />
                        <text className="ipp-label" textAnchor="middle" y={r + 16}>
                          {n.label.length > (phone ? 18 : 26) ? `${n.label.slice(0, phone ? 16 : 24)}…` : n.label}
                        </text>
                        {!phone && (
                          <text className="ipp-sublabel" textAnchor="middle" y={r + 30}>
                            {n.kind}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
              <p className="ipp-map-hint">
                Pinch / wheel zoom · drag to pan · tap workstream to expand · empty space clears highlight
              </p>
            </div>
          )}

          {view === 'timeline' && (
            <div className="ipp-list" data-testid="project-plan-timeline">
              {[...graph.nodes]
                .filter((n) => n.kind === 'task' || n.kind === 'milestone')
                .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''))
                .map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`ipp-list-row${selectedNodeId === n.id ? ' is-selected' : ''}`}
                    onClick={() => selectNode(n)}
                  >
                    <span className="ipp-list-date">{(n.updatedAt || '—').slice(0, 10)}</span>
                    <span className="ipp-list-kind">{n.kind}</span>
                    <span className="ipp-list-title" dir="auto">
                      {n.label}
                    </span>
                    <span className="ipp-list-status">{n.status}</span>
                  </button>
                ))}
            </div>
          )}

          {view === 'tasks' && (
            <div className="ipp-list" data-testid="project-plan-tasks">
              {filteredTasks.length === 0 ? (
                <div className="ipp-empty">No tasks match this filter for {graph.project.code}.</div>
              ) : (
                filteredTasks.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`ipp-list-row${selectedNodeId === n.id ? ' is-selected' : ''}`}
                    onClick={() => selectNode(n)}
                  >
                    <span className="ipp-list-kind">{n.kind}</span>
                    <span className="ipp-list-title" dir="auto">
                      {n.label}
                    </span>
                    <span className="ipp-list-status">{n.status}</span>
                    <span className="ipp-list-date">{n.dueAt || 'Due unstated'}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {view === 'people' && (
            <div className="ipp-list" data-testid="project-plan-people">
              {graph.nodes
                .filter((n) => n.kind === 'person' || n.kind === 'agent')
                .map((n) => {
                  const person = personById(n.linkedRecordId);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`ipp-list-row${selectedNodeId === n.id ? ' is-selected' : ''}`}
                      onClick={() => selectNode(n)}
                    >
                      <span className="ipp-list-kind">{n.kind}</span>
                      <span className="ipp-list-title" dir="auto">
                        {n.label}
                      </span>
                      <span className="ipp-list-status">{person?.title || n.status}</span>
                    </button>
                  );
                })}
            </div>
          )}

          {selected && (
            <aside className="ipp-inspector" data-testid="project-plan-inspector" aria-live="polite">
              <div className="ipp-inspector-head">
                <div>
                  <div className="ipp-inspector-kicker">{selected.kind}</div>
                  <h3 className="ipp-inspector-title" dir="auto">
                    {selected.label}
                  </h3>
                </div>
                <button
                  type="button"
                  className="ipp-icon-btn"
                  aria-label="Dismiss inspector"
                  onClick={() => setSelectedNodeId(null)}
                >
                  ×
                </button>
              </div>
              <p className="ipp-inspector-status">{selected.status}</p>
              {selected.detail && (
                <p className="ipp-inspector-body" dir="auto">
                  {selected.detail}
                </p>
              )}
              <dl className="ipp-inspector-meta">
                {selected.dueAt && (
                  <>
                    <dt>Due</dt>
                    <dd>{selected.dueAt}</dd>
                  </>
                )}
                {selected.assigneeId && (
                  <>
                    <dt>Owner</dt>
                    <dd dir="auto">{personById(selected.assigneeId)?.name || selected.assigneeId}</dd>
                  </>
                )}
                {selected.updatedAt && (
                  <>
                    <dt>Updated</dt>
                    <dd>{selected.updatedAt}</dd>
                  </>
                )}
                <dt>Source</dt>
                <dd className="ipp-mono">{selected.sourceRef}</dd>
              </dl>
              {(selected.kind === 'task' || selected.kind === 'milestone') && selected.linkedRecordId && (
                <button
                  type="button"
                  className="ipp-primary-btn"
                  onClick={() => {
                    const rec = registerRecordById(selected.linkedRecordId);
                    if (rec) onOpenTaskPanel?.(rec.id);
                  }}
                >
                  Open register record
                </button>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
