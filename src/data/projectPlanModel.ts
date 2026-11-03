/**
 * Project-plan graph model — derived from shared register / people / RACI records.
 * Counters and relationships must stay consistent with sourceData selectors.
 */

import {
  PEOPLE_DATA,
  PROJECTS_DATA,
  RACI_MATRIX,
  REGISTER_RECORDS,
  type PersonRecord,
  type ProjectSummary,
  type RegisterRecord,
} from './sourceData';

export type PlanNodeKind =
  | 'project'
  | 'workstream'
  | 'task'
  | 'milestone'
  | 'person'
  | 'agent'
  | 'file';

export type PlanViewId = 'map' | 'timeline' | 'tasks' | 'people';

export interface PlanNode {
  id: string;
  kind: PlanNodeKind;
  projectId: string;
  label: string;
  status: string;
  sourceRef: string;
  updatedAt?: string;
  linkedRecordId?: string;
  relationshipIds: string[];
  assigneeId?: string;
  dueAt?: string;
  dependencyIds?: string[];
  reviewerId?: string;
  deliverableIds?: string[];
  workstream?: string;
  detail?: string;
}

export interface PlanEdge {
  id: string;
  from: string;
  to: string;
  kind: 'contains' | 'assigned' | 'depends' | 'raci' | 'evidence';
  label?: string;
}

export interface PlanGraph {
  project: ProjectSummary;
  nodes: PlanNode[];
  edges: PlanEdge[];
  asOf: string;
}

/** Open register work = sum of per-project openTaskCount (portfolio KPI). */
export function selectOpenRegisterWorkCount(): {
  count: number;
  asOf: string;
  definition: string;
} {
  const count = PROJECTS_DATA.reduce((n, p) => n + p.openTaskCount, 0);
  const dates = PROJECTS_DATA.map((p) => p.lastActivity).filter(Boolean);
  return {
    count,
    asOf: dates.sort().at(-1) || 'unknown',
    definition:
      'Sum of openTaskCount across PROJECTS_DATA (register workstreams + SAMPLE rows). Distinct from HQ Tasks station “52 Total” blueprint aggregate.',
  };
}

/** Indexed register snapshot rows currently loaded in app source. */
export function selectIndexedRegisterRecordCount(): {
  count: number;
  asOf: string;
  definition: string;
} {
  const count = REGISTER_RECORDS.length;
  const dates = REGISTER_RECORDS.map((r) => r.updatedAt).sort();
  return {
    count,
    asOf: dates.at(-1) || 'unknown',
    definition:
      'Count of REGISTER_RECORDS rows loaded from the 23 Oct 2026 snapshot subset currently in sourceData.',
  };
}

export function selectProjectsByHealth(filter: 'all' | 'onTrack' | 'attention'): ProjectSummary[] {
  if (filter === 'onTrack') return PROJECTS_DATA.filter((p) => p.health === 'On track');
  if (filter === 'attention')
    return PROJECTS_DATA.filter((p) => p.health === 'At risk' || p.health === 'Blocked');
  return [...PROJECTS_DATA];
}

function personKind(person: PersonRecord): 'person' | 'agent' {
  if (person.subGroup === 'Grok Crew Bots' || person.subGroup === 'Orchestration & Planners') {
    if (person.id === 'p-shweekar' || person.id === 'p-39') return 'person';
    if (person.id === 'p-mhe' || person.id === 'p-khalid') return 'person';
    return 'agent';
  }
  return 'person';
}

function matchPersonId(ownerText: string): string | undefined {
  const lower = ownerText.toLowerCase();
  if (lower.includes('39') || lower.includes('tarek')) return 'p-39';
  if (lower.includes('shweekar')) return 'p-shweekar';
  if (lower.includes('khalid')) return 'p-khalid';
  if (lower.includes('hamdan') || lower.includes('mhe') || lower.includes('abu')) return 'p-mhe';
  if (lower.includes('kr')) return 'p-kr';
  if (lower.includes('cerebro')) return 'p-cerebro';
  if (lower.includes('baghira')) return 'p-baghira';
  if (lower.includes('kinzo')) return 'p-kinzo';
  return undefined;
}

export function recordsForProject(projectId: string): RegisterRecord[] {
  return REGISTER_RECORDS.filter((r) => r.projectId === projectId);
}

