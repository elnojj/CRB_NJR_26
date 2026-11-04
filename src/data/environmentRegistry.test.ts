import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ENVIRONMENTS,
  ENVIRONMENT_IDS,
  NASA_ROSTER,
  NODES,
  PEOPLE,
  AGENT_ACTION_DISABLED_REASON_EN,
  agentActionsFor,
  agentCardView,
  environmentForSphere,
  getNode,
  matchKeyword,
  matchKeywordTarget,
  nodesInEnvironment,
  nodesInStation,
  resolveAssociationId,
} from './environmentRegistry.ts';
import { planRegistryNavigation } from '../utils/registryNavigation.ts';
import { JOURNEY_MEDIA_MANIFEST, MEDIA_GAPS, getMediaRecord, mediaForNode } from './journeyMediaManifest.ts';
import { JOURNEY_BASE_DURATION_SEC, JOURNEY_BEATS, buildJourneyStops, journeyBeatAt } from '../three/camera/journeyConfig.ts';

describe('environment registry', () => {
  it('gives every node a unique association id of the form env__station__node', () => {
    const ids = NODES.map((n) => n.associationId);
    assert.equal(new Set(ids).size, ids.length);
    for (const n of NODES) {
      assert.match(n.associationId, /^[a-z]+__[a-z]+__[a-z0-9]+$/);
      assert.equal(n.associationId, `${ENVIRONMENTS[n.envId].key}__${n.stationId}__${n.nodeId}`);
      assert.ok(ENVIRONMENTS[n.envId].stations.includes(n.stationId), `${n.associationId} station is declared`);
    }
  });

  it('resolves the short alias hq__proj_bat to the canonical El Batron node', () => {
    assert.equal(resolveAssociationId('hq__proj_bat'), 'hq__proj__bat');
    assert.equal(getNode('HQ__PROJ__BAT')?.titleEn, 'El Batron');
    assert.equal(resolveAssociationId('hq__proj__nope'), null);
  });

  it('never leaks nodes across environments: About Us holds no CDE or HQ node', () => {
    const about = nodesInEnvironment('env_about');
    assert.ok(about.length > 0);
    for (const n of about) assert.equal(n.envId, 'env_about');
    assert.equal(nodesInStation('env_about', 'strategy').length, 0, 'About Us has no CDE station');
    assert.equal(nodesInStation('env_about', 'proj').length, 0);
    for (const id of ENVIRONMENT_IDS) {
      for (const n of nodesInEnvironment(id)) assert.ok(n.associationId.startsWith(`${ENVIRONMENTS[id].key}__`));
    }
  });

  it('stores each person once and references them from the environments', () => {
    assert.equal(PEOPLE.shweekar.displayName, 'Shweekar Ahmed');
    assert.equal(PEOPLE.khaled.displayName, 'Khaled Al Shaalan');
    assert.equal(PEOPLE.tarek.displayName, 'Tarek Nojara');
    assert.equal(PEOPLE.tarek.roleEn, 'Founder / Creative Producer / Strategist and Culture and Design Engineer');
    assert.ok(!/\bCEO\b/i.test(PEOPLE.tarek.roleEn ?? ''));
    for (const key of ['shweekar', 'khaled', 'tarek'] as const) {
      const refs = NODES.filter((n) => n.personId === key && n.kind === 'person');
      assert.ok(refs.length >= 2, `${key} is referenced from About Us and the HQ people view`);
    }
    assert.equal(PEOPLE.khaled.portraitGap, true);
    assert.equal(PEOPLE.khaled.portraitAssetId, null);
    assert.equal(PEOPLE.shweekar.portraitAssetId, 'img-person-shweekar');
  });

  it('keeps 39 OS as a project distinct from Campaign OS', () => {
    const os39 = getNode('hq__proj__os39');
    assert.ok(os39);
    assert.equal(os39.envId, 'env_hq');
    assert.equal(os39.status, 'proposed');
    const campaign = nodesInEnvironment('env_campaign_os');
    assert.ok(campaign.every((n) => n.associationId.startsWith('cos__')));
    assert.ok(campaign.every((n) => n.status === 'unverified'), 'Campaign OS stages are not presented as executable');
    assert.equal(campaign.map((n) => n.nodeId).join(','), 'strategist,brain,director,producer,review');
  });

  it('lists all HQ projects named in the brief', () => {
    const ids = nodesInStation('env_hq', 'proj').map((n) => n.nodeId).sort();
    assert.deepEqual(ids, ['ahr', 'bat', 'bsocial', 'mhe', 'moa', 'os39', 'seven', 'yah']);
  });

  it('documents 8 NASA agents and labels 3 extensions as proposed, with no runtime connection', () => {
    assert.equal(NASA_ROSTER.length, 11);
    assert.equal(NASA_ROSTER.filter((a) => a.label === 'DOCUMENTED').length, 8);
    const proposed = NASA_ROSTER.filter((a) => a.label === 'PROPOSED').map((a) => a.name);
    assert.deepEqual(proposed, ['NASAQ', 'NABR', 'MADAR']);
    for (const agent of NASA_ROSTER) {
      assert.equal(agent.runtimeConnection, 'none');
      assert.equal(agent.taskState, 'unassigned');
      for (const env of ENVIRONMENT_IDS) {
        assert.deepEqual(agentActionsFor(agent, env), { talk: false, assign: false, run: false });
      }
    }
  });

  it('enables agent actions only for a verified, tested, scoped binding', () => {
    const base = NASA_ROSTER[0];
    const verified = { ...base, binding: { verified: true, scopes: ['env_hq' as const], lastPassedTestIso: '2026-11-04T00:00:00Z' } };
    assert.deepEqual(agentActionsFor(verified, 'env_hq'), { talk: true, assign: true, run: true });
    assert.deepEqual(agentActionsFor(verified, 'env_cde'), { talk: false, assign: false, run: false });
    const untested = { ...verified, binding: { ...verified.binding, lastPassedTestIso: null } };
    assert.deepEqual(agentActionsFor(untested, 'env_hq'), { talk: false, assign: false, run: false });
  });

  it('builds a card for every agent with the four contract states kept apart and no live claims', () => {
    for (const agent of NASA_ROSTER) {
      const view = agentCardView(agent, 'env_hq');
      assert.equal(view.label, agent.label);
      assert.equal(view.runtimeConnection.state, 'disconnected');
      assert.match(view.runtimeConnection.textEn, /Disconnected/);
      assert.equal(view.taskState.state, 'unassigned');
      assert.match(view.taskState.textEn, /Idle · unassigned/);
      assert.deepEqual(view.actions, { talk: false, assign: false, run: false });
      assert.equal(view.actionsDisabledReasonEn, AGENT_ACTION_DISABLED_REASON_EN);
      if (agent.label === 'DOCUMENTED') {
        assert.equal(view.documentedProfile.present, true);
        assert.equal(view.proposedRole.present, false);
      } else {
        assert.equal(view.documentedProfile.present, false);
        assert.match(view.documentedProfile.textEn, /Not documented/);
        assert.equal(view.proposedRole.present, true);
      }
      assert.notEqual(view.documentedProfile.textEn, view.proposedRole.textEn);
    }
  });

  it('shows a card as bound and actionable only for a verified, tested, scoped binding', () => {
    const base = NASA_ROSTER[0];
    const live = { ...base, runtimeConnection: 'bound' as const, binding: { verified: true, scopes: ['env_hq' as const], lastPassedTestIso: '2026-11-04T00:00:00Z' } };
    const view = agentCardView(live, 'env_hq');
    assert.equal(view.runtimeConnection.state, 'bound');
    assert.deepEqual(view.actions, { talk: true, assign: true, run: true });
    assert.equal(view.actionsDisabledReasonEn, null);
    const wrongEnv = agentCardView(live, 'env_cde');
    assert.deepEqual(wrongEnv.actions, { talk: false, assign: false, run: false });
    const claimedButUntested = agentCardView({ ...live, binding: { ...live.binding, lastPassedTestIso: null } }, 'env_hq');
    assert.equal(claimedButUntested.runtimeConnection.state, 'bound');
    assert.deepEqual(claimedButUntested.actions, { talk: false, assign: false, run: false });
  });

  it('routes agent names to their own card and the roster words to the whole roster', () => {
    assert.equal(matchKeywordTarget('talk to Samna')?.associationId, 'hq__nasa__samna');
    assert.equal(matchKeyword('show me Fakir')?.rosterOnly, false);
    assert.equal(matchKeyword('show me the NASA agents')?.rosterOnly, true);
    const one = planRegistryNavigation('show me Rasma');
    assert.equal(one?.nasaRoster?.highlightNodeId, 'rasma');
    assert.match(one?.captionEn ?? '', /no runtime connection/);
    const all = planRegistryNavigation('open the NASA agents');
    assert.equal(all?.nasaRoster?.highlightNodeId, null);
    assert.equal(planRegistryNavigation('show me El Batron')?.nasaRoster, undefined);
    const proposed = planRegistryNavigation('show me MADAR');
    assert.match(proposed?.captionEn ?? '', /PROPOSED/);
  });

  it('marks the task register as disconnected instead of inventing live data', () => {
    const tasks = getNode('hq__tasks__register');
    assert.equal(tasks?.status, 'disconnected');
    assert.ok(tasks?.honestStateEn);
  });

  it('maps every sphere to exactly one environment', () => {
    assert.equal(environmentForSphere('about-us').id, 'env_about');
    assert.equal(environmentForSphere('hq').id, 'env_hq');
    assert.equal(environmentForSphere('cde').id, 'env_cde');
    assert.equal(environmentForSphere('campaign-os').id, 'env_campaign_os');
  });

  it('routes typed keywords to nodes: "Show me El Batron" targets hq__proj__bat', () => {
    assert.equal(matchKeywordTarget('Show me El Batron')?.associationId, 'hq__proj__bat');
    assert.equal(matchKeywordTarget('open the laliga film')?.associationId, 'hq__media__laliga');
    assert.equal(matchKeywordTarget('who is Shweekar?')?.associationId, 'about__people__shweekar');
    assert.equal(matchKeywordTarget('what is the weather'), null);
  });
});

