/**
 * CEREBRO MEDIA REGISTRY (reconciled)
 *
 * Primary source (runtime-canonical): HOTSPOT_26_MEDIA  1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh
 * Mirror (read-only fallback):        HOTSPOT mirror     1mNIsnqFkqoD_kNC6VBLEwgvXVZvOT2iq
 *
 * Rules
 * - Every destination references an asset id. No destination hardcodes a URL.
 * - Aspect is read from the sidecar width/height. Where no sidecar was read it is 'unknown', never guessed.
 * - A shared plate is never presented as a project master (localFallbackIsSharedPlate).
 * - Celebrity / festival frames carry filename attribution only. No invented campaign credit.
 * - Generated files (higgsfield-*, hf_*, Scene / Shot renders) never enter this registry as footage.
 * - Sphere playback loops TN_ videos from staggered start points; see buildSphereLoopPlan().
 */
import { PUBLIC_BRAND_MEDIA } from './publicBrandMedia';

export const HOTSPOT_PRIMARY_FOLDER_ID = '1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh';
export const HOTSPOT_MIRROR_FOLDER_ID = '1mNIsnqFkqoD_kNC6VBLEwgvXVZvOT2iq';
export const HOTSPOT_PRIMARY_FOLDER_URL = `https://drive.google.com/drive/folders/${HOTSPOT_PRIMARY_FOLDER_ID}`;
export const HOTSPOT_MIRROR_FOLDER_URL = `https://drive.google.com/drive/folders/${HOTSPOT_MIRROR_FOLDER_ID}`;

/** Kept for existing imports. Points at the primary folder. */
export const HOTSPOT_26_MEDIA_FOLDER_ID = HOTSPOT_PRIMARY_FOLDER_ID;
export const HOTSPOT_26_MEDIA_FOLDER_URL = HOTSPOT_PRIMARY_FOLDER_URL;

/** CDE 2030 build packs live in the mirror. Docs/build, not playable sphere media. */
export const CDE_2030_FOLDER_ID = '1PkWxkKevz0ZiI7xh9kBAExCoHXItWUj3';

export type DriveMediaKind = 'video' | 'image' | 'gif' | 'bio';

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
  /** Primary Drive id (1qmYm). Empty string when the asset has no Drive master. */
  driveFileId: string;
  /** Byte-identical copies in the mirror folder. Used only as playback fallback. */
  mirrorDriveIds: string[];
  filename?: string;
  title: string;
  kind: DriveMediaKind;
  mimeType: string;
  role:
    | 'sphere-loop'
    | 'sphere-texture'
    | 'ambient-gif'
    | 'showreel'
    | 'project-video'
    | 'about-portrait'
    | 'about-bio'
    | 'project-still'
    | 'about-gallery';
  projectId: string | null;
  mediaType: DriveMediaKind;
  aspect: '16:9' | '1:1' | '3:4' | '9:16' | 'unknown';
  projection: DriveMediaProjection;
  poster: string | null;
  provenance: DriveMediaProvenance;
  durationSec: number | null;
  playable: boolean;
  /** 'candidate' = best match by filename and size, awaiting owner confirmation. */
  masterStatus?: 'confirmed' | 'candidate';
  /** Container the browser may refuse (MOV). Prefer mp4 sources first. */
  browserSafe?: boolean;
  /** Large file. Seeking over the stream proxy needs HTTP range support. */
  heavy?: boolean;
  projectCode?: string;
  publicUrl?: string;
  localFallback?: string;
  localFallbackIsSharedPlate?: boolean;
  sidecarDriveId?: string;
  sha256?: string;
  caption?: string;
};

export const SHARED_SHOWREEL_FALLBACK = '/media/sphere-showreel-fallback.mp4';
export const SHARED_PLATE_ASSET_ID = 'shared-showreel-plate';

/** Drive stream route. Single definition. */
export function resolveDriveStreamPath(driveFileId: string): string {
  return `/api/drive/stream/${encodeURIComponent(driveFileId)}`;
}

/**
 * Drive ids verified against the live listings (2026-11-06).
 * p = primary folder id, m = mirror id. Empty p means the file exists only in the mirror.
 */
