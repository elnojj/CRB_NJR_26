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
import { PUBLIC_BRAND_MEDIA } from '../data/publicBrandMedia';
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
import {
  patchFresnelRimOnOpaqueFragment,
  buildClosedOrbitalLoopPoints,
  updateBoundedParticleDrift,
  createResizeSnapshot,
  readHomeComposition,
  executeAtomicReframe,
  IDLE_MS,
} from '../three/spatialNavigation';
import { mountSphereVideoTexture, type SphereVideoHandle } from '../lib/sphereVideoTexture';
import { createMatLiquidGlassShell } from '../materials/matLiquidGlassShell';
import {
  createCardiacConnectorTube,
  type CardiacConnectorUniforms,
} from '../materials/matCardiacConnector';
import {
  MASTER_SPHERE,
  DOMAIN_CDE,
  MASTER_DESTINATIONS,
  buildMasterProjectPortals,
  projectPortalCountLabel,
} from '../three/masterSphere';
import {
  mountUnavailableProjectWorld,
  type ProjectWorldHostHandle,
} from '../three/projectWorldHost';
import { getSphereTextureAsset } from '../data/driveMediaCatalog';
import { getProjectWorldManifest } from '../data/projectWorldManifest';
import { introBridge } from '../intro/bridge';
import {
  CAMERA_MOTION_TARGETS,
  clampNodeFocusMs,
  clampSphereTravelMs,
  SPHERE_NETWORK,
  sphereCenterVec,
} from '../three/sphereNetwork';
import { createIstanbaMouldProof, type IstanbaProofHandle } from '../three/istanbaMouldProof';

const sceneRandom = () => (introBridge.enabled ? introBridge.random() : Math.random());

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
  renderer.setClearColor(0x1b2230, 1);
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
      sheen: 0.35,
      sheenColor: new THREE.Color('#FFF4D0'),
      bumpMap: stripeBump,
      bumpScale: 0.035,
    }),
    opticalGlass: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#FFFFFF'),
      metalness: 0.0,
      roughness: 0.04,
      transmission: 0.96,
      ior: 1.52,
      thickness: 1.4,
      clearcoat: 0.9,
      clearcoatRoughness: 0.06,
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#EAF2FF'),
      attenuationColor: new THREE.Color('#A4CBFF'),
      attenuationDistance: 4.5,
      transparent: true,
      depthWrite: false,
    }),
    titanium: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#C5CCD6'),
      metalness: 0.88,
      roughness: 0.28,
      clearcoat: 0.2,
    }),
  };
  return cachedD0Materials;
}

