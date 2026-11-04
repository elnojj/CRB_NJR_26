import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');
const canvasSrc = read('./CosmographCanvas.tsx');
const dockCss = read('./cerebroChat.css');
const voiceCardSrc = read('./VoiceCard.tsx');
const indexCss = read('../index.css');

describe('visual guards: master canvas', () => {
  it('never paints a planar "MISSING MEDIA" container', () => {
    assert.ok(!/MISSING MEDIA/i.test(canvasSrc));
    assert.ok(!canvasSrc.includes('SHOW_MISSING_MEDIA_PLACEHOLDERS'));
    assert.ok(!canvasSrc.includes('setLineDash'));
  });

  it('shows a 3D gap badge per tube slot and keeps tiles hidden without media', () => {
    assert.ok(canvasSrc.includes('isMediaGapBadge'));
    assert.ok(canvasSrc.includes('mediaGapBadges[ti].visible = !hasMedia'));
  });

  it('galaxy dust is cut ~60% in density and opacity, depthWrite off, edge and plane faded', () => {
    assert.match(canvasSrc, /GALAXY_DUST_COUNT_GPU = 1280;/);
    assert.match(canvasSrc, /GALAXY_DUST_COUNT_SOFTWARE = 640;/);
    assert.match(canvasSrc, /GALAXY_DUST_ALPHA_SCALE = 0\.4;/);
    assert.match(canvasSrc, /SPIRAL_SHELL_COUNT = 170;/);
    assert.match(canvasSrc, /vEdgeFade/);
    assert.match(canvasSrc, /vBehindPlane/);
    const galaxy = canvasSrc.slice(canvasSrc.indexOf('function buildLiquidGlassGalaxySphere'));
    const mat = galaxy.slice(galaxy.indexOf('new THREE.ShaderMaterial'), galaxy.indexOf('new THREE.Points'));
    assert.match(mat, /depthWrite: false/);
  });
});

describe('visual guards: bottom dock safe area', () => {
  it('adds the safe-area inset to the dock gap instead of max()-ing with it', () => {
    assert.match(dockCss, /bottom: calc\(var\(--cerebro-dock-gap\) \+ env\(safe-area-inset-bottom, 0px\)\)/);
    assert.match(dockCss, /@media \(pointer: coarse\)/);
  });

  it('does not override the CSS bottom offset with an inline style', () => {
    const dockStyle = voiceCardSrc.slice(voiceCardSrc.indexOf('const dockStyle'), voiceCardSrc.indexOf('const callLabel'));
    assert.ok(!/bottom:/.test(dockStyle));
  });
});

describe('visual guards: phone layout (live iPhone inspection)', () => {
  it('chat replies wrap by whole words, not per-character flex items', () => {
    assert.ok(voiceCardSrc.includes('cerebro-chat__word'));
    const liquid = dockCss.slice(dockCss.indexOf('.cerebro-chat__liquid {'), dockCss.indexOf('.cerebro-chat__word'));
    assert.ok(!/display:\s*flex/.test(liquid));
    assert.match(dockCss, /\.cerebro-chat__word \{[^}]*white-space: nowrap/);
  });

  it('header lockup is left-aligned on phones so it cannot sit under the icon toggles', () => {
    assert.match(indexCss, /@media \(max-width: 520px\)[\s\S]*workspace-header[\s\S]*justify-content: flex-start/);
  });

  it('long project chips are clamped inside the phone viewport', () => {
    assert.ok(canvasSrc.includes('maxXFor(projected[i])'));
    assert.match(indexCss, /button\.cerebro-infograph-label \{\s*max-width: calc\(100vw - 16px\)/);
  });
});
