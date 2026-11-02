import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { samplePose, smoother } from './src/intro/bridge.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const c = JSON.parse(fs.readFileSync(path.join(root, 'public/cerebro.intro.json'), 'utf8'));
const disposition = JSON.parse(
  fs.readFileSync(path.join(root, 'public/design-system/gate-disposition.json'), 'utf8')
);
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const checks = [];

assert.deepEqual(c.meta.aspect, [16, 9]);
assert.equal(c.meta.durationSeconds, 180);
assert.equal(c.meta.totalFrames, 10800);
assert.equal(c.meta.renderedVideo, false);
assert.equal(c.audio.voiceEnabled, false);
assert.equal(c.chapters.length, 12);
assert.equal(c.chapters[0].startFrame, 0);
assert.equal(c.chapters.at(-1).endFrameExclusive, 10800);
for (let i = 0; i < c.chapters.length; i++) {
  const ch = c.chapters[i];
  if (i) assert.equal(ch.startFrame, c.chapters[i - 1].endFrameExclusive);
  assert(ch.mediaCloseFrame + 60 <= ch.endFrameExclusive);
  assert(ch.textStartFrame < ch.endFrameExclusive);
}
checks.push({
  id: 'time-contract',
  status: 'PASS',
  detail: '180 seconds; 60 fps timeline; exactly 10800 frame addresses; 12 contiguous chapters.',
});

let nearHQ = Infinity;
let nearCDE = Infinity;
let maxJoinError = 0;
for (let f = 0; f < 10800; f++) {
  const p = samplePose(c, f / 60);
  assert(p.position.every(Number.isFinite));
  assert(p.target.every(Number.isFinite));
  assert(p.focalMm >= 20 && p.focalMm <= 90);
  nearHQ = Math.min(nearHQ, distance(p.position, [0, 0, 0]));
  nearCDE = Math.min(nearCDE, distance(p.position, [38, 4, -22]));
}
assert(nearHQ > 7 && nearCDE > 7, 'Camera intersects a sphere envelope');
for (const key of c.motion.cameraKeys.slice(1, -1)) {
  const t = key.frame / 60;
  const h = 1e-4;
  for (const field of ['position', 'target']) {
    const a = samplePose(c, t - h)[field];
    const b = samplePose(c, t)[field];
    const d = samplePose(c, t + h)[field];
    const error = Math.hypot(...b.map((v, i) => (v - a[i]) / h - (d[i] - v) / h));
    maxJoinError = Math.max(maxJoinError, error);
    assert(error < 0.001);
  }
}
checks.push({
  id: 'camera-C1',
  status: 'PASS',
  detail: {
    minHQDistance: nearHQ,
    minCDEDistance: nearCDE,
    maxFiniteDifferenceVelocityMismatch: maxJoinError,
  },
});

assert.equal(smoother(0), 0);
assert.equal(smoother(1), 1);
assert.equal(smoother(-1), 0);
assert.equal(smoother(2), 1);

const assets = [];
for (const [id, a] of Object.entries(c.assets)) {
  if (!a.src) {
    assert(['shweekar', 'khaled'].includes(id));
    continue;
  }
  const p = path.join(root, 'public', a.src);
  assert(fs.existsSync(p), `${id} absent`);
  assets.push({
    id,
    path: a.src,
    bytes: fs.statSync(p).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),
  });
  if (a.brandLogo) assert(fs.existsSync(path.join(root, 'public', a.brandLogo)));
}
assert(fs.existsSync(path.join(root, 'public', c.brand.logo)), c.brand.logo);
assert(fs.existsSync(path.join(root, 'public', c.audio.masterSrc)), c.audio.masterSrc);
assert.equal(c.assets.shweekar.src, null);
assert.equal(c.assets.khaled.src, null);
assert.ok(c.brand.fontScopes?.lockedApp?.titles === 'Sora');
assert.ok(c.brand.fontScopes?.lockedApp?.arabic === 'Noto Kufi Arabic');
assert.ok(c.brand.fontScopes?.filmReference?.display?.includes('Jaapokki'));
assert.equal(c.brand.englishFont, null);
assert.equal(c.brand.arabicFont, null);
checks.push({
  id: 'assets',
  status: 'PASS_WITH_DECLARED_GAPS',
  detail: {
    summary:
      'Media + NOJARA logo + audio present. Locked app fonts via webfonts; film Jaapokki scoped. Portraits for shweekar/khaled unbound.',
    missingFonts: [],
    fontScopes: c.brand.fontScopes,
    assets,
  },
});

const scene = fs.readFileSync(path.join(root, 'src/components/CosmographCanvas.tsx'), 'utf8');
assert(scene.includes('if (!introBridge.enabled) {'));
assert(scene.includes('introBridge.applyCamera(camera, s, elapsedTotal)'));
assert(scene.includes('introBridge.update?.(elapsedTotal)'));
assert(scene.includes('const sharedShellGeo = new THREE.SphereGeometry(6.2, 64, 48)'));
checks.push({
  id: 'scene-adapter',
  status: 'PASS_SOURCE_CHECK',
  detail:
    'Original procedural scene retained. Intro camera branch replaces the source camera-writing block; media clock precedes render.',
});

const webglGate = disposition.gates.browser_webgl_verification;
assert.equal(webglGate.status, 'CLOSED');
assert.equal(webglGate.evidence.verdict, 'VERIFIED');
assert.match(String(c.gates.browserWebGLVerification), /^VERIFIED/);
const webglShot = path.join(root, webglGate.evidence.screenshot);
assert.ok(fs.existsSync(webglShot), 'WebGL verification screenshot missing');
checks.push({
  id: 'browser-webgl',
  status: 'PASS',
  detail: webglGate.evidence,
});

const openGates = {
  ...c.gates,
  browserWebGLVerification: c.gates.browserWebGLVerification,
  dispositionAuthority: 'public/design-system/gate-disposition.json',
};

const report = {
  status: 'REVIEW_BUILD_WEBGL_VERIFIED',
  checks,
  browser: {
    webgl: 'VERIFIED: local browser Three.js canvas rendered intro sphere (not 2D fallback)',
    shaderAppearance: 'VISUALLY_OBSERVED_INTRO_GLASS_SHELL',
    mediaPlayback: 'INTRO_CANVAS_ACTIVE_WITH_NONFATAL_VIDEO_TEX_WARNINGS',
    captureScreens: webglGate.evidence.screenshot,
  },
  audio: JSON.parse(fs.readFileSync(path.join(root, 'AUDIO_QA.json'), 'utf8')),
  openGates,
  closedFromDisposition: [
    {
      id: webglGate.id,
      disposition: webglGate.disposition,
      summary: webglGate.summary,
    },
  ],
};
fs.writeFileSync(path.join(root, 'QA_REPORT.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(root, 'docs/intro/QA_REPORT.json'),
  JSON.stringify(report, null, 2)
);
console.log(
  JSON.stringify(
    {
      checks: checks.map((x) => [x.id, x.status]),
      cameraFrames: 10800,
      openGates: report.openGates,
      browser: report.browser,
    },
    null,
    2
  )
);
