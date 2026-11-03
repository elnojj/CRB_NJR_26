/**
 * Workspace keyboard map — Canvas / panels / voice capsule.
 * Builds on 44px targets + prefers-reduced-motion from design tokens.
 */

export type WorkspaceKeyboardAction =
  | 'focus-scene'
  | 'focus-voice'
  | 'focus-panels'
  | 'toggle-mute'
  | 'stop-voice'
  | 'next-sphere'
  | 'prev-sphere'
  | 'escape-overlay'
  | 'help';

export interface KeyboardBinding {
  keys: string[];
  action: WorkspaceKeyboardAction;
  label: string;
}

export const WORKSPACE_KEYBOARD_MAP: readonly KeyboardBinding[] = [
  { keys: ['/', '?'], action: 'help', label: 'Show keyboard help' },
  { keys: ['g', 's'], action: 'focus-scene', label: 'Focus WebGL scene' },
  { keys: ['g', 'v'], action: 'focus-voice', label: 'Focus voice capsule' },
  { keys: ['g', 'p'], action: 'focus-panels', label: 'Focus open panel' },
  { keys: ['m'], action: 'toggle-mute', label: 'Mute / unmute voice' },
  { keys: ['Escape'], action: 'escape-overlay', label: 'Close overlay / stop tour' },
  { keys: ['['], action: 'prev-sphere', label: 'Previous sphere' },
  { keys: [']'], action: 'next-sphere', label: 'Next sphere' },
  { keys: ['x'], action: 'stop-voice', label: 'Stop voice and camera' },
] as const;

export const SCENE_SR_LABELS = {
  canvas: 'Cerebro dual-sphere spatial workspace. HQ at origin, CDE offset east.',
  hq: 'HQ containment sphere with stations and projects.',
  cde: 'CDE containment sphere with culture and design dimensions.',
  'campaign-os': 'Campaign OS satellite sphere.',
  'about-us': 'About Us satellite sphere.',
  voice: 'Cerebro voice capsule. Connect, mute, or stop.',
  captions: 'Live voice captions.',
} as const;

export function formatKeyboardHelp(): string {
  return WORKSPACE_KEYBOARD_MAP.map((b) => `${b.keys.join(' or ')}: ${b.label}`).join('. ');
}
