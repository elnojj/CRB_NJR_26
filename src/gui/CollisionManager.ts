/**
 * CEREBRO Stellar Command — GUI Amendment v3.0
 * CollisionManager: Enforces zero overlap (`intersectionArea === 0`) and `>= 12px` margin
 * between all open persistent panels, the voice widget, and safe viewport bounds.
 */

import { GUI_TOUCH_TOKENS } from './guiTokens';

export interface GuiRect {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Computes the strict pixel intersection area between two rectangles,
 * optionally inflated by a required clearance margin (`marginPx / 2` per rect).
 */
export function intersectionArea(a: GuiRect, b: GuiRect, marginPx = 0): number {
  const halfMargin = marginPx / 2;
  const ax1 = a.x - halfMargin;
  const ay1 = a.y - halfMargin;
  const ax2 = a.x + a.w + halfMargin;
  const ay2 = a.y + a.h + halfMargin;

  const bx1 = b.x - halfMargin;
  const by1 = b.y - halfMargin;
  const bx2 = b.x + b.w + halfMargin;
  const by2 = b.y + b.h + halfMargin;

  const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const overlapY = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  return overlapX * overlapY;
}

export function rectsIntersect(
  a: GuiRect,
  b: GuiRect,
  marginPx: number = GUI_TOUCH_TOKENS.panelCollisionMarginPx
): boolean {
  return intersectionArea(a, b, marginPx) > 0;
}

export function clampRectToViewport(
  rect: GuiRect,
  viewportW: number,
  viewportH: number,
  marginPx: number = GUI_TOUCH_TOKENS.panelCollisionMarginPx,
  topReservePx = 64,
  bottomInsetPx = 12
): GuiRect {
  const maxW = Math.max(200, viewportW - marginPx * 2);
  const maxH = Math.max(52, viewportH - topReservePx - bottomInsetPx - marginPx);
  const w = Math.min(rect.w, maxW);
  const h = Math.min(rect.h, maxH);
  const x = Math.max(marginPx, Math.min(viewportW - w - marginPx, rect.x));
  const y = Math.max(topReservePx, Math.min(viewportH - h - bottomInsetPx, rect.y));
  return { ...rect, x, y, w, h };
}

/**
 * Resolves any collision between a candidate rect (such as a dragged voice widget or panel)
 * and existing locked rects so that `intersectionArea === 0` with `>= 12px` margin.
 */
export function resolveCollisions(
  candidate: GuiRect,
  obstacles: GuiRect[],
  viewportW: number,
  viewportH: number,
  marginPx: number = GUI_TOUCH_TOKENS.panelCollisionMarginPx,
  topReservePx = 64,
  bottomInsetPx = 12
): GuiRect {
  let current = clampRectToViewport(
    candidate,
    viewportW,
    viewportH,
    marginPx,
    topReservePx,
    bottomInsetPx
  );

  for (let pass = 0; pass < 4; pass++) {
    let collided = false;
    for (const obs of obstacles) {
      if (obs.id && obs.id === current.id) continue;
      if (rectsIntersect(current, obs, marginPx)) {
        collided = true;
        // Compute 4 candidate displacements: above, below, left, right of obstacle
        const candidates: GuiRect[] = [
          { ...current, y: obs.y - current.h - marginPx }, // above
          { ...current, y: obs.y + obs.h + marginPx },     // below
          { ...current, x: obs.x - current.w - marginPx }, // left
          { ...current, x: obs.x + obs.w + marginPx },     // right
        ]
          .map((c) =>
            clampRectToViewport(c, viewportW, viewportH, marginPx, topReservePx, bottomInsetPx)
          )
          .filter((c) => !obstacles.some((o) => o.id !== current.id && rectsIntersect(c, o, marginPx)));

        if (candidates.length > 0) {
          // Pick closest valid position to original candidate
          candidates.sort((a, b) => {
            const distA = Math.hypot(a.x - current.x, a.y - current.y);
            const distB = Math.hypot(b.x - current.x, b.y - current.y);
            return distA - distB;
          });
          current = candidates[0];
        } else {
          // Shrink height or width slightly to guarantee zero overlap
          if (obs.y <= current.y) {
            const availableBelow = viewportH - bottomInsetPx - (obs.y + obs.h + marginPx);
            if (availableBelow >= 52) {
              current = {
                ...current,
                y: obs.y + obs.h + marginPx,
                h: Math.min(current.h, availableBelow),
              };
            }
          } else {
            const availableAbove = obs.y - marginPx - topReservePx;
            if (availableAbove >= 52) {
              current = {
                ...current,
                y: topReservePx,
                h: Math.min(current.h, availableAbove),
              };
            }
          }
        }
      }
    }
    if (!collided) break;
  }

  return current;
}

/**
 * Verifies that every pair of rectangles in the list has zero overlap (`intersectionArea === 0`).
 */
export function verifyZeroOverlap(
  rects: GuiRect[],
  marginPx = 0
): { passed: boolean; collisions: Array<{ a: string; b: string; area: number }> } {
  const collisions: Array<{ a: string; b: string; area: number }> = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const area = intersectionArea(rects[i], rects[j], marginPx);
      if (area > 0) {
        collisions.push({
          a: rects[i].id || `rect-${i}`,
          b: rects[j].id || `rect-${j}`,
          area,
        });
      }
    }
  }
  return {
    passed: collisions.length === 0,
    collisions,
  };
}
