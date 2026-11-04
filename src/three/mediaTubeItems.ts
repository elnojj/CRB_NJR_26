import { PUBLIC_BRAND_MEDIA } from '../data/publicBrandMedia';
import { TUBE_TILE_BY_SLOT } from '../data/mediaTubeTiles';
import { PROJECT_MEDIA_TUBE_SPECS } from './mediaTubeSpecs';
import { HOTSPOT26_LOCAL_CACHE } from '../media/hotspot26Inventory';

export { PROJECT_MEDIA_TUBE_SPECS };

export interface ProjectMediaTubeItem {
  index: number;
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  kind: 'image' | 'video' | 'pdf';
  aspect: '16:9' | '4:3' | '1:1' | 'A4';
  accentHex: string;
  url?: string;
  posterUrl?: string;
  isRealVideo?: boolean;
  /** Manifest asset id when the tile is the registry-mapped slot for that asset. */
  assetId?: string;
}

function buildBaseProjectMediaTubeItems(projectId: string): ProjectMediaTubeItem[] {
  const cleanProj = (projectId || 'SEVEN').toUpperCase();
  const baseKinds: Array<'image' | 'video' | 'pdf'> = ['image', 'video', 'pdf', 'image'];
  const baseAspects: Array<'16:9' | '4:3' | '1:1' | 'A4'> = ['16:9', '16:9', 'A4', '4:3'];

  return Array.from({ length: PROJECT_MEDIA_TUBE_SPECS.maxMountedTiles }).map((_, idx) => {
    const defaultKind = baseKinds[idx % baseKinds.length];
    const defaultAspect = baseAspects[idx % baseAspects.length];
    const row = Math.floor(idx / PROJECT_MEDIA_TUBE_SPECS.columns) + 1;
    const col = (idx % PROJECT_MEDIA_TUBE_SPECS.columns) + 1;
    const defaultAccent =
      defaultKind === 'video' ? '#D4AF37' : defaultKind === 'pdf' ? '#C5CCD6' : '#FFF4D0';

    // 1. EL-BATRON: Real El Batron showreel on the first available video tile (tile 0)
    if (cleanProj === 'EL-BATRON') {
      if (idx === 0) {
        return {
          index: idx,
          id: `tube-el-batron-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: PUBLIC_BRAND_MEDIA.elBatron.title,
          subtitle: 'VIDEO · 720p Official Showreel · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          url: PUBLIC_BRAND_MEDIA.elBatron.url,
          posterUrl: PUBLIC_BRAND_MEDIA.elBatron.posterUrl,
          isRealVideo: true,
        };
      }
      if (defaultKind === 'video') {
        return {
          index: idx,
          id: `tube-el-batron-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: `El Batron · Live Spatial Audio Rig (${row}.${col})`,
          subtitle: 'VIDEO · No cleared video linked · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          isRealVideo: false,
        };
      }
    }

    // 2. NOJARA Studios: Showreel 2023 and LaLiga in distinct slots (tiles 0 and 1)
    if (cleanProj === 'NOJARA') {
      if (idx === 0) {
        return {
          index: idx,
          id: `tube-nojara-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: PUBLIC_BRAND_MEDIA.showreel2023.title,
          subtitle: 'VIDEO · 720p Master Showreel · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          url: PUBLIC_BRAND_MEDIA.showreel2023.url,
          posterUrl: PUBLIC_BRAND_MEDIA.showreel2023.posterUrl,
          isRealVideo: true,
        };
      }
      if (idx === 1) {
        return {
          index: idx,
          id: `tube-nojara-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: PUBLIC_BRAND_MEDIA.laligaFilm.title,
          subtitle: 'VIDEO · 720p Official Film · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          url: PUBLIC_BRAND_MEDIA.laligaFilm.url,
          posterUrl: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
          isRealVideo: true,
        };
      }
    }

    // 3. SEVEN: Real verified Tabuk renders on image tiles
    if (cleanProj === 'SEVEN') {
      if (idx === 0) {
        return {
          index: idx,
          id: `tube-seven-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: 'SEVEN Tabuk — Concept Render Desktop',
          subtitle: 'IMAGE · Attached 06 Render · 16:9',
          kind: 'image',
          aspect: '16:9',
          accentHex: '#FFF4D0',
          url: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
          posterUrl: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
          isRealVideo: false,
        };
      }
      if (idx === 3) {
        return {
          index: idx,
          id: `tube-seven-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: 'SEVEN Tabuk — Concept Render Mobile',
          subtitle: 'IMAGE · Attached 06 Render · 9:16',
          kind: 'image',
          aspect: '16:9',
          accentHex: '#FFF4D0',
          url: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
          posterUrl: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
          isRealVideo: false,
        };
      }
    }

    // Default / Unknown project truthful document items
    const isVideo = defaultKind === 'video';
    const sub = isVideo
      ? 'VIDEO · No cleared video linked · 16:9'
      : `${defaultKind.toUpperCase()} · Row ${row} Col ${col} · ${defaultAspect}`;

    return {
      index: idx,
      id: `tube-${cleanProj.toLowerCase()}-${String(idx + 1).padStart(2, '0')}`,
      projectId: cleanProj,
      title: `${cleanProj} · ${defaultKind === 'video' ? 'Walkthrough Reel' : defaultKind === 'pdf' ? 'Executive Dossier' : 'Keyframe Plate'} (${row}.${col})`,
      subtitle: sub,
      kind: defaultKind,
      aspect: defaultAspect,
      accentHex: defaultAccent,
      isRealVideo: false,
    };
  });
}

