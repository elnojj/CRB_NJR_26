import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { GLASS_EMISSIVE_FLOOR, isAppleMobileWebKit, shouldUseFlatGlass } from './glassFallback.ts';
import { createSharedOuterShellMaterial } from './sphereNetwork.ts';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('Apple mobile WebKit detection', () => {
  it('detects iPhone, iPad UA and iPadOS desktop-mode (MacIntel + touch)', () => {
    assert.equal(isAppleMobileWebKit({ userAgent: IPHONE_UA }), true);
    assert.equal(isAppleMobileWebKit({ userAgent: 'iPad; CPU OS 17' }), true);
    assert.equal(
      isAppleMobileWebKit({ userAgent: 'Macintosh Safari', platform: 'MacIntel', maxTouchPoints: 5 }),
      true
    );
  });

  it('does not flag desktop Macs, Windows or Android', () => {
    assert.equal(
      isAppleMobileWebKit({ userAgent: 'Macintosh Safari', platform: 'MacIntel', maxTouchPoints: 0 }),
      false
    );
    assert.equal(isAppleMobileWebKit({ userAgent: 'Windows NT 10.0; Chrome' }), false);
    assert.equal(isAppleMobileWebKit({ userAgent: 'Linux; Android 14; Pixel' }), false);
    assert.equal(isAppleMobileWebKit(undefined), false);
  });
});

describe('glass never resolves to pure black', () => {
  it('flat glass is used for software GL and Apple mobile only', () => {
    assert.equal(shouldUseFlatGlass({ softwareGl: false, appleMobile: false }), false);
    assert.equal(shouldUseFlatGlass({ softwareGl: true, appleMobile: false }), true);
    assert.equal(shouldUseFlatGlass({ softwareGl: false, appleMobile: true }), true);
  });

  it('every shell material carries a non-zero emissive floor', () => {
    for (const flat of [false, true]) {
      for (const face of ['front', 'back'] as const) {
        const mat = createSharedOuterShellMaterial({ softwareGl: flat, face });
        assert.ok(mat.emissiveIntensity > 0);
        assert.ok(mat.emissive.getHex() !== 0x000000);
        assert.equal(mat.emissive.getHex(), new THREE.Color(GLASS_EMISSIVE_FLOOR.color).getHex());
      }
    }
  });

  it('flat glass drops transmission so no render-target buffer is needed', () => {
    const flat = createSharedOuterShellMaterial({ softwareGl: true, face: 'front' });
    const full = createSharedOuterShellMaterial({ softwareGl: false, face: 'front' });
    assert.equal(flat.transmission, 0);
    assert.ok(full.transmission > 0);
    assert.ok(flat.emissiveIntensity > full.emissiveIntensity);
  });
});
