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

  it('shows a generated token per empty tube slot and keeps tiles hidden without media', () => {
    const layerSrc = read('../three/mediaTubeLayer.ts');
    assert.ok(layerSrc.includes('isMediaTokenSlot'));
    assert.ok(layerSrc.includes('slot.tile.visible = hasMedia'));
    assert.ok(layerSrc.includes('slot.token.visible = !hasMedia'));
    assert.ok(canvasSrc.includes('new MediaTubeLayer('));
  });

  it('has no galaxy dust, spiral shell particles or backdrop nebula blooms', () => {
    assert.ok(!canvasSrc.includes('buildLiquidGlassGalaxySphere'));
    assert.ok(!canvasSrc.includes('GALAXY_DUST'));
    assert.ok(!canvasSrc.includes('spiralPoints'));
    assert.ok(!canvasSrc.includes('Cool ice bloom'));
    assert.ok(!canvasSrc.includes('Soft gold dust'));
    assert.ok(!canvasSrc.includes('iceRim'));
  });

  it('has no gray wireframe orbit rings or interior dome grid', () => {
    assert.ok(!canvasSrc.includes('iceWireMat'));
    assert.ok(!canvasSrc.includes('domeGrid'));
    assert.ok(!canvasSrc.includes('isCageTorus'));
    assert.ok(!canvasSrc.includes('goldRimMat'));
  });

  it('has no bronze cage ribs slicing across the shells', () => {
    assert.ok(!canvasSrc.includes('orbitalCageRibSpecs'));
    assert.ok(!canvasSrc.includes('orbitalRingsGroup'));
    assert.ok(!canvasSrc.includes('bronzeCageRing'));
    assert.ok(!canvasSrc.includes('sharedOuterRibTorusGeo'));
  });

  it('keeps a sparse additive background starfield that never writes depth', () => {
    const starSrc = read('../three/backgroundStarfield.ts');
    assert.ok(canvasSrc.includes('createBackgroundStarfield()'));
    assert.ok(canvasSrc.includes('starfield.update('));
    assert.match(starSrc, /STARFIELD_ALPHA = 0\.18/);
    assert.match(starSrc, /depthWrite: false/);
    assert.match(starSrc, /AdditiveBlending/);
    assert.match(starSrc, /fog: false/);
  });

  it('uses the flat #050505 void backdrop and a cyan Fresnel rim on the glass', () => {
    assert.ok(canvasSrc.includes('scene.background = new THREE.Color(SCENE_VOID_HEX)'));
    assert.ok(!canvasSrc.includes("'#1b2556'"));
    assert.ok(canvasSrc.includes('new THREE.Color(0x7FE9FF)'));
    assert.ok(!canvasSrc.includes('isAppleMobileWebKit'));
  });

  it('camera flights are not gated by the OS Reduce Motion setting', () => {
    const exp = read('../three/ExperienceCanvas.tsx');
    assert.ok(!exp.includes('useReducedMotion'));
    assert.ok(exp.includes('effectiveReducedMotion = reducedMotion'));
  });

  it('node halos are selection-only and in-sphere links render only when active', () => {
    assert.ok(canvasSrc.includes('entry.haloMesh.visible = isHigh'));
    assert.ok(canvasSrc.includes('haloMesh.visible = false'));
    assert.ok(canvasSrc.includes('const linkIsLive'));
    assert.ok(canvasSrc.includes('spokeLive ? baseDim + 0.35 : 0'));
    assert.match(canvasSrc, /spoke\.mesh\.visible = false/);
    assert.match(canvasSrc, /intra: false/);
  });
});

describe('visual guards: bottom dock safe area', () => {
  it('adds the safe-area inset to the dock gap instead of max()-ing with it', () => {
    assert.match(dockCss, /bottom: calc\(\s*var\(--cerebro-dock-gap\) \+ var\(--cerebro-kb-inset, 0px\) \+\s*env\(safe-area-inset-bottom, 0px\) \* var\(--cerebro-safe-scale, 1\)\s*\);/);
    assert.match(dockCss, /@media \(pointer: coarse\)/);
  });

  it('does not override the CSS bottom offset with an inline style', () => {
    const dockStyle = voiceCardSrc.slice(voiceCardSrc.indexOf('const dockStyle'), voiceCardSrc.indexOf('const callLabel'));
    assert.ok(!/bottom:/.test(dockStyle));
  });
});

