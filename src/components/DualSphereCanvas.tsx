import React from 'react';
import {
  CosmographCanvas,
  CosmographCanvasProps,
  HQ_CENTER,
  CDE_CENTER,
  CINEMA_LENS_PRESETS,
  focalLengthToVFov,
  CameraCommandPayload,
  CameraTelemetry,
  AnchoredLabel2D,
  CinemaLensId,
  CameraAnglePresetId,
  CameraLoopMode,
} from './CosmographCanvas';

export {
  HQ_CENTER,
  CDE_CENTER,
  CINEMA_LENS_PRESETS,
  focalLengthToVFov,
  type CameraCommandPayload,
  type CameraTelemetry,
  type AnchoredLabel2D,
  type CinemaLensId,
  type CameraAnglePresetId,
  type CameraLoopMode,
};

export type DualSphereCanvasProps = CosmographCanvasProps;

/**
 * DualSphereCanvas.tsx — Master PRD & Wireframes v1.1 Dual-Sphere 3D WebGL Engine
 * - Sphere 01 at [0, 0, 0]: CEREBRO HQ, radius 6.2u, Refractive Cobalt Liquid Glass (#4C8DFF, rim #B4DDFF)
 * - Sphere 02 at [38, 4, -22]: CDE Universe, radius 6.2u, Warm Amber Caustic Crystal (#F2B66D, rim #FFF1D4)
 * - Connected by CatmullRomCurve3 cardiac splines with traveling light pulses
 * - 6,400 DOF spiral galaxy particles (3,200 per sphere) + 6 Project Suns
 * - Supports iPad 1-finger touch drag to orbit and 2-finger pinch-to-zoom (9.2u to 42u)
 * - Supports runtime create_domain and update_domain_material tools
 */
export const DualSphereCanvas: React.FC<DualSphereCanvasProps> = (props) => {
  return <CosmographCanvas {...props} />;
};
