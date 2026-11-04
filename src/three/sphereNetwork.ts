/**
 * Four live navigable spheres: HQ, CDE, Campaign OS, About Us.
 * Industry & Making / إصطمبة remains proposed (not navigable).
 * All live shells share MAT_LIQUID_GLASS_SHELL + always-on inner media cutdowns.
 */
import * as THREE from 'three';
import {
  PROJECTS_DATA,
  PEOPLE_DATA,
  RACI_MATRIX,
  REGISTER_RECORDS,
  type ProjectSummary,
} from '../data/sourceData';
import {
  computeFittedCameraDistance,
  computeSubFrustumOffset,
  GUI_CAMERA_PRESETS,
} from '../gui/cameraPresets';
import type { GuiRect } from '../gui/CollisionManager';
import { GLASS_EMISSIVE_FLOOR } from './glassFallback';

export type ConnectedSphereId = 'hq' | 'cde' | 'campaign-os' | 'about-us';

/**
 * Standardized shared MeshPhysicalMaterial preset applied uniformly across
 * all four primary spheres (HQ, CDE, Campaign OS, About Us) to eliminate
 * blown-out specular glare and keep optical refraction consistent.
 */
export interface SharedOuterShellMaterialPreset {
  id: 'MAT_LIQUID_GLASS_SHELL';
  color: string;
  transmission: number;
  roughness: number;
  metalness: number;
  ior: number;
  thickness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  specularIntensity: number;
  specularColor: string;
  attenuationColor: string;
  attenuationDistance: number;
  envMapIntensity: number;
}

export const SHARED_OUTER_SHELL_MATERIAL_PRESET: SharedOuterShellMaterialPreset = {
  id: 'MAT_LIQUID_GLASS_SHELL',
  color: '#e8f2ff',
  transmission: 0.92,
  roughness: 0.12,
  metalness: 0.0,
  ior: 1.25,
  thickness: 0.8,
  clearcoat: 0.28,
  clearcoatRoughness: 0.14,
  specularIntensity: 0.55,
  specularColor: '#B4DDFF',
  attenuationColor: '#d6e8ff',
  attenuationDistance: 60,
  envMapIntensity: 0.7,
} as const;

export function createSharedOuterShellMaterial(options?: {
  /** Flat (non-transmission) glass: software rasterizers and Apple mobile WebKit. */
  softwareGl?: boolean;
  face?: 'front' | 'back';
  side?: THREE.Side;
}): THREE.MeshPhysicalMaterial {
  const softwareGl = Boolean(options?.softwareGl);
  const face = options?.face ?? 'front';
  const side = options?.side ?? (face === 'back' ? THREE.BackSide : THREE.FrontSide);
  const attenuation =
    face === 'back'
      ? new THREE.Color(0xc4dcf5)
      : new THREE.Color(SHARED_OUTER_SHELL_MATERIAL_PRESET.attenuationColor);

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(SHARED_OUTER_SHELL_MATERIAL_PRESET.color),
    transmission: softwareGl ? 0 : SHARED_OUTER_SHELL_MATERIAL_PRESET.transmission,
    roughness: SHARED_OUTER_SHELL_MATERIAL_PRESET.roughness,
    metalness: SHARED_OUTER_SHELL_MATERIAL_PRESET.metalness,
    ior: SHARED_OUTER_SHELL_MATERIAL_PRESET.ior,
    thickness: SHARED_OUTER_SHELL_MATERIAL_PRESET.thickness,
    clearcoat: SHARED_OUTER_SHELL_MATERIAL_PRESET.clearcoat,
    clearcoatRoughness: SHARED_OUTER_SHELL_MATERIAL_PRESET.clearcoatRoughness,
    specularIntensity: SHARED_OUTER_SHELL_MATERIAL_PRESET.specularIntensity,
    specularColor: new THREE.Color(SHARED_OUTER_SHELL_MATERIAL_PRESET.specularColor),
    attenuationColor: attenuation,
    attenuationDistance: SHARED_OUTER_SHELL_MATERIAL_PRESET.attenuationDistance,
    envMapIntensity: SHARED_OUTER_SHELL_MATERIAL_PRESET.envMapIntensity,
    emissive: new THREE.Color(GLASS_EMISSIVE_FLOOR.color),
    emissiveIntensity: softwareGl
      ? GLASS_EMISSIVE_FLOOR.flatIntensity
      : GLASS_EMISSIVE_FLOOR.transmissiveIntensity,
    dispersion: softwareGl ? 0 : 0.35,
    sheen: 0,
    sheenRoughness: 1,
    transparent: true,
    opacity: softwareGl ? (face === 'back' ? 0.14 : 0.24) : face === 'back' ? 0.4 : 1,
    side,
    depthWrite: false,
  });
}

