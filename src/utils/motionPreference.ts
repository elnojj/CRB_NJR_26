export const MOTION_STORAGE_KEY = 'cerebro.motion';

export type MotionMode = 'full' | 'reduced';

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function parseMode(raw: string | null | undefined): MotionMode | null {
  if (raw === 'full' || raw === 'reduced') return raw;
  return null;
}

/**
 * The 3D scene (camera flights, glass shimmer, pulses, star drift) runs full motion by default.
 * A device-level "Reduce Motion" setting must not silently freeze navigation, so it is only
 * honoured when the visitor opts in with `?motion=reduced`; `?motion=full` clears the opt-in.
 * The choice is remembered in localStorage.
 */
export function resolveReducedMotion(search: string, storage: StorageLike | null): boolean {
  const fromUrl = parseMode(new URLSearchParams(search).get('motion'));
  if (fromUrl) {
    try {
      storage?.setItem(MOTION_STORAGE_KEY, fromUrl);
    } catch {
      /* storage can be unavailable (private mode); the URL choice still applies this load */
    }
    return fromUrl === 'reduced';
  }
  try {
    return parseMode(storage?.getItem(MOTION_STORAGE_KEY)) === 'reduced';
  } catch {
    return false;
  }
}
