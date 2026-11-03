/**
 * Workspace keyboard map — Canvas / panels / voice capsule / camera presets.
 * Builds on 44px targets + prefers-reduced-motion from design tokens.
 */

export type WorkspaceKeyboardAction =
  | 'focus-scene'
  | 'focus-voice'
  | 'focus-panels'
  | 'toggle-mute'
  | 'toggle-sound'
  | 'stop-voice'
  | 'next-sphere'
  | 'prev-sphere'
  | 'escape-overlay'
  | 'help'
  | 'camera-preset'
  | 'toggle-fullscreen'
  | 'open-modal';

export interface KeyboardBinding {
  keys: string[];
  action: WorkspaceKeyboardAction;
  label: string;
  /** Optional camera preset index 1–9 when action is camera-preset */
  presetIndex?: number;
  modalId?: string;
}

/** Digit keys 1–9 map to GUI / cinema camera presets. */
export const CAMERA_PRESET_BINDINGS: readonly KeyboardBinding[] = [
  { keys: ['1'], action: 'camera-preset', presetIndex: 1, label: 'Camera preset 1 · master wide' },
  { keys: ['2'], action: 'camera-preset', presetIndex: 2, label: 'Camera preset 2 · HQ focus' },
  { keys: ['3'], action: 'camera-preset', presetIndex: 3, label: 'Camera preset 3 · CDE focus' },
  { keys: ['4'], action: 'camera-preset', presetIndex: 4, label: 'Camera preset 4 · stations orbit' },
  { keys: ['5'], action: 'camera-preset', presetIndex: 5, label: 'Camera preset 5 · project sun' },
  { keys: ['6'], action: 'camera-preset', presetIndex: 6, label: 'Camera preset 6 · media tube' },
  { keys: ['7'], action: 'camera-preset', presetIndex: 7, label: 'Camera preset 7 · top plan' },
  { keys: ['8'], action: 'camera-preset', presetIndex: 8, label: 'Camera preset 8 · low hero' },
  { keys: ['9'], action: 'camera-preset', presetIndex: 9, label: 'Camera preset 9 · cinematic dolly' },
] as const;

export const WORKSPACE_KEYBOARD_MAP: readonly KeyboardBinding[] = [
  { keys: ['/', '?'], action: 'help', label: 'Show keyboard help' },
  { keys: ['g', 's'], action: 'focus-scene', label: 'Focus WebGL scene' },
  { keys: ['g', 'v'], action: 'focus-voice', label: 'Focus voice capsule' },
  { keys: ['g', 'p'], action: 'focus-panels', label: 'Focus open panel' },
  { keys: ['m'], action: 'toggle-mute', label: 'Mute / unmute voice' },
  { keys: ['Shift+M'], action: 'toggle-sound', label: 'Toggle ambience / sound engine' },
  { keys: ['Escape'], action: 'escape-overlay', label: 'Close overlay / stop tour' },
  { keys: ['['], action: 'prev-sphere', label: 'Previous sphere' },
  { keys: [']'], action: 'next-sphere', label: 'Next sphere' },
  { keys: ['x'], action: 'stop-voice', label: 'Stop voice and camera' },
  { keys: ['f'], action: 'toggle-fullscreen', label: 'Toggle browser fullscreen' },
  { keys: ['Shift+3'], action: 'open-modal', modalId: 'cerebro39', label: 'Open Cerebro 39 system modal' },
  ...CAMERA_PRESET_BINDINGS,
] as const;

export const SCENE_SR_LABELS = {
  canvas: 'Cerebro dual-sphere spatial workspace. HQ at origin, CDE offset east.',
  hq: 'HQ containment sphere with stations and projects.',
  cde: 'CDE containment sphere with culture and design dimensions.',
  'campaign-os': 'Campaign OS satellite sphere.',
  'about-us': 'About Us satellite sphere.',
  workspace: 'Spatial workspace chrome and overlays.',
  voice: 'Cerebro voice capsule. Connect, mute, or stop.',
  panels: 'Work panels and inspectors.',
  captions: 'Live voice captions.',
} as const;

export function formatKeyboardHelp(): string {
  return WORKSPACE_KEYBOARD_MAP.map((b) => `${b.keys.join(' or ')}: ${b.label}`).join('. ');
}

export function resolveCameraPresetBinding(key: string): KeyboardBinding | undefined {
  return CAMERA_PRESET_BINDINGS.find((b) => b.keys.includes(key));
}
