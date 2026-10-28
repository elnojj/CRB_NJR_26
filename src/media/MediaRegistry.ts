import type {
  MediaFilterKind,
  SpatialMediaAsset,
  SpatialMediaCollection,
} from './types';
import {
  buildHotspot26Assets,
  buildHotspot26Collection,
  HOTSPOT26_COLLECTION_ID,
  HOTSPOT26_INVENTORY_META,
} from './hotspot26Inventory';

class MediaRegistryImpl {
  private assets = new Map<string, SpatialMediaAsset>();
  private collections = new Map<string, SpatialMediaCollection>();
  private listeners = new Set<() => void>();

  constructor() {
    this.bootstrapHotspot26();
  }

  private bootstrapHotspot26(): void {
    const assets = buildHotspot26Assets();
    const collection = buildHotspot26Collection();
    assets.forEach((a) => this.assets.set(a.id, a));
    this.collections.set(collection.id, collection);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  upsertAsset(asset: SpatialMediaAsset): void {
    this.assets.set(asset.id, asset);
    this.emit();
  }

  patchAsset(id: string, patch: Partial<SpatialMediaAsset>): SpatialMediaAsset | null {
    const prev = this.assets.get(id);
    if (!prev) return null;
    const next = { ...prev, ...patch, id: prev.id };
    this.assets.set(id, next);
    this.emit();
    return next;
  }

  getAsset(id: string): SpatialMediaAsset | undefined {
    return this.assets.get(id);
  }

  getCollection(id: string): SpatialMediaCollection | undefined {
    return this.collections.get(id);
  }

  listCollections(): SpatialMediaCollection[] {
    return Array.from(this.collections.values());
  }

  listAssets(filter?: {
    collectionId?: string;
    projectId?: string | null;
    kind?: MediaFilterKind;
  }): SpatialMediaAsset[] {
    let items = Array.from(this.assets.values());
    if (filter?.collectionId) {
      items = items.filter((a) => a.collectionId === filter.collectionId);
    }
    if (filter?.projectId !== undefined) {
      items = items.filter((a) => a.projectId === filter.projectId);
    }
    if (filter?.kind && filter.kind !== 'all') {
      items = items.filter((a) => a.type === filter.kind);
    }
    // Prefer locally cached textures so grid tiles render real media first.
    return items.sort(
      (a, b) => Number(Boolean(b.localCacheUrl)) - Number(Boolean(a.localCacheUrl))
    );
  }

  getHotspot26Assets(kind: MediaFilterKind = 'all'): SpatialMediaAsset[] {
    return this.listAssets({ collectionId: HOTSPOT26_COLLECTION_ID, kind });
  }

  getInventoryMeta() {
    return HOTSPOT26_INVENTORY_META;
  }

  /** Map grid slots (max 24) from a collection for spherical tube mounting. */
  getGridPage(
    collectionId: string,
    kind: MediaFilterKind,
    offset = 0,
    limit = 24
  ): SpatialMediaAsset[] {
    return this.listAssets({ collectionId, kind }).slice(offset, offset + limit);
  }
}

export const mediaRegistry = new MediaRegistryImpl();
export { HOTSPOT26_COLLECTION_ID };
