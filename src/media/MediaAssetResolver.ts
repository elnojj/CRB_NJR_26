/**
 * Resolves authorized media URLs. Never treats a Drive preview page as a stream.
 * Prefer local verified cache → authenticated Drive API alt=media → unavailable.
 */

import type {
  MediaResolveContext,
  ResolvedMediaUrls,
  SpatialMediaAsset,
} from './types';
import { HOTSPOT26_LOCAL_CACHE } from './hotspot26Inventory';
import { mediaRegistry } from './MediaRegistry';

export function driveThumbnailUrl(fileId: string, size = 800): string {
  // Documented Drive thumbnail helper — still requires the viewer to be authorized
  // for private files; used only as a soft poster hint, never as a stream.
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${size}`;
}

export function driveAuthenticatedMediaUrl(fileId: string): string {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
}

export function resolveSpatialMediaAsset(
  asset: SpatialMediaAsset,
  ctx: MediaResolveContext = {}
): ResolvedMediaUrls {
  const preferLocal = ctx.preferLocalCache !== false;
  const local =
    (preferLocal && asset.localCacheUrl) ||
    HOTSPOT26_LOCAL_CACHE[asset.sourceFileId] ||
    null;

  if (local) {
    return {
      assetId: asset.id,
      thumbnailUrl: local,
      playbackUrl: asset.type === 'video' ? null : local,
      posterUrl: local,
      requiresAuth: false,
      resolverNote: 'Verified local cache under /public/hotspot26/',
    };
  }

  if (asset.sourceProvider === 'drive') {
    if (ctx.accessToken) {
      return {
        assetId: asset.id,
        thumbnailUrl: driveThumbnailUrl(asset.sourceFileId),
        playbackUrl: driveAuthenticatedMediaUrl(asset.sourceFileId),
        posterUrl: driveThumbnailUrl(asset.sourceFileId, 1280),
        requiresAuth: true,
        resolverNote:
          'Authorized Drive alt=media URL — pass Bearer token; do not use /view preview links as streams.',
      };
    }

    return {
      assetId: asset.id,
      thumbnailUrl: null,
      playbackUrl: null,
      posterUrl: null,
      requiresAuth: true,
      resolverNote:
        'Drive asset registered but no OAuth access token in context. Connect Google Workspace or use a server proxy. Preview URLs are not playable streams.',
    };
  }

  return {
    assetId: asset.id,
    thumbnailUrl: asset.thumbnailUrl,
    playbackUrl: asset.playbackUrl ?? null,
    posterUrl: asset.posterUrl ?? asset.thumbnailUrl,
    requiresAuth: false,
    resolverNote: 'External/local provider URL as registered.',
  };
}

export function resolveAssetById(
  assetId: string,
  ctx: MediaResolveContext = {}
): ResolvedMediaUrls | null {
  const asset = mediaRegistry.getAsset(assetId);
  if (!asset) return null;
  return resolveSpatialMediaAsset(asset, ctx);
}

export async function fetchAuthorizedDriveBlob(
  fileId: string,
  accessToken: string
): Promise<Blob> {
  const res = await fetch(driveAuthenticatedMediaUrl(fileId), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Drive media fetch failed (${res.status}) for ${fileId}`);
  }
  return res.blob();
}
