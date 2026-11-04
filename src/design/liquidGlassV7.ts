/**
 * CEREBRO · UNIFIED LIQUID GLASS 3D GUI v7
 * Canonical numeric source aligned to
 * public/assets/aistudio/CEREBRO_UNIFIED_LIQUID_GLASS_3D_V7.json
 *
 * DOM chrome uses translucent surfaces + specular pseudo-highlights.
 * WebGL meshes alone own optical depth / particles / atmosphere.
 * Never blur text or apply film grain / bloom / refraction to DOM or media content.
 */

import { CONTRACT_SHELL_MATERIAL } from './systemContract';

export const LIQUID_GLASS_V7_SCHEMA = 'cerebro.cinematic-liquid-glass.v7' as const;

export const LG_V7_TOKENS = {
  canvas: '#101D27',
  glass: '#142632',
  text: '#F2F6F8',
  muted: '#BDCBD3',
  cobalt: '#4C8DFF',
  focus: '#65ACFF',
  rim: '#B4DDFF',
  amber: '#F2B66D',
  voice: '#9AFFE0',
  valid: '#36E88D',
  error: '#FF5666',
  panelGapPx: 14,
  innerGapPx: 12,
  panelRadiusPx: 18,
  cardRadiusPx: 16,
  controlRadiusPx: 10,
  pillRadiusPx: 9999,
  touchTargetMinPx: 44,
  fonts: {
    heading: 'Sora',
    body: 'Inter',
    mono: 'JetBrains Mono',
    arabic: 'IBM Plex Sans Arabic',
  },
} as const;

export const LG_V7_GLASS = {
  base: {
    background: 'rgba(20,38,50,.62)',
    backdropBlurPx: 14,
    saturate: 1.18,
    border: '1px solid rgba(180,221,255,.20)',
    innerHighlight: 'inset 0 1px 0 rgba(242,246,248,.18)',
    shadow: '0 2px 8px rgba(0,0,0,.18),0 16px 40px rgba(0,0,0,.24)',
    specularOpacity: 0.1,
  },
  raised: {
    background: 'rgba(20,38,50,.78)',
    backdropBlurPx: 16,
    saturate: 1.18,
    border: '1px solid rgba(180,221,255,.22)',
    innerHighlight: 'inset 0 1px 0 rgba(242,246,248,.20)',
    shadow: '0 2px 8px rgba(0,0,0,.18),0 16px 40px rgba(0,0,0,.28)',
    specularOpacity: 0.16,
  },
  media: {
    background: 'rgba(11,20,28,.90)',
    backdropBlurPx: 6,
    saturate: 1.05,
    border: '1px solid rgba(180,221,255,.16)',
    excludeMediaFromGrain: true,
    excludeMediaFromBloom: true,
  },
  fallback: {
    background: 'rgba(20,38,50,.96)',
    backdropBlurPx: 0,
  },
  maxOverlappingBlurLayers: 2,
} as const;

export const LG_V7_COMPONENTS = {
  panel: {
    surface: 'raised' as const,
    radiusPx: 18,
    paddingPx: 20,
    phonePaddingPx: 16,
    gapPx: 14,
    headerHeightPx: 48,
    mountDurationMs: 180,
    mountTranslateYPx: 6,
  },
  card: {
    surface: 'base' as const,
    radiusPx: 16,
    paddingPx: 16,
    gapPx: 12,
    hoverTranslateYPx: -2,
    hoverDurationMs: 160,
    noNestedBlur: true,
  },
  button: {
    minSizePx: 44,
    radiusPx: 10,
    paddingInlinePx: 14,
    focusRingPx: 2,
    hoverMs: 140,
    maxScale: 1.015,
    variants: {
      ghost: {
        background: 'rgba(20,38,50,.32)',
        border: 'rgba(180,221,255,.24)',
      },
      glass: {
        background: 'rgba(20,38,50,.64)',
        border: 'rgba(180,221,255,.30)',
      },
      primary: {
        background: 'rgba(76,141,255,.84)',
        onePerSurface: true,
      },
      danger: {
        background: 'rgba(255,86,102,.14)',
        onlyForDestructive: true,
      },
    },
  },
  chip: {
    heightPx: 32,
    radiusPx: 9999,
    paddingInlinePx: 12,
    selectedBackground: 'rgba(76,141,255,.16)',
  },
  tabs: {
    heightPx: 44,
    gapPx: 8,
    activeUnderlinePx: 2,
  },
  inspector: {
    desktopWidthPx: 340,
    tabletWidthPx: 304,
  },
  voice: {
    orbDiameterPx: 48,
    collapsedDesktopPx: [460, 76] as const,
    collapsedTabletPx: [360, 76] as const,
    mobileWidth: 'calc(100vw - 16px)',
    accent: '#9AFFE0',
  },
  mediaViewer: {
    maxDesktopPx: [1080, 780] as const,
    phoneMaxHeightDvh: 82,
    toolbarPx: 48,
  },
  dialog: {
    radiusPx: 20,
    maxWidthPx: 520,
  },
} as const;

