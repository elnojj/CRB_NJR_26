/**
 * Google Drive HOTSPOT_26_MEDIA catalog
 * Folder: https://drive.google.com/drive/folders/1mNIsnqFkqoD_kNC6VBLEwgvXVZvOT2iq
 *
 * Wired for sphere VideoTexture + About Us bios + project stills.
 * Prefer public Wix URLs for browser video; Drive stream for allowlisted file ids;
 * localFallback keeps WebGL ambient shells lit offline.
 *
 * Do not invent campaign credit from celebrity / festival frames — filename
 * attribution only unless separately verified in source register.
 */
import { PUBLIC_BRAND_MEDIA } from './publicBrandMedia';

/** Canonical Hotspot media folder (owner Drive). */
export const HOTSPOT_26_MEDIA_FOLDER_ID = '1mNIsnqFkqoD_kNC6VBLEwgvXVZvOT2iq';
export const HOTSPOT_26_MEDIA_FOLDER_URL =
  `https://drive.google.com/drive/folders/${HOTSPOT_26_MEDIA_FOLDER_ID}`;

/** CDE 2030 build packs live under Hotspot — docs/build, not playable sphere media. */
export const CDE_2030_FOLDER_ID = '1PkWxkKevz0ZiI7xh9kBAExCoHXItWUj3';

export type DriveMediaKind = 'video' | 'image' | 'bio';

export type DriveMediaProvenance =
  | 'verified-footage'
  | 'study'
  | 'render'
  | 'specification'
  | 'missing-asset'
  | 'sample-programme'
  | 'owner-supplied';

export type DriveMediaProjection = 'spherical' | 'equatorial' | 'flat' | 'portrait';

export type DriveMediaAsset = {
  id: string;
  driveFileId: string;
  title: string;
  kind: DriveMediaKind;
  mimeType: string;
  role:
    | 'sphere-texture'
    | 'showreel'
    | 'about-portrait'
    | 'about-bio'
    | 'project-still'
    | 'about-gallery';
  /** L13 — required provenance contract fields */
  projectId: string | null;
  mediaType: DriveMediaKind;
  aspect: '16:9' | '1:1' | '9:16' | 'unknown';
  projection: DriveMediaProjection;
  poster: string | null;
  provenance: DriveMediaProvenance;
  durationSec: number | null;
  playable: boolean;
  projectCode?: string;
  /** Direct public playback URL when available (preferred for HTML5 video). */
  publicUrl?: string;
  localFallback?: string;
  /** True when localFallback is the shared showreel/ice plate, not a distinct master. */
  localFallbackIsSharedPlate?: boolean;
  caption?: string;
};

/** Shared local plate SHA — ambient shell only, not a distinct project master. */
export const SHARED_SHOWREEL_FALLBACK = '/media/sphere-showreel-fallback.mp4';

/**
 * Drive file ids verified from HOTSPOT_26_MEDIA listing (2026-11-02).
 * NJR showreel has duplicate filenames — largest MOV is the catalog master.
 */
function resolveDriveStreamPathLazy(driveFileId: string): string {
  return `/api/drive/stream/${encodeURIComponent(driveFileId)}`;
}

const DRIVE = {
  riyadhSeasonStill: '1bktzZxS3fPe5cES9T0GLguzBIdo3y-8S',
  alahlyShell: '1WG2TIpFqmHyTJ_-1LJWulO0XHmGm8STQ',
  zaidAlbum: '1quHWLRaXg1AI8DBLCdFFaX9F3lzF47H0',
  cairokeeLive: '1S2YezzNpK1NyNcZYKMB978c7OBsAZpa7',
  tarekAfrima: '16tvRrs4f3cxiaF2k7HAYhkAdl7vVPIAd',
  kaswaraSummit: '1lbFTi24Jn8KueARWh0gBVSEy5U5_clpJ',
  moayadMdlbeast: '1srusbARRsvBfKDmP3GzUGnsa1tPmRU7p',
  zahaCairo: '1auwAFABq8laRUx5L1PUCdIt9yGQgUZcj',
  zahaIndoor: '1E9exkeo0uJ2Q00n0ytmLpEJ69Bfj8iWv',
  asserSchweppes: '1Z2J_C-QK-Vki7z5rLiWVDf3xofnk105I',
  wegzOrange: '1CbO5HO_3gCKmNNRe5Ol3OtPwKp3YF1Do',
  ramadanAircraft: '13XpE1Hf5IeuExVaQN9fdPm1Mmyrc3XW2',
  riyadhSpiderman: '1dQpCVZju5QT5zT72_Nc130DHTkb3nHIl',
  outdoorSet: '11gAGk9CIV6tF8EEE82OKTMSTesVjKZ6g',
  entrepreneurAwards: '10jk3h981tzaVug3_49Nyco4K3DmmSpXh',
  elGouna: '1m9VgS0FHiUiP5Ng9hASLFp6TDKzkhrY4',
  productionSet: '1lPzUKY5o8JPYAFkGq_ydqxNs5MAQaxJh',
  batronShowreelMov: '1Gruhma2eZYCE-myaVEMhV_pFr9JpKBnA',
  /** Largest of four identically named NJR FINAL SHOWREEL 2023 MOV masters. */
  njrShowreel2023Mov: '1_x6GfdJ5hzqOtmd__Fk57Lrx1ZeP5AV_',
} as const;

