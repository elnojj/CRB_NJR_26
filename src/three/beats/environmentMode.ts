export type EnvironmentMode = 'sphere1-beats' | 'network';

/**
 * Sphere 1 is the only environment mounted by default. `?env=network` brings back the four-sphere
 * network for comparison; nothing else selects it.
 */
export function resolveEnvironmentMode(search: string): EnvironmentMode {
  return new URLSearchParams(search).get('env') === 'network' ? 'network' : 'sphere1-beats';
}
