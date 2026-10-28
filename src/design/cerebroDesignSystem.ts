/**
 * CEREBRO + CDE Master GUI Upgrade v5.0 — locked design system.
 * Single source for CSS variables, Three.js uniforms, and React styling.
 * Zero purple · Zero unapproved gold · Voice teal exclusive to the orb.
 */

export const CEREBRO_BUILD_ID = 'cerebro-gui-v5.0.0';

export const CEREBRO_PALETTE = {
  canvas: '#101D27',
  glassBase: '#142632',
  textPrimary: '#F2F6F8',
  textSecondary: '#BDCBD3',
  cobalt: '#4C8DFF',
  focus: '#65ACFF',
  ice: '#B4DDFF',
  warmHighlight: '#FFF1D4',
  tasks: '#5CC8D7',
  people: '#7CE0B8',
  files: '#9DB8D6',
  mediaCde: '#F2B66D',
  voice: '#9AFFE0',
  success: '#36E88D',
  error: '#FF5666',
} as const;

export const CEREBRO_GLASS = {
  primary: {
    alphaMin: 0.58,
    alphaMax: 0.72,
    blurDesktopPx: 12,
    blurMobilePx: 8,
    saturate: 1.2,
    borderPx: 1,
    innerHighlight: 0.14,
    radiusPx: 16,
  },
  focused: {
    alphaMin: 0.76,
    alphaMax: 0.86,
    radiusPx: 16,
  },
  media: {
    alphaMin: 0.9,
    alphaMax: 0.96,
    blurPx: 0,
    radiusPx: 16,
  },
  cardRadiusPx: 12,
  buttonRadiusPx: 10,
  chipRadiusPx: 8,
  minTouchPx: 44,
  minControlGapPx: 8,
} as const;

export const CEREBRO_TYPE = {
  fontDisplay: "'Sora', system-ui, sans-serif",
  fontBody: "'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
  fontArabic: "'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif",
  mainHeadingDesktop: 'clamp(28px, 2.4vw, 36px)',
  mainHeadingMobile: 'clamp(22px, 5vw, 28px)',
  panelHeading: 'clamp(16px, 1.2vw, 18px)',
  body: '14.5px',
  supporting: '12.5px',
  technical: '12px',
  button: '13.5px',
} as const;

export const CEREBRO_RENDER = {
  outputColorSpace: 'SRGBColorSpace' as const,
  toneMapping: 'ACESFilmicToneMapping' as const,
  exposure: 1.0,
  bloomStrength: 0.45,
  bloomThreshold: 0.82,
  bloomRadius: 0.35,
  vignetteStrength: 0.14,
  chromaticAberration: 0.0018,
  filmGrainStrength: 0.022,
  filmGrainHz: 24,
  toneMappingExposure: 1.05,
  dprDesktop: 1.75,
  dprIpad: 1.5,
  dprMobile: 1.25,
} as const;

export const CEREBRO_SPHERE_OPTICS = {
  ior: 1.48,
  roughnessMin: 0.06,
  roughnessMax: 0.12,
  transmissionMin: 0.82,
  transmissionMax: 0.92,
  metalness: 0,
  clearcoatMin: 0.65,
  clearcoatMax: 0.9,
  clearcoatRoughnessMin: 0.04,
  clearcoatRoughnessMax: 0.09,
  fresnelExponentMin: 3,
  fresnelExponentMax: 5,
  hqSegments: [64, 48] as const,
  heroSegments: [96, 64] as const,
  mobileSegments: [40, 32] as const,
  atmosphereBoundary: 0.82,
  particleSafeBoundary: 0.78,
  contentInner: 0.15,
  contentOuter: 0.7,
} as const;

export const CEREBRO_CAMERA_LENSES = {
  universeOverview: { mm: 28, vFov: 46.4, travelMs: 3200 },
  sphereApproach: { mm: 35, vFov: 37.8, travelMs: 2400 },
  sphereFocus: { mm: 50, vFov: 27.0, travelMs: 1800 },
  materialDetail: { mm: 85, vFov: 16.1, travelMs: 1400 },
} as const;

export const CEREBRO_LOOP_PERIODS_SEC = {
  sphereRotation: 210,
  orbitalRings: 55,
  atmosphericAdvection: 30,
  particleDrift: 36,
  fresnelBreathing: 8,
} as const;

export const CEREBRO_MOTION = {
  panelOpen: {
    durationMs: 320,
    easing: [0.22, 1, 0.36, 1] as const,
  },
  panelClose: {
    durationMs: 220,
  },
  mediaFocus: {
    durationMs: 650,
    easing: [0.22, 1, 0.36, 1] as const,
  },
  mediaFullView: {
    durationMs: 1100,
  },
  returnToProject: {
    durationMs: 850,
  },
  voiceFocus: {
    durationMs: 180,
    ringWidthPx: 2,
    clearancePx: 8,
  },
  travelMotionAttenuation: 0.5,
} as const;

export type CerebroVoiceVisualState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'executing'
  | 'traveling'
  | 'speaking'
  | 'paused'
  | 'interrupted'
  | 'error';

/** Map legacy VoiceCard states onto the v5.0 visual contract. */
export function mapVoiceVisualState(
  voiceState: string,
  opts?: { tourActive?: boolean; cameraMoving?: boolean }
): CerebroVoiceVisualState {
  if (opts?.cameraMoving) return 'traveling';
  switch (voiceState) {
    case 'Listening':
      return 'listening';
    case 'Thinking':
      return 'thinking';
    case 'Speaking':
      return 'speaking';
    case 'Muted':
      return 'paused';
    case 'Error':
      return 'error';
    case 'Connecting':
    case 'Reconnecting':
      return 'executing';
    case 'Disconnected':
      return 'interrupted';
    default:
      return opts?.tourActive ? 'executing' : 'idle';
  }
}
