import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentChip, nodeDirectory, resolveNodeContent } from './nodeContent.ts';
import { buildProjectMediaTubeItems } from '../three/mediaTubeItems.ts';

const SPHERES = ['hq', 'cde', 'campaign-os', 'about-us'] as const;

describe('node content: every node in every environment is described', () => {
  const directory = nodeDirectory();

  it('lists nodes for all four environments', () => {
    for (const sphere of SPHERES) assert.ok(directory[sphere].length > 0, `${sphere} has nodes`);
    assert.equal(directory.hq.length, 12);
    assert.equal(directory.cde.length, 19);
    assert.equal(directory['campaign-os'].length, 6);
    assert.equal(directory['about-us'].length, 6);
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

  it('never invents media: projects without approved media stay empty', () => {
    for (const id of ['YAH', 'MHE', 'BSOCIAL', 'AL-AHRAM', 'MUSEUM-OF-ALMOST']) {
      const content = resolveNodeContent(id, 'project', 'hq');
      assert.equal(content?.tubeKey, null, id);
    }
  });

  it('stations aggregate the media of their projects', () => {
    const projects = resolveNodeContent('projects', 'station', 'hq');
    assert.ok(projects?.tubeKey?.startsWith('MIX:'));
    assert.ok((projects?.imageCount ?? 0) >= 2 && (projects?.videoCount ?? 0) >= 1);
  });

  it('chips read as plain counts', () => {
    assert.equal(contentChip(resolveNodeContent('SEVEN', 'project', 'hq')), '2 photos');
    assert.equal(contentChip(resolveNodeContent('EL-BATRON', 'project', 'hq')), '1 video');
    assert.equal(contentChip(null), '');
  });
});
