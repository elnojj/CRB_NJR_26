export type ProjectWorldRuntime = {
  projectId: string | null;
  phase: 'idle' | 'entering' | 'active' | 'exiting';
  state?: 'idle' | 'entering' | 'active' | 'exiting' | string;
  label?: string;
  reason?: string;
  worldType?: string;
};

export const IDLE_PROJECT_WORLD: ProjectWorldRuntime = {
  projectId: null,
  phase: 'idle',
  state: 'idle',
};

/** AI Studio signature: (prev, projectId, availableFlag) */
export function enterProjectWorld(
  prevOrId: ProjectWorldRuntime | string,
  projectIdOrLabel?: string | boolean,
  availableOrWorldType?: boolean | string
): ProjectWorldRuntime {
  if (typeof prevOrId === 'string') {
    return {
      projectId: prevOrId,
      phase: 'entering',
      state: 'entering',
      label: typeof projectIdOrLabel === 'string' ? projectIdOrLabel : undefined,
      worldType: typeof availableOrWorldType === 'string' ? availableOrWorldType : 'project',
    };
  }
  const projectId = typeof projectIdOrLabel === 'string' ? projectIdOrLabel : null;
  const available = availableOrWorldType !== false;
  return {
    ...prevOrId,
    projectId,
    phase: available ? 'entering' : 'idle',
    state: available ? 'entering' : 'unavailable',
    reason: available ? undefined : 'world_unavailable',
  };
}

export function activateProjectWorld(
  current: ProjectWorldRuntime
): ProjectWorldRuntime {
  if (!current.projectId) return IDLE_PROJECT_WORLD;
  return { ...current, phase: 'active', state: 'active' };
}

export function exitProjectWorld(
  current?: ProjectWorldRuntime
): ProjectWorldRuntime {
  return {
    projectId: null,
    phase: 'exiting',
    state: 'exiting',
    reason: current?.reason,
  };
}

export function settleMasterWorld(
  currentOrReason?: ProjectWorldRuntime | string
): ProjectWorldRuntime {
  if (typeof currentOrReason === 'string') {
    return { ...IDLE_PROJECT_WORLD, reason: currentOrReason };
  }
  return IDLE_PROJECT_WORLD;
}
