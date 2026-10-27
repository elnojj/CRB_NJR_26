/**
 * CEREBRO + CDE — Locked Colour Token Registry
 * Source of Truth:
 * - Master Instruction v2 (23 Oct 2026)
 * - 01_CEREBRO_KB_HANDOFF_2026-10-21 (§4 Locked decisions & §7 Panel system)
 * - 02_CEREBRO_BLUEPRINT_RASMA_v0.2_DRAFT.pdf (p.2 & p.23 NASAQ / MADAR tokens)
 * - 04_WF09 / WF10 SVGs
 *
 * LOCKS:
 * - Forbidden: purple/violet anywhere.
 * - Forbidden: error red (#FF5666) for anything except real system errors.
 * - Project health uses station/UI colours, never red.
 */

export const COLOUR_TOKENS = {
  // Core Canvas & Glass
  canvas: '#101D27',
  fieldInner: '#1B3444',
  fieldOuter: '#05090E',
  glassHex: '#142632',
  glassRgba: 'rgba(20, 38, 50, 0.88)',
  glassPocketRgba: 'rgba(16, 29, 39, 0.86)',

  // Typography & Outlines
  textPrimary: '#F2F6F8', // Ice / white = "Owner only" and neutral primary text
  textSecondary: '#BDCBD3',
  textCoord: '#D0DCE3',
  outlineControl: 'rgba(255, 255, 255, 0.40)', // 1px white 40%: 3.77:1 on canvas, 3.68:1 on glass

  // Global UI & Focus
  cobaltAccent: '#4C8DFF', // Global UI accent (buttons, focus, voice card), with #101D27 labels
  cobaltLabel: '#101D27',
  focusRing: '#65ACFF',
  sphereWireframe: '#B4DDFF',

  // Voice Orb (Teal ramp v100-v700)
  voiceOrbTeal: '#3FD0E0',
  voiceOrbMint: '#9AFFE0',
  voiceOrbStroke: '#78D3B2',
  voiceOrbDeep: '#133A44',

  // Cerebro HQ — 5 Primary Stations (01 KB Handoff §7 + Master Instruction)
  stationProjects: '#3D8BFF', // Portfolio / Projects station
  stationProjectDetail: '#FF7A59', // Project page (9 tabs)
  stationTasks: '#B8F04A', // Task board + detail
  stationPeople: '#E6A2B4', // LOCKED People station
  stationFiles: '#3DDC97', // Drive files station
  stationMedia: '#F2B66D', // LOCKED Media station (amber)

  // Additional Panel Tokens from 01 KB Handoff §7
  panelInsights: '#FFD54A', // LOCKED flat panel colour
  panelBriefing: '#FFB38A', // Morning briefing
  panelGmail: '#FF6FA0', // Gmail
  panelCalendar: '#54D2FF', // Calendar
  panelFileViewer: '#E8D5A8', // File viewer
  panelCrewAgents: '#3FD0E0', // Crew agents (max 4)
  panelBaghira: '#F4F4F0', // Baghira
  panelKinzo: '#7FB34A', // Kinzo
  panelSettings: '#9AA7B2', // Settings (General, Camera, Hands)
  panelGateLoader: '#C9D3DC', // Gate + loader

  // CDE Sphere — 4 Universe Dimensions
  // Note: 08 Design system file is listed under MISSING; mapped strictly from existing locked/proposed tokens in 01 KB Handoff without inventing new colours
  cdeStrategy: '#3D8BFF', // Dimension 01: Creative Strategy & Experience Design
  cdeProduction: '#FF7A59', // Dimension 02: Production Leadership & Activations
  cdeTalent: '#E6A2B4', // Dimension 03: Talent, Culture & Multidisciplinary Practice
  cdeMediaTech: '#3DDC97', // Dimension 04: Media Technology & Execution Intelligence (NJR+)

  // Project Health Tokens (Station/UI colours ONLY — NEVER red #FF5666)
  healthOnTrack: '#3DDC97', // Files/Systems emerald green
  healthAtRisk: '#F2B66D', // Media amber
  healthBlocked: '#4C8DFF', // Global UI Cobalt (with square-slash icon + text label, never red)

  // Real System Error ONLY (Orb state 08 / network failure)
  systemErrorRed: '#FF5666',
} as const;

export type StationId = 'projects' | 'tasks' | 'people' | 'files' | 'media';
export type CdeDimensionId = 'strategy' | 'production' | 'talent' | 'mediatech';

