/**
 * Cerebro baseline scene registry — single place for shell + media-tube spatial contracts.
 * Geometry instances live in geometryRegistry; this module owns the scene-level constants.
 */

import {
  BASE_SHELL_RADIUS,
  PRIMITIVE_SHAPE_KEYS,
  type PrimitiveShapeKey,
  type ShapeKey,
} from './geometryRegistry';

/** Locked gallery / media-tube spatial contract (matches CosmographCanvas tube builder). */
export const MEDIA_TUBE_BASELINE = {
  radiusU: 5.4,
  columns: 8,
  visibleRows: 3,
  maxMountedTiles: 24,
  slotSizeU: [3.2, 1.8] as const,
  rowPitchU: 2.25,
  idleRadPerSec: 0.025,
  spinClampRadPerSec: 2.0,
  damping60Hz: 0.92,
  hoverSpeedMultiplier: 0.35,
  focusMs: 650,
  fullviewMs: 1100,
  returnMs: 850,
  /** Tube interaction is WebGL-native; no flat DOM HUD card over the scene. */
  flatHudCard: false as const,
} as const;

export const CEREBRO_SCENE_BASELINE = {
  schema: 'cerebro.scene.baseline/1',
  shell: {
    baseRadiusU: BASE_SHELL_RADIUS,
    defaultShape: 'sphere' as PrimitiveShapeKey,
    primitiveShapes: PRIMITIVE_SHAPE_KEYS,
  },
  mediaTube: MEDIA_TUBE_BASELINE,
} as const;

export type CerebroSceneBaseline = typeof CEREBRO_SCENE_BASELINE;

export function resolveDefaultShellShape(preferred?: ShapeKey): ShapeKey {
  return preferred ?? CEREBRO_SCENE_BASELINE.shell.defaultShape;
}

export {
  BASE_SHELL_RADIUS,
  PRIMITIVE_SHAPE_KEYS,
  type PrimitiveShapeKey,
  type ShapeKey,
};
