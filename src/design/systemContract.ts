/**
 * nojara.cerebro.system/2.0 - typed mirror of the declarative contract in `.cursorrules`.
 * Every locked token, PBR uniform, solver constant and layout bound used by runtime code
 * must be imported from here. Do not re-declare these numbers elsewhere (RULE-02).
 */

export const SYSTEM_CONTRACT_ID = 'nojara.cerebro.system/2.0' as const;

export const CONTRACT_COLORS = {
  void: '#05090E',
  canvas: '#101D27',
  glassSolid: '#142632',
  glassPanel: 'rgba(20, 38, 50, 0.88)',
  glassLight: 'rgba(20, 38, 50, 0.44)',
  hairline: 'rgba(242, 246, 248, 0.12)',
  text: '#F2F6F8',
  textSecondary: '#D0DCE3',
  accentGold: '#D4AF37',
  neonCyan: '#4C8DFF',
  signalBlue: '#65ACFF',
  aiPulse: '#9AFFE0',
  error: '#E5484D',
} as const;

export const CONTRACT_TYPOGRAPHY = {
  display: 'Jaapokki Subtract, Sora, sans-serif',
  body: 'Inter, sans-serif',
  metadata: 'JetBrains Mono, monospace',
  arabic: 'Cairo, Tajawal, sans-serif',
  bodyFloorPx: 16,
  metadataFloorPx: 12,
  hudFloorPx: 13,
} as const;

/** Spring-damper orbital solver. `dampingFactor` is the damping ratio (0.88 = slightly underdamped, ~0.3% overshoot). */
export const CONTRACT_ORBITAL_SOLVER = {
  stiffnessK: 3.8,
  dampingFactor: 0.88,
  timeStep: 0.01667,
  boundingSphereRepulsion: {
    enabled: true,
    zoomScaleFloor: 0.2,
    bufferUnits: 1.2,
    damping: 0.92,
  },
} as const;

export const CONTRACT_SHELL_MATERIAL = {
  transmission: 0.92,
  roughness: 0.05,
  ior: 1.6,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  depthWrite: false,
  envMapIntensity: 0.35,
} as const;

export type ContractSphereId = 'hq' | 'cde' | 'campaign-os' | 'about-us' | 'industry-istanba';

export type ContractSphere = {
  id: ContractSphereId;
  center: readonly [number, number, number];
  radius: number;
  skin: 'cobalt-glass' | 'amber-crystal' | 'emerald-plasma' | 'pearl-iridescent' | 'istanba-die';
  status: 'IMPLEMENTED' | 'PROPOSED_NOT_IMPLEMENTED';
};

export const CONTRACT_SPHERES: readonly ContractSphere[] = [
  { id: 'hq', center: [0, 0, 0], radius: 6.2, skin: 'cobalt-glass', status: 'IMPLEMENTED' },
  { id: 'cde', center: [38, 4, -22], radius: 6.2, skin: 'amber-crystal', status: 'IMPLEMENTED' },
  { id: 'campaign-os', center: [14, 2.5, 8], radius: 4.4, skin: 'emerald-plasma', status: 'IMPLEMENTED' },
  { id: 'about-us', center: [-14, 1.8, 5], radius: 4.4, skin: 'pearl-iridescent', status: 'IMPLEMENTED' },
  { id: 'industry-istanba', center: [18, -5, -12], radius: 4.4, skin: 'istanba-die', status: 'PROPOSED_NOT_IMPLEMENTED' },
] as const;

export const CONTRACT_MEDIA_DECOUPLING = {
  primarySphereId: 'hq',
  primarySphereMap: null,
  galaxyParticleCount: 6400,
  childReel: { aspectRatio: '9:16', frameRateFps: 24, objectFit: 'contain', audioClockSynced: true },
  activeReelTargets: ['SEVEN', 'Mission Lotus', 'Young & Human', 'El Batron', 'Lovart.ai 39 OS'],
} as const;

/** RULE-03: the only legal states for media that is not playing. */
export const MEDIA_PROVENANCE_STATUSES = ['loading', 'poster', 'unavailable', 'error'] as const;
export type MediaProvenanceStatus = (typeof MEDIA_PROVENANCE_STATUSES)[number];

export const CONTRACT_GLASS_CSS = {
  background: 'rgba(20, 38, 50, 0.88)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(242, 246, 248, 0.12)',
  borderRadius: '20px',
  perspective: '1200px',
  transformStyle: 'preserve-3d',
  panelTransform: 'rotateX(12deg) rotateY(-8deg) translateZ(40px)',
  panelHoverTransform: 'rotateX(12deg) rotateY(-8deg) translateZ(58px)',
  hoverTranslateZ: '58px',
  hoverTransition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const CONTRACT_INTERACTIVE = {
  pill: {
    minHeightPx: 36,
    minHitTargetPx: 44,
    borderRadiusPx: 18,
    glowRing: '0 0 0 2px rgba(76, 141, 255, 0.45), 0 0 22px rgba(76, 141, 255, 0.65)',
  },
  card: { paddingPx: 24, gapPx: 16, zIdle: 20, zHover: 35, expandMs: 320 },
} as const;

export const CONTRACT_HUD = {
  pill: {
    maxWidthPx: 480,
    backdropFilter: 'blur(16px)',
    background: 'rgba(20, 38, 50, 0.78)',
    border: '1px solid rgba(242, 246, 248, 0.12)',
    borderRadius: '9999px',
    wordRevealStaggerMs: 40,
    ariaLive: 'polite',
  },
  keyboard: {
    keyTokenSizePx: 30,
    keyTokenBackground: 'rgba(255, 255, 255, 0.08)',
    keyTokenBorder: '1px solid rgba(255, 255, 255, 0.15)',
    ai: '#9AFFE0',
    operator: '#4C8DFF',
    handMeshRendering: false,
  },
} as const;

export const CONTRACT_VIEWPORTS = [
  { name: 'Phone', width: 390, height: 844 },
  { name: 'Tablet Portrait', width: 820, height: 1180 },
  { name: 'Tablet Landscape', width: 1180, height: 820 },
  { name: 'Desktop HD', width: 1440, height: 900 },
  { name: 'Workstation 2K', width: 2560, height: 1440 },
] as const;

/** computeGuiLayout reserves in this order before allocating sceneSafeRect. */
export const CONTRACT_LAYOUT_RESERVATION_ORDER = [
  'header',
  'contextualSurfaceOrSheet',
  'voiceDock',
  'utilityBar',
  'tourControls',
] as const;

/** RULE-04: the only contextual surface hosts. */
export const CONTEXT_SURFACE_HOSTS = ['ProjectWorkspacePanel', 'StationInspector', 'PhoneSheet'] as const;
export type ContextSurfaceHost = (typeof CONTEXT_SURFACE_HOSTS)[number];

export const CONTRACT_PHONE_SHEET_PX = { peek: 72, default: 264, expanded: 480 } as const;
export const CONTRACT_INSPECTOR_PX = { portrait: 304, landscapeEach: 288 } as const;
