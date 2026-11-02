/**
 * Four live navigable spheres: HQ, CDE, Campaign OS, About Us.
 * Industry & Making / إصطمبة remains proposed (not navigable).
 * All live shells share MAT_LIQUID_GLASS_SHELL + always-on inner media cutdowns.
 */
import * as THREE from 'three';

export type ConnectedSphereId = 'hq' | 'cde' | 'campaign-os' | 'about-us';

export type SphereNetworkNode = {
  id: ConnectedSphereId;
  labelEn: string;
  labelAr: string;
  center: [number, number, number];
  radius: number;
  /** Identity label only — runtime shell uses the shared optical-glass recipe on every sphere. */
  materialPreset: 'hq-cobalt-glass' | 'cde-amber-crystal' | 'campaign-ice' | 'about-gold-glass';
  status: 'live' | 'connected' | 'proposed';
};

/**
 * Compact diamond so all four live shells read in one constellation overview
 * (default ~24–35mm pullback). Far legacy coords ([38,4,-22] etc.) hid peers
 * outside the first viewport and looked like a dual-sphere scene.
 */
export const SPHERE_NETWORK: readonly SphereNetworkNode[] = [
  {
    id: 'hq',
    labelEn: 'Cerebro HQ',
    labelAr: 'مقر سيريبو',
    center: [0, 0, 0],
    radius: 6.2,
    materialPreset: 'hq-cobalt-glass',
    status: 'live',
  },
  {
    id: 'cde',
    labelEn: 'CDE Universe',
    labelAr: 'عالم التصميم',
    center: [14, 2.5, -8],
    radius: 6.2,
    materialPreset: 'cde-amber-crystal',
    status: 'live',
  },
  {
    id: 'campaign-os',
    labelEn: 'Campaign OS',
    labelAr: 'نظام الحملات',
    center: [-13, 2, -7],
    radius: 5.4,
    materialPreset: 'campaign-ice',
    status: 'live',
  },
  {
    id: 'about-us',
    labelEn: 'About Us',
    labelAr: 'من نحن',
    center: [8, 1.5, 12],
    radius: 5.0,
    materialPreset: 'about-gold-glass',
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

export function isConnectedSphereId(value: string): value is ConnectedSphereId {
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
