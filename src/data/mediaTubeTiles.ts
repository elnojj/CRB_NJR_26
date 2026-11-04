import { JOURNEY_MEDIA_MANIFEST, type JourneyMediaRecord } from './journeyMediaManifest';
import { environmentOfAssociation, getNode } from './environmentRegistry';
import type { ConnectedSphereId } from '../three/sphereNetwork';
import { PROJECT_MEDIA_TUBE_SPECS } from '../three/mediaTubeSpecs';

/**
 * Which tube tile each manifest asset occupies. The tube is one cylinder per project (24 tiles, 8 x 3);
 * an asset goes only to the tube of the HQ node that owns it (the tube is an HQ construct), in a slot of its own media kind, and never to a
 * slot that already holds a real public tile. Slot choice is derived from manifest order, so adding an
 * asset cannot silently move an existing one.
 */

export type TubeTilePlan = {
  assetId: string;
  owningNodeId: string;
  tubeProjectId: string;
  tileIndex: number;
  title: string;
  mediaKind: 'video' | 'image';
  runtimeUrl: string | null;
  posterUrl: string | null;
  sphere: ConnectedSphereId;
};

/** Tiles the tube builder fills with real public media. Planned assets must not overwrite them. */
export const TUBE_RESERVED_TILES: Readonly<Record<string, readonly number[]>> = {
  'EL-BATRON': [0],
  NOJARA: [0, 1],
  SEVEN: [0, 3],
};

/** Base tile kinds repeat image, video, pdf, image across the 24 slots. */
function slotsFor(mediaKind: 'video' | 'image', tubeProjectId: string): number[] {
  const reserved = TUBE_RESERVED_TILES[tubeProjectId] ?? [];
  const slots: number[] = [];
  for (let idx = 0; idx < PROJECT_MEDIA_TUBE_SPECS.maxMountedTiles; idx++) {
    const phase = idx % 4;
    const matches = mediaKind === 'video' ? phase === 1 : phase === 0 || phase === 3;
    if (matches && !reserved.includes(idx)) slots.push(idx);
  }
  return slots;
}

function tubeProjectOf(owningNodeId: string): string | null {
  const node = getNode(owningNodeId);
  if (!node || node.envId !== 'env_hq') return null;
  switch (node.kind) {
    case 'project':
      return node.legacyIds?.[0]?.toUpperCase() ?? null;
    case 'media-shell':
      return 'NOJARA';
    case 'person':
    case 'story':
    case 'studio':
    case 'agent':
    case 'pillar':
    case 'stage':
    case 'register':
    case 'files':
      return null;
    default: {
      const unhandled: never = node.kind;
      return unhandled;
    }
  }
}

function mediaKindOf(record: JourneyMediaRecord): 'video' | 'image' | null {
  if (record.mimeType.startsWith('video/')) return 'video';
  if (record.mimeType.startsWith('image/')) return 'image';
  return null;
}

function buildPlan(): TubeTilePlan[] {
  const used = new Map<string, number>();
  const plan: TubeTilePlan[] = [];
  for (const record of JOURNEY_MEDIA_MANIFEST) {
    if (!record.owningNodeId) continue;
    const tubeProjectId = tubeProjectOf(record.owningNodeId);
    const mediaKind = mediaKindOf(record);
    const env = environmentOfAssociation(record.owningNodeId);
    if (!tubeProjectId || !mediaKind || !env) continue;
    const key = `${tubeProjectId}:${mediaKind}`;
    const taken = used.get(key) ?? 0;
    const tileIndex = slotsFor(mediaKind, tubeProjectId)[taken];
    if (tileIndex === undefined) continue;
    used.set(key, taken + 1);
    plan.push({
      assetId: record.assetId,
      owningNodeId: record.owningNodeId,
      tubeProjectId,
      tileIndex,
      title: record.title,
      mediaKind,
      runtimeUrl: record.runtimeUrl,
      posterUrl: record.posterUrl,
      sphere: env.sphereId,
    });
  }
  return plan;
}

export const TUBE_TILE_PLAN: readonly TubeTilePlan[] = buildPlan();

export const TUBE_TILE_BY_SLOT: ReadonlyMap<string, TubeTilePlan> = new Map(
  TUBE_TILE_PLAN.map((t) => [`${t.tubeProjectId}:${t.tileIndex}`, t])
);

const TUBE_TILE_BY_ASSET: ReadonlyMap<string, TubeTilePlan> = new Map(TUBE_TILE_PLAN.map((t) => [t.assetId, t]));

export function tubeTileForAsset(assetId: string): TubeTilePlan | null {
  return TUBE_TILE_BY_ASSET.get(assetId) ?? null;
}

/**
 * The tile a journey beat should highlight on arrival: the first beat asset that sits in the tube of the
 * beat's own node (or any tube when the beat names no node). Null when the beat has no tube-backed asset.
 */
export function tubeTargetForBeat(beat: { nodeId: string | null; assetIds: readonly string[] }): TubeTilePlan | null {
  const nodeTube = beat.nodeId ? tubeProjectOf(beat.nodeId) : null;
  for (const assetId of beat.assetIds) {
    const tile = tubeTileForAsset(assetId);
    if (!tile) continue;
    if (nodeTube && tile.tubeProjectId !== nodeTube) continue;
    return tile;
  }
  return null;
}
