import { isAppleMobileWebKit } from '../three/glassFallback';

export type EngineProbe = {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
};

/**
 * True for every WebKit-based browser: desktop Safari, and all iOS/iPadOS browsers (Chrome, Firefox and Edge on
 * Apple mobile are WebKit under the hood). Chromium/Gecko on other platforms returns false.
 */
export function isWebKitEngine(probe: EngineProbe): boolean {
  const ua = probe.userAgent;
  if (isAppleMobileWebKit(probe)) return true;
  if (!/AppleWebKit/i.test(ua)) return false;
  return !/Chrome|Chromium|Edg|OPR|Android|Firefox/i.test(ua);
}

let cached: boolean | null = null;

export function detectWebKitEngine(): boolean {
  if (cached !== null) return cached;
  if (typeof navigator === 'undefined') return false;
  cached = isWebKitEngine({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
  return cached;
}

/** Marks <html> so CSS can swap backdrop-filter glass for matte carbon-black on WebKit. */
export function applyEngineAttributes(root: HTMLElement = document.documentElement): void {
  root.dataset.engine = detectWebKitEngine() ? 'webkit' : 'blink-gecko';
}
