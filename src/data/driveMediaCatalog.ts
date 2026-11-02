/**
 * Google Drive Hotspot_26_media catalog (folder 1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh)
 * Wired for sphere VideoTexture + About Us bios. Prefer streamUrl via /api/drive/stream/:id;
 * localFallback keeps the WebGL path alive when Drive egress is blocked.
 */

export const HOTSPOT_26_MEDIA_FOLDER_ID = '1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh';

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
  role: 'sphere-texture' | 'showreel' | 'about-portrait' | 'about-bio';
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
  localFallback?: string;
  caption?: string;
};

export const DRIVE_MEDIA_ASSETS: DriveMediaAsset[] = [
  {
    id: 'sphere-primary',
    driveFileId: '1WOsaz0C-F9sTnWl_xQaSN1wt86I_jRoA',
    title: 'HH Turki Alshaikh — Riyadh Season Launch',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'sphere-texture',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'equatorial',
    poster: '/media/sphere-showreel-fallback.mp4',
    provenance: 'verified-footage',
    durationSec: null,
    playable: true,
    projectCode: 'RIYADH-SEASON',
    localFallback: '/media/sphere-showreel-fallback.mp4',
    caption: 'Primary equator-band video texture for HQ glass sphere',
  },
  {
    id: 'njr-showreel-2023',
    driveFileId: '143QDgWYEcU9kI7F87XVMHr9WZuWl6HBe',
    title: '1 — NJR Showreel',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'showreel',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: '/media/sphere-showreel-fallback.mp4',
    provenance: 'verified-footage',
    durationSec: null,
    playable: true,
    projectCode: 'NOJARA',
    localFallback: '/media/sphere-showreel-fallback.mp4',
    caption: 'NOJARA Studios Showreel 2023 — About Us visual anchor',
  },
  {
    id: 'laliga-reel',
    driveFileId: '1JuftO8KtXKGeEcEPCXDpDXmtiS5a9orQ',
    title: 'NOJARA × LaLiga',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'showreel',
    projectId: null,
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: '/media/sphere-showreel-fallback.mp4',
    provenance: 'verified-footage',
    durationSec: null,
    playable: true,
    projectCode: 'LALIGA',
    localFallback: '/media/sphere-showreel-fallback.mp4',
  },
  {
    id: 'batron-showreel',
    driveFileId: '1xh0Dqv4yo-sUO7oSZbThIG0e1RDXLln8',
    title: 'Batron showreel',
    kind: 'video',
    mimeType: 'video/mp4',
    role: 'showreel',
    projectId: 'EL-BATRON',
    mediaType: 'video',
    aspect: '16:9',
    projection: 'flat',
    poster: '/media/sphere-showreel-fallback.mp4',
    provenance: 'verified-footage',
    durationSec: null,
    playable: true,
    projectCode: 'EL-BATRON',
    localFallback: '/media/sphere-showreel-fallback.mp4',
  },
  {
    id: 'about-tarek-portrait',
    driveFileId: '1BBf1Jo1MZrztEIJj8ig0D5GQ_vyXi-Mq',
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
    caption: 'Owner-supplied portrait plate for About Us / founder page',
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
      'NOJARA Studios practices across four connected pillars: creative strategy, production leadership, talent, and media technology. The public About Us visual anchor is the curated NOJARA Studios Showreel — a portfolio overview, not a single client campaign.',
    evidenceNote:
      'Source: Hotspot_26_media folder + Owner-Source-Excerpts (2026-10-23). Individual showreel frames must be attributed to their original projects wherever identifiable.',
    portraitAssetId: 'about-tarek-portrait',
    driveFolderId: HOTSPOT_26_MEDIA_FOLDER_ID,
    mediaAssetIds: ['njr-showreel-2023', 'sphere-primary', 'laliga-reel'],
  },
  {
    id: 'tarek-mojara',
    name: 'Tarek Mojara (39)',
    role: 'Founder and Culture and Design Engineer',
    summary:
      'Founder and Culture and Design Engineer of NOJARA Studios — never titled CEO. Presented as founder, creative producer, and strategist orchestrating multidisciplinary teams and AI crew systems across Cairo and Riyadh.',
    evidenceNote:
      'Source: SEVEN verified facts + Owner-Source-Excerpts. Egypt Entrepreneur Awards: Media Entrepreneur of the Year finalist (not winner). Celebrity / festival images do not establish campaign credit unless separately verified.',
    portraitAssetId: 'about-tarek-portrait',
    driveFolderId: HOTSPOT_26_MEDIA_FOLDER_ID,
    mediaAssetIds: ['about-tarek-portrait', 'njr-showreel-2023'],
  },
];

export function resolveDriveStreamPath(driveFileId: string): string {
  return `/api/drive/stream/${encodeURIComponent(driveFileId)}`;
}

export function resolveAssetPlaybackUrl(asset: DriveMediaAsset): string {
  if (asset.localFallback) return asset.localFallback;
  return resolveDriveStreamPath(asset.driveFileId);
}

export function getSphereTextureAsset(): DriveMediaAsset {
  return (
    DRIVE_MEDIA_ASSETS.find((a) => a.role === 'sphere-texture') ||
    DRIVE_MEDIA_ASSETS[0]
  );
}
