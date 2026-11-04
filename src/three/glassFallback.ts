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
 * Only software rasterizers use the opacity-based glass. Every real GPU, Apple mobile included,
 * renders the full transmission/refraction material; the emissive floor below keeps it from
 * resolving to pure black if the transmission buffer ever fails. `?glass=flat` forces the
 * fallback for diagnosis.
 */
export function shouldUseFlatGlass(opts: { softwareGl: boolean; forceFlat?: boolean }): boolean {
  return opts.softwareGl || opts.forceFlat === true;
}

export const GLASS_EMISSIVE_FLOOR = {
  color: '#0B2236',
  /** Added on top of transmission so a failed buffer still reads as deep blue glass, not black. */
  transmissiveIntensity: 0.22,
  flatIntensity: 0.4,
} as const;
