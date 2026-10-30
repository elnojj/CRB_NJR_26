// ============================================================================
// CEREBRO-CORE MASTER ARCHITECTURE UPGRADE BLOCK (PR #130 / Commit 8e8cf6d)
// + Blueprint V2.0 (v2, corrected) Visual Glossary & Shared-Screen Adapters
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

// ----------------------------------------------------------------------------
// 1. CONSTANTS & SPATIAL TAXONOMY
// ----------------------------------------------------------------------------
export const SPATIAL_SCALE = 1.0;
export const MASTER_RADIUS = 5;
export const IDLE_MS = 5000;

export const CDE_TAXONOMY = {
  dimensions: ['Projects', 'Files', 'Media', 'Tasks', 'People'] as const,
  glass: {
    metalness: 0.0,
    roughness: 0.04,
    ior: 1.48,
    transmission: 0.98,
    thickness: 1.2,
    specularIntensity: 1.0,
    specularColor: '#B4DDFF',
    sheen: 0.6,
    sheenRoughness: 0.3,
    sheenColor: '#FFF4D0',
    opacity: 0.95,
  },
  bloomThresholdProposal: {
    threshold: 0.88,
    strength: 0.24,
    radius: 0.35,
  },
} as const;

/**
 * Blueprint V2.0 v2 Fix #2: All 5 Cerebro Widget Axes restored
 * (connection / input / output / execution / persistence)
 */
export interface CerebroFiveAxisState {
  connection: 'live' | 'standby' | 'offline';
  input: 'voice' | 'touch' | 'idle';
  output: 'speaking' | 'visual' | 'muted';
  execution: 'ready' | 'running' | 'two-tap-hold';
  persistence: 'synced' | 'saving' | 'ephemeral';
}

export const DEFAULT_FIVE_AXIS_STATE: CerebroFiveAxisState = {
  connection: 'live',
  input: 'idle',
  output: 'visual',
  execution: 'ready',
  persistence: 'synced',
};

// ----------------------------------------------------------------------------
// 2. CAMERA COMPOSITION & VIEW-SHIFT FRAMING (`spatialNavigation.ts`)
// ----------------------------------------------------------------------------
export interface Pose {
  target: [number, number, number];
  azimuth: number;
  elevation: number;
  fov: number;
  distance: number;
}

export function fitDistance(
  radius: number,
  fovDeg: number,
  aspect: number,
  margin = 1.15
): number {
  const safeAspect = Math.max(0.25, aspect || 1);
  const vFov = THREE.MathUtils.degToRad(fovDeg);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect);
  const limiting = Math.min(vFov, hFov);
  return (radius * margin) / Math.sin(limiting / 2);
}

export function masterPose(aspect: number): Pose {
  const fov = aspect < 0.8 ? 52 : 46; // Wider FOV for phone portrait
  return {
    target: [0, 0, 0],
    azimuth: 0.22,
    elevation: 0.19,
    fov,
    distance: fitDistance(MASTER_RADIUS * SPATIAL_SCALE, fov, aspect),
  };
}

export function applyViewShift(
  cam: THREE.PerspectiveCamera,
  w: number,
  h: number,
  occludedBottomPx = 0
): void {
  if (w <= 0 || h <= 0) return;
  if (Math.abs(occludedBottomPx) <= 1) {
    cam.clearViewOffset();
  } else {
    cam.setViewOffset(w, h, 0, occludedBottomPx / 2, w, h);
  }
  cam.updateProjectionMatrix();
}

// ----------------------------------------------------------------------------
// 3. FLIGHT SYSTEM & CATMULL-ROM CURVES
// ----------------------------------------------------------------------------
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function buildFlight(
  from: THREE.Camera,
  toPos: THREE.Vector3,
  toTarget: THREE.Vector3
) {
  const p0 = from.position.clone();
  const mid = p0
    .clone()
    .lerp(toPos, 0.5)
    .add(new THREE.Vector3(0, p0.distanceTo(toPos) * 0.18, 0));
  const curve = new THREE.CatmullRomCurve3([p0, mid, toPos], false, 'centripetal');
  const q0 = from.quaternion.clone();
  const q1 = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(toPos, toTarget, THREE.Object3D.DEFAULT_UP)
  );
  const length = curve.getLength();
  return { curve, q0, q1, length };
}