export function setupLights(scene: THREE.Scene): THREE.Light[] {
  const key = new THREE.DirectionalLight(0xfff4d0, 2.8);
  key.position.set(12, 18, 14);
  key.castShadow = true;
  const rim = new THREE.DirectionalLight(0xa4cbff, 1.9);
  rim.position.set(-14, -10, -8);
  const fill = new THREE.HemisphereLight(0x3a516e, 0x101622, 0.9);
  scene.add(key, rim, fill);
  return [key, rim, fill];
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
  posterUrl?: string;
  isRealVideo?: boolean;
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

  return Array.from({ length: PROJECT_MEDIA_TUBE_SPECS.maxMountedTiles }).map((_, idx) => {
    const defaultKind = baseKinds[idx % baseKinds.length];
    const defaultAspect = baseAspects[idx % baseAspects.length];
    const row = Math.floor(idx / PROJECT_MEDIA_TUBE_SPECS.columns) + 1;
    const col = (idx % PROJECT_MEDIA_TUBE_SPECS.columns) + 1;
    const defaultAccent =
      defaultKind === 'video' ? '#D4AF37' : defaultKind === 'pdf' ? '#C5CCD6' : '#FFF4D0';

    // 1. EL-BATRON: Real El Batron showreel on the first available video tile (tile 0)
    if (cleanProj === 'EL-BATRON') {
      if (idx === 0) {
        return {
          index: idx,
          id: `tube-el-batron-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: PUBLIC_BRAND_MEDIA.elBatron.title,
          subtitle: 'VIDEO · 720p Official Showreel · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          url: PUBLIC_BRAND_MEDIA.elBatron.url,
          posterUrl: PUBLIC_BRAND_MEDIA.elBatron.posterUrl,
          isRealVideo: true,
        };
      }
      if (defaultKind === 'video') {
        return {
          index: idx,
          id: `tube-el-batron-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: `El Batron · Live Spatial Audio Rig (${row}.${col})`,
          subtitle: 'VIDEO · No cleared video linked · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          isRealVideo: false,
        };
      }
    }

    // 2. NOJARA Studios: Showreel 2023 and LaLiga in distinct slots (tiles 0 and 1)
    if (cleanProj === 'NOJARA') {
      if (idx === 0) {
        return {
          index: idx,
          id: `tube-nojara-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: PUBLIC_BRAND_MEDIA.showreel2023.title,
          subtitle: 'VIDEO · 720p Master Showreel · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          url: PUBLIC_BRAND_MEDIA.showreel2023.url,
          posterUrl: PUBLIC_BRAND_MEDIA.showreel2023.posterUrl,
          isRealVideo: true,
        };
      }
      if (idx === 1) {
        return {
          index: idx,
          id: `tube-nojara-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: PUBLIC_BRAND_MEDIA.laligaFilm.title,
          subtitle: 'VIDEO · 720p Official Film · 16:9',
          kind: 'video',
          aspect: '16:9',
          accentHex: '#D4AF37',
          url: PUBLIC_BRAND_MEDIA.laligaFilm.url,
          posterUrl: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
          isRealVideo: true,
        };
      }
    }

    // 3. SEVEN: Real verified Tabuk renders on image tiles
    if (cleanProj === 'SEVEN') {
      if (idx === 0) {
        return {
          index: idx,
          id: `tube-seven-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: 'SEVEN Tabuk — Concept Render Desktop',
          subtitle: 'IMAGE · Attached 06 Render · 16:9',
          kind: 'image',
          aspect: '16:9',
          accentHex: '#FFF4D0',
          url: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
          posterUrl: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
          isRealVideo: false,
        };
      }
      if (idx === 3) {
        return {
          index: idx,
          id: `tube-seven-${String(idx + 1).padStart(2, '0')}`,
          projectId: cleanProj,
          title: 'SEVEN Tabuk — Concept Render Mobile',
          subtitle: 'IMAGE · Attached 06 Render · 9:16',
          kind: 'image',
          aspect: '16:9',
          accentHex: '#FFF4D0',
          url: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
          posterUrl: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
          isRealVideo: false,
        };
      }
    }

    // Default / Unknown project truthful document items
    const isVideo = defaultKind === 'video';
    const sub = isVideo
      ? 'VIDEO · No cleared video linked · 16:9'
      : `${defaultKind.toUpperCase()} · Row ${row} Col ${col} · ${defaultAspect}`;

    return {
      index: idx,
      id: `tube-${cleanProj.toLowerCase()}-${String(idx + 1).padStart(2, '0')}`,
      projectId: cleanProj,
      title: `${cleanProj} · ${defaultKind === 'video' ? 'Walkthrough Reel' : defaultKind === 'pdf' ? 'Executive Dossier' : 'Keyframe Plate'} (${row}.${col})`,
      subtitle: sub,
      kind: defaultKind,
      aspect: defaultAspect,
      accentHex: defaultAccent,
      isRealVideo: false,
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
  /** Optional hook after the Three.js scene is mounted (project-world proofs, QA). */
  onSceneReady?: (scene: THREE.Scene) => void;
  /** When hand tracking is lost, settle residual gesture velocity without teleport. */
  gestureTrackingActive?: boolean;
  /** Active project-world portal id — mounts/disposes a scoped host under master. */
  projectWorldId?: string | null;
  projectWorldState?: 'entry' | 'active' | 'suspended' | 'exiting' | 'unavailable' | null;
  /**
   * L08 — idle auto-orbit only when no voice/panel/project/media/tour owns the stage.
   * Explicit autoOrbit commands still apply.
   */
  idleOrbitAllowed?: boolean;
}

export const HQ_CENTER = sphereCenterVec('hq');
export const CDE_CENTER = sphereCenterVec('cde');

function resolveSphereCenter(id: string | null | undefined): THREE.Vector3 {
  if (id === 'cde') return CDE_CENTER;
  if (id === 'campaign-os' || id === 'about-us') return sphereCenterVec(id);
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
          '#65ACFF',
          '#BCC9D4',
          '#D4AF37',
          '#F2F6F8',
          '#8C6A45',
        ]
      : [
          '#D4AF37',
          '#B4DDFF',
          '#8C6A45',
          '#BCC9D4',
          '#65ACFF',
          '#F2F6F8',
        ];

  const arms = 4;
  for (let i = 0; i < particleCount; i++) {
    const layer = i % 3; // 3-layer vertical thickness & orbital stratification
    const armIndex = i % arms;
    const t = Math.pow(i / particleCount, 0.78);
    const radius = 0.65 + t * 4.35;
    const spinAngle = radius * 1.15 + (armIndex * Math.PI * 2) / arms;

    // Deterministic golden-ratio scatter
    const rand1 = ((i * 1.6180339887) % 1) * 2 - 1;
    const rand2 = ((i * 2.4142135623) % 1) * 2 - 1;
    const rand3 = ((i * 3.1415926535) % 1) * 2 - 1;

    const layerSpreadY = layer === 0 ? 0.42 : layer === 1 ? 1.35 : 2.65;
    const armSpread = (0.24 + radius * 0.075) * rand1;

    const x = Math.cos(spinAngle + armSpread) * radius + rand2 * 0.2;
    const z = Math.sin(spinAngle + armSpread) * radius + rand1 * 0.2;
    const y = rand3 * layerSpreadY * (1 - t * 0.38);

    // Clamp strictly inside the 5.35u interior of the 6.2u containment sphere
    const vLen = Math.hypot(x, y, z);
    const scaleClamp = vLen > 5.35 ? 5.35 / vLen : 1.0;

    positions[i * 3] = x * scaleClamp;
    positions[i * 3 + 1] = y * scaleClamp;
    positions[i * 3 + 2] = z * scaleClamp;

    _scratchColor.set(paletteHex[i % paletteHex.length]);
    colors[i * 3] = _scratchColor.r;
    colors[i * 3 + 1] = _scratchColor.g;
    colors[i * 3 + 2] = _scratchColor.b;

    sizes[i] = (layer === 0 ? 7.5 : layer === 1 ? 5.5 : 4.0) * (0.55 + 0.45 * Math.abs(rand2));
    // Seeded when introBridge is active so proof frames stay coherent across seeks.
    phases[i] = introBridge.enabled
      ? sceneRandom() * Math.PI * 2
      : (i * 0.73) % (Math.PI * 2);
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
        float alpha = profile * mix(0.32, 0.12, vBokehBlur) * vTwinkle;

        gl_FragColor = vec4(vColor * (0.95 + (1.0 - vBokehBlur) * 0.25), clamp(alpha, 0.0, 0.42));
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
  onSceneReady,
  gestureTrackingActive = true,
  projectWorldId = null,
  projectWorldState = null,
  idleOrbitAllowed = true,
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
    targetCenter: new THREE.Vector3(0, 0, 0),
    currentCenter: new THREE.Vector3(0, 0, 0),
    azimuth: -0.18,
    polar: 1.48,
    radius: 17.5,
    targetAzimuth: 0.04,
    targetPolar: 1.50,
    targetRadius: 15.6,
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
        objectCode?: string;
        sculptureTag?: string;
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
        connectorUniforms?: CardiacConnectorUniforms;
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
        triggerCometFlight(sphereCenter, az, pol, 12.8, focusMs, isCrossingSpheres);
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

    // Intro journey needs the full optical pipeline; do not force software path.
    if (introBridge.enabled) isSoftwareGl = false;

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
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.04;
    // Deep ink void for intro AND workspace — never the old flat #101D27 navy slab.
    const voidColor = 0x03060c;
    renderer.setClearColor(voidColor, 1);
    renderer.setPixelRatio(
      introBridge.enabled
        ? Math.min(window.devicePixelRatio || 1, 2)
        : isSoftwareGl
          ? 1
          : Math.min(window.devicePixelRatio, 2)
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
    // Atmospheric radial field behind the dual spheres (intro + workspace).
    // Must read clearly against the old flat #101D27 navy — deeper ink, brighter blooms.
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1024;
    bgCanvas.height = 1024;
    {
      const bgCtx = bgCanvas.getContext('2d')!;
      // Base ink void — cooler and deeper than #101D27.
      const g = bgCtx.createRadialGradient(512, 460, 30, 512, 540, 720);
      g.addColorStop(0, '#243848');
      g.addColorStop(0.22, '#142433');
      g.addColorStop(0.48, '#0a1520');
      g.addColorStop(0.78, '#050b14');
      g.addColorStop(1, '#02050a');
      bgCtx.fillStyle = g;
      bgCtx.fillRect(0, 0, 1024, 1024);
      // Cool ice bloom upper-left — brand, not purple.
      const ice = bgCtx.createRadialGradient(260, 220, 16, 260, 220, 420);
      ice.addColorStop(0, 'rgba(180,221,255,0.34)');
      ice.addColorStop(0.45, 'rgba(101,172,255,0.14)');
      ice.addColorStop(1, 'rgba(180,221,255,0)');
      bgCtx.fillStyle = ice;
      bgCtx.fillRect(0, 0, 1024, 1024);
      // Secondary cool rim along the horizon.
      const iceRim = bgCtx.createRadialGradient(540, 620, 40, 540, 620, 380);
      iceRim.addColorStop(0, 'rgba(101,172,255,0.10)');
      iceRim.addColorStop(1, 'rgba(101,172,255,0)');
      bgCtx.fillStyle = iceRim;
      bgCtx.fillRect(0, 0, 1024, 1024);
      // Soft gold dust lower-right.
      const gold = bgCtx.createRadialGradient(780, 800, 12, 780, 800, 360);
      gold.addColorStop(0, 'rgba(212,175,55,0.20)');
      gold.addColorStop(0.5, 'rgba(212,175,55,0.07)');
      gold.addColorStop(1, 'rgba(212,175,55,0)');
      bgCtx.fillStyle = gold;
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
    scene.fog = new THREE.FogExp2(voidColor, introBridge.enabled ? 0.006 : 0.007);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(46, initW / initH, 0.1, 200);

    // Post-Processing: default app bans bloom/glow (L10). Film bloom stays intro-scoped only.
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let cinemaPass: ShaderPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      if (introBridge.enabled) {
        // Selective high-threshold bloom — Sehly 180s film scope only
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
      } else {
        // Workspace / master sphere — clean pass, no UnrealBloomPass
        renderPass.renderToScreen = true;
      }
    }

    // Sehly / Cerebro 39 Master Lighting Rig (Sehly_Cerebro_Master_Guidelines.pdf Page 5):
    // Broad cool key (#E8FBFF / #B4DDFF), narrow warm upper rim (#FFF4D0 / #D4AF37), blue lower fill (#65ACFF / #101D27)
    const ambientLight = new THREE.AmbientLight(0x142632, 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xE8FBFF, 2.5);
    keyLight.position.set(15, 25, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x65ACFF, 1.35);
    fillLight.position.set(-20, -14, -15);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xFFF4D0, 1.95);
    rimLight.position.set(0, 30, -20);
    scene.add(rimLight);

    const glassUniforms = {
      uTime: { value: 0 },
      uAudioRms: { value: 0 },
      uInteriorDome: { value: 0 },
    };

    const extraDisposables: Array<{ dispose: () => void }> = [];
    extraDisposables.push(bgTexture);

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
      roughness: 0.18,
      clearcoat: 0.35,
      clearcoatRoughness: 0.1,
      sheen: 0.45,
      sheenRoughness: 0.25,
      sheenColor: new THREE.Color(0xD4AF37),
      bumpMap: goldRibbedBumpMap,
      bumpScale: 0.015,
    });

    // 2. Gold Attention Node Material (regenerate_starter_meshes.py: #D4AF37, metalness: 0.95, roughness: 0.14, emissive: #382808)
    const sharedPolishedGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xD4AF37,
      emissive: new THREE.Color(0x382808),
      emissiveIntensity: 0.55,
      metalness: 0.95,
      roughness: 0.14,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xFFF4D0),
    });
    extraDisposables.push(sharedPolishedGoldMat);

    // 3. Brushed Silver Core Material (regenerate_starter_meshes.py: #BCC9D4, metalness: 0.94, roughness: 0.28)
    const sharedBrushedSilverCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0xBCC9D4,
      metalness: 0.94,
      roughness: 0.28,
      clearcoat: 0.25,
      clearcoatRoughness: 0.14,
      sheen: 0.35,
      sheenRoughness: 0.25,
      sheenColor: new THREE.Color(0xB4DDFF),
      bumpMap: goldRibbedBumpMap,
      bumpScale: 0.012,
    });
    extraDisposables.push(sharedBrushedSilverCoreMat);

    // Translucent Inner Brushed Silver Core Shell (r = 0.82R = 5.084u in regenerate_starter_meshes.py)
    // Allows inner stations/projects to remain visible while providing the exact Sehly brushed-silver core silhouette
    const sharedInnerSilverEnvelopeMat = new THREE.MeshPhysicalMaterial({
      color: 0xBCC9D4,
      metalness: 0.94,
      roughness: 0.28,
      clearcoat: 0.3,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: isSoftwareGl ? 0.08 : 0.16,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    extraDisposables.push(sharedInnerSilverEnvelopeMat);

    // 4. Portrait Medallion / Optical Portal Dark Glass Material (regenerate_starter_meshes.py: #182834, metalness: 0.2, roughness: 0.22)
    const sharedPortalDarkGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x182834,
      metalness: 0.2,
      roughness: 0.22,
      clearcoat: 0.65,
      clearcoatRoughness: 0.08,
      specularColor: new THREE.Color(0xB4DDFF),
    });
    extraDisposables.push(sharedPortalDarkGlassMat);

    // 5. Cool Ice / Focus Blue Accent Material (#B4DDFF / #65ACFF)
    const sharedCoolIceNodeMat = new THREE.MeshPhysicalMaterial({
      color: 0xB4DDFF,
      emissive: new THREE.Color(0x142632),
      emissiveIntensity: 0.45,
      metalness: 0.78,
      roughness: 0.18,
      clearcoat: 0.5,
      clearcoatRoughness: 0.08,
    });
    extraDisposables.push(sharedCoolIceNodeMat);

    // 6. Refractive Liquid Glass Sub-Sphere Material (design_tokens.json liquidGlass)
    // Sub-sphere glass must match MAT_LIQUID_GLASS_SHELL (no alternate opacity recipe).
    const sharedCrystalGlassBubbleMat = createMatLiquidGlassShell({
      softwareGl: isSoftwareGl,
      face: 'front',
    });
    extraDisposables.push(sharedCrystalGlassBubbleMat);

    // 7. Outer Refractive Liquid Glass Shell (Master Containment Sphere r = 1.0R = 6.2u)
    // Source: design_tokens.json liquidGlass & Document 01 material.shell.*
    // MAT_LIQUID_GLASS_SHELL — one fluid translucent recipe for every sphere shell.
    const sharedOpticalGlassMat = createMatLiquidGlassShell({
      softwareGl: isSoftwareGl,
      face: 'front',
    });
    const sharedBackOpticalGlassMat = createMatLiquidGlassShell({
      softwareGl: isSoftwareGl,
      face: 'back',
    });
    // MAT owns shell opacity — tick must not invent a competing 0.42 recipe.
    const shellFrontBaseOpacity = sharedOpticalGlassMat.opacity;

    // Shared Titanium / Silver Material (silver nodes & portal rim)
    const sharedTitaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0xBCC9D4,
      metalness: 0.94,
      roughness: 0.28,
      clearcoat: 0.35,
      clearcoatRoughness: 0.1,
    });

    const rimColVec = new THREE.Color(0xB4DDFF);
    const bodyColVec = new THREE.Color(0x65ACFF);

    const injectCausticShader = (mat: THREE.MeshPhysicalMaterial, isBack: boolean) => {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = glassUniforms.uTime;
        shader.uniforms.uAudioRms = glassUniforms.uAudioRms;
        shader.uniforms.uInteriorDome = glassUniforms.uInteriorDome;
        // Intro: keep a tiny caustic shimmer without vertex pumping that z-fights the video band.
        const waveAmp = introBridge.enabled ? '0.002' : '(0.015 + uAudioRms * 0.035)';
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
          isBack ? 2.1 : 2.9
        );
        if (!patchedOpaque) {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
            vec3 causticN = normalize(vNormal);
            vec3 causticV = normalize(vViewPosition);
            float fresnel = pow(1.0 - clamp(abs(dot(causticN, causticV)), 0.0, 1.0), ${
              isBack ? '2.1' : '2.7'
            });
            vec3 causticRim = vec3(${rimColVec.r.toFixed(3)}, ${rimColVec.g.toFixed(3)}, ${rimColVec.b.toFixed(3)});
            vec3 causticBody = vec3(${bodyColVec.r.toFixed(3)}, ${bodyColVec.g.toFixed(3)}, ${bodyColVec.b.toFixed(3)});
            float causticWave = 0.5 + 0.5 * sin(uTime * 0.55);
            vec3 rimTint = mix(causticBody, causticRim, causticWave) * fresnel * (0.2 + uAudioRms * 0.1);
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
    const sharedOuterRibTorusGeo = new THREE.TorusGeometry(6.2 * 1.015, 6.2 * 0.008, 20, 128); // orbital_cage: R=1.015R (6.293u), r=0.008R (0.0496u)
    const sharedPortalRimGeo = new THREE.TorusGeometry(6.2 * 0.85, 6.2 * 0.012, 20, 96); // media_portal_rim: R=0.85R (5.27u)
    const sharedHaloGeo = new THREE.RingGeometry(0.76, 0.82, 48);
    const sharedPlanetBeadGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const sharedSatBeadGeo = new THREE.SphereGeometry(0.11, 16, 16);
    const sharedUnitSphereGeo = new THREE.SphereGeometry(1.0, 48, 48);
    extraDisposables.push(sharedInnerSilverCoreGeo, sharedPortalRimGeo, sharedUnitSphereGeo);

    // Directive 04 & 05: Genuine Dynamic Media Showcase Texture inside Spheres & ST-05 Media Portal
    const createLiveMediaScreenTexture = (
      title: string,
      posterUrl: string,
      accentHex: string
    ): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;

      const drawBase = () => {
        const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
        grad.addColorStop(0, '#1B2230');
        grad.addColorStop(0.7, '#101622');
        grad.addColorStop(1, '#05090E');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Circular cinematic frame
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(256, 256, 240, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary inner dash ring
        ctx.strokeStyle = 'rgba(255, 244, 208, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(256, 256, 224, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Brand & Title
        ctx.fillStyle = accentHex;
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NOJARA STUDIOS · SHOWREEL', 256, 230);

        ctx.fillStyle = '#F2F6F8';
        ctx.font = 'bold 22px "Space Grotesk", sans-serif';
        ctx.fillText(title.slice(0, 26), 256, 270);

        ctx.fillStyle = '#C5CCD6';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText('720p MASTER · SPATIAL AUDIO', 256, 305);
      };

      drawBase();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;

      if (posterUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            ctx.save();
            ctx.beginPath();
            ctx.arc(256, 256, 240, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, 0, 48, 512, 384);

            const ov = ctx.createLinearGradient(0, 0, 0, 512);
            ov.addColorStop(0, 'rgba(10, 18, 24, 0.28)');
            ov.addColorStop(0.65, 'rgba(10, 18, 24, 0.15)');
            ov.addColorStop(1, 'rgba(10, 18, 24, 0.88)');
            ctx.fillStyle = ov;
            ctx.fillRect(0, 0, 512, 512);

            ctx.strokeStyle = accentHex;
            ctx.lineWidth = 6;
            ctx.stroke();

            ctx.fillStyle = '#FFF4D0';
            ctx.font = 'bold 20px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title.slice(0, 26), 256, 440);

            ctx.restore();
            tex.needsUpdate = true;
          } catch {
            // fallback gracefully
          }
        };
        img.src = posterUrl;
      }
      return tex;
    };

    const hqMediaDiscTexture = createLiveMediaScreenTexture(
      PUBLIC_BRAND_MEDIA.showreel2023.title,
      PUBLIC_BRAND_MEDIA.showreel2023.posterUrl,
      '#D4AF37'
    );
    extraDisposables.push(hqMediaDiscTexture);

    const sharedMediaScreenMat = new THREE.MeshPhysicalMaterial({
      map: hqMediaDiscTexture,
      emissive: new THREE.Color(0xFFF4D0),
      emissiveMap: hqMediaDiscTexture,
      emissiveIntensity: 0.42,
      roughness: 0.16,
      metalness: 0.15,
      clearcoat: 0.7,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    extraDisposables.push(sharedMediaScreenMat);

    const pulseBeads: {
      mesh: THREE.Mesh;
      curve: THREE.Curve<THREE.Vector3>;
      speed: number;
      offset: number;
    }[] = [];

    const cardiacTubes: {
      uniforms: CardiacConnectorUniforms;
      nodeA: string;
      nodeB: string;
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
      sphereTag: 'hq' | 'cde',
      coreColour: string
    ) => {
      const root = new THREE.Group();
      root.position.copy(center);

      const shellGroup = new THREE.Group();
      const isHq = sphereTag === 'hq';

      const backShellMat = sharedBackOpticalGlassMat;
      const frontShellMat = sharedOpticalGlassMat;

      // Render Order per Directive 04:
      // Inner geometry (1) -> Back faces of the shell (2) -> Internal media surfaces (3) -> Front face of the shell (4)
      const innerSilverCoreMesh = new THREE.Mesh(sharedInnerSilverCoreGeo, sharedInnerSilverEnvelopeMat);
      innerSilverCoreMesh.renderOrder = 1;
      shellGroup.add(innerSilverCoreMesh);

      const backShellMesh = new THREE.Mesh(sharedShellGeo, backShellMat);
      backShellMesh.renderOrder = 2;
      shellGroup.add(backShellMesh);

      // 3. Recessed Media Portal Aperture Rim & Internal Media Surface (Directive 04: Translucent 3D media containers)
      const portalRimMesh = new THREE.Mesh(sharedPortalRimGeo, sharedBrushedSilverCoreMat);
      portalRimMesh.rotation.set(0.18, -0.24, 0.08);
      shellGroup.add(portalRimMesh);

      const mediaLensGeo = new THREE.CircleGeometry(6.2 * 0.84, 64);
      const mediaLensMesh = new THREE.Mesh(mediaLensGeo, sharedMediaScreenMat);
      mediaLensMesh.name = `${sphereTag}-media-lens`;
      mediaLensMesh.rotation.set(0.18, -0.24, 0.08);
      mediaLensMesh.renderOrder = 3;
      shellGroup.add(mediaLensMesh);

      const frontShellMesh = new THREE.Mesh(sharedShellGeo, frontShellMat);
      frontShellMesh.renderOrder = 4;
      shellGroup.add(frontShellMesh);

      // Interior Planetary Dome Constellation / Hex Horizon Grid (visible when camera.radius < 8.2u)
      const domeGridGroup = new THREE.Group();
      const domeWireGeo = new THREE.IcosahedronGeometry(5.95, 2);
      const domeEdges = new THREE.EdgesGeometry(domeWireGeo);
      const domeGridMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xB4DDFF),
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const domeGridLines = new THREE.LineSegments(domeEdges, domeGridMat);
      domeGridGroup.add(domeGridLines);
      shellGroup.add(domeGridGroup);

      // -----------------------------------------------------------------------
      // SEHLY ORBITAL CAGE ATTENTION NODES (gold_node r = 0.055R in regenerate_starter_meshes.py)
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
            : sat.kind === 'ice'
            ? sharedCoolIceNodeMat
            : sharedBrushedSilverCoreMat;
        const satMesh = new THREE.Mesh(sharedUnitSphereGeo, satMat);
        satMesh.position.set(...sat.pos);
        satMesh.scale.setScalar(sat.r);
        perimeterDropletsGroup.add(satMesh);
      });

      shellGroup.add(perimeterDropletsGroup);
      root.add(shellGroup);

      // Contained Multi-Layer Galaxy Dust with GPU Bokeh
      const galaxy = buildLiquidGlassGalaxySphere(root, sphereTag, isSoftwareGl);

      // 420 Contained Spiral Shell Particles (strictly inside r = 5.45u < 6.2u)
      const spiralCount = 420;
      const spiralPos = new Float32Array(spiralCount * 3);
      const spiralPhases = new Float32Array(spiralCount);
      for (let sp = 0; sp < spiralCount; sp++) {
        const u = sp / spiralCount;
        const theta = sp * 2.3999632;
        const y = 1 - u * 2;
        const rSlice = Math.sqrt(Math.max(0, 1 - y * y));
        const shellR = 5.05 + (sp % 5) * 0.04;
        spiralPos[sp * 3] = Math.cos(theta) * rSlice * shellR;
        spiralPos[sp * 3 + 1] = y * shellR;
        spiralPos[sp * 3 + 2] = Math.sin(theta) * rSlice * shellR;
        spiralPhases[sp] = (sp * 0.53) % (Math.PI * 2);
      }
      const spiralBasePos = new Float32Array(spiralPos);
      const spiralGeo = new THREE.BufferGeometry();
      const spiralPosAttr = new THREE.BufferAttribute(spiralPos, 3);
      spiralGeo.setAttribute('position', spiralPosAttr);
      const spiralMat = new THREE.PointsMaterial({
        color: new THREE.Color(isHq ? '#B4DDFF' : '#D4AF37'),
        size: 0.055,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const spiralPoints = new THREE.Points(spiralGeo, spiralMat);
      shellGroup.add(spiralPoints);

      const iceWireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xB4DDFF),
        transparent: true,
        opacity: 0.28,
      });
      const goldRimMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xD4AF37),
        transparent: true,
        opacity: 0.48,
      });

      // 4. Three Precision Orbital Rings / Cage (regenerate_starter_meshes.py: equator, meridian_a rotz(pi/2), meridian_b rotz(pi/3))
      // Plus Inner Brushed-Silver Core Latitude/Longitude Filaments (idle_9c4b74dd.svg)
      const orbitalRingsGroup = new THREE.Group();
      const sehlyOrbitalCageSpecs = [
        // Equator ring (R = 1.015 * 6.2 = 6.293u)
        { rx: 6.2 * 1.015, rotX: Math.PI / 2 - 0.18, rotY: 0.12, rotZ: 0, isCageTorus: true, mat: goldRimMat },
        // Meridian A (rotz(pi/2))
        { rx: 6.2 * 1.015, rotX: 0.22, rotY: 0.48, rotZ: Math.PI / 2, isCageTorus: true, mat: goldRimMat },
        // Meridian B (rotz(pi/3))
        { rx: 6.2 * 1.015, rotX: -0.28, rotY: -0.52, rotZ: Math.PI / 3, isCageTorus: true, mat: goldRimMat },
        // Inner Core Ice Filament Rings (0.82R = 5.084u)
        { rx: 6.2 * 0.82, rotX: Math.PI / 2, rotY: 0, rotZ: 0, isCageTorus: false, mat: iceWireMat },
        { rx: 6.2 * 0.82, rotX: 0, rotY: Math.PI / 4, rotZ: 0, isCageTorus: false, mat: iceWireMat },
      ];
      sehlyOrbitalCageSpecs.forEach((cfg) => {
        const { points: closedLoopPts } = buildClosedOrbitalLoopPoints(cfg.rx, cfg.rx, 96);
        const geo = new THREE.BufferGeometry().setFromPoints(closedLoopPts);
        const line = new THREE.LineLoop(geo, cfg.mat);
        line.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
        orbitalRingsGroup.add(line);

        if (cfg.isCageTorus) {
          const bronzeCageRing = new THREE.Mesh(sharedOuterRibTorusGeo, sharedGoldRibbedMat);
          bronzeCageRing.rotation.set(cfg.rotX, cfg.rotY, cfg.rotZ);
          orbitalRingsGroup.add(bronzeCageRing);
        }
      });
      shellGroup.add(orbitalRingsGroup);

      // OBJ-00: Central Sehly Brushed Silver & Liquid Glass Core Assembly at [0, 0, 0]
      const coreGroup = new THREE.Group();
      const coreLocalPos = new THREE.Vector3(0, 0, 0);
      coreGroup.position.copy(coreLocalPos);

      const coreCrystalMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#BCC9D4'),
        emissive: new THREE.Color(coreColour),
        emissiveIntensity: 0.45,
        roughness: 0.24,
        metalness: 0.94,
        bumpMap: goldRibbedBumpMap,
        bumpScale: 0.015,
      });
      const innerBrushedCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.54, 48, 48),
        coreCrystalMat
      );
      coreGroup.add(innerBrushedCore);

      const outerCrystalBubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 48, 48),
        sharedCrystalGlassBubbleMat
      );
      outerCrystalBubble.renderOrder = 3;
      coreGroup.add(outerCrystalBubble);

      // Three miniature precision bronze/gold orbital rings around the central core
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
      coreGroup.add(coreHaloMesh);

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
        sublabel: sphereTag === 'hq' ? 'Orchestrator' : 'NOJARA',
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
        frontShellMat,
        backShellMat,
        domeGridMat,
        coreGroup,
        coreCrystalMat,
        galaxy,
        spiralPosAttr,
        spiralBasePos,
        spiralPhases,
      };
    };

    /**
     * Sehly / Cerebro 39 Pinned 3D Node Assemblies (regenerate_starter_meshes.py & Master Guidelines Page 5):
     * Every station, dimension, subdomain, and project node uses the coherent Sehly material family:
     * - Brushed Silver Core (#BCC9D4, metalness 0.94, roughness 0.28)
     * - Refractive Liquid Glass Shell (#142632 / #B4DDFF ice rim, transmission 0.96, ior 1.52)
     * - Precision Bronze/Gold Orbital Rings (#8C6A45 / #D4AF37, metalness 0.85, roughness 0.18)
     * - Gold & Cool Ice Attention Nodes (#D4AF37 / #B4DDFF)
     * - Portrait Medallion / Optical Media Portal Rim (#182834 glass disk + #BCC9D4 / #D4AF37 bezel)
     */
    const buildSculpturalNodeArchetype = (
      canonicalId: string,
      nodeType: AnchoredLabel2D['nodeType'],
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
        emissiveIntensity: 0.48,
        roughness: 0.14,
        metalness: 0.95,
      });
      emissiveMats.push(accentEmissiveMat);

      let objectCode = `OBJ-${String(pulseIndex + 1).padStart(2, '0')}`;
      let sculptureTag = 'Sehly Sphere Assembly';

      if (idLower === 'projects' || idLower === 'strategy') {
        // OBJ-01: Sehly Sphere Assembly (Brushed Silver Core 0.82R + Refractive Glass Shell 1.0R + 3-Ring Bronze Orbital Cage)
        objectCode = idLower === 'projects' ? 'OBJ-01 · ST-01' : 'OBJ-01 · DIM-01';
        sculptureTag = 'Sehly Sphere Assembly';

        const innerSilverCore = new THREE.Mesh(sharedUnitSphereGeo, sharedBrushedSilverCoreMat);
        innerSilverCore.scale.setScalar(0.54);
        group.add(innerSilverCore);

        const outerLiquidShell = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        outerLiquidShell.scale.setScalar(0.66);
        outerLiquidShell.renderOrder = 3;
        group.add(outerLiquidShell);

        const cageRingA = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.018, 16, 64),
          sharedGoldRibbedMat
        );
        cageRingA.rotation.set(Math.PI / 2.2, 0.25, 0);
        group.add(cageRingA);

        const cageRingB = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.016, 16, 64),
          sharedPolishedGoldMat
        );
        cageRingB.rotation.set(0.28, -0.35, Math.PI / 3);
        group.add(cageRingB);

        const goldNode = new THREE.Mesh(sharedSatBeadGeo, accentEmissiveMat);
        goldNode.position.set(0.58, 0.34, 0.28);
        group.add(goldNode);
      } else if (idLower === 'media' || idLower === 'production') {
        // OBJ-02: Media Portal Rim Assembly (media-portal-rim.glb archetype: Recessed Optical Portal + Brushed Silver Bezel)
        objectCode = idLower === 'media' ? 'OBJ-02 · ST-05' : 'OBJ-02 · DIM-02';
        sculptureTag = 'Optical Media Portal';

        const portalGlassCore = new THREE.Mesh(sharedUnitSphereGeo, sharedPortalDarkGlassMat);
        portalGlassCore.scale.setScalar(0.58);
        portalGlassCore.renderOrder = 1;
        group.add(portalGlassCore);

        // Internal media surface disk inside the media station portal
        const nodeMediaDisc = new THREE.Mesh(
          new THREE.CircleGeometry(0.54, 32),
          sharedMediaScreenMat
        );
        nodeMediaDisc.rotation.set(0.18, -0.22, 0.12);
        nodeMediaDisc.renderOrder = 2;
        group.add(nodeMediaDisc);

        const outerGlassShell = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        outerGlassShell.scale.setScalar(0.68);
        outerGlassShell.renderOrder = 4;
        group.add(outerGlassShell);

        const portalApertureRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.032, 20, 64),
          sharedBrushedSilverCoreMat
        );
        portalApertureRim.rotation.set(0.18, -0.22, 0.12);
        group.add(portalApertureRim);

        const goldOrbit = new THREE.Mesh(
          new THREE.TorusGeometry(0.78, 0.014, 16, 64),
          sharedPolishedGoldMat
        );
        goldOrbit.rotation.set(-0.48, -0.32, 0.25);
        group.add(goldOrbit);

        const trimBead = new THREE.Mesh(sharedSatBeadGeo, accentEmissiveMat);
        trimBead.position.set(-0.56, -0.42, 0.34);
        group.add(trimBead);
      } else if (idLower === 'people' || idLower === 'talent') {
        // OBJ-03: Portrait Medallion Assembly (portrait-medallion.glb archetype: Gold Ring Bezel + Dark Glass Lens + Silver Core)
        objectCode = idLower === 'people' ? 'OBJ-05 · ST-03' : 'OBJ-04 · DIM-03';
        sculptureTag = 'Portrait Medallion';

        const silverCore = new THREE.Mesh(sharedUnitSphereGeo, sharedBrushedSilverCoreMat);
        silverCore.scale.setScalar(0.52);
        group.add(silverCore);

        const medallionGlass = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        medallionGlass.scale.setScalar(0.64);
        medallionGlass.renderOrder = 3;
        group.add(medallionGlass);

        const goldBezelRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.034, 20, 64),
          sharedPolishedGoldMat
        );
        goldBezelRing.rotation.set(0.24, -0.28, -0.14);
        group.add(goldBezelRing);

        const meridianRail = new THREE.Mesh(
          new THREE.TorusGeometry(0.76, 0.014, 16, 64),
          sharedGoldRibbedMat
        );
        meridianRail.rotation.set(1.12, 0.42, -0.35);
        group.add(meridianRail);

        const accentBead = new THREE.Mesh(sharedPlanetBeadGeo, accentEmissiveMat);
        accentBead.position.set(0.52, -0.38, 0.35);
        group.add(accentBead);
      } else if (idLower === 'tasks' || idLower === 'files' || idLower === 'mediatech') {
        // OBJ-04: Brushed Silver Core + Cool Ice Filament Ring + Bronze Meridian Rail
        objectCode =
          idLower === 'tasks'
            ? 'OBJ-04 · ST-02'
            : idLower === 'files'
            ? 'OBJ-03 · ST-04'
            : 'OBJ-05 · DIM-04';
        sculptureTag = 'Brushed Silver & Bronze Cage';

        const brushedCore = new THREE.Mesh(sharedUnitSphereGeo, sharedBrushedSilverCoreMat);
        brushedCore.scale.setScalar(0.56);
        group.add(brushedCore);

        const liquidShell = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        liquidShell.scale.setScalar(0.68);
        liquidShell.renderOrder = 3;
        group.add(liquidShell);

        const bronzeRail = new THREE.Mesh(
          new THREE.TorusGeometry(0.74, 0.02, 18, 64),
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
        // Project & Subdomain Nodes: Coherent Sehly Liquid Glass + Brushed Silver Core + Precision Gold/Bronze Orbital Ring
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
        sculptureTag = 'Liquid Glass & Silver Node';

        const innerSilver = new THREE.Mesh(sharedUnitSphereGeo, sharedBrushedSilverCoreMat);
        innerSilver.scale.setScalar(0.48);
        group.add(innerSilver);

        const outerGlass = new THREE.Mesh(sharedUnitSphereGeo, sharedCrystalGlassBubbleMat);
        outerGlass.scale.setScalar(0.62);
        outerGlass.renderOrder = 3;
        group.add(outerGlass);

        const orbitalRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.68, 0.016, 16, 56),
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
        opacity: 0.28,
      });
      const haloMesh = new THREE.Mesh(sharedHaloGeo, haloMat);
      haloMesh.scale.setScalar(1.15);
      group.add(haloMesh);

      return { group, haloMesh, emissiveMats, objectCode, sculptureTag };
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

      const hitProxy = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 16, 16),
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
      midCtrl.y += 0.38;
      clampInsideSphere(midCtrl, 4.35);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        midCtrl,
        posVec
      );
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
      spoke.handle.uniforms.uDimFactor.value = nodeType === 'project' ? 0.55 : 0.85;
      parentGroup.add(spoke.mesh);
      extraDisposables.push({ dispose: spoke.dispose });
      // Spoke dimming is owned by nodeRegistry.connectorUniforms (avoid fighting cardiacTubes).

      const beadMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 12),
        sharedPolishedGoldMat
      );
      parentGroup.add(beadMesh);
      pulseBeads.push({
        mesh: beadMesh,
        curve,
        speed: 0.16 + (pulseIndex % 5) * 0.03,
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
        sublabel: sublabel || undefined,
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
      parentGroup.add(tube.mesh);
      extraDisposables.push({ dispose: tube.dispose });
      cardiacTubes.push({
        uniforms: tube.handle.uniforms,
        nodeA: nodeIdA,
        nodeB: nodeIdB,
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
      portalCountLabel: projectPortalCountLabel(PROJECTS_DATA.length),
    };
    masterRootRef.current = hqAssembly.root;

    // Master-sphere inner project portals — count derived from source data (not "6 Suns").
    {
      const portals = buildMasterProjectPortals(PROJECTS_DATA);
      const portalGeo = new THREE.SphereGeometry(1, 24, 16);
      extraDisposables.push(portalGeo);
      portals.forEach((portal) => {
        const mat = createMatLiquidGlassShell({ softwareGl: isSoftwareGl });
        const mesh = new THREE.Mesh(portalGeo, mat);
        mesh.name = `master-portal-${portal.projectId}`;
        mesh.scale.setScalar(portal.radius);
        mesh.position.set(
          portal.localOffset[0],
          portal.localOffset[1],
          portal.localOffset[2]
        );
        mesh.userData = {
          introInteractive: true,
          projectId: portal.projectId,
          nodeId: portal.projectId,
          sphereTag: 'hq',
          masterPortal: true,
          labelEn: portal.titleEn,
        };
        hqAssembly.shellGroup.add(mesh);
        extraDisposables.push(mat);
      });

      // CDE as discoverable domain + Campaign/About as explicit destinations (inside master).
      const domainMat = createMatLiquidGlassShell({ softwareGl: isSoftwareGl });
      const domainMesh = new THREE.Mesh(portalGeo, domainMat);
      domainMesh.name = 'master-domain-cde';
      domainMesh.scale.setScalar(DOMAIN_CDE.radius);
      domainMesh.position.set(...DOMAIN_CDE.localOffset);
      domainMesh.userData = {
        introInteractive: true,
        nodeId: 'cde',
        sphereTag: 'cde',
        masterDomain: true,
        labelEn: DOMAIN_CDE.labelEn,
      };
      hqAssembly.shellGroup.add(domainMesh);
      extraDisposables.push(domainMat);

      for (const dest of MASTER_DESTINATIONS) {
        const dMat = createMatLiquidGlassShell({ softwareGl: isSoftwareGl });
        const dMesh = new THREE.Mesh(portalGeo, dMat);
        dMesh.name = `master-dest-${dest.id}`;
        dMesh.scale.setScalar(dest.radius);
        dMesh.position.set(...dest.localOffset);
        dMesh.userData = {
          introInteractive: true,
          nodeId: dest.fromPeer,
          sphereTag: dest.fromPeer,
          masterDestination: true,
          labelEn: dest.labelEn,
        };
        hqAssembly.shellGroup.add(dMesh);
        extraDisposables.push(dMat);
      }
    }

    // Always-on ambient plates keep every connected shell lit.
    // These local paths are shared ambient plates (same bytes historically) — not
    // project-credit masters. Verified project bindings live in projectWorldManifest.
    const ALWAYS_ON_SPHERE_MEDIA: Record<string, string> = {
      hq: '/media/sphere-showreel-fallback.mp4',
      cde: '/assets/media/young-human.mp4',
      'campaign-os': '/assets/media/laliga.mp4',
      'about-us': '/assets/media/showreel.mp4',
    };
    const mountAlwaysOnMedia = (
      parent: THREE.Object3D,
      sphereId: string,
      shellBandRadius: number
    ) => {
      try {
        const hqAsset = sphereId === 'hq' ? getSphereTextureAsset() : undefined;
        const handle = mountSphereVideoTexture({
          parent,
          asset: hqAsset,
          sourceUrl: ALWAYS_ON_SPHERE_MEDIA[sphereId],
          posterUrl:
            hqAsset?.poster ||
            (sphereId === 'hq' ? '/media/riyadh-season-launch-still.jpg' : null),
          portalRadius: shellBandRadius * 0.85,
          shellBandRadius,
          wrapRadius: shellBandRadius * 1.002,
          namePrefix: `${sphereId}-always`,
        });
        extraDisposables.push({
          dispose: () => {
            handle.dispose();
          },
        });
      } catch (err) {
        console.warn(`[CosmographCanvas] ${sphereId} sphere video failed to mount`, err);
        // Ice fallback plate is applied inside mountSphereVideoTexture on media errors;
        // if mount itself throws, leave glass shell — never invent alternate materials.
      }
    };
    mountAlwaysOnMedia(hqAssembly.shellGroup, 'hq', 5.92);

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
    mountAlwaysOnMedia(cdeAssembly.shellGroup, 'cde', 5.92);
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

    // Peer Campaign OS / About Us full spheres are migration inputs only.
    // Workspace navigation uses master-sphere destinations (MASTER_DESTINATIONS).
    // Intro film may still present the legacy dual/peer layout.
    if (introBridge.enabled) {
      for (const node of SPHERE_NETWORK) {
        if (node.id === 'hq' || node.id === 'cde') continue;
        const sat = new THREE.Group();
        sat.name = `sphere-${node.id}`;
        sat.position.set(node.center[0], node.center[1], node.center[2]);
        const satShell = new THREE.Group();
        satShell.name = `${node.id}-shell`;
        const satGeo = new THREE.SphereGeometry(node.radius, 48, 32);
        const backShell = new THREE.Mesh(satGeo, sharedBackOpticalGlassMat);
        backShell.renderOrder = 2;
        satShell.add(backShell);
        const frontShell = new THREE.Mesh(satGeo, sharedOpticalGlassMat);
        frontShell.renderOrder = 4;
        satShell.add(frontShell);
        sat.add(satShell);
        scene.add(sat);
        extraDisposables.push(satGeo);
        mountAlwaysOnMedia(satShell, node.id, node.radius * 0.95);
        const satBridge = new THREE.CatmullRomCurve3([
          HQ_CENTER.clone(),
          new THREE.Vector3(
            node.center[0] * 0.45,
            node.center[1] + 4.5,
            node.center[2] * 0.45
          ),
          new THREE.Vector3(node.center[0], node.center[1], node.center[2]),
        ]);
        const satTube = createCardiacConnectorTube({
          curve: satBridge,
          tubularSegments: 64,
          radius: 0.045,
          radialSegments: 8,
          color: 0x65acff,
          pulseColor: 0xfff1d4,
          speed: 0.34,
        });
        scene.add(satTube.mesh);
        extraDisposables.push({ dispose: satTube.dispose });
        cardiacTubes.push({
          uniforms: satTube.handle.uniforms,
          nodeA: 'hq',
          nodeB: node.id,
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
          offset: 0.15,
        });
      }
    }

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
      targetAssembly.root.add(childTube.mesh);
      extraDisposables.push({ dispose: childTube.dispose });
      cardiacTubes.push({
        uniforms: childTube.handle.uniforms,
        nodeA: dom.parentNodeId || 'hq',
        nodeB: dom.id,
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
      targetAssembly.root.add(childPulseBead);
      pulseBeads.push({
        mesh: childPulseBead,
        curve: childCardiacCurve,
        speed: 0.18,
        offset: (dIdx * 0.25) % 1,
      });
    });

    // Inter-Sphere CatmullRomCurve3 Cardiac Spline connecting HQ [0,0,0] and CDE [38,4,-22]
    const bridgeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(6.2, 0.8, -2.5),
      new THREE.Vector3(19.0, 5.8, -11.0),
      new THREE.Vector3(31.8, 3.2, -19.5),
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
      nodeA: 'hq',
      nodeB: 'cde',
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
    scene.add(cometLine);

    const cometWeaveGeo = new THREE.BufferGeometry();
    cometWeaveGeo.setAttribute('position', new THREE.BufferAttribute(cometWeavePositions, 3));
    const cometWeaveMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0xD4AF37),
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

      const drawBaseCard = () => {
        if (!ctx) return;
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
        ctx.font = 'bold 14px "Space Grotesk", sans-serif';
        ctx.fillText(tile.title.slice(0, 32), 18, 96);
        ctx.fillStyle = '#BDCBD3';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(tile.subtitle.slice(0, 38), 18, 126);
      };

      drawBaseCard();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;

      if (tile.posterUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (!ctx) return;
          try {
            ctx.drawImage(img, 0, 0, 320, 180);
            ctx.fillStyle = 'rgba(16, 29, 39, 0.55)';
            ctx.fillRect(0, 0, 320, 38);
            ctx.fillRect(0, 140, 320, 40);
            ctx.strokeStyle = tile.accentHex;
            ctx.lineWidth = 3;
            ctx.strokeRect(4, 4, 312, 172);
            ctx.fillStyle = tile.accentHex;
            ctx.font = 'bold 12px "JetBrains Mono", monospace';
            ctx.fillText(`${tile.kind.toUpperCase()} · #${String(tile.index + 1).padStart(2, '0')}`, 16, 26);
            ctx.fillStyle = '#F2F6F8';
            ctx.font = 'bold 13px "Space Grotesk", sans-serif';
            ctx.fillText(tile.title.slice(0, 32), 16, 166);
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
        // Intro: both HQ and CDE inner spheres are tappable for media focus.
        const sphereOk =
          introBridge.enabled || entry.sphere === activeSphereNow;
        if (entry.groupMesh && sphereOk) {
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

    const recordUserInput = () => {
      stateRef.current.lastUserInputTime = performance.now();
    };

    const onWheel = (e: WheelEvent) => {
      if (!container.contains(e.target as Node)) return;
      e.preventDefault();
      recordUserInput();
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
    domEl.addEventListener('pointerdown', recordUserInput);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', recordUserInput);

    const onResize = () => {
      if (!container || contextLost) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const comp = readHomeComposition(container);
      if (!introBridge.enabled) {
        executeAtomicReframe(camera, w, h, comp.occludedBottomPx);
      } else {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
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
    // Initial atomic frame composition
    onResize();
    introBridge.attach({
      scene,
      camera,
      renderer,
      hqShell: hqAssembly.shellGroup,
      cdeShell: cdeAssembly.shellGroup,
      hqCore: hqAssembly.coreGroup,
      cdeCore: cdeAssembly.coreGroup,
    });

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
      const elapsedTotal = introBridge.enabled ? introBridge.time() : clock.getElapsedTime();
      const now = performance.now();
      const s = stateRef.current;

      if (introBridge.enabled) s.audioRms = introBridge.audioRms(elapsedTotal);
      glassUniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
      // Intro: damp soundtrack RMS into glass so caustics don't strobe over the video plate.
      const rmsTarget = introBridge.enabled ? s.audioRms * 0.18 : s.audioRms;
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
      // Intro: gentle breath only — large RMS-driven scale fights the inner video meshes.
      const breathScale = s.reducedMotion
        ? 1.0
        : introBridge.enabled
          ? 1.0 + 0.0025 * breathPhase
          : 1.0 + 0.006 * breathPhase + liveRms * 0.012;
      hqAssembly.shellGroup.scale.setScalar(breathScale);
      cdeAssembly.shellGroup.scale.setScalar(breathScale);

      // Audio-Reactive Core Crystal Pulse — damp hard during camera flight to stop lighting flicker
      const motionQuiet = s.flightActive ? 0.18 : 1.0;
      const corePulseScale = 1.0 + liveRms * 0.34 * motionQuiet;
      hqAssembly.coreGroup.scale.setScalar(corePulseScale);
      cdeAssembly.coreGroup.scale.setScalar(corePulseScale);
      const coreEmissive = 1.2 + liveRms * 0.55 * motionQuiet;
      hqAssembly.coreCrystalMat.emissiveIntensity = coreEmissive;
      cdeAssembly.coreCrystalMat.emissiveIntensity = coreEmissive;

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

      if (!introBridge.enabled) {
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

      } else {
        introBridge.applyCamera(camera, s, elapsedTotal);
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
      // Dome transition is shader-driven (uInteriorDome); keep MAT shell opacity intact.
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

      // Blueprint V2.0 v2 Fix #3 & #7: Bounded non-accumulating particle drift with per-frame reducedMotion
      updateBoundedParticleDrift(
        hqAssembly.spiralPosAttr,
        hqAssembly.spiralBasePos,
        hqAssembly.spiralPhases,
        elapsedTotal,
        s.reducedMotion
      );
      updateBoundedParticleDrift(
        cdeAssembly.spiralPosAttr,
        cdeAssembly.spiralBasePos,
        cdeAssembly.spiralPhases,
        elapsedTotal,
        s.reducedMotion
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
        const activeCenter = s.activeSphere === 'cde' ? CDE_CENTER : HQ_CENTER;
        mediaTubeGroup.position.copy(activeCenter);

        if (tubeProp?.projectId && tubeProp.projectId !== mountedTubeProjectId) {
          mountedTubeProjectId = tubeProp.projectId;
          const freshItems = buildProjectMediaTubeItems(mountedTubeProjectId);
          for (let ti = 0; ti < mediaTubeTileMeshes.length; ti++) {
            const item = freshItems[ti];
            if (item) {
              const mesh = mediaTubeTileMeshes[ti];
              const oldMat = mesh.material as THREE.MeshBasicMaterial;
              oldMat.map?.dispose();
              oldMat.dispose();
              mesh.material = new THREE.MeshBasicMaterial({
                map: buildTileCanvasTexture(item),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.94,
              });
            }
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
          const boost = b > 0.85 && activeEntry ? 0.35 : 0;
          entry.connectorUniforms.uDimFactor.value = THREE.MathUtils.damp(
            entry.connectorUniforms.uDimFactor.value,
            baseDim * b + boost,
            9.5,
            dt
          );
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

      // Update Cardiac Heartbeat Tubes — time, audio coupling, connection dimming
      for (let c = 0; c < cardiacTubes.length; c++) {
        const ct = cardiacTubes[c];
        ct.uniforms.uTime.value = s.reducedMotion ? 0 : elapsedTotal;
        ct.uniforms.uAudioRms.value = liveRms;
        let tubeDim = 1.0;
        if (activeEntry) {
          const connected =
            activeEntry.canonicalId === ct.nodeA ||
            activeEntry.canonicalId === ct.nodeB ||
            activeEntry.canonicalId === 'projects' ||
            activeEntry.connectedIds.has(ct.nodeA) ||
            activeEntry.connectedIds.has(ct.nodeB);
          tubeDim = connected ? 1.0 : 0.22;
        }
        ct.uniforms.uDimFactor.value = THREE.MathUtils.damp(
          ct.uniforms.uDimFactor.value,
          tubeDim,
          9.5,
          dt
        );
      }

      introBridge.update?.(elapsedTotal);

      // Align camera optical center to unobstructed centerSafeRect when panels are open.
      // EffectComposer + UnrealBloomPass mishandles PerspectiveCamera.setViewOffset and
      // paints a solid clear-color slab over the right/bottom of the canvas (visible
      // when the Media/Projects inspector is open on iPad). Skip viewOffset while composer
      // is active; labels still clamp into the safe rect below.
      const curW = domEl.clientWidth || window.innerWidth;
      const curH = domEl.clientHeight || window.innerHeight;
      if (unobstructedRectRef.current && curW > 0 && curH > 0) {
        const sub = computeSubFrustumOffset(curW, curH, unobstructedRectRef.current);
        const wantsOffset = Math.abs(sub.offsetX) > 2 || Math.abs(sub.offsetY) > 2;
        if (composer || !wantsOffset) {
          camera.clearViewOffset();
        } else {
          camera.setViewOffset(
            sub.fullWidth,
            sub.fullHeight,
            sub.offsetX,
            sub.offsetY,
            sub.width,
            sub.height
          );
        }
      } else {
        camera.clearViewOffset();
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

        projected.sort((a, b) => a.y - b.y);
        // Responsive motion-graph packing — tighter on phone/tablet so chips don't collide
        const isPhone = width < 768;
        const isTablet = width >= 768 && width < 1100;
        const minLabelGapY = isPhone ? 30 : isTablet ? 38 : 46;
        const minLabelGapX = isPhone ? 98 : isTablet ? 128 : 168;
        const safe = unobstructedRectRef.current;
        const dockClear = isPhone ? Math.max(128, height * 0.22) : isTablet ? 112 : 120;
        const topClear = isPhone ? Math.max(56, height * 0.08) : 72;
        const labelWidthReserve = isPhone ? Math.min(132, width * 0.42) : isTablet ? 160 : 195;
        const minX = safe ? Math.max(8, safe.x + 6) : isPhone ? 6 : 20;
        const maxX = safe
          ? Math.max(minX + 88, safe.x + safe.w - labelWidthReserve)
          : Math.max(minX + 88, width - labelWidthReserve);
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
            projected[i].x = THREE.MathUtils.clamp(projected[i].x, minX, maxX);
            projected[i].y = THREE.MathUtils.clamp(projected[i].y, minY, maxY);
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
      domEl.removeEventListener('pointerdown', recordUserInput);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', recordUserInput);
      window.removeEventListener('resize', onResize);
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
      sharedOuterRibTorusGeo.dispose();
      sharedHaloGeo.dispose();
      sharedPlanetBeadGeo.dispose();
      sharedSatBeadGeo.dispose();
      extraDisposables.forEach((d) => d.dispose());
      projectWorldHostRef.current?.dispose();
      projectWorldHostRef.current = null;
      masterRootRef.current = null;
      introBridge.detach();
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

  if (introBridge.enabled) {
    return (
      <div
        ref={mountRef}
        className="source-world"
        data-testid="cosmograph-canvas"
        data-webgl-status={webglStatus}
        data-webgl-reason={webglReason}
        role="img"
        tabIndex={0}
        aria-label="Cerebro WebGL spatial scene. HQ and CDE dual-sphere intro."
      />
    );
  }

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
            : 'CDE containment sphere with culture and design dimensions.'
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
                  {activeSphere === 'hq' ? 'HQ Spatial Map' : 'CDE Universe Map'}
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
                {PROJECTS_DATA.map((p) => (
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
              const isPrimaryStation =
                item.nodeType === 'station' ||
                item.nodeType === 'dimension' ||
                item.nodeType === 'core' ||
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
            const isPrimaryStation =
              item.nodeType === 'station' ||
              item.nodeType === 'dimension' ||
              item.nodeType === 'core' ||
              (item.nodeType === 'project' && (item.isFocused || isAttentionProject));
            const x = Math.round(item.x);
            const y = Math.round(item.y);
            // Cover-post: hide cold project chips; keep stations + attention only
            if (!item.isFocused && !isPrimaryStation) {
              return null;
            }
            return (
              <button
                key={`${activeSphere}-${item.id}-${item.nodeType}`}
                type="button"
                data-testid={`sphere-label-${item.id}`}
                data-object-code={item.objectCode}
                data-chrome-state={item.isFocused ? 'active' : 'cold'}
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
                  borderColor: item.isFocused
                    ? 'var(--token-focus, #65ACFF)'
                    : 'color-mix(in srgb, var(--token-active-ice) 36%, transparent)',
                }}
                className={`cerebro-focus-label cerebro-infograph-label fixed top-0 left-0 min-h-[44px] pointer-events-auto cursor-pointer px-3.5 py-1.5 rounded-full border flex items-center gap-2.5 text-left group hover:border-[color:var(--token-focus,#65ACFF)] ${
                  item.isFocused
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
                    {item.sublabel && (
                      <span className="ig-sub font-sans text-[#D0DCE3]">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </span>
              </button>
            );
          })}

          {captionBubble && (
            <div
              className="cerebro-infograph-caption fixed left-1/2 top-[16%] -translate-x-1/2 z-20 px-4 py-2.5 rounded-2xl pointer-events-none"
              role="status"
              aria-live="polite"
              data-testid="caption-bubble"
            >
              <div className="ig-shell">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#D4AF37' }}
                  />
                  <span className="font-mono text-[12px] uppercase tracking-wider text-[#B4DDFF]">
                    Cerebro
                  </span>
                </div>
                <p className="font-sans text-xs md:text-sm text-[#F2F6F8] leading-snug">
                  {captionBubble}
                </p>
              </div>
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
                className="cj-glass-card fixed left-1/2 bottom-28 -translate-x-1/2 z-30 pointer-events-auto flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-[94vw]"
              >
                <div className="pr-2 border-r border-white/15">
                  <div className="font-mono text-[12px] text-[#D4AF37] uppercase">
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
                    className="min-h-[38px] px-2.5 py-1 rounded-lg font-mono text-xs bg-[#101622] border border-[#C5CCD6]/25 text-[#F2F6F8] hover:border-[#D4AF37] cursor-pointer"
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
                    className="min-h-[38px] px-2.5 py-1 rounded-lg font-mono text-xs bg-[#101622] border border-[#C5CCD6]/25 text-[#F2F6F8] hover:border-[#D4AF37] cursor-pointer"
                  >
                    Next Tile ›
                  </button>
                  <button
                    type="button"
                    data-cta-id="media-tube-fullview"
                    data-action-id="media.open"
                    onClick={() => onOpenMediaTubeFullView?.(focusedTile)}
                    className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-xs bg-[#D4AF37] text-[#101622] font-semibold cursor-pointer"
                  >
                    Open Full View
                  </button>
                  <button
                    type="button"
                    data-cta-id="media-tube-close"
                    data-action-id="media.close"
                    onClick={() => onCloseMediaTube?.()}
                    className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-xs bg-[#101622] border border-[#D4AF37] text-[#FFF4D0] hover:bg-[#D4AF37] hover:text-[#101622] cursor-pointer"
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
