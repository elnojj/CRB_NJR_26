import { runGuiLayoutSelfTests } from '../src/gui/gui-layout.test.ts';
import { runDeviceStreamCoordinatorSelfTests } from '../src/services/media/deviceStreamCoordinator.test.ts';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function runNodeTestFile(relPath: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const file = path.resolve(here, '..', relPath);
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', '--test', file],
      { cwd: path.resolve(here, '..'), env: process.env }
    );
    let output = '';
    child.stdout.on('data', (d) => {
      output += String(d);
    });
    child.stderr.on('data', (d) => {
      output += String(d);
    });
    child.on('close', (code) => {
      resolve({ ok: code === 0, output });
    });
  });
}

async function main(): Promise<void> {
  const gui = runGuiLayoutSelfTests();
  console.log(`gui-layout: ${gui.passed}/${gui.total} passed`);
  for (const r of gui.results.filter((x) => !x.passed)) {
    console.log(`  FAIL ${r.name} [${r.viewport}] ${r.detail}`);
  }

  const streams = await runDeviceStreamCoordinatorSelfTests();
  console.log(`deviceStreamCoordinator: ${streams.passed}/${streams.total} passed`);
  for (const line of streams.details.filter((d) => d.startsWith('FAIL'))) {
    console.log(`  ${line}`);
  }

  const plan = await runNodeTestFile('src/data/projectPlanModel.test.ts');
  const planPass = (plan.output.match(/# pass (\d+)/)?.[1] || plan.output.match(/✔/g)?.length || 0) as
    | string
    | number;
  const planFail = plan.output.match(/# fail (\d+)/)?.[1] || '0';
  console.log(
    `projectPlanModel: ${plan.ok ? 'passed' : 'FAILED'} (node:test pass≈${planPass} fail=${planFail})`
  );
  if (!plan.ok) {
    console.log(plan.output);
  }

  let nodeTestFailures = 0;
  for (const [label, file] of [
    ['handInteraction', 'src/three/handInteraction.test.ts'],
    ['environmentRegistry', 'src/data/environmentRegistry.test.ts'],
    ['mediaTubeTiles', 'src/data/mediaTubeTiles.test.ts'],
    ['nodeContent', 'src/data/nodeContent.test.ts'],
    ['hqNodeWiring', 'src/data/hqNodeWiring.test.ts'],
    ['visualGuards', 'src/components/visualGuards.test.ts'],
    ['workspaceRepair', 'src/components/workspaceRepair.test.ts'],
    ['microphoneRecovery', 'src/services/media/microphoneRecovery.test.ts'],
    ['hudBridge', 'src/three/hudBridge.test.ts'],
    ['overlayOwnership', 'src/components/overlayOwnership.test.ts'],
    ['framePresentation', 'src/three/framePresentation.test.ts'],
    ['rememberedAccessAndChat', 'src/services/chat/chat.test.ts'],
    ['glassFallback', 'src/three/glassFallback.test.ts'],
    ['hudLayout', 'src/three/hudLayout.test.ts'],
    ['browserEngine', 'src/lib/browserEngine.test.ts'],
    ['deviceProfile', 'src/three/deviceProfile.test.ts'],
    ['mediaPlayback', 'src/three/mediaPlayback.test.ts'],
    ['mediaTubeLayer', 'src/three/mediaTubeLayer.test.ts'],
    ['nodeTokens', 'src/three/nodeTokens.test.ts'],
    ['sphere1Beats', 'src/three/beats/beats.test.ts'],
    ['pitchBeats', 'src/three/beats/pitchBeats.test.ts'],
    ['motionPreference', 'src/utils/motionPreference.test.ts'],
    ['keyboardInset', 'src/gui/keyboardInset.test.ts'],
    ['orbitalSolver', 'src/three/camera/orbitalSolver.test.ts'],
    ['cameraInput', 'src/three/camera/cameraInput.test.ts'],
    ['zLayers', 'src/gui/zLayers.test.ts'],
    ['postFx', 'src/three/postFx.test.ts'],
    ['systemContract', 'src/design/systemContract.test.ts'],
    ['surfaceHost', 'src/gui/surfaceHost.test.ts'],
    ['mediaProvenance', 'src/data/mediaProvenance.test.ts'],
  ] as const) {
    const run = await runNodeTestFile(file);
    const fail = run.output.match(/# fail (\d+)/)?.[1] || '0';
    const pass = run.output.match(/# pass (\d+)/)?.[1] || '0';
    console.log(`${label}: ${run.ok ? 'passed' : 'FAILED'} (node:test pass=${pass} fail=${fail})`);
    if (!run.ok) {
      nodeTestFailures += 1;
      console.log(run.output);
    }
  }

  const voice = await runNodeTestFile('src/services/openai-realtime/__tests__/client.test.ts');
  const voiceServer = await runNodeTestFile('src/services/openai-realtime/__tests__/server.test.ts');
  const voiceIntegration = await runNodeTestFile('src/services/openai-realtime/__tests__/integration.test.ts');
  console.log(`openai-realtime-voice: ${voice.ok ? 'passed' : 'FAILED'}`);
  console.log(`openai-realtime-server: ${voiceServer.ok ? 'passed' : 'FAILED'}`);
  console.log(`openai-realtime-integration: ${voiceIntegration.ok ? 'passed' : 'FAILED'}`);
  if (!voice.ok) console.log(voice.output);
  if (!voiceServer.ok) console.log(voiceServer.output);
  if (!voiceIntegration.ok) console.log(voiceIntegration.output);

  // Lightweight camera / spatial math checks (Three.js-free)
  const { masterPose, flightMs, buildClosedOrbitalLoopPoints } = await import(
    '../src/three/camera/CameraDirector.ts'
  );
  const pose = masterPose(16 / 9);
  const loop = buildClosedOrbitalLoopPoints(12, 12, 48);
  const ms = flightMs(10);
  const mathOk =
    pose.fov === 46 &&
    loop.points.length >= 48 &&
    loop.curve.closed === true &&
    ms >= 400 &&
    ms <= 3000;
  console.log(
    `spatialNavigation-math: ${mathOk ? '1/1 passed' : '0/1 FAILED'} (points=${loop.points.length}, fov=${pose.fov}, ms=${ms})`
  );

  const reg = await import('../src/three/geometryRegistry.ts');
  const THREE = await import('three');
  const regFails: string[] = [];
  for (const key of reg.PRIMITIVE_SHAPE_KEYS) {
    const g = reg.getShellGeometry(key);
    const r = g?.boundingSphere?.radius ?? (g?.computeBoundingSphere(), g?.boundingSphere?.radius);
    if (!g || !r || Math.abs(r - reg.BASE_SHELL_RADIUS) > 0.05) regFails.push(`${key} radius=${r}`);
    if (reg.getShellGeometry(key) !== g) regFails.push(`${key} not cached`);
  }
  if (reg.getShellGeometry('teddyBear') !== null) regFails.push('unloaded custom key should be null');
  const seeded = new THREE.SphereGeometry(6.2, 8, 6);
  reg.disposeShellGeometryCache();
  reg.seedShellGeometry('sphere', seeded);
  if (reg.getShellGeometry('sphere') !== seeded) regFails.push('seed not honoured');
  reg.disposeShellGeometryCache([seeded]);
  const regOk = regFails.length === 0;
  console.log(
    `geometryRegistry: ${regOk ? `${reg.PRIMITIVE_SHAPE_KEYS.length + 2} checks passed` : 'FAILED'}`
  );
  for (const f of regFails) console.log(`  FAIL ${f}`);

  if (
    nodeTestFailures > 0 ||
    gui.failed > 0 ||
    streams.failed > 0 ||
    !plan.ok ||
    !voice.ok ||
    !voiceServer.ok ||
    !voiceIntegration.ok ||
    !mathOk ||
    !regOk
  ) {
    process.exit(1);
  }
  console.log('All self-tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
