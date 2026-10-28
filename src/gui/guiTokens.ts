/**
 * CEREBRO Stellar Command — GUI Amendment v4.0 (`cerebro-ui/4`)
 * Tokens, Z-Layers, Glassmorphism, Typography, Touch & Canonical Screen State Machine
 *
 * Implements `CEREBRO_CDE_UNIFIED_AMEND_v4.json` & `CEREBRO_STELLAR_GUI_AMEND_v3.json`.
 */

import { GuiCameraPresetId } from './cameraPresets';

export const GUI_AMEND_SCHEMA = 'cerebro.stellar.gui.amend/4.0';

/**
 * Z-Layer Hierarchy (Section 10.6 of `CEREBRO_CDE_UNIFIED_AMEND_v4.json`)
 * Preserves backward-compatible aliases (`canvas`, `ambientHUD`, `focusPointer`, `voiceDock`, etc.).
 */
/**
 * Neural Observatory v1.1 — 2D DOM stacking context (Section C).
 * Keep aliases so existing callers (`canvas`, `ambientHUD`, `voiceDock`, …) keep compiling.
 */
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

export const GUI_PALETTE_ROLES = {
  canvas: '#101D27',
  glass: '#142632',
  textPrimary: '#F2F6F8',
  textSecondary: '#BDCBD3',
  cobalt: '#4C8DFF',
  focus: '#65ACFF',
  focusGlow: '#B4DDFF',
  highlight: '#FFF1D4',
  tasks: '#5CC8D7',
  people: '#7CE0B8',
  files: '#9DB8D6',
  mediaCde: '#F2B66D',
  voiceOrb: '#9AFFE0', // Voice orb only; never general badges or status text
  success: '#36E88D', // Verified completion only
  error: '#FF5666', // Actual error, blocked/destructive state only; ordinary Stop uses neutral/focus styling
} as const;

/** Liquid Glass v7 DOM chrome — see src/design/liquidGlassV7.ts */
export const GUI_GLASS_TOKENS = {
  background: 'rgba(20, 38, 50, 0.78)',
  chromeBackground: 'rgba(20, 38, 50, 0.62)',
  contentBackground: 'rgba(20, 38, 50, 0.78)',
  fallbackBackground: 'rgba(20, 38, 50, 0.96)',
  chromeAlpha: 0.62,
  contentAlpha: 0.78,
  fallbackAlpha: 0.96,
  borderAlpha: 0.2,
  blurDesktopPx: 16,
  blurMobilePx: 14,
  saturate: 1.18,
  backdropFilter: 'blur(16px) saturate(1.18)',
  backdropFilterMobile: 'blur(14px) saturate(1.18)',
  border: '1px solid rgba(180, 221, 255, 0.20)',
  shadow:
    '0 2px 8px rgba(0, 0, 0, 0.18), 0 16px 40px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(242, 246, 248, 0.18)',
  radiusPx: 18,
  controlRadiusPx: 10,
  chipRadiusPx: 9999,
  headerH: 48,
  tabRowH: 44,
  bodyPadPx: 20,
  panelGapPx: 14,
  innerGapPx: 12,
  cardRadiusPx: 16,
} as const;

export const GUI_TYPOGRAPHY_TOKENS = {
  display: '"JaapokkiSubtract", "Space Grotesk", sans-serif',
  sans: '"Space Grotesk", "IBM Plex Sans Arabic", sans-serif',
  arabic: '"IBM Plex Sans Arabic", "Cairo", sans-serif',
  mono: '"JetBrains Mono", monospace',
  scale: {
    heroTitle: 'clamp(1.5rem, 2.2vw, 2.25rem)',
    panelTitle: '1.0rem',
    sectionTitle: '0.8125rem',
    body: '0.875rem',
    meta: '0.75rem',
    micro: '0.6875rem',
  },
} as const;

export type GuiBreakpoint = 'phone' | 'tablet' | 'ipad' | 'ipad_landscape' | 'desktop' | 'wide';

export const GUI_BREAKPOINTS_CSS_PX = {
  phone: [320, 767] as const,
  tablet: [768, 1099] as const,
  ipad_landscape: [1100, 1260] as const,
  desktop: [1100, 1679] as const,
  wide: [1680, 3840] as const,
} as const;

export const GUI_SAFE_INSETS = {
  minPx: 12,
  desktopPx: 24,
  widePx: 32,
} as const;