export type SphereNetworkNode = {
  id: ConnectedSphereId;
  labelEn: string;
  labelAr: string;
  center: [number, number, number];
  radius: number;
  /** Shared MeshPhysicalMaterial preset across all four spheres. */
  materialPreset:
    | 'MAT_LIQUID_GLASS_SHELL'
    | 'hq-cobalt-glass'
    | 'cde-amber-crystal'
    | 'campaign-ice'
    | 'about-gold-glass';
  outerShellMaterial: SharedOuterShellMaterialPreset;
  status: 'live' | 'connected' | 'proposed';
};

/**
 * Compact diamond so all four live shells read in one constellation overview
 * (default ~24–35mm pullback). All four spheres share SHARED_OUTER_SHELL_MATERIAL_PRESET.
 */
export const SPHERE_NETWORK: readonly SphereNetworkNode[] = [
  {
    id: 'hq',
    labelEn: 'Cerebro HQ',
    labelAr: 'مقر سيريبو',
    center: [0, 0, 0],
    radius: 6.2,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'live',
  },
  {
    id: 'cde',
    labelEn: 'CDE Universe',
    labelAr: 'عالم التصميم',
    center: [14, 2.5, -8],
    radius: 6.2,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'live',
  },
  {
    id: 'campaign-os',
    labelEn: 'Campaign OS',
    labelAr: 'نظام الحملات',
    center: [-13, 2, -7],
    radius: 5.4,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'live',
  },
  {
    id: 'about-us',
    labelEn: 'About Us',
    labelAr: 'من نحن',
    center: [8, 1.5, 12],
    radius: 5.0,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'live',
  },
] as const;

/** World-space look-at for the four-sphere constellation overview. */
export function sphereNetworkCentroid(): THREE.Vector3 {
  const acc = new THREE.Vector3();
  for (const node of SPHERE_NETWORK) {
    acc.x += node.center[0];
    acc.y += node.center[1];
    acc.z += node.center[2];
  }
  return acc.multiplyScalar(1 / SPHERE_NETWORK.length);
}

export const LIVE_SPHERE_IDS: readonly ConnectedSphereId[] = SPHERE_NETWORK.map((s) => s.id);

export const PROPOSED_FIFTH_SPHERE = {
  id: 'industry-making',
  labelEn: 'Industry & Making',
  labelAr: 'إصطمبة',
  status: 'proposed' as const,
  note: 'Proposed die-world; not implemented as a navigable sphere in this repository.',
};

export function sphereCenterVec(id: ConnectedSphereId): THREE.Vector3 {
  const node = SPHERE_NETWORK.find((s) => s.id === id);
  const c = node?.center ?? [0, 0, 0];
  return new THREE.Vector3(c[0], c[1], c[2]);
}

export function isConnectedSphereId(value: unknown): value is ConnectedSphereId {
  if (typeof value !== 'string') return false;
  return isConnectedSphereIdString(value);
}

function isConnectedSphereIdString(value: string): value is ConnectedSphereId {
  return SPHERE_NETWORK.some((s) => s.id === value);
}

/** R01 motion targets from remediation lock (seconds / ms). */
export const CAMERA_MOTION_TARGETS = {
  sphereTravelMs: { min: 1400, max: 2200, default: 1900 },
  nodeFocusMs: { min: 700, max: 1100, default: 900 },
  panelTransitionMs: 320,
  gestureLossSettleMsMax: 400,
} as const;

export function clampSphereTravelMs(distance: number): number {
  const t =
    CAMERA_MOTION_TARGETS.sphereTravelMs.min +
    Math.min(1, distance / 55) *
      (CAMERA_MOTION_TARGETS.sphereTravelMs.max - CAMERA_MOTION_TARGETS.sphereTravelMs.min);
  return Math.round(t);
}

export function clampNodeFocusMs(crossingSpheres: boolean): number {
  return crossingSpheres
    ? CAMERA_MOTION_TARGETS.sphereTravelMs.default
    : CAMERA_MOTION_TARGETS.nodeFocusMs.default;
}

export type SphereTopologyStatus =
  | 'PRIMARY_IMPLEMENTED'
  | 'CONNECTED_DESTINATION_IMPLEMENTED'
  | 'PROPOSED_NOT_IMPLEMENTED_AS_FULL_SPHERE';

export interface SphereTopologyRecord {
  id: ConnectedSphereId | 'industry-making';
  label: string;
  labelEn: string;
  labelAr: string;
  worldCenter: [number, number, number];
  shellRadiusU: number;
  materialPreset: string;
  outerShellMaterial: SharedOuterShellMaterialPreset;
  status: SphereTopologyStatus;
  lockStatus: 'locked' | 'proposed';
}

export const SPHERE_NETWORK_TOPOLOGY: Record<
  ConnectedSphereId | 'industry-making',
  SphereTopologyRecord
