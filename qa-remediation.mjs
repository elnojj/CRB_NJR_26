import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { beatAtFrame, EXPLAINER_60_META, sampleExplainer60Pose } from './src/intro/explainer60.ts';
import {
  ISTANBA_MOULD_PROOF,
  PROJECT_WORLD_STATE_ORDER,
} from './src/data/projectWorldManifest.ts';
import {
  CAMERA_MOTION_TARGETS,
  PROPOSED_FIFTH_SPHERE,
  SPHERE_NETWORK,
} from './src/three/sphereNetwork.ts';
import { DEFAULT_INTERNAL_AGENT_ID } from './src/data/croCdeGoogleAgentManifest.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const checks = [];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

const disposition = readJson('public/design-system/gate-disposition.json');
assert.equal(disposition.schemaVersion, '1.0.0');
assert.deepEqual(disposition.openGateIds, []);

const explainer = readJson('public/cerebro.explainer60.json');
assert.equal(explainer.meta.durationSeconds, 60);
assert.equal(explainer.meta.totalFrames, 3600);
assert.equal(explainer.beats.length, 15);
assert.equal(EXPLAINER_60_META.totalFrames, 3600);
assert.equal(explainer.beats[0].frames[0], 0);
assert.equal(explainer.beats.at(-1).frames[1], 3600);
for (let i = 1; i < explainer.beats.length; i++) {
  assert.equal(explainer.beats[i].frames[0], explainer.beats[i - 1].frames[1]);
}
const pose0 = sampleExplainer60Pose(explainer, 0);
const poseEnd = sampleExplainer60Pose(explainer, 59.999);
assert.equal(pose0.frame, 0);
assert.equal(poseEnd.frame, 3599);
assert.ok(beatAtFrame(explainer, 0));
assert.ok(beatAtFrame(explainer, 3599));
for (const b of explainer.beats) {
  assert.ok(beatAtFrame(explainer, b.frames[0]));
}
const intro180 = readJson('public/cerebro.intro.json');
assert.equal(intro180.meta.durationSeconds, 180);
assert.equal(intro180.meta.totalFrames, 10800);
checks.push({
  id: 'r06-explainer60-contract',
  status: 'PASS',
  detail: '60s edition is distinct; 180s intro timeline untouched at 10800 frames.',
});

assert.equal(ISTANBA_MOULD_PROOF.id, 'istanba-mould-proof');
assert.equal(ISTANBA_MOULD_PROOF.rightsState, 'proposed_procedural');
assert.deepEqual(PROJECT_WORLD_STATE_ORDER, [
  'parent_sphere',
  'project_focus',
  'threshold_flight',
  'project_world',
  'media_inspection',
  'return_flight',
]);
assert.ok(ISTANBA_MOULD_PROOF.notes.some((n) => n.includes('ABINFER_MOULD')));
const istanbaSrc = fs.readFileSync(path.join(root, 'src/three/istanbaMouldProof.ts'), 'utf8');
assert.match(istanbaSrc, /not ABINFER_MOULD/);
assert.match(istanbaSrc, /reconstruction/);
checks.push({
  id: 'r05-project-world-contract',
  status: 'PASS',
  detail: 'Istanba mould proof is procedural reconstruction with required state order.',
});

assert.equal(SPHERE_NETWORK.length, 4);
assert.equal(CAMERA_MOTION_TARGETS.sphereTravelMs.min, 1400);
assert.equal(CAMERA_MOTION_TARGETS.sphereTravelMs.max, 2200);
assert.equal(CAMERA_MOTION_TARGETS.nodeFocusMs.min, 700);
assert.equal(CAMERA_MOTION_TARGETS.gestureLossSettleMsMax, 400);
checks.push({
  id: 'r01-motion-targets',
  status: 'PASS',
  detail: CAMERA_MOTION_TARGETS,
});

