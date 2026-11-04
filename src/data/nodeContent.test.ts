import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentChip, nodeDirectory, resolveNodeContent } from './nodeContent.ts';
import { buildProjectMediaTubeItems } from '../three/mediaTubeItems.ts';

const SPHERES = ['hq', 'cde', 'campaign-os', 'about-us'] as const;

describe('node content: every node in every environment is described', () => {
  const directory = nodeDirectory();

  it('lists nodes for all four environments', () => {
    for (const sphere of SPHERES) assert.ok(directory[sphere].length > 0, `${sphere} has nodes`);
    assert.equal(directory.hq.length, 3);
    assert.equal(directory.cde.length, 9);
    assert.equal(directory['campaign-os'].length, 4);
    assert.equal(directory['about-us'].length, 2);
  });

  it('every node states what it holds: a media count or an honest reason', () => {
    for (const sphere of SPHERES) {
      for (const entry of directory[sphere]) {
        assert.ok(entry.summary.length > 0, `${entry.nodeId} has a summary`);
        assert.ok(entry.chip.length > 0, `${entry.nodeId} has a chip`);
        if (entry.tubeKey === null) {
          assert.ok(entry.honest && entry.honest.length > 0, `${entry.nodeId} explains why it has no media`);
          assert.equal(entry.chip, 'No media yet');
        } else {
          assert.equal(entry.honest, null);
          assert.ok(entry.videoCount + entry.imageCount > 0, `${entry.nodeId} counts its media`);
        }
      }
    }
  });

  it('a node that reports media opens a tube whose focused tile really has it', () => {
    for (const sphere of SPHERES) {
      for (const entry of directory[sphere]) {
        if (entry.tubeKey === null) continue;
        const tile = buildProjectMediaTubeItems(entry.tubeKey)[entry.focusTile];
        assert.ok(tile && (tile.url || tile.posterUrl), `${sphere}:${entry.nodeId} focus tile has media`);
        assert.ok(entry.thumbs.length > 0, `${entry.nodeId} has a preview`);
      }
    }
  });

  it('disabled nodes are absent from every environment', () => {
    const disabledIds = ['YAH', 'MHE', 'BSOCIAL', 'AL-AHRAM', 'MUSEUM-OF-ALMOST', 'tasks', 'files', 'camp-bsocial', 'camp-mhe', 'shweekar-ahmed', 'khaled-al-shaalan', 'tarek-nojara', 'about-crew'];
    for (const sphere of SPHERES) {
      for (const entry of directory[sphere]) {
        assert.ok(!disabledIds.includes(entry.nodeId), `${sphere}:${entry.nodeId} should be disabled`);
      }
    }
    for (const id of ['YAH', 'MHE', 'BSOCIAL', 'AL-AHRAM', 'MUSEUM-OF-ALMOST']) {
      assert.equal(resolveNodeContent(id, 'project', 'hq'), null, id);
    }
  });

  it('HQ keeps only Projects, People and SEVEN; EL-BATRON and Media are HQ-disabled but live elsewhere', () => {
    assert.deepEqual(directory.hq.map((e) => e.nodeId), ['projects', 'SEVEN', 'people']);
    assert.deepEqual(directory.hq.filter((e) => !e.parentId).map((e) => e.nodeId), ['projects', 'people']);
    assert.equal(directory.hq.find((e) => e.nodeId === 'SEVEN')?.parentId, 'projects');
    assert.equal(directory.hq.find((e) => e.nodeId === 'people')?.title, 'NASA');
    assert.equal(resolveNodeContent('EL-BATRON', 'project', 'hq'), null);
    assert.equal(resolveNodeContent('media', 'station', 'hq'), null);
    assert.ok(resolveNodeContent('EL-BATRON', 'project', 'cde')?.tubeKey);
    assert.ok(directory['campaign-os'].some((e) => e.nodeId === 'camp-el-batron'));
  });

  it('the HQ Projects station aggregates only the projects still in HQ', () => {
    const projects = resolveNodeContent('projects', 'station', 'hq');
    assert.equal(projects?.tubeKey, 'SEVEN');
    assert.equal(projects?.videoCount, 0);
  });

  it('chips read as plain counts', () => {
    assert.equal(contentChip(resolveNodeContent('SEVEN', 'project', 'hq')), '2 photos');
    assert.equal(contentChip(resolveNodeContent('EL-BATRON', 'project', 'cde')), '1 video');
    assert.equal(contentChip(null), '');
  });
});
