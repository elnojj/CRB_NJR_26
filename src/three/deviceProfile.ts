import { isAppleMobileWebKit } from './glassFallback';

/**
 * Render budget per device class. Pure: the canvas reads the browser once, hands the facts in here and
 * applies the numbers. Tablets and phones trade resolution and post-processing for a clear, steady frame
 * instead of a hazy, stuttering one: lower pixel ratio, half-resolution bloom, fewer MSAA samples and a
 * tight cap on simultaneous video decoders.
 */

export type DeviceTier = 'phone' | 'tablet' | 'desktop';

export interface DeviceFacts {
  width: number;
  height: number;
  coarsePointer: boolean;
  appleMobileWebKit: boolean;
  devicePixelRatio: number;
  softwareGl: boolean;
  /** `navigator.deviceMemory` in GB when the browser reports it (Chromium only). */
  deviceMemoryGb?: number;
}

export interface DeviceProfile {
  tier: DeviceTier;
  /** Highest pixel ratio the adaptive governor may use. */
  pixelRatioCap: number;
  /** Lowest pixel ratio the governor may fall back to under load. */
  pixelRatioFloor: number;
  initialPixelRatio: number;
  /** MSAA samples on the composer target. */
  msaaSamples: number;
  bloomStrength: number;
  /** Small exposure lift so ACES does not read as dim on bright tablet panels in daylight. */
  exposureLift: number;
  /** Concurrent playing video textures. */
  maxVideoTextures: number;
  /** Frame time above which the governor lowers resolution, ms. */
  budgetFrameMs: number;
  preserveDrawingBuffer: boolean;
  anisotropy: number;
}

const PHONE_MAX_SHORT_SIDE = 600;

export function resolveDeviceTier(facts: Pick<DeviceFacts, 'width' | 'height' | 'coarsePointer' | 'appleMobileWebKit'>): DeviceTier {
  const touchFirst = facts.coarsePointer || facts.appleMobileWebKit;
  if (!touchFirst) return 'desktop';
  const shortSide = Math.min(facts.width, facts.height);
  return shortSide < PHONE_MAX_SHORT_SIDE ? 'phone' : 'tablet';
}

export function resolveDeviceProfile(facts: DeviceFacts): DeviceProfile {
  const dpr = Math.max(1, facts.devicePixelRatio || 1);
  if (facts.softwareGl) {
    return {
      tier: resolveDeviceTier(facts),
      pixelRatioCap: 1,
      pixelRatioFloor: 1,
      initialPixelRatio: 1,
      msaaSamples: 0,
      bloomStrength: 0,
      exposureLift: 0,
      maxVideoTextures: 1,
      budgetFrameMs: 80,
      preserveDrawingBuffer: true,
      anisotropy: 1,
    };
  }
  const tier = resolveDeviceTier(facts);
  const lowMemory = (facts.deviceMemoryGb ?? 8) <= 3;
  switch (tier) {
    case 'phone':
      return {
        tier,
        pixelRatioCap: 1.5,
        pixelRatioFloor: 1,
        initialPixelRatio: Math.min(dpr, 1.5),
        msaaSamples: 0,
        bloomStrength: 0.3,
        exposureLift: 0.1,
        maxVideoTextures: 1,
        budgetFrameMs: 24,
        preserveDrawingBuffer: false,
        anisotropy: 2,
      };
    case 'tablet':
      return {
        tier,
        pixelRatioCap: 2,
        pixelRatioFloor: 1.25,
        initialPixelRatio: Math.min(dpr, lowMemory ? 1.5 : 1.75),
        msaaSamples: 2,
        bloomStrength: 0.34,
        exposureLift: 0.08,
        maxVideoTextures: lowMemory ? 1 : 2,
        budgetFrameMs: 22,
        preserveDrawingBuffer: false,
        anisotropy: 4,
      };
    case 'desktop':
      return {
        tier,
        pixelRatioCap: 2,
        pixelRatioFloor: 1,
        initialPixelRatio: Math.min(dpr, 2),
        msaaSamples: 4,
        bloomStrength: 0.42,
        exposureLift: 0,
        maxVideoTextures: 4,
        budgetFrameMs: 20,
        preserveDrawingBuffer: true,
        anisotropy: 8,
      };
    default: {
      const unreachable: never = tier;
      return unreachable;
    }
  }
}

export function readDeviceFacts(
  softwareGl: boolean,
  win: Pick<Window, 'innerWidth' | 'innerHeight' | 'devicePixelRatio' | 'matchMedia'> = window
): DeviceFacts {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    coarsePointer: typeof win.matchMedia === 'function' && win.matchMedia('(pointer: coarse)').matches,
    appleMobileWebKit: isAppleMobileWebKit(nav),
    devicePixelRatio: win.devicePixelRatio || 1,
    softwareGl,
    deviceMemoryGb: nav?.deviceMemory,
  };
}