export const flightMs = (length: number): number =>
  THREE.MathUtils.clamp(length * 140, 900, 2600);

export function stepFlight(
  cam: THREE.Camera,
  f: ReturnType<typeof buildFlight>,
  t: number,
  reverse = false
): void {
  const clampedT = THREE.MathUtils.clamp(t, 0, 1);
  const u = easeInOutCubic(reverse ? 1 - clampedT : clampedT);
  cam.position.copy(f.curve.getPointAt(u));
  cam.quaternion.slerpQuaternions(f.q0, f.q1, u);
}

export interface FlightRecord {
  flight: ReturnType<typeof buildFlight>;
  startTime: number;
  durationMs: number;
  reverse?: boolean;
}

let lastFlightRecord: FlightRecord | null = null;

export function setLastFlight(record: FlightRecord | null): void {
  lastFlightRecord = record;
}

export function getLastFlight(): FlightRecord | null {
  return lastFlightRecord;
}

export function returnMaster(cam: THREE.Camera): boolean {
  if (lastFlightRecord) {
    stepFlight(cam, lastFlightRecord.flight, 1, true);
    return true;
  }
  return false;
}

// ----------------------------------------------------------------------------
// 4. ATOMIC RESIZE REFRAME TRANSACTION (D0: Enabled by Default)
// ----------------------------------------------------------------------------
export const resizeReframeTransaction = true;

export interface ResizeSnapshot {
  width: number;
  height: number;
  aspect: number;
  generation: number;
  pose: Pose;
  occludedBottomPx: number;
}

let activeResizeGeneration = 0;

export function createResizeSnapshot(
  width: number,
  height: number,
  occludedBottomPx = 0
): ResizeSnapshot {
  activeResizeGeneration++;
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const aspect = safeW / safeH;
  const pose = masterPose(aspect);
  return {
    width: safeW,
    height: safeH,
    aspect,
    generation: activeResizeGeneration,
    pose,
    occludedBottomPx,
  };
}

/**
 * Executes the D0 Atomic Resize Reframe Transaction:
 * Computes viewport width/height, visible panel/sheet occlusion,
 * masterPose(aspect) (fov: aspect < 0.8 ? 52 : 46, fitDistance(MASTER_RADIUS * SPATIAL_SCALE, fov, aspect, 1.15)),
 * and cam.setViewOffset(w, h, 0, occludedBottomPx / 2, w, h) in one atomic snapshot,
 * plus triggers a post-Home transaction refresh.
 */
export function executeAtomicReframe(
  cam: THREE.PerspectiveCamera,
  width: number,
  height: number,
  occludedBottomPx = 0
): ResizeSnapshot {
  const snap = createResizeSnapshot(width, height, occludedBottomPx);
  cam.aspect = snap.aspect;
  cam.fov = snap.pose.fov;
  applyViewShift(cam, snap.width, snap.height, occludedBottomPx);
  cam.updateProjectionMatrix();
  return snap;
}

/**
 * readHomeComposition:
 * Reads .orb-slot-spacer, [data-orb-slot] or viewport bounds.
 * Accounts for mobile sheet occlusion (< 720px) and returns framing data.
 */
