import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeShellGeometryCache, seedShellGeometry } from '../three/geometryRegistry';
import { applyNeutralStudioEnvironment } from '../three/studioEnvironment';
import {
  SPHERE_SHAPE_EVENT,
  resetSphereShapes,
  setMasterSphereShape,
  type SphereShapeRequest,
} from '../three/masterSphereShape';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { COLOUR_TOKENS } from '../tokens/colours';
import {
  CEREBRO_STATIONS,
  CDE_DIMENSIONS,
  PROJECTS_DATA,
  VISIBLE_PROJECTS_DATA,
  HQ_NESTED_PROJECT_PARENT,
  HQ_PROJECTS_DATA,
  ProjectHealth,
} from '../data/sourceData';
import { HQ_NODE_LINKS } from '../data/hqNodeWiring';
import { contentChip, resolveNodeContent } from '../data/nodeContent';
import {
  PROJECT_MEDIA_TUBE_SPECS,
  buildProjectMediaTubeItems,
  type ProjectMediaTubeItem,
} from '../three/mediaTubeItems';
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
  quinticSmootherstep,
} from '../gui/cameraPresets';
import { GUI_TIMING_TOKENS, GUI_WORLD_MOTION_TOKENS } from '../gui/guiTokens';
import { GuiRect } from '../gui/CollisionManager';
import { ProjectedTargetScreenCoords } from '../gui/GuiFocusOverlay';
import {
  patchFresnelRimOnOpaqueFragment,
  createResizeSnapshot,
  readHomeComposition,
  executeAtomicReframe,
  IDLE_MS,
} from '../three/camera/CameraDirector';
import { SPHERE_SHOTS, STATION_SHOTS } from '../data/shotMediaCatalog';
import {
  MAT_GOLD_SHEEN,
  MAT_LIQUID_GLASS_SHELL,
} from '../materials/matLiquidGlassShell';
import {
  createCardiacConnectorTube,
  type CardiacConnectorUniforms,
} from '../materials/matCardiacConnector';
import {
  MASTER_SPHERE,
  projectPortalCountLabel,
} from '../three/masterSphere';
import {
  mountUnavailableProjectWorld,
  type ProjectWorldHostHandle,
} from '../three/projectWorldHost';
import { getProjectWorldManifest } from '../data/projectWorldManifest';
import { HandGlove3D } from '../three/HandGlove3D';
import { gloveFrustum } from '../three/handTracker';
import { NodeInteractionLayer } from '../three/nodeInteraction';
import { isEditableTarget } from '../gui/keyboardInset';
import { createBackgroundStarfield } from '../three/backgroundStarfield';
import { isolateDecorativeGeometry, type CosmeticFade } from '../three/decorativeIsolation';
import { handIsFresh, handStateRef } from '../three/handStateRef';
import { IntentJitterGate, handInteractionMachine, splineJourney } from '../three/camera/CameraDirector';
import type { JourneyBeat } from '../three/camera/journeyConfig';
import {
  CAMERA_MOTION_TARGETS,
  clampNodeFocusMs,
  clampSphereTravelMs,
  clearMountedSphereInstances,
  createSharedOuterShellMaterial,
  getMountedSphereInstances,
  registerMountedSphereInstances,
  SHARED_OUTER_SHELL_MATERIAL_PRESET,
  type ConnectedSphereId,
  SPHERE_NETWORK,
  sphereCenterVec,
  sphereNetworkCentroid,
} from '../three/sphereNetwork';
import { shouldUseFlatGlass } from '../three/glassFallback';
import {
  ABOUT_US_NODES,
  CAMPAIGN_OS_NODES,
  SPHERE_CAPTION,
} from '../data/peerSphereContent';
import { createIstanbaMouldProof, type IstanbaProofHandle } from '../three/istanbaMouldProof';
import { SpatialLabelBillboardLayer } from '../three/spatialLabelBillboards';

// ---------------------------------------------------------------------------
// CEREBRO-NOJARA D0 v1.24 — SECTION 2: THREE.JS RENDERER, MATERIALS, LIGHTS
// ---------------------------------------------------------------------------
const AgX =
  (THREE as unknown as { AgXToneMapping?: THREE.ToneMapping }).AgXToneMapping ??
  THREE.ACESFilmicToneMapping;

export function setupRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = AgX;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x101d27, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

function makeStripeBump(size = 256, stripes = 32): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < size; y++) {
    const v = Math.floor(
      ((Math.sin((y / size) * Math.PI * 2 * stripes) + 1) * 0.5) * 255
    );
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

export interface D0Materials {
  goldRibbed: THREE.MeshPhysicalMaterial;
  opticalGlass: THREE.MeshPhysicalMaterial;
  titanium: THREE.MeshPhysicalMaterial;
  stripeBump: THREE.CanvasTexture;
}

let cachedD0Materials: D0Materials | null = null;

export function getD0Materials(): D0Materials {
  if (cachedD0Materials) return cachedD0Materials;
  const stripeBump = makeStripeBump();
  cachedD0Materials = {
    stripeBump,
    goldRibbed: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#D4AF37'),
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      reflectivity: 1.0,
      sheen: MAT_GOLD_SHEEN.sheen,
      sheenRoughness: MAT_GOLD_SHEEN.sheenRoughness,
      sheenColor: new THREE.Color(MAT_GOLD_SHEEN.sheenColor),
      bumpMap: stripeBump,
      bumpScale: 0.035,
    }),
    opticalGlass: createSharedOuterShellMaterial({ face: 'front' }),
    titanium: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#C5CCD6'),
      metalness: 0.88,
      roughness: 0.28,
      clearcoat: 0.2,
    }),
  };
  return cachedD0Materials;
}

export function applyMaterial(mesh: THREE.Mesh, next: THREE.Material): void {
  const prev = mesh.material;
  mesh.material = next;
  if (Array.isArray(prev)) prev.forEach((m) => m.dispose());
  else if (prev && prev !== next) prev.dispose();
}

export function disposeD0(): void {
  if (!cachedD0Materials) return;
  cachedD0Materials.goldRibbed.dispose();
  cachedD0Materials.opticalGlass.dispose();
  cachedD0Materials.titanium.dispose();
  cachedD0Materials.stripeBump.dispose();
  cachedD0Materials = null;
}

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
  | 'tube_front'
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
  sphere: ConnectedSphereId;
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
  /** What the node holds at a glance, e.g. "1 video · 2 photos" or "No media yet". */
  contentLine?: string;
  objectCode?: string;
  sculptureTag?: string;
  colour: string;
  x: number;
  y: number;
  anchorX?: number;
  anchorY?: number;
  zDepth: number;
  isFocused: boolean;
  nodeType: 'core' | 'station' | 'dimension' | 'subdomain' | 'project';
}

export interface CameraCommandPayload {
  id: number;
  /** L06 — navigation generation; stale completions must ignore older generations. */
  generation?: number;
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
    | 'set_loop'
    | 'journey_start'
    | 'journey_stop';
  targetSphere?: ConnectedSphereId;
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

export {
  PROJECT_MEDIA_TUBE_SPECS,
  buildProjectMediaTubeItems,
  type ProjectMediaTubeItem,
} from '../three/mediaTubeItems';

export interface MediaTubeStateProp {
  active: boolean;
  projectId: string;
  focusedTileIndex: number | null;
  /** Centre the tube on this sphere instead of the active one (journey beats fly across spheres). */
  sphere?: ConnectedSphereId;
  filterKind?: 'all' | 'image' | 'video' | 'pdf';
}

export interface CosmographCanvasProps {
  activeSphere: ConnectedSphereId;
  focusedNodeId: string | null;
  tourHighlightId: string | null;
  captionBubble: string | null;
  reducedMotion: boolean;
  audioRms?: number;
  forceWebglFallback?: boolean;
  cameraCommand: CameraCommandPayload | null;
  customDomains?: CustomDomain3D[];
  sphereMaterials?: { hq: DomainMaterialPreset; cde: DomainMaterialPreset };
  onSelectNode: (id: string, nodeType: AnchoredLabel2D['nodeType'], sphere: ConnectedSphereId) => void;
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
  /** Optional hook after the Three.js scene is mounted (project-world proofs, QA). */
  onSceneReady?: (scene: THREE.Scene) => void;
  /** When hand tracking is lost, settle residual gesture velocity without teleport. */
  gestureTrackingActive?: boolean;
  /**
   * When false (hand tracking owns the camera), pointer/touch orbit-drag is disabled.
   * Re-enabling damps residual angular velocity instead of snapping.
   */
  pointerOrbitEnabled?: boolean;
  /** Active project-world portal id — mounts/disposes a scoped host under master. */
  projectWorldId?: string | null;
  projectWorldState?: 'entry' | 'active' | 'suspended' | 'exiting' | 'unavailable' | null;
  /**
   * L08 — idle auto-orbit only when no voice/panel/project/media/tour owns the stage.
   * Explicit autoOrbit commands still apply.
   */
  idleOrbitAllowed?: boolean;
  /** Hand camera is live: mounts the 3D glove and spatial controls on the camera. */
  handsActive?: boolean;
  /** Journey caption beat; null clears the caption when the journey ends. */
  onJourneyBeat?: (beat: JourneyBeat | null) => void;
}

export const HQ_CENTER = sphereCenterVec('hq');
export const CDE_CENTER = sphereCenterVec('cde');
export const CAMPAIGN_OS_CENTER = sphereCenterVec('campaign-os');
export const ABOUT_US_CENTER = sphereCenterVec('about-us');

function resolveSphereCenter(id: string | null | undefined): THREE.Vector3 {
  if (id === 'cde') return CDE_CENTER;
  if (id === 'campaign-os') return CAMPAIGN_OS_CENTER;
  if (id === 'about-us') return ABOUT_US_CENTER;
  return HQ_CENTER;
}

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
const _handWorldUp = new THREE.Vector3(0, 1, 0);
const _handProbe = new THREE.Vector3();
const _handNodeProbe = new THREE.Vector3();
const HAND_PAN_MAX = 14;
const HAND_JITTER_FILTER_MS = 120;
const HAND_DOLLY_GAIN = 4.5;
const HAND_ROLL_MAX_DEG = 25;
const HAND_ROLL_RELAX_PER_SEC = 1.5;
const LINK_HIDE_EPSILON = 0.02;

interface JourneyAdoptState {
  azimuth: number;
  polar: number;
  radius: number;
  targetAzimuth: number;
  targetPolar: number;
  targetRadius: number;
  panOffset: THREE.Vector3;
  targetPanOffset: THREE.Vector3;
  currentCenter: THREE.Vector3;
  targetCenter: THREE.Vector3;
  focalLengthMm: number;
  targetFocalLengthMm: number;
  cameraRollDeg: number;
  targetRollDeg: number;
  flightActive: boolean;
  flightCurve: THREE.CatmullRomCurve3 | null;
  flightLookAtCurve: THREE.CatmullRomCurve3 | null;
  flightIsInterSphere: boolean;
  activeLoopMode: CameraLoopMode;
  autoOrbit: boolean;
  stoppedExplicitly: boolean;
}

const _journeyOffset = new THREE.Vector3();

/** Hand the camera back to the orbit rig exactly where the journey left it, so nothing snaps. */
function adoptJourneyPose(s: JourneyAdoptState, position: THREE.Vector3, target: THREE.Vector3, focalMm: number): void {
  s.panOffset.copy(target).sub(s.currentCenter);
  s.targetPanOffset.copy(s.panOffset);
  s.targetCenter.copy(s.currentCenter);
  _journeyOffset.copy(position).sub(target);
  const radius = Math.max(0.5, _journeyOffset.length());
  const polar = Math.acos(THREE.MathUtils.clamp(_journeyOffset.y / radius, -1, 1));
  const azimuth = Math.atan2(_journeyOffset.x, _journeyOffset.z);
  s.radius = s.targetRadius = radius;
  s.polar = s.targetPolar = THREE.MathUtils.clamp(polar, 0.12, Math.PI - 0.12);
  s.azimuth = s.targetAzimuth = azimuth;
  s.focalLengthMm = s.targetFocalLengthMm = focalMm;
  s.cameraRollDeg = s.targetRollDeg = 0;
}


const _captureDir = new THREE.Vector3();
const _captureLook = new THREE.Vector3();
const _captureTarget = new THREE.Vector3();

/**
 * Deliberate input during a scripted move (flight curve or lemniscate loop): freeze the pose the
 * camera is actually showing, hand it to the orbit rig, and let the scripted move end. The camera
 * never jumps toward the move's destination, and any banking roll relaxes instead of snapping.
 */
function captureLiveCameraPose(s: JourneyAdoptState, camera: THREE.PerspectiveCamera): void {
  const scripted = s.flightActive || s.activeLoopMode === 'lemniscate';
  if (scripted) {
    const roll = s.cameraRollDeg;
    camera.getWorldDirection(_captureDir);
    const distance = Math.max(3.2, camera.position.distanceTo(_captureLook.copy(s.currentCenter).add(s.panOffset)));
    _captureTarget.copy(camera.position).addScaledVector(_captureDir, distance);
    adoptJourneyPose(s, camera.position, _captureTarget, s.focalLengthMm);
    s.cameraRollDeg = roll;
  }
  s.flightActive = false;
  s.flightCurve = null;
  s.flightLookAtCurve = null;
  s.flightIsInterSphere = false;
  s.activeLoopMode = 'off';
}

function beginJourney(s: JourneyAdoptState, reducedMotion: boolean): void {
  s.flightActive = false;
  s.flightCurve = null;
  s.flightLookAtCurve = null;
  s.flightIsInterSphere = false;
  s.activeLoopMode = 'off';
  s.autoOrbit = false;
  s.stoppedExplicitly = false;
  splineJourney.start({ reducedMotion });
}
const _scratchColor = new THREE.Color();

/**
 * Post-Processing Custom Cinema ShaderPass (v4.0):
 * - 2.5% monochromatic grain updated at 24Hz (paused when stopped or reduced-motion)
 * - 0% radial chromatic aberration (keeps UI & 3D text razor sharp)
 * - Soft ink vignette (#03060c) — light enough to preserve atmospheric blooms
 */
const CinemaFilmGrainVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uGrainIntensity: { value: 0.025 },
    uChromaticAmount: { value: 0.0 },
    uVignetteStrength: { value: 0.07 },
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

      // Soft deep-ink vignette (#03060c) — avoids flattening back to old #101D27 navy
      float vig = smoothstep(0.42, 0.96, dist);
      vec3 inkVignette = vec3(0.0118, 0.0235, 0.0471);
      vec3 graded = mix(baseCol.rgb, inkVignette, vig * uVignetteStrength);

      // 2.5% monochromatic film grain quantized at 24Hz
      float quantizedTime = floor(uTime * 24.0) / 24.0;
      float grain = (hash12(vUv * 512.0 + vec2(quantizedTime * 37.0, -quantizedTime * 23.0)) - 0.5) * uGrainIntensity;
      graded += vec3(grain);