export const DRIVE_MEDIA_ASSETS: DriveMediaAsset[] = [
  {
    id: 'sphere-primary',
    driveFileId: DRIVE.njrShowreel2023Mov,
    title: 'NOJARA Studios — 2023 Showreel (HQ ambient)',
    kind: 'video',
    mimeType: 'video/quicktime',
    role: 'sphere-texture',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'equatorial',
    poster: '/media/riyadh-season-launch-still.jpg',
    provenance: 'verified-footage',
    durationSec: PUBLIC_BRAND_MEDIA.showreel2023.expectedDurationSec,
    playable: true,
    projectCode: 'NOJARA',
    publicUrl: PUBLIC_BRAND_MEDIA.showreel2023.url,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption:
      'HQ equator ambient uses NOJARA 2023 showreel (Wix MP4). Drive master is NJR_FINAL_SHOWREEL_2023 MOV in HOTSPOT_26_MEDIA. Poster is Riyadh Season still 01 — not a claim that Turki launch video is present.',
  },
  {
    id: 'riyadh-season-still',
    driveFileId: DRIVE.riyadhSeasonStill,
    title: 'Riyadh Season launch — Rabeh Saqer still (4K)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster: '/media/riyadh-season-launch-still.jpg',
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    projectCode: 'RIYADH-SEASON',
    localFallback: '/media/riyadh-season-launch-still.jpg',
    localFallbackIsSharedPlate: false,
    caption:
      'Filename plate from HOTSPOT_26_MEDIA. Celebrity/event frames do not alone establish campaign credit.',
  },
  {
    id: 'njr-showreel-2023',
    driveFileId: DRIVE.njrShowreel2023Mov,
    title: 'NOJARA Studios — 2023 Showreel',
    kind: 'video',
    mimeType: 'video/quicktime',
    role: 'showreel',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: PUBLIC_BRAND_MEDIA.showreel2023.posterUrl,
    provenance: 'verified-footage',
    durationSec: PUBLIC_BRAND_MEDIA.showreel2023.expectedDurationSec,
    playable: true,
    projectCode: 'NOJARA',
    publicUrl: PUBLIC_BRAND_MEDIA.showreel2023.url,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption: 'About Us visual anchor — public Wix MP4 + Drive MOV master',
  },
  {
    id: 'laliga-reel',
    driveFileId: '',
    title: 'NOJARA × LaLiga',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'showreel',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
    provenance: 'verified-footage',
    durationSec: PUBLIC_BRAND_MEDIA.laligaFilm.expectedDurationSec,
    playable: true,
    projectCode: 'LALIGA',
    publicUrl: PUBLIC_BRAND_MEDIA.laligaFilm.url,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption:
      'Public Wix master. Not present as a named file in HOTSPOT_26_MEDIA listing — keep Wix URL.',
  },
  {
    id: 'batron-showreel',
    driveFileId: DRIVE.batronShowreelMov,
    title: 'Batron showreel',
    kind: 'video',
    mimeType: 'video/quicktime',
    role: 'showreel',
    projectId: 'EL-BATRON',
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: PUBLIC_BRAND_MEDIA.elBatron.posterUrl,
    provenance: 'verified-footage',
    durationSec: PUBLIC_BRAND_MEDIA.elBatron.expectedDurationSec,
    playable: true,
    projectCode: 'EL-BATRON',
    publicUrl: PUBLIC_BRAND_MEDIA.elBatron.url,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption:
      'Drive: Batron showreel.mov in HOTSPOT_26_MEDIA. Browser playback prefers public Wix MP4. Programme remains SAMPLE in register.',
  },
  {
    id: 'seven-tabuk-desktop',
    driveFileId: '',
    title: 'SEVEN Tabuk — Concept Render (Desktop 3840×2160)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'project-still',
    projectId: 'SEVEN',
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster:
      '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    provenance: 'render',
    durationSec: null,
    playable: true,
    projectCode: 'SEVEN',
    localFallback:
      '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    localFallbackIsSharedPlate: false,
    caption: 'Attached Tabuk concept render — still only; no cleared SEVEN showreel',
  },
  {
    id: 'seven-tabuk-mobile',
    driveFileId: '',
    title: 'SEVEN Tabuk — Concept Render (Mobile 1080×1920)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'project-still',
    projectId: 'SEVEN',
    mediaType: 'image',
    aspect: '9:16',
    projection: 'portrait',
    poster:
      '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
    provenance: 'render',
    durationSec: null,
    playable: true,
    projectCode: 'SEVEN',
    localFallback:
      '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
    localFallbackIsSharedPlate: false,
    caption: 'Attached Tabuk concept render (mobile) — still only',
  },
  {
    id: 'about-tarek-portrait',
    driveFileId: DRIVE.tarekAfrima,
    title: 'Tarek Mojara — AFRIMA Summit 2022',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-portrait',
    projectId: null,
    mediaType: 'image',
    aspect: '9:16',
    projection: 'portrait',
    poster: '/media/about-tarek-afrima.jpg',
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    localFallback: '/media/about-tarek-afrima.jpg',
    localFallbackIsSharedPlate: false,
    caption:
      'Drive: 05_tarek_nojara_afrima_summit_2022_4k.jpg — matches local owner-supplied plate.',
  },
  {
    id: 'about-entrepreneur-awards',
    driveFileId: DRIVE.entrepreneurAwards,
    title: 'Egypt Entrepreneur Awards — Media Entrepreneur finalist plate',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster: resolveDriveStreamPathLazy(DRIVE.entrepreneurAwards),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    caption: 'Finalist evidence plate — not winner. Bound to About Us / founder bio.',
  },
  {
    id: 'about-el-gouna',
    driveFileId: DRIVE.elGouna,
    title: 'Tarek Mojara — El Gouna Film Festival',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster: resolveDriveStreamPathLazy(DRIVE.elGouna),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    caption: 'Festival frame — does not alone establish campaign credit.',
  },
  {
    id: 'about-production-set',
    driveFileId: DRIVE.productionSet,
    title: 'Tarek Mojara — production set',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster: resolveDriveStreamPathLazy(DRIVE.productionSet),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
  },
  {
    id: 'gallery-alahly-shell',
    driveFileId: DRIVE.alahlyShell,
    title: 'Al Ahly Shell campaign still (4K)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster: resolveDriveStreamPathLazy(DRIVE.alahlyShell),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    caption: 'Filename attribution only — no invented rights claim.',
  },
  {
    id: 'gallery-outdoor-set',
    driveFileId: DRIVE.outdoorSet,
    title: 'Outdoor production set still (4K)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster: resolveDriveStreamPathLazy(DRIVE.outdoorSet),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
  },
];

