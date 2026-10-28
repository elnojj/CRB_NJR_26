/**
 * Hotspot 26 Media Test Collection — DOM surface for Media station.
 * Uses shared MediaRegistry + resolver. Does not invent portfolio claims.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  HOTSPOT26_COLLECTION_ID,
  HOTSPOT26_INVENTORY_META,
  mediaRegistry,
  resolveSpatialMediaAsset,
  type MediaFilterKind,
  type SpatialMediaAsset,
} from '../media';
import { GUI_GLASS_TOKENS, GUI_Z_LAYERS } from '../gui/guiTokens';

export interface SpatialMediaPanelProps {
  filterKind?: MediaFilterKind;
  onFilterChange?: (kind: MediaFilterKind) => void;
  onOpenAsset?: (asset: SpatialMediaAsset) => void;
  onOpenSpatialGrid?: () => void;
  googleAccessToken?: string | null;
}

export const SpatialMediaPanel: React.FC<SpatialMediaPanelProps> = ({
  filterKind = 'all',
  onFilterChange,
  onOpenAsset,
  onOpenSpatialGrid,
  googleAccessToken = null,
}) => {
  const [, bump] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [kind, setKind] = useState<MediaFilterKind>(filterKind);

  useEffect(() => mediaRegistry.subscribe(() => bump((n) => n + 1)), []);
  useEffect(() => setKind(filterKind), [filterKind]);

  const assets = useMemo(
    () => mediaRegistry.getHotspot26Assets(kind),
    [kind, bump]
  );
  const meta = mediaRegistry.getInventoryMeta();
  const active = activeId ? mediaRegistry.getAsset(activeId) : null;
  const resolved = active
    ? resolveSpatialMediaAsset(active, {
        accessToken: googleAccessToken,
        preferLocalCache: true,
      })
    : null;

  const filters: MediaFilterKind[] = ['all', 'image', 'video', 'pdf'];

  return (
    <div
      data-testid="hotspot26-media-test-panel"
      data-cta-id="hotspot26-media-test"
      className="space-y-3"
    >
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{
          background: GUI_GLASS_TOKENS.background,
          borderColor: 'rgba(255,255,255,0.14)',
          backdropFilter: GUI_GLASS_TOKENS.backdropFilter,
        }}
      >
        <div className="font-display text-sm text-[#F2F6F8]">
          Hotspot 26 Media Test Collection
        </div>
        <div className="font-mono text-[10px] text-[#BDCBD3] mt-1 leading-relaxed">
          Drive folder Hotspot_26_media · index snapshot {meta.inventorySnapshot} ·
          recorded {meta.recordedTotal} files (78 img / 29 vid / 1 pdf / 21 meta) ·
          rights <span className="text-[#F2B66D]">pending</span> · not a client
          portfolio claim
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              data-cta-id={`media-filter-${f}`}
              onClick={() => {
                setKind(f);
                onFilterChange?.(f);
              }}
              className="min-h-[36px] px-2.5 rounded-lg font-mono text-[10px] border cursor-pointer"
              style={{
                borderColor:
                  kind === f ? '#65ACFF' : 'rgba(255,255,255,0.2)',
                background:
                  kind === f ? 'rgba(76,141,255,0.22)' : 'rgba(16,29,39,0.7)',
                color: '#F2F6F8',
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            data-cta-id="open-spatial-media-grid"
            onClick={() => onOpenSpatialGrid?.()}
            className="min-h-[36px] px-2.5 rounded-lg font-mono text-[10px] border cursor-pointer"
            style={{
              borderColor: '#4C8DFF',
              background: 'rgba(76,141,255,0.28)',
              color: '#F2F6F8',
            }}
          >
            Open Spatial Glass Grid
          </button>
        </div>
      </div>

      <div className="font-mono text-[10px] text-[#BDCBD3]">
        Seeded in-app: {meta.seededInApp.images} images · {meta.seededInApp.videos}{' '}
        videos · {meta.seededInApp.pdf} PDF ·{' '}
        {meta.seededInApp.locallyCachedTextures} verified local textures · collection{' '}
        {HOTSPOT26_COLLECTION_ID}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[42vh] overflow-y-auto pr-1">
        {assets.map((asset) => {
          const r = resolveSpatialMediaAsset(asset, {
            accessToken: googleAccessToken,
            preferLocalCache: true,
          });
          return (
            <button
              key={asset.id}
              type="button"
              data-testid={`spatial-media-tile-${asset.id}`}
              data-cta-id={`focus-media-${asset.id}`}
              onClick={() => {
                setActiveId(asset.id);
                onOpenAsset?.(asset);
              }}
              className="text-left rounded-xl border overflow-hidden cursor-pointer"
              style={{
                borderColor:
                  activeId === asset.id ? '#65ACFF' : 'rgba(255,255,255,0.14)',
                background: 'rgba(16,29,39,0.84)',
              }}
            >
              <div className="aspect-video bg-[#101D27] relative">
                {r.thumbnailUrl ? (
                  <img
                    src={r.thumbnailUrl}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-[#BDCBD3] px-2 text-center">
                    {asset.type === 'video'
                      ? 'Video · auth stream required'
                      : 'No local thumbnail'}
                  </div>
                )}
                <span
                  className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-mono text-[9px]"
                  style={{
                    background: 'rgba(16,29,39,0.85)',
                    color:
                      asset.type === 'video'
                        ? '#F2B66D'
                        : asset.type === 'pdf'
                          ? '#9DB8D6'
                          : '#65ACFF',
                  }}
                >
                  {asset.type.toUpperCase()}
                </span>
              </div>
              <div className="px-2 py-1.5">
                <div className="font-sans text-[11px] text-[#F2F6F8] line-clamp-2 leading-snug">
                  {asset.title}
                </div>
                <div className="font-mono text-[9px] text-[#BDCBD3] mt-0.5">
                  {asset.playbackStatus} · {asset.accessStatus} · rights{' '}
                  {asset.rightsStatus}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {active && resolved && (
        <div
          className="rounded-xl border p-3 space-y-2"
          style={{
            borderColor: 'rgba(101,172,255,0.35)',
            background: 'rgba(20,38,50,0.9)',
            zIndex: GUI_Z_LAYERS.flyoutDrawer,
          }}
          data-testid="spatial-media-focus-well"
        >
          <div className="font-display text-sm text-[#F2F6F8]">{active.title}</div>
          <div className="font-mono text-[10px] text-[#BDCBD3]">
            {resolved.resolverNote}
          </div>
          {resolved.playbackUrl && active.type === 'image' ? (
            <img
              src={resolved.playbackUrl}
              alt={active.title}
              className="w-full max-h-64 object-contain rounded-lg bg-[#101D27]"
            />
          ) : active.type === 'video' ? (
            <div className="font-mono text-[11px] text-[#F2B66D]">
              Video registered ({active.sourceFileId}). Playback blocked until an
              authorized stream proxy or OAuth Bearer fetch is available — Drive
              /view links are not streams.
            </div>
          ) : active.type === 'pdf' ? (
            <div className="font-mono text-[11px] text-[#9DB8D6]">
              PDF registered. Open via authorized Drive viewer or pdf.js page
              textures (Path A scaffold). File id: {active.sourceFileId}
            </div>
          ) : null}
        </div>
      )}

      <ul className="font-mono text-[9px] text-[#BDCBD3] space-y-1 list-disc pl-4">
        {HOTSPOT26_INVENTORY_META.connectionNotes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
};
