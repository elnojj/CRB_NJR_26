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
 * CEREBRO-NOJARA D0 v1.24 DESIGN SYSTEM — COLOUR TOKENS
 */
export const viewportBackground = {
  base: '#1B2230',
  gradientEnd: '#101622',
  ambientTint: '#0E141E',
} as const;

export const metallicGold = {
  primary: '#D4AF37',
  specularHighlight: '#FFF4D0',
  shadowTone: '#685218',
  sheen: '#E6CA65',
} as const;

export const brushedSilver = {
  primary: '#C5CCD6',
  specularHighlight: '#FFFFFF',
  shadowTone: '#404854',
} as const;

export const deepSlateBlue = {
  base: '#3A516E',
  deep: '#1E2B3D',
  light: '#5A779C',
} as const;

export const glassTransmission = {
  refractionTint: '#EAF2FF',
  edgeRim: '#A4CBFF',
} as const;

export const D0_V124 = {
  viewportBackground: {
    base: '#1B2230',
    gradientEnd: '#101622',
    ambientTint: '#0E141E',
  },
  metallicGold: {
    primary: '#D4AF37',
    specularHighlight: '#FFF4D0',
    shadowTone: '#685218',
    sheen: '#E6CA65',
  },
  brushedSilver: {
    primary: '#C5CCD6',
    specularHighlight: '#FFFFFF',
    shadowTone: '#404854',
  },
  deepSlateBlue: {
    base: '#3A516E',
    deep: '#1E2B3D',
    light: '#5A779C',
  },
  glassTransmission: {
    refractionTint: '#EAF2FF',
    edgeRim: '#A4CBFF',
  },
  stateTeal: '#78D3B2',
  bodyText: '#F2F6F8',
} as const;

/**
 * CEREBRO 39 / SEHLY MASTER TEMPLATE — FILM-DERIVED TOKENS (01 NOV 2026)
 * Source: design_tokens_998287f6.json & tokens_c9fb9fb3.css
 */
export const SEHLY_FILM_TOKENS = {
  version: '1.0-proposed-film-derived',
  deep: '#05090E',
  canvas: '#101D27',
  glass: '#142632',
  primary: '#F2F6F8',
  secondary: '#D0DCE3',
  muted: '#BDCBD3',
  ice: '#B4DDFF',
  cobalt: '#65ACFF',
  bronze: '#8C6A45',
  gold: '#D4AF37',
  voice: '#9AFFE0',
} as const;

export const SEHLY_MATERIALS_BASELINE = {
  liquidGlass: {
    color: '#0A1218',
    transmission: 0.96,
    roughness: 0.04,
    metalness: 0,
    ior: 1.52,
    thickness: 2.8,
    normalizedGlbThickness: 0.03,
    clearcoat: 0.9,
    clearcoatRoughness: 0.06,
    attenuationColor: '#101D27',
    attenuationDistance: 3.4,
  },
  bronze: {
    color: '#8C6A45',
    roughness: 0.18,
    metalness: 0.85,
  },
  coreProposed: {
    color: '#BCC9D4',
    metalness: 0.94,
    roughness: 0.28,
  },
} as const;

