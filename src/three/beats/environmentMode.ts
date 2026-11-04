export type EnvironmentMode = 'sphere1-beats' | 'network';

/**
 * The connected four-environment network is the space authority for the pitch. `?env=sphere1` mounts the
 * isolated Sphere 1 clean slate on its own, for comparison and for working on beat content in isolation.
 */
export function resolveEnvironmentMode(search: string): EnvironmentMode {
  const env = new URLSearchParams(search).get('env');
  return env === 'sphere1' || env === 'sphere1-beats' ? 'sphere1-beats' : 'network';
}
