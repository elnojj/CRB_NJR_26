export type ColourStatus = 'CONFIRMED' | 'PROPOSED — NEEDS SIGN-OFF';

export interface ColourTokenSpec {
  id: string;
  token: string;
  entity: string;
  element: string;
  hex: string;
  rgba?: string;
  source: string;
  sourceFile: string;
  status: ColourStatus;
  notes?: string;
}

/**
 * NEURAL OBSERVATORY v1.1 — NOCTURNAL CRYO-GLASS & WARM CAUSTIC CINEMA
 * Locked 15-Token Color Script + 3 Sacred Semantic Reservations.
 * Zero Purple · Zero Gold · Zero Default Tailwind Grays.
 */
export const COLOUR_TOKENS = {
  // 15 Locked Neural Observatory v1.1 Tokens
  canvas: '#101D27',                       // 01. --token-canvas
  glassSolid: '#142632',                   // 02. --token-glass-solid
  glassRgba: 'rgba(20, 38, 50, 0.78)',     // 03. --token-glass
  glassSubtle: 'rgba(11, 20, 28, 0.82)',   // 04. --token-glass-subtle
  dividerHairline: 'rgba(255, 255, 255, 0.14)', // 05. --token-divider
  textPrimary: '#F2F6F8',                  // 06. --token-text-primary
  textSecondary: '#BDCBD3',                // 07. --token-text-secondary
  cobaltAccent: '#4C8DFF',                 // 08. --token-cobalt (Sphere 01 & ST-01 Projects)
  focusRing: '#65ACFF',                    // 09. --token-focus (2px focus rings & Cryo-Silica Lattice)
  sphereWireframe: '#B4DDFF',              // 10. --token-focus-glow (Fresnel rim glow & specular highlights)
  highlight: '#FFF1D4',                    // 11. --token-highlight (Warm ivory cardiac spline pulse beads)
  stationProjects: '#4C8DFF',              // 08. ST-01 Projects accent
  stationProjectDetail: '#4C8DFF',         // 08. ST-01 Project Detail accent
  stationTasks: '#5CC8D7',                 // 12. --token-station-tasks (ST-02 Tasks & Cyan Acoustic Resonator)
  stationPeople: '#7CE0B8',                // 13. --token-station-people (ST-03 People/RACI & Mint Plasma)
  stationFiles: '#9DB8D6',                 // 14. --token-station-files (ST-04 Drive Files & Brushed Steel)
  stationMedia: '#F2B66D',                 // 15. --token-station-media (Sphere 02 CDE & ST-05 Media)

  // 3 Sacred Semantic Reservations
  voiceOrbMint: '#9AFFE0',                 // --token-voice-orb (EXCLUSIVE to z-110 Voice Pilot Orb)
  voiceOrbTeal: '#359D8E',                 // Voice Orb mid radial stop
  voiceOrbDeep: '#133A44',                 // Voice Orb deep radial stop
  trackingValid: '#36E88D',                // --token-tracking-valid (EXCLUSIVE to valid 21-landmark hand tracking, verified progress & Two-Tap Confirm)
  systemErrorRed: '#FF5666',               // --token-system-error (EXCLUSIVE to Blocked badges & Voice Stop button)

  // Optical HUD Anatomy & Status helpers
  hudOuterBg: 'rgba(16, 29, 39, 0.84)',
  hudPocketBg: 'rgba(20, 38, 50, 0.72)',
  hudPocketBorder: 'rgba(180, 221, 255, 0.16)',
  glassPocketRgba: 'rgba(20, 38, 50, 0.72)',
  cobaltLabel: '#101D27',
  fieldInner: '#142632',
  fieldOuter: '#101D27',
  stationDecisions: '#5CC8D7',
  outlineControl: 'rgba(255, 255, 255, 0.14)',
  textCoord: '#BDCBD3',
  healthOnTrack: '#36E88D',
  healthAtRisk: '#F2B66D',
  healthBlocked: '#5CC8D7',

  // CDE Dimensions mapped strictly to the 15-token script (Zero Gold / Zero Off-Palette)
  cdeStrategy: '#4C8DFF',
  cdeProduction: '#F2B66D',
  cdeTalent: '#7CE0B8',
  cdeMediaTech: '#5CC8D7',
  cdeStory: '#4C8DFF',
  cdeShowreel: '#F2B66D',
  cdeLab: '#5CC8D7',
  cdeConnect: '#7CE0B8',
  cdeArchive: '#9DB8D6',
} as const;