/**
 * Tiles for one project tube. Slots the manifest plan assigns carry the manifest title and asset id;
 * their media stays unlinked (and renders as the missing-media placeholder) until a runtime URL exists.
 */
export function buildProjectMediaTubeItems(projectId: string): ProjectMediaTubeItem[] {
  const cleanProj = (projectId || 'SEVEN').toUpperCase();
  if (isMixTubeKey(cleanProj)) return buildMixTubeItems(cleanProj);
  return buildSingleProjectTubeItems(cleanProj);
}

const MIX_PREFIX = 'MIX:';
const GALLERY_SOURCE = 'GALLERY';

export function isMixTubeKey(key: string): boolean {
  return key.toUpperCase().startsWith(MIX_PREFIX);
}

/** One tube that gathers the real media of several sources (project ids, NOJARA, GALLERY). */
export function mixTubeKey(sources: readonly string[]): string {
  const unique = Array.from(new Set(sources.map((src) => src.toUpperCase())));
  return `${MIX_PREFIX}${unique.join(',')}`;
}

const hasRealMedia = (item: ProjectMediaTubeItem): boolean => Boolean(item.url || item.posterUrl);

function galleryItems(): ProjectMediaTubeItem[] {
  return Object.values(HOTSPOT26_LOCAL_CACHE).map((url, idx) => ({
    index: idx,
    id: `tube-gallery-${String(idx + 1).padStart(2, '0')}`,
    projectId: GALLERY_SOURCE,
    title: 'Gallery',
    subtitle: 'IMAGE · Local file',
    kind: 'image' as const,
    aspect: '16:9' as const,
    accentHex: '#FFF4D0',
    url,
    posterUrl: url,
    isRealVideo: false,
  }));
}

/** Real media for one mix source, in tube order; placeholders are never included. */
export function realMediaForSource(source: string): ProjectMediaTubeItem[] {
  const key = source.toUpperCase();
  const items = key === GALLERY_SOURCE ? galleryItems() : buildSingleProjectTubeItems(key);
  return items.filter(hasRealMedia);
}

function buildMixTubeItems(key: string): ProjectMediaTubeItem[] {
  const sources = key.slice(MIX_PREFIX.length).split(',').filter(Boolean);
  const real = sources.flatMap(realMediaForSource);
  const base = buildSingleProjectTubeItems(key);
  return base.map((placeholder, idx) => {
    const item = real[idx];
    return item ? { ...item, index: idx } : placeholder;
  });
}

function buildSingleProjectTubeItems(cleanProj: string): ProjectMediaTubeItem[] {
  return buildBaseProjectMediaTubeItems(cleanProj).map((base) => {
    const planned = TUBE_TILE_BY_SLOT.get(`${cleanProj}:${base.index}`);
    if (!planned) return base;
    const isVideo = planned.mediaKind === 'video';
    return {
      index: base.index,
      id: `tube-${cleanProj.toLowerCase()}-${String(base.index + 1).padStart(2, '0')}`,
      projectId: cleanProj,
      title: planned.title,
      subtitle: `${isVideo ? 'VIDEO' : 'IMAGE'} · ${
        planned.runtimeUrl ? 'Local file' : 'Source linked, playback not verified'
      } · 16:9`,
      kind: isVideo ? 'video' : 'image',
      aspect: '16:9',
      accentHex: isVideo ? '#D4AF37' : '#FFF4D0',
      url: planned.runtimeUrl ?? undefined,
      posterUrl: planned.posterUrl ?? undefined,
      isRealVideo: false,
      assetId: planned.assetId,
    };
  });
}

/** Index of the first tile in a project's tube that carries real media (url or poster); null if none. */
export function firstMediaTileIndex(projectId: string): number | null {
  const items = buildProjectMediaTubeItems(projectId);
  const found =
    items.find((item) => item.index < PROJECT_MEDIA_TUBE_SPECS.columns && hasRealMedia(item)) ??
    items.find(hasRealMedia);
  return found ? found.index : null;
}
