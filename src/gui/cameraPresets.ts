/**
 * CEREBRO Stellar Command — GUI Amendment v4.0 (`cerebro-ui/4`)
 * Camera Presets, Optical Sensor Math, Frustum Offset & Quintic Smootherstep
 */

import { GuiRect } from './CollisionManager';
import { GUI_TOUCH_TOKENS } from './guiTokens';

export const CAMERA_SENSOR_MM: [number, number] = [36, 24];

export type GuiCameraPresetId =
  | 'universe'
  | 'approach'
  | 'focused'
  | 'detail'
  | 'overview'
  | 'world'
  | 'focus';

export interface GuiCameraPresetSpec {
  id: GuiCameraPresetId;
  focalMm: number;
  verticalFovDeg: number;
  exactVerticalFovDeg: number;
  travelMs: number;
  sphereHeightOccupancy: number;
}

/**
 * Exact formula from `CEREBRO_CDE_UNIFIED_AMEND_v4.json`:
 * `verticalFovDeg = 2 * atan(24 / (2 * focalLengthMm)) * 180 / PI`.
 */
export function computeExactVerticalFovDeg(focalMm: number): number {
  const clampedMm = Math.max(5, Math.min(300, focalMm));
  const rad = 2 * Math.atan(CAMERA_SENSOR_MM[1] / (2 * clampedMm));
  return Number(((rad * 180) / Math.PI).toFixed(6));
}

export function computeVerticalFovDeg(focalMm: number): number {
  return Number(computeExactVerticalFovDeg(focalMm).toFixed(1));
}

export const GUI_CAMERA_PRESETS: Record<GuiCameraPresetId, GuiCameraPresetSpec> = {
  universe: {
    id: 'universe',
    focalMm: 28,
    verticalFovDeg: 46.4,
    exactVerticalFovDeg: 46.397181,
    travelMs: 3200,
    sphereHeightOccupancy: 0.32,
  },
  overview: {
    id: 'overview',
    focalMm: 28,
    verticalFovDeg: 46.4,
    exactVerticalFovDeg: 46.397181,
    travelMs: 3200,
    sphereHeightOccupancy: 0.32,
  },
  approach: {
    id: 'approach',
    focalMm: 35,
    verticalFovDeg: 37.8,
    exactVerticalFovDeg: 37.849289,
    travelMs: 2400,
    sphereHeightOccupancy: 0.5,
  },
  world: {
    id: 'world',
    focalMm: 35,
    verticalFovDeg: 37.8,
    exactVerticalFovDeg: 37.849289,
    travelMs: 2400,
    sphereHeightOccupancy: 0.5,
  },
  focused: {
    id: 'focused',
    focalMm: 50,
    verticalFovDeg: 27.0,
    exactVerticalFovDeg: 26.991467,
    travelMs: 1800,
    sphereHeightOccupancy: 0.65,
  },
  focus: {
    id: 'focus',
    focalMm: 50,
    verticalFovDeg: 27.0,
    exactVerticalFovDeg: 26.991467,
    travelMs: 1800,
    sphereHeightOccupancy: 0.65,
  },
  detail: {
    id: 'detail',
    focalMm: 85,
    verticalFovDeg: 16.1,
    exactVerticalFovDeg: 16.071421,
    travelMs: 1400,
    sphereHeightOccupancy: 0.78,
  },
};

export const CAMERA_ARRIVAL_TOLERANCE = {
  positionToleranceR: 0.02,
  angleToleranceDeg: 0.25,
  requiredStableFrames: 3,
} as const;

/**
 * Quintic smootherstep easing required by v4.0 spec: `6t^5 - 15t^4 + 10t^3`
 */
export function quinticSmootherstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Computes the camera distance from the sphere center (`radius = 6.2u`) so that
 * the bounding sphere fits inside the unobstructed `centerSafe` rectangle with
 * at least `24px` padding and respects the preset's `sphereHeightOccupancy`.
 */
export function computeFittedCameraDistance(params: {
  sphereRadius: number;
  preset: GuiCameraPresetSpec;
  viewportW: number;
  viewportH: number;
  unobstructedRect: GuiRect;
  paddingPx?: number;
}): number {
  const {
    sphereRadius,
    preset,
    viewportH,
    unobstructedRect,
    paddingPx = GUI_TOUCH_TOKENS.sphereSafePaddingPx,
  } = params;

  const safeW = Math.max(120, unobstructedRect.w - paddingPx * 2);
  const safeH = Math.max(120, unobstructedRect.h - paddingPx * 2);

  const vFovRad = (preset.verticalFovDeg * Math.PI) / 180;
  const desiredPixelDiameter = Math.min(safeW, safeH * preset.sphereHeightOccupancy * 1.15);
  const occupancyFractionOfFullViewportH = Math.max(
    0.16,
    Math.min(0.82, desiredPixelDiameter / Math.max(320, viewportH))
  );

  const tanHalfFov = Math.tan(vFovRad / 2);
  const sinHalfAngle = Math.min(0.92, occupancyFractionOfFullViewportH * tanHalfFov);
  const distance = sphereRadius / Math.max(0.05, sinHalfAngle);

  return Math.max(sphereRadius * 1.45, Math.min(68, distance));
}

/**
 * Computes Three.js `camera.setViewOffset` parameters so the optical center of projection
 * aligns with the center of `unobstructedRect` rather than being covered by side/bottom panels.
 */
export function computeSubFrustumOffset(
  viewportW: number,
  viewportH: number,
  unobstructedRect: GuiRect
): {
  fullWidth: number;
  fullHeight: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
} {
  const safeCenterX = unobstructedRect.x + unobstructedRect.w / 2;
  const safeCenterY = unobstructedRect.y + unobstructedRect.h / 2;
  const viewCenterX = viewportW / 2;
  const viewCenterY = viewportH / 2;

  const rawShiftX = viewCenterX - safeCenterX;
  const rawShiftY = viewCenterY - safeCenterY;
  const clampedShiftX = Math.max(-viewportW * 0.22, Math.min(viewportW * 0.22, rawShiftX));
  const clampedShiftY = Math.max(-viewportH * 0.22, Math.min(viewportH * 0.22, rawShiftY));

  return {
    fullWidth: viewportW,
    fullHeight: viewportH,
    offsetX: Math.round(clampedShiftX),
    offsetY: Math.round(clampedShiftY),
    width: viewportW,
    height: viewportH,
  };
}
