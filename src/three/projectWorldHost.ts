/**
 * projectWorldHost.ts — Mounts media apertures and active reel targets 
 * inside the shared liquid glass shell constellation (NJR_SYS_26).
 */
import * as THREE from 'three';
import { SPHERE_NETWORK, type ConnectedSphereId } from './sphereNetwork';

export interface ProjectWorldHostConfig {
  scene: THREE.Scene;
  onMediaSelect?: (targetId: ConnectedSphereId) => void;
}

export class ProjectWorldHost {
  private scene: THREE.Scene;
  private hostGroup: THREE.Group;
  private apertureMeshes: Map<ConnectedSphereId, THREE.Mesh> = new Map();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private onMediaSelect?: (targetId: ConnectedSphereId) => void;

  constructor(config: ProjectWorldHostConfig) {
    this.scene = config.scene;
    this.onMediaSelect = config.onMediaSelect;
    this.hostGroup = new THREE.Group();
    this.hostGroup.name = 'ProjectWorldHostGroup';
    this.scene.add(this.hostGroup);
    
    this.initApertures();
  }

  private initApertures(): void {
    // Shared physical liquid glass material contract (NJR_SYS_26)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a1118, // Near-black tinted glass base
      emissive: 0x002244, // Subtle cobalt undertone
      emissiveIntensity: 0.15,
      metalness: 0.1,
      roughness: 0.12,
      transmission: 0.88, // Liquid glass refraction
      thickness: 1.2,
      ior: 1.5,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (const node of SPHERE_NETWORK) {
      const geometry = new THREE.PlaneGeometry(3.2, 5.6); // 9:16 aspect ratio framing
      const aperture = new THREE.Mesh(geometry, glassMaterial);
      
      aperture.position.set(node.center[0], node.center[1], node.center[2]);
      aperture.name = `aperture-${node.id}`;
      aperture.userData = { targetId: node.id };
      
      this.hostGroup.add(aperture);
      this.apertureMeshes.set(node.id, aperture);
    }
  }

  public handlePointerClick(event: MouseEvent, camera: THREE.Camera): ConnectedSphereId | null {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const intersects = this.raycaster.intersectObjects(this.hostGroup.children);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const targetId = hitMesh.userData.targetId as ConnectedSphereId;
      if (targetId && this.onMediaSelect) {
        this.onMediaSelect(targetId);
        return targetId;
      }
    }
    return null;
  }

  public update(delta: number): void {
    const time = Date.now() * 0.0015;
    for (const [id, mesh] of this.apertureMeshes) {
      if (mesh) {
        mesh.visible = true;
        // Organic floating suspension effect along the spatial graph node
        const baseNode = SPHERE_NETWORK.find(n => n.id === id);
        if (baseNode) {
          mesh.position.y = baseNode.center[1] + Math.sin(time + baseNode.center[0]) * 0.04;
        }
      }
    }
  }

  public dispose(): void {
    for (const [, mesh] of this.apertureMeshes) {
      mesh.geometry.dispose();
    }
    this.apertureMeshes.clear();
    this.scene.remove(this.hostGroup);
  }
}
