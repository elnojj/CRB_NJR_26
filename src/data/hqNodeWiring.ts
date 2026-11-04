/**
 * HQ has two top-level nodes: Projects and NASA (internal id `people`).
 * Every project-management surface belongs to Projects. NASA owns only the roster surfaces.
 */
export type HqNodeId = 'projects' | 'people';

export type HqPanelWiring = {
  panelId: string;
  label: string;
  role: 'dashboard' | 'pipeline' | 'workflow' | 'reviews' | 'notes' | 'messaging' | 'email' | 'evidence' | 'roster';
  /** Honest status shown next to the button when the surface is not fully connected. */
  caveat?: string;
};

export const HQ_NODE_LABEL: Readonly<Record<HqNodeId, string>> = {
  projects: 'Projects',
  people: 'NASA',
};

export const HQ_TOP_LEVEL_NODES: readonly HqNodeId[] = ['projects', 'people'];

export const HQ_NODE_LINKS: ReadonlyArray<{ a: HqNodeId; b: HqNodeId; relation: string }> = [
  {
    a: 'projects',
    b: 'people',
    relation: 'Projects are staffed and accountable through the NASA roster (RACI).',
  },
];

export const PROJECTS_PANELS: readonly HqPanelWiring[] = [
  { panelId: 'projects', label: 'Projects dashboard', role: 'dashboard' },
  { panelId: 'tasks', label: 'Tasks · pipeline', role: 'pipeline' },
  { panelId: 'timeline', label: 'Timeline · workflow', role: 'workflow' },
  { panelId: 'roadmap', label: 'Roadmap', role: 'workflow' },
  { panelId: 'decisions', label: 'Reviews · approvals', role: 'reviews' },
  { panelId: 'minutes', label: 'Meeting notes', role: 'notes' },
  { panelId: 'team-room', label: 'Team messaging', role: 'messaging' },
  { panelId: 'gmail', label: 'Email', role: 'email', caveat: 'Drafts only, no mailbox connected' },
  { panelId: 'briefing', label: 'Briefing', role: 'dashboard' },
  { panelId: 'insights', label: 'Insights', role: 'dashboard' },
  { panelId: 'files', label: 'Files', role: 'evidence' },
  { panelId: 'media', label: 'Media', role: 'evidence' },
];

export const NASA_PANELS: readonly HqPanelWiring[] = [
  { panelId: 'people', label: 'NASA roster · RACI', role: 'roster' },
  { panelId: 'crew', label: 'Crew', role: 'roster' },
  { panelId: 'kinzo', label: 'Kinzo', role: 'roster' },
  { panelId: 'baghira', label: 'Baghira', role: 'roster' },
];

const PANEL_OWNER: ReadonlyMap<string, HqNodeId> = new Map<string, HqNodeId>([
  ...PROJECTS_PANELS.map((p) => [p.panelId, 'projects'] as [string, HqNodeId]),
  ...NASA_PANELS.map((p) => [p.panelId, 'people'] as [string, HqNodeId]),
]);

/** HQ node a panel is wired to, or null when the panel is not an HQ node surface. */
export function hqOwnerOfPanel(panelId: string): HqNodeId | null {
  return PANEL_OWNER.get(panelId) ?? null;
}

export function panelsForHqNode(node: HqNodeId): readonly HqPanelWiring[] {
  return node === 'projects' ? PROJECTS_PANELS : NASA_PANELS;
}
