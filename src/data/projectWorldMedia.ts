/**
 * Project-world media bindings (L13 / projectWorldRule).
 * Only attaches verified catalog / public-brand / local-attached sources.
 * Never invents footage, portraits, or rights claims for absent sources.
 */
import {
  DRIVE_MEDIA_ASSETS,
  type DriveMediaAsset,
  type DriveMediaProjection,
  type DriveMediaProvenance,
  resolveAssetPlaybackUrl,
} from './driveMediaCatalog';
import { PUBLIC_BRAND_MEDIA } from './publicBrandMedia';
import type { ProjectWorldRightsState } from './projectWorldManifest';
import { PROJECT_SHOTS, SHOT_CATALOG_POLICY } from './shotMediaCatalog';

export type ProjectWorldMediaSlot = {
  id: string;
  catalogId: string | null;
  kind: 'video' | 'image' | 'none';
  role: 'world-poster' | 'inspection-still' | 'showreel' | 'unavailable';
  url: string | null;
  poster: string | null;
  aspect: '16:9' | '9:16' | '1:1' | 'unknown';
  projection: DriveMediaProjection;
  provenance: DriveMediaProvenance | 'public-brand' | 'register-unavailable';
  playable: boolean;
  rights: ProjectWorldRightsState;
  note: string;
};

const SEVEN_TABUK_DESKTOP =
  '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg';
const SEVEN_TABUK_MOBILE =
  '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg';

function unavailableSlot(projectId: string): ProjectWorldMediaSlot {
  return {
    id: `${projectId}-media-unavailable`,
    catalogId: null,
    kind: 'none',
    role: 'unavailable',
    url: null,
    poster: null,
    aspect: 'unknown',
    projection: 'flat',
    provenance: 'register-unavailable',
    playable: false,
    rights: 'unavailable',
    note: 'No verified playable media bound for this project world. Unavailable plate only.',
  };
}

function fromDriveAsset(
  asset: DriveMediaAsset,
  role: ProjectWorldMediaSlot['role'],
  rights: ProjectWorldRightsState,
  note: string
): ProjectWorldMediaSlot {
  return {
    id: asset.id,
    catalogId: asset.id,
    kind: asset.mediaType === 'bio' ? 'image' : asset.mediaType,
    role,
    url: resolveAssetPlaybackUrl(asset),
    poster: asset.poster,
    aspect: asset.aspect,
    projection: asset.projection,
    provenance: asset.provenance,
    playable: asset.playable,
    rights,
    note,
  };
}

/**
 * Resolve verified media slots for a source project.
 * Sample programmes may still bind public cleared showreels, but rights stay restricted
 * and the programme is never marked verified.
 */
