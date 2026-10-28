/**
 * Hotspot 26 Media Test Collection — seeded from live Drive folder
 * https://drive.google.com/drive/folders/1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh
 * Index: CEREBRO_Media_Index_v1 (snapshot 2026-10-17)
 *
 * rightsStatus remains pending. This is a TEST collection, not a client portfolio.
 */

import type { SpatialMediaAsset, SpatialMediaCollection } from './types';

export const HOTSPOT26_FOLDER_ID = '1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh';
export const HOTSPOT26_INDEX_SHEET_ID = '1ZIOzn4k7xSnY4vP_I78VqhtuXFa77gOUWarWDjzmnJQ';
export const HOTSPOT26_COLLECTION_ID = 'hotspot-26-media-test';

/** Locally cached textures verified via authorized Drive download (≤10 MB MCP cap). */
export const HOTSPOT26_LOCAL_CACHE: Record<string, string> = {
  '1AwlEyVCquKbWjOn4F9RVZ2P9O19a1-8V':
    '/hotspot26/1AwlEyVCquKbWjOn4F9RVZ2P9O19a1-8V.jpeg',
  '1PoTmsJAhBEs11RTOXAaOFM6wbWCB3EBb':
    '/hotspot26/1PoTmsJAhBEs11RTOXAaOFM6wbWCB3EBb.png',
  '1llo9eV_wnr0ahezpJB-m4wXsnVQSq_q0':
    '/hotspot26/1llo9eV_wnr0ahezpJB-m4wXsnVQSq_q0.png',
  '1D54jU6C1fz9w_NY5fkTxQjdnyJ5mS9Jd':
    '/hotspot26/1D54jU6C1fz9w_NY5fkTxQjdnyJ5mS9Jd.png',
  '19q2qZm_ygN7HsS5R0Z1YIqILZB2qyapU':
    '/hotspot26/19q2qZm_ygN7HsS5R0Z1YIqILZB2qyapU.jpg',
  '1ZrQF6WKCVxjOichCz2czjI6I_t2JvdT-':
    '/hotspot26/1ZrQF6WKCVxjOichCz2czjI6I_t2JvdT-.png',
};

interface DriveSeedRow {
  fileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  readable: boolean;
}

