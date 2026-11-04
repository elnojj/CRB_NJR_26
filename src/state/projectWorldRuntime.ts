/**
 * Project-world lifecycle states for master-sphere portals (L03).
 * One world active at a time; exit restores master pose ownership.
 */

export type ProjectWorldRuntimeState =
  | 'entry'
  | 'active'
  | 'suspended'
  | 'exiting'
  | 'unavailable';

export interface ProjectWorldRuntime {
  projectId: string | null;
  worldId: string | null;
  state: ProjectWorldRuntimeState;
  generation: number;
  reason?: string;
}

export const IDLE_PROJECT_WORLD: ProjectWorldRuntime = {
  projectId: null,
  worldId: null,
  state: 'unavailable',
  generation: 0,
};

export function enterProjectWorld(
  prev: ProjectWorldRuntime,
  projectId: string,
  available: boolean
): ProjectWorldRuntime {
  const generation = prev.generation + 1;
  if (!available) {
    return {
      projectId,
      worldId: `world-${projectId}`,
      state: 'unavailable',
      generation,
      reason: 'No verified project-world assets for this portal.',
    };
  }
  return {
    projectId,
    worldId: `world-${projectId}`,
    state: 'entry',
    generation,
  };
}

export function activateProjectWorld(prev: ProjectWorldRuntime): ProjectWorldRuntime {
  if (!prev.projectId || prev.state === 'unavailable') return prev;
  return { ...prev, state: 'active' };
}

export function exitProjectWorld(prev: ProjectWorldRuntime): ProjectWorldRuntime {
  if (!prev.projectId) return { ...IDLE_PROJECT_WORLD, generation: prev.generation + 1 };
  return {
    ...prev,
    state: 'exiting',
    generation: prev.generation + 1,
  };
}

export function settleMasterWorld(prev: ProjectWorldRuntime): ProjectWorldRuntime {
  return {
    projectId: null,
    worldId: null,
    state: 'unavailable',
    generation: prev.generation + 1,
  };
}

/** Stale async callbacks must ignore generations older than the owner. */
export function isStaleGeneration(owner: number, callbackGeneration: number): boolean {
  return callbackGeneration < owner;
}