export const LG_V7_OPTICAL = {
  ior: CONTRACT_SHELL_MATERIAL.ior,
  roughness: CONTRACT_SHELL_MATERIAL.roughness,
  roughnessHq: CONTRACT_SHELL_MATERIAL.roughness,
  roughnessCde: CONTRACT_SHELL_MATERIAL.roughness,
  transmission: CONTRACT_SHELL_MATERIAL.transmission,
  clearcoat: CONTRACT_SHELL_MATERIAL.clearcoat,
  clearcoatRoughness: CONTRACT_SHELL_MATERIAL.clearcoatRoughness,
  envMapIntensity: CONTRACT_SHELL_MATERIAL.envMapIntensity,
  metalness: 0,
  fresnelExponent: 4,
  rimIntensity: 0.25,
  thickness: 1.1,
} as const;

export const LG_V7_PARTICLES = {
  horizon: {
    countDesktop: 24000,
    countTablet: 12000,
    countPhone: 5000,
    pointSizePx: 1.4,
    densityExponent: 2.2,
    seed: 3939,
    horizonBandNormalized: 0.12,
    rotationRadPerSec: 0.012,
  },
  dualHemisphere: {
    upper: '#F2B66D',
    lower: '#F2F6F8',
    equatorDarkBandNormalized: 0.14,
    seed: 3939,
  },
  atmosphere: {
    blue: '#65ACFF',
    density: 0.38,
    noiseOctavesDesktop: 4,
    noiseOctavesPhone: 3,
    warpStrength: 0.12,
    cycleSeconds: 30,
  },
  rings: {
    count: 2,
    tubeRadiusWorldUnits: 0.035,
    segments: 96,
  },
  sphereSegments: {
    hero: [96, 64] as const,
    navigation: [64, 48] as const,
    mobile: [40, 32] as const,
  },
  loopsSeconds: {
    sphere: 210,
    rings: 55,
    atmosphere: 30,
    particles: 36,
    fresnel: 8,
  },
} as const;

export const LG_V7_POST = {
  exposure: 1.0,
  selectiveBloomStrength: 0.24,
  bloomThreshold: 0.9,
  bloomRadius: 0.35,
  saturation: 0.96,
  contrast: 1.04,
  vignetteStrength: 0.14,
  grainStrength: 0.025,
  grainUpdateHz: 24,
  chromaticAberration: 0,
  noDoubleToneMapping: true,
  excludeDOMAndMedia: true,
} as const;

export const LG_V7_CAMERA_PRESETS = [
  { id: 'overview', lensMm: 28, verticalFovDeg: 46.4, durationMs: 3200 },
  { id: 'approach', lensMm: 35, verticalFovDeg: 37.8, durationMs: 2400 },
  { id: 'focus', lensMm: 50, verticalFovDeg: 27, durationMs: 1800 },
  { id: 'detail', lensMm: 85, verticalFovDeg: 16.1, durationMs: 1400 },
] as const;

export const LG_V7_MEDIA_TUBE = {
  radiusWorldUnits: 5.4,
  columns: 8,
  visibleRows: 3,
  maxTiles: 24,
  tileWidthWorldUnits: 3.2,
  rowPitchWorldUnits: 2.25,
  focusMs: 650,
  fullViewMs: 1100,
  returnMs: 850,
} as const;

export function lgBackdrop(blurPx: number, saturate: number): string {
  if (blurPx <= 0) return 'none';
  return `blur(${blurPx}px) saturate(${saturate})`;
}

export function particleCountForWidth(width: number): number {
  if (width < 768) return LG_V7_PARTICLES.horizon.countPhone;
  if (width < 1280) return LG_V7_PARTICLES.horizon.countTablet;
  return LG_V7_PARTICLES.horizon.countDesktop;
}

export function sphereSegmentsForWidth(width: number): readonly [number, number] {
  if (width < 768) return LG_V7_PARTICLES.sphereSegments.mobile;
  if (width < 1280) return LG_V7_PARTICLES.sphereSegments.navigation;
  return LG_V7_PARTICLES.sphereSegments.hero;
}