> = {
  hq: {
    id: 'hq',
    label: 'Cerebro HQ',
    labelEn: 'Cerebro HQ',
    labelAr: 'مقر سيريبو',
    worldCenter: [0, 0, 0],
    shellRadiusU: 6.2,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'PRIMARY_IMPLEMENTED',
    lockStatus: 'locked',
  },
  cde: {
    id: 'cde',
    label: 'CDE Universe',
    labelEn: 'CDE Universe',
    labelAr: 'عالم التصميم',
    worldCenter: [14, 2.5, -8],
    shellRadiusU: 6.2,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'PRIMARY_IMPLEMENTED',
    lockStatus: 'locked',
  },
  'campaign-os': {
    id: 'campaign-os',
    label: 'Campaign OS',
    labelEn: 'Campaign OS',
    labelAr: 'نظام الحملات',
    worldCenter: [-13, 2, -7],
    shellRadiusU: 5.4,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'CONNECTED_DESTINATION_IMPLEMENTED',
    lockStatus: 'locked',
  },
  'about-us': {
    id: 'about-us',
    label: 'About Us',
    labelEn: 'About Us',
    labelAr: 'من نحن',
    worldCenter: [8, 1.5, 12],
    shellRadiusU: 5.0,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'CONNECTED_DESTINATION_IMPLEMENTED',
    lockStatus: 'locked',
  },
  'industry-making': {
    id: 'industry-making',
    label: 'Industry & Making',
    labelEn: 'Industry & Making',
    labelAr: 'إصطمبة',
    worldCenter: [-18, -6, 16],
    shellRadiusU: 4.8,
    materialPreset: 'proposed-die-world',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'PROPOSED_NOT_IMPLEMENTED_AS_FULL_SPHERE',
    lockStatus: 'proposed',
  },
};

export interface ProjectProvenanceSummary {
  registerCount: number;
  sampleCount: number;
  totalCount: number;
  badgeLabel: string;
  registerIds: string[];
  sampleIds: string[];
}

export function computeProjectProvenanceSummary(
  projects: readonly ProjectSummary[] = PROJECTS_DATA
): ProjectProvenanceSummary {
  const registerIds: string[] = [];
  const sampleIds: string[] = [];
  for (const p of projects) {
    if (p.isSample) {
      sampleIds.push(p.id);
    } else {
      registerIds.push(p.id);
    }
  }
  const registerCount = registerIds.length;
  const sampleCount = sampleIds.length;
  return {
    registerCount,
    sampleCount,
    totalCount: registerCount + sampleCount,
    badgeLabel: `${registerCount} Register · ${sampleCount} Sample`,
    registerIds,
    sampleIds,
  };
}

export interface StakeholderSpatialLink {
  personId: string;
  personCode: string;
  personName: string;
  projectIds: string[];
  raciRoles: Record<string, string>;
  registerRecordIds: string[];
  persistentWebglCoordinatesClaimed: false;
}

export function deriveExplicitStakeholderRelationships(): StakeholderSpatialLink[] {
  return PEOPLE_DATA.map((person) => {
    const firstToken = person.name.split(' ')[0].toLowerCase();
    const raciRoles: Record<string, string> = {};
    const projectSet = new Set<string>();
    for (const row of RACI_MATRIX) {
      const respMatch = row.responsible.toLowerCase().includes(firstToken);
      const accMatch = row.accountable.toLowerCase().includes(firstToken);
      if (respMatch || accMatch) {
        raciRoles[row.projectId] = accMatch ? 'A' : 'R';
        projectSet.add(row.projectId);
      }
    }
    const registerRecordIds = REGISTER_RECORDS.filter(
      (r) =>
        r.owner.toLowerCase().includes(firstToken) ||
        projectSet.has(r.projectId)
    ).map((r) => r.id);

    return {
      personId: person.id,
      personCode: person.id.replace(/^p-/, '').toUpperCase(),
      personName: person.name,
      projectIds: Array.from(projectSet),
      raciRoles,
      registerRecordIds,
      persistentWebglCoordinatesClaimed: false,
    };
  });
}

export interface SafeAreaCatmullRomFlightOptions {
  startPos: THREE.Vector3;
  startLookAt: THREE.Vector3;
  targetCenter: THREE.Vector3;
  targetRadiusU: number;
  vFovDeg: number;
  viewportW: number;
  viewportH: number;
  sceneSafeRect: { x: number; y: number; w?: number; h?: number; width?: number; height?: number };
}

export interface SafeAreaCatmullRomFlightResult {
  fittedDistanceU: number;
  subFrustumOffset: { offsetX: number; offsetY: number };
  endPosition: THREE.Vector3;
  endLookAt: THREE.Vector3;
  positionCurve: THREE.CatmullRomCurve3;
  lookAtCurve: THREE.CatmullRomCurve3;
}