/**
 * Present in HOTSPOT_26_MEDIA but not yet attributed to a project world.
 * Inventory only — do not invent playable project bindings.
 */
export const HOTSPOT_UNATTRIBUTED_INVENTORY: Array<{
  driveFileId: string;
  name: string;
  mimeType: string;
  note: string;
}> = [
  {
    driveFileId: DRIVE.zaidAlbum,
    name: '03_zaid_khalid_el_waili_album_launch_4k.jpg',
    mimeType: 'image/jpeg',
    note: 'Event still — no project-world binding yet.',
  },
  {
    driveFileId: DRIVE.cairokeeLive,
    name: '04_legecy_tamer_hashem_cairokee_live_4k.jpg',
    mimeType: 'image/jpeg',
    note: 'Live frame — no project-world binding yet.',
  },
  {
    driveFileId: DRIVE.kaswaraSummit,
    name: '07_kaswara_alkhatib_creative_industry_summit_2021_4k.jpg',
    mimeType: 'image/jpeg',
    note: 'Summit still — About context only if separately cleared.',
  },
  {
    driveFileId: DRIVE.moayadMdlbeast,
    name: '08_moayad_mdlbeast_xp_batn_alshaer_4k.jpg',
    mimeType: 'image/jpeg',
    note: 'Event still — no project-world binding yet.',
  },
  {
    driveFileId: '1Knhq62Bdl3MNwtOw7TrCXOG-j5DozWKs',
    name: 'Mobily 3.mov',
    mimeType: 'video/quicktime',
    note: 'Mobily reel present — no Mobily project in register; left unattributed.',
  },
  {
    driveFileId: '1tlJEf___RlmtqnacAXJD7FfuTX1Szoc9',
    name: 'unujual Reel.mov',
    mimeType: 'video/quicktime',
    note: 'Unattributed reel — do not invent project credit.',
  },
  {
    driveFileId: CDE_2030_FOLDER_ID,
    name: 'CDE 2030/',
    mimeType: 'application/vnd.google-apps.folder',
    note: 'Build/observation packs for CDE — not sphere VideoTexture media.',
  },
];

