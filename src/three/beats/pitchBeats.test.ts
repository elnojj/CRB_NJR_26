import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ENVIRONMENTS } from '../../data/environmentRegistry';
import { PITCH_BANNED_CLAIMS, PITCH_BEATS, PITCH_FILM_GAUGE_MM, PITCH_SOURCES, PITCH_TOTAL_SEC } from '../../data/pitchBeats';
import { JOURNEY_BEATS } from '../camera/journeyConfig';
import { beatToJourneyBeat } from './journeyBridge';
import { pitchBeatContent, pitchContentProvider, pitchRamp, pitchWords } from './pitchContent';
import { pitchTargetToAssociation, verifyPitchBeats } from './pitchVerification';

describe('pitch spec contract', () => {
  it('has exactly 25 unique J ids in the required playback order', () => {
    assert.equal(PITCH_BEATS.length, 25);
    assert.equal(new Set(PITCH_BEATS.map((b) => b.jId)).size, 25);
    assert.deepEqual(
      PITCH_BEATS.map((b) => b.jId),
      ['J01', 'J17', 'J18', 'J16', 'J02', 'J03', 'J04', 'J05', 'J06', 'J07', 'J08', 'J09', 'J10', 'J11', 'J12', 'J13', 'J14', 'J15', 'J19', 'J20', 'J21', 'J22', 'J23', 'J24', 'J25'],
    );
    assert.deepEqual(PITCH_BEATS.map((b) => b.jId), JOURNEY_BEATS.map((b) => b.jId));
  });

  it('opens About Us with Shweekar, Khalid, the collective, then Tarek', () => {
    const targets = PITCH_BEATS.slice(1, 5).map((b) => b.targetId);
    assert.deepEqual(targets, [
      'env_about__people__shweekar',
      'env_about__people__khalid',
      'env_about__people__tarek',
      'env_about__people__tarek',
    ]);
    assert.equal(PITCH_BEATS[3].onScreenText, 'People make systems work.');
  });

  it('tiles the 180 second timeline without gaps', () => {
    let cursor = 0;
    for (const beat of PITCH_BEATS) {
      assert.equal(beat.startSec, cursor, `${beat.jId} starts where the previous beat ends`);
      assert.ok(beat.endSec > beat.startSec);
      cursor = beat.endSec;
    }
    assert.equal(cursor, PITCH_TOTAL_SEC);
  });

  it('keeps Drive links as provenance with null runtime and null in/out', () => {
    for (const [id, source] of Object.entries(PITCH_SOURCES)) {
      assert.equal(source.runtimeUrl, null, id);
      assert.equal(source.inSec, null, id);
      assert.equal(source.outSec, null, id);
      assert.match(source.driveUrl, /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view/);
    }
    for (const beat of PITCH_BEATS) for (const id of beat.sourceIds) assert.ok(PITCH_SOURCES[id], `${beat.jId} source ${id}`);
  });

  it('never carries forbidden performance claims', () => {
    for (const beat of PITCH_BEATS) {
      const text = [beat.onScreenText, beat.voiceover, beat.metric.display, beat.metric.context].join(' ');
      const contextLess = text.replace(/No 60 FPS[^.]*\./, '').replace(/No export revenue[^.]*\./, '');
      for (const pattern of PITCH_BANNED_CLAIMS) assert.doesNotMatch(contextLess, pattern, `${beat.jId} ${pattern}`);
    }
  });

  it('uses 28-65 mm lens cues on a 36 mm gauge', () => {
    assert.equal(PITCH_FILM_GAUGE_MM, 36);
    for (const beat of PITCH_BEATS) assert.ok(beat.camera.focalMm >= 28 && beat.camera.focalMm <= 65, beat.jId);
  });

  it('keeps Campaign OS distinct from the 39 OS project', () => {
    const j24 = PITCH_BEATS.find((b) => b.jId === 'J24');
    assert.equal(j24?.envId, 'env_campaign_os');
    assert.ok(!PITCH_BEATS.some((b) => /39 OS/i.test(b.onScreenText)));
  });

  it('maps targets onto registry association ids', () => {
    assert.equal(pitchTargetToAssociation('env_about', 'env_about__people__shweekar'), 'about__people__shweekar');
    assert.equal(pitchTargetToAssociation('env_campaign_os', 'env_campaign_os__stages__review'), 'cos__stages__review');
  });
});

describe('pitch content provider', () => {
  it('splits copy on whitespace and paces words at 0.18 s with sentence pauses', () => {
    const content = pitchContentProvider(0);
    assert.deepEqual(content?.text?.words, ['Fiction', 'gave', 'it', 'a', 'shape.', 'Reality', 'gave', 'it', 'a', 'job.']);
    assert.equal(content?.text?.staggerSec, 0.18);
    assert.equal(content?.text?.sentencePauseSec, 0.45);
    assert.equal(pitchWords(PITCH_BEATS[0]).join(' '), PITCH_BEATS[0].onScreenText);
  });

  it('never gives media a playable url while runtime is unresolved', () => {
    for (let i = 0; i < 25; i += 1) {
      const media = pitchContentProvider(i)?.media;
      assert.equal(media?.kind, 'title');
      assert.equal(media?.url, undefined);
    }
  });

  it('omits metric overlays for pending evidence and labels the rest as structure or process', () => {
    for (const beat of PITCH_BEATS) {
      const metric = pitchBeatContent(beat).metric;
      if (beat.metric.evidence === 'pending') assert.equal(metric, undefined, beat.jId);
      else assert.equal(metric?.value, beat.metric.display, beat.jId);
      assert.ok(typeof metric?.value !== 'number', beat.jId);
    }
  });

  it('splits each slot into travel and hold that sum to the beat duration', () => {
    for (const beat of PITCH_BEATS) {
      const ramp = pitchRamp(beat);
      assert.ok(Math.abs(ramp.travelSec + ramp.holdSec - (beat.endSec - beat.startSec)) < 1e-9, beat.jId);
      assert.equal(ramp.ease, 'power3.inOut');
    }
  });

  it('shows the editorial id and environment in the caption', () => {
    const caption = beatToJourneyBeat(1, pitchContentProvider(1));
    assert.equal(caption.jId, 'J17');
    assert.equal(caption.supportEn, `${ENVIRONMENTS.env_about.titleEn} · 00:06–00:12`);
    assert.equal(caption.narrationEn, 'Shweekar Ahmed. People before platforms.');
  });
});

describe('per-beat verification report', () => {
  const report = verifyPitchBeats();

  it('reports every beat and never marks a beat ready with unresolved media', () => {
    assert.equal(report.length, 25);
    for (const row of report) {
      const beat = PITCH_BEATS[row.index];
      if (beat.sourceIds.length > 0) assert.equal(row.status, 'blocked', row.jId);
    }
  });

  it('fits copy plus the 1.4 s hold inside every beat', () => {
    for (const row of report) assert.ok(!row.blockers.some((b) => b.startsWith('Copy needs')), `${row.jId}: ${row.blockers.join(' | ')}`);
  });
});