const IMAGE_SEEDS: DriveSeedRow[] = [
  {
    fileId: '1Y0YiCHFk5OfDz_GDQ6pmAHmtCcNNKTRR',
    name: '01_rabeh_saqer_riyadh_season_launch_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2366617,
    readable: true,
  },
  {
    fileId: '1iXQ5GDWssO6RJq5bzmLd9amBAVg_RCNk',
    name: '02_alahly_shell_campaign_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2936614,
    readable: true,
  },
  {
    fileId: '1ynBt4Y59MsD4JDY97qxVKCCShzyYdb9i',
    name: '03_zaid_khalid_el_waili_album_launch_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3162860,
    readable: true,
  },
  {
    fileId: '17TBxMO6XmvJqSwFno_aWqoL8VkRY0qNc',
    name: '04_legecy_tamer_hashem_cairokee_live_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3734390,
    readable: true,
  },
  {
    fileId: '1BBf1Jo1MZrztEIJj8ig0D5GQ_vyXi-Mq',
    name: '05_tarek_nojara_afrima_summit_2022_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2774112,
    readable: true,
  },
  {
    fileId: '1HTFP9SPOAZbtiXIKdh25GfgIu-fMlmUL',
    name: '07_kaswara_alkhatib_creative_industry_summit_2021_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2568419,
    readable: true,
  },
  {
    fileId: '13PB_csNF9FmTBzFNUmxYxRQiCD8xVRP8',
    name: '08_moayad_mdlbeast_xp_batn_alshaer_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3249318,
    readable: true,
  },
  {
    fileId: '1CFzll532OB4kWwRAAfJ6l9dSQDWuOUBq',
    name: '09_zaha_hadid_executive_cairo_camera_collection_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3655101,
    readable: true,
  },
  {
    fileId: '1b77T0UExK4Hxn-RPaYWDWTrh_qf8g5-F',
    name: '10_zaha_hadid_executive_indoor_selfie_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2669981,
    readable: true,
  },
  {
    fileId: '1RX8ndNmjGmYLGZO_HthERhw0I3N_lfXu',
    name: '11_tarek_nojara_asser_yassin_schweppes_gold_bts_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2647755,
    readable: true,
  },
  {
    fileId: '1V1KMG0nS7u2U8YOVMv9DeOgz5jzDDyvw',
    name: '12_tarek_nojara_wegz_orange_campaign_bts_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3283862,
    readable: true,
  },
  {
    fileId: '1PhOlqwW7zobuv9Xrj4TKqBl_OBo2wDB-',
    name: '13_tarek_nojara_mohamed_ramadan_aircraft_portrait_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3015330,
    readable: true,
  },
  {
    fileId: '15vzqgrVAyTcjZ6Dyb8972d1KcnGF0HSW',
    name: '14_tarek_nojara_riyadh_season_spiderman_bts_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2943060,
    readable: true,
  },
  {
    fileId: '1ucm2Zc9YeiCH8M10gzEGc5F4vk2_vu8j',
    name: '15_tarek_nojara_outdoor_production_set_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3550286,
    readable: true,
  },
  {
    fileId: '19q2qZm_ygN7HsS5R0Z1YIqILZB2qyapU',
    name: '16_tarek_nojara_egypt_entrepreneur_awards_finalist_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 808357,
    readable: true,
  },
  {
    fileId: '1byVxL1kcSZ0IwQX9CXFmfzqG2ZLno0Gy',
    name: '17_tarek_nojara_el_gouna_film_festival_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3031637,
    readable: true,
  },
  {
    fileId: '1I_CSr4EL90X7IS2eLgtA9akd1MNS-xO0',
    name: '18_tarek_nojara_production_set_reinstated_4k.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 3023571,
    readable: true,
  },
  {
    fileId: '1AwlEyVCquKbWjOn4F9RVZ2P9O19a1-8V',
    name: '003BB66B-9DB3-41B4-845E-D3369A29A2D2_1_105_c.jpeg',
    mimeType: 'image/jpeg',
    sizeBytes: 190435,
    readable: true,
  },
  {
    fileId: '1PoTmsJAhBEs11RTOXAaOFM6wbWCB3EBb',
    name: 'IMG_1265.PNG',
    mimeType: 'image/jpeg',
    sizeBytes: 107994,
    readable: true,
  },
  {
    fileId: '1llo9eV_wnr0ahezpJB-m4wXsnVQSq_q0',
    name: 'IMG_1267.PNG',
    mimeType: 'image/jpeg',
    sizeBytes: 145094,
    readable: true,
  },
  {
    fileId: '1D54jU6C1fz9w_NY5fkTxQjdnyJ5mS9Jd',
    name: 'IMG_1264.PNG',
    mimeType: 'image/jpeg',
    sizeBytes: 264012,
    readable: true,
  },
  {
    fileId: '1ZrQF6WKCVxjOichCz2czjI6I_t2JvdT-',
    name: 'IMG_1266.PNG',
    mimeType: 'image/jpeg',
    sizeBytes: 183187,
    readable: true,
  },
  {
    fileId: '1ez8GijnQZfMUmCUNQYCQlOvvIuvHlIcu',
    name: '18E353FF-2301-435A-899D-B7777995A602_1_105_c.jpeg',
    mimeType: 'image/jpeg',
    sizeBytes: 162765,
    readable: true,
  },
  {
    fileId: '1qz5u7-CcMK30k4Dgt8TKQH3hB6J3Wyr8',
    name: '0B815A01-CADE-431C-A7FA-7783860E5896_1_105_c.jpeg',
    mimeType: 'image/jpeg',
    sizeBytes: 195659,
    readable: true,
  },
];

/** Videos discovered in folder — Drive MCP marks many as not browser-readable without stream proxy. */
const VIDEO_SEEDS: DriveSeedRow[] = [
  {
    fileId: '1WOsaz0C-F9sTnWl_xQaSN1wt86I_jRoA',
    name: 'HH_Turki Alshaikh - Riyadh season launch campaign .mp4',
    mimeType: 'video/mp4',
    sizeBytes: 4794858,
    readable: false,
  },
  {
    fileId: '1gl17FrjVh2FUiz7YDbFNecf4XkYYLyPy',
    name: 'File - 2026-10-03T22:00:31.340Z',
    mimeType: 'video/mp4',
    sizeBytes: 3749746,
    readable: false,
  },
  {
    fileId: '1HBSstsLOYaPJwzhZidZcthrgUeoJaRS8',
    name: 'File - 2026-10-03T22:00:31.340Z',
    mimeType: 'video/mp4',
    sizeBytes: 3244015,
    readable: false,
  },
  {
    fileId: '1FNtBCltin3KBB5lPSSqXcLMkdXJTsUAX',
    name: 'But first, Production with Tarek Nojara - Episode copy 2.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 8726702,
    readable: false,
  },
  {
    fileId: '143QDgWYEcU9kI7F87XVMHr9WZuWl6HBe',
    name: '1- NJR Showreel.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 354708630,
    readable: false,
  },
];

