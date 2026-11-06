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
import { CONTRACT_SHELL_MATERIAL, CONTRACT_SPHERES } from '../design/systemContract';

function contractSphere(id: (typeof CONTRACT_SPHERES)[number]['id']): (typeof CONTRACT_SPHERES)[number] {
  const found = CONTRACT_SPHERES.find((s) => s.id === id);
  if (!found) throw new Error(`systemContract is missing sphere ${id}`);
  return found;
}

function contractCenter(id: (typeof CONTRACT_SPHERES)[number]['id']): [number, number, number] {
  const [x, y, z] = contractSphere(id).center;
  return [x, y, z];
}

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
  transmission: CONTRACT_SHELL_MATERIAL.transmission,
  roughness: CONTRACT_SHELL_MATERIAL.roughness,
  metalness: 0.0,
  ior: CONTRACT_SHELL_MATERIAL.ior,
  thickness: 1.2,
  clearcoat: CONTRACT_SHELL_MATERIAL.clearcoat,
  clearcoatRoughness: CONTRACT_SHELL_MATERIAL.clearcoatRoughness,
  specularIntensity: 0.55,
  specularColor: '#B4DDFF',
  attenuationColor: '#d6e8ff',
  attenuationDistance: 60,
  envMapIntensity: CONTRACT_SHELL_MATERIAL.envMapIntensity,
};

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
    // Pure refractive glass on hardware WebGL (zero self-emissive glow); fallback only on softwareGl
    emissive: softwareGl ? new THREE.Color(GLASS_EMISSIVE_FLOOR.color) : new THREE.Color(0x000000),
    emissiveIntensity: softwareGl ? GLASS_EMISSIVE_FLOOR.flatIntensity : 0,
    dispersion: softwareGl ? 0 : 0.35,
    sheen: 0,
    sheenRoughness: 1,
    transparent: true,
    opacity: softwareGl ? (face === 'back' ? 0.14 : 0.24) : face === 'back' ? 0.4 : 1,
    side,
    depthWrite: CONTRACT_SHELL_MATERIAL.depthWrite,
  });
}

export type SphereNetworkNode = {
  id: ConnectedSphereId;
  labelEn: string;
  labelAr: string;
  center: [number, number, number];
  radius: number;
  /** Strictly locked to MAT_LIQUID_GLASS_SHELL across all four live spheres. */
  materialPreset: 'MAT_LIQUID_GLASS_SHELL';
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
    center: contractCenter('hq'),
    radius: contractSphere('hq').radius,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'live',
  },
  {
    id: 'cde',
    labelEn: 'CDE Universe',
    labelAr: 'عالم التصميم',
    center: contractCenter('cde'),
    radius: contractSphere('cde').radius,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'live',
  },
  {
    id: 'campaign-os',
    labelEn: 'Campaign OS',
    labelAr: 'نظام الحملات',
    center: contractCenter('campaign-os'),
    radius: contractSphere('campaign-os').radius,
    materialPreset: 'MAT_LIQUID_GLASS_SHELL',
    outerShellMaterial: SHARED_OUTER_SHELL_MATERIAL_PRESET,
    status: 'live',
  },
  {
    id: 'about-us',
    labelEn: 'About Us',
    labelAr: 'من نحن',
    center: contractCenter('about-us'),
    radius: contractSphere('about-us').radius,
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

/**
 * Camera radius at which the whole constellation reads at the 24 mm opening lens:
 * farthest shell edge from the centroid, with framing margin (1.65 keeps the widest shell clear of a 16:10 frame).
 */
export const SPHERE_NETWORK_OVERVIEW_RADIUS: number = (() => {
  const c = sphereNetworkCentroid();
  let extent = 0;
  for (const n of SPHERE_NETWORK) {
    const d = Math.hypot(n.center[0] - c.x, n.center[1] - c.y, n.center[2] - c.z) + n.radius;
    extent = Math.max(extent, d);
  }
  return Math.round(extent * 1.65);
})();

/** Furthest the user may dolly out: just past the overview framing. */
export const MAX_ORBIT_RADIUS: number = Math.max(38, Math.ceil(SPHERE_NETWORK_OVERVIEW_RADIUS * 1.25));

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
  continuousOnerDurationMs: 30000,
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
  materialPreset: 'MAT_LIQUID_GLASS_SHELL' | 'proposed-die-world';
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
    worldCenter: contractCenter('hq'),
    shellRadiusU: contractSphere('hq').radius,
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
    worldCenter: contractCenter('cde'),
    shellRadiusU: contractSphere('cde').radius,
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
    worldCenter: contractCenter('campaign-os'),
    shellRadiusU: contractSphere('campaign-os').radius,
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
    worldCenter: contractCenter('about-us'),
    shellRadiusU: contractSphere('about-us').radius,
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
    worldCenter: contractCenter('industry-istanba'),
    shellRadiusU: contractSphere('industry-istanba').radius,
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

export interface ConstellationOnerFlightResult {
  durationMs: number;
  positionCurve: THREE.CatmullRomCurve3;
  lookAtCurve: THREE.CatmullRomCurve3;
  /** Evaluates camera position, lookAt, and exact DoF focus distance at normalized time u in [0, 1]. */
  sampleAt(u: number): {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    focusDistanceU: number;
  };
}

/**
 * 30-second continuous camera choreography ("Oner") sweeping across all four live spheres
 * (HQ -> CDE -> Campaign OS -> About Us) and resolving into the constellation overview.
 */
export function buildConstellationOnerFlight(
  durationMs: number = CAMERA_MOTION_TARGETS.continuousOnerDurationMs
): ConstellationOnerFlightResult {
  const centroid = sphereNetworkCentroid();
  const overviewPos = new THREE.Vector3(
    centroid.x,
    centroid.y + 4.5,
    centroid.z + SPHERE_NETWORK_OVERVIEW_RADIUS
  );

  const posPoints: THREE.Vector3[] = [overviewPos.clone()];
  const lookPoints: THREE.Vector3[] = [centroid.clone()];

  for (const node of SPHERE_NETWORK) {
    const c = new THREE.Vector3(node.center[0], node.center[1], node.center[2]);
    const standoff = Math.max(5.2, node.radius * 2.35);
    // Sweeping orbital entry & close-up pass per sphere
    posPoints.push(
      new THREE.Vector3(c.x - standoff * 0.55, c.y + 2.4, c.z + standoff * 1.15),
      new THREE.Vector3(c.x + standoff * 0.25, c.y + 1.1, c.z + standoff * 0.88)
    );
    lookPoints.push(c.clone(), c.clone());
  }

  posPoints.push(overviewPos.clone());
  lookPoints.push(centroid.clone());

  const positionCurve = new THREE.CatmullRomCurve3(posPoints, false, 'centripetal', 0.5);
  const lookAtCurve = new THREE.CatmullRomCurve3(lookPoints, false, 'centripetal', 0.5);

  return {
    durationMs,
    positionCurve,
    lookAtCurve,
    sampleAt(u: number) {
      const clampedU = Math.max(0, Math.min(1, u));
      const position = positionCurve.getPointAt(clampedU);
      const lookAt = lookAtCurve.getPointAt(clampedU);
      const focusDistanceU = Math.max(2.5, position.distanceTo(lookAt));
      return { position, lookAt, focusDistanceU };
    },
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
