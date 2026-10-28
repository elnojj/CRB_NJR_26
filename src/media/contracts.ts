/**
 * Geometry, glass, and motion contracts for Spatial Media (Path A · WebGL).
 * Starting values — interpret relative to the live sphere radius (6.2u HQ/CDE).
 */

export const SPHERE_MEDIA_GEOMETRY = {
  radiusSource: 'existing-scene-config' as const,
  /** Existing CosmographCanvas HQ/CDE shell radius in world units. */
  authoritativeSphereRadiusU: 6.2,
  heroScreenOccupancy: 0.64,
  maximumScreenOccupancy: 0.72,
  minimumClearanceFromPanelsPx: 24,
  interiorBoundaryRatio: 0.82,
  projectNodeOrbitRatio: 0.58,
  projectNodeMaximumRadiusRatio: 0.085,
  minimumProjectedNodeGapPx: 16,
  maxSimultaneousReadableProjectLabels: 6,
} as const;

export const MEDIA_GRID_CONTRACT = {
  radiusRatioToParentSphere: 0.72,
  /** Absolute radius used by the existing media tube (kept for continuity). */
  radiusU: 5.4,
  columns: 8,
  visibleRows: 3,
  maximumMountedTiles: 24,
  tileWidthU: 3.2,
  tileHeightU: 1.8,
  rowPitchU: 2.25,
  minimumTileGapU: 0.18,
  planeSegments: [16, 10] as const,
} as const;

export const MEDIA_GLASS_PARAMS = {
  cornerRadiusRatio: 0.075,
  bevelWidthRatio: 0.055,
  bevelPower: 3.0,
  thickness: 0.12,
  ior: 1.46,
  dispersion: 0.006,
  refractionStrength: 0.035,
  fresnelF0: 0.04,
  environmentIntensity: 0.18,
  rimWidthRatio: 0.018,
  rimIntensity: 0.22,
  hoverRimMultiplier: 1.35,
  selectedRimMultiplier: 1.6,
  tintRgb: [0.95, 0.98, 1.0] as const,
  rimColorRgb: [0.4, 0.67, 1.0] as const,
  rimColorTopRgb: [0.706, 0.867, 1.0] as const,
} as const;

export const MEDIA_GLASS_QUALITY = {
  desktopRefractionTaps: 3,
  tabletRefractionTaps: 2,
  mobileRefractionTaps: 1,
} as const;

export const MEDIA_GRID_MOTION = {
  idleRotationRadPerSecond: 0.012,
  dragSensitivity: 0.004,
  maximumAngularVelocity: 1.8,
  dampingAt60Hz: 0.92,
  hoverVelocityMultiplier: 0.35,
  focusDurationMs: 650,
  fullViewDurationMs: 1100,
  returnDurationMs: 850,
  overscrollBehavior: 'wrap' as const,
  reducedMotionIdleRotation: 0,
} as const;

export const MEDIA_VIDEO_POLICY = {
  maximumActiveDecoders: 1,
  preload: 'metadata' as const,
  autoplay: false,
  autoplayMutedPreview: false,
  posterRequired: true,
  playbackReadyTimeoutMs: 10000,
  seekToleranceSeconds: 0.25,
  pauseWhenOffscreen: true,
  pauseWhenGalleryClosed: true,
  preservePlaybackPosition: true,
} as const;

export const MEDIA_FULLVIEW_LAYOUT = {
  desktopOccupancy: [0.7, 0.82] as const,
  minClearancePx: 24,
  controlRailH: 56,
  thumbnailRailH: 80,
  ipadMaxWidthOccupancy: 0.88,
  mobileSideInsetPx: 16,
  minTouchPx: 44,
} as const;

/** WebGPU/TSL path is scaffolded but off by default (Path B). */
export const MEDIA_RENDER_PATH = {
  active: 'webgl-glsl' as const,
  webgpuTslEnabled: false,
  liquidClothComputeEnabled: false,
} as const;
