import { useEffect } from 'react';

export interface VisualViewportMetrics {
  innerHeight: number;
  viewportHeight: number;
  offsetTop: number;
}

/** Layout-space height hidden by the on-screen keyboard (0 when closed). Ignores sub-80px toolbar jitter. */
export function computeKeyboardInset(m: VisualViewportMetrics): number {
  const hidden = Math.round(m.innerHeight - (m.viewportHeight + m.offsetTop));
  return hidden > 80 ? hidden : 0;
}

export function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable === true;
}

/**
 * iOS Safari keeps the layout viewport fixed when the keyboard opens and pans the visual viewport
 * instead. The WebGL scene stays put; only the docked chat is lifted above the keyboard via CSS
 * variables, and any page pan iOS applies to reveal the field is reset.
 */
export function useKeyboardInsetVars(active: boolean): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const root = document.documentElement;
    const apply = () => {
      const inset = computeKeyboardInset({
        innerHeight: window.innerHeight,
        viewportHeight: vv.height,
        offsetTop: vv.offsetTop,
      });
      root.style.setProperty('--cerebro-kb-inset', `${inset}px`);
      root.style.setProperty('--cerebro-safe-scale', inset > 0 ? '0' : '1');
      root.style.setProperty('--cerebro-vv-height', `${Math.round(vv.height)}px`);
      if (inset > 0 && (window.scrollY !== 0 || window.scrollX !== 0)) window.scrollTo(0, 0);
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      root.style.removeProperty('--cerebro-kb-inset');
      root.style.removeProperty('--cerebro-safe-scale');
      root.style.removeProperty('--cerebro-vv-height');
    };
  }, [active]);
}