export type AboutUsBio = {
  id: string;
  name: string;
  role: string;
  summary: string;
  evidenceNote: string;
  portraitAssetId?: string;
  driveFolderId: string;
  mediaAssetIds: string[];
};

/** Verified About Us copy only — no invented credits or awards. */
export const ABOUT_US_BIOS: AboutUsBio[] = [
  {
    id: 'nojara-studios',
    name: 'NOJARA Studios',
    role: 'Cairo · Riyadh · Est. 2016',
    summary:
      'NOJARA Studios practices across four pillars: creative strategy, production leadership, talent, and media technology. The public About Us visual anchor is the curated NOJARA Studios Showreel — a portfolio overview, not a single client campaign.',
    evidenceNote:
      'Source: HOTSPOT_26_MEDIA folder 1mNIsnqFkqoD_kNC6VBLEwgvXVZvOT2iq + Owner-Source-Excerpts. Individual frames must be attributed to original projects wherever identifiable.',
    portraitAssetId: 'about-tarek-portrait',
    driveFolderId: HOTSPOT_26_MEDIA_FOLDER_ID,
    mediaAssetIds: [
      'njr-showreel-2023',
      'sphere-primary',
      'laliga-reel',
      'riyadh-season-still',
      'gallery-alahly-shell',
      'gallery-outdoor-set',
    ],
  },
  {
    id: 'tarek-mojara',
    name: 'Tarek Mojara (39)',
    role: 'Founder and Culture and Design Engineer',
    summary:
      'Founder and Culture and Design Engineer of NOJARA Studios — never titled CEO. Presented as founder, creative producer, and strategist across Cairo and Riyadh.',
    evidenceNote:
      'Source: SEVEN verified facts + Owner-Source-Excerpts. Egypt Entrepreneur Awards: Media Entrepreneur of the Year finalist (not winner). Celebrity / festival images do not establish campaign credit unless separately verified.',
    portraitAssetId: 'about-tarek-portrait',
    driveFolderId: HOTSPOT_26_MEDIA_FOLDER_ID,
    mediaAssetIds: [
      'about-tarek-portrait',
      'njr-showreel-2023',
      'about-entrepreneur-awards',
      'about-el-gouna',
      'about-production-set',
    ],
  },
];

export function resolveDriveStreamPath(driveFileId: string): string {
  return `/api/drive/stream/${encodeURIComponent(driveFileId)}`;
}

/**
 * Playback URL priority for reliable WebGL / HTML5 mounts:
 * 1) Distinct local master
 * 2) Public browser-ready source for the actual asset
 * 3) Drive stream when available
 * 4) Shared local ambient plate only as the last fallback
 */
export function resolveAssetPlaybackUrl(asset: DriveMediaAsset): string {
  if (asset.localFallback && !asset.localFallbackIsSharedPlate) return asset.localFallback;
  if (asset.publicUrl) return asset.publicUrl;
  if (asset.driveFileId) return resolveDriveStreamPath(asset.driveFileId);
  return asset.localFallback || SHARED_SHOWREEL_FALLBACK;
}

/** Prefer public / stream when the caller can handle remote CORS (flat HTML5 players). */
export function resolveAssetRemotePlaybackUrl(asset: DriveMediaAsset): string {
  if (asset.publicUrl) return asset.publicUrl;
  if (asset.driveFileId) return resolveDriveStreamPath(asset.driveFileId);
  if (asset.localFallback) return asset.localFallback;
  return SHARED_SHOWREEL_FALLBACK;
}

export function getSphereTextureAsset(): DriveMediaAsset {
  return (
    DRIVE_MEDIA_ASSETS.find((a) => a.role === 'sphere-texture') ||
    DRIVE_MEDIA_ASSETS[0]
  );
}

export function getDriveAssetsForProject(projectId: string): DriveMediaAsset[] {
  return DRIVE_MEDIA_ASSETS.filter(
    (a) => a.projectId === projectId || a.projectCode === projectId
  );
}

export function getShowreelAssetByCode(
  projectCode: 'NOJARA' | 'LALIGA' | 'EL-BATRON'
): DriveMediaAsset | undefined {
  return DRIVE_MEDIA_ASSETS.find(
    (a) => a.role === 'showreel' && a.projectCode === projectCode
  );
}
