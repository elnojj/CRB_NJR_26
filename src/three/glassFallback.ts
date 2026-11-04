export interface GlassNavigatorLike {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}

/**
 * iPhone / iPad / iPod Safari and every iOS browser (all WebKit). iPadOS reports itself as
 * "MacIntel" with touch points, so it is detected by the touch signature.
 */
export function isAppleMobileWebKit(nav: GlassNavigatorLike | undefined): boolean {
  if (!nav) return false;
  const ua = nav.userAgent ?? '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
}

/**
 * Glass shells that rely on a transmission render target can resolve to pure black on
 * Apple mobile GPUs when that buffer fails. Those devices (and software rasterizers) use the
 * opacity-based glass instead, which never depends on the transmission buffer.
 */
export function shouldUseFlatGlass(opts: { softwareGl: boolean; appleMobile: boolean }): boolean {
  return opts.softwareGl || opts.appleMobile;
}

export const GLASS_EMISSIVE_FLOOR = {
  color: '#0B2236',
  /** Added on top of transmission so a failed buffer still reads as deep blue glass, not black. */
  transmissiveIntensity: 0.22,
  flatIntensity: 0.4,
} as const;
