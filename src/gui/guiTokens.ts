/**
 * CEREBRO Stellar Command — GUI Amendment v4.1 (NJR_SYS_26 Locked)
 *
 * CSS authority:
 * CEREBRO_39_Consolidated_Tokens_Review_2026-11-01.css
 *
 * Strict NJR_SYS_26 enforcement:
 * - Near-black canvas, translucent glass cards, Cobalt & Ice accents.
 * - Zero gold, zero purple, zero bloom/glow, crisp Sora/Inter typography.
 */

import type { GuiCameraPresetId } from './cameraPresets';
import { CONTRACT_SHELL_MATERIAL } from '../design/systemContract';

export const GUI_AMEND_SCHEMA =
  'cerebro.stellar.gui.amend/4.1.0' as const;

export const GUI_CSS_AUTHORITY =
  'CEREBRO_39_Consolidated_Tokens_Review_2026-11-01.css' as const;

/**
 * Resolved CSS primitive values for non-DOM consumers.
 * Legacy property names retained for type compatibility; all warm/gold hexes
 * remapped to NJR_SYS_26 Cobalt, Ice, and Silver tokens.
 */
export const GUI_PALETTE_ROLES = {
  void: '#05090E',
  canvas: '#0A0E17',
  canvasD0: '#0D131F',
  glass: '#121C2B',
  elevated: '#162234',
  livePanel: '#141E2E',

  textPrimary: '#F2F6F8',
  textSecondary: '#D0DCE3',
  textMuted: '#8F9EAE',
  silver: '#C5CCD6',

  ice: '#B4DDFF',
  cobalt: '#2E6BFF',
  teal: '#9AFFE0',
  success: '#36E88D',
  error: '#FF5666',

  /** Legacy keys remapped to Cobalt/Ice/Silver — zero gold/amber permitted */
  bronze: '#64748B',
  gold: '#2E6BFF',
  goldSheen: '#E8F2FF',
  amber: '#65ACFF',

  /** Default-app focus is strictly Cobalt; zero glow bloom */
  focus: '#2E6BFF',
  focusGlow: 'rgba(46, 107, 255, 0.0)',
  focusCobalt: '#2E6BFF',
  highlight: '#B4DDFF',

  /** C07 listening / voice orb — crisp teal/ice */
  listeningRing: '#9AFFE0',
  listeningRingMid: '#78D3B2',
  voiceOrb: '#9AFFE0',
  voiceOrbMid: '#78D3B2',
  voiceOrbDeep: '#0B2924',

  tasks: '#C5CCD6',
  people: '#B4DDFF',
  files: '#C5CCD6',
  mediaCde: '#65ACFF',
} as const;

/**
 * DOM bindings. Use these instead of hard-coded hex values when the
 * interface must respond to CSS theme changes.
 */
export const GUI_CSS_COLOR = {
  canvas: 'var(--token-bg-canvas)',
  surface: 'var(--token-bg-surface)',
  elevated: 'var(--token-bg-elevated)',
  glass: 'var(--token-glass-fill)',
  glassBorder: 'var(--token-glass-border)',
  subtleBorder: 'var(--token-glass-border-subtle)',
  divider: 'var(--token-divider)',

  primary: 'var(--token-text-primary)',
  secondary: 'var(--token-text-secondary)',
  muted: 'var(--token-text-muted)',

  cobalt: 'var(--token-accent-cobalt)',
  focus: 'var(--token-focus)',
  focusGlow: 'transparent',
  voiceOrb: 'var(--token-voice-orb)',
  listening: 'var(--token-listening-ring)',

  verified: 'var(--status-verified)',
  blocked: 'var(--status-blocked)',
} as const;

/**
 * Matches the declared glass-card, panel, pocket, and HUD CSS.
 */
