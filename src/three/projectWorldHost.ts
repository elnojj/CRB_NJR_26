/**
 * projectWorldHost.ts — Mounts media apertures and active reel targets 
 * inside the shared liquid glass shell constellation (NJR_SYS_26).
 */
import * as THREE from 'three';
import { 
  SPHERE_NETWORK, 
  getMountedSphereInstance, 
  type ConnectedSphereId 
} from './sphereNetwork';

export interface ProjectWorldHostConfig {
  scene: THREE.Scene;
  onMediaSelect?: (targetId: string) => void;
}

export class ProjectWorldHost {
  private scene: THREE.Scene;
  private hostGroup: THREE.Group;
  private apertureMeshes: Map<ConnectedSphereId, THREE.Mesh> = new Map();

  constructor(config: ProjectWorldHostConfig) {
    this.scene = config.scene;
    this.hostGroup = new THREE.Group();
    this.hostGroup.name = 'ProjectWorldHostGroup';
    this.scene.add(this.hostGroup);
    this.initApertures();
  }

  private initApertures(): void {
    for (const node of SPHERE_NETWORK) {
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
    // Sync aperture rotations and fade states with mounted sphere instances
    for (const [id, mesh] of this.apertureMeshes) {
      const inst = getMountedSphereInstance(id);
      if (inst) {
        mesh.visible = true;
        // Subtle depth float calculation aligned with spring solver
        mesh.position.y = inst.root.position.y + Math.sin(Date.now() * 0.0015) * 0.15;
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