export function resolveProjectWorldMediaSlots(project: {
  id: string;
  isSample?: boolean;
}): ProjectWorldMediaSlot[] {
  const sample = Boolean(project.isSample);
  const rights: ProjectWorldRightsState = sample ? 'restricted' : 'restricted';

  switch (project.id) {
    case 'SEVEN': {
      const desktop = DRIVE_MEDIA_ASSETS.find((a) => a.id === 'seven-tabuk-desktop');
      const mobile = DRIVE_MEDIA_ASSETS.find((a) => a.id === 'seven-tabuk-mobile');
      const slots: ProjectWorldMediaSlot[] = [];
      if (desktop) {
        slots.push(
          fromDriveAsset(
            desktop,
            'world-poster',
            'cleared',
            'Attached Tabuk concept render (desktop). Still only — no cleared SEVEN showreel in catalog.'
          )
        );
      } else {
        slots.push({
          id: 'seven-tabuk-desktop-local',
          catalogId: null,
          kind: 'image',
          role: 'world-poster',
          url: SEVEN_TABUK_DESKTOP,
          poster: SEVEN_TABUK_DESKTOP,
          aspect: '16:9',
          projection: 'flat',
          provenance: 'render',
          playable: true,
          rights: 'cleared',
          note: 'Local attached Tabuk desktop render.',
        });
      }
      if (mobile) {
        slots.push(
          fromDriveAsset(
            mobile,
            'inspection-still',
            'cleared',
            'Attached Tabuk concept render (mobile). Still only.'
          )
        );
      } else {
        slots.push({
          id: 'seven-tabuk-mobile-local',
          catalogId: null,
          kind: 'image',
          role: 'inspection-still',
          url: SEVEN_TABUK_MOBILE,
          poster: SEVEN_TABUK_MOBILE,
          aspect: '9:16',
          projection: 'portrait',
          provenance: 'render',
          playable: true,
          rights: 'cleared',
          note: 'Local attached Tabuk mobile render.',
        });
      }
      const sevenCut = PROJECT_SHOTS.SEVEN;
      if (sevenCut) {
        slots.push({
          id: sevenCut.id,
          catalogId: null,
          kind: 'video',
          role: 'showreel',
          url: sevenCut.videoPath,
          poster: sevenCut.posterPath,
          aspect: '16:9',
          projection: 'flat',
          provenance: 'public-brand',
          playable: true,
          rights: 'restricted',
          note: `${sevenCut.note}. ${SHOT_CATALOG_POLICY}`,
        });
      }
      return slots;
    }
    case 'EL-BATRON': {
      const catalog = DRIVE_MEDIA_ASSETS.find((a) => a.id === 'batron-showreel');
      const brand = PUBLIC_BRAND_MEDIA.elBatron;
      if (catalog) {
        return [
          {
            ...fromDriveAsset(
              catalog,
              'showreel',
              rights,
              sample
                ? 'Public El Batron showreel (Wix). Programme remains SAMPLE in the register — media is public brand, not a verified live programme claim.'
                : 'Public El Batron showreel (Wix / Drive catalog).'
            ),
            // Prefer direct public Wix URL over shared local fallback plate.
            url: brand.url,
            poster: brand.posterUrl,
            provenance: 'verified-footage',
            playable: true,
          },
        ];
      }
      return [
        {
          id: brand.id,
          catalogId: null,
          kind: 'video',
          role: 'showreel',
          url: brand.url,
          poster: brand.posterUrl,
          aspect: '16:9',
          projection: 'flat',
          provenance: 'public-brand',
          playable: true,
          rights,
          note: 'Public brand El Batron showreel. Programme SAMPLE flag preserved.',
        },
      ];
    }
    case 'YAH':
    case 'MHE':
    case 'BSOCIAL':
    case 'AL-AHRAM':
    case 'MUSEUM-OF-ALMOST': {
      const cut = PROJECT_SHOTS[project.id];
      if (!cut) return [unavailableSlot(project.id)];
      return [
        {
          id: cut.id,
          catalogId: null,
          kind: 'video',
          role: 'showreel',
          url: cut.videoPath,
          poster: cut.posterPath,
          aspect: '16:9',
          projection: 'flat',
          provenance: 'public-brand',
          playable: true,
          rights,
          note: `${cut.note}. ${SHOT_CATALOG_POLICY}`,
        },
      ];
    }
    default: {
      const cut = PROJECT_SHOTS[project.id];
      if (cut) {
        return [
          {
            id: cut.id,
            catalogId: null,
            kind: 'video',
            role: 'showreel',
            url: cut.videoPath,
            poster: cut.posterPath,
            aspect: '16:9',
            projection: 'flat',
            provenance: 'public-brand',
            playable: true,
            rights,
            note: `${cut.note}. ${SHOT_CATALOG_POLICY}`,
          },
        ];
      }
      return [unavailableSlot(project.id)];
    }
  }
}

/** First displayable poster for an unavailable world plate (still or showreel poster). */
export function primaryPosterForWorld(slots: ProjectWorldMediaSlot[]): string | null {
  for (const slot of slots) {
    if (slot.role === 'unavailable') continue;
    if (slot.poster) return slot.poster;
    if (slot.kind === 'image' && slot.url) return slot.url;
  }
  return null;
}

/** Verified playable video URL for a project node shell — null if none (use ice plate). */
export function resolveVerifiedProjectVideoUrl(projectId: string): string | null {
  const slots = resolveProjectWorldMediaSlots({ id: projectId });
  const showreel = slots.find((s) => s.role === 'showreel' && s.playable && s.url);
  return showreel?.url ?? null;
}

export function assetRefIdsFromSlots(slots: ProjectWorldMediaSlot[]): string[] {
  return slots
    .filter((s) => s.role !== 'unavailable' && (s.catalogId || s.url))
    .map((s) => s.catalogId || s.id);
}
