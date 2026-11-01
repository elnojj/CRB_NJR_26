/**
 * CEREBRO Stellar Command — GUI Amendment v4.1
 *
 * CSS authority:
 * CEREBRO_39_Consolidated_Tokens_Review_2026-11-01.css
 *
 * CSS bindings remain themeable through var(...). Literal resolved colors
 * are provided for canvas/WebGL consumers and inspection tools.
 *
 * Layout, z-index, camera, 3D, and screen-composition decisions absent from
 * the consolidated CSS are marked PROPOSED. This module does not claim
 * runtime integration or validation against the Stellar Command project.
 */

import type { GuiCameraPresetId } from './cameraPresets';

export const GUI_AMEND_SCHEMA =
  'cerebro.stellar.gui.amend/4.1.0' as const;

export const GUI_CSS_AUTHORITY =
  'CEREBRO_39_Consolidated_Tokens_Review_2026-11-01.css' as const;

/**
 * Resolved CSS primitive values for non-DOM consumers.
 *
 * Cobalt remains blue. Gold is the default focus accent.
 */
export const GUI_PALETTE_ROLES = {
  void: '#05090E',
  canvas: '#101D27',
  canvasD0: '#101622',
  glass: '#142632',
  elevated: '#1B2230',
  livePanel: '#1C222E',

  textPrimary: '#F2F6F8',
  textSecondary: '#D0DCE3',
  textMuted: '#BDCBD3',
  silver: '#C5CCD6',

  ice: '#B4DDFF',
  cobalt: '#65ACFF',
  teal: '#9AFFE0',
  success: '#36E88D',
  error: '#FF5666',

  bronze: '#8C6A45',
  gold: '#D4AF37',
  goldSheen: '#FFF4D0',
  amber: '#E8C361',

  focus: '#D4AF37',
  focusGlow: '#FFF4D0',
  focusCobalt: '#65ACFF',
  highlight: '#FFF4D0',

  listeningRing: '#9AFFE0',
  voiceOrb: '#D4AF37',

  tasks: '#C5CCD6',
  people: '#FFF4D0',
  files: '#C5CCD6',
  mediaCde: '#D4AF37',
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
  focusGlow: 'var(--token-focus-glow)',
  voiceOrb: 'var(--token-voice-orb)',
  listening: 'var(--token-listening-ring)',

  verified: 'var(--status-verified)',
  blocked: 'var(--status-blocked)',
} as const;

/**
 * Matches the declared glass-card, panel, pocket, and HUD CSS.
 *
 * The compatibility fields retain names used by earlier GUI consumers,
 * but their values now resolve to the consolidated CSS.
 */
export const GUI_GLASS_TOKENS = {
  background: 'var(--token-glass-fill)',
  chromeBackground: 'var(--token-glass-fill)',
  contentBackground: 'var(--token-glass-fill)',
  fallbackBackground: 'var(--token-glass-subtle)',

  chromeAlpha: 0.72,
  contentAlpha: 0.72,
  fallbackAlpha: 0.88,
  borderAlpha: 0.36,

  cardBackground: 'var(--token-glass-fill)',
  panelBackground: 'rgba(20, 38, 50, 0.44)',
  subtleBackground: 'var(--token-glass-subtle)',
  pocketBackground: 'rgba(16, 29, 39, 0.68)',

  border: '1px solid var(--token-glass-border)',
  subtleBorder: '1px solid var(--token-glass-border-subtle)',
  hudBorder: '1px solid var(--token-divider)',

  blurPx: 18,
  blurDesktopPx: 18,
  blurMobilePx: 18,
  backdropFilter: 'blur(var(--blur-glass))',
  backdropFilterMobile: 'blur(var(--blur-glass))',

  // The consolidated CSS does not apply a saturation filter.
  saturate: 1,

  cardRadiusPx: 16,
  radiusPx: 16,
  panelRadiusPx: 20,
  pocketRadiusPx: 8,
  chipRadiusPx: 8,
  controlRadiusPx: 8,
  pillRadiusPx: 999,

  shadow: 'var(--shadow-elevated)',
  cardShadow: 'var(--shadow-card)',
  panelShadow: 'var(--shadow-elevated)',
  hudShadow: 'var(--shadow-hud)',
  focusLabelShadow: 'var(--shadow-focus-label)',

  pillMinHeightPx: 48,
  pillPadding: '12px 20px',
  pillGapPx: 12,

  // PROPOSED legacy layout dimensions; absent from the CSS authority.
  headerH: 52,
  tabRowH: 40,
  bodyPadPx: 16,
} as const;