describe('journey media manifest', () => {
  it('has one record per approved source with the full contract', () => {
    assert.equal(JOURNEY_MEDIA_MANIFEST.length, 28);
    assert.equal(new Set(JOURNEY_MEDIA_MANIFEST.map((r) => r.assetId)).size, 28);
    assert.equal(new Set(JOURNEY_MEDIA_MANIFEST.map((r) => r.driveFileId)).size, 28);
    for (const r of JOURNEY_MEDIA_MANIFEST) {
      for (const key of ['assetId', 'owningNodeId', 'title', 'sourceUrl', 'runtimeUrl', 'mimeType', 'posterUrl', 'accessTier', 'rightsStatus', 'timecodes'] as const) {
        assert.ok(key in r, `${r.assetId} has ${key}`);
      }
      assert.ok(r.sourceUrl.includes(r.driveFileId));
      if (r.owningNodeId) assert.ok(getNode(r.owningNodeId), `${r.assetId} owner ${r.owningNodeId} exists in the registry`);
    }
  });

  it('keeps the four identically named Saudi clips distinct by id', () => {
    const clips = JOURNEY_MEDIA_MANIFEST.filter((r) => r.assetId.startsWith('med-saudi-clip-'));
    assert.equal(clips.length, 4);
    assert.equal(new Set(clips.map((c) => c.originalFilename)).size, 1);
    assert.equal(new Set(clips.map((c) => c.driveFileId)).size, 4);
  });

  it('claims no playback: remote files have no runtime URL and nothing is marked verified', () => {
    for (const r of JOURNEY_MEDIA_MANIFEST) {
      if (r.runtimeUrl === null) {
        assert.equal(r.playback, 'unresolved');
        assert.equal(r.accessTier, 'drive-restricted');
      } else {
        assert.ok(r.runtimeUrl.startsWith('/'), 'only same-origin copies count as a runtime URL');
        assert.equal(r.playback, 'local-file-present-unplayed');
      }
      assert.equal(r.rightsStatus, 'unreviewed');
      assert.deepEqual(r.timecodes, []);
    }
  });

  it('records the explicit gaps and does not attach an image to Khaled', () => {
    const gapNodes = MEDIA_GAPS.map((g) => g.nodeId);
    for (const id of ['about__people__khaled', 'hq__proj__yah', 'hq__proj__moa', 'hq__proj__bsocial', 'hq__proj__mhe', 'hq__proj__ahr']) {
      assert.ok(gapNodes.includes(id), `${id} is listed as a gap`);
      assert.equal(mediaForNode(id).length, 0, `${id} has no borrowed media`);
      assert.ok(getNode(id));
    }
  });

  it('does not attribute Tarek footage to the unconfirmed projects', () => {
    for (const r of JOURNEY_MEDIA_MANIFEST) {
      assert.ok(!/\b(yah|young|mission lotus|bsocial|mhe|ahr)\b/i.test(r.attribution), `${r.assetId} attribution`);
    }
  });
});

