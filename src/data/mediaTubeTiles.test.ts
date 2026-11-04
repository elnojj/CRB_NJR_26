import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JOURNEY_MEDIA_MANIFEST, getMediaRecord } from './journeyMediaManifest.ts';
import {
  TUBE_RESERVED_TILES,
  TUBE_TILE_PLAN,
  tubeTargetForBeat,
  tubeTileForAsset,
} from './mediaTubeTiles.ts';
import { getNode, nodesInStation } from './environmentRegistry.ts';
import { JOURNEY_BEATS } from '../three/camera/journeyConfig.ts';
import { buildProjectMediaTubeItems } from '../three/mediaTubeItems.ts';
import { PROJECT_MEDIA_TUBE_SPECS } from '../three/mediaTubeSpecs.ts';

const TILE_COUNT = PROJECT_MEDIA_TUBE_SPECS.maxMountedTiles;
const HQ_PROJECT_TUBES = nodesInStation('env_hq', 'proj')
  .map((n) => n.legacyIds?.[0]?.toUpperCase())
  .filter((id): id is string => Boolean(id));
const ALL_TUBES = [...new Set([...HQ_PROJECT_TUBES, 'NOJARA', 'SEVEN'])];

describe('media tube tile integrity', () => {
  it('assigns every tube-eligible manifest asset exactly one slot, and nothing else a slot', () => {
    const planned = new Set(TUBE_TILE_PLAN.map((t) => t.assetId));
    assert.equal(planned.size, TUBE_TILE_PLAN.length, 'an asset never appears twice in the plan');
    for (const record of JOURNEY_MEDIA_MANIFEST) {
      const owner = record.owningNodeId ? getNode(record.owningNodeId) : null;
      const hqOwned = owner?.envId === 'env_hq' && (owner.kind === 'project' || owner.kind === 'media-shell');
      const mediaOk = record.mimeType.startsWith('video/') || record.mimeType.startsWith('image/');
      if (hqOwned && mediaOk) {
        assert.ok(planned.has(record.assetId), `${record.assetId} (${record.owningNodeId}) has a tile`);
      } else {
        assert.ok(!planned.has(record.assetId), `${record.assetId} is not owned by an HQ tube node, so it gets no tile`);
      }
    }
  });

  it('gives each planned tile a distinct, in-range index inside its own tube and never a reserved real tile', () => {
    const seen = new Set<string>();
    for (const tile of TUBE_TILE_PLAN) {
      assert.ok(Number.isInteger(tile.tileIndex) && tile.tileIndex >= 0 && tile.tileIndex < TILE_COUNT, `${tile.assetId} index in range`);
      const key = `${tile.tubeProjectId}:${tile.tileIndex}`;
      assert.ok(!seen.has(key), `${key} is held by one asset only`);
      seen.add(key);
      assert.ok(!(TUBE_RESERVED_TILES[tile.tubeProjectId] ?? []).includes(tile.tileIndex), `${key} is not a reserved public tile`);
    }
  });

  it('builds the planned asset into exactly that tile and nowhere else (no cross-contamination)', () => {
    const tilesByAsset = new Map<string, string[]>();
    for (const tube of ALL_TUBES) {
      const items = buildProjectMediaTubeItems(tube);
      assert.equal(items.length, TILE_COUNT);
      assert.equal(new Set(items.map((i) => i.id)).size, TILE_COUNT, `${tube} tile ids are unique`);
      items.forEach((item, idx) => {
        assert.equal(item.index, idx);
        if (!item.assetId) return;
        const list = tilesByAsset.get(item.assetId) ?? [];
        list.push(`${tube}:${idx}`);
        tilesByAsset.set(item.assetId, list);
      });
    }
    for (const tile of TUBE_TILE_PLAN) {
      assert.deepEqual(tilesByAsset.get(tile.assetId), [`${tile.tubeProjectId}:${tile.tileIndex}`], `${tile.assetId} appears once, in its own tube`);
      const built = buildProjectMediaTubeItems(tile.tubeProjectId)[tile.tileIndex];
      assert.equal(built.assetId, tile.assetId);
      assert.equal(built.title, getMediaRecord(tile.assetId)?.title);
      assert.equal(built.kind, tile.mediaKind);
      assert.equal(built.projectId, tile.tubeProjectId);
    }
    for (const assetId of tilesByAsset.keys()) assert.ok(tubeTileForAsset(assetId), `${assetId} on a tile is in the plan`);
  });

  it('leaves tubes with no owned assets free of manifest tiles, so no project borrows another project\'s media', () => {
    const owned = new Set(TUBE_TILE_PLAN.map((t) => t.tubeProjectId));
    for (const tube of ALL_TUBES.filter((t) => !owned.has(t))) {
      assert.ok(buildProjectMediaTubeItems(tube).every((i) => !i.assetId), `${tube} has no manifest tiles`);
    }
  });

  it('never claims playback: tiles without a runtime URL carry no url or poster and are not real video', () => {
    for (const tile of TUBE_TILE_PLAN) {
      const built = buildProjectMediaTubeItems(tile.tubeProjectId)[tile.tileIndex];
      const record = getMediaRecord(tile.assetId);
      assert.equal(built.isRealVideo, false);
      assert.equal(built.url, record?.runtimeUrl ?? undefined);
      assert.equal(built.posterUrl, record?.posterUrl ?? undefined);
      if (!record?.runtimeUrl) assert.match(built.subtitle, /playback not verified/);
    }
  });

  it('keeps the real public tiles on their reserved slots', () => {
    const batron = buildProjectMediaTubeItems('EL-BATRON');
    assert.equal(batron[0].isRealVideo, true);
    assert.ok(batron[0].url);
    const nojara = buildProjectMediaTubeItems('NOJARA');
    assert.ok(nojara[0].url && nojara[1].url);
    assert.ok(nojara.slice(0, 2).every((t) => !t.assetId));
    for (const tube of Object.keys(TUBE_RESERVED_TILES)) {
      for (const idx of TUBE_RESERVED_TILES[tube]) {
        assert.equal(buildProjectMediaTubeItems(tube)[idx].assetId, undefined, `${tube}:${idx} stays unplanned`);
      }
    }
  });

  it('points journey beats at the tile of their own asset', () => {
    const beat = (jId: string) => {
      const found = JOURNEY_BEATS.find((b) => b.jId === jId);
      assert.ok(found, jId);
      return found;
    };
    const j13 = tubeTargetForBeat(beat('J13'));
    assert.equal(j13?.assetId, 'med-el-batron-mp4');
    assert.equal(j13?.tubeProjectId, 'EL-BATRON');
    assert.equal(j13?.sphere, 'hq');
    assert.equal(tubeTargetForBeat(beat('J14'))?.assetId, 'med-el-batron-mov');
    assert.equal(tubeTargetForBeat(beat('J14'))?.tubeProjectId, 'EL-BATRON');
    assert.equal(tubeTargetForBeat(beat('J12'))?.assetId, 'med-master-media-kit-reel');
    assert.equal(tubeTargetForBeat(beat('J21'))?.assetId, 'med-noj-laliga-wal3ana');
    for (const tubeless of ['J01', 'J17', 'J18', 'J03', 'J04', 'J10', 'J20', 'J25']) {
      assert.equal(tubeTargetForBeat(beat(tubeless)), null, `${tubeless} opens no tube`);
    }
  });

  it('only targets tiles that exist in the built tube, for every beat', () => {
    for (const b of JOURNEY_BEATS) {
      const target = tubeTargetForBeat(b);
      if (!target) continue;
      const built = buildProjectMediaTubeItems(target.tubeProjectId)[target.tileIndex];
      assert.equal(built.assetId, target.assetId, `${b.jId} target tile holds its asset`);
      assert.ok(b.assetIds.includes(target.assetId), `${b.jId} names the asset it targets`);
    }
  });
});
