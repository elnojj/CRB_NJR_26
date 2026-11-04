import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import type { HudDockButtonId } from './hudBridge';

const wrap = (inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${inner}</svg>`;

const stroke = (d: string, width = 1.6): string =>
  `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Same glyphs as the DOM dock, so the 3D dock reads as the same control set. */
const ICON_SVG: Record<HudDockButtonId, string> = {
  call: wrap(
    stroke(
      'M7.5 3.8c.4-.4 1-.5 1.5-.3l2.2.9c.5.2.8.7.7 1.2l-.4 2.3a1.2 1.2 0 0 1-.7.9l-1.3.5a9.5 9.5 0 0 0 4.7 4.7l.5-1.3c.2-.4.5-.6.9-.7l2.3-.4c.5-.1 1 .2 1.2.7l.9 2.2c.2.5.1 1.1-.3 1.5l-1.4 1.4c-.4.4-1 .5-1.5.4C11.3 17.2 6.8 12.7 5.2 7.2c-.1-.5 0-1.1.4-1.5L7.5 3.8Z'
    )
  ),
  hands: wrap(
    stroke(
      'M8.2 11.2V6.4a1.2 1.2 0 0 1 2.4 0v4.2M10.6 10.2V5.2a1.2 1.2 0 0 1 2.4 0v5.4M13 10.5V6.8a1.2 1.2 0 1 1 2.4 0v5.1M15.4 12V8.6a1.2 1.2 0 1 1 2.4 0v5.8c0 3.1-2.2 5.4-5.4 5.4h-.6c-2.4 0-4.2-1.1-5.3-2.9L5.2 13.4a1.35 1.35 0 0 1 2.2-1.6l.8 1.1',
      1.55
    )
  ),
  chat: wrap(
    stroke(
      'M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H11l-3.5 2.6V16.5H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z'
    ) + stroke('M8 10.2h8M8 13h5.5', 1.5)
  ),
  nodes:
    wrap(
      `<circle cx="12" cy="12" r="2.4" fill="none" stroke="#ffffff" stroke-width="1.6"/>` +
        `<circle cx="5.5" cy="6.5" r="1.8" fill="none" stroke="#ffffff" stroke-width="1.5"/>` +
        `<circle cx="18.5" cy="6.5" r="1.8" fill="none" stroke="#ffffff" stroke-width="1.5"/>` +
        `<circle cx="12" cy="19" r="1.8" fill="none" stroke="#ffffff" stroke-width="1.5"/>`
    ).replace('</svg>', `${stroke('M7 7.6l3.3 2.9M17 7.6l-3.3 2.9M12 14.4v2.8', 1.4)}</svg>`),
};

const loader = new SVGLoader();

/** Builds one merged vector mesh for a dock glyph; the caller owns the material and disposal. */
export function buildHudIconGeometry(id: HudDockButtonId): THREE.BufferGeometry {
  const data = loader.parse(ICON_SVG[id]);
  const parts: THREE.BufferGeometry[] = [];
  for (const path of data.paths) {
    const style = path.userData?.style as
      | {
          fill?: string;
          stroke?: string;
          strokeWidth?: number;
          strokeLineJoin?: string;
          strokeLineCap?: string;
          strokeMiterLimit?: number;
        }
      | undefined;
    if (!style) continue;
    if (style.fill !== undefined && style.fill !== 'none') {
      for (const shape of SVGLoader.createShapes(path)) {
        parts.push(new THREE.ShapeGeometry(shape));
      }
    }
    if (style.stroke !== undefined && style.stroke !== 'none') {
      for (const sub of path.subPaths) {
        const geometry = SVGLoader.pointsToStroke(
          sub.getPoints(),
          {
            strokeColor: style.stroke,
            strokeWidth: style.strokeWidth ?? 1,
            strokeLineJoin: style.strokeLineJoin ?? 'round',
            strokeLineCap: style.strokeLineCap ?? 'round',
            strokeMiterLimit: style.strokeMiterLimit ?? 4,
          },
          12
        );
        if (geometry) parts.push(geometry);
      }
    }
  }
  const merged = parts.length ? mergeGeometries(
        parts.map((g) => (g.index ? g.toNonIndexed() : g)),
        false
      ) : null;
  for (const part of parts) part.dispose();
  const geometry = merged ?? new THREE.BufferGeometry();
  geometry.translate(-12, -12, 0);
  geometry.scale(1, -1, 1);
  return geometry;
}