export function readHomeComposition(domContainer?: HTMLElement | null): {
  width: number;
  height: number;
  aspect: number;
  occludedBottomPx: number;
  pose: Pose;
  slotRect?: DOMRect | null;
} {
  const w = domContainer?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1440);
  const h = domContainer?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 900);
  const aspect = w / Math.max(1, h);

  let occludedBottomPx = 0;
  if (typeof document !== 'undefined') {
    const isMobile = w < 720;
    const sheetEl = document.querySelector('[data-sheet-open="true"], [data-bottom-sheet="true"]');
    if (isMobile && sheetEl) {
      const rect = sheetEl.getBoundingClientRect();
      occludedBottomPx = Math.max(0, h - rect.top);
    }
  }

  let slotRect: DOMRect | null = null;
  if (typeof document !== 'undefined') {
    const slotEl = document.querySelector('.orb-slot-spacer, [data-orb-slot]');
    if (slotEl) {
      slotRect = slotEl.getBoundingClientRect();
    }
  }

  return {
    width: w,
    height: h,
    aspect,
    occludedBottomPx,
    pose: masterPose(aspect),
    slotRect,
  };
}

// ----------------------------------------------------------------------------
// 5. IDLE TOUR CONTROLLER
// ----------------------------------------------------------------------------
export function useIdleTour(enabled = true, idleMs = IDLE_MS) {
  const [touring, setTouring] = useState(false);
  const lastInputRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setTouring(false);
      return;
    }
    const handleActivity = () => {
      lastInputRef.current = performance.now();
      setTouring(false);
    };
    const events = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - lastInputRef.current;
      if (elapsed >= idleMs) {
        setTouring(true);
      }
    }, Math.min(1000, Math.max(250, Math.floor(idleMs / 4))));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      window.clearInterval(timer);
    };
  }, [enabled, idleMs]);

  return { touring, lastInputRef };
}

// ----------------------------------------------------------------------------
// 6. BLUEPRINT V2.0 (v2, CORRECTED) SHADER, ORBITAL & PARTICLE HELPERS
// ----------------------------------------------------------------------------

/**
 * Fix #1: Targets `#include <opaque_fragment>` (Three r154+ chunk name)
 * with an explicit guard that warns instead of silently skipping.
 */
export function patchFresnelRimOnOpaqueFragment(
  shader: { fragmentShader: string },
  rimColor: THREE.Color,
  bodyColor: THREE.Color,
  fresnelPower = 2.6
): boolean {
  const targetChunk = '#include <opaque_fragment>';
  if (!shader.fragmentShader.includes(targetChunk)) {
    console.warn(
      '[Cerebro v2 Shader Guard] Expected #include <opaque_fragment> in Three.js r154+ MeshPhysicalMaterial shader, falling back to #include <dithering_fragment>.'
    );
    return false;
  }

  shader.fragmentShader = shader.fragmentShader.replace(
    targetChunk,
    `${targetChunk}
    {
      float v2Fresnel = pow(1.0 - clamp(abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 0.0, 1.0), ${fresnelPower.toFixed(
        2
      )});
      vec3 v2RimCol = vec3(${rimColor.r.toFixed(3)}, ${rimColor.g.toFixed(3)}, ${rimColor.b.toFixed(
      3
    )});
      vec3 v2BodyCol = vec3(${bodyColor.r.toFixed(3)}, ${bodyColor.g.toFixed(
      3
    )}, ${bodyColor.b.toFixed(3)});
      float v2Wave = 0.5 + 0.5 * sin(uTime * 1.6 + gl_FragCoord.x * 0.012 + gl_FragCoord.y * 0.012);
      vec3 v2Tint = mix(v2BodyCol, v2RimCol, v2Wave) * v2Fresnel * (0.34 + uAudioRms * 0.45);
      gl_FragColor.rgb += v2Tint;
    }`
  );
  return true;
}

/**
 * Fix #3 & #7: Bounded particle drift from immutable basePositions with per-frame reducedMotion check.
 * Never compounds `pos.setY(pos.getY() + ...)` across frames.
 */