const PDF_SEEDS: DriveSeedRow[] = [
  {
    fileId: '1fQCVW8kd02oK87ykvSeSoqHLP3hp8RkW',
    name: 'A Tale of Creative Resilience_Amira El Raghy_GQ October 23.pdf.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2028916,
    readable: true,
  },
];

function seedToAsset(row: DriveSeedRow, kind: SpatialMediaAsset['type']): SpatialMediaAsset {
  const local = HOTSPOT26_LOCAL_CACHE[row.fileId] ?? null;
  const hasLocal = Boolean(local);
  return {
    id: `hs26-${row.fileId}`,
    projectId: null,
    collectionId: HOTSPOT26_COLLECTION_ID,
    type: kind,
    title: row.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
    sourceFileId: row.fileId,
    sourceProvider: 'drive',
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    thumbnailUrl: hasLocal ? local : null,
    posterUrl: hasLocal ? local : null,
    playbackUrl: hasLocal && kind === 'image' ? local : null,
    localCacheUrl: local,
    rightsStatus: 'pending',
    accessStatus: hasLocal || row.readable ? 'available' : 'unauthorized',
    playbackStatus: hasLocal && kind === 'image' ? 'ready' : 'untested',
    metadataVerified: true,
    originalFilename: row.name,
    pageCount: kind === 'pdf' ? undefined : undefined,
  };
}

export function buildHotspot26Assets(): SpatialMediaAsset[] {
  const assets = [
    ...IMAGE_SEEDS.map((r) => seedToAsset(r, 'image')),
    ...VIDEO_SEEDS.map((r) => seedToAsset(r, 'video')),
    ...PDF_SEEDS.map((r) => seedToAsset(r, 'pdf')),
  ];
  // Locally cached textures first so the 24-slot WebGL grid shows real thumbs.
  return assets.sort((a, b) => Number(Boolean(b.localCacheUrl)) - Number(Boolean(a.localCacheUrl)));
}

export function buildHotspot26Collection(): SpatialMediaCollection {
  const assets = buildHotspot26Assets();
  return {
    id: HOTSPOT26_COLLECTION_ID,
    title: 'Hotspot 26 Media Test Collection',
    description:
      'Authorized Drive test source (Hotspot_26_media). Rights pending — not a completed client portfolio. Local cache covers verified image textures for WebGL; videos require authenticated stream proxy.',
    projectId: null,
    sourceFolderId: HOTSPOT26_FOLDER_ID,
    inventorySnapshot: '2026-10-17',
    rightsStatus: 'pending',
    isTestCollection: true,
    assetIds: assets.map((a) => a.id),
  };
}

export const HOTSPOT26_INVENTORY_META = {
  source: 'Hotspot_26_media',
  folderId: HOTSPOT26_FOLDER_ID,
  indexSheetId: HOTSPOT26_INDEX_SHEET_ID,
  inventorySnapshot: '2026-10-17',
  recordedTotal: 129,
  images: 78,
  videos: 29,
  pdf: 1,
  metadataFiles: 21,
  runtimeVerified: false,
  rightsStatus: 'pending' as const,
  seededInApp: {
    images: IMAGE_SEEDS.length,
    videos: VIDEO_SEEDS.length,
    pdf: PDF_SEEDS.length,
    locallyCachedTextures: Object.keys(HOTSPOT26_LOCAL_CACHE).length,
  },
  connectionNotes: [
    'Drive folder listed successfully via authorized Google Drive MCP.',
    'Image + PDF metadata readable; many video files require stream proxy (readable:false from connector).',
    'Do not treat Drive preview URLs as video streams.',
    'Local WebGL textures verified for a curated image subset under /public/hotspot26/.',
  ],
} as const;