describe('visual guards: toolbar dropdown', () => {
  it('stations dropdown is anchored under the toolbar, not flowing inside the icon strip', () => {
    const css = read('./chrome/floatingIconToggles.css');
    assert.match(css, /\.floating-icon-toggles \{\s*position: relative/);
    assert.match(css, /\.floating-icon-more-menu \{\s*position: absolute;\s*top: calc\(100% \+ 10px\);\s*right: 0/);
    assert.match(css, /\.fim-item \{/);
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

  it('node labels are WebGL billboards, with no projected DOM label buttons or node content card', () => {
    assert.ok(!canvasSrc.includes('cerebro-focus-label'));
    assert.ok(!canvasSrc.includes('labels2D'));
    assert.ok(canvasSrc.includes('const needsAttention'));
    assert.ok(!read('./NodeBrowser.tsx').includes('NodeContentCard'));
    assert.ok(!indexCss.includes('cerebro-infograph-label'));
  });
});

describe('visual guards: chat on iOS', () => {
  const voiceSrc = read('./VoiceCard.tsx');

  it('overlay is click-through and only the chat card takes pointer events', () => {
    assert.match(dockCss, /\.cerebro-dock \{[^}]*pointer-events: none;/s);
    assert.match(dockCss, /\.cerebro-dock > \* \{\s*pointer-events: auto;/);
  });

  it('inputs stay editable under the global user-select: none and touch-action: none', () => {
    assert.match(dockCss, /\.cerebro-chat textarea \{[^}]*user-select: text;/s);
    assert.match(dockCss, /touch-action: manipulation;/);
    assert.match(indexCss, /body \{\s*position: fixed;/);
  });

  it('keyboard lifts the dock via CSS vars and never resizes the canvas', () => {
    assert.ok(dockCss.includes('--cerebro-kb-inset'));
    assert.ok(voiceSrc.includes('useKeyboardInsetVars(chatOpen)'));
    assert.ok(canvasSrc.includes('isEditableTarget(document.activeElement) && w === lastCanvasW'));
    assert.ok(!canvasSrc.includes("visualViewport?.addEventListener('resize', onResize)"));
  });

  it('send routes through the __user_chat__ dispatcher and Enter submits', () => {
    assert.ok(voiceSrc.includes('onSimulateCommand(`__user_chat__:'));
    assert.ok(voiceSrc.includes("e.key === 'Enter' && !e.shiftKey"));
    assert.ok(voiceSrc.includes('type="submit"'));
  });
});

describe('visual guards: journey caption', () => {
  it('draws no visible caption card, keeps the sentence for assistive tech and one Stop control', () => {
    const src = read('./JourneyCaption.tsx');
    assert.ok(src.includes('className="sr-only"'));
    assert.ok(src.includes('aria-live="polite"'));
    assert.ok(src.includes('data-testid="journey-skip"'));
    assert.ok(!src.includes('useDockClearance'));
    assert.ok(!src.includes('journey-honest-note'));
  });

  it('hides app chrome while the explainer plays and Escape stops it before other handlers', () => {
    const app = read('../App.tsx');
    assert.ok(app.includes('const isCinematicMode = journeyActive'));
    assert.ok(app.includes("display: isCinematicMode ? 'none' : 'contents'"));
    assert.ok(app.includes("window.addEventListener('keydown', stopOnEscape, true)"));
    assert.ok(app.includes('cinematic={isCinematicMode}'));
  });
});

describe('visual guards: media tiles show only the media', () => {
  it('tile textures draw no kind badge, title, subtitle or file name, and contain-fit the poster', () => {
    const layerSrc = read('../three/mediaTubeLayer.ts');
    const a = layerSrc.indexOf('private buildPosterTexture');
    const b = layerSrc.indexOf('private ', a + 10) < 0 ? layerSrc.length : layerSrc.indexOf('private ', a + 10);
    const tileSrc = layerSrc.slice(a, b);
    assert.ok(!tileSrc.includes('fillText'));
    assert.ok(!tileSrc.includes('tile.title'));
    assert.ok(!tileSrc.includes('tile.subtitle'));
    assert.ok(tileSrc.includes('Math.min(TILE_TEX_W / iw, TILE_TEX_H / ih)'));
  });

  it('keeps the FPS / draw-call strip behind ?telemetry', () => {
    const status = read('./SystemStatusLayer.tsx');
    assert.ok(status.includes(".has('telemetry')"));
  });
});

describe('visual guards: brand lockup', () => {
  it('is 1.5x larger and sits 36px below the top edge', () => {
    assert.match(indexCss, /clamp\(2\.25rem, 3\.6vw, 3rem\)/);
    assert.match(indexCss, /header\[data-testid='workspace-header'\] \{\s*padding-top: calc\(36px/);
  });

  it('nodes are wired to media: project nodes open their tube in front of the tile', () => {
    const app = read('../App.tsx');
    assert.match(app, /firstMediaTileIndex\(proj\.id\)/);
    assert.match(app, /anglePreset: 'tube_front'/);
    const canvas = read('./CosmographCanvas.tsx');
    assert.match(canvas, /case 'tube_front':/);
    assert.ok(!/tileMesh\.rotateY\(Math\.PI\)/.test(canvas), 'tiles must face the tube axis');
  });

  it('node labels never balloon into full-screen cards', () => {
    const src = read('../three/spatialLabelBillboards.ts');
    assert.match(src, /LABEL_VIEW_SHARE/);
    assert.match(src, /depthTest: false/);
  });

  it('every node is visible, pickable and describes its contents', () => {
    const app = read('../App.tsx');
    assert.match(app, /<NodeBrowser/);
    assert.match(app, /resolveNodeContent\(id, nodeType, sphere\)/);
    assert.ok(!/hide cold project chips/.test(canvasSrc), 'cold chips must not be hidden');
    assert.match(canvasSrc, /contentLine: contentChip\(/);
    assert.match(read('./VoiceCard.tsx'), /data-testid="cerebro-btn-nodes"/);
  });
});
