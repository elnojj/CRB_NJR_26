/**
 * Monolithic Precision — cinematic editorial tokens for Blueprint H03.
 * Warm bone / carbon / silver. No neon, glassmorphic cards, or pill chrome.
 */

export const EDITORIAL_SCHEMA = 'cerebro.editorial.monograph/h03' as const;

export const EDITORIAL_COLOURS = {
  carbon: '#0E1012',
  basalt: '#1A1C1E',
  ink: '#121416',
  silver: '#CFD7DF',
  bone: '#F5F3EE',
  boneMuted: '#D8D4CB',
  rule: 'rgba(207, 215, 223, 0.28)',
  ruleStrong: 'rgba(207, 215, 223, 0.55)',
  focus: '#B8C4CE',
  amberSignal: '#C4A574',
  risk: '#B8794A',
  blocked: '#A85A4A',
} as const;

export const EDITORIAL_LIGHTING = {
  key: { color: 0xf5f3ee, intensity: 2.2, position: [12, 18, 10] as const },
  rim: { color: 0xcfd7df, intensity: 3.5, position: [-10, 8, -16] as const },
  ambient: { color: 0x1a1c1e, intensity: 0.8 },
  clear: 0x0e1012,
  fogDensity: 0.012,
  exposure: 1.05,
} as const;

export const EDITORIAL_POST = {
  bloomStrength: 0.08,
  bloomRadius: 0.35,
  bloomThreshold: 0.92,
  grain: 0.04,
  chromaticAberration: 0.0012,
  vignette: 0.42,
  saturation: 0.9,
  contrast: 1.06,
} as const;

export type EditorialQualityTier = 'high' | 'medium' | 'low' | 'fallback';

export const EDITORIAL_QUALITY = {
  high: { dprCap: 2, post: true, parallax: true, targetFps: 55 },
  medium: { dprCap: 1.25, post: true, parallax: false, targetFps: 40 },
  low: { dprCap: 1, post: false, parallax: false, targetFps: 30 },
  fallback: { dprCap: 1, post: false, parallax: false, targetFps: 0 },
} as const;

export type EditorialCameraPresetId = '01_INIT' | '02_SURF' | '03_SPEC' | '04_DISP';

export interface EditorialCameraPreset {
  id: EditorialCameraPresetId;
  designator: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  intent: string;
}

/** Absolute poses relative to HQ sphere origin (world units). */
export const EDITORIAL_CAMERA_PRESETS: Record<
  EditorialCameraPresetId,
  EditorialCameraPreset
> = {
  '01_INIT': {
    id: '01_INIT',
    designator: 'Hero Architecture',
    position: [0.0, 1.2, 5.0],
    target: [0.0, 0.0, 0.0],
    fov: 35,
    intent: 'Full-profile introduction, elevated oblique perspective.',
  },
  '02_SURF': {
    id: '02_SURF',
    designator: 'Material Macro',
    position: [1.8, 0.4, 2.2],
    target: [0.2, -0.1, 0.4],
    fov: 28,
    intent: 'Grazing macro view highlighting surface microstructure.',
  },
  '03_SPEC': {
    id: '03_SPEC',
    designator: 'Technical Profile',
    position: [-2.8, 1.8, 2.6],
    target: [-0.2, 0.1, 0.0],
    fov: 30,
    intent: 'Orthographic-style silhouette inspection.',
  },
  '04_DISP': {
    id: '04_DISP',
    designator: 'Epilogue Framing',
    position: [0.0, 3.2, 4.2],
    target: [0.0, -0.2, 0.0],
    fov: 32,
    intent: 'Overhead structural view framing terminal editorial conclusions.',
  },
};

export interface EditorialSection {
  id: string;
  navLabel: string;
  chapter: string;
  title: string;
  summary: string;
  camera: EditorialCameraPresetId;
  theme: 'dark' | 'paper';
}

export const EDITORIAL_SECTIONS: EditorialSection[] = [
  {
    id: 'hero',
    navLabel: 'I',
    chapter: '01 · Init',
    title: 'Cerebro as archival instrument',
    summary:
      'Blueprint H03 reframes the HQ observatory as a publication: sticky WebGL evidence behind a reading surface that never borrows its hierarchy from the camera.',
    camera: '01_INIT',
    theme: 'dark',
  },
  {
    id: 'register',
    navLabel: 'II',
    chapter: '02 · Surface',
    title: 'Register health, without neon',
    summary:
      'At-risk and blocked workstreams are listed as typographic evidence — hairline rules, coordinate labels, Africa/Cairo session time — not glowing status pills.',
    camera: '02_SURF',
    theme: 'dark',
  },
  {
    id: 'optics',
    navLabel: 'III',
    chapter: '03 · Spec',
    title: 'Studio light, filmic optics',
    summary:
      'Key, rim, basalt fill, and PMREM environment replace cobalt blooms. ACES compression, micro-grain, vignette, and restrained chromatic aberration stay on the scene only.',
    camera: '03_SPEC',
    theme: 'dark',
  },
  {
    id: 'epilogue',
    navLabel: 'IV',
    chapter: '04 · Disposition',
    title: 'Three-tier resilience',
    summary:
      'Full WebGL, constrained hardware without post, or a static high-fidelity capture with the same editorial DOM. Content remains operable if the scene fails.',
    camera: '04_DISP',
    theme: 'dark',
  },
];

export interface EditorialCameraPose {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
}

export function poseFromPreset(
  id: EditorialCameraPresetId,
  scale = 6.2
): EditorialCameraPose {
  const p = EDITORIAL_CAMERA_PRESETS[id];
  return {
    x: p.position[0] * scale,
    y: p.position[1] * scale,
    z: p.position[2] * scale,
    tx: p.target[0] * scale,
    ty: p.target[1] * scale,
    tz: p.target[2] * scale,
    fov: p.fov,
  };
}

/** Carbon-stage SVG stills for Tier-3 fallback (aligned to camera chapters). */
export function editorialFallbackDataUri(preset: EditorialCameraPresetId): string {
  const labels: Record<EditorialCameraPresetId, string> = {
    '01_INIT': 'HERO · OBLIQUE',
    '02_SURF': 'MACRO · SURFACE',
    '03_SPEC': 'PROFILE · SILHOUETTE',
    '04_DISP': 'EPILOGUE · OVERHEAD',
  };
  const cx = preset === '03_SPEC' ? 360 : preset === '02_SURF' ? 440 : 400;
  const cy = preset === '04_DISP' ? 320 : preset === '02_SURF' ? 430 : 400;
  const r = preset === '02_SURF' ? 210 : preset === '04_DISP' ? 260 : 240;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" fill="none">
  <rect width="800" height="800" fill="#0E1012"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#1A1C1E" stroke="#CFD7DF" stroke-opacity="0.35" stroke-width="1"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" stroke="#F5F3EE" stroke-opacity="0.18" stroke-width="0.8"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.95}" ry="${r * 0.34}" stroke="#CFD7DF" stroke-opacity="0.22" stroke-width="0.9" transform="rotate(-16 ${cx} ${cy})"/>
  <text x="48" y="56" fill="#CFD7DF" fill-opacity="0.7" font-family="ui-monospace,monospace" font-size="14" letter-spacing="2">${labels[preset]}</text>
  <text x="48" y="760" fill="#D8D4CB" fill-opacity="0.55" font-family="ui-monospace,monospace" font-size="12">H03 · STATIC CAPTURE · TIER 3</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
