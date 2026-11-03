import { runGuiLayoutSelfTests } from '../src/gui/gui-layout.test.ts';
import { runDeviceStreamCoordinatorSelfTests } from '../src/utils/deviceStreamCoordinator.test.ts';
import { assertIntroBridgeClean } from '../src/intro/bridge.ts';

async function main(): Promise<void> {
  assertIntroBridgeClean();
  console.log('intro/bridge: clean (zero media wraps)');

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

  if (gui.failed > 0 || streams.failed > 0) {
    process.exit(1);
  }
  console.log('All self-tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