const D = {
  // TN_ videos (primary only)
  tnImpactList: { p: '18E4nCk7NDxkGlOFakl5bD-gHeyus_8X-', m: [] as string[] },
  tnGounaFilmFestival: { p: '1v35MmuknjUKZjiEgAfdCmATDkveIiYbH', m: [] as string[] },
  tnAllAfricaMusicAwards: { p: '13doivicNrG4XoDlU3IPd6Ou4cSYKJPl9', m: [] as string[] },

  // Showreel. Four same-name encodes (35.4 / 28.2 / 20.6 / 7.9 MB). Largest is the working master.
  njrShowreel2023: { p: '1dpRilG7hma1bqkMgwNFPzeb2y9g1_OGF', m: ['1_x6GfdJ5hzqOtmd__Fk57Lrx1ZeP5AV_'] },

  // Project videos (primary only)
  turkiRiyadhSeason: { p: '1WOsaz0C-F9sTnWl_xQaSN1wt86I_jRoA', m: [] as string[] },
  laligaNjrMay18: { p: '1VhaSuMQn5b6DahSftaQ9bTwH2fPrHoKx', m: [] as string[] },
  laligaWal3ana: { p: '1JuftO8KtXKGeEcEPCXDpDXmtiS5a9orQ', m: [] as string[] },
  batronMp4: { p: '1xh0Dqv4yo-sUO7oSZbThIG0e1RDXLln8', m: [] as string[] },
  batronMovLight: { p: '1WWWK8gL9_0y1VPbivuXy3uzUmS3XbBFZ', m: ['1Gruhma2eZYCE-myaVEMhV_pFr9JpKBnA'] },

  // Stills
  riyadhSeasonStill: { p: '1Y0YiCHFk5OfDz_GDQ6pmAHmtCcNNKTRR', m: ['1bktzZxS3fPe5cES9T0GLguzBIdo3y-8S'] },
  alahlyShell: { p: '1iXQ5GDWssO6RJq5bzmLd9amBAVg_RCNk', m: ['1WG2TIpFqmHyTJ_-1LJWulO0XHmGm8STQ'] },
  tarekAfrima: { p: '1BBf1Jo1MZrztEIJj8ig0D5GQ_vyXi-Mq', m: ['16tvRrs4f3cxiaF2k7HAYhkAdl7vVPIAd'] },
  entrepreneurAwards: { p: '19q2qZm_ygN7HsS5R0Z1YIqILZB2qyapU', m: ['10jk3h981tzaVug3_49Nyco4K3DmmSpXh'] },
  elGouna: { p: '1byVxL1kcSZ0IwQX9CXFmfzqG2ZLno0Gy', m: ['1m9VgS0FHiUiP5Ng9hASLFp6TDKzkhrY4'] },
  productionSet: { p: '1I_CSr4EL90X7IS2eLgtA9akd1MNS-xO0', m: ['1lPzUKY5o8JPYAFkGq_ydqxNs5MAQaxJh'] },
  outdoorSet: { p: '', m: ['11gAGk9CIV6tF8EEE82OKTMSTesVjKZ6g'] },
  shweekarPortrait: { p: '15gAJwJvL1Yma0MCGQOJmej6zZRlViu9-', m: [] as string[] },

  // Sidecars
  sidecarAfrima: '19Rf1PbNAqSRyemd-cTF_nnS9YMRsKHn4',
  sidecarRiyadh: '1-kJeuGySJHIYXHuI0KIjb7KWZcpiIVYm',
  sidecarAlahly: '1j9phgtNwhlQs6H7RUZcVAx_6_6VryJH2',

  // GIF pool (IMG_0798 to IMG_0809). Content not yet visually verified.
  gif0798: { p: '1dcCYaIw9puypjS8LRvAu--pJsGJD81nS', m: ['17skJK5YoJxrvwdamxK2xvXureRxG53Rv'] },
  gif0799: { p: '17rEoXP65YzKGb8Khf8QqGI9C9QZRBrOZ', m: ['1gR_VZpTGmON-CyFY4XsENclNF9GtPg4Q'] },
  gif0800: { p: '1pUu8Mo0jOFawJrlTaHYxJjBM6e9LSfL4', m: ['1BpRet5MiA2pEfxfaCBsJnh7D3Q_e57-f'] },
  gif0801: { p: '1cKnVtarYIdaZ57-0BHtY_hpI0xmf1iDC', m: ['1lwkUcwJTtOt5EOOzh3jULgFe2erx9jFq'] },
  gif0802: { p: '1ls6R29zasXQ7xkuWr3HZpGikROKHMxVv', m: ['1X1v_rTWE3HL_ytP6Y3iMXzleLAl4pOKB'] },
  gif0803: { p: '1RH7P5h8gMM_v1WnwXemsEOfZFi6YP4LJ', m: ['1KFrnV5HULoAYjnMjgcieER3DxyNHPnpu'] },
  gif0804: { p: '18WNhTJOZ7EUTRWABmMldLf_TlcWQFDpT', m: ['1CRpX2KeBFKq-OBU1FrKyyBmvfYnAKooF'] },
  // Two copies of IMG_0805 exist in the primary folder. Both are listed, same bytes.
  gif0805: { p: '1ZuVwB7CpSC8g7wmC_azm2lHLFrrXkip8', m: ['1GG6n-nRMR1klknUHoJdcGMCAjBChO1SV', '1ZV-14EHlFFtlZKHfaKMuxl8fDX6mfqsh'] },
  gif0806: { p: '1WkxrF-esXRHwFf3QMvwCv_fJafQg1Y6B', m: ['138DQmzHXck60yj1YLmns7JmtULRYKAh_'] },
  gif0809: { p: '1J3usrhnuwXF1Eyxz-_AqY-pxSO4Q7z4s', m: ['15TyRiKifiZEvsLxGgK1Fkj65018_bZ_M'] },
} as const;