export const GUI_POINTER_FOCUS_TOKENS = {
  pointerHaloPx: 32,
  focusRingPx: 44,
  focusStrokePx: 2,
  focusTrailMaxPx: 120,
} as const;

export const GUI_TOUCH_TOKENS = {
  minTargetPx: 44,
  preferredTargetPx: 48,
  minControlGapPx: 8,
  /** v7: detach surfaces by ≥14px */
  minGapPx: 14,
  panelCollisionMarginPx: 14,
  sphereSafePaddingPx: 24,
} as const;

export const GUI_MOTION_TOKENS = {
  panelEnterMs: 240,
  panelExitMs: 180,
  focusRingMs: 220,
  sheetSnapMs: 260,
  uiEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
  cameraEase: 'quintic smootherstep 6t^5 - 15t^4 + 10t^3',
  cameraIdleAutoOrbitDefault: false,
  cameraIdleRevolutionSecWhenEnabled: 210,
  cameraIdleRevolutionSec: 210,
  sphereBreathingCycleSec: 8,
  sphereBreathingScaleAmplitude: 0.008,
  localStopTargetMs: 100,
} as const;

export const GUI_TIMING_TOKENS = {
  ...GUI_MOTION_TOKENS,
  // v5.0: reduce secondary motion by ~50% during camera travel.
  travelMotionAttenuation: 0.5,
} as const;

export const GUI_WORLD_MOTION_TOKENS = {
  ...GUI_MOTION_TOKENS,
  freezeIfHidden: true,
  dtClampMs: 33,
  periodsSec: {
    rimBreath: 8,
  },
  rates: {
    sphereRadPerSec: (Math.PI * 2) / 210,
  },
} as const;

export const GUI_OPTICAL_SHELL_PRESET = {
  // Liquid Glass v7 optical shell (reference C primary atmospheric glass).
  ior: 1.48,
  roughness: 0.08,
  roughnessHq: 0.08,
  roughnessCde: 0.08,
  transmission: 0.88,
  thickness: 1.1,
  clearcoat: 0.8,
  clearcoatRoughness: 0.06,
  metalness: 0,
  fresnelExponent: 4,
  rimIntensity: 0.25,
  bloom: {
    // Selective bloom only — never on DOM/text/media content.
    strength: 0.24,
    radius: 0.35,
    threshold: 0.9,
  },
  grain: {
    strength: 0.025,
    seedUpdatesHz: 24,
    pauseOnStop: true,
    pauseOnReducedMotion: true,
    monochromatic: true,
  },
  chromaticAberration: 0,
  vignetteStrength: 0.14,
  toneMappingExposure: 1.0,
  saturation: 0.96,
  contrast: 1.04,
} as const;

/**
 * Canonical visual states live in visualStateMachine.ts (kebab-case).
 * Re-export so guiTokens consumers share one enum — S04 divergence fixed.
 */
export {
  type GuiVisualState,
  type GuiCanonicalScreenId,
  GUI_CANONICAL_SCREENS,
  deriveVisualState,
  deriveCanonicalScreen,
} from './visualStateMachine';

/** @deprecated Legacy underscore aliases — map to canonical GuiVisualState */
export type GuiVisualStateLegacy =
  | 'idle'
  | 'hover'
  | 'focused'
  | 'panel_open'
  | 'camera_in_flight'
  | 'landing_hold'
  | 'voice_connecting'
  | 'voice_speaking'
  | 'voice_listening'
  | 'error';

const LEGACY_VISUAL_STATE_MAP: Record<
  string,
  import('./visualStateMachine').GuiVisualState
> = {
  focused: 'selected',
  panel_open: 'panel-open',
  camera_in_flight: 'traveling',
  landing_hold: 'landing',
  voice_connecting: 'listening',
  voice_speaking: 'speaking',
  voice_listening: 'listening',
};

export function normalizeGuiVisualState(
  state: string
): import('./visualStateMachine').GuiVisualState {
  return (
    LEGACY_VISUAL_STATE_MAP[state] ||
    (state as import('./visualStateMachine').GuiVisualState)
  );
}

export interface DeriveCanonicalScreenInput {
  explicitScreenOverride?: import('./visualStateMachine').GuiCanonicalScreenId | null;
  breakpoint: 'phone' | 'ipad' | 'ipad_landscape' | 'desktop' | 'wide' | 'tablet';
  isModalOpen: boolean;
  voiceStatus: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  isCameraInFlight: boolean;
  isLandingHold: boolean;
  cameraPreset: GuiCameraPresetId;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  openPanelsCount: number;
}