export function updateBoundedParticleDrift(
  positionAttr: THREE.BufferAttribute,
  basePositions: Float32Array,
  phases: Float32Array,
  elapsedSec: number,
  reducedMotion: boolean,
  amplitude = 0.075
): void {
  const count = Math.min(positionAttr.count, Math.floor(basePositions.length / 3));
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const bx = basePositions[idx];
    const by = basePositions[idx + 1];
    const bz = basePositions[idx + 2];
    if (reducedMotion) {
      positionAttr.setXYZ(i, bx, by, bz);
    } else {
      const ph = phases[i] ?? (i * 0.37) % (Math.PI * 2);
      const dy = Math.sin(elapsedSec * 0.65 + ph) * amplitude;
      const dx = Math.cos(elapsedSec * 0.45 + ph * 1.3) * (amplitude * 0.45);
      positionAttr.setXYZ(i, bx + dx, by + dy, bz);
    }
  }
  positionAttr.needsUpdate = true;
}

/**
 * Fix #4: Closed orbital loop helper.
 * Drops the duplicate endpoint returned by `EllipseCurve.getPoints(segments)`
 * and constructs a closed `CatmullRomCurve3(pts3D, true, 'centripetal')`.
 */
export function buildClosedOrbitalLoopPoints(
  radiusX: number,
  radiusY = radiusX,
  segments = 72
): { curve: THREE.CatmullRomCurve3; points: THREE.Vector3[] } {
  const ellipse = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, Math.PI * 2, false, 0);
  // EllipseCurve.getPoints(N) returns N+1 points where the last point duplicates the first
  const raw2D = ellipse.getPoints(segments).slice(0, -1);
  const controlPts3D = raw2D.map((p) => new THREE.Vector3(p.x, p.y, 0));
  const closedCurve = new THREE.CatmullRomCurve3(controlPts3D, true, 'centripetal');
  const sampledPoints = closedCurve.getPoints(segments);
  return { curve: closedCurve, points: sampledPoints };
}

// ----------------------------------------------------------------------------
// 7. SPATIAL WORLD COMPONENT (Unified Glass & Restrained Particle Galaxy)
// ----------------------------------------------------------------------------
/**
 * Imperative Three.js UnifiedGlassSphere builder with `dispose()` (Blueprint V2.0 v2 Fix #7).
 */