export const COLOUR_TOKENS = {
  // Structured v1.24 Token Groups
  viewportBackground,
  metallicGold,
  brushedSilver,
  deepSlateBlue,
  glassTransmission,
  stateTeal: '#78D3B2',
  bodyText: '#F2F6F8',

  // Mapped Unified Tokens (Cerebro-Nojara D0 v1.24)
  canvas: '#1B2230',
  glassSolid: '#101622',
  glassRgba: 'rgba(27, 34, 48, 0.88)',
  glassSubtle: 'rgba(16, 22, 34, 0.88)',
  dividerHairline: 'rgba(197, 204, 214, 0.22)',
  textPrimary: '#F2F6F8',
  textSecondary: '#C5CCD6',
  cobaltAccent: '#65ACFF',
  focusRing: '#65ACFF',
  sphereWireframe: '#B4DDFF',
  highlight: '#B4DDFF',
  // Locked station hex from cerebro.config.json (never gold-aliased)
  stationProjects: '#65ACFF',
  stationProjectDetail: '#65ACFF',
  stationTasks: '#FFF1D4',
  stationPeople: '#E6A2B4',
  stationFiles: '#B4DDFF',
  stationMedia: '#F2B66D',

  // Semantic Reservations — C07 voice orb (teal wins; gold never for voice UI)
  voiceOrbMint: '#9AFFE0',
  voiceOrbTeal: '#78D3B2',
  voiceOrbDeep: '#0f3d34',
  listeningRing: '#9AFFE0',
  listeningRingMid: '#78D3B2',
  trackingValid: '#36E88D',
  systemErrorRed: '#FF5666',

  // Optical HUD Anatomy & Status helpers
  hudOuterBg: 'rgba(27, 34, 48, 0.88)',
  hudPocketBg: 'rgba(27, 34, 48, 0.88)',
  hudPocketBorder: 'rgba(197, 204, 214, 0.22)',
  glassPocketRgba: 'rgba(27, 34, 48, 0.88)',
  cobaltLabel: '#101622',
  fieldInner: '#1B2230',
  fieldOuter: '#101622',
  stationDecisions: '#C5CCD6',
  outlineControl: 'rgba(197, 204, 214, 0.22)',
  textCoord: '#C5CCD6',
  healthOnTrack: '#36E88D',
  healthAtRisk: '#D4AF37',
  healthBlocked: '#C5CCD6',

  // CDE Dimensions mapped to Gold & Silver
  cdeStrategy: '#D4AF37',
  cdeProduction: '#E6CA65',
  cdeTalent: '#FFF4D0',
  cdeMediaTech: '#C5CCD6',
  cdeStory: '#D4AF37',
  cdeShowreel: '#E6CA65',
  cdeLab: '#C5CCD6',
  cdeConnect: '#FFF4D0',
  cdeArchive: '#C5CCD6',
} as const;

export const COLOUR_TABLE: ColourTokenSpec[] = [
  {
    id: 'canvas',
    token: '--cj-bg-viewport',
    entity: 'Primary viewport background base',
    element: '01. --cj-bg-viewport (Viewport base #1B2230 -> #101622)',
    hex: '#1B2230',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'glass-solid',
    token: '--cj-bg-surface',
    entity: 'Deep surface & telemetry background',
    element: '02. --cj-bg-surface (#101622)',
    hex: '#101622',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'glass-rgba',
    token: '--cj-glass-panel',
    entity: 'Floating optical glass card · blur 14px',
    element: '03. --cj-glass-panel (rgba(27, 34, 48, 0.88))',
    hex: '#1B2230',
    rgba: 'rgba(27, 34, 48, 0.88)',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'divider-hairline',
    token: '--cj-border-hairline',
    entity: '1px structural silver hairlines',
    element: '04. --cj-border-hairline (rgba(197, 204, 214, 0.22))',
    hex: '#C5CCD6',
    rgba: 'rgba(197, 204, 214, 0.22)',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'text-primary',
    token: '--token-text-primary',
    entity: 'Primary headlines, active values & body copy',
    element: '05. --token-text-primary (#F2F6F8)',
    hex: '#F2F6F8',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'silver-metal',
    token: '--cj-silver-metal',
    entity: 'Brushed silver secondary & metal UI',
    element: '06. --cj-silver-metal (#C5CCD6)',
    hex: '#C5CCD6',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'gold-primary',
    token: '--cj-gold-primary',
    entity: 'Metallic gold primary accent & focus ring',
    element: '07. --cj-gold-primary (#D4AF37)',
    hex: '#D4AF37',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'gold-sheen',
    token: '--cj-gold-sheen',
    entity: 'Specular highlight & warm gold sheen',
    element: '08. --cj-gold-sheen (#FFF4D0)',
    hex: '#FFF4D0',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'slate-blue',
    token: '--cj-slate-blue',
    entity: 'Deep slate blue structural accent',
    element: '09. --cj-slate-blue (#3A516E)',
    hex: '#3A516E',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/styles/cerebro.tokens.css',
    status: 'CONFIRMED',
  },
  {
    id: 'glass-refraction',
    token: 'glassTransmission.refractionTint',
    entity: 'Optical glass transmission refraction tint',
    element: '10. glassTransmission.refractionTint (#EAF2FF)',
    hex: '#EAF2FF',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/tokens/colours.ts',
    status: 'CONFIRMED',
  },
  {
    id: 'glass-edge-rim',
    token: 'glassTransmission.edgeRim',
    entity: 'Optical glass edge rim highlight',
    element: '11. glassTransmission.edgeRim (#A4CBFF)',
    hex: '#A4CBFF',
    source: 'Cerebro-Nojara D0 v1.24 Master Spec',
    sourceFile: 'src/tokens/colours.ts',
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
