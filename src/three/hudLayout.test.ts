import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { HudMenuSectionSpec } from './hudBridge.ts';
import { resolveHudGlassMode } from './hudGlass.ts';
import {
  DOCK_METRICS,
  MENU_METRICS,
  clampScroll,
  dockWidth,
  isRowVisible,
  layoutMenuContent,
  menuViewportHeight,
} from './hudLayout.ts';

const noop = () => undefined;
const sections: HudMenuSectionSpec[] = [
  {
    id: 'a',
    title: 'Stations',
    items: [
      { id: 'a1', label: 'One', onSelect: noop },
      { id: 'a2', label: 'Two', onSelect: noop },
    ],
  },
  { id: 'b', items: [{ id: 'b1', label: 'Three', onSelect: noop }] },
];

describe('HUD menu layout', () => {
  it('stacks section titles, rows and group gaps top-down', () => {
    const { rows, contentHeight } = layoutMenuContent(sections);
    assert.deepEqual(
      rows.map((r) => (r.kind === 'section' ? `section:${r.sectionId}` : `item:${r.itemId}`)),
      ['section:a', 'item:a1', 'item:a2', 'item:b1']
    );
    assert.equal(rows[0].y, 0);
    assert.equal(rows[1].y, MENU_METRICS.sectionTitleH);
    assert.equal(rows[2].y, MENU_METRICS.sectionTitleH + MENU_METRICS.rowH + MENU_METRICS.rowGap);
    const last = rows[3];
    assert.equal(contentHeight, last.y + last.h);
    assert.ok(last.y >= rows[2].y + rows[2].h + MENU_METRICS.groupGap);
  });

  it('caps the viewport to the screen and clamps scroll to the overflow', () => {
    const tall = 1400;
    const viewport = menuViewportHeight(768, tall);
    assert.ok(viewport < 768 - MENU_METRICS.topReserve - MENU_METRICS.bottomReserve);
    assert.equal(menuViewportHeight(768, 120), 120);
    assert.equal(clampScroll(-40, tall, viewport), 0);
    assert.equal(clampScroll(99999, tall, viewport), tall - viewport);
    assert.equal(clampScroll(50, 100, 200), 0);
  });

  it('only draws and hit-tests rows that are fully inside the scrolled viewport', () => {
    const row = { y: 100, h: 40 };
    assert.equal(isRowVisible(row, 0, 300), true);
    assert.equal(isRowVisible(row, 120, 300), false);
    assert.equal(isRowVisible(row, 0, 130), false);
    assert.equal(isRowVisible(row, 100, 40), true);
  });
});

describe('HUD dock layout', () => {
  it('fits the screen with side margins and never collapses below a usable width', () => {
    assert.equal(dockWidth(1024), DOCK_METRICS.maxWidth);
    assert.equal(dockWidth(390), 390 - DOCK_METRICS.sideMargin * 2);
    assert.equal(dockWidth(200), 260);
  });
});

describe('HUD glass mode', () => {
  it('uses matte carbon on WebKit, flat pane on software GL, transmission otherwise', () => {
    assert.equal(resolveHudGlassMode(false, true), 'matte');
    assert.equal(resolveHudGlassMode(true, true), 'matte');
    assert.equal(resolveHudGlassMode(true, false), 'flat');
    assert.equal(resolveHudGlassMode(false, false), 'transmission');
  });
});
