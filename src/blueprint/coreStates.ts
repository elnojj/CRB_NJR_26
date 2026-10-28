/**
 * Blueprint v2.0 — 14 core navigation states.
 * Maps child screens (A1…PM5) onto a single typed model while preserving
 * existing GuiCanonicalScreenId (S01–S09) and tour S01–S18 contracts.
 */

export const BLUEPRINT_CORE_STATES = [
  'access',
  'arrival',
  'home',
  'portfolio',
  'health',
  'project',
  'tasks',
  'files',
  'voice',
  'crew',
  'connected',
  'media',
  'safety',
  'settings',
] as const;

export type BlueprintCoreState = (typeof BLUEPRINT_CORE_STATES)[number];

export interface BlueprintCoreStateSpec {
  id: BlueprintCoreState;
  title: string;
  /** Existing GUI canonical screen when applicable */
  guiScreen?: 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06' | 'S07' | 'S08' | 'S09';
  /** Primary runtime panel id when this core state opens a work surface */
  defaultPanelId?: string | null;
  description: string;
}

export const BLUEPRINT_CORE_STATE_SPECS: Record<BlueprintCoreState, BlueprintCoreStateSpec> = {
  access: {
    id: 'access',
    title: 'Owner Gate + Loader',
    guiScreen: 'S01',
    defaultPanelId: null,
    description: 'Numeric owner verification and readiness-driven boot; no private records before auth.',
  },
  arrival: {
    id: 'arrival',
    title: 'Arrival',
    guiScreen: 'S01',
    defaultPanelId: null,
    description: 'Post-boot HQ arrival with persistent Cerebro participant visible.',
  },
  home: {
    id: 'home',
    title: 'Home Layout',
    guiScreen: 'S01',
    defaultPanelId: 'briefing',
    description: 'Shared spatial shell: world + assistant + work surface.',
  },
  portfolio: {
    id: 'portfolio',
    title: 'Portfolio',
    guiScreen: 'S03',
    defaultPanelId: 'portfolio',
    description: 'Project sphere, stations, and portfolio table over register data.',
  },
  health: {
    id: 'health',
    title: 'Health + Operations',
    guiScreen: 'S05',
    defaultPanelId: 'insights',
    description: 'Numerator/denominator health, decisions, timeline, blockers, activity.',
  },
  project: {
    id: 'project',
    title: 'Project Workspace',
    guiScreen: 'S05',
    defaultPanelId: 'project-detail',
    description: 'Constellation, project page, create/edit, archive/restore.',
  },
  tasks: {
    id: 'tasks',
    title: 'Tasks',
    guiScreen: 'S05',
    defaultPanelId: 'tasks',
    description: 'Task board and task detail with revision-backed status changes.',
  },
  files: {
    id: 'files',
    title: 'Files',
    guiScreen: 'S05',
    defaultPanelId: 'files',
    description: 'Folder constellation and file viewer over Drive/source adapters.',
  },
  voice: {
    id: 'voice',
    title: 'Voice + Input',
    guiScreen: 'S06',
    defaultPanelId: null,
    description: 'Persistent ElevenLabs session, captions, result cards, hand input.',
  },
  crew: {
    id: 'crew',
    title: 'Crew',
    guiScreen: 'S05',
    defaultPanelId: 'crew',
    description: 'Crew strip/profile and team room; Cerebro is sole speaking assistant.',
  },
  connected: {
    id: 'connected',
    title: 'Connected Workspaces',
    guiScreen: 'S05',
    defaultPanelId: 'gmail',
    description: 'Mail, calendar, YouTube, meeting minutes with real source evidence.',
  },
  media: {
    id: 'media',
    title: 'Media + Spatial Journeys',
    guiScreen: 'S07',
    defaultPanelId: 'media',
    description: 'Gallery, viewers, travel, guided tour, upload/classify.',
  },
  safety: {
    id: 'safety',
    title: 'Safety + Status',
    guiScreen: 'S05',
    defaultPanelId: 'decisions',
    description: 'Two-tap confirmation, status words, charts/numbers, screen states.',
  },
  settings: {
    id: 'settings',
    title: 'Settings + Widgets + Extended',
    guiScreen: 'S08',
    defaultPanelId: 'settings',
    description: 'Settings, widget grid/catalogue, crew/planning/runtime workspaces.',
  },
};
