import type { ConnectedSphereId } from '../three/sphereNetwork';

export type CerebroSessionSnapshot = {
  activeSphere: ConnectedSphereId | string;
  openPanels?: string[];
  activePocket?: string;
  selectedProjectId?: string | null;
  navigation?: {
    history?: string[];
    cursor?: number;
    language?: 'en' | 'ar';
    worldId?: string;
    projectId?: string | null;
    selectedNodeId?: string | null;
    contextualSurfaceId?: string | null;
    projectTab?: string;
    cameraBookmarkId?: string | null;
    introOrTourMode?: string;
  };
  updatedAt: number;
};

const KEY = 'cerebro.session.v1';

export function readSessionSnapshot(): CerebroSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CerebroSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeSessionSnapshot(
  snap: Partial<CerebroSessionSnapshot> & { activeSphere: ConnectedSphereId | string }
): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = readSessionSnapshot();
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({
        ...(prev || {}),
        ...snap,
        navigation: {
          ...(prev?.navigation || {}),
          ...(snap.navigation || {}),
        },
        activeSphere: snap.activeSphere,
        updatedAt: Date.now(),
      } satisfies CerebroSessionSnapshot)
    );
  } catch {
    // ignore
  }
}

export function hydrationSequence(): string[] {
  return ['session', 'register', 'spheres', 'voice', 'workspace'];
}