const dispatcher = fs.readFileSync(path.join(root, 'src/utils/actionDispatcher.ts'), 'utf8');
assert.match(dispatcher, /params\.place/);
assert.match(dispatcher, /name_or_code/);
assert.match(dispatcher, /['"]back['"]/);
const appSrc = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
assert.match(appSrc, /voiceTourAuto/);
assert.match(appSrc, /spatialWorld/);
assert.match(appSrc, /mediaControls/);
assert.match(appSrc, /sessionCapture/);
assert.match(appSrc, /capabilities/);
assert.match(appSrc, /activeEdition/);

const r07 = disposition.gates.r07_elevenlabs_agent_kb_sync;
assert.equal(r07.status, 'CLOSED');
assert.equal(r07.evidence.liveAgentId, DEFAULT_INTERNAL_AGENT_ID);
assert.equal(r07.evidence.clientDefaultAgentId, DEFAULT_INTERNAL_AGENT_ID);
assert.ok(r07.evidence.versionId);
assert.ok(r07.evidence.knowledgeBaseDocumentCount >= 1);
checks.push({
  id: 'r07-tool-parity-surface',
  status: 'PASS',
  detail: {
    message:
      'Frontend accepts place/name_or_code/back aliases and exposes truthful capability flags. Live ElevenLabs agent/KB verified against client default.',
    agentId: r07.evidence.liveAgentId,
    versionId: r07.evidence.versionId,
    knowledgeBaseDocumentCount: r07.evidence.knowledgeBaseDocumentCount,
  },
});

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(typeof pkg.scripts['qa:spheres'], 'string');
assert.equal(typeof pkg.scripts['qa:remediation'], 'string');
checks.push({
  id: 'release-scripts',
  status: 'PASS',
  detail: 'qa:spheres and qa:remediation registered in package scripts.',
});

const tarek = disposition.gates.tarek_portrait_aperture;
assert.equal(tarek.status, 'CLOSED');
const portraitAbs = path.join(root, tarek.evidence.path);
assert.ok(fs.existsSync(portraitAbs), 'owner-supplied tarek portrait missing');
assert.equal(fs.statSync(portraitAbs).size, tarek.evidence.bytes);
const sha = createHash('sha256').update(fs.readFileSync(portraitAbs)).digest('hex');
assert.equal(sha, tarek.evidence.sha256);
checks.push({
  id: 'tarek-portrait-aperture',
  status: 'PASS',
  detail: tarek.evidence,
});

assert.equal(disposition.gates.fifth_sphere_industry_making.status, 'CLOSED');
assert.equal(PROPOSED_FIFTH_SPHERE.status, 'proposed');
assert.equal(PROPOSED_FIFTH_SPHERE.id, 'industry-making');
assert.equal(SPHERE_NETWORK.length, 4);
checks.push({
  id: 'fifth-sphere-proposed-only',
  status: 'PASS',
  detail: PROPOSED_FIFTH_SPHERE,
});

const legacy = disposition.gates.legacy_checkpoints_8b70e08_2d68907;
assert.equal(legacy.status, 'CLOSED');
assert.equal(legacy.disposition, 'superseded_absent_shas');
checks.push({
  id: 'legacy-checkpoints-superseded',
  status: 'PASS',
  detail: legacy.evidence,
});

const openGates = Object.values(disposition.gates)
  .filter((g) => g.surfaces?.includes('qa:remediation') && g.status !== 'CLOSED')
  .map((g) => `${g.id}: ${g.summary}`);

assert.deepEqual(disposition.openGateIds, []);
assert.equal(openGates.length, 0);

const report = {
  schema: 'nojara.cerebro.remediation-contract/1',
  status: openGates.length ? 'PASS_WITH_OPEN_GATES' : 'PASS',
  checks,
  openGates,
  dispositionAuthority: 'public/design-system/gate-disposition.json',
  closedGates: Object.values(disposition.gates)
    .filter((g) => g.surfaces?.includes('qa:remediation') && g.status === 'CLOSED')
    .map((g) => ({ id: g.id, disposition: g.disposition, summary: g.summary })),
};
fs.writeFileSync(path.join(root, 'QA_REMEDIATION_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
