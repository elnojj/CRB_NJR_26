import * as THREE from 'three';
import { PROJECTS_DATA } from '../data/sourceData';
import { CDE_TAXONOMY, MASTER_RADIUS, SPATIAL_SCALE } from './spatialNavigation';

export interface SpatialGraphBinding {
  masterGroup: THREE.Group;
  cdeWorldGroup: THREE.Group;
  projectSpheresGroup: THREE.Group;
  projectMeshMap: Map<string, THREE.Mesh>;
  dispose: () => void;
}

/**
 * Builds the CEREBRO Spatial Graph (PR #131 / b0acb0f)
 * - Preserves cde-world
 * - Binds project spheres directly to the master group (no HQ intermediate hop)
 * - Uses unified physical glass material
 */
export function buildSpatialGraph(masterRef?: THREE.Group): SpatialGraphBinding {
  const masterGroup = masterRef || new THREE.Group();
  masterGroup.name = 'master-sphere-group';

  // 1. Preserved cde-world group as direct child of master
  const cdeWorldGroup = new THREE.Group();
  cdeWorldGroup.name = 'cde-world';
  cdeWorldGroup.position.set(0, 0, 0);
  masterGroup.add(cdeWorldGroup);

  // 2. Project spheres bound directly as children of the master group (no HQ intermediate hop)
  const projectSpheresGroup = new THREE.Group();
  projectSpheresGroup.name = 'project-spheres-direct';
  masterGroup.add(projectSpheresGroup);

  const projectMeshMap = new Map<string, THREE.Mesh>();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const sphereGeo = new THREE.SphereGeometry(0.85, 32, 24);
  geometries.push(sphereGeo);

  PROJECTS_DATA.forEach((proj, i) => {
    const angle = (i / PROJECTS_DATA.length) * Math.PI * 2;
    const radius = MASTER_RADIUS * SPATIAL_SCALE * 1.65;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = Math.sin(i * 1.4) * 1.8;

    const projMat = new THREE.MeshPhysicalMaterial({
      metalness: CDE_TAXONOMY.glass.metalness,
      ior: CDE_TAXONOMY.glass.ior,
      transmission: CDE_TAXONOMY.glass.transmission,
      roughness: CDE_TAXONOMY.glass.roughness,
      thickness: CDE_TAXONOMY.glass.thickness,
      transparent: true,
      opacity: 0.88,
    });
    materials.push(projMat);

    const mesh = new THREE.Mesh(sphereGeo, projMat);
    mesh.position.set(x, y, z);
    mesh.name = `project-sphere-${proj.id}`;
    mesh.userData = {
      projectId: proj.id,
      code: proj.code,
      name: proj.name,
      isDirectChildOfMaster: true,
    };

    projectSpheresGroup.add(mesh);
    projectMeshMap.set(proj.id, mesh);
  });

  return {
    masterGroup,
    cdeWorldGroup,
    projectSpheresGroup,
    projectMeshMap,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