export function buildSafeAreaFittedCatmullRomFlight(
  opts: SafeAreaCatmullRomFlightOptions
): SafeAreaCatmullRomFlightResult {
  const normalizedRect: GuiRect = {
    x: opts.sceneSafeRect.x,
    y: opts.sceneSafeRect.y,
    w: opts.sceneSafeRect.w ?? opts.sceneSafeRect.width ?? opts.viewportW,
    h: opts.sceneSafeRect.h ?? opts.sceneSafeRect.height ?? opts.viewportH,
  };
  const basePreset = {
    ...GUI_CAMERA_PRESETS.world,
    verticalFovDeg: opts.vFovDeg,
  };
  const rawFitted = computeFittedCameraDistance({
    sphereRadius: opts.targetRadiusU,
    preset: basePreset,
    viewportW: opts.viewportW,
    viewportH: opts.viewportH,
    unobstructedRect: normalizedRect,
  });
  const fittedDistanceU = Math.max(3.6, Math.min(34.0, rawFitted));

  const subOffset = computeSubFrustumOffset(
    opts.viewportW,
    opts.viewportH,
    normalizedRect
  );

  const normX = subOffset.offsetX / Math.max(1, opts.viewportW);
  const normY = subOffset.offsetY / Math.max(1, opts.viewportH);

  const endLookAt = opts.targetCenter.clone();
  const endPosition = new THREE.Vector3(
    opts.targetCenter.x - normX * 4.0,
    opts.targetCenter.y + 1.8 - normY * 3.0,
    opts.targetCenter.z + fittedDistanceU
  );

  const midApex = opts.startPos
    .clone()
    .lerp(endPosition, 0.5)
    .add(new THREE.Vector3(0, 6.2, 0));
  const craneOut = opts.startPos
    .clone()
    .lerp(midApex, 0.34)
    .add(new THREE.Vector3(0, 2.8, 3.2));
  const approachIn = midApex
    .clone()
    .lerp(endPosition, 0.62)
    .add(new THREE.Vector3(0, 1.8, 1.5));

  const positionCurve = new THREE.CatmullRomCurve3(
    [opts.startPos.clone(), craneOut, midApex, approachIn, endPosition],
    false,
    'centripetal',
    0.5
  );

  const lookMid = opts.startLookAt
    .clone()
    .lerp(endLookAt, 0.5)
    .add(new THREE.Vector3(0, 1.2, 0));
  const lookAtCurve = new THREE.CatmullRomCurve3(
    [opts.startLookAt.clone(), lookMid, endLookAt],
    false,
    'centripetal',
    0.5
  );

  return {
    fittedDistanceU,
    subFrustumOffset: subOffset,
    endPosition,
    endLookAt,
    positionCurve,
    lookAtCurve,
  };
}

export interface MountedSphereInstance {
  id: ConnectedSphereId;
  root: THREE.Group;
  shellGroup: THREE.Group;
  coreGroup: THREE.Group;
  frontShellMat: THREE.MeshPhysicalMaterial;
  backShellMat: THREE.MeshPhysicalMaterial;
  coreCrystalMat: THREE.MeshPhysicalMaterial;
  /** Back + front outer shell meshes; geometry may be swapped via masterSphereShape. */
  shellMeshes?: THREE.Mesh[];
}

const mountedSphereRegistry = new Map<ConnectedSphereId, MountedSphereInstance>();

export function registerMountedSphereInstances(
  instances: Partial<Record<ConnectedSphereId, MountedSphereInstance>>
): void {
  mountedSphereRegistry.clear();
  for (const id of LIVE_SPHERE_IDS) {
    const inst = instances[id];
    if (inst) {
      mountedSphereRegistry.set(id, inst);
    }
  }
}

export function getMountedSphereInstances(): ReadonlyMap<ConnectedSphereId, MountedSphereInstance> {
  return mountedSphereRegistry;
}

export function getMountedSphereInstance(
  id: ConnectedSphereId
): MountedSphereInstance | undefined {
  return mountedSphereRegistry.get(id);
}

export function clearMountedSphereInstances(): void {
  mountedSphereRegistry.clear();
}

export function getSphereNetworkDiagnosticSnapshot() {
  const provenance = computeProjectProvenanceSummary(PROJECTS_DATA);
  const stakeholderLinks = deriveExplicitStakeholderRelationships();
  return {
    primarySpheres: ['hq', 'cde'] as const,
    connectedDestinations: ['campaign-os', 'about-us'] as const,
    proposedSpheres: ['industry-making'] as const,
    topology: SPHERE_NETWORK_TOPOLOGY,
    provenance,
    stakeholderLinkCount: stakeholderLinks.length,
    mountedSphereCount: mountedSphereRegistry.size,
  };
}


