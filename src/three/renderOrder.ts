/**
 * Neural Observatory v1.1 — deterministic 3D WebGL mesh.renderOrder contract.
 * Transparent glass, particles, splines and HUD anchors never z-fight when this order is respected.
 */
export const WEBGL_RENDER_ORDER = {
  backgroundSkyFog: 0,
  galaxyParticles: 1,
  photosphereCore: 2,
  refractiveGlassShell: 10,
  geodesicLattice: 11,
  orbitalRings: 12,
  cardiacSplineTubes: 15,
  cardiacPulseBeads: 16,
  htmlAnchors: 20,
  beatsMarkers: 18,
  beatsContent: 21,
  cerebroSphereFx: 12,
} as const;

export type WebglRenderOrderKey = keyof typeof WEBGL_RENDER_ORDER;
