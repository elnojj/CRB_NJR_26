import * as THREE from 'three';

export type ConnectedSphereId = 'hq' | 'cde' | 'campaign-os' | 'about-us';

export const CONNECTED_SPHERE_IDS: ConnectedSphereId[] = [
  'hq',
  'cde',
  'campaign-os',
  'about-us',
];

export function isConnectedSphereId(value: unknown): value is ConnectedSphereId {
  return (
    value === 'hq' ||
    value === 'cde' ||
    value === 'campaign-os' ||
    value === 'about-us'
  );
}

export type MountedSphereInstance = {
  id: ConnectedSphereId;
  root: THREE.Object3D;
  shellGroup?: THREE.Object3D;
  coreGroup?: THREE.Object3D;
  center: THREE.Vector3;
};

export const SPHERE_NETWORK: Array<{
  id: ConnectedSphereId;
  label: string;
  center: [number, number, number];
}> = [
  { id: 'hq', label: 'HQ', center: [0, 0, 0] },
  { id: 'cde', label: 'CDE', center: [38, 4, -22] },
  { id: 'campaign-os', label: 'Campaign OS', center: [-34, 2, -18] },
  { id: 'about-us', label: 'About Us', center: [18, -6, 28] },
];

const mounted = new Map<ConnectedSphereId, MountedSphereInstance>();

export function registerMountedSphere(instance: MountedSphereInstance): void {
  mounted.set(instance.id, instance);
}

export function unregisterMountedSphere(id: ConnectedSphereId): void {
  mounted.delete(id);
}

export function getMountedSphereInstance(
  id: ConnectedSphereId
): MountedSphereInstance | undefined {
  return mounted.get(id);
}

export function getMountedSphereInstances(): ReadonlyMap<
  ConnectedSphereId,
  MountedSphereInstance
> {
  return mounted;
}