export function buildPlanGraph(projectId: string): PlanGraph {
  const project = PROJECTS_DATA.find((p) => p.id === projectId) || PROJECTS_DATA[0];
  const records = recordsForProject(project.id);
  const nodes: PlanNode[] = [];
  const edges: PlanEdge[] = [];

  const projectNodeId = `project:${project.id}`;
  nodes.push({
    id: projectNodeId,
    kind: 'project',
    projectId: project.id,
    label: project.code,
    status: project.health,
    sourceRef: 'PROJECTS_DATA',
    updatedAt: project.lastActivity,
    linkedRecordId: project.id,
    relationshipIds: [],
    detail: project.description,
  });

  const workstreams = [...new Set(records.map((r) => r.workstream))];
  if (workstreams.length === 0) {
    workstreams.push(project.subdomain || 'Register');
  }

  for (const ws of workstreams) {
    const wsId = `ws:${project.id}:${ws}`;
    const wsRecords = records.filter((r) => r.workstream === ws);
    const openCount = wsRecords.filter((r) => /open|needs|pending/i.test(r.workStatus)).length;
    nodes.push({
      id: wsId,
      kind: 'workstream',
      projectId: project.id,
      label: ws,
      status: openCount > 0 ? `${openCount} open` : wsRecords.length ? 'Tracked' : 'Empty',
      sourceRef: 'REGISTER_RECORDS.workstream',
      updatedAt: wsRecords.map((r) => r.updatedAt).sort().at(-1),
      linkedRecordId: wsRecords[0]?.id,
      relationshipIds: [projectNodeId],
      workstream: ws,
      detail: `${wsRecords.length} register row${wsRecords.length === 1 ? '' : 's'}`,
    });
    edges.push({
      id: `e:${projectNodeId}:${wsId}`,
      from: projectNodeId,
      to: wsId,
      kind: 'contains',
      label: 'workstream',
    });

    for (const rec of wsRecords) {
      const taskId = `task:${rec.id}`;
      const assigneeId = matchPersonId(rec.owner);
      const isMilestone = /deadline|nov|oct|release|eea|framework/i.test(rec.summary);
      nodes.push({
        id: taskId,
        kind: isMilestone ? 'milestone' : 'task',
        projectId: project.id,
        label: rec.summary,
        status: `${rec.workStatus} · ${rec.reviewStatus}`,
        sourceRef: rec.evidenceLocator,
        updatedAt: rec.updatedAt,
        linkedRecordId: rec.id,
        relationshipIds: [wsId],
        assigneeId,
        dueAt: rec.dueText,
        workstream: ws,
        detail: rec.detail,
        deliverableIds: rec.evidenceLocator ? [`file:${rec.id}`] : [],
      });
      edges.push({
        id: `e:${wsId}:${taskId}`,
        from: wsId,
        to: taskId,
        kind: 'contains',
        label: rec.recordType,
      });

      if (assigneeId) {
        edges.push({
          id: `e:${taskId}:${assigneeId}`,
          from: taskId,
          to: `person:${assigneeId}`,
          kind: 'assigned',
          label: 'owner',
        });
      }

      if (rec.evidenceLocator) {
        const fileId = `file:${rec.id}`;
        nodes.push({
          id: fileId,
          kind: 'file',
          projectId: project.id,
          label: rec.evidenceLocator.split(' · ')[0].slice(0, 42),
          status: 'Indexed metadata',
          sourceRef: rec.evidenceLocator,
          updatedAt: rec.updatedAt,
          linkedRecordId: rec.id,
          relationshipIds: [taskId],
          detail: 'Evidence locator from register — availability depends on Drive auth.',
        });
        edges.push({
          id: `e:${taskId}:${fileId}`,
          from: taskId,
          to: fileId,
          kind: 'evidence',
          label: 'evidence',
        });
      }
    }
  }

  const raci = RACI_MATRIX.find((r) => r.projectId === project.id);
  const peopleIds = new Set<string>();
  if (raci) {
    for (const blob of [raci.responsible, raci.accountable, raci.consulted, raci.informed]) {
      const id = matchPersonId(blob);
      if (id) peopleIds.add(id);
    }
  }
  for (const n of nodes) {
    if (n.assigneeId) peopleIds.add(n.assigneeId);
  }
  // Always surface core orchestration identities when present in PEOPLE_DATA
  for (const id of ['p-39', 'p-shweekar', 'p-cerebro', 'p-kr', 'p-baghira', 'p-kinzo']) {
    if (PEOPLE_DATA.some((p) => p.id === id) && (project.id === 'SEVEN' || peopleIds.has(id))) {
      peopleIds.add(id);
    }
  }
  if (project.id === 'BSOCIAL') peopleIds.add('p-khalid');
  if (project.id === 'MHE') peopleIds.add('p-mhe');

  for (const pid of peopleIds) {
    const person = PEOPLE_DATA.find((p) => p.id === pid);
    if (!person) continue;
    const nodeId = `person:${pid}`;
    if (nodes.some((n) => n.id === nodeId)) continue;
    nodes.push({
      id: nodeId,
      kind: personKind(person),
      projectId: project.id,
      label: person.name.split('·')[0].trim(),
      status: person.status,
      sourceRef: 'PEOPLE_DATA',
      linkedRecordId: person.id,
      relationshipIds: [projectNodeId],
      detail: `${person.title} — ${person.notes}`,
    });
    edges.push({
      id: `e:${projectNodeId}:${nodeId}`,
      from: projectNodeId,
      to: nodeId,
      kind: 'raci',
      label: 'linked',
    });
  }

  const asOf =
    records.map((r) => r.updatedAt).sort().at(-1) ||
    project.lastActivity ||
    'unknown';

  return { project, nodes, edges, asOf };
}