      gl_FragColor = vec4(clamp(graded, 0.0, 1.0), baseCol.a);
    }
  `,
};

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
  onSceneReady,
  gestureTrackingActive = true,
  pointerOrbitEnabled = true,
  projectWorldId = null,
  projectWorldState = null,
  idleOrbitAllowed = true,
  handsActive = false,
  onJourneyBeat,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const masterRootRef = useRef<THREE.Object3D | null>(null);
  const projectWorldHostRef = useRef<ProjectWorldHostHandle | null>(null);
  const [labels2D, setLabels2D] = useState<AnchoredLabel2D[]>([]);
  const [webglStatus, setWebglStatus] = useState<'ACTIVE' | 'CONTEXT_LOST' | 'FALLBACK'>('ACTIVE');
  const [webglReason, setWebglReason] = useState<string>('');
  /** Bump to tear down and recreate the WebGL renderer after context loss/restore. */
  const [webglRebuildKey, setWebglRebuildKey] = useState(0);
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
      onJourneyBeat,
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
      onJourneyBeat,
  };
  const handsActiveRef = useRef(handsActive);
  handsActiveRef.current = handsActive;

  const mediaTubeStateRef = useRef<MediaTubeStateProp | null>(mediaTubeState);
  mediaTubeStateRef.current = mediaTubeState;
  const idleOrbitAllowedRef = useRef(idleOrbitAllowed);
  idleOrbitAllowedRef.current = idleOrbitAllowed;

  const unobstructedRectRef = useRef<GuiRect | undefined>(unobstructedRect);
  unobstructedRectRef.current = unobstructedRect;

  const stateRef = useRef({
    activeSphere,
    focusedNodeId,
    tourHighlightId,
    HoveredNodeId: null as string | null,
    reducedMotion,
    audioRms: 0,
    lastUserInputTime: 0,
    // Constellation overview — pull back wide enough that HQ/CDE/Campaign/About all read.
    targetCenter: sphereNetworkCentroid(),
    currentCenter: sphereNetworkCentroid(),
    azimuth: -0.42,
    polar: 1.28,
    radius: 34,
    targetAzimuth: -0.28,
    targetPolar: 1.32,
    targetRadius: 30,
    panOffset: new THREE.Vector3(0, 0, 0),
    targetPanOffset: new THREE.Vector3(0, 0, 0),
    focalLengthMm: 24,
    targetFocalLengthMm: 24,
    cameraRollDeg: 0,
    targetRollDeg: 0,
    activeLensId: '24mm' as CinemaLensId,
    activeAnglePreset: null as CameraAnglePresetId | null,
    activeLoopMode: 'off' as CameraLoopMode,
    autoOrbit: false,
    stoppedExplicitly: false,
    turnSeconds: 40,
    currentAngularVel: 0.026,
    flightActive: true,
    flightStartTime: performance.now(),
    flightDurationMs: 3600,
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
    gestureAccepting: true,
    gestureResidualAzVel: 0,
    gestureLossSettleUntil: 0,
    lastCameraCommandLog: null as null | {
      commandId: number;
      verb: string;
      target: [number, number, number];
      pose: [number, number, number];
      phase: string;
      dtMs: number;
      sceneSafeRect: GuiRect | null;
    },
  });

  const gestureTrackingRef = useRef(gestureTrackingActive);
  const pointerOrbitEnabledRef = useRef(pointerOrbitEnabled);
  useEffect(() => {
    const wasActive = gestureTrackingRef.current;
    gestureTrackingRef.current = gestureTrackingActive;
    const s = stateRef.current;
    if (wasActive && !gestureTrackingActive) {
      // Tracking lost: stop receiving gesture targets; settle residual velocity ≤400ms; no teleport.
      s.gestureAccepting = false;
      s.gestureLossSettleUntil =
        performance.now() + CAMERA_MOTION_TARGETS.gestureLossSettleMsMax;
      s.currentAngularVel = Math.min(
        s.currentAngularVel,
        Math.abs(s.gestureResidualAzVel) || s.currentAngularVel
      );
    } else if (gestureTrackingActive) {
      s.gestureAccepting = true;
      s.gestureLossSettleUntil = 0;
      s.gestureResidualAzVel = 0;
    }
  }, [gestureTrackingActive]);

  useEffect(() => {
    const wasEnabled = pointerOrbitEnabledRef.current;
    pointerOrbitEnabledRef.current = pointerOrbitEnabled;
    const s = stateRef.current;
    if (wasEnabled && !pointerOrbitEnabled) {
      // Hand tracking owns camera — freeze pointer orbit; yield matrix updates to gestures.
      s.flightActive = false;
      s.currentAngularVel *= 0.35;
      s.gestureAccepting = true;
    } else if (!wasEnabled && pointerOrbitEnabled) {
      // Smooth hand-off back to mouse/touch: damp residual velocity (no snap).
      s.gestureLossSettleUntil =
        performance.now() + CAMERA_MOTION_TARGETS.gestureLossSettleMsMax;
      s.currentAngularVel = Math.min(s.currentAngularVel, 0.45);
      s.gestureResidualAzVel *= 0.5;
    }
  }, [pointerOrbitEnabled]);

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
        contentLine?: string;
        objectCode?: string;
        sculptureTag?: string;
        colour: string;
        sphere: ConnectedSphereId;
        worldPos: THREE.Vector3;
        baseScale: number;
        nodeType: AnchoredLabel2D['nodeType'];
        connectedIds: Set<string>;
        currentBrightness: number;
        groupMesh?: THREE.Group;
        haloMesh?: THREE.Mesh;
        emissiveMats: THREE.MeshStandardMaterial[];
        wireMat?: THREE.LineBasicMaterial;
        connectorUniforms?: CardiacConnectorUniforms;
        connectorMesh?: THREE.Object3D;
      }
    >
  >(new Map());

  const resolveNodeEntry = (nodeId: string, preferredSphere: ConnectedSphereId) => {
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
    if (verb !== 'journey_start' && splineJourney.isActive()) splineJourney.stop('interrupted');

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
        // 4-Phase Inter-World Travel between live sphere centers (diamond constellation).
        const bridgeApex = s.currentCenter
          .clone()
          .lerp(destCenter, 0.5)
          .add(new THREE.Vector3(0, 6.4, 0));
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
        const lookBridge = startLookAt.clone().lerp(endLookAt, 0.5);
        const lookMid1 = startLookAt.clone().lerp(lookBridge, 0.48);
        const lookMid2 = lookBridge.clone().lerp(endLookAt, 0.52);
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
      const center = resolveSphereCenter(destSphere);
      const travelMs = clampSphereTravelMs(center.distanceTo(s.currentCenter));
      s.activeLoopMode = 'off';
      s.targetRollDeg = 0;
      s.activeLensId = '35mm';
      s.targetPanOffset.set(0, 0, 0);
      // Interrupt prior flight by replacing curve — no snap when reducedMotion is false.
      triggerCometFlight(center, 0.18, 1.38, 19.0, travelMs, true, 35);
      s.lastCameraCommandLog = {
        commandId: id,
        verb,
        target: [center.x, center.y, center.z],
        pose: [s.currentCenter.x, s.currentCenter.y, s.currentCenter.z],
        phase: 'switch_sphere_flight',
        dtMs: travelMs,
        sceneSafeRect: unobstructedRectRef.current
          ? { ...unobstructedRectRef.current }
          : null,
      };
    } else if (verb === 'focus_node' && targetNodeId) {
      const sphereHint = targetSphere || s.activeSphere;
      const node = resolveNodeEntry(targetNodeId, sphereHint);
      if (node) {
        const sphereCenter = resolveSphereCenter(node.sphere);
        const localVec = node.worldPos.clone().sub(sphereCenter);
        const r = Math.max(0.1, localVec.length());
        const pol = Math.acos(THREE.MathUtils.clamp(localVec.y / r, -1, 1));
        const az = Math.atan2(localVec.x, localVec.z);
        s.targetPanOffset.copy(localVec).multiplyScalar(0.22);
        const isCrossingSpheres = sphereCenter.distanceTo(s.currentCenter) > 10;
        const focusMs = clampNodeFocusMs(isCrossingSpheres);
        triggerCometFlight(sphereCenter, az, pol, 5.4, focusMs, isCrossingSpheres);
        s.lastCameraCommandLog = {
          commandId: id,
          verb,
          target: [sphereCenter.x, sphereCenter.y, sphereCenter.z],
          pose: [s.currentCenter.x, s.currentCenter.y, s.currentCenter.z],
          phase: isCrossingSpheres ? 'cross_sphere_focus' : 'node_focus',
          dtMs: focusMs,
          sceneSafeRect: unobstructedRectRef.current
            ? { ...unobstructedRectRef.current }
            : null,
        };
      }
    } else if (verb === 'center' || verb === 'arrival') {
      const center = resolveSphereCenter(targetSphere || s.activeSphere);
      const travelMs = clampSphereTravelMs(center.distanceTo(s.currentCenter));
      s.activeLoopMode = 'off';
      s.activeAnglePreset = null;
      s.targetRollDeg = 0;
      s.activeLensId = '35mm';
      s.targetFocalLengthMm = 35;
      s.targetPanOffset.set(0, 0, 0);
      triggerCometFlight(center, 0.12, 1.42, 19.0, travelMs);
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
      const sphereCenter = resolveSphereCenter(s.activeSphere);
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
          s.targetRadius = 3.6; // Clear of outer cage rib (~6.29u)
          s.targetRollDeg = 0;
          s.targetPanOffset.set(0, 0, 0);
          break;
        case 'tube_front':
          // Inside the media tube, back to the focused tile (the tube rotates it to +Z), so the
          // tile (top row) fills about a third of the view.
          s.targetPolar = 1.57;
          s.targetAzimuth = Math.PI;
          s.targetRollDeg = 0;
          s.targetFocalLengthMm = 85;
          s.activeLensId = '85mm';
          s.targetRadius = 3.2;
          s.targetPanOffset.set(0, PROJECT_MEDIA_TUBE_SPECS.rowPitchU, 0);
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
      if (!s.gestureAccepting && !gestureTrackingRef.current) {
        // Tracking lost — ignore new gesture targets; residual settle runs in the frame loop.
        return;
      }
      s.stoppedExplicitly = false;
      s.flightActive = false;
      s.activeLoopMode = 'off';
      const dAz = deltaAzimuth ?? 0.55;
      s.targetAzimuth += dAz;
      s.gestureResidualAzVel = dAz * 0.35;
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
      s.targetRadius = 4.2; // Past outer armature cage (~6.29u) into Interior Dome
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
    } else if (verb === 'journey_start') {
      beginJourney(s, s.reducedMotion);
    } else if (verb === 'journey_stop') {
      splineJourney.stop('skipped');
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
    // Do not yank Interior Dome / Macro Orbit back outside the armature cage (~6.3u).
    if (
      s.activeAnglePreset === 'interior_dome' ||
      s.activeLoopMode === 'macro_orbit' ||
      (s.activeAnglePreset === 'tube_front' && mediaTubeStateRef.current?.active)
    ) {
      return;
    }
    const sphereCenter = resolveSphereCenter(activeSphere);
    if (s.activeAnglePreset === 'tube_front' && mediaTubeStateRef.current?.active) {
      s.targetCenter.copy(sphereCenter);
      return;
    }
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
        // Past outer orbital cage (~6.29u) so station interiors / media are readable.
        s.targetRadius = 5.4;
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
    // Fitted GUI distances floor near ~9u (outside cage). Skip while inside dome/macro.
    if (
      s.activeAnglePreset === 'interior_dome' ||
      s.activeLoopMode === 'macro_orbit' ||
      (s.activeAnglePreset === 'tube_front' && mediaTubeStateRef.current?.active)
    ) {
      return;
    }
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

    const useFlatGlass = shouldUseFlatGlass({
      softwareGl: isSoftwareGl,
      forceFlat: new URLSearchParams(window.location.search).get('glass') === 'flat',
    });

    const rendererAttempts: THREE.WebGLRendererParameters[] = [
      {
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      },
      {
        antialias: false,
        alpha: true,
        powerPreference: 'default',
        preserveDrawingBuffer: false,
      },
      {
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
      },
    ];
    let lastRendererErr: unknown = null;
    let rendererCandidate: THREE.WebGLRenderer | null = null;
    for (const params of rendererAttempts) {
      try {
        rendererCandidate = new THREE.WebGLRenderer(params);
        break;
      } catch (err) {
        lastRendererErr = err;
      }
    }
    if (!rendererCandidate) {
      setWebglStatus('FALLBACK');
      setWebglReason(
        lastRendererErr instanceof Error
          ? lastRendererErr.message
          : 'WebGLRenderer initialization failed'
      );
      return;
    }
    const renderer = rendererCandidate;
    setWebglStatus('ACTIVE');
    setWebglReason(isSoftwareGl ? 'Software WebGL — liquid glass in translucent fallback mode' : '');

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.04;
    // Deep ink void for intro AND workspace — never the old flat #101D27 navy slab.
    const voidColor = 0x03060c;
    renderer.setClearColor(voidColor, 1);
    const coarsePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const pixelRatioCap = coarsePointer ? 1.5 : 2;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, pixelRatioCap)
    );
    renderer.setSize(initW, initH);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    setWebglStatus('ACTIVE');

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';
    domEl.style.cursor = 'grab';
    // One viewport only — never let the canvas paint wider than the shell
    // (100vw + DPR mismatch previously looked like a tiled second page).
    domEl.style.display = 'block';
    domEl.style.width = '100%';
    domEl.style.height = '100%';
    domEl.style.maxWidth = '100%';
    domEl.style.maxHeight = '100%';
    container.style.overflow = 'hidden';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.maxWidth = '100%';
    container.style.maxHeight = '100%';

    // Local flag — React state alone is too late to stop the in-flight RAF tick.
    let contextLost = false;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      setWebglStatus('CONTEXT_LOST');
      setWebglReason(
        'WebGL context lost — Reduced-graphics spatial view active. Retry restores the liquid-glass scene.'
      );
      window.dispatchEvent(
        new CustomEvent('cerebro:webgl-status', {
          detail: { status: 'CONTEXT_LOST', softwareGl: isSoftwareGl },
        })
      );
    };

    const handleContextRestored = () => {
      // Keep the old tick paused; remount recreates GPU resources once and
      // restores ACTIVE with the preserved stateRef camera/world selection.
      contextLost = true;
      setWebglReason('');
      setWebglRebuildKey((key) => key + 1);
      window.dispatchEvent(
        new CustomEvent('cerebro:webgl-status', {
          detail: { status: 'REBUILDING', softwareGl: isSoftwareGl },
        })
      );
    };

    if (isSoftwareGl) {
      window.dispatchEvent(
        new CustomEvent('cerebro:webgl-status', {
          detail: { status: 'SOFTWARE_GL', softwareGl: true },
        })
      );
    }

    domEl.addEventListener('webglcontextlost', handleContextLost, false);
    domEl.addEventListener('webglcontextrestored', handleContextRestored, false);

    const scene = new THREE.Scene();
    const spatialBillboards = new SpatialLabelBillboardLayer();
    scene.add(spatialBillboards.group);
    // Atmospheric radial field behind the dual spheres (intro + workspace).
    // Must read clearly against the old flat #101D27 navy — deeper ink, brighter blooms.
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1024;
    bgCanvas.height = 1024;
    {
      const bgCtx = bgCanvas.getContext('2d')!;
      // Deep-space volume: cosmic indigo core falling through navy into black.
      const g = bgCtx.createRadialGradient(512, 470, 20, 512, 540, 760);
      g.addColorStop(0, '#1b2556');
      g.addColorStop(0.2, '#121a45');
      g.addColorStop(0.46, '#0a1029');
      g.addColorStop(0.76, '#04071a');
      g.addColorStop(1, '#010208');
      bgCtx.fillStyle = g;
      bgCtx.fillRect(0, 0, 1024, 1024);
      // Faint electric-blue horizon wash so the glass has something to refract and reflect.
      const wash = bgCtx.createRadialGradient(512, 930, 10, 512, 930, 560);
      wash.addColorStop(0, 'rgba(40,110,210,0.20)');
      wash.addColorStop(1, 'rgba(40,110,210,0)');
      bgCtx.fillStyle = wash;
      bgCtx.fillRect(0, 0, 1024, 1024);
      // Sparse star dust — brighter so it survives fog + Hands wash.
      for (let i = 0; i < 220; i++) {
        const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233) * 12345.6789) % 1;
        const px = Math.abs(x) * 1024;
        const py = Math.abs(y) * 1024;
        const a = 0.22 + (Math.abs((Math.sin(i * 3.1) * 10000) % 1)) * 0.55;
        const size = i % 19 === 0 ? 2.2 : i % 7 === 0 ? 1.5 : 1;
        bgCtx.fillStyle = `rgba(242,246,248,${a.toFixed(3)})`;
        bgCtx.fillRect(px, py, size, size);
      }
    }
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTexture;
    // Soft fog so blooms and star dust remain readable in workspace (was 0.014 → navy wash).
    scene.fog = new THREE.FogExp2(voidColor, 0.0035);

    applyNeutralStudioEnvironment(scene, renderer);

    const camera = new THREE.PerspectiveCamera(46, initW / initH, 0.1, 200);
    scene.add(camera);

    const glove = new HandGlove3D(camera);
    const cosmeticFade: CosmeticFade = { value: 0 };
    const handJitterGate = new IntentJitterGate(HAND_JITTER_FILTER_MS);
    let handRollDeg = 0;
    const nodeInteraction = new NodeInteractionLayer({
      probeNode: (point, radius, preferId) => {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.height <= 0) return null;
        const st = stateRef.current;
        const ndc = _handProbe.copy(point).applyMatrix4(camera.projectionMatrix);
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.abs(point.z);
        const maxPx = (radius / (2 * halfH)) * rect.height;
        const px = (ndc.x * 0.5 + 0.5) * rect.width;
        const py = (-ndc.y * 0.5 + 0.5) * rect.height;
        let bestId: string | null = null;
        let bestDist = maxPx;
        for (const entry of nodeRegistryRef.current.values()) {
          if (entry.sphere !== st.activeSphere) continue;
          _handNodeProbe.copy(entry.worldPos).project(camera);
          if (_handNodeProbe.z > 1) continue;
          const d = Math.hypot(px - (_handNodeProbe.x * 0.5 + 0.5) * rect.width, py - (-_handNodeProbe.y * 0.5 + 0.5) * rect.height);
          if (preferId && entry.canonicalId === preferId && d <= maxPx) return preferId;
          if (d < bestDist) {
            bestDist = d;
            bestId = entry.canonicalId;
          }
        }
        return bestId;
      },
      onHover: (nodeId) => {
        stateRef.current.HoveredNodeId = nodeId;
      },
      onNodeSelect: (nodeId) => {
        const st = stateRef.current;
        for (const entry of nodeRegistryRef.current.values()) {
          if (entry.canonicalId === nodeId && entry.sphere === st.activeSphere) {
            callbacksRef.current.onSelectNode(entry.canonicalId, entry.nodeType, entry.sphere);
            return;
          }
        }
      },
    });

    splineJourney.setCallbacks({
      onBeat: (beat) => callbacksRef.current.onJourneyBeat?.(beat),
      onEnd: (reason) => {
        const last = splineJourney.lastPose();
        if (last) adoptJourneyPose(stateRef.current, last.position, last.target, last.focalMm);
        callbacksRef.current.onJourneyBeat?.(null);
        if (reason === 'complete') {
          const st = stateRef.current;
          st.lastUserInputTime = performance.now();
        }
      },
    });

    // Post-Processing: default app bans bloom/glow (L10). Film bloom stays intro-scoped only.
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let cinemaPass: ShaderPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      renderPass.renderToScreen = true;
      composer.addPass(renderPass);
    }

    // Sehly / Cerebro 39 Master Lighting Rig — toned down directional key & rim
    // intensities to eliminate blown-out white specular halos on outer shells.
    const ambientLight = new THREE.AmbientLight(0x1c2a5c, 1.05);
    scene.add(ambientLight);
    const skyFill = new THREE.HemisphereLight(0x4f9bff, 0x070a1c, 0.55);
    scene.add(skyFill);

    const keyLight = new THREE.DirectionalLight(0xE8FBFF, 0.85);
    keyLight.position.set(15, 25, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x65ACFF, 0.7);
    fillLight.position.set(-20, -14, -15);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xFFF4D0, 0.55);
    rimLight.position.set(0, 30, -20);
    scene.add(rimLight);

    const glassUniforms = {
      uTime: { value: 0 },
      uAudioRms: { value: 0 },
      uInteriorDome: { value: 0 },
    };

    const extraDisposables: Array<{ dispose: () => void }> = [];
    extraDisposables.push(bgTexture);

    const starfield = createBackgroundStarfield();
    scene.add(starfield.group);
    extraDisposables.push(starfield);

    // Procedural subtle brushed silver anisotropy bump map (Sehly metal_core #BCC9D4)
    const createSinusoidalStripeBumpTexture = (): THREE.DataTexture => {
      const width = 64;
      const height = 256;
      const data = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        const stripe = Math.round((0.5 + 0.5 * Math.sin((y / height) * Math.PI * 2 * 36)) * 255);
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          data[i] = stripe;
          data[i + 1] = stripe;
          data[i + 2] = stripe;
          data[i + 3] = 255;
        }
      }
      const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 16);
      tex.needsUpdate = true;
      return tex;
    };

    const goldRibbedBumpMap = createSinusoidalStripeBumpTexture();

    // =========================================================================
    // SEHLY / CEREBRO 39 PINNED PHYSICAL MATERIAL FAMILY
    // Source: regenerate_starter_meshes.py, design_tokens.json & Master Guidelines Page 5
    // =========================================================================

    // 1. Bronze / Gold Orbital Cage Material (regenerate_starter_meshes.py: #8C6A45 / #D4AF37, metalness: 0.85, roughness: 0.18)
    const sharedGoldRibbedMat = new THREE.MeshPhysicalMaterial({
      color: 0x8C6A45,
      metalness: 0.85,
      roughness: 0.34,
      clearcoat: 0.12,
      clearcoatRoughness: 0.35,
      sheen: MAT_GOLD_SHEEN.sheen,
      sheenRoughness: MAT_GOLD_SHEEN.sheenRoughness,
      sheenColor: new THREE.Color(MAT_GOLD_SHEEN.sheenColor),
      bumpMap: goldRibbedBumpMap,
      bumpScale: 0.015,
    });

    // 2. Gold Attention Node Material (regenerate_starter_meshes.py: #D4AF37, metalness: 0.95, roughness: 0.14, emissive: #382808)
    const sharedPolishedGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xD4AF37,
      emissive: new THREE.Color(0x382808),
      emissiveIntensity: 0.55,
      metalness: 0.95,
      roughness: 0.24,
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
      sheen: MAT_GOLD_SHEEN.sheen,
      sheenRoughness: MAT_GOLD_SHEEN.sheenRoughness,
      sheenColor: new THREE.Color(MAT_GOLD_SHEEN.sheenColor),
    });
    extraDisposables.push(sharedPolishedGoldMat);

    // 3. Shared Liquid Glass Core Material — unified with SHARED_OUTER_SHELL_MATERIAL_PRESET
    // so left, center, and right spheres never render as opaque mirrored chrome.
    const sharedBrushedSilverCoreMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'front',
    });
    extraDisposables.push(sharedBrushedSilverCoreMat);

    // Translucent Inner Core Envelope — unified with SHARED_OUTER_SHELL_MATERIAL_PRESET
    const sharedInnerSilverEnvelopeMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'front',
    });
    extraDisposables.push(sharedInnerSilverEnvelopeMat);

    // 4. Optical Portal Liquid Glass — same preset as MAT_LIQUID_GLASS_SHELL
    const sharedPortalDarkGlassMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'front',
    });
    extraDisposables.push(sharedPortalDarkGlassMat);

    // 5. Cool Ice / Focus Blue Accent Material — translucent liquid glass with ice tint
    const sharedCoolIceNodeMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'front',
    });
    extraDisposables.push(sharedCoolIceNodeMat);

    // 6. Refractive Liquid Glass Sub-Sphere Material (SHARED_OUTER_SHELL_MATERIAL_PRESET)
    const sharedCrystalGlassBubbleMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'front',
    });
    extraDisposables.push(sharedCrystalGlassBubbleMat);

    // 7. Outer Refractive Liquid Glass Shell (Master Containment Sphere r = 1.0R = 6.2u)
    // Shared MeshPhysicalMaterial preset from src/three/sphereNetwork.ts across all 4 spheres.
    const sharedOpticalGlassMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'front',
    });
    const sharedBackOpticalGlassMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'back',
    });
    void SHARED_OUTER_SHELL_MATERIAL_PRESET;
    const shellFrontBaseOpacity = sharedOpticalGlassMat.opacity;

    // Shared Liquid Glass Material (replaces legacy chrome titanium)
    const sharedTitaniumMat = createSharedOuterShellMaterial({
      softwareGl: useFlatGlass,
      face: 'front',
    });

    const rimColVec = new THREE.Color(0x7FE9FF);
    const bodyColVec = new THREE.Color(0x2F7BFF);

    const injectCausticShader = (mat: THREE.MeshPhysicalMaterial, isBack: boolean) => {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = glassUniforms.uTime;
        shader.uniforms.uAudioRms = glassUniforms.uAudioRms;
        shader.uniforms.uInteriorDome = glassUniforms.uInteriorDome;
        const waveAmp = '(0.015 + uAudioRms * 0.035)';
        shader.vertexShader =
          `uniform float uTime;\nuniform float uAudioRms;\n` +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            float wave = sin(position.x * 0.65 + uTime * 1.15) * cos(position.y * 0.65 + uTime * 0.9) * sin(position.z * 0.65 + uTime * 1.05);
            transformed += normal * (wave * ${waveAmp});`
          );
        shader.fragmentShader =
          `uniform float uTime;\nuniform float uAudioRms;\nuniform float uInteriorDome;\n` +
          shader.fragmentShader;

        const patchedOpaque = patchFresnelRimOnOpaqueFragment(
          shader,
          rimColVec,
          bodyColVec,
          isBack ? 2.6 : 3.0,
          isBack ? 0.24 : 0.75
        );
        if (!patchedOpaque) {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
            vec3 causticN = normalize(vNormal);
            vec3 causticV = normalize(vViewPosition);
            float fresnel = pow(1.0 - clamp(abs(dot(causticN, causticV)), 0.0, 1.0), ${
              isBack ? '2.4' : '3.2'
            });
            vec3 causticRim = vec3(${rimColVec.r.toFixed(3)}, ${rimColVec.g.toFixed(3)}, ${rimColVec.b.toFixed(3)});
            vec3 causticBody = vec3(${bodyColVec.r.toFixed(3)}, ${bodyColVec.g.toFixed(3)}, ${bodyColVec.b.toFixed(3)});
            float causticWave = 0.5 + 0.5 * sin(uTime * 0.55);
            vec3 rimTint = mix(causticBody, causticRim, causticWave) * fresnel * (0.3 + uAudioRms * 0.1);
            gl_FragColor.rgb += rimTint;`
          );
        }
      };
    };

    injectCausticShader(sharedBackOpticalGlassMat, true);
    injectCausticShader(sharedOpticalGlassMat, false);

    // Shared Geometries matching regenerate_starter_meshes.py proportions (scaled to R = 6.2u)
    const sharedShellGeo = new THREE.SphereGeometry(6.2, 64, 48); // glass_shell: 1.00R = 6.2u
    const sharedInnerSilverCoreGeo = new THREE.SphereGeometry(6.2 * 0.82, 56, 40); // metal_core: 0.82R = 5.084u
    const sharedPortalRimGeo = new THREE.TorusGeometry(6.2 * 0.85, 6.2 * 0.012, 20, 96); // media_portal_rim: R=0.85R (5.27u)
    const sharedHaloGeo = new THREE.RingGeometry(0.78, 0.795, 64);
    const sharedPlanetBeadGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const sharedSatBeadGeo = new THREE.SphereGeometry(0.11, 16, 16);
    const sharedUnitSphereGeo = new THREE.SphereGeometry(1.0, 48, 48);
    extraDisposables.push(sharedInnerSilverCoreGeo, sharedPortalRimGeo, sharedUnitSphereGeo);


    const pulseBeads: {
      mesh: THREE.Mesh;
      curve: THREE.Curve<THREE.Vector3>;
      speed: number;
      offset: number;
      /** In-sphere beads only render while an endpoint of their link is active. */
      link?: { a: string; b: string };
    }[] = [];

    const cardiacTubes: {
      uniforms: CardiacConnectorUniforms;
      mesh: THREE.Object3D;
      nodeA: string;
      nodeB: string;
      /** In-sphere links are hidden until one endpoint is hovered/focused; inter-sphere bridges stay. */
      intra: boolean;
      dispose: () => void;
    }[] = [];

    // Strictly clamp any local component position inside the 6.2u Master Containment Sphere
    const clampInsideSphere = (vec: THREE.Vector3, maxR = 4.65): THREE.Vector3 => {
      const len = vec.length();
      if (len > maxR) {
        vec.multiplyScalar(maxR / len);
      }
      return vec;
    };

    const buildSphereAssembly = (
      center: THREE.Vector3,
      sphereTag: ConnectedSphereId,
      coreColour: string
    ) => {
      const root = new THREE.Group();
      root.name = `sphere-${sphereTag}`;
      root.position.copy(center);

      const shellGroup = new THREE.Group();
      const isHq = sphereTag === 'hq';
      const sphereSpec = SPHERE_NETWORK.find((s) => s.id === sphereTag);
      const shellScale = (sphereSpec?.radius ?? 6.2) / 6.2;

      const backShellMat = sharedBackOpticalGlassMat;
      const frontShellMat = sharedOpticalGlassMat;

      // Single unified Liquid Glass Shell (Back face + Front face, no duplicate inner spheres or media wraps)
      const backShellMesh = new THREE.Mesh(sharedShellGeo, backShellMat);
      backShellMesh.scale.setScalar(shellScale);
      backShellMesh.renderOrder = 2;
      shellGroup.add(backShellMesh);

      const frontShellMesh = new THREE.Mesh(sharedShellGeo, frontShellMat);
      frontShellMesh.scale.setScalar(shellScale);
      frontShellMesh.renderOrder = 4;
      shellGroup.add(frontShellMesh);

      // -----------------------------------------------------------------------
      // SEHLY ORBITAL CAGE ATTENTION NODES
      // Mounted cleanly at precision orbital intersections
      // -----------------------------------------------------------------------
      const perimeterDropletsGroup = new THREE.Group();
      const orbitalAttentionNodes: Array<{
        pos: [number, number, number];
        r: number;
        kind: 'gold' | 'ice' | 'silver';
      }> = [
        { pos: [4.35, 3.35, 2.95], r: 0.14, kind: 'gold' },
        { pos: [-4.45, 2.85, 3.15], r: 0.12, kind: 'ice' },
        { pos: [4.65, -2.55, 2.85], r: 0.12, kind: 'silver' },
        { pos: [-4.35, -3.15, 2.75], r: 0.13, kind: 'gold' },
        { pos: [0.0, 5.15, 3.25], r: 0.11, kind: 'ice' },
        { pos: [0.0, -5.15, 3.25], r: 0.11, kind: 'gold' },
      ];

      orbitalAttentionNodes.forEach((sat) => {
        const satMat =
          sat.kind === 'gold'
            ? sharedPolishedGoldMat
            : sharedCrystalGlassBubbleMat;
        const satMesh = new THREE.Mesh(sharedUnitSphereGeo, satMat);
        satMesh.position.set(
          sat.pos[0] * shellScale,
          sat.pos[1] * shellScale,
          sat.pos[2] * shellScale
        );
        satMesh.scale.setScalar(sat.r);
        perimeterDropletsGroup.add(satMesh);
      });

      shellGroup.add(perimeterDropletsGroup);
      root.add(shellGroup);

      // OBJ-00: Central Liquid Glass Core Assembly at [0, 0, 0] (no opaque chrome inner core)
      const coreGroup = new THREE.Group();
      const coreLocalPos = new THREE.Vector3(0, 0, 0);
      coreGroup.position.copy(coreLocalPos);

      const coreCrystalMat = createSharedOuterShellMaterial({
        softwareGl: useFlatGlass,
        face: 'front',
      });
      coreCrystalMat.emissive = new THREE.Color(coreColour);
      coreCrystalMat.emissiveIntensity = 0.18;
      extraDisposables.push(coreCrystalMat);

      const outerCrystalBubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 48, 48),
        coreCrystalMat
      );
      outerCrystalBubble.renderOrder = 3;
      coreGroup.add(outerCrystalBubble);

      // Precision bronze/gold orbital rings around the central core
      const coreEquator = new THREE.Mesh(
        new THREE.TorusGeometry(0.74, 0.016, 16, 64),
        sharedPolishedGoldMat
      );
      coreEquator.rotation.set(Math.PI / 2.4, 0.2, 0);
      coreGroup.add(coreEquator);

      const coreMeridian = new THREE.Mesh(
        new THREE.TorusGeometry(0.74, 0.014, 16, 64),
        sharedGoldRibbedMat
      );
      coreMeridian.rotation.set(0.3, 0.5, Math.PI / 3);
      coreGroup.add(coreMeridian);

      const coreHaloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xB4DDFF),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.32,
      });
      const coreHaloMesh = new THREE.Mesh(sharedHaloGeo, coreHaloMat);
      coreHaloMesh.visible = false;
      coreGroup.add(coreHaloMesh);

      root.add(coreGroup);

      const coreId =
        sphereTag === 'hq'
          ? 'core-hq'
          : sphereTag === 'cde'
            ? 'core-cde'
            : sphereTag === 'campaign-os'
              ? 'core-campaign-os'
              : 'core-about-us';
      const coreLabel =
        sphereTag === 'hq'
          ? 'HQ Core'
          : sphereTag === 'cde'
            ? 'CDE Core'
            : sphereTag === 'campaign-os'
              ? 'Campaign OS Core'
              : 'About Us Core';
      const coreSublabel =
        sphereTag === 'hq'
          ? 'Orchestrator'
          : sphereTag === 'cde'
            ? 'NOJARA'
            : sphereTag === 'campaign-os'
              ? 'Activations'
              : 'Studio';
      const coreUserData = { nodeId: coreId, nodeType: 'core' as const, sphere: sphereTag };
      coreGroup.userData = coreUserData;
      coreGroup.traverse((child) => {
        child.userData = coreUserData;
      });

      nodeRegistryRef.current.set(coreId, {
        id: coreId,
        canonicalId: coreId,
        label: coreLabel,
        sublabel: coreSublabel,
        objectCode: 'OBJ-00',
        sculptureTag: 'Sehly Liquid-Glass Core',
        colour: COLOUR_TOKENS.textPrimary,
        sphere: sphereTag,
        worldPos: center.clone().add(coreLocalPos),
        baseScale: 1.0,
        nodeType: 'core',
        connectedIds: new Set<string>(),
        currentBrightness: 1.0,
        groupMesh: coreGroup,
        haloMesh: coreHaloMesh,
        emissiveMats: [coreCrystalMat],
      });

      scene.add(root);
      return {
        root,
        shellGroup,
        shellMeshes: [backShellMesh, frontShellMesh],
        frontShellMat,
        backShellMat,
        coreGroup,
        coreCrystalMat,
      };
    };

    /**
     * Sehly / Cerebro 39 Pinned 3D Node Assemblies:
     * Every station, dimension, subdomain, and project node uses the shared
     * MAT_LIQUID_GLASS_SHELL (SHARED_OUTER_SHELL_MATERIAL_PRESET) liquid-glass
     * physical material without duplicate opaque chrome inner spheres.
     */
    const buildSculpturalNodeArchetype = (
      canonicalId: string,
      _nodeType: AnchoredLabel2D['nodeType'],
      col: THREE.Color,
      pulseIndex: number
    ): {
      group: THREE.Group;
      haloMesh: THREE.Mesh;
      emissiveMats: THREE.MeshStandardMaterial[];
      objectCode: string;
      sculptureTag: string;
    } => {
      const group = new THREE.Group();
      const emissiveMats: THREE.MeshStandardMaterial[] = [];

      const idLower = canonicalId.toLowerCase();

      const accentEmissiveMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xD4AF37),
        emissive: col,
        emissiveIntensity: 0.35,
        roughness: 0.18,
        metalness: 0.65,
      });
      emissiveMats.push(accentEmissiveMat);

      let objectCode = `OBJ-${String(pulseIndex + 1).padStart(2, '0')}`;
      let sculptureTag = 'Sehly Sphere Assembly';

      if (idLower === 'projects' || idLower === 'strategy') {
        objectCode = idLower === 'projects' ? 'OBJ-01 · ST-01' : 'OBJ-01 · DIM-01';
        sculptureTag = 'Sehly Sphere Assembly';

        const outerLiquidShell = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        outerLiquidShell.scale.setScalar(0.66);
        outerLiquidShell.renderOrder = 3;
        group.add(outerLiquidShell);

        const cageRingA = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.036, 16, 64),
          sharedGoldRibbedMat
        );
        cageRingA.rotation.set(Math.PI / 2.2, 0.25, 0);
        group.add(cageRingA);

        const cageRingB = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.032, 16, 64),
          sharedPolishedGoldMat
        );
        cageRingB.rotation.set(0.28, -0.35, Math.PI / 3);
        group.add(cageRingB);

        const goldNode = new THREE.Mesh(sharedSatBeadGeo, accentEmissiveMat);
        goldNode.position.set(0.58, 0.34, 0.28);
        group.add(goldNode);
      } else if (idLower === 'media' || idLower === 'production') {
        objectCode = idLower === 'media' ? 'OBJ-02 · ST-05' : 'OBJ-02 · DIM-02';
        sculptureTag = 'Optical Media Portal';

        const outerGlassShell = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        outerGlassShell.scale.setScalar(0.68);
        outerGlassShell.renderOrder = 3;
        group.add(outerGlassShell);

        const portalApertureRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.048, 20, 64),
          sharedGoldRibbedMat
        );
        portalApertureRim.rotation.set(0.18, -0.22, 0.12);
        group.add(portalApertureRim);

        const goldOrbit = new THREE.Mesh(
          new THREE.TorusGeometry(0.78, 0.028, 16, 64),
          sharedPolishedGoldMat
        );
        goldOrbit.rotation.set(-0.48, -0.32, 0.25);
        group.add(goldOrbit);

        const trimBead = new THREE.Mesh(sharedSatBeadGeo, accentEmissiveMat);
        trimBead.position.set(-0.56, -0.42, 0.34);
        group.add(trimBead);
      } else if (idLower === 'people' || idLower === 'talent') {
        objectCode = idLower === 'people' ? 'OBJ-05 · ST-03' : 'OBJ-04 · DIM-03';
        sculptureTag = 'Portrait Medallion';

        const medallionGlass = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        medallionGlass.scale.setScalar(0.64);
        medallionGlass.renderOrder = 3;
        group.add(medallionGlass);

        const goldBezelRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.056, 20, 64),
          sharedPolishedGoldMat
        );
        goldBezelRing.rotation.set(0.24, -0.28, -0.14);
        group.add(goldBezelRing);

        const meridianRail = new THREE.Mesh(
          new THREE.TorusGeometry(0.76, 0.028, 16, 64),
          sharedGoldRibbedMat
        );
        meridianRail.rotation.set(1.12, 0.42, -0.35);
        group.add(meridianRail);

        const accentBead = new THREE.Mesh(sharedPlanetBeadGeo, accentEmissiveMat);
        accentBead.position.set(0.52, -0.38, 0.35);
        group.add(accentBead);
      } else if (idLower === 'tasks' || idLower === 'files' || idLower === 'mediatech') {
        objectCode =
          idLower === 'tasks'
            ? 'OBJ-04 · ST-02'
            : idLower === 'files'
            ? 'OBJ-03 · ST-04'
            : 'OBJ-05 · DIM-04';
        sculptureTag = 'Liquid Glass & Bronze Cage';

        const liquidShell = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        liquidShell.scale.setScalar(0.68);
        liquidShell.renderOrder = 3;
        group.add(liquidShell);

        const bronzeRail = new THREE.Mesh(
          new THREE.TorusGeometry(0.74, 0.040, 18, 64),
          sharedGoldRibbedMat
        );
        bronzeRail.rotation.set(0.65, 0.42, -0.32);
        group.add(bronzeRail);

        const iceNode = new THREE.Mesh(sharedSatBeadGeo, sharedCoolIceNodeMat);
        iceNode.position.set(-0.48, 0.36, 0.42);
        group.add(iceNode);

        const goldPin = new THREE.Mesh(sharedPlanetBeadGeo, accentEmissiveMat);
        goldPin.position.set(0.52, -0.32, 0.38);
        group.add(goldPin);
      } else {
        const codeMap: Record<string, string> = {
          seven: 'OBJ-06 · PRJ-01',
          yah: 'OBJ-07 · PRJ-02',
          mhe: 'OBJ-08 · PRJ-03',
          bsocial: 'OBJ-12 · PRJ-04',
          'al-ahram': 'OBJ-09 · PRJ-05',
          'museum-of-almost': 'OBJ-11 · PRJ-06',
          'el-batron': 'OBJ-10 · PRJ-07',
          gondwana: 'OBJ-13 · PRJ-08',
          'sub-dest': 'OBJ-09 · SUB-01',
          'sub-brand': 'OBJ-03 · SUB-02',
          'sub-act': 'OBJ-10 · SUB-03',
          'sub-spatial': 'OBJ-11 · SUB-04',
          'sub-pract': 'OBJ-08 · SUB-05',
          'sub-accel': 'OBJ-07 · SUB-06',
          'sub-museums': 'OBJ-12 · SUB-07',
          'sub-3d': 'OBJ-06 · SUB-08',
        };
        objectCode = codeMap[idLower] || `OBJ-${String(pulseIndex + 1).padStart(2, '0')}`;
        sculptureTag = 'Liquid Glass Node';

        const outerGlass = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        outerGlass.scale.setScalar(0.62);
        outerGlass.renderOrder = 3;
        group.add(outerGlass);

        const orbitalRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.68, 0.032, 16, 56),
          pulseIndex % 2 === 0 ? sharedPolishedGoldMat : sharedGoldRibbedMat
        );
        orbitalRing.rotation.set(0.52 + (pulseIndex % 3) * 0.25, -0.36, 0.28);
        group.add(orbitalRing);

        const attentionNode = new THREE.Mesh(sharedPlanetBeadGeo, accentEmissiveMat);
        attentionNode.position.set(0.48, -0.32, 0.36);
        group.add(attentionNode);
      }

      // Independent 3D Selection & Identification Halo Ring around this specific object
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xB4DDFF),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      });
      const haloMesh = new THREE.Mesh(sharedHaloGeo, haloMat);
      haloMesh.scale.setScalar(1.15);
      haloMesh.visible = false;
      group.add(haloMesh);

      return { group, haloMesh, emissiveMats, objectCode, sculptureTag };
    };

    const NODE_MEDALLION_PX = 256;
    const isStillImageUrl = (url: string): boolean => !/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url);
    const buildNodeMedallion = (thumbUrl: string | null, accent: THREE.Color): THREE.Sprite => {
      const c = document.createElement('canvas');
      c.width = NODE_MEDALLION_PX;
      c.height = NODE_MEDALLION_PX;
      const ctx = c.getContext('2d');
      const half = NODE_MEDALLION_PX / 2;
      const accentCss = `#${accent.getHexString()}`;
      const clipCircle = () => {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(half, half, half - 10, 0, Math.PI * 2);
        ctx.closePath();
      };
      const paintRing = () => {
        if (!ctx) return;
        clipCircle();
        ctx.lineWidth = 8;
        ctx.strokeStyle = accentCss;
        ctx.stroke();
      };
      if (ctx) {
        ctx.clearRect(0, 0, NODE_MEDALLION_PX, NODE_MEDALLION_PX);
        const grad = ctx.createRadialGradient(half * 0.8, half * 0.7, 8, half, half, half);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, accentCss);
        grad.addColorStop(1, '#0a1630');
        clipCircle();
        ctx.fillStyle = grad;
        ctx.fill();
        paintRing();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      if (thumbUrl && ctx) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const iw = img.naturalWidth || NODE_MEDALLION_PX;
          const ih = img.naturalHeight || NODE_MEDALLION_PX;
          const cover = Math.max(NODE_MEDALLION_PX / iw, NODE_MEDALLION_PX / ih);
          const dw = iw * cover;
          const dh = ih * cover;
          ctx.save();
          clipCircle();
          ctx.clip();
          ctx.drawImage(img, (NODE_MEDALLION_PX - dw) / 2, (NODE_MEDALLION_PX - dh) / 2, dw, dh);
          ctx.restore();
          paintRing();
          tex.needsUpdate = true;
        };
        img.src = thumbUrl;
      }
      const mat = new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, transparent: false, toneMapped: false, depthWrite: true });
      extraDisposables.push(tex, mat);
      const sprite = new THREE.Sprite(mat);
      sprite.scale.setScalar(0.78);
      sprite.renderOrder = 1;
      return sprite;
    };

    const buildNodeWithSignal = (
      parentGroup: THREE.Group,
      sphereCenter: THREE.Vector3,
      sphereTag: ConnectedSphereId,
      registryKey: string,
      canonicalId: string,
      label: string,
      sublabel: string | undefined,
      colourHex: string,
      localPos: [number, number, number],
      nodeType: AnchoredLabel2D['nodeType'],
      scale = 1.0,
      pulseIndex = 0,
      connectedIds: string[] = [],
      parent?: { id: string; localPos: [number, number, number] }
    ) => {
      // Strictly clamp every node inside the 6.2u Master Containment Sphere
      const posVec = clampInsideSphere(new THREE.Vector3(...localPos), 4.45);
      const col = new THREE.Color(colourHex);

      const {
        group: nodeGroup,
        haloMesh,
        emissiveMats,
        objectCode,
        sculptureTag,
      } = buildSculpturalNodeArchetype(canonicalId, nodeType, col, pulseIndex);
      nodeGroup.position.copy(posVec);
      nodeGroup.scale.setScalar(scale);

      const thumb = resolveNodeContent(canonicalId, nodeType, sphereTag)?.thumbs.find((t) => isStillImageUrl(t.url));
      nodeGroup.add(buildNodeMedallion(thumb?.url ?? null, col));

      const hitProxy = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 16, 16),
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

      const spokeOrigin = parent ? new THREE.Vector3(...parent.localPos) : new THREE.Vector3(0, 0, 0);
      const midCtrl = parent
        ? spokeOrigin.clone().lerp(posVec, 0.5)
        : posVec.clone().multiplyScalar(0.52);
      midCtrl.y += parent ? 0.18 : 0.38;
      clampInsideSphere(midCtrl, 4.35);
      const curve = new THREE.QuadraticBezierCurve3(spokeOrigin, midCtrl, posVec);
      const spokeColor =
        nodeType === 'station' || nodeType === 'dimension' ? 0xd4af37 : 0x65acff;
      const spoke = createCardiacConnectorTube({
        curve,
        tubularSegments: 36,
        radius: nodeType === 'project' ? 0.012 : 0.016,
        radialSegments: 6,
        color: spokeColor,
        pulseColor: 0xfff1d4,
        speed: 0.28 + (pulseIndex % 5) * 0.04,
      });
      spoke.handle.uniforms.uDimFactor.value = 0;
      spoke.mesh.visible = false;
      parentGroup.add(spoke.mesh);
      extraDisposables.push({ dispose: spoke.dispose });
      // Spoke dimming is owned by nodeRegistry.connectorUniforms (avoid fighting cardiacTubes).

      const beadMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 12),
        sharedPolishedGoldMat
      );
      beadMesh.visible = false;
      parentGroup.add(beadMesh);
      const spokeBead: (typeof pulseBeads)[number] = {
        mesh: beadMesh,
        curve,
        speed: 0.16 + (pulseIndex % 5) * 0.03,
        offset: (pulseIndex * 0.19) % 1,
      };
      pulseBeads.push(spokeBead);

      const coreId =
        sphereTag === 'hq'
          ? 'core-hq'
          : sphereTag === 'cde'
            ? 'core-cde'
            : sphereTag === 'campaign-os'
              ? 'core-campaign-os'
              : 'core-about-us';
      const anchorId = parent?.id ?? coreId;
      spokeBead.link = { a: anchorId, b: canonicalId };
      const connSet = new Set<string>([anchorId, ...connectedIds]);
      const anchorEntry = nodeRegistryRef.current.get(anchorId);
      if (anchorEntry) {
        anchorEntry.connectedIds.add(canonicalId);
      }

      nodeRegistryRef.current.set(registryKey, {
        id: registryKey,
        canonicalId,
        label,
        sublabel: sublabel || undefined,
        contentLine: contentChip(resolveNodeContent(canonicalId, nodeType, sphereTag)) || undefined,
        objectCode,
        sculptureTag,
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
        connectorUniforms: spoke.handle.uniforms,
        connectorMesh: spoke.mesh,
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
      const vA = clampInsideSphere(new THREE.Vector3(...posA), 4.65);
      const vB = clampInsideSphere(new THREE.Vector3(...posB), 4.65);
      const mid = vA.clone().lerp(vB, 0.5).multiplyScalar(0.84);
      clampInsideSphere(mid, 4.5);
      const curve = new THREE.CatmullRomCurve3([vA, mid, vB]);
      const tube = createCardiacConnectorTube({
        curve,
        tubularSegments: 48,
        radius: 0.016,
        radialSegments: 8,
        color: colourHex,
        pulseColor: 0xfff1d4,
        speed: 0.42,
      });
      tube.handle.uniforms.uDimFactor.value = 0;
      tube.mesh.visible = false;
      parentGroup.add(tube.mesh);
      extraDisposables.push({ dispose: tube.dispose });
      cardiacTubes.push({
        uniforms: tube.handle.uniforms,
        mesh: tube.mesh,
        nodeA: nodeIdA,
        nodeB: nodeIdB,
        intra: true,
        dispose: tube.dispose,
      });
    };

    nodeRegistryRef.current.clear();

    const hqAssembly = buildSphereAssembly(HQ_CENTER, 'hq', COLOUR_TOKENS.cobaltAccent);
    hqAssembly.root.name = 'master-sphere';
    hqAssembly.root.userData = {
      ...(hqAssembly.root.userData || {}),
      masterSphere: true,
      masterRadius: MASTER_SPHERE.radius,
      portalCountLabel: projectPortalCountLabel(HQ_PROJECTS_DATA.length),
    };
    masterRootRef.current = hqAssembly.root;

    const allProjectIds = HQ_PROJECTS_DATA.map((p) => p.id);
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
        st.id === 'people' ? ['projects'] : [...allProjectIds, 'people']
      );
    });

    HQ_NODE_LINKS.forEach((link) => {
      const stationA = CEREBRO_STATIONS.find((st) => st.id === link.a);
      const stationB = CEREBRO_STATIONS.find((st) => st.id === link.b);
      if (!stationA || !stationB) return;
      nodeRegistryRef.current.get(link.a)?.connectedIds.add(link.b);
      nodeRegistryRef.current.get(link.b)?.connectedIds.add(link.a);
      buildCardiacHeartbeatTube(
        hqAssembly.root,
        stationA.position,
        stationB.position,
        link.a,
        link.b,
        '#D4AF37'
      );
    });

    const hqNestParent = CEREBRO_STATIONS.find((st) => st.id === HQ_NESTED_PROJECT_PARENT);
    HQ_PROJECTS_DATA.forEach((proj, idx) => {
      const healthCol = getProjectHealthColour(proj.health);
      const nextProj = HQ_PROJECTS_DATA[(idx + 1) % HQ_PROJECTS_DATA.length];
      const prevProj =
        HQ_PROJECTS_DATA[(idx + HQ_PROJECTS_DATA.length - 1) % HQ_PROJECTS_DATA.length];
      const peers = HQ_PROJECTS_DATA.length > 1 ? [nextProj.id, prevProj.id] : [];
      const childPos: [number, number, number] = hqNestParent
        ? [
            hqNestParent.position[0] - 1.15,
            hqNestParent.position[1] + 0.85,
            hqNestParent.position[2] + 0.3 + idx * 0.4,
          ]
        : proj.sunPositionHq;
      buildNodeWithSignal(
        hqAssembly.root,
        HQ_CENTER,
        'hq',
        proj.id,
        proj.id,
        proj.code,
        `${proj.health} · ${proj.progressLabel}`,
        healthCol,
        childPos,
        'project',
        0.82,
        idx + 10,
        [HQ_NESTED_PROJECT_PARENT, ...peers],
        hqNestParent ? { id: hqNestParent.id, localPos: hqNestParent.position } : undefined
      );
      if (HQ_PROJECTS_DATA.length > 1) {
        buildCardiacHeartbeatTube(
          hqAssembly.root,
          childPos,
          nextProj.sunPositionHq,
          proj.id,
          nextProj.id,
          healthCol
        );
      }
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

    VISIBLE_PROJECTS_DATA.forEach((proj, idx) => {
      const healthCol = getProjectHealthColour(proj.health);
      const nextProj = VISIBLE_PROJECTS_DATA[(idx + 1) % VISIBLE_PROJECTS_DATA.length];
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

    // Campaign OS + About Us — full live peer spheres from SPHERE_NETWORK (shared across intro & workspace).
    const peerNodeSpecs: Record<'campaign-os' | 'about-us', typeof CAMPAIGN_OS_NODES> = {
      'campaign-os': CAMPAIGN_OS_NODES,
      'about-us': ABOUT_US_NODES,
    };
    const peerAssemblies: Partial<
      Record<'campaign-os' | 'about-us', ReturnType<typeof buildSphereAssembly>>
    > = {};
    for (const node of SPHERE_NETWORK) {
      if (node.id === 'hq' || node.id === 'cde') continue;
      const peerId = node.id as 'campaign-os' | 'about-us';
      const peerCenter = resolveSphereCenter(peerId);
      const peerColour =
        peerId === 'campaign-os' ? COLOUR_TOKENS.cobaltAccent : COLOUR_TOKENS.stationPeople;
      const peerAssembly = buildSphereAssembly(peerCenter, peerId, peerColour);
      peerAssemblies[peerId] = peerAssembly;

      const specs = peerNodeSpecs[peerId];
      specs.forEach((spec, idx) => {
        const mappedType: AnchoredLabel2D['nodeType'] =
          spec.nodeType === 'project'
            ? 'project'
            : spec.nodeType === 'station'
              ? 'station'
              : 'station';
        buildNodeWithSignal(
          peerAssembly.root,
          peerCenter,
          peerId,
          spec.id,
          spec.id,
          spec.label,
          spec.sublabel,
          spec.colour,
          spec.position,
          mappedType,
          peerId === 'about-us' ? 0.92 : 0.88,
          idx + (peerId === 'campaign-os' ? 80 : 100),
          []
        );
      });

      const satBridge = new THREE.CatmullRomCurve3([
        HQ_CENTER.clone(),
        new THREE.Vector3(
          node.center[0] * 0.45,
          node.center[1] + 4.5,
          node.center[2] * 0.45
        ),
        peerCenter.clone(),
      ]);
      const satTube = createCardiacConnectorTube({
        curve: satBridge,
        tubularSegments: 64,
        radius: 0.045,
        radialSegments: 8,
        color: peerId === 'campaign-os' ? 0x65acff : 0xd4af37,
        pulseColor: 0xfff1d4,
        speed: 0.34,
      });
      scene.add(satTube.mesh);
      extraDisposables.push({ dispose: satTube.dispose });
      cardiacTubes.push({
        uniforms: satTube.handle.uniforms,
        mesh: satTube.mesh,
        nodeA: 'hq',
        nodeB: peerId,
        intra: false,
        dispose: satTube.dispose,
      });
      const satBead = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0xfff1d4),
          transparent: true,
          opacity: 0.95,
        })
      );
      scene.add(satBead);
      pulseBeads.push({
        mesh: satBead,
        curve: satBridge,
        speed: 0.2,
        offset: peerId === 'campaign-os' ? 0.15 : 0.42,
      });
    }

    registerMountedSphereInstances({
      hq: {
        id: 'hq',
        root: hqAssembly.root,
        shellGroup: hqAssembly.shellGroup,
        coreGroup: hqAssembly.coreGroup,
        frontShellMat: hqAssembly.frontShellMat,
        backShellMat: hqAssembly.backShellMat,
        coreCrystalMat: hqAssembly.coreCrystalMat,
        shellMeshes: hqAssembly.shellMeshes,
      },
      cde: {
        id: 'cde',
        root: cdeAssembly.root,
        shellGroup: cdeAssembly.shellGroup,
        coreGroup: cdeAssembly.coreGroup,
        frontShellMat: cdeAssembly.frontShellMat,
        backShellMat: cdeAssembly.backShellMat,
        coreCrystalMat: cdeAssembly.coreCrystalMat,
        shellMeshes: cdeAssembly.shellMeshes,
      },
      ...(peerAssemblies['campaign-os']
        ? {
            'campaign-os': {
              id: 'campaign-os',
              root: peerAssemblies['campaign-os'].root,
              shellGroup: peerAssemblies['campaign-os'].shellGroup,
              coreGroup: peerAssemblies['campaign-os'].coreGroup,
              frontShellMat: peerAssemblies['campaign-os'].frontShellMat,
              backShellMat: peerAssemblies['campaign-os'].backShellMat,
              coreCrystalMat: peerAssemblies['campaign-os'].coreCrystalMat,
              shellMeshes: peerAssemblies['campaign-os'].shellMeshes,
            },
          }
        : {}),
      ...(peerAssemblies['about-us']
        ? {
            'about-us': {
              id: 'about-us',
              root: peerAssemblies['about-us'].root,
              shellGroup: peerAssemblies['about-us'].shellGroup,
              coreGroup: peerAssemblies['about-us'].coreGroup,
              frontShellMat: peerAssemblies['about-us'].frontShellMat,
              backShellMat: peerAssemblies['about-us'].backShellMat,
              coreCrystalMat: peerAssemblies['about-us'].coreCrystalMat,
              shellMeshes: peerAssemblies['about-us'].shellMeshes,
            },
          }
        : {}),
    });
    seedShellGeometry('sphere', sharedShellGeo);
    const onSphereShape = (e: Event) => {
      const detail = (e as CustomEvent<SphereShapeRequest>).detail;
      if (detail?.shape) void setMasterSphereShape(detail);
    };
    window.addEventListener(SPHERE_SHAPE_EVENT, onSphereShape);
    // Procedural إصطمبة mould proof — reconstruction only; parent HQ sphere stays intact.
    let istanbaProof: IstanbaProofHandle | null = null;
    try {
      istanbaProof = createIstanbaMouldProof(hqAssembly.root);
      istanbaProof.setState('parent_sphere', 0);
      extraDisposables.push({
        dispose: () => {
          istanbaProof?.dispose();
          istanbaProof = null;
        },
      });
    } catch (err) {
      console.warn('[CosmographCanvas] Istanba mould proof failed to mount', err);
    }

    onSceneReady?.(scene);

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

      const childShellMesh = new THREE.Mesh(new THREE.SphereGeometry(4.4, 40, 28), sharedOpticalGlassMat);
      childSphereGroup.add(childShellMesh);

      const childRimCurve = new THREE.EllipseCurve(0, 0, 4.42, 4.42, 0, Math.PI * 2, false, 0);
      const childRimGeo = new THREE.BufferGeometry().setFromPoints(
        childRimCurve.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0))
      );
      const childRimMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xD4AF37),
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
        '#D4AF37',
        childLocalCenter,
        'subdomain',
        1.05,
        dIdx + 70,
        [dom.parentNodeId]
      );

      const startPt = new THREE.Vector3(0, 0, 0);
      const endPt = dirVec.clone();
      const midArch = startPt.clone().lerp(endPt, 0.5);
      midArch.y += 3.6;
      const childCardiacCurve = new THREE.CatmullRomCurve3([startPt, midArch, endPt]);
      const childTube = createCardiacConnectorTube({
        curve: childCardiacCurve,
        tubularSegments: 56,
        radius: 0.032,
        radialSegments: 8,
        color: 0x65acff,
        pulseColor: 0xfff1d4,
        speed: 0.36,
      });
      childTube.handle.uniforms.uDimFactor.value = 0;
      childTube.mesh.visible = false;
      targetAssembly.root.add(childTube.mesh);
      extraDisposables.push({ dispose: childTube.dispose });
      cardiacTubes.push({
        uniforms: childTube.handle.uniforms,
        mesh: childTube.mesh,
        nodeA: dom.parentNodeId || 'hq',
        nodeB: dom.id,
        intra: true,
        dispose: childTube.dispose,
      });

      const childPulseBead = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0xfff1d4),
          transparent: true,
          opacity: 0.96,
        })
      );
      childPulseBead.visible = false;
      targetAssembly.root.add(childPulseBead);
      pulseBeads.push({
        mesh: childPulseBead,
        curve: childCardiacCurve,
        speed: 0.18,
        offset: (dIdx * 0.25) % 1,
        link: { a: dom.parentNodeId || 'hq', b: dom.id },
      });
    });

    // Inter-Sphere CatmullRomCurve3 Cardiac Spline connecting HQ and CDE cores
    const hqCdeMid = HQ_CENTER.clone().lerp(CDE_CENTER, 0.5).add(new THREE.Vector3(0, 4.2, 0));
    const bridgeCurve = new THREE.CatmullRomCurve3([
      HQ_CENTER.clone().lerp(CDE_CENTER, 0.16).add(new THREE.Vector3(0, 0.8, 0)),
      hqCdeMid,
      HQ_CENTER.clone().lerp(CDE_CENTER, 0.84).add(new THREE.Vector3(0, 0.6, 0)),
    ]);
    const bridgeTube = createCardiacConnectorTube({
      curve: bridgeCurve,
      tubularSegments: 80,
      radius: 0.04,
      radialSegments: 10,
      color: 0x65acff,
      pulseColor: 0xfff1d4,
      speed: 0.4,
    });
    scene.add(bridgeTube.mesh);
    extraDisposables.push({ dispose: bridgeTube.dispose });
    cardiacTubes.push({
      uniforms: bridgeTube.handle.uniforms,
      mesh: bridgeTube.mesh,
      nodeA: 'hq',
      nodeB: 'cde',
      intra: false,
      dispose: bridgeTube.dispose,
    });

    for (let b = 0; b < 4; b++) {
      const bridgeBead = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(0xfff1d4),
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

    // 28-Segment Comet Navigation Weave (pre-allocated ring buffer, zero per-frame allocations)
    const maxCometPts = 28;
    stateRef.current.cometPoints = Array.from({ length: maxCometPts }, () => new THREE.Vector3());
    const cometPositions = new Float32Array(maxCometPts * 3);
    const cometWeavePositions = new Float32Array(maxCometPts * 3);
    const cometGeo = new THREE.BufferGeometry();
    cometGeo.setAttribute('position', new THREE.BufferAttribute(cometPositions, 3));
    const cometMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xFFF4D0),
      transparent: true,
      opacity: 0.68,
    });
    const cometLine = new THREE.Line(cometGeo, cometMat);
    cometLine.visible = false;
    scene.add(cometLine);

    const cometWeaveGeo = new THREE.BufferGeometry();
    cometWeaveGeo.setAttribute('position', new THREE.BufferAttribute(cometWeavePositions, 3));
    const cometWeaveMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xD4AF37),
      transparent: true,
      opacity: 0.48,
    });
    const cometWeaveLine = new THREE.Line(cometWeaveGeo, cometWeaveMat);
    cometWeaveLine.visible = false;
    scene.add(cometWeaveLine);

    // -------------------------------------------------------------------------
    // v4.0 3D Cylindrical Project Media Tube (`project.open_tube`) inside single WebGL scene
    // radiusU: 5.4, columns: 8, visibleRows: 3, maxMountedTiles: 24, slotSizeU: [3.2, 1.8], rowPitchU: 2.25
    // -------------------------------------------------------------------------
    const mediaTubeGroup = new THREE.Group();
    mediaTubeGroup.visible = false;
    scene.add(mediaTubeGroup);

    const mediaTubeTileMeshes: THREE.Mesh[] = [];
    // Tiles show the media itself and nothing else: no kind badge, file name, subtitle or extension.
    const TILE_TEX_W = 640;
    const TILE_TEX_H = 360;
    const buildTileCanvasTexture = (tile: ProjectMediaTubeItem): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = TILE_TEX_W;
      c.height = TILE_TEX_H;
      const ctx = c.getContext('2d');

      const drawFrame = () => {
        if (!ctx) return;
        ctx.strokeStyle = tile.accentHex;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, TILE_TEX_W - 3, TILE_TEX_H - 3);
        ctx.globalAlpha = 1;
      };

      const drawBaseCard = () => {
        if (!ctx) return;
        const grad = ctx.createLinearGradient(0, 0, TILE_TEX_W, TILE_TEX_H);
        grad.addColorStop(0, '#142632');
        grad.addColorStop(1, '#101D27');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TILE_TEX_W, TILE_TEX_H);
        const rad = ctx.createRadialGradient(
          TILE_TEX_W / 2,
          TILE_TEX_H / 2,
          20,
          TILE_TEX_W / 2,
          TILE_TEX_H / 2,
          TILE_TEX_W * 0.4
        );
        rad.addColorStop(0, `${tile.accentHex}44`);
        rad.addColorStop(1, 'rgba(16, 29, 39, 0)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, TILE_TEX_W, TILE_TEX_H);
        drawFrame();
      };

      drawBaseCard();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;

      if (tile.posterUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (!ctx) return;
          try {
            const iw = img.naturalWidth || TILE_TEX_W;
            const ih = img.naturalHeight || TILE_TEX_H;
            // Contain-fit: the whole frame stays visible at its own aspect ratio, never cropped or stretched.
            const scale = Math.min(TILE_TEX_W / iw, TILE_TEX_H / ih);
            const dw = iw * scale;
            const dh = ih * scale;
            ctx.fillStyle = '#05090E';
            ctx.fillRect(0, 0, TILE_TEX_W, TILE_TEX_H);
            ctx.drawImage(img, (TILE_TEX_W - dw) / 2, (TILE_TEX_H - dh) / 2, dw, dh);
            drawFrame();
            tex.needsUpdate = true;
          } catch {
            // Clean fallback to already rendered base card
          }
        };
        img.onerror = () => {
          // CORS or decode failure: retains clean base card
        };
        img.src = tile.posterUrl;
      }
      return tex;
    };

    // Slots with no verified url/poster never render a planar panel. They show a small 3D
    // "gap" badge (open-arc ring + emissive core) at the slot position instead.
    const tubeItemHasMedia = (item: ProjectMediaTubeItem | undefined): boolean =>
      Boolean(item?.url || item?.posterUrl);
    const buildTileMaterial = (item: ProjectMediaTubeItem | undefined): THREE.MeshBasicMaterial => {
      const hasMedia = item !== undefined && tubeItemHasMedia(item);
      return new THREE.MeshBasicMaterial({
        map: item && hasMedia ? buildTileCanvasTexture(item) : null,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.94,
      });
    };
    const mediaGapArcGeo = new THREE.TorusGeometry(0.34, 0.022, 10, 48, Math.PI * 1.5);
    const mediaGapCoreGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const mediaGapArcMat = new THREE.MeshBasicMaterial({
      color: 0xb4ddff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    const mediaGapCoreMat = new THREE.MeshBasicMaterial({
      color: 0xf2f6f8,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    extraDisposables.push(mediaGapArcGeo, mediaGapCoreGeo, mediaGapArcMat, mediaGapCoreMat);
    const mediaGapBadges: THREE.Group[] = [];

    let mountedTubeProjectId = 'SEVEN';
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

      const tileMesh = new THREE.Mesh(tileGeo, buildTileMaterial(initialTubeItems[idx]));
      tileMesh.visible = tubeItemHasMedia(initialTubeItems[idx]);
      tileMesh.position.set(Math.sin(theta) * r, y, Math.cos(theta) * r);
      // lookAt points the plane's front (+Z) at the axis, so media reads correctly from inside the tube.
      tileMesh.lookAt(0, y, 0);
      tileMesh.userData = {
        isMediaTubeTile: true,
        tileIndex: idx,
      };
      mediaTubeGroup.add(tileMesh);
      mediaTubeTileMeshes.push(tileMesh);

      const gapBadge = new THREE.Group();
      gapBadge.add(new THREE.Mesh(mediaGapArcGeo, mediaGapArcMat));
      gapBadge.add(new THREE.Mesh(mediaGapCoreGeo, mediaGapCoreMat));
      gapBadge.position.copy(tileMesh.position);
      gapBadge.lookAt(0, y, 0);
      gapBadge.visible = !tubeItemHasMedia(initialTubeItems[idx]);
      gapBadge.userData = { isMediaGapBadge: true, tileIndex: idx };
      mediaTubeGroup.add(gapBadge);
      mediaGapBadges.push(gapBadge);
    }

    isolateDecorativeGeometry(scene, cosmeticFade, camera);

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
            sphere: ConnectedSphereId;
          };
        }
      }

      // Screen-space proximity fallback (<= 38px) so finger taps and clicks on 3D orbs never miss
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      let closestHit: {
        nodeId: string;
        nodeType: AnchoredLabel2D['nodeType'];
        sphere: ConnectedSphereId;
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
      if (!pointerOrbitEnabledRef.current) {
        // Hand tracking arbitration — ignore orbit-drag while MediaPipe owns camera.
        return;
      }
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
      if (!pointerOrbitEnabledRef.current) return;
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (activePointers.size === 2) {
        const tf = getTwoFingerState();
        if (tf) {
          const s = stateRef.current;
          captureLiveCameraPose(s, camera);
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
                3.2,
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
        captureLiveCameraPose(s, camera);
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
          const tubeHits = raycaster
            .intersectObjects(mediaTubeTileMeshes, false)
            .filter((h) => h.object.visible);
          if (tubeHits.length > 0) {
            const tIdx = tubeHits[0].object.userData?.tileIndex;
            if (typeof tIdx === 'number') {
              const items = buildProjectMediaTubeItems(mediaTubeStateRef.current.projectId);
              const tile = items[tIdx] || items[0];
              soundEngine.playNodeSelect(0);
              if (mediaTubeStateRef.current.focusedTileIndex === tIdx) {
                callbacksRef.current.onOpenMediaTubeFullView?.(tile);
              } else {
                callbacksRef.current.onSelectMediaTubeTile?.(tIdx, tile);
              }
              return;
            }
          }
          // No on-screen tube controls: a tap outside the tiles returns to the project.
          callbacksRef.current.onCloseMediaTube?.();
          return;
        }

        const hit = findHitNode(e.clientX, e.clientY);
        if (hit) {
          const panX = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
          soundEngine.playNodeSelect(panX);
          callbacksRef.current.onSelectNode(hit.nodeId, hit.nodeType, hit.sphere);
        }
      }
    };

    const recordUserInput = () => {
      stateRef.current.lastUserInputTime = performance.now();
    };
    const interruptJourney = () => {
      if (splineJourney.isActive()) splineJourney.stop('interrupted');
    };

    const onWheel = (e: WheelEvent) => {
      if (!container.contains(e.target as Node)) return;
      e.preventDefault();
      recordUserInput();
      interruptJourney();
      callbacksRef.current.onUserTouchPauseTour();
      const s = stateRef.current;
      captureLiveCameraPose(s, camera);
      s.targetRadius = THREE.MathUtils.clamp(s.targetRadius + e.deltaY * 0.012, 3.2, 42.0);
      setTouchIndicator({ active: true, x: e.clientX, y: e.clientY, mode: 'pinch' });
      window.setTimeout(() => setTouchIndicator((prev) => ({ ...prev, active: false })), 350);
    };

    domEl.addEventListener('contextmenu', onContextMenu);
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointerdown', recordUserInput);
    domEl.addEventListener('pointerdown', interruptJourney);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', recordUserInput);

    let lastCanvasW = initW;
    const onResize = () => {
      if (!container || contextLost) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      // The iOS keyboard changes only the visual viewport height. Never resize or reframe the
      // scene for it, otherwise the 3D view squishes and jumps while typing in the chat.
      if (isEditableTarget(document.activeElement) && w === lastCanvasW) return;
      lastCanvasW = w;
      const comp = readHomeComposition(container);
      executeAtomicReframe(camera, w, h, comp.occludedBottomPx);
      renderer.setSize(w, h);
      if (composer) {
        composer.setSize(w, h);
      }
      if (bloomPass) {
        bloomPass.resolution.set(w, h);
      }
      if (isSoftwareGl || !composer) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const containerResizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => onResize()) : null;
    if (container) containerResizeObserver?.observe(container);
    // Initial atomic frame composition
    onResize();

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
      if (contextLost) {
        // Keep a slow heartbeat so restore can resume; skip all GPU work.
        frameId = window.setTimeout(tick, 500);
        return;
      }
      if (isPageHidden && GUI_WORLD_MOTION_TOKENS.freezeIfHidden) {
        frameId = window.setTimeout(tick, 250);
        return;
      }

      // Clamp dt to 33ms (GUI_WORLD_MOTION_TOKENS.dtClampMs)
      const dt = Math.min(clock.getDelta(), GUI_WORLD_MOTION_TOKENS.dtClampMs / 1000);
      const elapsedTotal = clock.getElapsedTime();
      const now = performance.now();
      const s = stateRef.current;

      cosmeticFade.value = THREE.MathUtils.damp(
        cosmeticFade.value,
        mediaTubeStateRef.current?.active || s.focusedNodeId ? 1 : 0,
        4,
        dt
      );
      if (frameCounter % 90 === 0) isolateDecorativeGeometry(scene, cosmeticFade, camera);

      glassUniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
      // Intro: damp soundtrack RMS into glass so caustics don't strobe over the video plate.
      const rmsTarget = s.audioRms;
      glassUniforms.uAudioRms.value = THREE.MathUtils.damp(
        glassUniforms.uAudioRms.value,
        rmsTarget,
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
      const breathScale = s.reducedMotion
        ? 1.0
        : 1.0 + 0.006 * breathPhase + liveRms * 0.012;
      hqAssembly.shellGroup.scale.setScalar(breathScale);
      cdeAssembly.shellGroup.scale.setScalar(breathScale);
      peerAssemblies['campaign-os']?.shellGroup.scale.setScalar(breathScale);
      peerAssemblies['about-us']?.shellGroup.scale.setScalar(breathScale);

      // Audio-Reactive Core Crystal Pulse — damp hard during camera flight to stop lighting flicker
      const motionQuiet = s.flightActive ? 0.18 : 1.0;
      const corePulseScale = 1.0 + liveRms * 0.34 * motionQuiet;
      hqAssembly.coreGroup.scale.setScalar(corePulseScale);
      cdeAssembly.coreGroup.scale.setScalar(corePulseScale);
      peerAssemblies['campaign-os']?.coreGroup.scale.setScalar(corePulseScale);
      peerAssemblies['about-us']?.coreGroup.scale.setScalar(corePulseScale);
      const coreEmissive = 1.2 + liveRms * 0.55 * motionQuiet;
      hqAssembly.coreCrystalMat.emissiveIntensity = coreEmissive;
      cdeAssembly.coreCrystalMat.emissiveIntensity = coreEmissive;
      if (peerAssemblies['campaign-os']) {
        peerAssemblies['campaign-os'].coreCrystalMat.emissiveIntensity = coreEmissive;
      }
      if (peerAssemblies['about-us']) {
        peerAssemblies['about-us'].coreCrystalMat.emissiveIntensity = coreEmissive;
      }

      // Hand pipeline: glove + spatial controls first (UI_INTERACT wins), then the camera intent.
      const handState = handStateRef.current;
      const handsFresh = handsActiveRef.current && handIsFresh(now);
      glove.update(dt);
      handInteractionMachine.setFrustum(gloveFrustum.halfW, gloveFrustum.halfH);
      const uiResult = handsActiveRef.current ? nodeInteraction.update(now, handState.hands, handsFresh) : null;
      const intent = handInteractionMachine.evaluate(now, dt, uiResult, handsFresh ? handState : { ...handState, active: false });

      const cameraAutomated = splineJourney.isActive() || s.flightActive;
      const deliberateHand = intent.state === 'CAMERA_TWO_HAND';
      const handTakeover = handJitterGate.update(now, cameraAutomated && deliberateHand);
      if (handTakeover && splineJourney.isActive()) splineJourney.stop('interrupted');
      const journeyOwnsCamera = splineJourney.isActive();
      const flightProtected = cameraAutomated && !handTakeover && !journeyOwnsCamera;
      if (intent.steering && !journeyOwnsCamera && !flightProtected && !s.reducedMotion) {
        captureLiveCameraPose(s, camera);
        s.stoppedExplicitly = false;
        s.lastUserInputTime = now;

        if (intent.panX !== 0 || intent.panY !== 0) {
          const fovRad = THREE.MathUtils.degToRad(camera.fov);
          const worldH = 2 * s.radius * Math.tan(fovRad / 2);
          const worldW = worldH * camera.aspect;
          _scratchForward
            .set(
              -Math.sin(s.polar) * Math.sin(s.azimuth),
              -Math.cos(s.polar),
              -Math.sin(s.polar) * Math.cos(s.azimuth)
            )
            .normalize();
          _scratchRight.crossVectors(_scratchForward, _handWorldUp).normalize();
          _scratchUp.crossVectors(_scratchRight, _scratchForward).normalize();
          // The scene follows the hand: hand right -> content right -> camera shifts left.
          s.targetPanOffset
            .addScaledVector(_scratchRight, -intent.panX * worldW)
            .addScaledVector(_scratchUp, -intent.panY * worldH);
          if (s.targetPanOffset.length() > HAND_PAN_MAX) s.targetPanOffset.setLength(HAND_PAN_MAX);
        }

        if (intent.dPolar !== 0) {
          s.targetPolar = THREE.MathUtils.clamp(s.targetPolar + intent.dPolar, 0.14, Math.PI - 0.14);
        }

        if (intent.dolly !== 0) {
          s.targetRadius = THREE.MathUtils.clamp(s.targetRadius * Math.exp(-intent.dolly * HAND_DOLLY_GAIN), 3.2, 38.0);
        }

        if (intent.roll !== 0) {
          const next = THREE.MathUtils.clamp(handRollDeg + THREE.MathUtils.radToDeg(intent.roll), -HAND_ROLL_MAX_DEG, HAND_ROLL_MAX_DEG);
          s.targetRollDeg += next - handRollDeg;
          handRollDeg = next;
        }
      }

      if (handRollDeg !== 0 && intent.state !== 'CAMERA_TWO_HAND') {
        const relax = handRollDeg * (1 - Math.exp(-HAND_ROLL_RELAX_PER_SEC * dt));
        handRollDeg -= relax;
        s.targetRollDeg -= relax;
        if (Math.abs(handRollDeg) < 0.01) {
          s.targetRollDeg -= handRollDeg;
          handRollDeg = 0;
        }
      }

      // Gesture-loss settle: drain residual azimuth velocity within 400ms, never teleport.
      if (s.gestureLossSettleUntil > 0) {
        const remain = s.gestureLossSettleUntil - now;
        if (remain <= 0) {
          s.gestureResidualAzVel = 0;
          s.gestureLossSettleUntil = 0;
        } else {
          const settleT = 1 - remain / CAMERA_MOTION_TARGETS.gestureLossSettleMsMax;
          s.gestureResidualAzVel = THREE.MathUtils.damp(s.gestureResidualAzVel, 0, 14, dt);
          s.targetAzimuth += s.gestureResidualAzVel * dt * (1 - settleT);
        }
      }

      // If explicitly stopped, velocity stays strictly 0 with zero drift
      if (s.stoppedExplicitly) {
        s.currentAngularVel = 0;
        s.gestureResidualAzVel = 0;
      } else {
        const baseSphereRate = GUI_WORLD_MOTION_TOKENS.rates.sphereRadPerSec; // 0.02992 rad/s (210s period)
        // L08: inactivity alone is not enough — stage owners block idle orbit.
        const isUserIdle =
          idleOrbitAllowedRef.current && (now - s.lastUserInputTime) >= IDLE_MS;
        const desiredVel = s.reducedMotion || (!isUserIdle && !s.autoOrbit)
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
          activePointers.size < 2 &&
          (isUserIdle || s.autoOrbit)
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
          const sphereCenter = resolveSphereCenter(s.activeSphere);
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

      // Cinematic damping — slower settle so moves feel like a crane, not a snap.
      // Was 4.2 (snappy); ~2.05 keeps continuity across place-to-place transitions.
      const dampFactor = s.reducedMotion ? 25 : 2.05;
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

      // Directive 06 & P1: Settle thresholds & zero-jitter snap
      if (Math.abs(s.azimuth - s.targetAzimuth) < 0.00015) s.azimuth = s.targetAzimuth;
      if (Math.abs(s.polar - s.targetPolar) < 0.00015) s.polar = s.targetPolar;
      if (Math.abs(s.radius - s.targetRadius) < 0.001) s.radius = s.targetRadius;
      if (Math.abs(s.focalLengthMm - s.targetFocalLengthMm) < 0.01) s.focalLengthMm = s.targetFocalLengthMm;
      if (Math.abs(s.cameraRollDeg - s.targetRollDeg) < 0.01) s.cameraRollDeg = s.targetRollDeg;
      if (s.currentCenter.distanceTo(s.targetCenter) < 0.001) s.currentCenter.copy(s.targetCenter);
      if (s.panOffset.distanceTo(s.targetPanOffset) < 0.001) s.panOffset.copy(s.targetPanOffset);

      const journeyPose = splineJourney.sample();
      if (journeyPose) {
        s.focalLengthMm = journeyPose.focalMm;
        camera.up.set(0, 1, 0);
        camera.fov = focalLengthToVFov(s.focalLengthMm);
        camera.updateProjectionMatrix();
        camera.position.copy(journeyPose.position);
        camera.lookAt(journeyPose.target);
      } else if (s.flightActive && s.flightCurve) {
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
      // v4.0 3D Cylindrical Project Media Tube update & enclosing shell dimming
      const tubeProp = mediaTubeStateRef.current;
      const tubeActive = Boolean(tubeProp?.active);
      mediaTubeGroup.visible = tubeActive;
      // Shared MAT front shell — dim from registry base while tube is up, else restore.
      sharedOpticalGlassMat.opacity = tubeActive
        ? shellFrontBaseOpacity * 0.22
        : shellFrontBaseOpacity;
      if (tubeActive) {
        const activeCenter = resolveSphereCenter(tubeProp?.sphere ?? s.activeSphere);
        mediaTubeGroup.position.copy(activeCenter);
        if (s.activeAnglePreset === 'tube_front' && !s.flightActive) s.targetCenter.copy(activeCenter);

        if (tubeProp?.projectId && tubeProp.projectId !== mountedTubeProjectId) {
          mountedTubeProjectId = tubeProp.projectId;
          const freshItems = buildProjectMediaTubeItems(mountedTubeProjectId);
          for (let ti = 0; ti < mediaTubeTileMeshes.length; ti++) {
            const item = freshItems[ti];
            const mesh = mediaTubeTileMeshes[ti];
            const oldMat = mesh.material as THREE.MeshBasicMaterial;
            oldMat.map?.dispose();
            oldMat.dispose();
            mesh.material = buildTileMaterial(item);
            const hasMedia = tubeItemHasMedia(item);
            mesh.visible = hasMedia;
            mediaGapBadges[ti].visible = !hasMedia;
          }
        }

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
          const gapBadge = mediaGapBadges[ti];
          gapBadge.scale.setScalar(isFocusedTile ? 1.35 : 1.0);
          if (gapBadge.visible && !s.reducedMotion) {
            gapBadge.children[0].rotation.z += dt * 0.6;
          }
        }
      }

      if (cinemaPass) {
        cinemaPass.uniforms.uTime.value =
          s.stoppedExplicitly || s.reducedMotion ? 0 : elapsedTotal;
      }

      // 28-Segment Comet Navigation Weave trailing ribbon (in-place shift, zero per-frame allocation)
      const lookPoint = _scratchVec2.copy(camera.position).lerp(s.currentCenter, 0.62);
      for (let i = maxCometPts - 1; i > 0; i--) {
        s.cometPoints[i].copy(s.cometPoints[i - 1]);
      }
      if (s.cometPoints.length > 0) {
        s.cometPoints[0].copy(lookPoint);
      }
      const posAttr = cometGeo.getAttribute('position') as THREE.BufferAttribute;
      const weaveAttr = cometWeaveGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < maxCometPts; i++) {
        const pt = s.cometPoints[i] || lookPoint;
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

      starfield.update(elapsedTotal, !s.reducedMotion);
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
      const activeTargetId = s.HoveredNodeId || s.focusedNodeId || s.tourHighlightId;
      const activeEntry = activeTargetId ? resolveNodeEntry(activeTargetId, s.activeSphere) : null;
      const linkIsLive = (a: string, b: string): boolean =>
        activeEntry != null && (activeEntry.canonicalId === a || activeEntry.canonicalId === b);

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
          const baseEmissive = entry.nodeType === 'project' ? 1.2 : 0.85;
          const rmsBoost = s.flightActive ? 0.08 : 0.28;
          mat.emissiveIntensity = baseEmissive * b + (b > 0.85 ? liveRms * rmsBoost : 0);
        }
        if (entry.wireMat) {
          const baseWireOp = entry.nodeType === 'project' ? 0.34 : 0.44;
          entry.wireMat.opacity = baseWireOp * b + (b > 0.85 && activeEntry ? 0.28 : 0);
        }
        if (entry.connectorUniforms) {
          entry.connectorUniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
          entry.connectorUniforms.uAudioRms.value = liveRms;
          const baseDim = entry.nodeType === 'project' ? 0.55 : 0.85;
          const spokeLive =
            entry.sphere === s.activeSphere &&
            linkIsLive(`core-${entry.sphere}`, entry.canonicalId);
          entry.connectorUniforms.uDimFactor.value = THREE.MathUtils.damp(
            entry.connectorUniforms.uDimFactor.value,
            spokeLive ? baseDim + 0.35 : 0,
            9.5,
            dt
          );
          if (entry.connectorMesh) {
            entry.connectorMesh.visible =
              spokeLive || entry.connectorUniforms.uDimFactor.value > LINK_HIDE_EPSILON;
          }
        }

        if (entry.haloMesh) {
          // Selection ring only: no permanent concentric guides around idle nodes.
          const isHigh =
            entry.canonicalId === s.focusedNodeId ||
            entry.canonicalId === s.tourHighlightId ||
            entry.canonicalId === s.HoveredNodeId;
          entry.haloMesh.visible = isHigh;
          if (isHigh) {
            entry.haloMesh.lookAt(camera.position);
            entry.haloMesh.scale.setScalar(1.0);
          }
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

      // Cardiac tubes: in-sphere links render only while an endpoint is hovered/focused;
      // inter-sphere bridges stay as the primary constellation links.
      for (let c = 0; c < cardiacTubes.length; c++) {
        const ct = cardiacTubes[c];
        ct.uniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
        ct.uniforms.uAudioRms.value = liveRms;
        const live = !ct.intra || linkIsLive(ct.nodeA, ct.nodeB);
        ct.uniforms.uDimFactor.value = THREE.MathUtils.damp(
          ct.uniforms.uDimFactor.value,
          live ? 1.0 : 0,
          9.5,
          dt
        );
        ct.mesh.visible = live || ct.uniforms.uDimFactor.value > LINK_HIDE_EPSILON;
      }
      for (let i = 0; i < pulseBeads.length; i++) {
        const link = pulseBeads[i].link;
        pulseBeads[i].mesh.visible = !link || linkIsLive(link.a, link.b);
      }

      // Never apply setViewOffset (EffectComposer + bloom seam). Instead, soft-pan the
      // camera so the look-at projects into sceneSafeRect when a drawer/sheet is open.
      const curW = domEl.clientWidth || window.innerWidth;
      const curH = domEl.clientHeight || window.innerHeight;
      camera.clearViewOffset();
      const safeRect = unobstructedRectRef.current;
      if (
        safeRect &&
        safeRect.w > 40 &&
        safeRect.h > 40 &&
        (safeRect.w < curW * 0.92 || safeRect.h < curH * 0.92)
      ) {
        const safeCx = safeRect.x + safeRect.w * 0.5;
        const safeCy = safeRect.y + safeRect.h * 0.5;
        const ndcBiasX = (safeCx / curW - 0.5) * 2;
        const ndcBiasY = -(safeCy / curH - 0.5) * 2;
        const shiftScale = Math.min(4.5, s.radius * 0.22);
        camera.translateX(ndcBiasX * shiftScale);
        camera.translateY(ndcBiasY * shiftScale);
        camera.updateMatrixWorld();
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

          // Hide back-facing labels (far side of the sphere).
          const toCamX = camera.position.x - entry.worldPos.x;
          const toCamY = camera.position.y - entry.worldPos.y;
          const toCamZ = camera.position.z - entry.worldPos.z;
          const outX = entry.worldPos.x - s.currentCenter.x;
          const outY = entry.worldPos.y - s.currentCenter.y;
          const outZ = entry.worldPos.z - s.currentCenter.z;
          const outLen = Math.hypot(outX, outY, outZ) || 1;
          const toLen = Math.hypot(toCamX, toCamY, toCamZ) || 1;
          const facing =
            (outX / outLen) * (toCamX / toLen) +
            (outY / outLen) * (toCamY / toLen) +
            (outZ / outLen) * (toCamZ / toLen);
          if (facing <= 0.05 && entry.nodeType !== 'core') return;

          _scratchVec.project(camera);
          if (_scratchVec.z > 1) return;

          const sx = (_scratchVec.x * 0.5 + 0.5) * width;
          const sy = (-_scratchVec.y * 0.5 + 0.5) * height;

          // Offset label radially outward from screen center so each 3D sphere remains unobstructed
          const rx = sx - width * 0.5;
          const ry = sy - height * 0.5;
          const rLen = Math.hypot(rx, ry) || 1;
          const isPhoneProj = width < 768;
          const isTabletProj = width >= 768 && width < 1100;
          const radial = isPhoneProj ? 22 : isTabletProj ? 28 : 34;
          const sideBias = isPhoneProj ? 58 : isTabletProj ? 76 : 92;
          const lift = isPhoneProj ? 18 : isTabletProj ? 22 : 26;
          const offsetX =
            entry.nodeType === 'core'
              ? isPhoneProj
                ? 10
                : 24
              : (rx / rLen) * radial + (rx >= 0 ? 8 : -sideBias);
          const offsetY =
            entry.nodeType === 'core'
              ? isPhoneProj
                ? -16
                : -24
              : (ry / rLen) * lift - (isPhoneProj ? 8 : 14);

          projected.push({
            id: entry.canonicalId,
            label: entry.label,
            sublabel: entry.sublabel,
            contentLine: entry.contentLine,
            objectCode: entry.objectCode,
            sculptureTag: entry.sculptureTag,
            colour: entry.colour,
            x: sx + offsetX,
            y: sy + offsetY,
            anchorX: sx,
            anchorY: sy,
            zDepth,
            isFocused:
              entry.canonicalId === s.focusedNodeId ||
              entry.canonicalId === s.tourHighlightId ||
              entry.canonicalId === s.HoveredNodeId,
            nodeType: entry.nodeType,
          });
        });

        // Distance LOD — orbit shows title only; focus/macro reveals secondary metadata.
        const macroView = s.radius < 14 || Boolean(s.focusedNodeId);
        for (const item of projected) {
          if (!macroView && !item.isFocused && item.nodeType !== 'core') {
            item.sublabel = undefined;
          }
        }

        projected.sort((a, b) => a.y - b.y);
        // Responsive motion-graph packing — min 28px vertical displacement between anchors
        const isPhone = width < 768;
        const isTablet = width >= 768 && width < 1100;
        const minLabelGapY = isPhone ? 28 : isTablet ? 32 : 40;
        const minLabelGapX = isPhone ? 98 : isTablet ? 128 : 168;
        const safe = unobstructedRectRef.current;
        const dockClear = isPhone ? Math.max(128, height * 0.22) : isTablet ? 112 : 120;
        const topClear = isPhone ? Math.max(56, height * 0.08) : 72;
        const labelWidthReserve = isPhone ? Math.min(132, width * 0.42) : isTablet ? 160 : 195;
        const minX = safe ? Math.max(8, safe.x + 6) : isPhone ? 6 : 20;
        const maxX = safe
          ? Math.max(minX + 88, safe.x + safe.w - labelWidthReserve)
          : Math.max(minX + 88, width - labelWidthReserve);
        // Project chips carry a long sublabel ("At risk · 68% · 17 register records…"); on a phone
        // they need most of the viewport width, otherwise the chip is clipped by the screen edge.
        const wideChipReserve = isPhone ? Math.min(width - 16, 380) : labelWidthReserve;
        const maxXFor = (entry: { nodeType: string; sublabel?: string }): number =>
          entry.nodeType === 'project' && entry.sublabel
            ? Math.max(minX, Math.min(maxX, width - wideChipReserve - 8))
            : maxX;
        const minY = safe ? Math.max(topClear, safe.y + 6) : topClear;
        const maxY = safe
          ? Math.max(minY + 56, safe.y + safe.h - 24)
          : Math.max(minY + 56, height - dockClear);

        for (let pass = 0; pass < 6; pass++) {
          for (let i = 0; i < projected.length; i++) {
            for (let j = i + 1; j < projected.length; j++) {
              const dx = Math.abs(projected[i].x - projected[j].x);
              const dy = Math.abs(projected[i].y - projected[j].y);
              if (dx < minLabelGapX && dy < minLabelGapY) {
                const pushY = (minLabelGapY - dy) * 0.5 + 2;
                projected[i].y -= pushY;
                projected[j].y += pushY;
                const pushX =
                  (minLabelGapX - dx) *
                  0.22 *
                  (projected[i].x <= projected[j].x ? 1 : -1);
                projected[i].x -= pushX;
                projected[j].x += pushX;
              }
            }
            if (projected[i].x < minX + 40 && projected[i].y < minY + 28) {
              projected[i].y = minY + 36;
            }
            projected[i].x = THREE.MathUtils.clamp(projected[i].x, minX, maxXFor(projected[i]));
            projected[i].y = THREE.MathUtils.clamp(projected[i].y, minY, maxY);
          }
        }

        // Stable DOM sort order prevents React from reordering <button> elements mid-click while the sphere orbits
        projected.sort((a, b) => `${a.nodeType}-${a.id}`.localeCompare(`${b.nodeType}-${b.id}`));

        // Spatial 3D billboards for stations/dimensions/core — depth-sorted in WebGL.
        const billboardSpecs = [];
        const showBillboardMeta = s.radius < 14 || Boolean(s.focusedNodeId);
        for (const entry of nodeRegistryRef.current.values()) {
          if (entry.sphere !== s.activeSphere) continue;
          if (
            entry.nodeType !== 'station' &&
            entry.nodeType !== 'dimension' &&
            entry.nodeType !== 'core'
          ) {
            continue;
          }
          billboardSpecs.push({
            id: `${entry.sphere}:${entry.canonicalId}`,
            label: entry.label,
            sublabel:
              entry.nodeType === 'core'
                ? SPHERE_CAPTION[entry.sphere]
                : showBillboardMeta
                  ? entry.sublabel
                  : undefined,
            meta: entry.contentLine,
            colour: entry.colour,
            worldPos: entry.worldPos.clone(),
            sphereCenter: s.currentCenter.clone(),
            focused:
              entry.canonicalId === s.focusedNodeId || entry.canonicalId === s.HoveredNodeId,
          });
        }
        spatialBillboards.group.visible = !mediaTubeStateRef.current?.active;
        spatialBillboards.sync(billboardSpecs, camera);

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
      splineJourney.dispose();
      splineJourney.setCallbacks({});
      handInteractionMachine.reset();
      nodeInteraction.reset();
      glove.dispose();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      domEl.removeEventListener('webglcontextlost', handleContextLost);
      domEl.removeEventListener('webglcontextrestored', handleContextRestored);
      domEl.removeEventListener('contextmenu', onContextMenu);
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointerdown', recordUserInput);
      domEl.removeEventListener('pointerdown', interruptJourney);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', recordUserInput);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
        containerResizeObserver?.disconnect();
      if (composer) {
        composer.dispose();
      }
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const anyMat = m as unknown as { map?: THREE.Texture; bumpMap?: THREE.Texture };
            anyMat.map?.dispose();
            anyMat.bumpMap?.dispose();
            m.dispose();
          });
        }
      });
      goldRibbedBumpMap.dispose();
      sharedGoldRibbedMat.dispose();
      sharedOpticalGlassMat.dispose();
      sharedBackOpticalGlassMat.dispose();
      sharedTitaniumMat.dispose();
      sharedShellGeo.dispose();
      sharedHaloGeo.dispose();
      sharedPlanetBeadGeo.dispose();
      sharedSatBeadGeo.dispose();
      extraDisposables.forEach((d) => d.dispose());
      projectWorldHostRef.current?.dispose();
      projectWorldHostRef.current = null;
      masterRootRef.current = null;
      clearMountedSphereInstances();
      window.removeEventListener(SPHERE_SHAPE_EVENT, onSphereShape);
      resetSphereShapes();
      disposeShellGeometryCache([sharedShellGeo]);
      spatialBillboards.dispose();
      renderer.dispose();
    };
  }, [customDomains.length, sphereMaterials.hq, sphereMaterials.cde, webglRebuildKey]);

  // L03: mount/dispose project-world host under master without a second renderer.
  useEffect(() => {
    const parent = masterRootRef.current;
    if (!parent) return;
    if (!projectWorldId || projectWorldState === 'exiting') {
      projectWorldHostRef.current?.dispose();
      projectWorldHostRef.current = null;
      return;
    }
    if (projectWorldHostRef.current?.projectId === projectWorldId) {
      if (projectWorldState === 'suspended') projectWorldHostRef.current.suspend();
      else if (projectWorldState === 'active' || projectWorldState === 'entry') {
        projectWorldHostRef.current.resume();
      }
      return;
    }
    projectWorldHostRef.current?.dispose();
    const proj = PROJECTS_DATA.find((p) => p.id === projectWorldId);
    const worldManifest = getProjectWorldManifest(`world-${projectWorldId}`);
    projectWorldHostRef.current = mountUnavailableProjectWorld({
      parent,
      projectId: projectWorldId,
      title: proj?.name || projectWorldId,
      posterUrl: worldManifest?.worldPoster ?? null,
      provenanceNote: worldManifest
        ? worldManifest.programmeIsSample
          ? 'SAMPLE programme · verified media slots only'
          : worldManifest.worldPoster
            ? 'Verified poster · world unavailable'
            : 'No verified media · unavailable plate'
        : null,
    });
    if (projectWorldState === 'suspended') projectWorldHostRef.current.suspend();
    return () => {
      /* host lives until id changes or scene teardown */
    };
  }, [projectWorldId, projectWorldState]);

  const showReducedGraphicsFallback =
    forceWebglFallback || webglStatus === 'FALLBACK' || webglStatus === 'CONTEXT_LOST';

  return (
    <div className="fixed inset-0 z-[5] select-none">
      {/* WebGL Canvas Mount */}
      <div
        ref={mountRef}
        data-testid="cosmograph-canvas"
        role="img"
        tabIndex={0}
        aria-label={
          activeSphere === 'hq'
            ? 'HQ containment sphere with stations and projects.'
            : activeSphere === 'cde'
              ? 'CDE containment sphere with culture and design dimensions.'
              : activeSphere === 'campaign-os'
                ? 'Campaign OS sphere with public campaign films and activations.'
                : 'About Us sphere with NOJARA Studios identity and founder bios.'
        }
        className={`w-full h-full touch-none ${showReducedGraphicsFallback ? 'opacity-15 pointer-events-none' : ''}`}
      />

      {/* Reduced-Graphics Spatial View Fallback when WebGL is unavailable or forced for diagnostics */}
      {showReducedGraphicsFallback && (
        <div
          data-testid="reduced-graphics-fallback"
          className="fixed top-20 bottom-36 left-3 right-3 md:left-6 md:right-6 z-15 flex items-center justify-center pointer-events-none"
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="cj-glass-card pointer-events-auto max-w-xl w-full max-h-full overflow-y-auto overscroll-contain rounded-2xl border p-4 space-y-3 shadow-2xl"
            style={{
              backgroundColor: COLOUR_TOKENS.glassRgba,
              borderColor: COLOUR_TOKENS.outlineControl,
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--token-divider)] pb-2.5">
              <div className="min-w-0">
                <div className="font-mono text-[12px] text-[#D4AF37] uppercase tracking-wider">
                  REDUCED-GRAPHICS SPATIAL WORKSPACE
                </div>
                <h2 className="font-display text-sm md:text-base font-semibold text-[#F2F6F8] truncate">
                  {SPHERE_CAPTION[activeSphere] + ' Spatial Map'}
                </h2>
                <p className="font-mono text-[11px] text-[#BDCBD3] mt-1" role="status">
                  {webglStatus === 'CONTEXT_LOST'
                    ? 'WebGL unavailable after context loss. Spatial map stays usable; retry restores glass spheres.'
                    : webglReason ||
                      'WebGL unavailable on this device. Use the 2D spatial map below.'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-[#101622] border border-[color:var(--token-divider)] text-[#C5CCD6]">
                  {webglReason || '2D Spatial Navigation Active'}
                </span>
                <button
                  type="button"
                  data-testid="webgl-retry"
                  className="min-h-[44px] min-w-[44px] px-3 rounded-xl border font-mono text-[11px] text-[#F2F6F8] hover:border-[#9AFFE0] cursor-pointer"
                  style={{
                    backgroundColor: '#101622',
                    borderColor: 'rgba(154,255,224,0.35)',
                  }}
                  onClick={() => {
                    setWebglReason('');
                    setWebglRebuildKey((key) => key + 1);
                  }}
                >
                  Retry WebGL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeSphere === 'hq'
                ? CEREBRO_STATIONS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectNode(st.id, 'station', 'hq')}
                      className="min-h-[42px] p-2 rounded-xl border border-[color:var(--token-divider)] bg-[#101622]/90 hover:border-[#D4AF37] text-left cursor-pointer transition-colors"
                    >
                      <div className="font-mono text-[12px]" style={{ color: st.colour }}>
                        {st.code}
                      </div>
                      <div className="font-display text-xs font-semibold text-[#F2F6F8] truncate">
                        {st.label}
                      </div>
                    </button>
                  ))
                : CDE_DIMENSIONS.map((dim) => (
                    <button
                      key={dim.id}
                      type="button"
                      onClick={() => onSelectNode(dim.id, 'dimension', 'cde')}
                      className="min-h-[42px] p-2 rounded-xl border border-[color:var(--token-divider)] bg-[#101622]/90 hover:border-[#D4AF37] text-left cursor-pointer transition-colors"
                    >
                      <div className="font-mono text-[12px]" style={{ color: dim.colour }}>
                        CDE DIMENSION
                      </div>
                      <div className="font-display text-xs font-semibold text-[#F2F6F8] truncate">
                        {dim.label}
                      </div>
                    </button>
                  ))}
            </div>

            <div className="pt-2 border-t border-[color:var(--token-divider)]">
              <div className="font-mono text-[12px] text-[#C5CCD6] mb-1.5">PROJECTS</div>
              <div className="flex flex-wrap gap-1.5">
                {(activeSphere === 'hq' ? HQ_PROJECTS_DATA : VISIBLE_PROJECTS_DATA).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectNode(p.id, 'project', activeSphere)}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[color:var(--token-divider)] bg-[#101622]/90 font-mono text-[13px] text-[#F2F6F8] hover:border-[#D4AF37] cursor-pointer transition-colors"
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
              className="font-mono text-[12px] uppercase"
              fill={COLOUR_TOKENS.textCoord}
            >
              {touchIndicator.mode}
            </text>
          </svg>
        </div>
      )}

      {/* Motion-graph infographic labels — continuous tether + land-in copy, camera-driven */}
      {!showReducedGraphicsFallback && (
        <div className="cerebro-infograph-layer fixed inset-0 pointer-events-none z-10">
          <svg className="fixed inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            {labels2D.map((item, idx) => {
              // Cover-post density: stations/core only by default; projects only when
              // focused or attention (At risk / Blocked) — never flood desktop with all chips.
              const isAttentionProject =
                item.nodeType === 'project' &&
                !!item.sublabel &&
                /At risk|Blocked/i.test(item.sublabel);
              const isSpatialBillboard =
                item.nodeType === 'station' ||
                item.nodeType === 'dimension' ||
                item.nodeType === 'core';
              // WebGL sprites own station/core labels — skip SVG tethers that collide in depth.
              if (isSpatialBillboard && webglStatus === 'ACTIVE') {
                return null;
              }
              const isPrimaryStation =
                isSpatialBillboard ||
                (item.nodeType === 'project' && (item.isFocused || isAttentionProject));
              if (
                (!item.isFocused && !isPrimaryStation) ||
                item.anchorX === undefined ||
                item.anchorY === undefined
              ) {
                return null;
              }
              const badgeAnchorX = item.x + 14;
              const badgeAnchorY = item.y + 19;
              const strokeCol = item.isFocused
                ? 'var(--token-focus, #65ACFF)'
                : 'color-mix(in srgb, var(--token-active-ice) 42%, transparent)';
              const dotCol = item.isFocused
                ? 'var(--token-focus, #65ACFF)'
                : 'var(--token-active-ice)';
              const midX = (item.anchorX + badgeAnchorX) * 0.5;
              const midY = (item.anchorY + badgeAnchorY) * 0.5 - 10;
              return (
                <g
                  key={`tether-${activeSphere}-${item.id}-${item.nodeType}`}
                  opacity={item.isFocused ? 0.98 : 'var(--token-cold-opacity)'}
                  style={{ animationDelay: `${(idx % 8) * 60}ms` }}
                >
                  <path
                    className={`cerebro-infograph-tether${item.isFocused ? ' is-focused' : ''}`}
                    d={`M ${item.anchorX} ${item.anchorY} Q ${midX} ${midY} ${badgeAnchorX} ${badgeAnchorY}`}
                    fill="none"
                    stroke={strokeCol}
                    strokeWidth={item.isFocused ? 1.6 : 1.15}
                    strokeLinecap="round"
                  />
                  <circle
                    cx={item.anchorX}
                    cy={item.anchorY}
                    r={item.isFocused ? 7 : 4.5}
                    fill="rgba(12, 18, 28, 0.72)"
                    stroke={strokeCol}
                    strokeWidth={item.isFocused ? 1.5 : 1.2}
                  />
                  <circle
                    cx={item.anchorX}
                    cy={item.anchorY}
                    r={item.isFocused ? 2.5 : 1.75}
                    fill={dotCol}
                  />
                </g>
              );
            })}
          </svg>

          {labels2D.map((item, idx) => {
            const isAttentionProject =
              item.nodeType === 'project' &&
              !!item.sublabel &&
              /At risk|Blocked/i.test(item.sublabel);
            const isSpatialBillboard =
              item.nodeType === 'station' ||
              item.nodeType === 'dimension' ||
              item.nodeType === 'core';
            const isPrimaryStation =
              isSpatialBillboard ||
              (item.nodeType === 'project' && (item.isFocused || isAttentionProject));
            const x = Math.round(item.x);
            const y = Math.round(item.y);
            const isCompactChip = !item.isFocused && !isPrimaryStation;
            // Stations/core/dimensions render as WebGL sprites — keep DOM as invisible hit targets.
            const useHitTargetOnly = isSpatialBillboard && webglStatus === 'ACTIVE';
            return (
              <button
                key={`${activeSphere}-${item.id}-${item.nodeType}`}
                type="button"
                data-testid={`sphere-label-${item.id}`}
                data-object-code={item.objectCode}
                data-chrome-state={item.isFocused ? 'active' : 'cold'}
                data-spatial-billboard={useHitTargetOnly ? 'true' : undefined}
                aria-label={`${item.label}${item.sublabel ? `, ${item.sublabel}` : ''} · ${item.nodeType}`}
                aria-pressed={item.isFocused}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerEnter={() => {
                  stateRef.current.HoveredNodeId = item.id;
                  callbacksRef.current.onHoverNodeChange?.(item.id);
                  const panX = (item.x / Math.max(1, window.innerWidth)) * 2 - 1;
                  soundEngine.playNodeHover(panX);
                }}
                onPointerLeave={() => {
                  if (stateRef.current.HoveredNodeId === item.id) {
                    stateRef.current.HoveredNodeId = null;
                    callbacksRef.current.onHoverNodeChange?.(null);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const panX = (item.x / Math.max(1, window.innerWidth)) * 2 - 1;
                  soundEngine.playNodeSelect(panX);
                  onSelectNode(item.id, item.nodeType, activeSphere);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectNode(item.id, item.nodeType, activeSphere);
                  }
                }}
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0)`,
                  borderColor: useHitTargetOnly
                    ? 'transparent'
                    : item.isFocused
                      ? 'var(--token-focus, #65ACFF)'
                      : 'color-mix(in srgb, var(--token-active-ice) 36%, transparent)',
                  background: useHitTargetOnly ? 'transparent' : undefined,
                  color: useHitTargetOnly ? 'transparent' : undefined,
                  opacity: useHitTargetOnly ? 0 : undefined,
                }}
                className={`cerebro-focus-label cerebro-infograph-label fixed top-0 left-0 min-h-[44px] pointer-events-auto cursor-pointer px-3.5 py-1.5 rounded-full border flex items-center gap-2.5 text-left group hover:border-[color:var(--token-focus,#65ACFF)] ${
                  useHitTargetOnly
                    ? ''
                    : item.isFocused
                      ? 'is-focused opacity-100'
                      : isAttentionProject
                        ? 'opacity-90 hover:opacity-100 focus:opacity-100'
                        : 'opacity-[var(--token-cold-opacity)] hover:opacity-100 focus:opacity-100'
                }`}
              >
                <span className="ig-pulse" aria-hidden="true" />
                <span
                  className="ig-shell"
                  style={{
                    animationDelay: `${(idx % 10) * 55}ms, ${(idx % 10) * 55 + 720}ms`,
                  }}
                >
                  <span className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                    <span
                      className="absolute inset-0 rounded-full border transition-colors"
                      style={{
                        borderColor: item.isFocused
                          ? '#D4AF37'
                          : 'rgba(180, 221, 255, 0.55)',
                      }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: item.isFocused ? '#D4AF37' : item.colour || '#B4DDFF',
                      }}
                    />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="ig-title font-sans font-medium text-[#F2F6F8]">
                      {item.label}
                    </span>
                    {item.sublabel && !isCompactChip && (
                      <span className="ig-sub font-sans text-[#D0DCE3]">
                        {item.sublabel}
                      </span>
                    )}
                    {item.contentLine && !useHitTargetOnly && (
                      <span
                        className="ig-sub font-mono text-[#F4D68C]"
                        data-testid={`node-content-${item.id}`}
                      >
                        {item.contentLine}
                      </span>
                    )}
                  </div>
                </span>
              </button>
            );
          })}

          {/* Caption suppressed — Cerebro chat widget owns bottom-center copy to avoid overlap. */}
          {false && captionBubble && (
            <div
              className="cerebro-infograph-caption cerebro-intro-copy fixed left-1/2 bottom-[max(7.5rem,18%)] -translate-x-1/2 z-20 px-4 py-2.5 pointer-events-none max-w-[min(420px,88vw)]"
              role="status"
              aria-live="polite"
              data-testid="caption-bubble"
            >
              <div className="ig-shell">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: '#D4AF37' }}
                  />
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#B4DDFF]">
                    Cerebro
                  </span>
                </div>
                <p className="font-sans text-sm md:text-[0.95rem] text-[#F2F6F8] leading-snug text-balance">
                  {captionBubble}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
