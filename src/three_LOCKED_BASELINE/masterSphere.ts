/**
 * Master-sphere navigation model (cerebro-frontend-master-sphere-v1).
 * One translucent master world; inner spheres are project portals.
 * Peer HQ/CDE/Campaign/About placements remain migration inputs only.
 */
import type { ConnectedSphereId, SphereNetworkNode } from './sphereNetwork';
import { SPHERE_NETWORK } from './sphereNetwork';
import { PROJECTS_DATA } from '../data/sourceData';

export type MasterDestinationId =
  | 'master'
  | 'domain-cde'
  | 'destination-campaign-os'
  | 'destination-about-us'
  | `project:${string}`;

export type MasterNavMode = 'master' | 'project-world' | 'domain' | 'destination';

/** Migration inputs — do not use as primary peer navigation. */
export const PEER_SPHERE_MIGRATION_INPUTS: readonly SphereNetworkNode[] = SPHERE_NETWORK;

export const MASTER_SPHERE = {
  id: 'master' as const,
  labelEn: 'Cerebro Master Sphere',
  labelAr: 'كرة سيريبو الرئيسية',
  center: [0, 0, 0] as [number, number, number],
  radius: 7.2,
  materialId: 'MAT_LIQUID_GLASS_SHELL' as const,
};

/** Discoverable domain mapped from former CDE peer. */
export const DOMAIN_CDE = {
  id: 'domain-cde' as const,
  fromPeer: 'cde' as ConnectedSphereId,
  labelEn: 'CDE Domain',
  labelAr: 'مجال التصميم',
  /** Offset inside master local space (not a peer world origin). */
  localOffset: [2.4, 0.6, -1.8] as [number, number, number],
  radius: 1.35,
};

/** Explicit destinations mapped from Campaign OS / About Us peers. */
export const MASTER_DESTINATIONS = [
  {
    id: 'destination-campaign-os' as const,
    fromPeer: 'campaign-os' as ConnectedSphereId,
    labelEn: 'Campaign OS',
    labelAr: 'نظام الحملات',
    localOffset: [-2.6, 0.4, -1.2] as [number, number, number],
    radius: 1.15,
  },
  {
    id: 'destination-about-us' as const,
    fromPeer: 'about-us' as ConnectedSphereId,
    labelEn: 'About Us',
    labelAr: 'من نحن',
    localOffset: [0.2, -0.8, 2.4] as [number, number, number],
    radius: 1.05,
  },
] as const;

export type MasterProjectPortal = {
  projectId: string;
  titleEn: string;
  titleAr: string;
  health: string;
  localOffset: [number, number, number];
  radius: number;
};

/**
 * Derive visible project portals from source data — never a hard-coded "6 Suns" count.
 * Supports zero, one, and many entries with Fibonacci-sphere packing.
 */
export function buildMasterProjectPortals(
  projects: ReadonlyArray<{
    id: string;
    name?: string;
    code?: string;
    health?: string;
  }> = PROJECTS_DATA
): MasterProjectPortal[] {
  const n = projects.length;
  if (n === 0) return [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const shell = MASTER_SPHERE.radius * 0.58;
  return projects.map((p, i) => {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    return {
      projectId: p.id,
      titleEn: p.name || p.code || p.id,
      titleAr: p.code || p.id,
      health: p.health || 'Unknown',
      localOffset: [x * shell, y * shell * 0.85, z * shell] as [number, number, number],
      radius: n === 1 ? 1.4 : Math.max(0.55, Math.min(1.1, 2.4 / Math.sqrt(n))),
    };
  });
}

export function projectPortalCountLabel(count: number): string {
  if (count <= 0) return 'No projects in register';
  if (count === 1) return '1 project portal';
  return `${count} project portals`;
}
