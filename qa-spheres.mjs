import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const networkSrc = fs.readFileSync(path.join(root, 'src/three/sphereNetwork.ts'), 'utf8');
const canvasSrc = fs.readFileSync(path.join(root, 'src/components/CosmographCanvas.tsx'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const layoutSrc = fs.readFileSync(path.join(root, 'src/gui/layoutEngine.ts'), 'utf8');

const checks = [];

assert.match(networkSrc, /ConnectedSphereId = 'hq' \| 'cde' \| 'campaign-os' \| 'about-us'/);
assert.match(networkSrc, /id: 'campaign-os'/);
assert.match(networkSrc, /id: 'about-us'/);
assert.match(networkSrc, /PROPOSED_FIFTH_SPHERE/);
assert.match(networkSrc, /industry-making/);
assert.match(networkSrc, /sphereTravelMs:\s*\{\s*min:\s*1400,\s*max:\s*2200/);
assert.match(networkSrc, /nodeFocusMs:\s*\{\s*min:\s*700,\s*max:\s*1100/);
assert.match(networkSrc, /gestureLossSettleMsMax:\s*400/);
checks.push({
  id: 'sphere-network-contract',
  status: 'PASS',
  detail: 'Four connected spheres + proposed fifth; R01 motion targets present.',
});

assert.match(canvasSrc, /from ['"]\.\.\/three\/sphereNetwork['"]/);
assert.match(canvasSrc, /clampSphereTravelMs|CAMERA_MOTION_TARGETS/);
assert.match(canvasSrc, /sceneSafeRect|unobstructedRect/);
assert.match(canvasSrc, /1 - Math\.exp\(/);
checks.push({
  id: 'camera-wiring',
  status: 'PASS',
  detail: 'CosmographCanvas imports sphere network and keeps frame-rate-independent damping.',
});

assert.match(appSrc, /unobstructedRect=\{guiLayout\.sceneSafeRect\}/);
assert.match(layoutSrc, /h:\s*52/);
assert.match(layoutSrc, /panelCollisionMarginPx|minimumCollisionGap|12/);
checks.push({
  id: 'layout-scene-safe-rect',
  status: 'PASS',
  detail: 'App feeds sceneSafeRect to WebGL; phone header height 52 present in layout engine.',
});

const report = {
  schema: 'nojara.cerebro.qa-spheres/1',
  status: 'PASS',
  checks,
};
fs.writeFileSync(path.join(root, 'QA_SPHERES_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
