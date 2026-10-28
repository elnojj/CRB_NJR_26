import { useState, useEffect } from 'react';
import { GuiBreakpoint, GUI_BREAKPOINTS_CSS_PX, GUI_SAFE_INSETS } from './guiTokens';

export interface SafeAreaInsetsPx {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportState {
  width: number;
  height: number;
  breakpoint: GuiBreakpoint;
  keyboardInsetBottom: number;
  safeInsets: SafeAreaInsetsPx;
  overridePreset: string | null;
}

export function resolveBreakpoint(width: number): GuiBreakpoint {
  if (width <= GUI_BREAKPOINTS_CSS_PX.phone[1]) return 'phone';
  if (width <= GUI_BREAKPOINTS_CSS_PX.tablet[1]) return 'tablet';
  if (width <= GUI_BREAKPOINTS_CSS_PX.desktop[1]) return 'desktop';
  return 'wide';
}

export const VIEWPORT_PRESET_DIMENSIONS: Record<string, { width: number; height: number }> = {
  phone_390x844: { width: 390, height: 844 },
  ipad_820x1180: { width: 820, height: 1180 },
  ipad_landscape_1180x820: { width: 1180, height: 820 },
  desktop_1440x900: { width: 1440, height: 900 },
  wide_1920x1080: { width: 1920, height: 1080 },
};

function readViewportDimensions(overridePreset: string | null): ViewportState {
  if (overridePreset && VIEWPORT_PRESET_DIMENSIONS[overridePreset]) {
    const { width, height } = VIEWPORT_PRESET_DIMENSIONS[overridePreset];
    return {
      width,
      height,
      breakpoint: resolveBreakpoint(width),
      keyboardInsetBottom: 0,
      safeInsets: {
        top: GUI_SAFE_INSETS.minPx,
        right: GUI_SAFE_INSETS.minPx,
        bottom: GUI_SAFE_INSETS.minPx,
        left: GUI_SAFE_INSETS.minPx,
      },
      overridePreset,
    };
  }

  if (typeof window === 'undefined') {
    return {
      width: 1440,
      height: 900,
      breakpoint: 'desktop',
      keyboardInsetBottom: 0,
      safeInsets: { top: 12, right: 12, bottom: 12, left: 12 },
      overridePreset: null,
    };
  }

  const width = Math.max(320, Math.round(window.innerWidth));
  const height = Math.max(480, Math.round(window.innerHeight));
  const vv = window.visualViewport;
  const keyboardInsetBottom = vv
    ? Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)))
    : 0;

  return {
    width,
    height,
    breakpoint: resolveBreakpoint(width),
    keyboardInsetBottom,
    safeInsets: {
      top: GUI_SAFE_INSETS.minPx,
      right: GUI_SAFE_INSETS.minPx,
      bottom: Math.max(GUI_SAFE_INSETS.minPx, keyboardInsetBottom),
      left: GUI_SAFE_INSETS.minPx,
    },
    overridePreset: null,
  };
}

export function useViewport(initialOverridePreset?: string | null): ViewportState & {
  setOverridePreset: (preset: string | null) => void;
} {
  const [overridePreset, setOverridePreset] = useState<string | null>(() => {
    if (initialOverridePreset) return initialOverridePreset;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const vp = params.get('viewport');
      if (vp && VIEWPORT_PRESET_DIMENSIONS[vp]) return vp;
    }
    return null;
  });

  const [state, setState] = useState<ViewportState>(() =>
    readViewportDimensions(overridePreset)
  );

  useEffect(() => {
    setState(readViewportDimensions(overridePreset));
  }, [overridePreset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setState(readViewportDimensions(overridePreset));
    };
    window.addEventListener('resize', handleResize, { passive: true });
    window.visualViewport?.addEventListener('resize', handleResize, { passive: true });
    window.visualViewport?.addEventListener('scroll', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [overridePreset]);

  return {
    ...state,
    setOverridePreset,
  };
}
