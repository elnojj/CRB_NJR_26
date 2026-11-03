/**
 * Edited-second shot catalog — cutdowns from public NOJARA Wix brand masters.
 * Fills every sphere / station / project / dimension / subdomain sieve with a
 * distinct local clip. Provenance is public-brand cutdown, not a unique
 * project camera master.
 *
 * Files live under /public/media/shots and /public/media/shot-posters.
 * Manifest mirror: /public/media/shot-catalog.json
 */

export type ShotKind = 'sphere' | 'station' | 'project' | 'dimension' | 'subdomain' | 'plate';

export type ShotEntry = {
  id: string;
  master: 'showreel2023' | 'laliga' | 'el-batron';
  start: number;
  duration: number;
  kind: ShotKind;
  slot: string;
  note: string;
  videoPath: string;
  posterPath: string;
};

const D = 5.5;

function shot(
  id: string,
  master: ShotEntry['master'],
  start: number,
  kind: ShotKind,
  slot: string,
  note: string
): ShotEntry {
  return {
    id,
    master,
    start,
    duration: D,
    kind,
    slot,
    note,
    videoPath: `/media/shots/${id}.mp4`,
    posterPath: `/media/shot-posters/${id}.jpg`,
  };
}

export const SHOT_CATALOG_POLICY =
  'Edited seconds cut from public NOJARA Wix brand masters to fill every sphere/node/station sieve. Provenance is public-brand cutdown — not a claim of unique project camera masters.';

export const SHOT_CLIP_DURATION_SEC = D;

export const SHOT_ENTRIES: ShotEntry[] = [
  shot('sphere-hq', 'showreel2023', 4, 'sphere', 'hq', 'HQ ambient cutdown from NOJARA 2023 showreel'),
  shot('sphere-cde', 'showreel2023', 52, 'sphere', 'cde', 'CDE ambient cutdown from NOJARA 2023 showreel'),
  shot('sphere-campaign-os', 'laliga', 18, 'sphere', 'campaign-os', 'Campaign OS ambient from LaLiga film'),
  shot('sphere-about-us', 'el-batron', 8, 'sphere', 'about-us', 'About Us ambient from El Batron showreel'),

  shot('station-projects', 'showreel2023', 12, 'station', 'projects', 'Station projects edited shot'),
  shot('station-tasks', 'showreel2023', 28, 'station', 'tasks', 'Station tasks edited shot'),
  shot('station-people', 'showreel2023', 44, 'station', 'people', 'Station people edited shot'),
  shot('station-files', 'showreel2023', 68, 'station', 'files', 'Station files edited shot'),
  shot('station-media', 'showreel2023', 92, 'station', 'media', 'Station media edited shot'),

  shot('project-seven', 'showreel2023', 20, 'project', 'SEVEN', 'SEVEN node cutdown from public showreel'),
  shot('project-yah', 'showreel2023', 36, 'project', 'YAH', 'YAH node cutdown from public showreel'),
  // Ambient studio cutdowns only — NOT proof of MHE / BSocial / Museum of Almost delivery.
  shot(
    'project-mhe',
    'laliga',
    40,
    'project',
    'MHE',
    'AMBIENT ONLY: LaLiga studio cutdown filling MHE node — not Abu Hamdan project footage'
  ),
  shot(
    'project-bsocial',
    'laliga',
    72,
    'project',
    'BSOCIAL',
    'AMBIENT ONLY: LaLiga studio cutdown filling BSocial node — not BSocial project footage'
  ),
  shot('project-al-ahram', 'showreel2023', 84, 'project', 'AL-AHRAM', 'AL-AHRAM node cutdown from public showreel'),
  shot(
    'project-museum-of-almost',
    'showreel2023',
    108,
    'project',
    'MUSEUM-OF-ALMOST',
    'AMBIENT ONLY: public showreel cutdown — not Museum of Almost camera masters'
  ),
  shot('project-el-batron', 'el-batron', 24, 'project', 'EL-BATRON', 'EL-BATRON node cutdown from El Batron showreel'),
  // Gondwana removed from cinematic journey; catalog entry retained as ambient-only with explicit note.
  shot(
    'project-gondwana',
    'laliga',
    110,
    'project',
    'GONDWANA',
    'EXCLUDED FROM CINEMATIC JOURNEY · ambient LaLiga cutdown only — not Gondwana project proof'
  ),

  shot('dim-strategy', 'showreel2023', 14, 'dimension', 'strategy', 'CDE dimension strategy cutdown'),
  shot('dim-production', 'laliga', 56, 'dimension', 'production', 'CDE dimension production cutdown'),
  shot('dim-talent', 'el-batron', 100, 'dimension', 'talent', 'CDE dimension talent cutdown'),
  shot('dim-mediatech', 'laliga', 140, 'dimension', 'mediatech', 'CDE dimension mediatech cutdown'),

  shot('sub-dest', 'showreel2023', 24, 'subdomain', 'sub-dest', 'Subdomain destination storytelling cutdown'),
  shot('sub-brand', 'showreel2023', 60, 'subdomain', 'sub-brand', 'Subdomain brand systems cutdown'),
  shot('sub-act', 'laliga', 28, 'subdomain', 'sub-act', 'Subdomain activations cutdown'),
  shot('sub-spatial', 'el-batron', 48, 'subdomain', 'sub-spatial', 'Subdomain live spatial cutdown'),
  shot('sub-pract', 'laliga', 88, 'subdomain', 'sub-pract', 'Subdomain practitioners cutdown'),
  shot('sub-accel', 'showreel2023', 76, 'subdomain', 'sub-accel', 'Subdomain talent accelerator cutdown'),
  shot('sub-museums', 'el-batron', 72, 'subdomain', 'sub-museums', 'Subdomain museums cutdown'),
  shot('sub-3d', 'laliga', 160, 'subdomain', 'sub-3d', 'Subdomain 3D cosmographic cutdown'),
];

function indexByKind(kind: ShotKind): Record<string, ShotEntry> {
  const out: Record<string, ShotEntry> = {};
  for (const entry of SHOT_ENTRIES) {
    if (entry.kind === kind) out[entry.slot] = entry;
  }
  return out;
}

export const SPHERE_SHOTS = indexByKind('sphere');
export const STATION_SHOTS = indexByKind('station');
export const PROJECT_SHOTS = indexByKind('project');
export const DIMENSION_SHOTS = indexByKind('dimension');
export const SUBDOMAIN_SHOTS = indexByKind('subdomain');

export function resolveShotMedia(slotId: string): {
  videoUrl: string;
  posterUrl: string;
  note: string;
  kind: ShotKind;
} | null {
  const pools = [SPHERE_SHOTS, STATION_SHOTS, PROJECT_SHOTS, DIMENSION_SHOTS, SUBDOMAIN_SHOTS];
  for (const pool of pools) {
    const hit = pool[slotId];
    if (hit) {
      return {
        videoUrl: hit.videoPath,
        posterUrl: hit.posterPath,
        note: hit.note,
        kind: hit.kind,
      };
    }
  }
  const byId = SHOT_ENTRIES.find((s) => s.id === slotId);
  if (!byId) return null;
  return {
    videoUrl: byId.videoPath,
    posterUrl: byId.posterPath,
    note: byId.note,
    kind: byId.kind,
  };
}

export function buildProjectMediaSrcMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [id, entry] of Object.entries(PROJECT_SHOTS)) {
    map[id] = entry.videoPath;
  }
  return map;
}
