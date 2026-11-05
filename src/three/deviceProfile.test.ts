import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdaptiveResolution } from './adaptiveResolution.ts';
import { resolveDeviceProfile, resolveDeviceTier, type DeviceFacts } from './deviceProfile.ts';

const IPAD_STAGE_WINDOW: DeviceFacts = {
  width: 890,
  height: 665,
  coarsePointer: true,
  appleMobileWebKit: true,
  devicePixelRatio: 2,
  softwareGl: false,
};

describe('deviceProfile', () => {
  it('classifies an iPad Stage Manager window as a tablet', () => {
    assert.equal(resolveDeviceTier(IPAD_STAGE_WINDOW), 'tablet');
  });

  it('classifies a phone by its short side', () => {
    assert.equal(resolveDeviceTier({ ...IPAD_STAGE_WINDOW, width: 390, height: 844 }), 'phone');
    assert.equal(resolveDeviceTier({ ...IPAD_STAGE_WINDOW, width: 844, height: 390 }), 'phone');
  });

  it('keeps a mouse-driven laptop on the desktop tier even in a narrow window', () => {
    assert.equal(
      resolveDeviceTier({ width: 700, height: 800, coarsePointer: false, appleMobileWebKit: false }),
      'desktop'
    );
  });

  it('caps tablet resolution below retina', () => {
    const p = resolveDeviceProfile(IPAD_STAGE_WINDOW);
    assert.ok(p.initialPixelRatio <= 1.75);
    assert.ok(p.maxVideoTextures <= 2);
    assert.equal(p.preserveDrawingBuffer, false);
  });

  it('gives phones a single video decoder and no MSAA', () => {
    const p = resolveDeviceProfile({ ...IPAD_STAGE_WINDOW, width: 390, height: 844, devicePixelRatio: 3 });
    assert.equal(p.maxVideoTextures, 1);
    assert.equal(p.msaaSamples, 0);
    assert.equal(p.initialPixelRatio, 1.5);
  });

  it('treats software GL as the cheapest path regardless of tier', () => {
    const p = resolveDeviceProfile({ ...IPAD_STAGE_WINDOW, softwareGl: true });
    assert.equal(p.pixelRatioCap, 1);
  });

  it('reduces the video budget on low-memory tablets', () => {
    const p = resolveDeviceProfile({ ...IPAD_STAGE_WINDOW, deviceMemoryGb: 2 });
    assert.equal(p.maxVideoTextures, 1);
  });
});

describe('AdaptiveResolution', () => {
  const make = () => new AdaptiveResolution({ cap: 2, floor: 1.25, initial: 1.75, budgetMs: 22, cooldownMs: 1000 });

  it('steps down when frames stay over budget', () => {
    const gov = make();
    let changed: number | null = null;
    for (let i = 0; i < 120 && changed === null; i += 1) changed = gov.sample(40, 2000 + i * 40);
    assert.equal(changed, 1.5);
  });

  it('never goes below the floor', () => {
    const gov = make();
    for (let i = 0; i < 2000; i += 1) gov.sample(60, i * 60);
    assert.equal(gov.pixelRatio, 1.25);
  });

  it('recovers slowly when there is headroom and stops at the cap', () => {
    const gov = make();
    for (let i = 0; i < 200; i += 1) gov.sample(60, i * 60);
    const low = gov.pixelRatio;
    for (let i = 0; i < 4000; i += 1) gov.sample(8, 20000 + i * 8);
    assert.ok(gov.pixelRatio > low);
    assert.equal(gov.pixelRatio, 2);
  });

  it('ignores a single long task', () => {
    const gov = new AdaptiveResolution({ cap: 2, floor: 1.25, initial: 2, budgetMs: 22, cooldownMs: 1000 });
    for (let i = 0; i < 60; i += 1) gov.sample(16, 2000 + i * 16);
    assert.equal(gov.sample(5000, 4000), null);
    assert.equal(gov.pixelRatio, 2);
  });

  it('climbs back to the cap on a 60 Hz display after a startup hitch', () => {
    const gov = make();
    for (let i = 0; i < 6; i += 1) gov.sample(50, 2000 + i * 50);
    for (let i = 0; i < 40; i += 1) gov.sample(60, 3000 + i * 60);
    assert.ok(gov.pixelRatio < 1.75);
    let t = 10000;
    for (let i = 0; i < 6000; i += 1) {
      gov.sample(16.7, t);
      t += 16.7;
    }
    assert.equal(gov.pixelRatio, 2);
  });

  it('holds steady at the cap when frames sit on the refresh interval', () => {
    const gov = make();
    let t = 2000;
    for (let i = 0; i < 3000; i += 1) {
      gov.sample(16.7, t);
      t += 16.7;
    }
    assert.equal(gov.pixelRatio, 2);
  });

  it('respects the cool-down between changes', () => {
    const gov = make();
    const changes: number[] = [];
    for (let i = 0; i < 100; i += 1) {
      const next = gov.sample(60, 2000 + i * 5);
      if (next !== null) changes.push(next);
    }
    assert.ok(changes.length <= 1);
  });
});