export interface ColourTableRow {
  entity: string;
  category: 'Core UI' | 'Cerebro Station' | 'Cerebro Panel' | 'CDE Dimension' | 'Project Health' | 'System Error';
  token: keyof typeof COLOUR_TOKENS;
  hex: string;
  sourceFile: string;
  status: 'LOCKED' | 'PROPOSED (01 KB)' | 'MAPPED (08 MISSING)';
}

export const COLOUR_TABLE: ColourTableRow[] = [
  { entity: 'Canvas Ground', category: 'Core UI', token: 'canvas', hex: COLOUR_TOKENS.canvas, sourceFile: '02 Blueprint p.2 & Master v2', status: 'LOCKED' },
  { entity: 'Liquid Glass Surface (88%)', category: 'Core UI', token: 'glassHex', hex: COLOUR_TOKENS.glassHex, sourceFile: '02 Blueprint p.2 & Master v2', status: 'LOCKED' },
  { entity: 'Primary Text / Owner Only (Ice)', category: 'Core UI', token: 'textPrimary', hex: COLOUR_TOKENS.textPrimary, sourceFile: '02 Blueprint p.2 & Master v2', status: 'LOCKED' },
  { entity: 'Secondary Text', category: 'Core UI', token: 'textSecondary', hex: COLOUR_TOKENS.textSecondary, sourceFile: '02 Blueprint p.2 & Master v2', status: 'LOCKED' },
  { entity: 'Global UI Accent (Cobalt)', category: 'Core UI', token: 'cobaltAccent', hex: COLOUR_TOKENS.cobaltAccent, sourceFile: '02 Blueprint p.2 & Master v2', status: 'LOCKED' },
  { entity: 'Focus Ring', category: 'Core UI', token: 'focusRing', hex: COLOUR_TOKENS.focusRing, sourceFile: '02 Blueprint p.2 & p.23', status: 'LOCKED' },
  { entity: 'Sphere Wireframe & Rim', category: 'Core UI', token: 'sphereWireframe', hex: COLOUR_TOKENS.sphereWireframe, sourceFile: '04 WF09 / WF10 SVG', status: 'LOCKED' },
  { entity: 'Voice Orb (Teal v500)', category: 'Core UI', token: 'voiceOrbTeal', hex: COLOUR_TOKENS.voiceOrbTeal, sourceFile: '01 KB Handoff §4 & §7 #1', status: 'LOCKED' },
  { entity: 'Projects Station (HQ)', category: 'Cerebro Station', token: 'stationProjects', hex: COLOUR_TOKENS.stationProjects, sourceFile: '01 KB Handoff §7 #2', status: 'PROPOSED (01 KB)' },
  { entity: 'Tasks Station (HQ)', category: 'Cerebro Station', token: 'stationTasks', hex: COLOUR_TOKENS.stationTasks, sourceFile: '01 KB Handoff §7 #4', status: 'PROPOSED (01 KB)' },
  { entity: 'People Station (HQ)', category: 'Cerebro Station', token: 'stationPeople', hex: COLOUR_TOKENS.stationPeople, sourceFile: '01 KB Handoff §7 #12', status: 'LOCKED' },
  { entity: 'Files Station (HQ)', category: 'Cerebro Station', token: 'stationFiles', hex: COLOUR_TOKENS.stationFiles, sourceFile: '01 KB Handoff §7 #9', status: 'PROPOSED (01 KB)' },
  { entity: 'Media Station (HQ)', category: 'Cerebro Station', token: 'stationMedia', hex: COLOUR_TOKENS.stationMedia, sourceFile: '01 KB Handoff §4, §7 #10 & Master v2', status: 'LOCKED' },
  { entity: 'Project Detail Workspace', category: 'Cerebro Panel', token: 'stationProjectDetail', hex: COLOUR_TOKENS.stationProjectDetail, sourceFile: '01 KB Handoff §7 #3', status: 'PROPOSED (01 KB)' },
  { entity: 'Insight Cards', category: 'Cerebro Panel', token: 'panelInsights', hex: COLOUR_TOKENS.panelInsights, sourceFile: '01 KB Handoff §4 & §7 #5', status: 'LOCKED' },
  { entity: 'Morning Briefing', category: 'Cerebro Panel', token: 'panelBriefing', hex: COLOUR_TOKENS.panelBriefing, sourceFile: '01 KB Handoff §7 #6', status: 'PROPOSED (01 KB)' },
  { entity: 'Gmail Feed', category: 'Cerebro Panel', token: 'panelGmail', hex: COLOUR_TOKENS.panelGmail, sourceFile: '01 KB Handoff §7 #7', status: 'PROPOSED (01 KB)' },
  { entity: 'Calendar Feed', category: 'Cerebro Panel', token: 'panelCalendar', hex: COLOUR_TOKENS.panelCalendar, sourceFile: '01 KB Handoff §7 #8', status: 'PROPOSED (01 KB)' },
  { entity: 'File Viewer', category: 'Cerebro Panel', token: 'panelFileViewer', hex: COLOUR_TOKENS.panelFileViewer, sourceFile: '01 KB Handoff §7 #11', status: 'PROPOSED (01 KB)' },
  { entity: 'Crew Agents (Max 4)', category: 'Cerebro Panel', token: 'panelCrewAgents', hex: COLOUR_TOKENS.panelCrewAgents, sourceFile: '01 KB Handoff §7 #13', status: 'PROPOSED (01 KB)' },
  { entity: 'Baghira Planner', category: 'Cerebro Panel', token: 'panelBaghira', hex: COLOUR_TOKENS.panelBaghira, sourceFile: '01 KB Handoff §7 #14', status: 'PROPOSED (01 KB)' },
  { entity: 'Kinzo Crew Controller', category: 'Cerebro Panel', token: 'panelKinzo', hex: COLOUR_TOKENS.panelKinzo, sourceFile: '01 KB Handoff §7 #15', status: 'PROPOSED (01 KB)' },
  { entity: 'Settings (General, Camera, Hands)', category: 'Cerebro Panel', token: 'panelSettings', hex: COLOUR_TOKENS.panelSettings, sourceFile: '01 KB Handoff §7 #16', status: 'PROPOSED (01 KB)' },
  { entity: 'Gate + Loader', category: 'Cerebro Panel', token: 'panelGateLoader', hex: COLOUR_TOKENS.panelGateLoader, sourceFile: '01 KB Handoff §7 #17', status: 'PROPOSED (01 KB)' },
  { entity: 'CDE Dim 01: Creative Strategy', category: 'CDE Dimension', token: 'cdeStrategy', hex: COLOUR_TOKENS.cdeStrategy, sourceFile: '05 SEVEN 01 + 01 KB §7 #2 (08 MISSING)', status: 'MAPPED (08 MISSING)' },
  { entity: 'CDE Dim 02: Production Leadership', category: 'CDE Dimension', token: 'cdeProduction', hex: COLOUR_TOKENS.cdeProduction, sourceFile: '05 SEVEN 01 + 01 KB §7 #3 (08 MISSING)', status: 'MAPPED (08 MISSING)' },
  { entity: 'CDE Dim 03: Talent & Culture', category: 'CDE Dimension', token: 'cdeTalent', hex: COLOUR_TOKENS.cdeTalent, sourceFile: '05 SEVEN 01 + 01 KB §7 #12 (08 MISSING)', status: 'MAPPED (08 MISSING)' },
  { entity: 'CDE Dim 04: Media Technology (NJR+)', category: 'CDE Dimension', token: 'cdeMediaTech', hex: COLOUR_TOKENS.cdeMediaTech, sourceFile: '05 SEVEN 01 + 01 KB §7 #9 (08 MISSING)', status: 'MAPPED (08 MISSING)' },
  { entity: 'Health: On Track', category: 'Project Health', token: 'healthOnTrack', hex: COLOUR_TOKENS.healthOnTrack, sourceFile: 'Master v2 (Station/UI colour, never red)', status: 'LOCKED' },
  { entity: 'Health: At Risk', category: 'Project Health', token: 'healthAtRisk', hex: COLOUR_TOKENS.healthAtRisk, sourceFile: 'Master v2 (Station/UI colour, never red)', status: 'LOCKED' },
  { entity: 'Health: Blocked', category: 'Project Health', token: 'healthBlocked', hex: COLOUR_TOKENS.healthBlocked, sourceFile: 'Master v2 (Cobalt UI token, never red)', status: 'LOCKED' },
  { entity: 'System Error (Orb 08 ONLY)', category: 'System Error', token: 'systemErrorRed', hex: COLOUR_TOKENS.systemErrorRed, sourceFile: '02 Blueprint p.2 & Master v2', status: 'LOCKED' },
];