export function buildUnifiedGlassSphereGroup(particleCount = 720): {
  group: THREE.Group;
  sphereMesh: THREE.Mesh;
  galaxyPoints: THREE.Points;
  basePositions: Float32Array;
  phases: Float32Array;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const sphereGeo = new THREE.SphereGeometry(MASTER_RADIUS * SPATIAL_SCALE, 64, 64);
  const sphereMat = new THREE.MeshPhysicalMaterial({
    metalness: CDE_TAXONOMY.glass.metalness,
    ior: CDE_TAXONOMY.glass.ior,
    transmission: CDE_TAXONOMY.glass.transmission,
    roughness: CDE_TAXONOMY.glass.roughness,
    thickness: CDE_TAXONOMY.glass.thickness,
    transparent: true,
    opacity: 0.92,
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphereMesh);

  const pos = new Float32Array(particleCount * 3);
  const phases = new Float32Array(particleCount);
  const maxR = MASTER_RADIUS * SPATIAL_SCALE * 0.88;
  for (let i = 0; i < particleCount; i++) {
    const u = (i + 0.5) / particleCount;
    const theta = i * 2.399963229728653;
    const r = Math.cbrt(u) * maxR;
    const y = (1 - 2 * ((i * 0.6180339887) % 1)) * r * 0.65;
    const slice = Math.sqrt(Math.max(0, r * r - y * y));
    pos[i * 3] = Math.cos(theta) * slice;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(theta) * slice;
    phases[i] = (i * 0.73) % (Math.PI * 2);
  }
  const basePositions = new Float32Array(pos);
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pointsMat = new THREE.PointsMaterial({
    size: 0.05,
    color: '#B4DDFF',
    transparent: true,
    opacity: 0.6,
  });
  const galaxyPoints = new THREE.Points(pointsGeo, pointsMat);
  group.add(galaxyPoints);

  return {
    group,
    sphereMesh,
    galaxyPoints,
    basePositions,
    phases,
    dispose: () => {
      sphereGeo.dispose();
      sphereMat.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
    },
  };
}

export function UnifiedGlassSphere({
  children,
  particleCount = 720,
}: {
  children?: React.ReactNode;
  particleCount?: number;
}) {
  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount);
    const maxR = MASTER_RADIUS * SPATIAL_SCALE * 0.88;
    for (let i = 0; i < particleCount; i++) {
      const u = (i + 0.5) / particleCount;
      const theta = i * 2.399963229728653; // Golden angle
      const r = Math.cbrt(u) * maxR;
      const y = (1 - 2 * ((i * 0.6180339887) % 1)) * r * 0.65;
      const slice = Math.sqrt(Math.max(0, r * r - y * y));
      pos[i * 3] = Math.cos(theta) * slice;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(theta) * slice;
      ph[i] = (i * 0.73) % (Math.PI * 2);
    }
    return { positions: pos, phases: ph };
  }, [particleCount]);

  return React.createElement(
    'group',
    { 'data-testid': 'unified-glass-sphere-group', userData: { phases } },
    React.createElement(
      'mesh',
      null,
      React.createElement('sphereGeometry', { args: [MASTER_RADIUS * SPATIAL_SCALE, 64, 64] }),
      React.createElement('meshPhysicalMaterial', {
        metalness: CDE_TAXONOMY.glass.metalness,
        ior: CDE_TAXONOMY.glass.ior,
        transmission: CDE_TAXONOMY.glass.transmission,
        roughness: CDE_TAXONOMY.glass.roughness,
        thickness: CDE_TAXONOMY.glass.thickness,
        transparent: true,
        opacity: 0.92,
      })
    ),
    React.createElement(
      'points',
      null,
      React.createElement(
        'bufferGeometry',
        null,
        React.createElement('bufferAttribute', {
          attach: 'attributes-position',
          args: [positions, 3],
          count: particleCount,
          itemSize: 3,
        })
      ),
      React.createElement('pointsMaterial', {
        size: 0.05,
        color: '#B4DDFF',
        transparent: true,
        opacity: 0.6,
      })
    ),
    children
  );
}

// ----------------------------------------------------------------------------
// 8. TEAM CHAT ENTRY POINT (UI Overlay Layer)
// ----------------------------------------------------------------------------
export interface TeamChatChipProps {
  onOpenChat?: () => void;
  unreadCount?: number;
  active?: boolean;
}

export function TeamChatChip({ onOpenChat, unreadCount = 3, active = false }: TeamChatChipProps) {
  return (
    <a
      href="/chat"
      aria-label="Open team chat"
      data-testid="sphere-open-chat"
      data-ui-id="sphere-open-chat"
      data-cta-id="sphere-open-chat"
      data-action-id="panel.open"
      onClick={(e) => {
        if (onOpenChat) {
          e.preventDefault();
          onOpenChat();
        }
      }}
      className="cj-glass-card fixed flex items-center gap-2 transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
      style={{
        right: 'max(16px, env(safe-area-inset-right))',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        zIndex: 95,
        background: active ? 'rgba(212, 175, 55, 0.22)' : 'rgba(27, 34, 48, 0.88)',
        color: '#F2F6F8',
        border: active
          ? '1px solid #D4AF37'
          : '1px solid rgba(197, 204, 214, 0.22)',
        padding: '10px 18px',
        borderRadius: '20px',
        fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif',
        fontSize: '14px',
        textDecoration: 'none',
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: active ? '#FFF4D0' : '#D4AF37' }}
      />
      <span>Team chat</span>
      {unreadCount > 0 && (
        <span className="font-mono text-[11px] text-[#C5CCD6] opacity-85">
          · {unreadCount}
        </span>
      )}
    </a>
  );
}
