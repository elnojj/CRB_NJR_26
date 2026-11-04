import { useSyncExternalStore } from 'react';

export type HudDockButtonId = 'call' | 'hands' | 'chat' | 'nodes';

export type HudDockButtonSpec = {
  id: HudDockButtonId;
  label: string;
  active: boolean;
  onSelect: () => void;
};

export type HudDockSpec = {
  status: string;
  buttons: HudDockButtonSpec[];
};

export type HudMenuTone = 'default' | 'mint' | 'blue' | 'light';

export type HudMenuItemSpec = {
  id: string;
  label: string;
  meta?: string;
  tone?: HudMenuTone;
  testId?: string;
  onSelect: () => void;
};

export type HudMenuSectionSpec = {
  id: string;
  title?: string;
  items: HudMenuItemSpec[];
};

export type HudMenuSpec = {
  title: string;
  sections: HudMenuSectionSpec[];
  onClose: () => void;
};

type HudState = {
  menu: HudMenuSpec | null;
  dock: HudDockSpec | null;
  /** True while the WebGL canvas owns the HUD; false means DOM fallbacks must render. */
  active: boolean;
};

let state: HudState = { menu: null, dock: null, active: false };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Hand-off between React (which owns state and callbacks) and the imperative WebGL canvas (which owns the 3D menu and
 * dock). React publishes specs, the canvas renders them and reports whether it is alive.
 */
export const hudBridge = {
  get: (): HudState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setMenu(menu: HudMenuSpec | null): void {
    state = { ...state, menu };
    emit();
  },
  setDock(dock: HudDockSpec | null): void {
    state = { ...state, dock };
    emit();
  },
  setActive(active: boolean): void {
    if (state.active === active) return;
    state = { ...state, active };
    emit();
  },
};

export function useSpatialHudActive(): boolean {
  return useSyncExternalStore(hudBridge.subscribe, () => hudBridge.get().active, () => false);
}