export const GUI_GLASS_TOKENS = {
  background: 'var(--token-glass-fill)',
  chromeBackground: 'var(--token-glass-fill)',
  contentBackground: 'var(--token-glass-fill)',
  fallbackBackground: 'var(--token-glass-subtle)',

  chromeAlpha: 0.88,
  contentAlpha: 0.88,
  fallbackAlpha: 0.94,
  borderAlpha: 0.22,
  coldAlpha: 0.42,

  cardBackground: 'var(--token-glass-fill)',
  panelBackground: 'var(--token-glass-fill)',
  subtleBackground: 'var(--token-glass-subtle)',
  pocketBackground: 'var(--token-glass-subtle)',
  coldBackground: 'var(--token-cold-fill)',

  border: '1px solid var(--token-glass-border)',
  subtleBorder: '1px solid var(--token-glass-border-subtle)',
  hudBorder: '1px solid var(--token-divider)',
  coldBorder: '1px solid var(--token-cold-border)',

  blurPx: 12,
  blurDesktopPx: 12,
  blurMobilePx: 12,
  backdropFilter: 'blur(var(--blur-glass))',
  backdropFilterMobile: 'blur(var(--blur-glass))',

  saturate: 1.04,

  /* Panel / glass radius locked at 20 — no 16-vs-20 split */
  cardRadiusPx: 20,
  radiusPx: 20,
  panelRadiusPx: 20,
  pocketRadiusPx: 10,
  chipRadiusPx: 10,
  controlRadiusPx: 12,
  pillRadiusPx: 999,

  /** Distinct accents for concurrent open panels — Cobalt / Ice / Silver cycle (zero gold) */
  openAccentCycle: ['#2E6BFF', '#65ACFF', '#B4DDFF'],

  shadow: 'var(--shadow-elevated)',
  cardShadow: 'var(--shadow-card)',
  panelShadow: 'var(--shadow-elevated)',
  hudShadow: 'none',
  focusLabelShadow: 'none',

  pillMinHeightPx: 48,
  pillPadding: '12px 20px',
  pillGapPx: 12,

  headerH: 52,
  tabRowH: 40,
  bodyPadPx: 16,
} as const;

export type GuiOpenAccentId = 'gold' | 'cobalt' | 'ice';

export const GUI_OPEN_ACCENT_CYCLE: readonly {
  id: GuiOpenAccentId;
  hex: string;
}[] = [
  { id: 'cobalt', hex: '#2E6BFF' },
  { id: 'ice', hex: '#B4DDFF' },
  { id: 'gold', hex: '#65ACFF' },
] as const;

/** Map open-panel index → distinct Cobalt/Ice accent so concurrent panels remain crisp. */
export function resolveOpenPanelAccent(openIndex: number): {
  id: GuiOpenAccentId;
  hex: string;
} {
  const safe = Number.isFinite(openIndex) ? Math.max(0, Math.floor(openIndex)) : 0;
  return GUI_OPEN_ACCENT_CYCLE[safe % GUI_OPEN_ACCENT_CYCLE.length];
}

/**
 * Clean geometric font stacks — JaapokkiSubtract removed to prevent notched glyph distortion
 * on "Briefing" and modal headings.
 */
export const GUI_TYPOGRAPHY_TOKENS = {
  display: "'Sora', 'Inter', system-ui, -apple-system, sans-serif",
  filmDisplay: "'Sora', 'Inter', system-ui, -apple-system, sans-serif",

  sans: "'Inter', system-ui, -apple-system, sans-serif",

  arabic: "'Noto Kufi Arabic', 'Noto Sans Arabic', sans-serif",

  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",

  css: {
    display: "'Sora', 'Inter', system-ui, -apple-system, sans-serif",
    filmDisplay: "'Sora', 'Inter', system-ui, -apple-system, sans-serif",
    sans: 'var(--font-sans)',
    arabic: 'var(--font-arabic)',
    mono: 'var(--font-mono)',
  },

  /** Root 16 body · support 13–14 · metadata floor 12 */
  scale: {
    heroTitle: 'clamp(1.75rem, 3vw, 3rem)',
    panelTitle: '1.0625rem',
    sectionTitle: '0.875rem',
    body: '1rem',
    support: '0.875rem',
    supportSm: '0.8125rem',
    meta: '0.75rem',
    micro: '0.75rem',
  },
} as const;

