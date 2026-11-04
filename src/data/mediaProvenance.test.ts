import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MEDIA_PROVENANCE_STATUSES } from '../design/systemContract';
import { isMediaProvenanceStatus, mediaStatusTag, resolveMediaProvenance } from './mediaProvenance';
import { buildProjectMediaTubeItems } from '../three/mediaTubeItems';
import { pitchBeatContent } from '../three/beats/pitchContent';
import { PITCH_BEATS } from './pitchBeats';

describe('RULE-03 truthful media provenance', () => {
  it('uses only loading, poster, unavailable and error for media that is not playing', () => {
    assert.deepEqual([...MEDIA_PROVENANCE_STATUSES], ['loading', 'poster', 'unavailable', 'error']);
    assert.equal(isMediaProvenanceStatus('blocked'), false);
    assert.equal(isMediaProvenanceStatus('pending-media'), false);
  });

  it('resolves each state from what is actually known', () => {
    assert.equal(resolveMediaProvenance({ runtimeUrl: null, posterUrl: null }), 'unavailable');
    assert.equal(resolveMediaProvenance({ runtimeUrl: null, posterUrl: '/p.jpg' }), 'poster');
    assert.equal(resolveMediaProvenance({ runtimeUrl: '/v.mp4', posterUrl: null, loadState: 'loading' }), 'loading');
    assert.equal(resolveMediaProvenance({ runtimeUrl: '/v.mp4', posterUrl: null, loadState: 'failed' }), 'error');
    assert.equal(resolveMediaProvenance({ runtimeUrl: '/v.mp4', posterUrl: null, loadState: 'ready' }), 'playing');
    assert.equal(mediaStatusTag('unavailable', 'not live'), 'unavailable · not live');
  });

  it('pitch media cards never claim playback that has not been validated', () => {
    for (const beat of PITCH_BEATS) {
      const media = pitchBeatContent(beat).media;
      assert.ok(media);
      assert.equal(media.kind, 'title', beat.jId);
      assert.match(media.caption ?? '', /^unavailable/, beat.jId);
    }
  });

  it('tube tiles without a linked video are tagged unavailable', () => {
    const tiles = buildProjectMediaTubeItems('SEVEN');
    const unlinked = tiles.filter((t) => !t.url && !t.posterUrl);
    assert.ok(unlinked.length > 0);
    for (const tile of unlinked) assert.match(tile.subtitle, /^unavailable/, tile.id);
  });
});