describe('25-beat journey', () => {
  it('has 25 beats, About Us first, and every J01-J25 id exactly once', () => {
    assert.equal(JOURNEY_BEATS.length, 25);
    const ids = JOURNEY_BEATS.map((b) => b.jId);
    const expected = Array.from({ length: 25 }, (_, i) => `J${String(i + 1).padStart(2, '0')}`);
    assert.deepEqual([...ids].sort(), expected);
    assert.equal(ids[0], 'J01');
    assert.deepEqual(ids.slice(1, 5), ['J17', 'J18', 'J16', 'J02']);
    const aboutFirst = ids.indexOf('J17') < ids.indexOf('J03');
    assert.ok(aboutFirst, 'About Us comes before CDE');
  });

  it('follows the specified order', () => {
    assert.deepEqual(
      JOURNEY_BEATS.map((b) => b.jId).join(' '),
      'J01 J17 J18 J16 J02 J03 J04 J05 J06 J07 J08 J09 J10 J11 J12 J13 J14 J15 J19 J20 J21 J22 J23 J24 J25'
    );
  });

  it('points every beat at a real node and real manifest assets', () => {
    for (const b of JOURNEY_BEATS) {
      if (b.nodeId) assert.ok(getNode(b.nodeId), `${b.jId} node ${b.nodeId}`);
      for (const a of b.assetIds) assert.ok(getMediaRecord(a), `${b.jId} asset ${a}`);
      if (b.evidence === 'gap' || b.evidence === 'concept' || b.evidence === 'example') {
        assert.ok(b.honestNoteEn, `${b.jId} explains the missing evidence`);
      }
    }
  });

  it('keeps About Us beats inside About Us and shows no media for the Khaled gap', () => {
    for (const id of ['J17', 'J18', 'J16', 'J02', 'J04']) {
      const b = JOURNEY_BEATS.find((x) => x.jId === id);
      assert.ok(b?.nodeId?.startsWith('about__'), `${id} stays in About Us`);
      assert.equal(b?.look, 'about-us');
    }
    const khaled = JOURNEY_BEATS.find((b) => b.jId === 'J18');
    assert.equal(khaled?.assetIds.length, 0);
    assert.equal(khaled?.evidence, 'gap');
  });

  it('never assigns YAH!-only gap beats a borrowed asset', () => {
    for (const id of ['J10', 'J11']) {
      assert.equal(JOURNEY_BEATS.find((b) => b.jId === id)?.assetIds.length, 0);
    }
  });

  it('has a continuous timeline and one camera stop per beat plus the opening and settle', () => {
    let t = 0;
    for (const b of JOURNEY_BEATS) {
      assert.equal(b.startSec, t);
      assert.ok(b.endSec > b.startSec);
      t = b.endSec;
    }
    assert.equal(t, JOURNEY_BASE_DURATION_SEC);
    const stops = buildJourneyStops();
    assert.equal(stops.length, 27);
    for (let i = 1; i < stops.length; i += 1) assert.ok(stops[i].atSec >= stops[i - 1].atSec);
    assert.equal(journeyBeatAt(0).beat.jId, 'J01');
    assert.equal(journeyBeatAt(JOURNEY_BASE_DURATION_SEC + 5).beat.jId, 'J25');
  });
});
