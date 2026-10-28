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

export const GUI_GLASS_TOKENS = {
  background: 'rgba(20, 38, 50, 0.76)',
  chromeBackground: 'rgba(20, 38, 50, 0.58)',
  contentBackground: 'rgba(20, 38, 50, 0.76)',
  fallbackBackground: 'rgba(20, 38, 50, 0.94)',
  chromeAlpha: 0.58,
  contentAlpha: 0.76,
  fallbackAlpha: 0.94,
  borderAlpha: 0.14,
  blurDesktopPx: 12,
  blurMobilePx: 8,
  saturate: 1.2,
  backdropFilter: 'blur(12px) saturate(1.2)',
  backdropFilterMobile: 'blur(8px) saturate(1.2)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  shadow:
    '0 18px 48px rgba(4, 10, 16, 0.46), inset 0 1px 0 rgba(255, 255, 255, 0.10)',
  radiusPx: 16,
  controlRadiusPx: 10,
  chipRadiusPx: 8,
  headerH: 52,
  tabRowH: 40,
  bodyPadPx: 16,
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
  minGapPx: 16,
  panelCollisionMarginPx: 16,
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
  travelMotionAttenuation: 0.35,
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
  ior: 1.48,
  roughness: 0.09,
  transmission: 0.88,
  thickness: 0.55,
  clearcoat: 0.8,
  clearcoatRoughness: 0.06,
  bloom: {
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

export const GUI_CANONICAL_SCREENS: Record<GuiCanonicalScreenId, GuiCanonicalScreenSpec> = {
  S01: {
    id: 'S01',
    title: 'Universe Entry',
    cameraPreset: 'universe',
    visualState: 'idle',
    description: '28mm overview (46.4° vFOV), unobstructed sphere (32% height), voice dock ready.',
  },
  S02: {
    id: 'S02',
    title: 'Sphere Hover & Target Ring',
    cameraPreset: 'approach',
    visualState: 'hover',
    description: '35mm approach (37.8° vFOV), projected 3D node reticle & label pill inside centerSafe.',
  },
  S03: {
    id: 'S03',
    title: 'Station Focus & Single Panel',
    cameraPreset: 'focused',
    visualState: 'panel_open',
    description: '50mm focused (27.0° vFOV), primary left slot open, sphere shifted to unobstructed rect.',
  },
  S04: {
    id: 'S04',
    title: 'Camera Flight Transition',
    cameraPreset: 'approach',
    visualState: 'camera_in_flight',
    description: 'Quintic smootherstep spline flight, panels dimmed to 0.72 opacity, route indicator active.',
  },
  S05: {
    id: 'S05',
    title: 'Detail Inspection (85mm)',
    cameraPreset: 'detail',
    visualState: 'focused',
    description: '85mm telephoto detail (16.1° vFOV), 78% sphere height occupancy, deep node telemetry.',
  },
  S06: {
    id: 'S06',
    title: 'Voice Active Session',
    cameraPreset: 'focused',
    visualState: 'voice_speaking',
    description: '#9AFFE0 voice orb reactive shimmer, 2-line default transcript, neutral/focus Stop.',
  },
  S07: {
    id: 'S07',
    title: 'Mobile Bottom Sheet',
    cameraPreset: 'approach',
    visualState: 'panel_open',
    description: '390×844 single bottom sheet (collapsed 72px / default 320px / expanded 520px) + 52px voice.',
  },
  S08: {
    id: 'S08',
    title: 'Tablet Inspector',
    cameraPreset: 'focused',
    visualState: 'panel_open',
    description: '820×1180 single left inspector (304px) + bottom-right voice dock, zero overlap.',
  },
  S09: {
    id: 'S09',
    title: 'Return / Resume',
    cameraPreset: 'approach',
    visualState: 'landing_hold',
    description: 'Restores bookmarked camera pose, active panel tab, scroll position, and draft state.',
  },
};

export interface DeriveCanonicalScreenInput {
  explicitScreenOverride?: GuiCanonicalScreenId | null;
  breakpoint: 'phone' | 'ipad' | 'ipad_landscape' | 'desktop' | 'wide';
  isModalOpen: boolean;
  voiceStatus: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  isCameraInFlight: boolean;
  isLandingHold: boolean;
  cameraPreset: GuiCameraPresetId;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  openPanelsCount: number;
}

export function deriveVisualState(input: {
  hasError?: boolean;
  voiceStatus: DeriveCanonicalScreenInput['voiceStatus'];
  isCameraInFlight: boolean;
  isLandingHold: boolean;
  openPanelsCount: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}): GuiVisualState {
  if (input.hasError || input.voiceStatus === 'error') return 'error';
  if (input.isCameraInFlight) return 'camera_in_flight';
  if (input.isLandingHold) return 'landing_hold';
  if (input.voiceStatus === 'connecting') return 'voice_connecting';
  if (input.voiceStatus === 'speaking') return 'voice_speaking';
  if (input.voiceStatus === 'listening') return 'voice_listening';
  if (input.openPanelsCount > 0) return 'panel_open';
  if (input.selectedNodeId) return 'focused';
  if (input.hoveredNodeId) return 'hover';
  return 'idle';
}

export function deriveCanonicalScreen(input: DeriveCanonicalScreenInput): GuiCanonicalScreenId {
  if (input.explicitScreenOverride) {
    return input.explicitScreenOverride;
  }
  if (input.isCameraInFlight) return 'S04';
  if (input.isLandingHold) return 'S09';
  if (
    input.voiceStatus === 'speaking' ||
    input.voiceStatus === 'listening' ||
    input.voiceStatus === 'connecting'
  ) {
    return 'S06';
  }
  if (input.breakpoint === 'phone' && input.openPanelsCount > 0) {
    return 'S07';
  }
  if (
    (input.breakpoint === 'ipad' || input.breakpoint === 'ipad_landscape') &&
    input.openPanelsCount > 0
  ) {
    return 'S08';
  }
  if (input.cameraPreset === 'detail') return 'S05';
  if (input.openPanelsCount > 0 || input.selectedNodeId) return 'S03';
  if (input.hoveredNodeId) return 'S02';
  return 'S01';
}