export const COLOUR_TABLE: ColourTokenSpec[] = [
  {
    id: 'canvas',
    token: '--token-canvas',
    entity: 'Primary deep-space viewport void',
    element: '01. --token-canvas (Primary deep-space viewport void)',
    hex: '#101D27',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'glass-solid',
    token: '--token-glass-solid',
    entity: 'Solid telemetry pills, inputs & fallback surfaces',
    element: '02. --token-glass-solid (Solid telemetry pills, inputs & fallback surfaces)',
    hex: '#142632',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'glass-rgba',
    token: '--token-glass',
    entity: 'Floating optical glass plate · blur 12px saturate 1.2',
    element: '03. --token-glass (Floating optical glass plate · blur 12px saturate 1.2)',
    hex: '#142632',
    rgba: 'rgba(20, 38, 50, 0.78)',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'glass-subtle',
    token: '--token-glass-subtle',
    entity: 'Nested sub-drawers, code blocks & inspection wells',
    element: '04. --token-glass-subtle (Nested sub-drawers, code blocks & inspection wells)',
    hex: '#0B141C',
    rgba: 'rgba(11, 20, 28, 0.82)',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'divider-hairline',
    token: '--token-divider',
    entity: '1px structural hairlines + top specular catchlight',
    element: '05. --token-divider (1px structural hairlines + top specular catchlight)',
    hex: '#FFFFFF',
    rgba: 'rgba(255, 255, 255, 0.14)',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'text-primary',
    token: '--token-text-primary',
    entity: 'Primary headlines, active values & body copy',
    element: '06. --token-text-primary (Primary headlines, active values & body copy)',
    hex: '#F2F6F8',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'text-secondary',
    token: '--token-text-secondary',
    entity: 'Muted metadata, timestamps & secondary labels',
    element: '07. --token-text-secondary (Muted metadata, timestamps & secondary labels)',
    hex: '#BDCBD3',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'cobalt-accent',
    token: '--token-cobalt',
    entity: 'Sphere 01 CEREBRO HQ liquid-glass & ST-01 Projects',
    element: '08. --token-cobalt (Sphere 01 CEREBRO HQ liquid-glass & ST-01 Projects)',
    hex: '#4C8DFF',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'focus-ring',
    token: '--token-focus',
    entity: '2px focus rings, active pocket borders & Cryo-Silica Lattice',
    element: '09. --token-focus (2px focus rings, active pocket borders & Cryo-Silica Lattice)',
    hex: '#65ACFF',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'focus-glow',
    token: '--token-focus-glow',
    entity: 'Fresnel rim glow & specular highlights',
    element: '10. --token-focus-glow (Fresnel rim glow & specular highlights)',
    hex: '#B4DDFF',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'highlight-ivory',
    token: '--token-highlight',
    entity: 'Warm ivory cardiac spline pulse beads & countdowns',
    element: '11. --token-highlight (Warm ivory cardiac spline pulse beads & countdowns)',
    hex: '#FFF1D4',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'station-tasks',
    token: '--token-station-tasks',
    entity: 'ST-02 Tasks & Cyan Acoustic Resonator shader',
    element: '12. --token-station-tasks (ST-02 Tasks & Cyan Acoustic Resonator shader)',
    hex: '#5CC8D7',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'station-people',
    token: '--token-station-people',
    entity: 'ST-03 People/RACI & Mint Plasma shader',
    element: '13. --token-station-people (ST-03 People/RACI & Mint Plasma shader)',
    hex: '#7CE0B8',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'station-files',
    token: '--token-station-files',
    entity: 'ST-04 Drive Files & Brushed Steel Archive shader',
    element: '14. --token-station-files (ST-04 Drive Files & Brushed Steel Archive shader)',
    hex: '#9DB8D6',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'station-media',
    token: '--token-station-media',
    entity: 'Sphere 02 CDE Warm Amber Caustic Crystal & ST-05 Media',
    element: '15. --token-station-media (Sphere 02 CDE Warm Amber Caustic Crystal & ST-05 Media)',
    hex: '#F2B66D',
    source: 'Neural Observatory v1.1 Master Color Script',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'sacred-voice-orb',
    token: '--token-voice-orb',
    entity: 'SACRED 01: z-110 Voice Pilot Orb (Radial #9AFFE0 -> #359D8E -> #133A44)',
    element: 'SACRED 01. --token-voice-orb (RESERVED EXCLUSIVELY for z-110 Voice Pilot Orb)',
    hex: '#9AFFE0',
    source: 'Neural Observatory v1.1 Sacred Semantic Reservation',
    sourceFile: 'src/components/VoiceCard.tsx',
    status: 'CONFIRMED',
    notes: 'Radial ramp #9AFFE0 -> #359D8E -> #133A44',
  },
  {
    id: 'sacred-tracking-valid',
    token: '--token-tracking-valid',
    entity: 'SACRED 02: Valid 21-landmark hand tracking, verified progress & Two-Tap Confirm',
    element: 'SACRED 02. --token-tracking-valid (RESERVED EXCLUSIVELY for valid hand tracking, verified progress & Two-Tap Confirm)',
    hex: '#36E88D',
    source: 'Neural Observatory v1.1 Sacred Semantic Reservation',
    sourceFile: 'src/components/HandsOverlay.tsx',
    status: 'CONFIRMED',
  },
  {
    id: 'sacred-system-error',
    token: '--token-system-error',
    entity: 'SACRED 03: Blocked insight badges & Voice Stop button',
    element: 'SACRED 03. --token-system-error (RESERVED EXCLUSIVELY for Blocked badges & Voice Stop button)',
    hex: '#FF5666',
    source: 'Neural Observatory v1.1 Sacred Semantic Reservation',
    sourceFile: 'src/components/VoiceCard.tsx',
    status: 'CONFIRMED',
  },
];

