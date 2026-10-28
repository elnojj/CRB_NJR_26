/**
 * CEREBRO Universal WebGL Media System v7.0 — typed asset schema.
 * Never mark an asset ready solely because a filename or thumbnail exists.
 */

export type MediaKind = 'image' | 'video' | 'pdf';

export type MediaRightsStatus = 'approved' | 'pending' | 'restricted';
export type MediaAccessStatus = 'available' | 'unauthorized' | 'missing';
export type MediaPlaybackStatus =
  | 'untested'
  | 'ready'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'failed';

export type MediaSourceProvider = 'drive' | 'local' | 'external';

export interface SpatialMediaAsset {
  id: string;
  projectId: string | null;
  collectionId: string;
  type: MediaKind;
  title: string;
  sourceFileId: string;
  sourceProvider: MediaSourceProvider;
  mimeType?: string;
  sizeBytes?: number;
  thumbnailUrl: string | null;
  posterUrl?: string | null;
  playbackUrl?: string | null;
  localCacheUrl?: string | null;
  width?: number;
  height?: number;
  durationSeconds?: number;
  pageCount?: number;
  rightsStatus: MediaRightsStatus;
  accessStatus: MediaAccessStatus;
  playbackStatus: MediaPlaybackStatus;
  metadataVerified: boolean;
  originalFilename?: string;
}

export interface SpatialMediaCollection {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  sourceFolderId?: string;
  inventorySnapshot?: string;
  rightsStatus: MediaRightsStatus;
  isTestCollection: boolean;
  assetIds: string[];
}

export type MediaFilterKind = 'all' | MediaKind;

export interface MediaResolveContext {
  /** Firebase / Google OAuth access token for Drive alt=media fetches. */
  accessToken?: string | null;
  preferLocalCache?: boolean;
}

export interface ResolvedMediaUrls {
  assetId: string;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  posterUrl: string | null;
  requiresAuth: boolean;
  resolverNote: string;
}