export interface LaidOutNode extends PlanNode {
  x: number;
  y: number;
}

/** Deterministic layout — recomputed only when structure / stage size changes. */
export function layoutPlanGraph(
  graph: PlanGraph,
  opts: {
    width: number;
    height: number;
    expandedWorkstreamId: string | null;
    phone: boolean;
  }
): LaidOutNode[] {
  const { width, height, expandedWorkstreamId, phone } = opts;
  const cx = width / 2;
  const cy = phone ? height * 0.38 : height * 0.46;
  const out: LaidOutNode[] = [];

  const projectNode = graph.nodes.find((n) => n.kind === 'project')!;
  out.push({ ...projectNode, x: cx, y: cy });

  const workstreams = graph.nodes.filter((n) => n.kind === 'workstream');
  const wsRadius = phone ? Math.min(width, height) * 0.28 : Math.min(width, height) * 0.32;
  workstreams.forEach((ws, i) => {
    const a = (i / Math.max(workstreams.length, 1)) * Math.PI * 2 - Math.PI / 2;
    out.push({
      ...ws,
      x: cx + Math.cos(a) * wsRadius,
      y: cy + Math.sin(a) * wsRadius * (phone ? 0.85 : 0.72),
    });
  });

  const people = graph.nodes.filter((n) => n.kind === 'person' || n.kind === 'agent');
  const peopleRing = phone ? wsRadius + 56 : wsRadius + 78;
  people.forEach((p, i) => {
    const a = (i / Math.max(people.length, 1)) * Math.PI * 2 + Math.PI / 6;
    out.push({
      ...p,
      x: cx + Math.cos(a) * peopleRing * (phone ? 0.92 : 1),
      y: cy + Math.sin(a) * peopleRing * (phone ? 0.7 : 0.78),
    });
  });

  if (expandedWorkstreamId) {
    const parent = out.find((n) => n.id === expandedWorkstreamId);
    const tasks = graph.nodes.filter(
      (n) =>
        (n.kind === 'task' || n.kind === 'milestone') &&
        n.relationshipIds.includes(expandedWorkstreamId)
    );
    const files = graph.nodes.filter(
      (n) => n.kind === 'file' && tasks.some((t) => n.relationshipIds.includes(t.id))
    );
    const branch = [...tasks, ...files];
    const px = parent?.x ?? cx;
    const py = parent?.y ?? cy;
    const branchR = phone ? 72 : 96;
    branch.forEach((n, i) => {
      const a = (i / Math.max(branch.length, 1)) * Math.PI * 1.4 - Math.PI * 0.7;
      out.push({
        ...n,
        x: px + Math.cos(a) * branchR,
        y: py + Math.sin(a) * branchR + (phone ? 8 : 12),
      });
    });
  }

  // Clamp into stage with padding so labels stay readable
  const pad = phone ? 36 : 48;
  for (const n of out) {
    n.x = Math.min(width - pad, Math.max(pad, n.x));
    n.y = Math.min(height - pad, Math.max(pad + (phone ? 28 : 16), n.y));
  }

  return out;
}

export function personById(id: string | undefined): PersonRecord | undefined {
  if (!id) return undefined;
  return PEOPLE_DATA.find((p) => p.id === id);
}

export function registerRecordById(id: string | undefined): RegisterRecord | undefined {
  if (!id) return undefined;
  return REGISTER_RECORDS.find((r) => r.id === id);
}