export type StationId = 'projects' | 'tasks' | 'people' | 'files' | 'media';
export type CdeDimensionId =
  | 'strategy'
  | 'production'
  | 'talent'
  | 'mediatech'
  | 'story'
  | 'showreel'
  | 'lab'
  | 'connect'
  | 'archive';

export const STATION_COLOURS: Record<StationId, string> = {
  projects: COLOUR_TOKENS.stationProjects,
  tasks: COLOUR_TOKENS.stationTasks,
  people: COLOUR_TOKENS.stationPeople,
  files: COLOUR_TOKENS.stationFiles,
  media: COLOUR_TOKENS.stationMedia,
};

export const CDE_DIMENSION_COLOURS: Record<CdeDimensionId, string> = {
  strategy: COLOUR_TOKENS.cdeStrategy,
  production: COLOUR_TOKENS.cdeProduction,
  talent: COLOUR_TOKENS.cdeTalent,
  mediatech: COLOUR_TOKENS.cdeMediaTech,
  story: COLOUR_TOKENS.cdeStory,
  showreel: COLOUR_TOKENS.cdeShowreel,
  lab: COLOUR_TOKENS.cdeLab,
  connect: COLOUR_TOKENS.cdeConnect,
  archive: COLOUR_TOKENS.cdeArchive,
};