/**
 * Exact font-stack ordering from the consolidated CSS.
 *
 * Font-file availability still needs verification in the target project.
 */
export const GUI_TYPOGRAPHY_TOKENS = {
  display:
    "'Sora', 'JaapokkiSubtract', 'Inter', system-ui, sans-serif",

  sans:
    "'Inter', 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif",

  arabic:
    "'Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Inter', system-ui, sans-serif",

  mono:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",

  css: {
    display: 'var(--font-display)',
    sans: 'var(--font-sans)',
    arabic: 'var(--font-arabic)',
    mono: 'var(--font-mono)',
  },

  // PROPOSED legacy scale; the consolidated CSS defines families only.
  scale: {
    heroTitle: 'clamp(1.5rem, 2.2vw, 2.25rem)',
    panelTitle: '1rem',
    sectionTitle: '0.8125rem',
    body: '0.875rem',
    meta: '0.75rem',
    micro: '0.6875rem',
  },
} as const;

/**
 * The first four values map directly to CSS motion tokens.
 * Component assignments and camera behavior are PROPOSED.
 */
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

/** PROPOSED: the consolidated CSS has no z-index hierarchy. */
export const GUI_Z_LAYERS = {
  scene: 0,
  canvas: 0,

  sceneLabels: 10,
  ambientHUD: 10,

  panels: 40,
  activePanel: 50,
  mediaHost: 70,

  noninteractiveFocus: 90,
  focusPointer: 90,

  voice: 110,
  voiceDock: 110,
  emergencyStop: 115,

  modalBackdrop: 125,
  confirmationDialog: 130,
  modalContent: 130,
} as const;

/**
 * PROPOSED responsive thresholds.
 *
 * Width alone does not identify an iPad. tabletLayout must be supplied
 * by the host when it intentionally uses tablet composition.
 */
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

/**
 * The CSS defines a 24px page margin.
 * Compact and wide adjustments are PROPOSED.
 */
export const GUI_SAFE_INSETS = {
  pageMarginPx: 24,
  proposedCompactMinPx: 12,
  proposedWidePx: 32,

  // Legacy consumer names.
  minPx: 12,
  desktopPx: 24,
  widePx: 32,
} as const;

/** PROPOSED: pointer geometry is absent from the consolidated CSS. */
export const GUI_POINTER_FOCUS_TOKENS = {
  pointerHaloPx: 32,
  focusRingPx: 44,
  focusStrokePx: 2,
  focusTrailMaxPx: 120,
} as const;

/**
 * The pill's 48px minimum is defined by CSS.
 * Other interaction dimensions are PROPOSED.
 */
export const GUI_TOUCH_TOKENS = {
  pillMinHeightPx: 48,

  minTargetPx: 44,
  preferredTargetPx: 48,
  minControlGapPx: 8,
  minGapPx: 16,
  panelCollisionMarginPx: 16,
  sphereSafePaddingPx: 24,

  proposedMinTargetPx: 44,
  proposedMinControlGapPx: 8,
  proposedPanelCollisionMarginPx: 16,
  proposedSphereSafePaddingPx: 24,
} as const;

/** PROPOSED: world-motion rates are absent from the CSS. */
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

/** Legacy timing export. Non-CSS values remain PROPOSED. */
export const GUI_TIMING_TOKENS = {
  ...GUI_MOTION_TOKENS,
  travelMotionAttenuation: 0.35,
} as const;

/**
 * PROPOSED film-only optical study.
 *
 * Do not automatically apply this preset to the live interface.
 * Thickness requires calibration to the real model scale.
 * Bloom and grain are disabled unless a film preset explicitly enables them.
 */
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

/** Compatibility export; retains the film-only scope above. */
export const GUI_OPTICAL_SHELL_PRESET =
  GUI_FILM_OPTICAL_SHELL_PRESET;

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

/**
 * PROPOSED screen compositions.
 *
 * Lens, FOV, sphere occupancy, and actual camera coordinates must come
 * from the project's verified cameraPresets module.
 */
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
      'Gold voice orb; teal only denotes listening. Caption and Stop remain readable.',
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
  /**
   * Preview-only override. Omit for production state derivation.
   */
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

/**
 * A modal or error is an overlay. It does not replace the underlying
 * canonical screen or reset the camera.
 */
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

/**
 * Visual priority describes the most prominent visible state.
 * It does not transfer camera ownership.
 */
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

/**
 * S01–S09 are composition examples, not nine exclusive application states.
 * A modal is derived separately through deriveOverlayState.
 */
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
