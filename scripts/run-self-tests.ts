import { runGuiLayoutSelfTests } from '../src/gui/gui-layout.test.ts';
import { runDeviceStreamCoordinatorSelfTests } from '../src/utils/deviceStreamCoordinator.test.ts';
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

  for (const [label, file] of [
    ['handInteraction', 'src/three/handInteraction.test.ts'],
    ['environmentRegistry', 'src/data/environmentRegistry.test.ts'],
    ['mediaTubeTiles', 'src/data/mediaTubeTiles.test.ts'],
    ['visualGuards', 'src/components/visualGuards.test.ts'],
    ['glassFallback', 'src/three/glassFallback.test.ts'],
  ] as const) {
    const run = await runNodeTestFile(file);
    const fail = run.output.match(/# fail (\d+)/)?.[1] || '0';
    const pass = run.output.match(/# pass (\d+)/)?.[1] || '0';
    console.log(`${label}: ${run.ok ? 'passed' : 'FAILED'} (node:test pass=${pass} fail=${fail})`);
    if (!run.ok) {
      console.log(run.output);
    }
  }

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

  if (gui.failed > 0 || streams.failed > 0 || !plan.ok || !mathOk || !regOk) {
    process.exit(1);
  }
  console.log('All self-tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