function gif(id: string, name: string, ids: { p: string; m: readonly string[] }): DriveMediaAsset {
  return {
    id,
    driveFileId: ids.p,
    mirrorDriveIds: [...ids.m],
    filename: `${name}.GIF`,
    title: `${name} loop`,
    kind: 'gif',
    mimeType: 'image/gif',
    role: 'ambient-gif',
    projectId: null,
    mediaType: 'gif',
    aspect: 'unknown',
    projection: 'flat',
    poster: null,
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    heavy: true,
    caption: 'Ambient loop for flat panels and shells. Content not yet visually verified. Not usable as a VideoTexture.',
  };
}

export const DRIVE_MEDIA_ASSETS: DriveMediaAsset[] = [
  // ---------- SPHERE LOOP SOURCES (TN_ videos, mp4 first) ----------
  {
    id: 'tn-impact-list',
    driveFileId: D.tnImpactList.p,
    mirrorDriveIds: [],
    filename: 'TN_Impact list .612Z',
    title: 'TN — Impact list',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'sphere-loop',
    projectId: null,
    mediaType: 'video',
    aspect: 'unknown',
    projection: 'equatorial',
    poster: null,
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    browserSafe: true,
    caption: 'Filename has a broken extension (.612Z). Serve with Content-Type from Drive MIME, not from the extension.',
  },
  {
    id: 'tn-gouna-film-festival',
    driveFileId: D.tnGounaFilmFestival.p,
    mirrorDriveIds: [],
    filename: 'TN_Gouna film festival.613Z',
    title: 'TN — Gouna film festival',
    kind: 'video',
    mimeType: 'video/quicktime',
    role: 'sphere-loop',
    projectId: null,
    mediaType: 'video',
    aspect: 'unknown',
    projection: 'equatorial',
    poster: null,
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    browserSafe: false,
    caption: 'Festival footage. Does not alone establish campaign credit. QuickTime container: Chrome may refuse, loop advances automatically.',
  },
  {
    id: 'tn-all-africa-music-awards',
    driveFileId: D.tnAllAfricaMusicAwards.p,
    mirrorDriveIds: [],
    filename: 'TN_All africa music awards.MOV',
    title: 'TN — All Africa Music Awards',
    kind: 'video',
    mimeType: 'video/quicktime',
    role: 'sphere-loop',
    projectId: null,
    mediaType: 'video',
    aspect: 'unknown',
    projection: 'equatorial',
    poster: null,
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    browserSafe: false,
    heavy: true,
    caption: '185 MB MOV. Last in the TN order. Needs range requests on the stream proxy to seek to a start point.',
  },

  // ---------- SHOWREEL (public Wix MP4 plays; Drive MOV is the archive master) ----------
  {
    id: 'njr-showreel-2023',
    driveFileId: D.njrShowreel2023.p,
    mirrorDriveIds: [...D.njrShowreel2023.m],
    filename: 'NJR_ FINAL_SHOWREEL_2023_1920x1080_25_20_Stereo.mov',
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
    masterStatus: 'candidate',
    browserSafe: true,
    projectCode: 'NOJARA',
    publicUrl: PUBLIC_BRAND_MEDIA.showreel2023.url,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption: 'Portfolio overview, not a single client campaign. Four encodes share this filename; the largest is treated as master until bitrate and duration are checked.',
  },
  {
    id: SHARED_PLATE_ASSET_ID,
    driveFileId: '',
    mirrorDriveIds: [],
    title: 'Shared ambient plate (stand-in, not a master)',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'sphere-texture',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'equatorial',
    poster: '/media/riyadh-season-launch-still.jpg',
    provenance: 'missing-asset',
    durationSec: null,
    playable: true,
    browserSafe: true,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption: 'Last resort so the WebGL shell never goes dark. Never shown as a project master.',
  },

  // ---------- PROJECT VIDEOS ----------
  {
    id: 'laliga-reel',
    driveFileId: D.laligaNjrMay18.p,
    mirrorDriveIds: [],
    filename: '2-NJR X LaLiga (May 18th).mov',
    title: 'NOJARA × LaLiga',
    kind: 'video',
    mimeType: 'video/quicktime',
    role: 'showreel',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
    provenance: 'verified-footage',
    durationSec: PUBLIC_BRAND_MEDIA.laligaFilm.expectedDurationSec,
    playable: true,
    masterStatus: 'candidate',
    heavy: true,
    projectCode: 'LALIGA',
    publicUrl: PUBLIC_BRAND_MEDIA.laligaFilm.url,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption: 'Browser playback uses the public Wix master. Drive file is the candidate archive master, pending confirmation it matches the Wix cut.',
  },
  {
    id: 'laliga-wal3ana',
    driveFileId: D.laligaWal3ana.p,
    mirrorDriveIds: [],
    filename: 'noj laliga wal3ana copy 2.mp4',
    title: 'NOJARA × LaLiga — wal3ana cut',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'project-video',
    projectId: 'LALIGA',
    mediaType: 'video',
    aspect: 'unknown',
    projection: 'flat',
    poster: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    browserSafe: true,
    projectCode: 'LALIGA',
    caption: 'Filename attribution only.',
  },
  {
    id: 'batron-showreel',
    driveFileId: D.batronMp4.p,
    mirrorDriveIds: [],
    filename: 'Batron showreel.mp4',
    title: 'Batron showreel',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'showreel',
    projectId: 'EL-BATRON',
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: PUBLIC_BRAND_MEDIA.elBatron.posterUrl,
    provenance: 'verified-footage',
    durationSec: PUBLIC_BRAND_MEDIA.elBatron.expectedDurationSec,
    playable: true,
    masterStatus: 'candidate',
    browserSafe: true,
    heavy: true,
    projectCode: 'EL-BATRON',
    publicUrl: PUBLIC_BRAND_MEDIA.elBatron.url,
    localFallback: SHARED_SHOWREEL_FALLBACK,
    localFallbackIsSharedPlate: true,
    caption: '179 MB mp4, created 2022-12. Candidate master. Programme remains SAMPLE in register.',
  },
  {
    id: 'batron-showreel-light',
    driveFileId: D.batronMovLight.p,
    mirrorDriveIds: [...D.batronMovLight.m],
    filename: 'Batron showreel.mov',
    title: 'Batron showreel (light MOV cut)',
    kind: 'video',
    mimeType: 'video/quicktime',
    role: 'project-video',
    projectId: 'EL-BATRON',
    mediaType: 'video',
    aspect: 'unknown',
    projection: 'flat',
    poster: PUBLIC_BRAND_MEDIA.elBatron.posterUrl,
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    browserSafe: false,
    projectCode: 'EL-BATRON',
    caption: '10 MB. The previous catalog bound this file as master. Likely a light cut of the mp4.',
  },
  {
    id: 'riyadh-season-turki-launch',
    driveFileId: D.turkiRiyadhSeason.p,
    mirrorDriveIds: [],
    filename: 'HH_Turki Alshaikh - Riyadh season launch campaign .mp4',
    title: 'Riyadh Season launch — Turki Alshaikh (file title)',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'project-video',
    projectId: null,
    mediaType: 'video',
    aspect: 'unknown',
    projection: 'flat',
    poster: '/media/riyadh-season-launch-still.jpg',
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    browserSafe: true,
    projectCode: 'RIYADH-SEASON',
    caption: 'Present in Drive. Filename attribution only; NOJARA credit on this film is not established by the file.',
  },

  // ---------- STILLS ----------
  {
    id: 'riyadh-season-still',
    driveFileId: D.riyadhSeasonStill.p,
    mirrorDriveIds: [...D.riyadhSeasonStill.m],
    filename: '01_rabeh_saqer_riyadh_season_launch_4k.jpg',
    title: 'Riyadh Season launch — Rabeh Saqer still',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: '3:4',
    projection: 'portrait',
    poster: '/media/riyadh-season-launch-still.jpg',
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    projectCode: 'RIYADH-SEASON',
    sidecarDriveId: D.sidecarRiyadh,
    sha256: '593d3b3f9a9866be4fbf826937dcd2f806e60431046418ca31c652cf7d0140d5',
    localFallback: '/media/riyadh-season-launch-still.jpg',
    localFallbackIsSharedPlate: false,
    caption: 'Sidecar caption: Tarek Nojara with Rabeh Saqer during the Riyadh Season launch operation. Not independently verified; date, photographer and rights holder unknown.',
  },
  {
    id: 'about-tarek-portrait',
    driveFileId: D.tarekAfrima.p,
    mirrorDriveIds: [...D.tarekAfrima.m],
    filename: '05_tarek_nojara_afrima_summit_2022_4k.jpg',
    title: 'Tarek Nojara — AFRIMA Music Business Summit 2022',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-portrait',
    projectId: null,
    mediaType: 'image',
    aspect: '1:1',
    projection: 'flat',
    poster: '/media/about-tarek-afrima.jpg',
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    sidecarDriveId: D.sidecarAfrima,
    sha256: '20e8db48f45f211dd32ea354fc2bf9337c27fb5998de4dcf03f2c807e5e02eea',
    localFallback: '/media/about-tarek-afrima.jpg',
    localFallbackIsSharedPlate: false,
    caption: 'Sidecar: curated the AFRIMA Music Business Summit, 2022. Not independently verified. 3840×3840, so square, not portrait.',
  },
  {
    id: 'about-shweekar-portrait',
    driveFileId: D.shweekarPortrait.p,
    mirrorDriveIds: [],
    filename: 'Shweekar Ahmed.jpg',
    title: 'Shweekar Ahmed — approved photograph',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-portrait',
    projectId: null,
    mediaType: 'image',
    aspect: 'unknown',
    projection: 'portrait',
    poster: resolveDriveStreamPath(D.shweekarPortrait.p),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    caption: 'Approved photograph, 285 KB, uploaded 2026-11-04. Exists only in the primary folder.',
  },
  {
    id: 'about-entrepreneur-awards',
    driveFileId: D.entrepreneurAwards.p,
    mirrorDriveIds: [...D.entrepreneurAwards.m],
    filename: '16_tarek_nojara_egypt_entrepreneur_awards_finalist_4k.jpg',
    title: 'Egypt Entrepreneur Awards — Media Entrepreneur finalist plate',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: 'unknown',
    projection: 'flat',
    poster: resolveDriveStreamPath(D.entrepreneurAwards.p),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    caption: 'Finalist evidence plate. Not winner.',
  },
  {
    id: 'about-el-gouna',
    driveFileId: D.elGouna.p,
    mirrorDriveIds: [...D.elGouna.m],
    filename: '17_tarek_nojara_el_gouna_film_festival_4k.jpg',
    title: 'Tarek Nojara — El Gouna Film Festival',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: 'unknown',
    projection: 'flat',
    poster: resolveDriveStreamPath(D.elGouna.p),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    caption: 'Festival frame. Does not alone establish campaign credit.',
  },
  {
    id: 'about-production-set',
    driveFileId: D.productionSet.p,
    mirrorDriveIds: [...D.productionSet.m],
    filename: '18_tarek_nojara_production_set_reinstated_4k.jpg',
    title: 'Tarek Nojara — production set',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: 'unknown',
    projection: 'flat',
    poster: resolveDriveStreamPath(D.productionSet.p),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
  },
  {
    id: 'gallery-alahly-shell',
    driveFileId: D.alahlyShell.p,
    mirrorDriveIds: [...D.alahlyShell.m],
    filename: '02_alahly_shell_campaign_4k.jpg',
    title: 'Al Ahly Shell campaign still (4K)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: 'unknown',
    projection: 'flat',
    poster: resolveDriveStreamPath(D.alahlyShell.p),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    sidecarDriveId: D.sidecarAlahly,
    caption: 'Filename attribution only. No invented rights claim.',
  },
  {
    id: 'gallery-outdoor-set',
    driveFileId: D.outdoorSet.p,
    mirrorDriveIds: [...D.outdoorSet.m],
    filename: '15_tarek_nojara_outdoor_production_set_4k.jpg',
    title: 'Outdoor production set still (4K)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'about-gallery',
    projectId: null,
    mediaType: 'image',
    aspect: 'unknown',
    projection: 'flat',
    poster: resolveDriveStreamPath(D.outdoorSet.m[0]),
    provenance: 'owner-supplied',
    durationSec: null,
    playable: true,
    caption: 'Exists only in the mirror folder.',
  },

  // ---------- SEVEN (local renders, no Drive master) ----------
  {
    id: 'seven-tabuk-desktop',
    driveFileId: '',
    mirrorDriveIds: [],
    title: 'SEVEN Tabuk — Concept Render (Desktop 3840×2160)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'project-still',
    projectId: 'SEVEN',
    mediaType: 'image',
    aspect: '16:9',
    projection: 'flat',
    poster: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    provenance: 'render',
    durationSec: null,
    playable: true,
    projectCode: 'SEVEN',
    localFallback: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    localFallbackIsSharedPlate: false,
    caption: 'Concept render. Still only; no cleared SEVEN showreel.',
  },
  {
    id: 'seven-tabuk-mobile',
    driveFileId: '',
    mirrorDriveIds: [],
    title: 'SEVEN Tabuk — Concept Render (Mobile 1080×1920)',
    kind: 'image',
    mimeType: 'image/jpeg',
    role: 'project-still',
    projectId: 'SEVEN',
    mediaType: 'image',
    aspect: '9:16',
    projection: 'portrait',
    poster: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
    provenance: 'render',
    durationSec: null,
    playable: true,
    projectCode: 'SEVEN',
    localFallback: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
    localFallbackIsSharedPlate: false,
    caption: 'Concept render (mobile). Still only.',
  },

  // ---------- AMBIENT GIF POOL ----------
  gif('gif-img-0798', 'IMG_0798', D.gif0798),
  gif('gif-img-0799', 'IMG_0799', D.gif0799),
  gif('gif-img-0800', 'IMG_0800', D.gif0800),
  gif('gif-img-0801', 'IMG_0801', D.gif0801),
  gif('gif-img-0802', 'IMG_0802', D.gif0802),
  gif('gif-img-0803', 'IMG_0803', D.gif0803),
  gif('gif-img-0804', 'IMG_0804', D.gif0804),
  gif('gif-img-0805', 'IMG_0805', D.gif0805),
  gif('gif-img-0806', 'IMG_0806', D.gif0806),
  gif('gif-img-0809', 'IMG_0809', D.gif0809),
];