export const GUI_MOTION_TOKENS = {
  fastMs: 180,
  baseMs: 320,
  slowMs: 640,
  uiEase: 'cubic-bezier(0.22, 1, 0.36, 1)',

  panelEnterMs: 320,
  panelExitMs: 180,
  focusRingMs: 180,
  sheetSnapMs: 320,

  cameraEase: 'smootherstep',
  cameraIdleAutoOrbitDefault: false,
  cameraIdleRevolutionSecWhenEnabled: 210,
  cameraIdleRevolutionSec: 210,
  sphereBreathingCycleSec: 8,
  sphereBreathingScaleAmplitude: 0.008,
  localStopTargetMs: 100,

  css: {
    fast: 'var(--motion-fast)',
    base: 'var(--motion-base)',
    slow: 'var(--motion-slow)',
    ease: 'var(--motion-ease)',
  },
} as const;

export const GUI_Z_LAYERS = {
  /** Blueprint z0 — WebGL world */
  scene: 0,
  world: 0,
  canvas: 10,
  /** Blueprint z10 — projected labels */
  sceneLabels: 10,
  worldLabels: 10,
  ambientHUD: 20,
  avoidanceRing: 20,
  panels: 25,
  /** Blueprint z30 — persistent Cerebro */
  executiveBar: 30,
  cerebro: 30,
  /** Blueprint z40 — work surfaces */
  stickyHeader: 40,
  workSurfaces: 40,
  /** Blueprint z50 — transcript + health */
  activePanel: 50,
  flyoutDrawer: 50,
  transcriptHealth: 50,
  /** Blueprint z60–80 — inputs / dialogs */
  mediaHost: 70,
  inputsDialogs: 70,
  noninteractiveFocus: 90,
  focusPointer: 90,
  modalBackdrop: 100,
  confirmationDialog: 100,
  modalContent: 100,
  voice: 110,
  voiceDock: 110,
  emergencyStop: 115,
  handsOverlay: 200,
  mediaFullscreenChrome: 210,
  systemToast: 300,
} as const;

export type GuiBreakpoint =
  | 'phone'
  | 'tablet'
  | 'ipad'
  | 'ipad_landscape'
  | 'desktop'
  | 'wide';

export const GUI_BREAKPOINTS_CSS_PX = {
  phoneBelow: 600,
  tabletBelow: 768,
  ipadPortraitBelow: 1100,
  ipadLandscapeBelow: 1261,
  wideFrom: 1680,
} as const;

export function classifyGuiBreakpoint(
  widthCssPx: number,
  tabletLayout = false,
): GuiBreakpoint {
  if (!Number.isFinite(widthCssPx) || widthCssPx < 0) {
    throw new RangeError('Invalid viewport width');
  }

  if (widthCssPx < 600) return 'phone';
  if (widthCssPx < 768) return 'tablet';
  if (widthCssPx >= 1680) return 'wide';

  if (tabletLayout && widthCssPx < 1100) {
    return 'ipad';
  }

  if (tabletLayout && widthCssPx < 1261) {
    return 'ipad_landscape';
  }

  return 'desktop';
}

export const GUI_SAFE_INSETS = {
  pageMarginPx: 24,
  proposedCompactMinPx: 12,
  proposedWidePx: 32,

  minPx: 12,
  desktopPx: 24,
  widePx: 32,
} as const;

export const GUI_POINTER_FOCUS_TOKENS = {
  pointerHaloPx: 32,
  focusRingPx: 44,
  focusStrokePx: 1.5,
  focusTrailMaxPx: 120,
} as const;

export const GUI_TOUCH_TOKENS = {
  pillMinHeightPx: 48,

  minTargetPx: 44,
  preferredTargetPx: 48,
  minControlGapPx: 8,
  minGapPx: 12,
  /** Minimum collision gap 16px between interactive regions and 3D spheres. */
  panelCollisionMarginPx: 16,
  sphereSafePaddingPx: 28,

  proposedMinTargetPx: 44,
  proposedMinControlGapPx: 8,
  proposedPanelCollisionMarginPx: 16,
  proposedSphereSafePaddingPx: 28,
} as const;

export const GUI_WORLD_MOTION_TOKENS = {
  ...GUI_MOTION_TOKENS,

  cameraIdleAutoOrbitDefault: false,
  cameraIdleRevolutionSecWhenEnabled: 210,
  sphereBreathingCycleSec: 8,
  sphereBreathingScaleAmplitude: 0.008,

  periodsSec: { rimBreath: GUI_MOTION_TOKENS.sphereBreathingCycleSec },
  rates: { sphereRadPerSec: (Math.PI * 2) / GUI_MOTION_TOKENS.cameraIdleRevolutionSec },
  freezeIfHidden: true,
  dtClampMs: 33,
} as const;

