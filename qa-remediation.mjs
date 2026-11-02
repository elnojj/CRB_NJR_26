import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { beatAtFrame, EXPLAINER_60_META, sampleExplainer60Pose } from './src/intro/explainer60.ts';
import {
  ISTANBA_MOULD_PROOF,
  PROJECT_WORLD_STATE_ORDER,
} from './src/data/projectWorldManifest.ts';
import { CAMERA_MOTION_TARGETS, SPHERE_NETWORK } from './src/three/sphereNetwork.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const checks = [];

const explainer = JSON.parse(
  fs.readFileSync(path.join(root, 'public/cerebro.explainer60.json'), 'utf8')
);
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
const intro180 = JSON.parse(fs.readFileSync(path.join(root, 'public/cerebro.intro.json'), 'utf8'));
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
checks.push({
  id: 'r07-tool-parity-surface',
  status: 'PASS',
  detail:
    'Frontend accepts place/name_or_code/back aliases and exposes truthful capability flags. Live ElevenLabs agent sync remains an unresolved gate.',
});

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(typeof pkg.scripts['qa:spheres'], 'string');
assert.equal(typeof pkg.scripts['qa:remediation'], 'string');
checks.push({
  id: 'release-scripts',
  status: 'PASS',
  detail: 'qa:spheres and qa:remediation registered in package scripts.',
});

const report = {
  schema: 'nojara.cerebro.remediation-contract/1',
  status: 'PASS_WITH_OPEN_GATES',
  checks,
  openGates: [
    'R07 live ElevenLabs agent version + KB sync not verified against deployed client in this run',
    'tarek_portrait_aperture blocked pending approved source/rights',
    'fifth_sphere Industry & Making proposed only',
    'checkpoints 8b70e08 / 2d68907 absent from this checkout and remotes',
  ],
};
fs.writeFileSync(path.join(root, 'QA_REMEDIATION_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
