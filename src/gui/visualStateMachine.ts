/**
 * CEREBRO Stellar Command — GUI Amendment v3.0
 * Visual State Machine (10 interaction states) & 9 Canonical Screens (S01..S09)
 */

import { GuiCameraPresetId } from './cameraPresets';

export type GuiVisualState =
  | 'idle'
  | 'hover'
  | 'focus'
  | 'selected'
  | 'traveling'
  | 'landing'
  | 'panel-open'
  | 'speaking'
  | 'listening'
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
  defaultVisualState: GuiVisualState;
  description: string;
}

export const GUI_CANONICAL_SCREENS: Record<GuiCanonicalScreenId, GuiCanonicalScreenSpec> = {
  S01: {
    id: 'S01',
    title: 'Boot / Arrival',
    cameraPreset: 'universe',
    defaultVisualState: 'idle',
    description: '28mm overview, subtle sphere drift, voice pill idle, no inspector panels open',
  },
  S02: {
    id: 'S02',
    title: 'Focus / Hover',
    cameraPreset: 'approach',
    defaultVisualState: 'focus',
    description: 'Pointer halo and target ring highlight nearest station or sphere region; short label chip only',
  },
  S03: {
    id: 'S03',
    title: 'Selected Target',
    cameraPreset: 'focused',
    defaultVisualState: 'selected',
    description: 'Camera moves to 35-50mm framing; primary inspector opens in assigned slot without covering target',
  },
  S04: {
    id: 'S04',
    title: 'Travel / Flight',
    cameraPreset: 'approach',
    defaultVisualState: 'traveling',
    description: 'Spline flight with route line, destination title, reduced panel opacity, no new popups during travel',
  },
  S05: {
    id: 'S05',
    title: 'Detail / Micro View',
    cameraPreset: 'detail',
    defaultVisualState: 'panel-open',
    description: '85mm close view of station cluster; max 2 panels on desktop, 1 on tablet/phone',
  },
  S06: {
    id: 'S06',
    title: 'Voice Active',
    cameraPreset: 'focused',
    defaultVisualState: 'speaking',
    description: 'Voice dock expands transcript max 2 lines by default; full transcript opens as drawer or tab',
  },
  S07: {
    id: 'S07',
    title: 'Media / Presentation Modal',
    cameraPreset: 'focused',
    defaultVisualState: 'panel-open',
    description: 'Centered modal at z-60; background panels dim and pause pointer capture; Escape closes',
  },
  S08: {
    id: 'S08',
    title: 'Mobile / iPad Adaptive Mode',
    cameraPreset: 'approach',
    defaultVisualState: 'panel-open',
    description: 'Single bottom sheet or single left inspector; touch orbit/pinch preserved on unobstructed canvas',
  },
  S09: {
    id: 'S09',
    title: 'Return / Resume',
    cameraPreset: 'universe',
    defaultVisualState: 'landing',
    description: 'Back returns to previous camera bookmark and restores previous panel tab state',
  },
};

export interface CameraBookmark {
  screenId: GuiCanonicalScreenId;
  cameraPreset: GuiCameraPresetId;
  selectedNodeId: string | null;
  openPanels: string[];
  timestamp: number;
}

export function deriveVisualState(params: {
  hasError: boolean;
  voiceStatus: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  isCameraInFlight: boolean;
  isLandingHold: boolean;
  openPanelsCount: number;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}): GuiVisualState {
  if (params.hasError || params.voiceStatus === 'error') return 'error';
  if (params.voiceStatus === 'speaking') return 'speaking';
  if (params.voiceStatus === 'listening') return 'listening';
  if (params.isCameraInFlight) return 'traveling';
  if (params.isLandingHold) return 'landing';
  if (params.openPanelsCount > 0) return 'panel-open';
  if (params.selectedNodeId) return 'selected';
  if (params.hoveredNodeId) return 'hover';
  return 'idle';
}

export function deriveCanonicalScreen(params: {
  explicitScreenOverride: GuiCanonicalScreenId | null;
  breakpoint: 'phone' | 'tablet' | 'ipad' | 'ipad_landscape' | 'desktop' | 'wide';
  isModalOpen: boolean;
  voiceStatus: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  isCameraInFlight: boolean;
  isLandingHold: boolean;
  cameraPreset: GuiCameraPresetId;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  openPanelsCount: number;
}): GuiCanonicalScreenId {
  if (params.explicitScreenOverride) return params.explicitScreenOverride;
  if (params.isModalOpen) return 'S07';
  if (params.isCameraInFlight) return 'S04';
  if (params.isLandingHold) return 'S09';
  if (params.voiceStatus === 'speaking' || params.voiceStatus === 'listening') return 'S06';
  if (
    (params.breakpoint === 'phone' ||
      params.breakpoint === 'tablet' ||
      params.breakpoint === 'ipad' ||
      params.breakpoint === 'ipad_landscape') &&
    params.openPanelsCount > 0
  ) {
    return 'S08';
  }
  if (params.cameraPreset === 'detail' || params.cameraPreset === 'focus') return 'S05';
  if (params.selectedNodeId || params.openPanelsCount > 0) return 'S03';
  if (params.hoveredNodeId) return 'S02';
  return 'S01';
}