export const GUI_TIMING_TOKENS = {
  ...GUI_MOTION_TOKENS,
  travelMotionAttenuation: 0.35,
} as const;

export const GUI_FILM_OPTICAL_SHELL_PRESET = {
  scope: 'film-only',

  ior: 1.48,
  roughness: 0.06,
  transmission: 1.0,
  thicknessWorldUnits: null as number | null,

  bloomEnabled: false,
  grainEnabled: false,
  chromaticAberration: 0,
} as const;

/**
 * Live liquid-glass optical shell for CosmographCanvas (workspace).
 * Bloom is strictly zeroed out per NJR_SYS_26 no-bloom/no-glow rule.
 */
export const GUI_OPTICAL_SHELL_PRESET = {
  ior: CONTRACT_SHELL_MATERIAL.ior,
  roughness: CONTRACT_SHELL_MATERIAL.roughness,
  roughnessHq: CONTRACT_SHELL_MATERIAL.roughness,
  roughnessCde: CONTRACT_SHELL_MATERIAL.roughness,
  transmission: CONTRACT_SHELL_MATERIAL.transmission,
  thickness: 1.1,
  clearcoat: CONTRACT_SHELL_MATERIAL.clearcoat,
  clearcoatRoughness: CONTRACT_SHELL_MATERIAL.clearcoatRoughness,
  envMapIntensity: CONTRACT_SHELL_MATERIAL.envMapIntensity,
  metalness: 0,
  fresnelExponent: 4,
  rimIntensity: 0.18,
  bloom: {
    strength: 0,
    radius: 0,
    threshold: 1.0,
  },
  grain: {
    strength: 0,
    seedUpdatesHz: 24,
    pauseOnStop: true,
    pauseOnReducedMotion: true,
    monochromatic: true,
  },
  chromaticAberration: 0,
  vignetteStrength: 0.16,
  toneMappingExposure: 1.05,
  saturation: 0.96,
  contrast: 1.04,
} as const;

export type GuiVisualState =
  | 'idle'
  | 'hover'
  | 'focused'
  | 'panel_open'
  | 'camera_in_flight'
  | 'landing_hold'
  | 'voice_connecting'
  | 'voice_speaking'
  | 'voice_listening'
  | 'modal_open'
  | 'error';

export type GuiCanonicalScreenId =
  | 'S01'
  | 'S02'
  | 'S03'
  | 'S04'
  | 'S05'
  | 'S06'
  | 'S07'
  | 'S08'
  | 'S09';

export interface GuiCanonicalScreenSpec {
  id: GuiCanonicalScreenId;
  title: string;
  cameraPreset: GuiCameraPresetId;
  visualState: GuiVisualState;
  description: string;
}

export const GUI_CANONICAL_SCREENS: Record<
  GuiCanonicalScreenId,
  GuiCanonicalScreenSpec
> = {
  S01: {
    id: 'S01',
    title: 'Universe Entry',
    cameraPreset: 'universe',
    visualState: 'idle',
    description:
      'Wide sphere view with a clear center and an available voice control.',
  },

  S02: {
    id: 'S02',
    title: 'Sphere Hover & Target Ring',
    cameraPreset: 'approach',
    visualState: 'hover',
    description:
      'Target reticle and label remain clear of the sphere and safe insets.',
  },

  S03: {
    id: 'S03',
    title: 'Station Focus & Single Panel',
    cameraPreset: 'focused',
    visualState: 'panel_open',
    description:
      'One panel opens while the camera reframes the sphere around its occupied area.',
  },

  S04: {
    id: 'S04',
    title: 'Camera Flight Transition',
    cameraPreset: 'approach',
    visualState: 'camera_in_flight',
    description:
      'One camera authority moves continuously along a validated path.',
  },

  S05: {
    id: 'S05',
    title: 'Detail Inspection',
    cameraPreset: 'detail',
    visualState: 'focused',
    description:
      'Close inspection with lens and framing taken from the actual camera preset.',
  },

  S06: {
    id: 'S06',
    title: 'Voice Active Session',
    cameraPreset: 'focused',
    visualState: 'voice_speaking',
    description:
      'Teal/Cobalt voice state for listening and speaking. Caption and Stop remain readable.',
  },

  S07: {
    id: 'S07',
    title: 'Mobile Bottom Sheet',
    cameraPreset: 'approach',
    visualState: 'panel_open',
    description:
      'Single mobile sheet fitted to the measured viewport and safe areas.',
  },

  S08: {
    id: 'S08',
    title: 'Tablet Inspector',
    cameraPreset: 'focused',
    visualState: 'panel_open',
    description:
      'Tablet inspector and voice control avoid overlap at measured viewport sizes.',
  },

  S09: {
    id: 'S09',
    title: 'Return / Resume',
    cameraPreset: 'approach',
    visualState: 'landing_hold',
    description:
      'Return from the current pose to a bookmark using explicit camera handoff.',
  },
};

