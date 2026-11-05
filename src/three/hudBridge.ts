import { useEffect, useSyncExternalStore } from 'react';

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
  keyboardControls: boolean;
};

let state: HudState = { menu: null, dock: null, active: false, keyboardControls: false };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** One rendered control set at a time; original callbacks stay available to the DOM. */
export function spatialHudPresentation(snapshot = state) {
  return {
    menu: snapshot.keyboardControls ? null : snapshot.menu,
    dock: snapshot.keyboardControls ? null : snapshot.dock,
  };
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
  setKeyboardControls(keyboardControls: boolean): void {
    if (state.keyboardControls === keyboardControls) return;
    state = { ...state, keyboardControls };
    emit();
  },
};

export function useSpatialHudActive(): boolean {
  return useSyncExternalStore(hudBridge.subscribe, () => state.active && !state.keyboardControls, () => false);
}

/** Reveal real DOM controls for keyboard/assistive focus; never leave focus on a clipped mirror. */
export function useSpatialHudInputMode(): void {
  useEffect(() => {
    const isControl = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('[data-hud-keyboard-control]'));
    const key = (event: KeyboardEvent) => { if (event.key === 'Tab') hudBridge.setKeyboardControls(true); };
    const focus = (event: FocusEvent) => { if (isControl(event.target)) hudBridge.setKeyboardControls(true); };
    const pointer = (event: PointerEvent) => { if (!isControl(event.target)) hudBridge.setKeyboardControls(false); };
    window.addEventListener('keydown', key, true);
    window.addEventListener('focusin', focus);
    window.addEventListener('pointerdown', pointer, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('focusin', focus);
      window.removeEventListener('pointerdown', pointer, true);
    };
  }, []);
}
