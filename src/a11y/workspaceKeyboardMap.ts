export const SCENE_SR_LABELS = {
  hq: 'Headquarters sphere',
  cde: 'Culture and Design Engineer sphere',
  workspace: 'Spatial workspace',
  voice: 'Voice capsule',
  panels: 'Work panels',
  canvas: 'Spatial canvas',
} as const;

export function formatKeyboardHelp(): string {
  return [
    'Arrow keys · orbit / tilt',
    'Esc · close panel or stop tour',
    'H · toggle hands',
    '? · this help',
  ].join(' · ');
}