export type GuiVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'error';

export interface DeriveCanonicalScreenInput {
  explicitScreenOverride?: GuiCanonicalScreenId | null;

  breakpoint: GuiBreakpoint;
  isModalOpen: boolean;
  hasError?: boolean;

  voiceStatus: GuiVoiceStatus;
  isCameraInFlight: boolean;
  isLandingHold: boolean;

  cameraPreset: GuiCameraPresetId;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  openPanelsCount: number;
}

export type GuiOverlayState =
  | 'none'
  | 'modal'
  | 'error';

export function deriveOverlayState(
  input: Pick<
    DeriveCanonicalScreenInput,
    'isModalOpen' | 'hasError' | 'voiceStatus'
  >,
): GuiOverlayState {
  if (input.hasError || input.voiceStatus === 'error') {
    return 'error';
  }

  if (input.isModalOpen) {
    return 'modal';
  }

  return 'none';
}

export function deriveVisualState(
  input: Pick<
    DeriveCanonicalScreenInput,
    | 'isModalOpen'
    | 'hasError'
    | 'voiceStatus'
    | 'isCameraInFlight'
    | 'isLandingHold'
    | 'openPanelsCount'
    | 'selectedNodeId'
    | 'hoveredNodeId'
  >,
): GuiVisualState {
  if (input.hasError || input.voiceStatus === 'error') {
    return 'error';
  }

  if (input.isModalOpen) {
    return 'modal_open';
  }

  if (input.isCameraInFlight) {
    return 'camera_in_flight';
  }

  if (input.isLandingHold) {
    return 'landing_hold';
  }

  if (input.voiceStatus === 'connecting') {
    return 'voice_connecting';
  }

  if (input.voiceStatus === 'speaking') {
    return 'voice_speaking';
  }

  if (input.voiceStatus === 'listening') {
    return 'voice_listening';
  }

  if (input.openPanelsCount > 0) {
    return 'panel_open';
  }

  if (input.selectedNodeId) {
    return 'focused';
  }

  if (input.hoveredNodeId) {
    return 'hover';
  }

  return 'idle';
}

export function deriveCanonicalScreen(
  input: DeriveCanonicalScreenInput,
): GuiCanonicalScreenId {
  if (input.explicitScreenOverride) {
    return input.explicitScreenOverride;
  }

  if (input.isCameraInFlight) {
    return 'S04';
  }

  if (input.isLandingHold) {
    return 'S09';
  }

  if (
    input.voiceStatus === 'speaking' ||
    input.voiceStatus === 'listening' ||
    input.voiceStatus === 'connecting'
  ) {
    return 'S06';
  }

  if (
    input.openPanelsCount > 0 &&
    input.breakpoint === 'phone'
  ) {
    return 'S07';
  }

  if (
    input.openPanelsCount > 0 &&
    (
      input.breakpoint === 'ipad' ||
      input.breakpoint === 'ipad_landscape' ||
      input.breakpoint === 'tablet'
    )
  ) {
    return 'S08';
  }

  if (input.cameraPreset === 'detail') {
    return 'S05';
  }

  if (input.openPanelsCount > 0 || input.selectedNodeId) {
    return 'S03';
  }

  if (input.hoveredNodeId) {
    return 'S02';
  }

  return 'S01';
}
