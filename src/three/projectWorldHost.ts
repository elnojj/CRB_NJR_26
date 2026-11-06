/**
 * projectWorldHost.ts — Mounts media apertures and active reel targets 
 * inside the shared liquid glass shell constellation (NJR_SYS_26).
 */
import * as THREE from 'three';
import { CONTRACT_SPHERES, type ContractSphereId } from '../design/systemContract';

export interface ProjectWorldHostConfig {
  scene: THREE.Scene;
  onMediaSelect?: (targetId: string) => void;
}

export class ProjectWorldHost {
  private scene: THREE.Scene;
  private hostGroup: THREE.Group;
  private apertureMeshes: Map<ContractSphereId, THREE.Mesh> = new Map();

  constructor(config: ProjectWorldHostConfig) {
    this.scene = config.scene;
    this.hostGroup = new THREE.Group();
    this.hostGroup.name = 'ProjectWorldHostGroup';
    this.scene.add(this.hostGroup);
    this.initApertures();
  }

  private initApertures(): void {
    for (const node of CONTRACT_SPHERES) {
      const geometry = new THREE.PlaneGeometry(3.2, 5.6); // 9:16 aspect ratio framing
      const material = new THREE.MeshBasicMaterial({
        color: 0x101D27,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const aperture = new THREE.Mesh(geometry, material);
      aperture.position.set(node.center[0], node.center[1], node.center[2]);
      aperture.name = `aperture-${node.id}`;
      
      this.hostGroup.add(aperture);
      this.apertureMeshes.set(node.id, aperture);
    }
  }

  public update(delta: number): void {
    // Sync aperture rotations and floating states
    for (const [id, mesh] of this.apertureMeshes) {
      if (mesh) {
        mesh.visible = true;
        mesh.position.y += Math.sin(Date.now() * 0.0015 + mesh.position.x) * 0.002;
      }
    }
  }

  public dispose(): void {
    for (const [, mesh] of this.apertureMeshes) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.apertureMeshes.clear();
    this.scene.remove(this.hostGroup);
  }
}
