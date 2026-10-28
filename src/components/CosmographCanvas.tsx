import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { COLOUR_TOKENS } from '../tokens/colours';
import {
  CEREBRO_STATIONS,
  CDE_DIMENSIONS,
  PROJECTS_DATA,
  ProjectHealth,
} from '../data/sourceData';
import { soundEngine } from '../utils/soundEngine';
import {
  CustomDomain3D,
  DomainMaterialPreset,
  getDomainMaterialColors,
} from '../utils/geminiScreenOrchestrator';
import {
  GUI_CAMERA_PRESETS,
  GuiCameraPresetId,
  computeFittedCameraDistance,
  computeSubFrustumOffset,
  quinticSmootherstep,
} from '../gui/cameraPresets';
import { GUI_TIMING_TOKENS, GUI_WORLD_MOTION_TOKENS } from '../gui/guiTokens';
import { GuiRect } from '../gui/CollisionManager';
import { ProjectedTargetScreenCoords } from '../gui/GuiFocusOverlay';

export type CinemaLensId =
  | '5mm'
  | '14mm'
  | '24mm'
  | '35mm'
  | '50mm'
  | '85mm'
  | '100mm-macro'
  | '135mm'
  | '200mm'
  | '300mm';

export type CameraAnglePresetId =
  | 'gods_eye'
  | 'high_crane'
  | 'eye_horizon'
  | 'low_hero'
  | 'nadir_up'
  | 'dutch_cant'
  | 'ots_core'
  | 'macro_close'
  | 'interior_dome'
  | 'tele_bridge';

export type CameraLoopMode = 'off' | 'lemniscate' | 'helix' | 'vertigo' | 'macro_orbit';

export interface CinemaLensPreset {
  id: CinemaLensId;
  label: string;
  name: string;
  focalMm: number;
  vFov: number;
  tStop: number;
  defaultRadius: number;
  dofAperture: number;
}

/**
 * Full-Frame 35mm sensor (24mm vertical height × 36mm horizontal width) optical helper:
 */
export function focalLengthToVFov(focalMm: number): number {
  return (
    2 *
    Math.atan(24 / (2 * Math.max(5, Math.min(300, focalMm)))) *
    (180 / Math.PI)
  );
}

export const CINEMA_LENS_PRESETS: Record<CinemaLensId, CinemaLensPreset> = {
  '5mm': {
    id: '5mm',
    label: '5mm',
    name: 'Fisheye Dome',
    focalMm: 5,
    vFov: 134.8,
    tStop: 2.8,
    defaultRadius: 4.2,
    dofAperture: 0.005,
  },
  '14mm': {
    id: '14mm',
    label: '14mm',
    name: 'Ultra-Wide Rectilinear',
    focalMm: 14,
    vFov: 81.2,
    tStop: 1.8,
    defaultRadius: 28.0,
    dofAperture: 0.01,
  },
  '24mm': {
    id: '24mm',
    label: '24mm',
    name: 'Anamorphic Wide',
    focalMm: 24,
    vFov: 53.1,
    tStop: 1.4,
    defaultRadius: 20.0,
    dofAperture: 0.02,
  },
  '35mm': {
    id: '35mm',
    label: '35mm',
    name: 'Master Prime Standard',
    focalMm: 35,
    vFov: 37.8,
    tStop: 1.3,
    defaultRadius: 16.5,
    dofAperture: 0.025,
  },
  '50mm': {
    id: '50mm',
    label: '50mm',
    name: 'Spherical Prime',
    focalMm: 50,
    vFov: 27.0,
    tStop: 1.2,
    defaultRadius: 13.5,
    dofAperture: 0.035,
  },
  '85mm': {
    id: '85mm',
    label: '85mm',
    name: 'Portrait Medium Tele',
    focalMm: 85,
    vFov: 16.1,
    tStop: 1.2,
    defaultRadius: 10.2,
    dofAperture: 0.05,
  },
  '100mm-macro': {
    id: '100mm-macro',
    label: '100mm Macro',
    name: '1:1 Cinema Macro',
    focalMm: 100,
    vFov: 13.7,
    tStop: 2.0,
    defaultRadius: 3.8,
    dofAperture: 0.095,
  },
  '135mm': {
    id: '135mm',
    label: '135mm',
    name: 'Telephoto Prime',
    focalMm: 135,
    vFov: 10.2,
    tStop: 1.8,
    defaultRadius: 14.5,
    dofAperture: 0.065,
  },
  '200mm': {
    id: '200mm',
    label: '200mm',
    name: 'Long Telephoto',
    focalMm: 200,
    vFov: 6.9,
    tStop: 2.0,
    defaultRadius: 19.0,
    dofAperture: 0.075,
  },
  '300mm': {
    id: '300mm',
    label: '300mm',
    name: 'Super-Telephoto',
    focalMm: 300,
    vFov: 4.6,
    tStop: 2.8,
    defaultRadius: 28.0,
    dofAperture: 0.085,
  },
};

export interface CameraTelemetry {
  sphere: 'hq' | 'cde';
  focusedNodeId: string | null;
  distance: number;
  azimuthDeg: number;
  polarDeg: number;
  panOffset: [number, number, number];
  autoOrbit: boolean;
  turnSeconds: number;
  isMoving: boolean;
  lastCommand: string;
  webglActive?: boolean;
  interiorDomeActive?: boolean;
  focalLengthMm?: number;
  vFovDeg?: number;
  rollDeg?: number;
  activeLens?: CinemaLensId;
  activeAnglePreset?: CameraAnglePresetId | null;
  activeLoopMode?: CameraLoopMode;
}

export interface AnchoredLabel2D {
  id: string;
  label: string;
  sublabel?: string;
  colour: string;
  x: number;
  y: number;
  zDepth: number;
  isFocused: boolean;
  nodeType: 'core' | 'station' | 'dimension' | 'subdomain' | 'project';
}

export interface CameraCommandPayload {
  id: number;
  verb:
    | 'arrival'
    | 'switch_sphere'
    | 'focus_node'
    | 'orbit'
    | 'tilt'
    | 'pan'
    | 'zoom_in'
    | 'zoom_out'
    | 'max_in'
    | 'max_out'
    | 'scan'
    | 'fly_in'
    | 'fly_out'
    | 'center'
    | 'faster'
    | 'slower'
    | 'stop'
    | 'set_lens'
    | 'set_angle'
    | 'set_loop';
  targetSphere?: 'hq' | 'cde';
  targetNodeId?: string | null;
  deltaAzimuth?: number;
  deltaPolar?: number;
  deltaPanX?: number;
  deltaPanY?: number;
  lensId?: CinemaLensId;
  focalLengthMm?: number;
  anglePreset?: CameraAnglePresetId;
  loopMode?: CameraLoopMode;
}

export interface ProjectMediaTubeItem {
  index: number;
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  kind: 'image' | 'video' | 'pdf';
  aspect: '16:9' | '4:3' | '1:1' | 'A4';
  accentHex: string;
  url?: string;
}

export const PROJECT_MEDIA_TUBE_SPECS = {
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
} as const;

export function buildProjectMediaTubeItems(projectId: string): ProjectMediaTubeItem[] {
  const cleanProj = (projectId || 'SEVEN').toUpperCase();
  const baseKinds: Array<'image' | 'video' | 'pdf'> = ['image', 'video', 'pdf', 'image'];
  const baseAspects: Array<'16:9' | '4:3' | '1:1' | 'A4'> = ['16:9', '16:9', 'A4', '4:3'];
  const baseTitles = [
    `${cleanProj} · Hero Architectural Keyframe`,
    `${cleanProj} · Spatial Walkthrough Reel`,
    `${cleanProj} · Executive Deck & RACI Spec`,
    `${cleanProj} · Lighting & Material Study`,
    `${cleanProj} · Crowd Flow Simulation`,
    `${cleanProj} · Acoustic & AV Rig Cutaway`,
    `${cleanProj} · Masterplan Elevation Plate`,
    `${cleanProj} · Stakeholder Sign-off Dossier`,
  ];

  return Array.from({ length: PROJECT_MEDIA_TUBE_SPECS.maxMountedTiles }).map((_, idx) => {
    const kind = baseKinds[idx % baseKinds.length];
    const aspect = baseAspects[idx % baseAspects.length];
    const row = Math.floor(idx / PROJECT_MEDIA_TUBE_SPECS.columns) + 1;
    const col = (idx % PROJECT_MEDIA_TUBE_SPECS.columns) + 1;
    const accentHex =
      kind === 'video' ? '#F2B66D' : kind === 'pdf' ? '#9DB8D6' : '#65ACFF';
    return {
      index: idx,
      id: `tube-${cleanProj.toLowerCase()}-${String(idx + 1).padStart(2, '0')}`,
      projectId: cleanProj,
      title: `${baseTitles[idx % baseTitles.length]} (${row}.${col})`,
      subtitle: `${kind.toUpperCase()} · Row ${row} Col ${col} · ${aspect}`,
      kind,
      aspect,
      accentHex,
    };
  });
}

export interface MediaTubeStateProp {
  active: boolean;
  projectId: string;
  focusedTileIndex: number | null;
  filterKind?: 'all' | 'image' | 'video' | 'pdf';
}

export interface CosmographCanvasProps {
  activeSphere: 'hq' | 'cde';
  focusedNodeId: string | null;
  tourHighlightId: string | null;
  captionBubble: string | null;
  reducedMotion: boolean;
  audioRms?: number;
  forceWebglFallback?: boolean;
  cameraCommand: CameraCommandPayload | null;
  customDomains?: CustomDomain3D[];
  sphereMaterials?: { hq: DomainMaterialPreset; cde: DomainMaterialPreset };
  onSelectNode: (id: string, nodeType: AnchoredLabel2D['nodeType'], sphere: 'hq' | 'cde') => void;
  onUserTouchPauseTour: () => void;
  onTelemetryChange: (telemetry: CameraTelemetry) => void;
  onCameraSettled?: (commandId: number, telemetry: CameraTelemetry) => void;
  unobstructedRect?: GuiRect;
  guiCameraPreset?: GuiCameraPresetId;
  onProjectedTargetChange?: (target: ProjectedTargetScreenCoords | null) => void;
  onHoverNodeChange?: (nodeId: string | null) => void;
  mediaTubeState?: MediaTubeStateProp | null;
  onSelectMediaTubeTile?: (tileIndex: number, tile: ProjectMediaTubeItem) => void;
  onOpenMediaTubeFullView?: (tileOrIndex: ProjectMediaTubeItem | number, tile?: ProjectMediaTubeItem) => void;
  onCloseMediaTube?: () => void;
}

export const HQ_CENTER = new THREE.Vector3(0, 0, 0);
export const CDE_CENTER = new THREE.Vector3(38, 4, -22);

function unifiedEaseOut(t: number): number {
  return quinticSmootherstep(t);
}

function getProjectHealthColour(health: ProjectHealth): string {
  if (health === 'On track') return COLOUR_TOKENS.healthOnTrack;
  if (health === 'At risk') return COLOUR_TOKENS.healthAtRisk;
  return COLOUR_TOKENS.healthBlocked;
}

const _scratchVec = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchRight = new THREE.Vector3();
const _scratchUp = new THREE.Vector3();
const _scratchForward = new THREE.Vector3();
const _scratchColor = new THREE.Color();

/**
 * Post-Processing Custom Cinema ShaderPass (v4.0):
 * - 2.5% monochromatic grain updated at 24Hz (paused when stopped or reduced-motion)
 * - 0% radial chromatic aberration (keeps UI & 3D text razor sharp)
 * - Controlled dark navy vignette (#05090E, strength 0.14)
 */
const CinemaFilmGrainVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uGrainIntensity: { value: 0.025 },
    uChromaticAmount: { value: 0.0 },
    uVignetteStrength: { value: 0.14 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainIntensity;
    uniform float uChromaticAmount;
    uniform float uVignetteStrength;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      vec4 baseCol = texture2D(tDiffuse, vUv);

      // Controlled dark navy vignette (#05090E, v4.0 strength 0.14)
      float vig = smoothstep(0.34, 0.88, dist);
      vec3 navyVignette = vec3(0.0196, 0.0353, 0.0549);
      vec3 graded = mix(baseCol.rgb, navyVignette, vig * uVignetteStrength);

      // 2.5% monochromatic film grain quantized at 24Hz
      float quantizedTime = floor(uTime * 24.0) / 24.0;
      float grain = (hash12(vUv * 512.0 + vec2(quantizedTime * 37.0, -quantizedTime * 23.0)) - 0.5) * uGrainIntensity;
      graded += vec3(grain);

      gl_FragColor = vec4(clamp(graded, 0.0, 1.0), baseCol.a);
    }
  `,
};

/**
 * 6,400-Particle Multi-Layer Spiral Galaxy with GPU Bokeh (`buildLiquidGlassGalaxySphere`):
 * Populates a sphere with a 4-arm, 3-layer spiral galaxy (3,200 particles per sphere on GPU,
 * 1,600 on software rasterizers) using a custom THREE.ShaderMaterial vertex/fragment shader
 * that computes real-time Depth-of-Field (DOF) bokeh disc diffusion relative to uFocalDistance.
 */
function buildLiquidGlassGalaxySphere(
  parentGroup: THREE.Group,
  sphereTag: 'hq' | 'cde',
  isSoftwareGl: boolean
): { points: THREE.Points; uniforms: { uTime: { value: number }; uFocalDistance: { value: number }; uAudioRms: { value: number } } } {
  const particleCount = isSoftwareGl ? 1600 : 3200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const phases = new Float32Array(particleCount);

  const paletteHex =
    sphereTag === 'hq'
      ? [
          '#B4DDFF',
          '#4C8DFF',
          '#65ACFF',
          '#5CC8D7',
          '#7CE0B8',
          '#9DB8D6',
        ]
      : [
          '#F2B66D',
          '#FFF1D4',
          '#B4DDFF',
          '#5CC8D7',
          '#7CE0B8',
          '#4C8DFF',
        ];

  const arms = 4;
  for (let i = 0; i < particleCount; i++) {
    const layer = i % 3; // 3-layer vertical thickness & orbital stratification
    const armIndex = i % arms;
    const t = Math.pow((i / particleCount), 0.78);
    const radius = 1.15 + t * 6.55;
    const spinAngle = radius * 1.15 + (armIndex * Math.PI * 2) / arms;

    //Deterministic golden-ratio scatter
    const rand1 = ((i * 1.6180339887) % 1) * 2 - 1;
    const rand2 = ((i * 2.4142135623) % 1) * 2 - 1;
    const rand3 = ((i * 3.1415926535) % 1) * 2 - 1;

    const layerSpreadY = layer === 0 ? 0.55 : layer === 1 ? 1.85 : 3.65;
    const armSpread = (0.28 + radius * 0.085) * rand1;

    const x = Math.cos(spinAngle + armSpread) * radius + rand2 * 0.25;
    const z = Math.sin(spinAngle + armSpread) * radius + rand1 * 0.25;
    const y = rand3 * layerSpreadY * (1 - t * 0.38);

    // Clamp strictly inside the 7.8u interior of the 8.2u liquid glass sphere
    const vLen = Math.hypot(x, y, z);
    const scaleClamp = vLen > 7.65 ? 7.65 / vLen : 1.0;

    positions[i * 3] = x * scaleClamp;
    positions[i * 3 + 1] = y * scaleClamp;
    positions[i * 3 + 2] = z * scaleClamp;

    _scratchColor.set(paletteHex[i % paletteHex.length]);
    colors[i * 3] = _scratchColor.r;
    colors[i * 3 + 1] = _scratchColor.g;
    colors[i * 3 + 2] = _scratchColor.b;

    sizes[i] = (layer === 0 ? 15.0 : layer === 1 ? 11.5 : 8.5) * (0.65 + 0.55 * Math.abs(rand2));
    phases[i] = (i * 0.73) % (Math.PI * 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime: { value: 0.0 },
    uFocalDistance: { value: 18.0 },
    uAudioRms: { value: 0.0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute vec3 customColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uFocalDistance;
      uniform float uAudioRms;
      varying vec3 vColor;
      varying float vBokehBlur;
      varying float vTwinkle;

      void main() {
        vColor = customColor;
        // Subtle 4-arm differential galactic drift
        float r = length(position.xz);
        float angleDelta = uTime * (0.045 / max(0.8, r * 0.45));
        float ca = cos(angleDelta);
        float sa = sin(angleDelta);
        vec3 pos = vec3(
          position.x * ca - position.z * sa,
          position.y + sin(uTime * 0.9 + aPhase) * 0.06,
          position.x * sa + position.z * ca
        );

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float viewDist = -mvPosition.z;

        // Real-time Depth-of-Field (DOF) circle-of-confusion relative to uFocalDistance
        float coc = clamp(abs(viewDist - uFocalDistance) / 9.5, 0.0, 1.0);
        vBokehBlur = coc;
        vTwinkle = 0.72 + 0.28 * sin(uTime * 2.1 + aPhase) + uAudioRms * 0.45;

        float bokehExpand = 1.0 + coc * 1.85 + uAudioRms * 0.35;
        gl_PointSize = clamp((aSize * bokehExpand) * (18.0 / max(2.5, viewDist)), 2.0, 34.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vBokehBlur;
      varying float vTwinkle;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;

        // Sharp crystalline core when on focal plane; soft Gaussian bokeh disc with subtle ring when out-of-focus
        float sharpStar = exp(-d * d * 7.5);
        float softBokeh = smoothstep(1.0, 0.15, d) * (0.55 + 0.45 * smoothstep(0.45, 0.82, d));
        float profile = mix(sharpStar, softBokeh, vBokehBlur);
        float alpha = profile * mix(0.88, 0.34, vBokehBlur) * vTwinkle;

        gl_FragColor = vec4(vColor * (1.05 + (1.0 - vBokehBlur) * 0.35), clamp(alpha, 0.0, 0.92));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.renderOrder = 1;
  parentGroup.add(points);
  return { points, uniforms };
}

export const CosmographCanvas: React.FC<CosmographCanvasProps> = ({
  activeSphere,
  focusedNodeId,
  tourHighlightId,
  captionBubble,
  reducedMotion,
  audioRms = 0,
  forceWebglFallback = false,
  cameraCommand,
  customDomains = [],
  sphereMaterials = { hq: 'cobalt-glass', cde: 'amber-crystal' },
  onSelectNode,
  onUserTouchPauseTour,
  onTelemetryChange,
  onCameraSettled,
  unobstructedRect,
  guiCameraPreset,
  onProjectedTargetChange,
  onHoverNodeChange,
  mediaTubeState = null,
  onSelectMediaTubeTile,
  onOpenMediaTubeFullView,
  onCloseMediaTube,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [labels2D, setLabels2D] = useState<AnchoredLabel2D[]>([]);
  const [webglStatus, setWebglStatus] = useState<'ACTIVE' | 'CONTEXT_LOST' | 'FALLBACK'>('ACTIVE');
  const [webglReason, setWebglReason] = useState<string>('');
  const [touchIndicator, setTouchIndicator] = useState<{
    active: boolean;
    x: number;
    y: number;
    mode: 'touch' | 'orbit-drag' | 'pinch' | 'pan';
  }>({ active: false, x: 0, y: 0, mode: 'touch' });

  const callbacksRef = useRef({
    onSelectNode,
    onUserTouchPauseTour,
    onTelemetryChange,
    onCameraSettled,
    onProjectedTargetChange,
    onHoverNodeChange,
    onSelectMediaTubeTile,
    onOpenMediaTubeFullView,
    onCloseMediaTube,
  });
  callbacksRef.current = {
    onSelectNode,
    onUserTouchPauseTour,
    onTelemetryChange,
    onCameraSettled,
    onProjectedTargetChange,
    onHoverNodeChange,
    onSelectMediaTubeTile,
    onOpenMediaTubeFullView,
    onCloseMediaTube,
  };

  const mediaTubeStateRef = useRef<MediaTubeStateProp | null>(mediaTubeState);
  mediaTubeStateRef.current = mediaTubeState;

  const unobstructedRectRef = useRef<GuiRect | undefined>(unobstructedRect);
  unobstructedRectRef.current = unobstructedRect;

  const stateRef = useRef({
    activeSphere,
    focusedNodeId,
    tourHighlightId,
    HoveredNodeId: null as string | null,
    reducedMotion,
    audioRms: 0,
    targetCenter: new THREE.Vector3(0, 0, 0),
    currentCenter: new THREE.Vector3(0, 0, 0),
    azimuth: -0.35,
    polar: 1.32,
    radius: 21.5,
    targetAzimuth: 0.12,
    targetPolar: 1.42,
    targetRadius: 19.0,
    panOffset: new THREE.Vector3(0, 0, 0),
    targetPanOffset: new THREE.Vector3(0, 0, 0),
    focalLengthMm: 35,
    targetFocalLengthMm: 35,
    cameraRollDeg: 0,
    targetRollDeg: 0,
    activeLensId: '35mm' as CinemaLensId,
    activeAnglePreset: null as CameraAnglePresetId | null,
    activeLoopMode: 'off' as CameraLoopMode,
    autoOrbit: false,
    stoppedExplicitly: false,
    turnSeconds: 40,
    currentAngularVel: 0.026,
    flightActive: true,
    flightStartTime: performance.now(),
    flightDurationMs: 2200,
    flightCurve: null as THREE.CatmullRomCurve3 | null,
    flightLookAtCurve: null as THREE.CatmullRomCurve3 | null,
    flightIsInterSphere: false,
    flightStartFocalMm: 35,
    flightEndFocalMm: 35,
    flightRollDir: 1,
    cometPoints: [] as THREE.Vector3[],
    lastCommandName: 'arrival',
    lastCommandId: 1,
    settledCommandId: 0,
    stableArrivalFrames: 0,
    tubeRotationY: 0,
    tubeAngularVel: 0.025,
    tubeHoveredTileIdx: null as number | null,
  });

  stateRef.current.activeSphere = activeSphere;
  stateRef.current.focusedNodeId = focusedNodeId;
  stateRef.current.tourHighlightId = tourHighlightId;
  stateRef.current.reducedMotion = reducedMotion;
  stateRef.current.audioRms = audioRms;

  const nodeRegistryRef = useRef<
    Map<
      string,
      {
        id: string;
        canonicalId: string;
        label: string;
        sublabel?: string;
        colour: string;
        sphere: 'hq' | 'cde';
        worldPos: THREE.Vector3;
        baseScale: number;
        nodeType: AnchoredLabel2D['nodeType'];
        connectedIds: Set<string>;
        currentBrightness: number;
        groupMesh?: THREE.Group;
        haloMesh?: THREE.Mesh;
        emissiveMats: THREE.MeshStandardMaterial[];
        wireMat?: THREE.LineBasicMaterial;
      }
    >
  >(new Map());

  const resolveNodeEntry = (nodeId: string, preferredSphere: 'hq' | 'cde') => {
    if (preferredSphere === 'cde' && nodeRegistryRef.current.has(`cde-proj-${nodeId}`)) {
      return nodeRegistryRef.current.get(`cde-proj-${nodeId}`);
    }
    return nodeRegistryRef.current.get(nodeId);
  };

  const buildCurrentTelemetry = (s = stateRef.current): CameraTelemetry => ({
    sphere: s.activeSphere,
    focusedNodeId: s.focusedNodeId,
    distance: Number(s.radius.toFixed(1)),
    azimuthDeg: Math.round(THREE.MathUtils.radToDeg(s.azimuth)),
    polarDeg: Math.round(THREE.MathUtils.radToDeg(s.polar)),
    panOffset: [
      Number(s.panOffset.x.toFixed(2)),
      Number(s.panOffset.y.toFixed(2)),
      Number(s.panOffset.z.toFixed(2)),
    ],
    autoOrbit: s.autoOrbit,
    turnSeconds: s.turnSeconds,
    isMoving:
      s.flightActive ||
      s.activeLoopMode !== 'off' ||
      Math.abs(s.targetAzimuth - s.azimuth) > 0.015 ||
      Math.abs(s.targetPolar - s.polar) > 0.015 ||
      Math.abs(s.targetRadius - s.radius) > 0.04 ||
      s.panOffset.distanceTo(s.targetPanOffset) > 0.02,
    lastCommand: s.lastCommandName,
    webglActive: webglStatus === 'ACTIVE' && !forceWebglFallback,
    interiorDomeActive: s.radius < 8.2,
    focalLengthMm: Math.round(s.focalLengthMm),
    vFovDeg: Number(focalLengthToVFov(s.focalLengthMm).toFixed(1)),
    rollDeg: Number(s.cameraRollDeg.toFixed(1)),
    activeLens: s.activeLensId,
    activeAnglePreset: s.activeAnglePreset,
    activeLoopMode: s.activeLoopMode,
  });

  useEffect(() => {
    if (!cameraCommand) return;
    const s = stateRef.current;
    const now = performance.now();
    const {
      id,
      verb,
      targetSphere,
      targetNodeId,
      deltaAzimuth,
      deltaPolar,
      deltaPanX,
      deltaPanY,
      lensId,
      focalLengthMm,
      anglePreset,
      loopMode,
    } = cameraCommand;
    s.lastCommandName = verb;
    s.lastCommandId = id;

    const triggerCometFlight = (
      destCenter: THREE.Vector3,
      destAz: number,
      destPol: number,
      destRad: number,
      durationMs: number,
      isInterSphere = false,
      destFocalMm?: number
    ) => {
      s.stoppedExplicitly = false;
      s.targetCenter.copy(destCenter);
      const shortestDeltaAz = Math.atan2(
        Math.sin(destAz - s.azimuth),
        Math.cos(destAz - s.azimuth)
      );
      s.targetAzimuth = s.azimuth + shortestDeltaAz;
      s.targetPolar = THREE.MathUtils.clamp(destPol, 0.12, Math.PI - 0.12);
      s.targetRadius = THREE.MathUtils.clamp(destRad, 3.2, 38.0);
      if (destFocalMm !== undefined) {
        s.targetFocalLengthMm = destFocalMm;
      }

      // Synchronize Technocrane Flight Whoosh with camera spline velocity & stereo pan direction
      const panDir = Math.sign(shortestDeltaAz || (destCenter.x - s.currentCenter.x));
      soundEngine.triggerFlightWhoosh(durationMs, panDir);

      if (s.reducedMotion || webglStatus !== 'ACTIVE' || forceWebglFallback) {
        s.currentCenter.copy(s.targetCenter);
        s.azimuth = s.targetAzimuth;
        s.polar = s.targetPolar;
        s.radius = s.targetRadius;
        s.focalLengthMm = s.targetFocalLengthMm;
        s.cameraRollDeg = s.targetRollDeg;
        s.panOffset.copy(s.targetPanOffset);
        s.flightActive = false;
        s.flightLookAtCurve = null;
        s.flightIsInterSphere = false;
        s.settledCommandId = id;
        const tel = buildCurrentTelemetry(s);
        callbacksRef.current.onTelemetryChange(tel);
        callbacksRef.current.onCameraSettled?.(id, tel);
        return;
      }

      const startCam = new THREE.Vector3(
        s.currentCenter.x + s.panOffset.x + s.radius * Math.sin(s.polar) * Math.sin(s.azimuth),
        s.currentCenter.y + s.panOffset.y + s.radius * Math.cos(s.polar),
        s.currentCenter.z + s.panOffset.z + s.radius * Math.sin(s.polar) * Math.cos(s.azimuth)
      );
      const endCam = new THREE.Vector3(
        s.targetCenter.x +
          s.targetPanOffset.x +
          s.targetRadius * Math.sin(s.targetPolar) * Math.sin(s.targetAzimuth),
        s.targetCenter.y + s.targetPanOffset.y + s.targetRadius * Math.cos(s.targetPolar),
        s.targetCenter.z +
          s.targetPanOffset.z +
          s.targetRadius * Math.sin(s.targetPolar) * Math.cos(s.targetAzimuth)
      );

      if (isInterSphere) {
        // 4-Phase Inter-World Travel (HQ [0,0,0] <-> CDE [38,4,-22]):
        // 5-control-point CatmullRomCurve3 (Start -> Pull-back crane rise -> Bridge apex (19, 7.2, -4.5) -> Destination approach -> Settle)
        const bridgeApex = new THREE.Vector3(19.0, 7.2, -4.5);
        const cranePullback = startCam
          .clone()
          .lerp(bridgeApex, 0.34)
          .add(new THREE.Vector3(0, 2.8, 3.6));
        const destApproach = bridgeApex
          .clone()
          .lerp(endCam, 0.66)
          .add(new THREE.Vector3(0, 1.8, 2.6));

        s.flightCurve = new THREE.CatmullRomCurve3([
          startCam,
          cranePullback,
          bridgeApex,
          destApproach,
          endCam,
        ]);

        // Separate 4-point CatmullRomCurve3 for lookAt target
        const startLookAt = s.currentCenter.clone().add(s.panOffset);
        const endLookAt = destCenter.clone().add(s.targetPanOffset);
        const lookMid1 = startLookAt.clone().lerp(new THREE.Vector3(19.0, 2.2, -11.0), 0.48);
        const lookMid2 = new THREE.Vector3(19.0, 2.0, -11.0).lerp(endLookAt, 0.52);
        s.flightLookAtCurve = new THREE.CatmullRomCurve3([
          startLookAt,
          lookMid1,
          lookMid2,
          endLookAt,
        ]);

        s.flightIsInterSphere = true;
        s.flightStartFocalMm = s.focalLengthMm;
        s.flightEndFocalMm = destFocalMm ?? 35;
        s.flightRollDir = destCenter.x >= s.currentCenter.x ? -1 : 1;
      } else {
        const midCam = startCam.clone().lerp(endCam, 0.5);
        midCam.y += 2.6;
        midCam.z += 3.8;
        s.flightCurve = new THREE.CatmullRomCurve3([startCam, midCam, endCam]);
        s.flightLookAtCurve = null;
        s.flightIsInterSphere = false;
      }

      s.flightStartTime = now;
      s.flightDurationMs = durationMs;
      s.flightActive = true;
    };

    if (verb === 'switch_sphere') {
      const destSphere = targetSphere || s.activeSphere;
      const center = destSphere === 'cde' ? CDE_CENTER : HQ_CENTER;
      s.activeLoopMode = 'off';
      s.targetRollDeg = 0;
      s.activeLensId = '35mm';
      s.targetPanOffset.set(0, 0, 0);
      triggerCometFlight(center, 0.18, 1.38, 19.0, 1650, true, 35);
    } else if (verb === 'focus_node' && targetNodeId) {
      const sphereHint = targetSphere || s.activeSphere;
      const node = resolveNodeEntry(targetNodeId, sphereHint);
      if (node) {
        const sphereCenter = node.sphere === 'cde' ? CDE_CENTER : HQ_CENTER;
        const localVec = node.worldPos.clone().sub(sphereCenter);
        const r = Math.max(0.1, localVec.length());
        const pol = Math.acos(THREE.MathUtils.clamp(localVec.y / r, -1, 1));
        const az = Math.atan2(localVec.x, localVec.z);
        s.targetPanOffset.copy(localVec).multiplyScalar(0.22);
        const isCrossingSpheres = sphereCenter.distanceTo(s.currentCenter) > 10;
        triggerCometFlight(sphereCenter, az, pol, 12.8, isCrossingSpheres ? 1450 : 950, isCrossingSpheres);
      }
    } else if (verb === 'center' || verb === 'arrival') {
      const center = (targetSphere || s.activeSphere) === 'cde' ? CDE_CENTER : HQ_CENTER;
      s.activeLoopMode = 'off';
      s.activeAnglePreset = null;
      s.targetRollDeg = 0;
      s.activeLensId = '35mm';
      s.targetFocalLengthMm = 35;
      s.targetPanOffset.set(0, 0, 0);
      triggerCometFlight(center, 0.12, 1.42, 19.0, 1100);
    } else if (verb === 'set_lens') {
      s.stoppedExplicitly = false;
      s.flightActive = false;
      s.activeLoopMode = 'off';
      const chosenId: CinemaLensId =
        lensId && CINEMA_LENS_PRESETS[lensId] ? lensId : '35mm';
      const preset = CINEMA_LENS_PRESETS[chosenId];
      s.activeLensId = preset.id;
      s.targetFocalLengthMm = focalLengthMm ?? preset.focalMm;
      s.targetRadius = preset.defaultRadius;
      if (preset.id === '100mm-macro') {
        const activeId = s.focusedNodeId || s.tourHighlightId;
        const node = activeId ? resolveNodeEntry(activeId, s.activeSphere) : null;
        if (node) {
          const sphereCenter = node.sphere === 'cde' ? CDE_CENTER : HQ_CENTER;
          const localVec = node.worldPos.clone().sub(sphereCenter);
          s.targetPanOffset.copy(localVec);
        } else {
          s.targetPanOffset.set(0, 0, 0);
        }
      } else if (preset.id === '5mm') {
        s.targetPanOffset.set(0, 0, 0);
        s.targetPolar = 1.57;
      }
      soundEngine.triggerFlightWhoosh(520, 0);
    } else if (verb === 'set_angle' && anglePreset) {
      s.stoppedExplicitly = false;
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.activeAnglePreset = anglePreset;
      const activeId = s.focusedNodeId || s.tourHighlightId;
      const focusedNode = activeId ? resolveNodeEntry(activeId, s.activeSphere) : null;
      const sphereCenter = s.activeSphere === 'cde' ? CDE_CENTER : HQ_CENTER;
      let nodeAz = s.azimuth;
      if (focusedNode) {
        const lv = focusedNode.worldPos.clone().sub(sphereCenter);
        nodeAz = Math.atan2(lv.x, lv.z);
      }

      switch (anglePreset) {
        case 'gods_eye':
          s.targetPolar = 0.14;
          s.targetAzimuth = 0.0;
          s.targetRollDeg = 0;
          s.targetFocalLengthMm = 24;
          s.activeLensId = '24mm';
          s.targetRadius = 22.0;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'high_crane':
          s.targetPolar = 0.84;
          s.targetAzimuth = 0.42;
          s.targetRollDeg = -2.5;
          s.targetFocalLengthMm = 35;
          s.activeLensId = '35mm';
          s.targetRadius = 19.0;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'eye_horizon':
          s.targetPolar = 1.57;
          s.targetAzimuth = 0.21;
          s.targetRollDeg = 0;
          s.targetFocalLengthMm = 50;
          s.activeLensId = '50mm';
          s.targetRadius = 15.5;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'low_hero':
          s.targetPolar = 2.06;
          s.targetAzimuth = -0.31;
          s.targetRollDeg = 1.8;
          s.targetFocalLengthMm = 24;
          s.activeLensId = '24mm';
          s.targetRadius = 12.5;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'nadir_up':
          s.targetPolar = 2.83;
          s.targetAzimuth = 0.79;
          s.targetRollDeg = 0;
          s.targetFocalLengthMm = 14;
          s.activeLensId = '14mm';
          s.targetRadius = 14.0;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'dutch_cant':
          s.targetPolar = 1.19;
          s.targetAzimuth = -0.56;
          s.targetRollDeg = 14.0;
          s.targetFocalLengthMm = 35;
          s.activeLensId = '35mm';
          s.targetRadius = 13.8;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'ots_core':
          s.targetPolar = 1.43;
          s.targetAzimuth = nodeAz + 0.28;
          s.targetRollDeg = -1.5;
          s.targetFocalLengthMm = 85;
          s.activeLensId = '85mm';
          s.targetRadius = 10.4;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'macro_close':
          s.targetFocalLengthMm = 100;
          s.activeLensId = '100mm-macro';
          s.targetRadius = 3.8;
          s.targetRollDeg = 0;
          if (focusedNode) {
            s.targetPanOffset.copy(focusedNode.worldPos.clone().sub(sphereCenter));
          } else {
            s.targetPanOffset.set(0, 0, 0);
          }
          break;
        case 'interior_dome':
          s.targetPolar = 1.57;
          s.targetFocalLengthMm = 5;
          s.activeLensId = '5mm';
          s.targetRadius = 4.2;
          s.targetRollDeg = 0;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'tele_bridge':
          s.targetPolar = 1.54;
          s.targetAzimuth = -1.50;
          s.targetFocalLengthMm = 300;
          s.activeLensId = '300mm';
          s.targetRadius = 34.0;
          s.targetRollDeg = 0;
          s.targetPanOffset.set(0, 0, 0);
          break;
      }
      soundEngine.triggerFlightWhoosh(640, 0);
    } else if (verb === 'set_loop') {
      s.stoppedExplicitly = false;
      s.flightActive = false;
      s.activeLoopMode = loopMode || 'off';
      if (s.activeLoopMode === 'off') {
        s.targetRollDeg = 0;
      } else {
        if (s.activeLoopMode === 'macro_orbit') {
          s.activeLensId = '100mm-macro';
          s.targetFocalLengthMm = 100;
          s.targetRadius = 3.8;
          s.targetRollDeg = 3.5;
        }
        soundEngine.triggerFlightWhoosh(720, 0);
      }
    } else if (verb === 'orbit') {
      s.stoppedExplicitly = false;
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.targetAzimuth += deltaAzimuth ?? 0.55;
      if (deltaPolar !== undefined) {
        s.targetPolar = THREE.MathUtils.clamp(
          s.targetPolar + deltaPolar,
          0.12,
          Math.PI - 0.12
        );
      }
    } else if (verb === 'tilt') {
      s.stoppedExplicitly = false;
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.targetPolar = THREE.MathUtils.clamp(
        s.targetPolar + (deltaPolar ?? -0.28),
        0.12,
        Math.PI - 0.12
      );
    } else if (verb === 'pan') {
      // True Camera-Local Pan: shifts targetPanOffset along camera right/up vectors; never alters rotation speed
      s.flightActive = false;
      s.activeLoopMode = 'off';
      const dx = deltaPanX ?? 2.4;
      const dy = deltaPanY ?? 1.2;

      _scratchForward
        .set(
          -Math.sin(s.polar) * Math.sin(s.azimuth),
          -Math.cos(s.polar),
          -Math.sin(s.polar) * Math.cos(s.azimuth)
        )
        .normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);
      _scratchRight.crossVectors(_scratchForward, worldUp).normalize();
      _scratchUp.crossVectors(_scratchRight, _scratchForward).normalize();

      s.targetPanOffset
        .addScaledVector(_scratchRight, dx)
        .addScaledVector(_scratchUp, dy);
    } else if (verb === 'zoom_in' || verb === 'fly_in') {
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.targetRadius = THREE.MathUtils.clamp(s.targetRadius - 3.6, 3.2, 38.0);
      soundEngine.triggerFlightWhoosh(520, 0);
    } else if (verb === 'zoom_out' || verb === 'fly_out') {
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.targetRadius = THREE.MathUtils.clamp(s.targetRadius + 3.6, 3.2, 38.0);
      soundEngine.triggerFlightWhoosh(520, 0);
    } else if (verb === 'max_in') {
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.targetRadius = 6.2; // Enters Interior Planetary Dome Mode (< 8.2u)
      soundEngine.triggerFlightWhoosh(680, 0);
    } else if (verb === 'max_out') {
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.targetRadius = 32.0;
    } else if (verb === 'scan') {
      s.stoppedExplicitly = false;
      s.autoOrbit = true;
      s.turnSeconds = 20;
    } else if (verb === 'faster') {
      s.stoppedExplicitly = false;
      s.autoOrbit = true;
      const steps = [40, 24, 14, 8, 4];
      const nextStep = steps.find((st) => st < s.turnSeconds) ?? 4;
      s.turnSeconds = nextStep;
    } else if (verb === 'slower') {
      s.stoppedExplicitly = false;
      s.autoOrbit = true;
      const steps = [4, 8, 14, 24, 40];
      const nextStep = steps.find((st) => st > s.turnSeconds) ?? 40;
      s.turnSeconds = nextStep;
    } else if (verb === 'stop') {
      // Hard Stop Pose Freeze: halt auto-orbit, cancel ongoing loop & flight, zero velocity, and lock targets to current pose
      s.stoppedExplicitly = true;
      s.autoOrbit = false;
      s.activeLoopMode = 'off';
      s.flightActive = false;
      s.flightCurve = null;
      s.flightLookAtCurve = null;
      s.flightIsInterSphere = false;
      s.currentAngularVel = 0;
      s.targetAzimuth = s.azimuth;
      s.targetPolar = s.polar;
      s.targetRadius = s.radius;
      s.targetFocalLengthMm = s.focalLengthMm;
      s.targetRollDeg = s.cameraRollDeg;
      s.targetCenter.copy(s.currentCenter);
      s.targetPanOffset.copy(s.panOffset);
      s.settledCommandId = id;
      const tel = buildCurrentTelemetry(s);
      callbacksRef.current.onTelemetryChange(tel);
      callbacksRef.current.onCameraSettled?.(id, tel);
      return;
    }

    // In reduced motion or fallback mode, settle immediately
    if (s.reducedMotion || webglStatus !== 'ACTIVE' || forceWebglFallback) {
      s.currentCenter.copy(s.targetCenter);
      s.panOffset.copy(s.targetPanOffset);
      s.azimuth = s.targetAzimuth;
      s.polar = s.targetPolar;
      s.radius = s.targetRadius;
      s.focalLengthMm = s.targetFocalLengthMm;
      s.cameraRollDeg = s.targetRollDeg;
      s.flightActive = false;
      s.flightLookAtCurve = null;
      s.flightIsInterSphere = false;
      s.settledCommandId = id;
      const tel = buildCurrentTelemetry(s);
      callbacksRef.current.onTelemetryChange(tel);
      callbacksRef.current.onCameraSettled?.(id, tel);
    }
  }, [cameraCommand, forceWebglFallback, webglStatus]);

  useEffect(() => {
    const s = stateRef.current;
    if (s.stoppedExplicitly || s.flightActive) return;
    const sphereCenter = activeSphere === 'cde' ? CDE_CENTER : HQ_CENTER;
    if (focusedNodeId) {
      const node = resolveNodeEntry(focusedNodeId, activeSphere);
      if (node) {
        const localVec = node.worldPos.clone().sub(sphereCenter);
        const r = Math.max(0.1, localVec.length());
        s.targetPolar = THREE.MathUtils.clamp(
          Math.acos(THREE.MathUtils.clamp(localVec.y / r, -1, 1)),
          0.35,
          Math.PI - 0.35
        );
        s.targetAzimuth = Math.atan2(localVec.x, localVec.z);
        s.targetRadius = 13.2;
      }
    } else {
      s.targetRadius = 19.0;
    }
    s.targetCenter.copy(sphereCenter);
  }, [activeSphere, focusedNodeId]);

  // Synchronize 4 canonical GUI camera presets (universe 28mm, approach 35mm, focused 50mm, detail 85mm) & unobstructed viewport fitting
  useEffect(() => {
    if (!guiCameraPreset) return;
    const s = stateRef.current;
    if (s.stoppedExplicitly) return;
    const spec = GUI_CAMERA_PRESETS[guiCameraPreset];
    if (!spec) return;
    s.targetFocalLengthMm = spec.focalMm;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const safeRect: GuiRect = unobstructedRect ?? {
      id: 'centerSafe',
      x: 384,
      y: 96,
      w: Math.max(320, vw - 768),
      h: Math.max(280, vh - 226),
    };
    const fittedDist = computeFittedCameraDistance({
      sphereRadius: 6.2,
      preset: spec,
      viewportW: vw,
      viewportH: vh,
      unobstructedRect: safeRect,
    });
    if (!s.flightActive) {
      s.targetRadius = fittedDist;
    }
  }, [guiCameraPreset, unobstructedRect?.w, unobstructedRect?.h]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Probe WebGL support safely
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl =
        probeCanvas.getContext('webgl2') ||
        probeCanvas.getContext('webgl') ||
        probeCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglStatus('FALLBACK');
        setWebglReason('WebGL context unavailable on this device/browser.');
        return;
      }
      if ('getExtension' in gl) {
        const webgl = gl as WebGLRenderingContext;
        const ext = webgl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : webgl.RENDERER;
        const gpu = String(webgl.getParameter(param));
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
        webgl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch (err) {
      setWebglStatus('FALLBACK');
      setWebglReason(err instanceof Error ? err.message : 'WebGL probe failed');
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch (err) {
      setWebglStatus('FALLBACK');
      setWebglReason(err instanceof Error ? err.message : 'WebGLRenderer initialization failed');
      return;
    }

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x101D27, 1);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initW, initH);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    setWebglStatus('ACTIVE');

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';
    domEl.style.cursor = 'grab';

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglStatus('CONTEXT_LOST');
      setWebglReason('WebGL context lost — Reduced-graphics spatial view active.');
    };

    const handleContextRestored = () => {
      setWebglStatus('ACTIVE');
      setWebglReason('');
    };

    domEl.addEventListener('webglcontextlost', handleContextLost, false);
    domEl.addEventListener('webglcontextrestored', handleContextRestored, false);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x101D27, 0.015);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(46, initW / initH, 0.1, 200);

    // Post-Processing Cinema Pipeline (EffectComposer + RenderPass + UnrealBloomPass + Custom FilmGrain/CA/Vignette ShaderPass)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let cinemaPass: ShaderPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      // Selective high-threshold bloom (v4.0: strength: 0.24, radius: 0.35, threshold: 0.9)
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(initW, initH),
        0.24,
        0.35,
        0.9
      );
      composer.addPass(bloomPass);

      cinemaPass = new ShaderPass(CinemaFilmGrainVignetteShader);
      cinemaPass.renderToScreen = true;
      composer.addPass(cinemaPass);
    }

    // Locked Three-Point Cinema Rig ("THE SET"):
    // 1. Deep slate ambient fill (#142632, intensity 1.4)
    const ambientFill = new THREE.AmbientLight(0x142632, 1.4);
    scene.add(ambientFill);

    // 2. Cool ivory key light (#F2F6F8, intensity 1.6 at [16, 22, 20])
    const keyLight = new THREE.DirectionalLight(0xF2F6F8, 1.6);
    keyLight.position.set(16, 22, 20);
    scene.add(keyLight);

    // 3. Cobalt rim back-light (#65ACFF, intensity 1.25 at [-18, -14, -16])
    const rimLight = new THREE.DirectionalLight(0x65ACFF, 1.25);
    rimLight.position.set(-18, -14, -16);
    scene.add(rimLight);

    const glassUniforms = {
      uTime: { value: 0 },
      uAudioRms: { value: 0 },
      uInteriorDome: { value: 0 },
    };

    const pulseBeads: {
      mesh: THREE.Mesh;
      curve: THREE.Curve<THREE.Vector3>;
      speed: number;
      offset: number;
    }[] = [];

    const cardiacTubes: {
      uniforms: {
        uTime: { value: number };
        uDimFactor: { value: number };
      };
      nodeA: string;
      nodeB: string;
    }[] = [];

    const buildSphereAssembly = (
      center: THREE.Vector3,
      sphereTag: 'hq' | 'cde',
      coreColour: string
    ) => {
      const root = new THREE.Group();
      root.position.copy(center);

      const shellGroup = new THREE.Group();
      // Sphere 01 (HQ) & Sphere 02 (CDE): radius 6.2u per Wireframes v1.1 spec
      const shellGeo = new THREE.SphereGeometry(6.2, 56, 40);

      const isHq = sphereTag === 'hq';
      const matPreset = isHq ? sphereMaterials.hq : sphereMaterials.cde;
      const matColors = getDomainMaterialColors(matPreset);
      const primaryShellColor = isHq ? '#4C8DFF' : '#F2B66D';
      const primaryRimColor = isHq ? '#B4DDFF' : '#FFF1D4';
      const resolvedShellHex =
        (isHq && matPreset === 'cobalt-glass') || (!isHq && matPreset === 'amber-crystal')
          ? primaryShellColor
          : matColors.shellHex;
      const resolvedRimHex =
        (isHq && matPreset === 'cobalt-glass') || (!isHq && matPreset === 'amber-crystal')
          ? primaryRimColor
          : matColors.rimHex;

      // 1. BackSide Inner Refraction & Interior Planetary Dome Shell
      const backShellMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(isHq ? '#132836' : '#2A1F14'),
        transmission: isSoftwareGl ? 0 : 0.78,
        transparent: true,
        opacity: isSoftwareGl ? 0.14 : 0.54,
        roughness: 0.16,
        metalness: 0.06,
        ior: 1.48,
        thickness: 1.4,
        side: THREE.BackSide,
        depthWrite: false,
        wireframe: matColors.wireframeOnly,
      });

      // 2. FrontSide Outer Chromatic Fresnel Caustic Shell
      // Sphere 01 (CEREBRO HQ): Cool Cobalt Refractive Liquid Glass (#4C8DFF, roughness: 0.06, opacity: 0.42, Fresnel rim #B4DDFF)
      // Sphere 02 (CDE UNIVERSE): Warm Amber Caustic Crystal (#F2B66D, roughness: 0.08, opacity: 0.46, rim #FFF1D4)
      const baseShellOpacity = isHq ? 0.42 : 0.46;
      const baseShellRoughness = 0.09; // v4.0 shell roughness: 0.09
      const frontShellMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(resolvedShellHex),
        transmission: isSoftwareGl ? 0 : 0.88, // v4.0 transmission: 0.88
        transparent: true,
        opacity: isSoftwareGl ? 0.22 : baseShellOpacity,
        roughness:
          (isHq && matPreset === 'cobalt-glass') || (!isHq && matPreset === 'amber-crystal')
            ? baseShellRoughness
            : matColors.roughness,
        metalness: 0.08,
        ior: 1.48,
        thickness: 0.55,
        clearcoat: 0.8,
        clearcoatRoughness: 0.06,
        side: THREE.FrontSide,
        depthWrite: false,
        wireframe: matColors.wireframeOnly,
      });

      const rimColVec = new THREE.Color(resolvedRimHex);
      const bodyColVec = new THREE.Color(resolvedShellHex);

      const injectCausticShader = (mat: THREE.MeshPhysicalMaterial, isBack: boolean) => {
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = glassUniforms.uTime;
          shader.uniforms.uAudioRms = glassUniforms.uAudioRms;
          shader.uniforms.uInteriorDome = glassUniforms.uInteriorDome;
          shader.vertexShader =
            `uniform float uTime;\nuniform float uAudioRms;\n` +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
              float wave = sin(position.x * 0.65 + uTime * 1.15) * cos(position.y * 0.65 + uTime * 0.9) * sin(position.z * 0.65 + uTime * 1.05);
              transformed += normal * (wave * (0.048 + uAudioRms * 0.065));`
            );
          shader.fragmentShader =
            `uniform float uTime;\nuniform float uAudioRms;\nuniform float uInteriorDome;\n` +
            shader.fragmentShader.replace(
              '#include <dithering_fragment>',
              `#include <dithering_fragment>
              float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), ${
                isBack ? '1.9' : '2.6'
              });
              vec3 causticRim = vec3(${rimColVec.r.toFixed(3)}, ${rimColVec.g.toFixed(3)}, ${rimColVec.b.toFixed(3)});
              vec3 causticBody = vec3(${bodyColVec.r.toFixed(3)}, ${bodyColVec.g.toFixed(3)}, ${bodyColVec.b.toFixed(3)});
              float causticWave = 0.5 + 0.5 * sin(uTime * 1.6 + gl_FragCoord.x * 0.012 + gl_FragCoord.y * 0.012);
              vec3 rimTint = mix(causticBody, causticRim, causticWave) * fresnel * (0.34 + uAudioRms * 0.45);
              gl_FragColor.rgb += rimTint;`
            );
        };
      };

      injectCausticShader(backShellMat, true);
      injectCausticShader(frontShellMat, false);

      const backShellMesh = new THREE.Mesh(shellGeo, backShellMat);
      backShellMesh.renderOrder = 1;
      shellGroup.add(backShellMesh);

      const frontShellMesh = new THREE.Mesh(shellGeo, frontShellMat);
      frontShellMesh.renderOrder = 3;
      shellGroup.add(frontShellMesh);

      // Interior Planetary Dome Constellation / Hex Horizon Grid (visible when camera.radius < 8.2u)
      const domeGridGroup = new THREE.Group();
      const domeWireGeo = new THREE.IcosahedronGeometry(6.05, 2);
      const domeEdges = new THREE.EdgesGeometry(domeWireGeo);
      const domeGridMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(resolvedRimHex),
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const domeGridLines = new THREE.LineSegments(domeEdges, domeGridMat);
      domeGridGroup.add(domeGridLines);
      shellGroup.add(domeGridGroup);

      root.add(shellGroup);

      // 6,400-Particle Multi-Layer Spiral Galaxy with GPU Bokeh (3,200 per sphere on GPU = 6,400 total)
      const galaxy = buildLiquidGlassGalaxySphere(root, sphereTag, isSoftwareGl);

      // 420 Spiral Shell Particles (#65ACFF for Sphere 01 HQ, #F2B66D for Sphere 02 CDE)
      const spiralCount = 420;
      const spiralPos = new Float32Array(spiralCount * 3);
      for (let sp = 0; sp < spiralCount; sp++) {
        const u = sp / spiralCount;
        const theta = sp * 2.3999632; // Golden angle spiral
        const y = 1 - u * 2;
        const rSlice = Math.sqrt(Math.max(0, 1 - y * y));
        const shellR = 5.85 + (sp % 5) * 0.06;
        spiralPos[sp * 3] = Math.cos(theta) * rSlice * shellR;
        spiralPos[sp * 3 + 1] = y * shellR;
        spiralPos[sp * 3 + 2] = Math.sin(theta) * rSlice * shellR;
      }
      const spiralGeo = new THREE.BufferGeometry();
      spiralGeo.setAttribute('position', new THREE.BufferAttribute(spiralPos, 3));
      const spiralMat = new THREE.PointsMaterial({
        color: new THREE.Color(isHq ? '#65ACFF' : '#F2B66D'),
        size: 0.09,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const spiralPoints = new THREE.Points(spiralGeo, spiralMat);
      shellGroup.add(spiralPoints);

      const wireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(resolvedRimHex),
        transparent: true,
        opacity: 0.28,
      });
      const rimMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(resolvedRimHex),
        transparent: true,
        opacity: 0.62,
      });

      // 2 Tilted Orbital Rings (counter-rotating #FFF1D4 rings on Sphere 02 CDE, #B4DDFF on Sphere 01 HQ) + structural meridians
      const orbitalRingsGroup = new THREE.Group();
      const ringRadii = [
        { rx: 6.24, rotX: 0.34, rotY: 0.64, rotZ: -0.28, mat: rimMat },
        { rx: 6.24, rotX: -0.34, rotY: -0.64, rotZ: 0.28, mat: rimMat },
        { rx: 6.2, rotX: Math.PI / 2, rotY: 0, rotZ: 0, mat: wireMat },
        { rx: 4.85, rotX: Math.PI / 2, rotY: 0.2, rotZ: 0, mat: wireMat },
      ];
      ringRadii.forEach((cfg, idx) => {
        const curve = new THREE.EllipseCurve(0, 0, cfg.rx, cfg.rx, 0, Math.PI * 2, false, 0);
        const pts = curve.getPoints(72).map((p) => new THREE.Vector3(p.x, p.y, 0));
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.LineLoop(geo, idx < 2 ? rimMat : wireMat);
        line.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
        orbitalRingsGroup.add(line);
      });
      shellGroup.add(orbitalRingsGroup);

      // Audio-Reactive Core Crystal Assembly (high emissive intensity for selective UnrealBloomPass)
      const coreGroup = new THREE.Group();
      const coreCrystalGeo = new THREE.OctahedronGeometry(0.66, 1);
      const coreCrystalMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#F2F6F8'),
        emissive: new THREE.Color(coreColour),
        emissiveIntensity: 1.35, // Exceeds 0.78 bloom threshold
        roughness: 0.14,
        metalness: 0.84,
      });
      coreGroup.add(new THREE.Mesh(coreCrystalGeo, coreCrystalMat));

      const gimbal1Geo = new THREE.TorusGeometry(0.95, 0.035, 12, 48);
      const gimbalMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(coreColour),
        emissive: new THREE.Color(coreColour),
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.88,
      });
      const gimbal1 = new THREE.Mesh(gimbal1Geo, gimbalMat);
      gimbal1.rotation.x = Math.PI / 3;
      coreGroup.add(gimbal1);

      const gimbal2 = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.025, 12, 48), gimbalMat);
      gimbal2.rotation.y = Math.PI / 4;
      coreGroup.add(gimbal2);

      const spindle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 2.1, 12),
        new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: 0.4, metalness: 0.7 })
      );
      coreGroup.add(spindle);

      root.add(coreGroup);

      const coreId = sphereTag === 'hq' ? 'core-hq' : 'core-cde';
      const coreUserData = { nodeId: coreId, nodeType: 'core' as const, sphere: sphereTag };
      coreGroup.userData = coreUserData;
      coreGroup.traverse((child) => {
        child.userData = coreUserData;
      });
      nodeRegistryRef.current.set(coreId, {
        id: coreId,
        canonicalId: coreId,
        label: sphereTag === 'hq' ? 'HQ Core' : 'CDE Core',
        sublabel: sphereTag === 'hq' ? 'HQ Orchestrator' : 'NOJARA Universe',
        colour: COLOUR_TOKENS.textPrimary,
        sphere: sphereTag,
        worldPos: center.clone(),
        baseScale: 1.0,
        nodeType: 'core',
        connectedIds: new Set<string>(),
        currentBrightness: 1.0,
        groupMesh: coreGroup,
        emissiveMats: [coreCrystalMat, gimbalMat],
      });

      scene.add(root);
      return {
        root,
        shellGroup,
        frontShellMat,
        backShellMat,
        domeGridMat,
        coreGroup,
        coreCrystalMat,
        galaxy,
      };
    };

    /**
     * 6 Sculptural Node Archetypes:
     * - Projects (`project`): Glowing photosphere core + additive chromosphere + 3 tilted orbital rings with planetoid beads + inverse proximity scale expansion (1.0x to 2.1x)
     * - Media (`media`): Concentric machined lens barrel rings with a glowing #F2B66D amber optical core
     * - Files (`files`): Bevelled glass slab tile with emerald #3DDC97 edge light
     * - Tasks (`tasks`): Sculptural bead surrounded by a segmented radial progress arc (#B8F04A) + etched waveform disc (C24) for Meetings
     * - People (`people`): Rose-gold/pink (#E6A2B4) gimbals with orbital satellite beads
     * - Dimensions / Subdomains (`dimension` / `subdomain`): Sculptural crystalline bipyramid + orbital collar
     */
    const buildSculpturalNodeArchetype = (
      canonicalId: string,
      nodeType: AnchoredLabel2D['nodeType'],
      col: THREE.Color
    ): { group: THREE.Group; haloMesh: THREE.Mesh; emissiveMats: THREE.MeshStandardMaterial[] } => {
      const group = new THREE.Group();
      const emissiveMats: THREE.MeshStandardMaterial[] = [];

      const idLower = canonicalId.toLowerCase();

      if (nodeType === 'project' && idLower !== 'projects') {
        // Archetype 1: Project Sun — Glowing photosphere core + additive chromosphere + 3 tilted orbital rings with planetoid beads
        const photosphereMat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 1.45, // Triggers selective UnrealBloomPass
          roughness: 0.16,
          metalness: 0.35,
        });
        emissiveMats.push(photosphereMat);
        const photosphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 2), photosphereMat);
        group.add(photosphere);

        const chromosphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.46, 20, 20),
          new THREE.MeshBasicMaterial({
            color: col,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        group.add(chromosphere);

        const ringTilts: [number, number, number][] = [
          [Math.PI / 2.3, 0.25, 0],
          [-Math.PI / 3.1, -0.45, 0.3],
          [0.42, Math.PI / 2.6, -0.52],
        ];
        ringTilts.forEach((rot, rIdx) => {
          const orbitGroup = new THREE.Group();
          orbitGroup.rotation.set(rot[0], rot[1], rot[2]);
          const orbitRadius = 0.56 + rIdx * 0.14;
          const ringMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#F2F6F8'),
            emissive: col,
            emissiveIntensity: 0.42,
            roughness: 0.32,
            metalness: 0.88,
          });
          emissiveMats.push(ringMat);
          const ringMesh = new THREE.Mesh(
            new THREE.TorusGeometry(orbitRadius, 0.016, 10, 42),
            ringMat
          );
          orbitGroup.add(ringMesh);

          const planetBead = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 10, 10),
            photosphereMat
          );
          const angle = (rIdx * 2.1) % (Math.PI * 2);
          planetBead.position.set(
            Math.cos(angle) * orbitRadius,
            Math.sin(angle) * orbitRadius,
            0
          );
          orbitGroup.add(planetBead);
          group.add(orbitGroup);
        });
      } else if (idLower === 'media') {
        // Archetype 2: Media — Concentric machined lens barrel rings with a glowing #F2B66D amber optical core
        const amberCol = new THREE.Color('#F2B66D');
        const opticalCoreMat = new THREE.MeshStandardMaterial({
          color: amberCol,
          emissive: amberCol,
          emissiveIntensity: 1.35,
          roughness: 0.12,
          metalness: 0.65,
        });
        emissiveMats.push(opticalCoreMat);
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), opticalCoreMat));

        const barrelMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#1B3444'),
          emissive: amberCol,
          emissiveIntensity: 0.45,
          roughness: 0.25,
          metalness: 0.92,
        });
        emissiveMats.push(barrelMat);
        [0.42, 0.56, 0.7].forEach((r, idx) => {
          const barrelRing = new THREE.Mesh(
            new THREE.CylinderGeometry(r, r, 0.14 - idx * 0.025, 28, 1, true),
            barrelMat
          );
          barrelRing.rotation.x = Math.PI / 2;
          group.add(barrelRing);
        });
      } else if (idLower === 'files') {
        // Archetype 3: Files — Bevelled glass slab tile with emerald #3DDC97 edge light
        const emeraldCol = new THREE.Color('#3DDC97');
        const slabMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#142632'),
          emissive: emeraldCol,
          emissiveIntensity: 0.68,
          roughness: 0.15,
          metalness: 0.82,
        });
        emissiveMats.push(slabMat);
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.48, 0.12), slabMat);
        slab.rotation.set(0.22, -0.35, 0.08);
        group.add(slab);

        const edgeLightMat = new THREE.MeshStandardMaterial({
          color: emeraldCol,
          emissive: emeraldCol,
          emissiveIntensity: 1.35,
          roughness: 0.18,
          metalness: 0.75,
        });
        emissiveMats.push(edgeLightMat);
        const edgeFrame = new THREE.Mesh(
          new THREE.TorusGeometry(0.46, 0.024, 12, 4),
          edgeLightMat
        );
        edgeFrame.rotation.set(0.22, -0.35, Math.PI / 4 + 0.08);
        group.add(edgeFrame);
      } else if (idLower === 'tasks') {
        // Archetype 4: Tasks & Meetings — Cyan Acoustic Resonator (#5CC8D7) + etched waveform disc
        const cyanCol = new THREE.Color('#5CC8D7');
        const taskCoreMat = new THREE.MeshStandardMaterial({
          color: cyanCol,
          emissive: cyanCol,
          emissiveIntensity: 1.15,
          roughness: 0.2,
          metalness: 0.78,
        });
        emissiveMats.push(taskCoreMat);
        group.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), taskCoreMat));

        // Segmented radial progress arcs (#5CC8D7)
        for (let seg = 0; seg < 4; seg++) {
          const arcMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.54, 0.028, 10, 18, Math.PI * 0.36),
            taskCoreMat
          );
          arcMesh.rotation.z = seg * (Math.PI * 0.5);
          group.add(arcMesh);
        }

        // Etched waveform disc (C24) for Meetings
        const discMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#B4DDFF'),
          emissive: cyanCol,
          emissiveIntensity: 0.38,
          roughness: 0.3,
          metalness: 0.85,
          side: THREE.DoubleSide,
        });
        emissiveMats.push(discMat);
        const waveformDisc = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.46, 32), discMat);
        waveformDisc.rotation.x = Math.PI / 2.2;
        group.add(waveformDisc);
      } else if (idLower === 'people') {
        // Archetype 5: People — Mint Plasma / Faceted Prism (#7CE0B8) gimbals with orbital satellite beads
        const mintCol = new THREE.Color('#7CE0B8');
        const mintMat = new THREE.MeshStandardMaterial({
          color: mintCol,
          emissive: mintCol,
          emissiveIntensity: 1.12,
          roughness: 0.2,
          metalness: 0.88,
        });
        emissiveMats.push(mintMat);
        group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), mintMat));

        for (let g = 0; g < 3; g++) {
          const gimbal = new THREE.Mesh(
            new THREE.TorusGeometry(0.48 + g * 0.11, 0.022, 12, 40),
            mintMat
          );
          gimbal.rotation.set(g * 0.9, g * 1.1, 0.4);
          group.add(gimbal);

          const sat = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), mintMat);
          const a = g * 2.09;
          sat.position.set(Math.cos(a) * (0.48 + g * 0.11), Math.sin(a) * (0.48 + g * 0.11), 0);
          gimbal.add(sat);
        }
      } else {
        // Archetype 6: Stations (`projects`), CDE Dimensions & Subdomains — Sculptural crystalline assembly + collar
        const primaryMat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.95,
          roughness: 0.2,
          metalness: 0.82,
        });
        emissiveMats.push(primaryMat);
        const primaryGeo =
          nodeType === 'dimension' || idLower === 'projects'
            ? new THREE.DodecahedronGeometry(0.42, 0)
            : new THREE.OctahedronGeometry(0.34, 0);
        group.add(new THREE.Mesh(primaryGeo, primaryMat));

        const collarMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#F2F6F8'),
          emissive: col,
          emissiveIntensity: 0.42,
          roughness: 0.42,
          metalness: 0.92,
        });
        emissiveMats.push(collarMat);
        const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.03, 12, 36), collarMat);
        collarMesh.rotation.x = Math.PI / 2.4;
        group.add(collarMesh);
      }

      const haloGeo = new THREE.RingGeometry(0.74, 0.82, 36);
      const haloMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.48,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      group.add(haloMesh);

      return { group, haloMesh, emissiveMats };
    };

    const buildNodeWithSignal = (
      parentGroup: THREE.Group,
      sphereCenter: THREE.Vector3,
      sphereTag: 'hq' | 'cde',
      registryKey: string,
      canonicalId: string,
      label: string,
      sublabel: string | undefined,
      colourHex: string,
      localPos: [number, number, number],
      nodeType: AnchoredLabel2D['nodeType'],
      scale = 1.0,
      pulseIndex = 0,
      connectedIds: string[] = []
    ) => {
      const posVec = new THREE.Vector3(...localPos);
      const col = new THREE.Color(colourHex);

      const { group: nodeGroup, haloMesh, emissiveMats } = buildSculpturalNodeArchetype(
        canonicalId,
        nodeType,
        col
      );
      nodeGroup.position.copy(posVec);
      nodeGroup.scale.setScalar(scale);

      const hitProxy = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 12, 12),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      const nodeUserData = { nodeId: canonicalId, nodeType, sphere: sphereTag };
      nodeGroup.userData = nodeUserData;
      hitProxy.userData = nodeUserData;
      nodeGroup.add(hitProxy);
      nodeGroup.traverse((child) => {
        child.userData = nodeUserData;
      });

      parentGroup.add(nodeGroup);

      const midCtrl = posVec.clone().multiplyScalar(0.52);
      midCtrl.y += 0.9;
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), midCtrl, posVec);
      const curvePts = curve.getPoints(32);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
      const lineMat = new THREE.LineBasicMaterial({
        color: col,
        transparent: true,
        opacity: nodeType === 'project' ? 0.34 : 0.44,
      });
      parentGroup.add(new THREE.Line(lineGeo, lineMat));

      const beadMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({
          color: col.clone().multiplyScalar(1.35), // Emits selective bloom
          transparent: true,
          opacity: 0.92,
        })
      );
      parentGroup.add(beadMesh);
      pulseBeads.push({
        mesh: beadMesh,
        curve,
        speed: 0.22 + (pulseIndex % 5) * 0.04,
        offset: (pulseIndex * 0.19) % 1,
      });

      const coreId = sphereTag === 'hq' ? 'core-hq' : 'core-cde';
      const connSet = new Set<string>([coreId, ...connectedIds]);
      const coreEntry = nodeRegistryRef.current.get(coreId);
      if (coreEntry) {
        coreEntry.connectedIds.add(canonicalId);
      }

      nodeRegistryRef.current.set(registryKey, {
        id: registryKey,
        canonicalId,
        label,
        sublabel,
        colour: colourHex,
        sphere: sphereTag,
        worldPos: sphereCenter.clone().add(posVec),
        baseScale: scale,
        nodeType,
        connectedIds: connSet,
        currentBrightness: 1.0,
        groupMesh: nodeGroup,
        haloMesh,
        emissiveMats,
        wireMat: lineMat,
      });
    };

    /**
     * Cardiac Heartbeat Wires:
     * Double-peaked cardiac pulse shader along inter-project CatmullRomCurve3 tubes.
     */
    const buildCardiacHeartbeatTube = (
      parentGroup: THREE.Group,
      posA: [number, number, number],
      posB: [number, number, number],
      nodeIdA: string,
      nodeIdB: string,
      colourHex: string
    ) => {
      const vA = new THREE.Vector3(...posA);
      const vB = new THREE.Vector3(...posB);
      const mid = vA.clone().lerp(vB, 0.5).multiplyScalar(0.78);
      const curve = new THREE.CatmullRomCurve3([vA, mid, vB]);
      const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.022, 6, false);
      const uniforms = {
        uTime: { value: 0 },
        uDimFactor: { value: 1.0 },
        uColor: { value: new THREE.Color(colourHex) },
      };
      const tubeMat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uDimFactor;
          uniform vec3 uColor;
          varying vec2 vUv;

          void main() {
            // Double-peaked cardiac systolic/diastolic pulse wave along the spline
            float phase = fract(vUv.x - uTime * 0.38);
            float peak1 = exp(-pow((phase - 0.18) * 18.0, 2.0));
            float peak2 = 0.65 * exp(-pow((phase - 0.31) * 22.0, 2.0));
            float heartbeat = peak1 + peak2;
            vec3 col = mix(uColor * 0.55, vec3(0.706, 0.867, 1.0), heartbeat * 0.75);
            float alpha = (0.16 + heartbeat * 0.72) * uDimFactor;
            gl_FragColor = vec4(col * (0.9 + heartbeat * 0.9), alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      parentGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
      cardiacTubes.push({ uniforms, nodeA: nodeIdA, nodeB: nodeIdB });
    };

    nodeRegistryRef.current.clear();

    const hqAssembly = buildSphereAssembly(HQ_CENTER, 'hq', COLOUR_TOKENS.cobaltAccent);
    const allProjectIds = PROJECTS_DATA.map((p) => p.id);
    CEREBRO_STATIONS.forEach((st, idx) => {
      buildNodeWithSignal(
        hqAssembly.root,
        HQ_CENTER,
        'hq',
        st.id,
        st.id,
        st.label,
        st.badgeCount,
        st.colour,
        st.position,
        'station',
        1.08,
        idx,
        allProjectIds
      );
    });

    PROJECTS_DATA.forEach((proj, idx) => {
      const healthCol = getProjectHealthColour(proj.health);
      const nextProj = PROJECTS_DATA[(idx + 1) % PROJECTS_DATA.length];
      const prevProj = PROJECTS_DATA[(idx + PROJECTS_DATA.length - 1) % PROJECTS_DATA.length];
      buildNodeWithSignal(
        hqAssembly.root,
        HQ_CENTER,
        'hq',
        proj.id,
        proj.id,
        proj.code,
        `${proj.health} · ${proj.progressLabel}`,
        healthCol,
        proj.sunPositionHq,
        'project',
        0.82,
        idx + 10,
        ['projects', 'tasks', 'files', 'media', 'people', nextProj.id, prevProj.id]
      );
      buildCardiacHeartbeatTube(
        hqAssembly.root,
        proj.sunPositionHq,
        nextProj.sunPositionHq,
        proj.id,
        nextProj.id,
        healthCol
      );
    });

    const cdeAssembly = buildSphereAssembly(CDE_CENTER, 'cde', COLOUR_TOKENS.stationMedia);
    CDE_DIMENSIONS.forEach((dim, idx) => {
      const subIds = dim.subdomains.map((s) => s.id);
      buildNodeWithSignal(
        cdeAssembly.root,
        CDE_CENTER,
        'cde',
        dim.id,
        dim.id,
        dim.label,
        `${dim.subdomains.length} Subdomains`,
        dim.colour,
        dim.position,
        'dimension',
        1.08,
        idx + 20,
        subIds
      );

      dim.subdomains.forEach((sub, sIdx) => {
        buildNodeWithSignal(
          cdeAssembly.root,
          CDE_CENTER,
          'cde',
          sub.id,
          sub.id,
          sub.name,
          sub.projectIds.join(', '),
          dim.colour,
          sub.position,
          'subdomain',
          0.76,
          idx * 4 + sIdx + 30,
          [dim.id, ...sub.projectIds]
        );
      });
    });

    PROJECTS_DATA.forEach((proj, idx) => {
      const healthCol = getProjectHealthColour(proj.health);
      const nextProj = PROJECTS_DATA[(idx + 1) % PROJECTS_DATA.length];
      buildNodeWithSignal(
        cdeAssembly.root,
        CDE_CENTER,
        'cde',
        `cde-proj-${proj.id}`,
        proj.id,
        proj.code,
        `${proj.subdomain} · ${proj.health}`,
        healthCol,
        proj.sunPositionCde,
        'project',
        0.8,
        idx + 50,
        [nextProj.id]
      );
      buildCardiacHeartbeatTube(
        cdeAssembly.root,
        proj.sunPositionCde,
        nextProj.sunPositionCde,
        proj.id,
        nextProj.id,
        healthCol
      );
    });

    // Spawn Sphere 03+ (Voice-spawned domains like MISSION LOTUS OPS via `create_domain`):
    // Mint Plasma Membrane (#7CE0B8, rim #5CC8D7, r = 4.4u), connected to its parent sphere with an
    // arched CatmullRomCurve3 cardiac tube (#65ACFF, opacity: 0.55) carrying a synchronized #FFF1D4 traveling light pulse bead.
    const childDomainShells: THREE.Group[] = [];
    customDomains.forEach((dom, dIdx) => {
      const targetAssembly = dom.sphere === 'cde' ? cdeAssembly : hqAssembly;
      const targetCenter = dom.sphere === 'cde' ? CDE_CENTER : HQ_CENTER;
      const domMatColors = getDomainMaterialColors(dom.materialPreset || 'emerald-plasma');

      // Child Sphere 03+ outer position at satellite orbit so r=4.4u Mint Plasma Membrane is clearly distinct
      const dirVec = new THREE.Vector3(...dom.position);
      if (dirVec.lengthSq() < 0.01) dirVec.set(1, 0.35, -0.4);
      dirVec.normalize().multiplyScalar(14.6 + dIdx * 3.2);
      const childLocalCenter: [number, number, number] = [dirVec.x, dirVec.y, dirVec.z];

      const childSphereGroup = new THREE.Group();
      childSphereGroup.position.copy(dirVec);

      const childShellMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(domMatColors.shellHex || '#7CE0B8'),
        transmission: isSoftwareGl ? 0 : 0.82,
        transparent: true,
        opacity: isSoftwareGl ? 0.24 : 0.44,
        roughness: 0.12,
        metalness: 0.08,
        ior: 1.46,
        thickness: 1.1,
        clearcoat: 1.0,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      const childShellMesh = new THREE.Mesh(new THREE.SphereGeometry(4.4, 40, 28), childShellMat);
      childSphereGroup.add(childShellMesh);

      // Mint/Cyan rim ring (#5CC8D7) on child sphere r = 4.4u
      const childRimCurve = new THREE.EllipseCurve(0, 0, 4.42, 4.42, 0, Math.PI * 2, false, 0);
      const childRimGeo = new THREE.BufferGeometry().setFromPoints(
        childRimCurve.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0))
      );
      const childRimMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(domMatColors.rimHex || '#5CC8D7'),
        transparent: true,
        opacity: 0.62,
      });
      const childRimRing = new THREE.LineLoop(childRimGeo, childRimMat);
      childRimRing.rotation.set(0.38, -0.52, 0.24);
      childSphereGroup.add(childRimRing);

      targetAssembly.root.add(childSphereGroup);
      childDomainShells.push(childSphereGroup);

      buildNodeWithSignal(
        targetAssembly.root,
        targetCenter,
        dom.sphere,
        dom.id,
        dom.id,
        dom.name,
        `Sphere 0${dIdx + 3} · ${dom.materialPreset}`,
        '#7CE0B8',
        childLocalCenter,
        'subdomain',
        1.05,
        dIdx + 70,
        [dom.parentNodeId]
      );

      // Arched CatmullRomCurve3 cardiac tube (#65ACFF, opacity: 0.55) with synchronized #FFF1D4 pulse bead
      const startPt = new THREE.Vector3(0, 0, 0);
      const endPt = dirVec.clone();
      const midArch = startPt.clone().lerp(endPt, 0.5);
      midArch.y += 3.6;
      const childCardiacCurve = new THREE.CatmullRomCurve3([startPt, midArch, endPt]);
      const childTubeGeo = new THREE.TubeGeometry(childCardiacCurve, 48, 0.032, 8, false);
      const childTubeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#65ACFF'),
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      targetAssembly.root.add(new THREE.Mesh(childTubeGeo, childTubeMat));

      const childPulseBead = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#FFF1D4'),
          transparent: true,
          opacity: 0.96,
        })
      );
      targetAssembly.root.add(childPulseBead);
      pulseBeads.push({
        mesh: childPulseBead,
        curve: childCardiacCurve,
        speed: 0.18,
        offset: (dIdx * 0.25) % 1,
      });
    });

    // Inter-Sphere CatmullRomCurve3 Cardiac Spline connecting HQ [0,0,0] and CDE [38,4,-22]
    // Styled with #65ACFF (opacity: 0.55) carrying synchronized #FFF1D4 traveling light pulse beads
    const bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(6.2, 0.8, -2.5),
      new THREE.Vector3(19.0, 5.8, -11.0),
      new THREE.Vector3(31.8, 3.2, -19.5),
    ]);
    const bridgeTubeGeo = new THREE.TubeGeometry(bridgeCurve, 64, 0.036, 8, false);
    const bridgeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#65ACFF'),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const bridgeMesh = new THREE.Mesh(bridgeTubeGeo, bridgeMat);
    scene.add(bridgeMesh);

    for (let b = 0; b < 4; b++) {
      const bridgeBead = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#FFF1D4'),
          transparent: true,
          opacity: 0.95,
        })
      );
      scene.add(bridgeBead);
      pulseBeads.push({
        mesh: bridgeBead,
        curve: bridgeCurve,
        speed: 0.18,
        offset: b / 4,
      });
    }

    // 28-Segment Comet Navigation Weave (dual-strand trailing ribbon during camera flights)
    const maxCometPts = 28;
    const cometPositions = new Float32Array(maxCometPts * 3);
    const cometWeavePositions = new Float32Array(maxCometPts * 3);
    const cometGeo = new THREE.BufferGeometry();
    cometGeo.setAttribute('position', new THREE.BufferAttribute(cometPositions, 3));
    const cometMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#B4DDFF'),
      transparent: true,
      opacity: 0.68,
    });
    const cometLine = new THREE.Line(cometGeo, cometMat);
    scene.add(cometLine);

    const cometWeaveGeo = new THREE.BufferGeometry();
    cometWeaveGeo.setAttribute('position', new THREE.BufferAttribute(cometWeavePositions, 3));
    const cometWeaveMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#65ACFF'),
      transparent: true,
      opacity: 0.48,
    });
    const cometWeaveLine = new THREE.Line(cometWeaveGeo, cometWeaveMat);
    scene.add(cometWeaveLine);

    // -------------------------------------------------------------------------
    // v4.0 3D Cylindrical Project Media Tube (`project.open_tube`) inside single WebGL scene
    // radiusU: 5.4, columns: 8, visibleRows: 3, maxMountedTiles: 24, slotSizeU: [3.2, 1.8], rowPitchU: 2.25
    // -------------------------------------------------------------------------
    const mediaTubeGroup = new THREE.Group();
    mediaTubeGroup.visible = false;
    scene.add(mediaTubeGroup);

    const mediaTubeTileMeshes: THREE.Mesh[] = [];
    const buildTileCanvasTexture = (tile: ProjectMediaTubeItem): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 180;
      const ctx = c.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 320, 180);
        grad.addColorStop(0, '#142632');
        grad.addColorStop(1, '#101D27');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 320, 180);

        // Subtle radial glow inside tile
        const rad = ctx.createRadialGradient(160, 84, 10, 160, 84, 130);
        rad.addColorStop(0, `${tile.accentHex}44`);
        rad.addColorStop(1, 'rgba(16, 29, 39, 0)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, 320, 180);

        // Outer glass frame
        ctx.strokeStyle = tile.accentHex;
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, 312, 172);

        // Kind badge
        ctx.fillStyle = tile.accentHex;
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText(`${tile.kind.toUpperCase()} · #${String(tile.index + 1).padStart(2, '0')}`, 18, 30);

        // Title & subtitle
        ctx.fillStyle = '#F2F6F8';
        ctx.font = 'bold 15px "Space Grotesk", sans-serif';
        ctx.fillText(tile.title.slice(0, 32), 18, 96);
        ctx.fillStyle = '#BDCBD3';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(tile.subtitle, 18, 126);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const initialTubeItems = buildProjectMediaTubeItems('SEVEN');
    const [tileW, tileH] = PROJECT_MEDIA_TUBE_SPECS.slotSizeU;
    for (let idx = 0; idx < PROJECT_MEDIA_TUBE_SPECS.maxMountedTiles; idx++) {
      const col = idx % PROJECT_MEDIA_TUBE_SPECS.columns;
      const row = Math.floor(idx / PROJECT_MEDIA_TUBE_SPECS.columns);
      const theta = (col / PROJECT_MEDIA_TUBE_SPECS.columns) * Math.PI * 2;
      const y = (1 - row) * PROJECT_MEDIA_TUBE_SPECS.rowPitchU;
      const r = PROJECT_MEDIA_TUBE_SPECS.radiusU;

      const tileGeo = new THREE.PlaneGeometry(tileW * 0.62, tileH * 0.62, 8, 1);
      // Gently curve tile vertices along cylinder arc
      const posAttr = tileGeo.attributes.position;
      for (let v = 0; v < posAttr.count; v++) {
        const vx = posAttr.getX(v);
        const arcAngle = vx / r;
        posAttr.setZ(v, (1 - Math.cos(arcAngle)) * r * 0.35);
      }
      tileGeo.computeVertexNormals();

      const tileMat = new THREE.MeshBasicMaterial({
        map: buildTileCanvasTexture(initialTubeItems[idx]),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
      });

      const tileMesh = new THREE.Mesh(tileGeo, tileMat);
      tileMesh.position.set(Math.sin(theta) * r, y, Math.cos(theta) * r);
      tileMesh.lookAt(0, y, 0);
      // Flip so front face points outward/inward cleanly
      tileMesh.rotateY(Math.PI);
      tileMesh.userData = {
        isMediaTubeTile: true,
        tileIndex: idx,
      };
      mediaTubeGroup.add(tileMesh);
      mediaTubeTileMeshes.push(tileMesh);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist: number | null = null;
    let lastTwoFingerMid: { x: number; y: number } | null = null;
    let isDragging = false;
    let dragMoved = false;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;

    const getTwoFingerState = (): { dist: number; midX: number; midY: number } | null => {
      if (activePointers.size < 2) return null;
      const pts = Array.from(activePointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      return {
        dist: Math.hypot(dx, dy),
        midX: (pts[0].x + pts[1].x) * 0.5,
        midY: (pts[0].y + pts[1].y) * 0.5,
      };
    };

    const findHitNode = (clientX: number, clientY: number) => {
      const rect = domEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const activeSphereNow = stateRef.current.activeSphere;
      const hitMeshes: THREE.Object3D[] = [];
      nodeRegistryRef.current.forEach((entry) => {
        if (entry.groupMesh && entry.sphere === activeSphereNow) {
          hitMeshes.push(entry.groupMesh);
        }
      });

      const intersects = raycaster.intersectObjects(hitMeshes, true);
      for (let i = 0; i < intersects.length; i++) {
        let obj: THREE.Object3D | null = intersects[i].object;
        while (obj && !obj.userData?.nodeId) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.nodeId) {
          return obj.userData as {
            nodeId: string;
            nodeType: AnchoredLabel2D['nodeType'];
            sphere: 'hq' | 'cde';
          };
        }
      }

      // Screen-space proximity fallback (<= 38px) so finger taps and clicks on 3D orbs never miss
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      let closestHit: {
        nodeId: string;
        nodeType: AnchoredLabel2D['nodeType'];
        sphere: 'hq' | 'cde';
        dist: number;
      } | null = null;

      for (const entry of nodeRegistryRef.current.values()) {
        if (entry.sphere !== activeSphereNow) continue;
        _scratchVec.copy(entry.worldPos).project(camera);
        if (_scratchVec.z > 1) continue;
        const sx = (_scratchVec.x * 0.5 + 0.5) * rect.width;
        const sy = (-_scratchVec.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(localX - sx, localY - sy);
        if (d <= 38 && (!closestHit || d < closestHit.dist)) {
          closestHit = {
            nodeId: entry.canonicalId,
            nodeType: entry.nodeType,
            sphere: entry.sphere,
            dist: d,
          };
        }
      }

      return closestHit
        ? {
            nodeId: closestHit.nodeId,
            nodeType: closestHit.nodeType,
            sphere: closestHit.sphere,
          }
        : null;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!container.contains(e.target as Node)) return;
      soundEngine.unlock();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2) {
        const tf = getTwoFingerState();
        lastPinchDist = tf ? tf.dist : null;
        lastTwoFingerMid = tf ? { x: tf.midX, y: tf.midY } : null;
        dragMoved = true;
        callbacksRef.current.onUserTouchPauseTour();
        setTouchIndicator({ active: true, x: e.clientX, y: e.clientY, mode: 'pinch' });
        return;
      }
      isDragging = true;
      dragMoved = false;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      domEl.style.cursor = 'grabbing';
      setTouchIndicator({ active: true, x: e.clientX, y: e.clientY, mode: 'touch' });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (activePointers.size === 2) {
        const tf = getTwoFingerState();
        if (tf) {
          const s = stateRef.current;
          s.flightActive = false;
          s.activeLoopMode = 'off';
          s.stoppedExplicitly = false;

          // Two-finger drag (pan)
          if (lastTwoFingerMid !== null) {
            const mdx = tf.midX - lastTwoFingerMid.x;
            const mdy = tf.midY - lastTwoFingerMid.y;
            if (Math.abs(mdx) > 0.1 || Math.abs(mdy) > 0.1) {
              camera.getWorldDirection(_scratchForward);
              _scratchRight.crossVectors(_scratchForward, camera.up).normalize();
              _scratchUp.crossVectors(_scratchRight, _scratchForward).normalize();
              s.targetPanOffset
                .addScaledVector(_scratchRight, -mdx * 0.025)
                .addScaledVector(_scratchUp, mdy * 0.025);
              setTouchIndicator({ active: true, x: tf.midX, y: tf.midY, mode: 'pan' });
            }
          }

          // Two-finger pinch-to-zoom (9.2u to 42u on iPad/touch)
          if (lastPinchDist !== null) {
            const distDelta = tf.dist - lastPinchDist;
            if (Math.abs(distDelta) > 0.2) {
              s.targetRadius = THREE.MathUtils.clamp(
                s.targetRadius - distDelta * 0.045,
                9.2,
                42.0
              );
              setTouchIndicator({ active: true, x: tf.midX, y: tf.midY, mode: 'pinch' });
            }
          }

          lastPinchDist = tf.dist;
          lastTwoFingerMid = { x: tf.midX, y: tf.midY };
        }
        return;
      }

      if (!isDragging) {
        if (e.target === domEl) {
          const hit = findHitNode(e.clientX, e.clientY);
          domEl.style.cursor = hit ? 'pointer' : 'grab';
          const prevHovered = stateRef.current.HoveredNodeId;
          const nextHovered = hit ? hit.nodeId : null;
          if (nextHovered !== prevHovered) {
            stateRef.current.HoveredNodeId = nextHovered;
            callbacksRef.current.onHoverNodeChange?.(nextHovered);
            if (nextHovered) {
              const panX = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
              soundEngine.playNodeHover(panX);
            }
          }
        }
        return;
      }

      const distFromDown = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (!dragMoved && distFromDown > 7) {
        dragMoved = true;
        callbacksRef.current.onUserTouchPauseTour();
      }

      if (dragMoved) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        const s = stateRef.current;
        s.flightActive = false;
        s.activeLoopMode = 'off';
        s.stoppedExplicitly = false;

        if (e.shiftKey || e.buttons === 2 || e.buttons === 4) {
          camera.getWorldDirection(_scratchForward);
          _scratchRight.crossVectors(_scratchForward, camera.up).normalize();
          _scratchUp.crossVectors(_scratchRight, _scratchForward).normalize();
          s.targetPanOffset
            .addScaledVector(_scratchRight, -dx * 0.025)
            .addScaledVector(_scratchUp, dy * 0.025);
          setTouchIndicator({ active: true, x: e.clientX, y: e.clientY, mode: 'pan' });
        } else {
          s.targetAzimuth -= dx * 0.0068;
          s.targetPolar = THREE.MathUtils.clamp(
            s.targetPolar - dy * 0.0068,
            0.12,
            Math.PI - 0.12
          );
          setTouchIndicator({ active: true, x: e.clientX, y: e.clientY, mode: 'orbit-drag' });
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) {
        lastPinchDist = null;
        lastTwoFingerMid = null;
      }
      setTouchIndicator((prev) => ({ ...prev, active: false }));
      if (!isDragging) return;
      isDragging = false;
      domEl.style.cursor = 'grab';

      if (!dragMoved && e.target === domEl) {
        // First check if 3D Media Tube is active and a tile was clicked
        if (mediaTubeStateRef.current?.active && mediaTubeGroup.visible) {
          const rect = domEl.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const tubeHits = raycaster.intersectObjects(mediaTubeTileMeshes, false);
          if (tubeHits.length > 0) {
            const tIdx = tubeHits[0].object.userData?.tileIndex;
            if (typeof tIdx === 'number') {
              const items = buildProjectMediaTubeItems(mediaTubeStateRef.current.projectId);
              const tile = items[tIdx] || items[0];
              soundEngine.playNodeSelect(0);
              callbacksRef.current.onSelectMediaTubeTile?.(tIdx, tile);
              return;
            }
          }
        }

        const hit = findHitNode(e.clientX, e.clientY);
        if (hit) {
          const panX = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
          soundEngine.playNodeSelect(panX);
          callbacksRef.current.onSelectNode(hit.nodeId, hit.nodeType, hit.sphere);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!container.contains(e.target as Node)) return;
      e.preventDefault();
      callbacksRef.current.onUserTouchPauseTour();
      const s = stateRef.current;
      s.flightActive = false;
      s.activeLoopMode = 'off';
      s.targetRadius = THREE.MathUtils.clamp(s.targetRadius + e.deltaY * 0.012, 9.2, 42.0);
      setTouchIndicator({ active: true, x: e.clientX, y: e.clientY, mode: 'pinch' });
      window.setTimeout(() => setTouchIndicator((prev) => ({ ...prev, active: false })), 350);
    };

    domEl.addEventListener('contextmenu', onContextMenu);
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) {
        composer.setSize(w, h);
      }
      if (bloomPass) {
        bloomPass.resolution.set(w, h);
      }
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let frameCounter = 0;
    let isPageHidden = document.hidden;

    const onVisibilityChange = () => {
      isPageHidden = document.hidden;
      if (!isPageHidden) {
        clock.getDelta();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isPageHidden && GUI_WORLD_MOTION_TOKENS.freezeIfHidden) {
        frameId = window.setTimeout(tick, 250);
        return;
      }

      // Clamp dt to 33ms (GUI_WORLD_MOTION_TOKENS.dtClampMs)
      const dt = Math.min(clock.getDelta(), GUI_WORLD_MOTION_TOKENS.dtClampMs / 1000);
      const elapsedTotal = clock.getElapsedTime();
      const now = performance.now();
      const s = stateRef.current;

      glassUniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
      glassUniforms.uAudioRms.value = THREE.MathUtils.damp(
        glassUniforms.uAudioRms.value,
        s.audioRms,
        8.5,
        dt
      );
      const liveRms = glassUniforms.uAudioRms.value;

      // Synchronize Cerebral Ambient Drone 8.0s breathing filter modulation
      soundEngine.updateBreathingModulation(elapsedTotal, liveRms);

      // 8-Second Breathing Liquid-Glass Shell Cycle (periodsSec.rimBreath = 8s)
      const breathPhase =
        0.5 +
        0.5 *
          Math.sin(
            (elapsedTotal * Math.PI * 2) / GUI_WORLD_MOTION_TOKENS.periodsSec.rimBreath
          );
      const breathScale = s.reducedMotion ? 1.0 : 1.0 + 0.006 * breathPhase + liveRms * 0.012;
      hqAssembly.shellGroup.scale.setScalar(breathScale);
      cdeAssembly.shellGroup.scale.setScalar(breathScale);

      // Audio-Reactive Core Crystal Pulse
      const corePulseScale = 1.0 + liveRms * 0.34;
      hqAssembly.coreGroup.scale.setScalar(corePulseScale);
      cdeAssembly.coreGroup.scale.setScalar(corePulseScale);
      hqAssembly.coreCrystalMat.emissiveIntensity = 1.35 + liveRms * 1.65;
      cdeAssembly.coreCrystalMat.emissiveIntensity = 1.35 + liveRms * 1.65;

      // If explicitly stopped, velocity stays strictly 0 with zero drift
      if (s.stoppedExplicitly) {
        s.currentAngularVel = 0;
      } else {
        const baseSphereRate = GUI_WORLD_MOTION_TOKENS.rates.sphereRadPerSec; // 0.02992 rad/s (210s period)
        const desiredVel = s.reducedMotion
          ? 0
          : s.autoOrbit
          ? (Math.PI * 2) / Math.max(4, s.turnSeconds)
          : s.flightActive
          ? baseSphereRate * GUI_TIMING_TOKENS.travelMotionAttenuation
          : baseSphereRate;
        s.currentAngularVel = THREE.MathUtils.damp(s.currentAngularVel, desiredVel, 3.8, dt);

        if (
          !s.flightActive &&
          s.activeLoopMode === 'off' &&
          !isDragging &&
          activePointers.size < 2
        ) {
          s.targetAzimuth += s.currentAngularVel * dt;
        }
      }

      // 4 Ongoing Kinematic Loop Modes
      if (
        !s.stoppedExplicitly &&
        !s.flightActive &&
        !isDragging &&
        activePointers.size < 2 &&
        !s.reducedMotion &&
        s.activeLoopMode !== 'off'
      ) {
        if (s.activeLoopMode === 'helix') {
          // Helical Corkscrew Scan: orbits active sphere at 0.157 rad/s while oscillating polar angle & radius
          s.targetAzimuth += 0.157 * dt;
          s.targetPolar = THREE.MathUtils.clamp(
            1.396 + 0.663 * Math.sin((2 * Math.PI * elapsedTotal) / 28.0),
            0.14,
            Math.PI - 0.14
          );
          s.targetRadius = 16.5 + 3.5 * Math.cos((2 * Math.PI * elapsedTotal) / 14.0);
          s.targetRollDeg = 2.5 * Math.cos((2 * Math.PI * elapsedTotal) / 28.0);
        } else if (s.activeLoopMode === 'vertigo') {
          // Dolly-Zoom Hitchcock Loop: locks apparent subject height H = 8.8u while oscillating focalLengthMm between 18mm and 135mm over a 16.0s sine cycle
          const vPhase = 0.5 + 0.5 * Math.sin((2 * Math.PI * elapsedTotal) / 16.0);
          s.targetFocalLengthMm = 18 + (135 - 18) * vPhase;
          s.focalLengthMm = s.targetFocalLengthMm;
          const vFov = focalLengthToVFov(s.focalLengthMm);
          s.targetRadius = THREE.MathUtils.clamp(
            4.4 / Math.tan(THREE.MathUtils.degToRad(vFov) * 0.5),
            3.6,
            38.0
          );
          s.radius = s.targetRadius;
          s.targetAzimuth += 0.032 * dt;
          s.targetRollDeg = 0;
        } else if (s.activeLoopMode === 'macro_orbit') {
          // 100mm Macro Satellite Loop: orbits the focused node (or sphere Core) at distance = 3.8u, focalLengthMm = 100, rollDeg = 3.5, angular velocity 0.22 rad/s
          s.activeLensId = '100mm-macro';
          s.targetFocalLengthMm = 100;
          s.targetRadius = 3.8;
          s.targetRollDeg = 3.5;
          s.targetAzimuth += 0.22 * dt;
          const activeId = s.focusedNodeId || s.tourHighlightId;
          const focusedNode = activeId ? resolveNodeEntry(activeId, s.activeSphere) : null;
          const sphereCenter = s.activeSphere === 'cde' ? CDE_CENTER : HQ_CENTER;
          if (focusedNode) {
            s.targetPanOffset.copy(focusedNode.worldPos.clone().sub(sphereCenter));
          } else {
            s.targetPanOffset.set(0, 0, 0);
          }
        }
      }

      // Synchronized breathing across Sphere 01 (HQ), Sphere 02 (CDE), and Sphere 03+ (childDomainShells)
      for (let cs = 0; cs < childDomainShells.length; cs++) {
        childDomainShells[cs].scale.setScalar(breathScale);
      }

      // Damped CatmullRomCurve3 spline camera interpolation (damp = 1 - Math.exp(-4.2 * dt))
      const dampFactor = s.reducedMotion ? 25 : 4.2;
      const damp = 1 - Math.exp(-dampFactor * dt);
      s.currentCenter.lerp(s.targetCenter, damp);
      s.panOffset.lerp(s.targetPanOffset, damp);
      s.azimuth = THREE.MathUtils.damp(s.azimuth, s.targetAzimuth, dampFactor, dt);
      s.polar = THREE.MathUtils.damp(s.polar, s.targetPolar, dampFactor, dt);
      s.radius = THREE.MathUtils.damp(s.radius, s.targetRadius, dampFactor, dt);
      s.focalLengthMm = THREE.MathUtils.damp(
        s.focalLengthMm,
        s.targetFocalLengthMm,
        dampFactor,
        dt
      );
      s.cameraRollDeg = THREE.MathUtils.damp(s.cameraRollDeg, s.targetRollDeg, dampFactor, dt);

      if (s.flightActive && s.flightCurve) {
        const elapsed = now - s.flightStartTime;
        const rawT = Math.min(1, elapsed / Math.max(100, s.flightDurationMs));
        const easedT = unifiedEaseOut(rawT);
        s.flightCurve.getPoint(easedT, camera.position);

        if (s.flightIsInterSphere) {
          // 4-Phase Inter-World Travel dynamic focal length (current -> 18mm at mid-bridge -> settle) & banking roll (±6.0° * Math.sin(easedT * Math.PI))
          if (easedT < 0.5) {
            const bridgeMix = Math.sin(easedT * Math.PI);
            s.focalLengthMm = THREE.MathUtils.lerp(s.flightStartFocalMm, 18, bridgeMix);
          } else {
            const settleMix = (easedT - 0.5) * 2.0;
            s.focalLengthMm = THREE.MathUtils.lerp(18, s.flightEndFocalMm, settleMix);
          }
          s.cameraRollDeg = s.flightRollDir * 6.0 * Math.sin(easedT * Math.PI);
        }

        const rollRad = THREE.MathUtils.degToRad(s.cameraRollDeg);
        camera.up.set(Math.sin(rollRad), Math.cos(rollRad), 0).normalize();
        camera.fov = focalLengthToVFov(s.focalLengthMm);
        camera.updateProjectionMatrix();

        if (s.flightLookAtCurve) {
          s.flightLookAtCurve.getPoint(easedT, _scratchVec);
          camera.lookAt(_scratchVec);
        } else {
          camera.lookAt(_scratchVec.copy(s.currentCenter).add(s.panOffset));
        }

        if (rawT >= 1) {
          s.flightActive = false;
          s.flightLookAtCurve = null;
          s.flightIsInterSphere = false;
        }
      } else if (
        !s.stoppedExplicitly &&
        !s.reducedMotion &&
        s.activeLoopMode === 'lemniscate'
      ) {
        // Figure-8 Dual-World Infinity Loop (Bernoulli lemniscate across HQ (0,0,0) and CDE (32,0,0) with midpoint (16,0,0), A = 24.0u, period 48.0s)
        const w = (2 * Math.PI) / 48.0;
        const wt = w * elapsedTotal;
        const sinWt = Math.sin(wt);
        const cosWt = Math.cos(wt);
        const denom = 1.0 + sinWt * sinWt;
        const lemX = 16.0 + (24.0 * cosWt) / denom;
        const lemZ = (24.0 * sinWt * cosWt) / denom * 1.45;
        const lemY = 3.4 * Math.sin(wt * 2.0);

        // Dynamically breathe focal length between 24mm at bridge crossing and 50mm at outer sphere turns
        s.targetFocalLengthMm = 24 + 26 * Math.abs(cosWt);
        s.focalLengthMm = THREE.MathUtils.damp(s.focalLengthMm, s.targetFocalLengthMm, 5.0, dt);

        // Banking roll: rollDeg = -6.5 * Math.cos(w * elapsedTotal)
        s.targetRollDeg = -6.5 * cosWt;
        s.cameraRollDeg = THREE.MathUtils.damp(s.cameraRollDeg, s.targetRollDeg, 6.0, dt);

        const rollRad = THREE.MathUtils.degToRad(s.cameraRollDeg);
        camera.up.set(Math.sin(rollRad), Math.cos(rollRad), 0).normalize();
        camera.fov = focalLengthToVFov(s.focalLengthMm);
        camera.updateProjectionMatrix();

        camera.position.set(lemX, lemY, lemZ);
        // Smoothly look at the focal world along the infinity path
        _scratchVec.set(16.0 + 16.0 * cosWt, 0, 0);
        s.currentCenter.lerp(_scratchVec, 1 - Math.exp(-4.0 * dt));
        s.radius = camera.position.distanceTo(s.currentCenter);
        camera.lookAt(s.currentCenter);
      } else {
        const rollRad = THREE.MathUtils.degToRad(s.cameraRollDeg);
        camera.up.set(Math.sin(rollRad), Math.cos(rollRad), 0).normalize();
        camera.fov = focalLengthToVFov(s.focalLengthMm);
        camera.updateProjectionMatrix();

        camera.position.set(
          s.currentCenter.x + s.panOffset.x + s.radius * Math.sin(s.polar) * Math.sin(s.azimuth),
          s.currentCenter.y + s.panOffset.y + s.radius * Math.cos(s.polar),
          s.currentCenter.z + s.panOffset.z + s.radius * Math.sin(s.polar) * Math.cos(s.azimuth)
        );
        camera.lookAt(_scratchVec.copy(s.currentCenter).add(s.panOffset));
      }

      // Interior Planetary Dome Mode Transition when camera.radius < 8.2u
      const isInsideDome = s.radius < 8.2;
      const targetDomeMix = isInsideDome ? 1.0 : 0.0;
      glassUniforms.uInteriorDome.value = THREE.MathUtils.damp(
        glassUniforms.uInteriorDome.value,
        targetDomeMix,
        6.5,
        dt
      );
      const domeMix = glassUniforms.uInteriorDome.value;
      hqAssembly.frontShellMat.opacity = isSoftwareGl
        ? 0.22 * (1 - domeMix * 0.75)
        : 0.42 * (1 - domeMix * 0.72);
      cdeAssembly.frontShellMat.opacity = isSoftwareGl
        ? 0.22 * (1 - domeMix * 0.75)
        : 0.46 * (1 - domeMix * 0.72);
      hqAssembly.domeGridMat.opacity = domeMix * 0.24;
      cdeAssembly.domeGridMat.opacity = domeMix * 0.24;

      // Update GPU Bokeh Galaxy uniforms (uTime, uFocalDistance, uAudioRms)
      let focalDist = s.radius;
      const activeTargetId = s.HoveredNodeId || s.focusedNodeId || s.tourHighlightId;
      if (activeTargetId) {
        const targetEntry = resolveNodeEntry(activeTargetId, s.activeSphere);
        if (targetEntry) {
          focalDist = camera.position.distanceTo(targetEntry.worldPos);
        }
      }
      hqAssembly.galaxy.uniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
      hqAssembly.galaxy.uniforms.uFocalDistance.value = focalDist;
      hqAssembly.galaxy.uniforms.uAudioRms.value = liveRms;
      cdeAssembly.galaxy.uniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
      cdeAssembly.galaxy.uniforms.uFocalDistance.value = focalDist;
      cdeAssembly.galaxy.uniforms.uAudioRms.value = liveRms;

      // v4.0 3D Cylindrical Project Media Tube update & enclosing shell dimming
      const tubeProp = mediaTubeStateRef.current;
      const tubeActive = Boolean(tubeProp?.active);
      mediaTubeGroup.visible = tubeActive;
      if (tubeActive) {
        const activeCenter = s.activeSphere === 'cde' ? CDE_CENTER : HQ_CENTER;
        mediaTubeGroup.position.copy(activeCenter);

        // Dim enclosing sphere shell so the 3D cylindrical tube is crystal clear
        hqAssembly.frontShellMat.opacity *= 0.22;
        cdeAssembly.frontShellMat.opacity *= 0.22;

        if (typeof tubeProp?.focusedTileIndex === 'number') {
          const col = tubeProp.focusedTileIndex % PROJECT_MEDIA_TUBE_SPECS.columns;
          const targetRotY = -((col / PROJECT_MEDIA_TUBE_SPECS.columns) * Math.PI * 2);
          s.tubeRotationY = THREE.MathUtils.damp(s.tubeRotationY, targetRotY, 6.2, dt);
        } else if (!s.stoppedExplicitly && !s.reducedMotion) {
          const hoverMult =
            s.tubeHoveredTileIdx !== null ? PROJECT_MEDIA_TUBE_SPECS.hoverSpeedMultiplier : 1.0;
          const clampedVel = THREE.MathUtils.clamp(
            s.tubeAngularVel * hoverMult,
            -PROJECT_MEDIA_TUBE_SPECS.spinClampRadPerSec,
            PROJECT_MEDIA_TUBE_SPECS.spinClampRadPerSec
          );
          s.tubeRotationY += clampedVel * dt;
          s.tubeAngularVel = THREE.MathUtils.lerp(
            s.tubeAngularVel,
            PROJECT_MEDIA_TUBE_SPECS.idleRadPerSec,
            1 - PROJECT_MEDIA_TUBE_SPECS.damping60Hz
          );
        }
        mediaTubeGroup.rotation.y = s.tubeRotationY;

        for (let ti = 0; ti < mediaTubeTileMeshes.length; ti++) {
          const m = mediaTubeTileMeshes[ti];
          const isFocusedTile = tubeProp?.focusedTileIndex === ti;
          m.scale.setScalar(isFocusedTile ? 1.18 : 1.0);
        }
      }

      if (cinemaPass) {
        cinemaPass.uniforms.uTime.value =
          s.stoppedExplicitly || s.reducedMotion ? 0 : elapsedTotal;
      }

      // 28-Segment Comet Navigation Weave trailing ribbon
      const lookPoint = _scratchVec2.copy(camera.position).lerp(s.currentCenter, 0.62);
      s.cometPoints.unshift(lookPoint.clone());
      if (s.cometPoints.length > maxCometPts) s.cometPoints.pop();
      const posAttr = cometGeo.getAttribute('position') as THREE.BufferAttribute;
      const weaveAttr = cometWeaveGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < maxCometPts; i++) {
        const pt = s.cometPoints[Math.min(i, s.cometPoints.length - 1)] || lookPoint;
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);
        const weaveAngle = elapsedTotal * 5.0 + i * 0.45;
        const weaveAmp = s.flightActive ? 0.16 * (1 - i / maxCometPts) : 0.02;
        weaveAttr.setXYZ(
          i,
          pt.x + Math.cos(weaveAngle) * weaveAmp,
          pt.y + Math.sin(weaveAngle) * weaveAmp,
          pt.z
        );
      }
      posAttr.needsUpdate = true;
      weaveAttr.needsUpdate = true;

      if (!s.reducedMotion) {
        for (let i = 0; i < pulseBeads.length; i++) {
          const pb = pulseBeads[i];
          const t = (elapsedTotal * pb.speed + pb.offset) % 1;
          pb.curve.getPoint(t, pb.mesh.position);
        }
      }

      hqAssembly.coreGroup.rotation.y += dt * (0.25 + liveRms * 0.85);
      cdeAssembly.coreGroup.rotation.y -= dt * (0.22 + liveRms * 0.85);

      // Obsidian Graph Hover Dimming (100% connected vs 25% non-connected over 300ms) & Project Inverse Proximity Scaling (1.0x -> 2.1x)
      const activeEntry = activeTargetId ? resolveNodeEntry(activeTargetId, s.activeSphere) : null;

      nodeRegistryRef.current.forEach((entry) => {
        let targetBright = 1.0;
        if (activeEntry && entry.sphere === s.activeSphere) {
          const isSelfOrConnected =
            entry.canonicalId === activeEntry.canonicalId ||
            activeEntry.connectedIds.has(entry.canonicalId) ||
            entry.connectedIds.has(activeEntry.canonicalId);
          targetBright = isSelfOrConnected ? 1.0 : 0.25;
        }
        // Smooth 300ms transition (lambda ~ 9.5)
        entry.currentBrightness = THREE.MathUtils.damp(
          entry.currentBrightness,
          targetBright,
          9.5,
          dt
        );

        const b = entry.currentBrightness;
        for (let m = 0; m < entry.emissiveMats.length; m++) {
          const mat = entry.emissiveMats[m];
          const baseEmissive = entry.nodeType === 'project' ? 1.35 : 0.95;
          mat.emissiveIntensity = baseEmissive * b + (b > 0.85 ? liveRms * 0.55 : 0);
        }
        if (entry.wireMat) {
          const baseWireOp = entry.nodeType === 'project' ? 0.34 : 0.44;
          entry.wireMat.opacity = baseWireOp * b + (b > 0.85 && activeEntry ? 0.28 : 0);
        }

        if (entry.haloMesh) {
          entry.haloMesh.lookAt(camera.position);
          const isHigh =
            entry.canonicalId === s.focusedNodeId ||
            entry.canonicalId === s.tourHighlightId ||
            entry.canonicalId === s.HoveredNodeId;
          entry.haloMesh.scale.setScalar(isHigh ? 1.48 : 1.0);
        }

        if (entry.groupMesh && entry.nodeType !== 'core') {
          entry.groupMesh.children[0].rotation.y += dt * 0.42;

          // Inverse proximity scale expansion (1.0x to 2.1x on close-up) for Project Suns
          if (entry.nodeType === 'project') {
            const distToCam = camera.position.distanceTo(entry.worldPos);
            const proxT = THREE.MathUtils.clamp((19.5 - distToCam) / 11.5, 0, 1);
            const proxMultiplier = 1.0 + proxT * 1.1; // 1.0x -> 2.1x
            entry.groupMesh.scale.setScalar(entry.baseScale * proxMultiplier);
          }
        }
      });

      // Update Cardiac Heartbeat Tubes
      for (let c = 0; c < cardiacTubes.length; c++) {
        const ct = cardiacTubes[c];
        ct.uniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
        let tubeDim = 1.0;
        if (activeEntry) {
          const connected =
            activeEntry.canonicalId === ct.nodeA ||
            activeEntry.canonicalId === ct.nodeB ||
            activeEntry.canonicalId === 'projects';
          tubeDim = connected ? 1.0 : 0.25;
        }
        ct.uniforms.uDimFactor.value = THREE.MathUtils.damp(
          ct.uniforms.uDimFactor.value,
          tubeDim,
          9.5,
          dt
        );
      }

      // Align camera optical center to unobstructed centerSafeRect when panels are open
      const curW = domEl.clientWidth || window.innerWidth;
      const curH = domEl.clientHeight || window.innerHeight;
      if (unobstructedRectRef.current && curW > 0 && curH > 0) {
        const sub = computeSubFrustumOffset(curW, curH, unobstructedRectRef.current);
        if (Math.abs(sub.offsetX) > 2 || Math.abs(sub.offsetY) > 2) {
          camera.setViewOffset(
            sub.fullWidth,
            sub.fullHeight,
            sub.offsetX,
            sub.offsetY,
            sub.width,
            sub.height
          );
        } else {
          camera.clearViewOffset();
        }
      }

      if (isSoftwareGl || !composer) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }

      // Project active 3D target (hovered, focused, or tour highlight) to 2D screen coordinates every frame for GuiFocusOverlay (z-35)
      if (callbacksRef.current.onProjectedTargetChange) {
        if (activeEntry) {
          _scratchVec.copy(activeEntry.worldPos).project(camera);
          const visible = _scratchVec.z <= 1;
          const sx = (_scratchVec.x * 0.5 + 0.5) * curW;
          const sy = (-_scratchVec.y * 0.5 + 0.5) * curH;
          callbacksRef.current.onProjectedTargetChange({
            id: activeEntry.canonicalId,
            label: activeEntry.label,
            x: Math.round(sx),
            y: Math.round(sy),
            visible,
          });
        } else {
          callbacksRef.current.onProjectedTargetChange(null);
        }
      }

      frameCounter++;
      if (frameCounter % 2 === 0) {
        const width = domEl.clientWidth || window.innerWidth;
        const height = domEl.clientHeight || window.innerHeight;
        const projected: AnchoredLabel2D[] = [];

        nodeRegistryRef.current.forEach((entry) => {
          if (entry.sphere !== s.activeSphere) return;

          _scratchVec.copy(entry.worldPos);
          const distToCam = _scratchVec.distanceTo(camera.position);
          const centerDistToCam = s.currentCenter.distanceTo(camera.position);
          const zDepth = distToCam - centerDistToCam;

          _scratchVec.project(camera);
          if (_scratchVec.z > 1) return;

          const sx = (_scratchVec.x * 0.5 + 0.5) * width;
          const sy = (-_scratchVec.y * 0.5 + 0.5) * height;

          projected.push({
            id: entry.canonicalId,
            label: entry.label,
            sublabel: entry.sublabel,
            colour: entry.colour,
            x: sx + 14,
            y: sy - 10,
            zDepth,
            isFocused:
              entry.canonicalId === s.focusedNodeId ||
              entry.canonicalId === s.tourHighlightId ||
              entry.canonicalId === s.HoveredNodeId,
            nodeType: entry.nodeType,
          });
        });

        projected.sort((a, b) => a.y - b.y);
        const minLabelGapY = 24;
        const minLabelGapX = 88;

        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < projected.length; j++) {
              const dx = Math.abs(projected[i].x - projected[j].x);
              const dy = Math.abs(projected[i].y - projected[j].y);
              if (dx < minLabelGapX && dy < minLabelGapY) {
                const push = (minLabelGapY - dy) * 0.35 + 1;
                projected[i].y -= push;
                projected[j].y += push;
              }
            }
            if (projected[i].x < 240 && projected[i].y < 96) {
              projected[i].y = 100;
            }
            projected[i].x = THREE.MathUtils.clamp(projected[i].x, 20, width - 165);
            projected[i].y = THREE.MathUtils.clamp(projected[i].y, 72, height - 120);
          }
        }

        // Stable DOM sort order prevents React from reordering <button> elements mid-click while the sphere orbits
        projected.sort((a, b) => `${a.nodeType}-${a.id}`.localeCompare(`${b.nodeType}-${b.id}`));

        setLabels2D(projected);

        const tel = buildCurrentTelemetry(s);
        callbacksRef.current.onTelemetryChange(tel);
        const posDiff =
          Math.abs(s.targetRadius - s.radius) + s.panOffset.distanceTo(s.targetPanOffset);
        const angDiffDeg = THREE.MathUtils.radToDeg(
          Math.hypot(s.targetAzimuth - s.azimuth, s.targetPolar - s.polar)
        );
        if (
          !s.flightActive &&
          s.activeLoopMode === 'off' &&
          posDiff <= 0.02 &&
          angDiffDeg <= 0.25
        ) {
          s.stableArrivalFrames += 1;
        } else {
          s.stableArrivalFrames = 0;
        }
        if (
          !tel.isMoving &&
          s.stableArrivalFrames >= 3 &&
          s.settledCommandId !== s.lastCommandId
        ) {
          s.settledCommandId = s.lastCommandId;
          callbacksRef.current.onCameraSettled?.(s.lastCommandId, tel);
        }
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      domEl.removeEventListener('webglcontextlost', handleContextLost);
      domEl.removeEventListener('webglcontextrestored', handleContextRestored);
      domEl.removeEventListener('contextmenu', onContextMenu);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      if (composer) {
        composer.dispose();
      }
      renderer.dispose();
    };
  }, [customDomains.length, sphereMaterials.hq, sphereMaterials.cde]);

  const showReducedGraphicsFallback =
    forceWebglFallback || webglStatus === 'FALLBACK' || webglStatus === 'CONTEXT_LOST';

  return (
    <div className="fixed inset-0 z-[5] select-none">
      {/* WebGL Canvas Mount */}
      <div
        ref={mountRef}
        className={`w-full h-full touch-none ${showReducedGraphicsFallback ? 'opacity-15 pointer-events-none' : ''}`}
      />

      {/* Reduced-Graphics Spatial View Fallback when WebGL is unavailable or forced for diagnostics */}
      {showReducedGraphicsFallback && (
        <div
          data-testid="reduced-graphics-fallback"
          className="fixed inset-0 z-15 flex items-center justify-center p-6 pointer-events-auto"
        >
          <div
            className="max-w-xl w-full rounded-2xl border p-5 space-y-4 shadow-2xl"
            style={{
              backgroundColor: COLOUR_TOKENS.glassRgba,
              borderColor: COLOUR_TOKENS.outlineControl,
            }}
          >
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div>
                <div className="font-mono text-[10px] text-[#F2B66D] uppercase">
                  REDUCED-GRAPHICS SPATIAL WORKSPACE
                </div>
                <h2 className="font-display text-sm md:text-base font-semibold text-[#F2F6F8]">
                  {activeSphere === 'hq' ? 'HQ Spatial Map' : 'CDE Universe Map'}
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[#BDCBD3]">
                {webglReason || '2D Spatial Navigation Active'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeSphere === 'hq'
                ? CEREBRO_STATIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectNode(st.id, 'station', 'hq')}
                      className="min-h-[44px] p-2.5 rounded-xl border border-white/25 bg-[#101D27] hover:border-[#4C8DFF] text-left cursor-pointer"
                    >
                      <div className="font-mono text-[10px]" style={{ color: st.colour }}>
                        {st.code}
                      </div>
                      <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                        {st.label}
                      </div>
                    </button>
                  ))
                : CDE_DIMENSIONS.map((dim) => (
                    <button
                      key={dim.id}
                      type="button"
                      onClick={() => onSelectNode(dim.id, 'dimension', 'cde')}
                      className="min-h-[44px] p-2.5 rounded-xl border border-white/25 bg-[#101D27] hover:border-[#4C8DFF] text-left cursor-pointer"
                    >
                      <div className="font-mono text-[10px]" style={{ color: dim.colour }}>
                        CDE DIMENSION
                      </div>
                      <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                        {dim.label}
                      </div>
                    </button>
                  ))}
            </div>

            <div className="pt-2 border-t border-white/15">
              <div className="font-mono text-[10px] text-[#BDCBD3] mb-2">PROJECTS</div>
              <div className="flex flex-wrap gap-1.5">
                {PROJECTS_DATA.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectNode(p.id, 'project', activeSphere)}
                    className="min-h-[38px] px-3 py-1 rounded-lg border border-white/25 bg-[#101D27] font-mono text-xs text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
                  >
                    {p.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Camera Touch / Drag / Pinch / Pan Indicators */}
      {touchIndicator.active && (
        <div
          className="fixed pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: touchIndicator.x, top: touchIndicator.y }}
        >
          <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
            <circle
              cx="42"
              cy="42"
              r="24"
              stroke={COLOUR_TOKENS.cobaltAccent}
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <circle cx="42" cy="42" r="4" fill={COLOUR_TOKENS.textPrimary} />
            <text
              x="42"
              y="78"
              textAnchor="middle"
              className="font-mono text-[9px] uppercase"
              fill={COLOUR_TOKENS.textCoord}
            >
              {touchIndicator.mode}
            </text>
          </svg>
        </div>
      )}

      {/* Anchored 3D Labels Following the Camera */}
      {!showReducedGraphicsFallback && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {labels2D.map((item) => {
            const isBehindGlass = item.zDepth > 1.2 && !item.isFocused;
            return (
              <button
                key={`${activeSphere}-${item.id}-${item.nodeType}`}
                type="button"
                data-testid={`sphere-label-${item.id}`}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerEnter={() => {
                  stateRef.current.HoveredNodeId = item.id;
                  const panX = (item.x / Math.max(1, window.innerWidth)) * 2 - 1;
                  soundEngine.playNodeHover(panX);
                }}
                onPointerLeave={() => {
                  if (stateRef.current.HoveredNodeId === item.id) {
                    stateRef.current.HoveredNodeId = null;
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const panX = (item.x / Math.max(1, window.innerWidth)) * 2 - 1;
                  soundEngine.playNodeSelect(panX);
                  onSelectNode(item.id, item.nodeType, activeSphere);
                }}
                style={{
                  transform: `translate3d(${Math.round(item.x)}px, ${Math.round(item.y)}px, 0)`,
                  opacity: isBehindGlass ? 0.38 : 1,
                  borderColor: item.isFocused ? item.colour : 'rgba(255,255,255,0.32)',
                  backgroundColor: item.isFocused
                    ? 'rgba(20, 38, 50, 0.95)'
                    : 'rgba(16, 29, 39, 0.84)',
                }}
                className="fixed top-0 left-0 min-h-[38px] pointer-events-auto cursor-pointer px-2.5 py-1 rounded-lg border transition-opacity duration-150 flex items-center gap-2 text-left group hover:border-[#4C8DFF]"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.colour }}
                />
                <div className="flex flex-col">
                  <span className="font-sans text-xs font-medium text-[#F2F6F8] leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="font-mono text-[10px] text-[#BDCBD3] leading-tight whitespace-nowrap">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {captionBubble && (
            <div
              className="fixed left-1/2 top-[16%] -translate-x-1/2 z-20 max-w-md px-4 py-2.5 rounded-xl border neural-reveal pointer-events-none"
              style={{
                backgroundColor: 'rgba(16, 29, 39, 0.84)',
                borderColor: 'rgba(255, 255, 255, 0.14)',
                boxShadow: 'inset 0 1px 0 rgba(180, 221, 255, 0.18), 0 20px 50px rgba(0, 0, 0, 0.55)',
              }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#65ACFF' }}
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#B4DDFF]">
                  Cerebro
                </span>
              </div>
              <p className="font-sans text-xs md:text-sm text-[#F2F6F8] leading-snug">
                {captionBubble}
              </p>
            </div>
          )}

          {/* v4.0 3D Cylindrical Project Media Tube Floating HUD Controls */}
          {mediaTubeState?.active && (() => {
            const tubeItems = buildProjectMediaTubeItems(mediaTubeState.projectId);
            const focusedIdx = mediaTubeState.focusedTileIndex ?? 0;
            const focusedTile = tubeItems[focusedIdx] || tubeItems[0];
            return (
              <div
                data-testid="project-media-tube-hud"
                data-ui-id="project-media-tube-hud"
                onPointerDown={(e) => e.stopPropagation()}
                className="fixed left-1/2 bottom-28 -translate-x-1/2 z-30 pointer-events-auto flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-[94vw]"
                style={{
                  backgroundColor: 'rgba(20, 38, 50, 0.86)',
                  borderColor: 'rgba(255, 255, 255, 0.18)',
                }}
              >
                <div className="pr-2 border-r border-white/15">
                  <div className="font-mono text-[10px] text-[#F2B66D] uppercase">
                    3D MEDIA TUBE · {mediaTubeState.projectId} (8×3 CYLINDER · 5.4u)
                  </div>
                  <div className="font-sans text-xs font-semibold text-[#F2F6F8]">
                    Tile #{focusedIdx + 1}/24 · {focusedTile.title}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-cta-id="media-tube-prev"
                    data-action-id="media.previous"
                    onClick={() => {
                      const prevIdx = (focusedIdx - 1 + tubeItems.length) % tubeItems.length;
                      onSelectMediaTubeTile?.(prevIdx, tubeItems[prevIdx]);
                    }}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg font-mono text-xs bg-[#101D27] border border-white/20 text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer"
                  >
                    ‹ Prev Tile
                  </button>
                  <button
                    type="button"
                    data-cta-id="media-tube-next"
                    data-action-id="media.next"
                    onClick={() => {
                      const nextIdx = (focusedIdx + 1) % tubeItems.length;
                      onSelectMediaTubeTile?.(nextIdx, tubeItems[nextIdx]);
                    }}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg font-mono text-xs bg-[#101D27] border border-white/20 text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer"
                  >
                    Next Tile ›
                  </button>
                  <button
                    type="button"
                    data-cta-id="media-tube-fullview"
                    data-action-id="media.open"
                    onClick={() => onOpenMediaTubeFullView?.(focusedTile)}
                    className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-xs bg-[#F2B66D] text-[#101D27] font-semibold cursor-pointer"
                  >
                    Open Full View
                  </button>
                  <button
                    type="button"
                    data-cta-id="media-tube-close"
                    data-action-id="media.close"
                    onClick={() => onCloseMediaTube?.()}
                    className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-xs bg-[#101D27] border border-[#65ACFF] text-[#B4DDFF] hover:bg-[#4C8DFF] hover:text-[#101D27] cursor-pointer"
                  >
                    ← Return to Project
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