/**
 * Present in Drive, not attributed to a project world. Inventory only.
 * Stills 09–15 exist only in the mirror and no sidecar has been read for them.
 */
export const HOTSPOT_UNATTRIBUTED_INVENTORY: Array<{
  driveFileId: string;
  mirrorDriveIds: string[];
  name: string;
  mimeType: string;
  note: string;
}> = [
  { driveFileId: '1ynBt4Y59MsD4JDY97qxVKCCShzyYdb9i', mirrorDriveIds: ['1quHWLRaXg1AI8DBLCdFFaX9F3lzF47H0'], name: '03_zaid_khalid_el_waili_album_launch_4k.jpg', mimeType: 'image/jpeg', note: 'Event still. Sidecar 1ula81CF9Fd5SV7cE-vM47TcA1U1C4zek. No project binding.' },
  { driveFileId: '17TBxMO6XmvJqSwFno_aWqoL8VkRY0qNc', mirrorDriveIds: ['1S2YezzNpK1NyNcZYKMB978c7OBsAZpa7'], name: '04_legecy_tamer_hashem_cairokee_live_4k.jpg', mimeType: 'image/jpeg', note: 'Live frame. Sidecar 1kLqeiOsHEIEmdu2vs2s_1LEm46s-bLs8. No project binding.' },
  { driveFileId: '1HTFP9SPOAZbtiXIKdh25GfgIu-fMlmUL', mirrorDriveIds: ['1lbFTi24Jn8KueARWh0gBVSEy5U5_clpJ'], name: '07_kaswara_alkhatib_creative_industry_summit_2021_4k.jpg', mimeType: 'image/jpeg', note: 'Summit still. Sidecar 1R_0s9M2mEOMPwYGmLozKMQNCx7xU4QM_. About context only if separately cleared.' },
  { driveFileId: '13PB_csNF9FmTBzFNUmxYxRQiCD8xVRP8', mirrorDriveIds: ['1srusbARRsvBfKDmP3GzUGnsa1tPmRU7p'], name: '08_moayad_mdlbeast_xp_batn_alshaer_4k.jpg', mimeType: 'image/jpeg', note: 'Event still. No project binding.' },
  { driveFileId: '12XV2D-jJHGeW-7tmUNwssZOBwgGm_gpq', mirrorDriveIds: ['1Knhq62Bdl3MNwtOw7TrCXOG-j5DozWKs'], name: 'Mobily 3.mov', mimeType: 'video/quicktime', note: 'Mobily reel. No Mobily project in register.' },
  { driveFileId: '1bqa1gNqDi6R07cW6CXo2kecSXrV4H2W0', mirrorDriveIds: ['1tlJEf___RlmtqnacAXJD7FfuTX1Szoc9'], name: 'unujual Reel.mov', mimeType: 'video/quicktime', note: 'Unattributed reel. Do not invent project credit.' },
  { driveFileId: '', mirrorDriveIds: ['1auwAFABq8laRUx5L1PUCdIt9yGQgUZcj'], name: '09_zaha_hadid_executive_cairo_camera_collection_4k.jpg', mimeType: 'image/jpeg', note: 'Mirror only.' },
  { driveFileId: '', mirrorDriveIds: ['1E9exkeo0uJ2Q00n0ytmLpEJ69Bfj8iWv'], name: '10_zaha_hadid_executive_indoor_selfie_4k.jpg', mimeType: 'image/jpeg', note: 'Mirror only.' },
  { driveFileId: '', mirrorDriveIds: ['1Z2J_C-QK-Vki7z5rLiWVDf3xofnk105I'], name: '11_tarek_nojara_asser_yassin_schweppes_gold_bts_4k.jpg', mimeType: 'image/jpeg', note: 'Mirror only. Filename attribution only.' },
  { driveFileId: '', mirrorDriveIds: ['1CbO5HO_3gCKmNNRe5Ol3OtPwKp3YF1Do'], name: '12_tarek_nojara_wegz_orange_campaign_bts_4k.jpg', mimeType: 'image/jpeg', note: 'Mirror only. Filename attribution only.' },
  { driveFileId: '', mirrorDriveIds: ['13XpE1Hf5IeuExVaQN9fdPm1Mmyrc3XW2'], name: '13_tarek_nojara_mohamed_ramadan_aircraft_portrait_4k.jpg', mimeType: 'image/jpeg', note: 'Mirror only. Filename attribution only.' },
  { driveFileId: '', mirrorDriveIds: ['1dQpCVZju5QT5zT72_Nc130DHTkb3nHIl'], name: '14_tarek_nojara_riyadh_season_spiderman_bts_4k.jpg', mimeType: 'image/jpeg', note: 'Mirror only. Filename attribution only.' },
  { driveFileId: '', mirrorDriveIds: [CDE_2030_FOLDER_ID], name: 'CDE 2030/', mimeType: 'application/vnd.google-apps.folder', note: 'Build and observation packs. Not sphere media.' },
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

/** Verified About Us copy only. No invented credits or awards. */
export const ABOUT_US_BIOS: AboutUsBio[] = [
  {
    id: 'nojara-studios',
    name: 'NOJARA Studios',
    role: 'Cairo · Riyadh · Est. 2016',
    summary:
      'NOJARA Studios practices across four pillars: creative strategy, production leadership, talent, and media technology. The public About Us visual anchor is the curated NOJARA Studios Showreel, a portfolio overview and not a single client campaign.',
    evidenceNote:
      'Source: HOTSPOT_26_MEDIA primary folder + Owner-Source-Excerpts. Individual frames must be attributed to original projects wherever identifiable.',
    portraitAssetId: 'about-tarek-portrait',
    driveFolderId: HOTSPOT_PRIMARY_FOLDER_ID,
    mediaAssetIds: [
      'njr-showreel-2023',
      'tn-impact-list',
      'tn-gouna-film-festival',
      'laliga-reel',
      'riyadh-season-still',
      'gallery-alahly-shell',
      'gallery-outdoor-set',
    ],
  },
  {
    id: 'shweekar-ahmed',
    name: 'Shweekar Ahmed',
    role: 'PMO collaborator',
    summary:
      'Shweekar Ahmed is the designated collaborator with PMO access in the Cerebro handoff. No further credits are claimed.',
    evidenceNote: 'Source: Cerebro KB handoff §2. Approved photograph: Drive id 15gAJwJvL1Yma0MCGQOJmej6zZRlViu9-.',
    portraitAssetId: 'about-shweekar-portrait',
    driveFolderId: HOTSPOT_PRIMARY_FOLDER_ID,
    mediaAssetIds: ['about-shweekar-portrait'],
  },
  {
    id: 'khaled-al-shaalan',
    name: 'Khaled Al Shaalan',
    role: 'Role pending confirmation',
    summary: 'Khaled Al Shaalan appears in the studio register. No portrait has been confirmed, and no substitute image is shown.',
    evidenceNote: 'Portrait is an explicit gap until confirmed.',
    driveFolderId: HOTSPOT_PRIMARY_FOLDER_ID,
    mediaAssetIds: [],
  },
  {
    id: 'tarek-nojara',
    name: 'Tarek Nojara',
    role: 'Founder / Creative Producer / Strategist and Culture and Design Engineer',
    summary:
      'Founder and Culture and Design Engineer of NOJARA Studios, presented as founder, creative producer and strategist across Cairo and Riyadh. Never titled CEO.',
    evidenceNote:
      'Source: SEVEN verified facts + Owner-Source-Excerpts. AFRIMA Music Business Summit 2022: curator (owner-supplied, not independently verified). Egypt Entrepreneur Awards: Media Entrepreneur of the Year finalist (not winner).',
    portraitAssetId: 'about-tarek-portrait',
    driveFolderId: HOTSPOT_PRIMARY_FOLDER_ID,
    mediaAssetIds: [
      'about-tarek-portrait',
      'tn-impact-list',
      'tn-gouna-film-festival',
      'tn-all-africa-music-awards',
      'about-entrepreneur-awards',
      'about-el-gouna',
      'about-production-set',
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup and playback resolution
// ---------------------------------------------------------------------------

export function getAssetById(id: string): DriveMediaAsset | undefined {
  return DRIVE_MEDIA_ASSETS.find((a) => a.id === id);
}

/**
 * Ordered playback candidates:
 * 1) distinct local master  2) public browser-ready URL  3) Drive primary, then mirror(s)
 * 4) shared plate, only for assets that declare it as their fallback.
 * An asset without a declared fallback never degrades to the shared plate.
 */
export function resolveAssetPlaybackCandidates(asset: DriveMediaAsset): string[] {
  const out: string[] = [];
  if (asset.localFallback && !asset.localFallbackIsSharedPlate) out.push(asset.localFallback);
  if (asset.publicUrl) out.push(asset.publicUrl);
  for (const id of [asset.driveFileId, ...asset.mirrorDriveIds]) {
    if (id) out.push(resolveDriveStreamPath(id));
  }
  if (asset.localFallback && asset.localFallbackIsSharedPlate) out.push(asset.localFallback);
  return Array.from(new Set(out));
}

export function resolveAssetPlaybackUrl(asset: DriveMediaAsset): string {
  return resolveAssetPlaybackCandidates(asset)[0] ?? SHARED_SHOWREEL_FALLBACK;
}

/** Remote-first variant for flat HTML5 players that can handle CORS. */
export function resolveAssetRemotePlaybackUrl(asset: DriveMediaAsset): string {
  if (asset.publicUrl) return asset.publicUrl;
  return resolveAssetPlaybackUrl(asset);
}

export function getDriveAssetsForProject(projectId: string): DriveMediaAsset[] {
  return DRIVE_MEDIA_ASSETS.filter((a) => a.projectId === projectId || a.projectCode === projectId);
}

export function getShowreelAssetByCode(
  projectCode: 'NOJARA' | 'LALIGA' | 'EL-BATRON'
): DriveMediaAsset | undefined {
  return DRIVE_MEDIA_ASSETS.find((a) => a.role === 'showreel' && a.projectCode === projectCode);
}

export function getAmbientGifs(): DriveMediaAsset[] {
  return DRIVE_MEDIA_ASSETS.filter((a) => a.role === 'ambient-gif');
}

// ---------------------------------------------------------------------------
// Sphere loop plan: TN_ videos first, looped from staggered start points
// ---------------------------------------------------------------------------

export type LoopSlot = { assetId: string; startFraction: number };

/** Preference order. TN_ videos first (mp4 before MOV), then the public showreel. */
export const SPHERE_LOOP_ORDER: readonly string[] = [
  'tn-impact-list',
  'tn-gouna-film-festival',
  'tn-all-africa-music-awards',
  'njr-showreel-2023',
];

/** Start points as a fraction of duration, resolved after loadedmetadata. */
const START_FRACTIONS = [0, 0.37, 0.68, 0.18, 0.55, 0.85] as const;

/**
 * Builds the playlist. Sources in `unavailable` are skipped. If only one source
 * survives, it still fills every slot from a different start point. If none
 * survive, the shared plate carries the sphere so it never goes dark.
 */
export function buildSphereLoopPlan(
  unavailable: ReadonlySet<string> = new Set(),
  minSlots = 6
): LoopSlot[] {
  const live = SPHERE_LOOP_ORDER.filter((id) => !unavailable.has(id) && getAssetById(id)?.playable);
  const ids = live.length ? live : [SHARED_PLATE_ASSET_ID];
  const plan: LoopSlot[] = [];
  for (let i = 0; i < Math.max(minSlots, ids.length); i++) {
    const round = Math.floor(i / ids.length);
    plan.push({ assetId: ids[i % ids.length], startFraction: START_FRACTIONS[round % START_FRACTIONS.length] });
  }
  return plan;
}

/**
 * Drives one <video> element through the plan. Advances on 'ended', and on any
 * error marks that source unavailable, rebuilds the plan and carries on.
 * Returns a dispose function. Use the same video element as the VideoTexture source.
 */
export function attachSphereLoop(
  video: HTMLVideoElement,
  opts: { unavailable?: Set<string>; onSlot?: (slot: LoopSlot) => void } = {}
): () => void {
  const unavailable = opts.unavailable ?? new Set<string>();
  let plan = buildSphereLoopPlan(unavailable);
  let index = 0;
  let disposed = false;

  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.loop = false;

  const playSlot = () => {
    if (disposed) return;
    const slot = plan[index % plan.length];
    const asset = getAssetById(slot.assetId);
    if (!asset) return;
    video.src = resolveAssetPlaybackUrl(asset);
    video.addEventListener(
      'loadedmetadata',
      () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration * slot.startFraction * 0.9;
        }
        void video.play().catch(() => undefined);
      },
      { once: true }
    );
    opts.onSlot?.(slot);
  };

  const onEnded = () => {
    index += 1;
    playSlot();
  };
  const onError = () => {
    const failing = plan[index % plan.length].assetId;
    if (failing === SHARED_PLATE_ASSET_ID) return; // nothing left to fall back to
    unavailable.add(failing);
    plan = buildSphereLoopPlan(unavailable);
    index = 0;
    playSlot();
  };

  video.addEventListener('ended', onEnded);
  video.addEventListener('error', onError);
  playSlot();

  return () => {
    disposed = true;
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('error', onError);
  };
}

/** Dev/test guard. Returns an empty array when the registry is consistent. */
export function validateCatalog(): string[] {
  const errors: string[] = [];
  const ids = new Set(DRIVE_MEDIA_ASSETS.map((a) => a.id));
  if (ids.size !== DRIVE_MEDIA_ASSETS.length) errors.push('duplicate asset id');

  for (const bio of ABOUT_US_BIOS) {
    if (bio.portraitAssetId && !ids.has(bio.portraitAssetId)) errors.push(`${bio.id}: missing portrait ${bio.portraitAssetId}`);
    for (const id of bio.mediaAssetIds) if (!ids.has(id)) errors.push(`${bio.id}: missing media ${id}`);
  }
  for (const id of SPHERE_LOOP_ORDER) if (!ids.has(id)) errors.push(`loop order: missing ${id}`);
  if (!ids.has(SHARED_PLATE_ASSET_ID)) errors.push('shared plate asset missing');

  const seenDrive = new Map<string, string>();
  for (const a of DRIVE_MEDIA_ASSETS) {
    if (a.playable && resolveAssetPlaybackCandidates(a).length === 0 && !a.poster) errors.push(`${a.id}: playable but no source`);
    if (a.localFallbackIsSharedPlate && a.id !== SHARED_PLATE_ASSET_ID && a.provenance === 'missing-asset') {
      errors.push(`${a.id}: shared plate cannot be provenance missing-asset on a project asset`);
    }
    for (const d of [a.driveFileId, ...a.mirrorDriveIds].filter(Boolean)) {
      const prev = seenDrive.get(d);
      if (prev && prev !== a.id) errors.push(`drive id ${d} used by ${prev} and ${a.id}`);
      seenDrive.set(d, a.id);
    }
  }
  return errors;
}
