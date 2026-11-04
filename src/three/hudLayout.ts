import type { HudMenuSectionSpec } from './hudBridge';

export const MENU_METRICS = {
  width: 304,
  pad: 12,
  titleH: 48,
  sectionTitleH: 26,
  rowH: 40,
  rowGap: 4,
  groupGap: 12,
  rightMargin: 14,
  topReserve: 64,
  bottomReserve: 124,
} as const;

export const DOCK_METRICS = {
  maxWidth: 440,
  sideMargin: 12,
  height: 94,
  bottomMargin: 16,
  buttonH: 52,
  pad: 10,
  gap: 8,
  curveRadius: 1100,
  cornerRadius: 24,
} as const;

export type MenuRowLayout =
  | { kind: 'section'; sectionId: string; y: number; h: number; title: string }
  | { kind: 'item'; sectionId: string; itemId: string; y: number; h: number };

export type MenuContentLayout = {
  rows: MenuRowLayout[];
  contentHeight: number;
};

/** Rows are laid out top-down from y = 0 in "content space" (positive y goes down). */
export function layoutMenuContent(sections: HudMenuSectionSpec[]): MenuContentLayout {
  const rows: MenuRowLayout[] = [];
  let y = 0;
  sections.forEach((section, index) => {
    if (index > 0) y += MENU_METRICS.groupGap;
    if (section.title) {
      rows.push({
        kind: 'section',
        sectionId: section.id,
        y,
        h: MENU_METRICS.sectionTitleH,
        title: section.title,
      });
      y += MENU_METRICS.sectionTitleH;
    }
    for (const item of section.items) {
      rows.push({ kind: 'item', sectionId: section.id, itemId: item.id, y, h: MENU_METRICS.rowH });
      y += MENU_METRICS.rowH + MENU_METRICS.rowGap;
    }
  });
  return { rows, contentHeight: Math.max(0, y - MENU_METRICS.rowGap) };
}

/** Height available to the scrolling list for a given screen height. */
export function menuViewportHeight(screenH: number, contentHeight: number): number {
  const chrome = MENU_METRICS.titleH + MENU_METRICS.pad * 2;
  const available = Math.max(
    MENU_METRICS.rowH * 3,
    screenH - MENU_METRICS.topReserve - MENU_METRICS.bottomReserve - chrome
  );
  return Math.min(contentHeight, available);
}

export function clampScroll(scroll: number, contentHeight: number, viewportHeight: number): number {
  const max = Math.max(0, contentHeight - viewportHeight);
  return Math.min(max, Math.max(0, scroll));
}

/** A row is interactive and drawn only when fully inside the scrolled viewport. */
export function isRowVisible(row: Pick<MenuRowLayout, 'y' | 'h'>, scroll: number, viewportHeight: number): boolean {
  const top = row.y - scroll;
  return top >= -0.5 && top + row.h <= viewportHeight + 0.5;
}

export function dockWidth(screenW: number): number {
  return Math.max(260, Math.min(DOCK_METRICS.maxWidth, screenW - DOCK_METRICS.sideMargin * 2));
}
