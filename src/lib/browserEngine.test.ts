import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isWebKitEngine } from './browserEngine.ts';

const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_CHROME =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';

describe('WebKit engine detection', () => {
  it('flags desktop Safari and every iOS/iPadOS browser', () => {
    assert.equal(isWebKitEngine({ userAgent: IPAD_SAFARI }), true);
    assert.equal(isWebKitEngine({ userAgent: IPAD_CHROME }), true);
    assert.equal(isWebKitEngine({ userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 0 }), true);
    assert.equal(isWebKitEngine({ userAgent: MAC_CHROME, platform: 'MacIntel', maxTouchPoints: 5 }), true);
  });

  it('leaves Chromium and Gecko on real glass', () => {
    assert.equal(isWebKitEngine({ userAgent: MAC_CHROME, platform: 'MacIntel', maxTouchPoints: 0 }), false);
    assert.equal(isWebKitEngine({ userAgent: ANDROID_CHROME }), false);
    assert.equal(isWebKitEngine({ userAgent: FIREFOX }), false);
  });
});
