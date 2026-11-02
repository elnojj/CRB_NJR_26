/**
 * Project-world GPU ownership helpers (L03).
 * Ensures textures/geometries/listeners from a world can be suspended/disposed
 * without creating a second renderer or camera owner.
 */
import * as THREE from 'three';

export type ProjectWorldHostHandle = {
  root: THREE.Group;
  projectId: string;
  suspend: () => void;
  resume: () => void;
  dispose: () => void;
};

/**
 * Mount a minimal unavailable/placeholder world under the master sphere.
 * Does not invent playable media — uses ice plate material only.
 */
export function mountUnavailableProjectWorld(options: {
  parent: THREE.Object3D;
  projectId: string;
  title: string;
}): ProjectWorldHostHandle {
  const root = new THREE.Group();
  root.name = `project-world-${options.projectId}`;
  root.userData = {
    projectWorld: true,
    projectId: options.projectId,
    state: 'unavailable',
  };

  const geo = new THREE.SphereGeometry(2.2, 32, 24);
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0A1218'),
    metalness: 0,
    roughness: 0.2,
    transmission: 0.6,
    thickness: 1.2,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(geo, mat);
  shell.name = `project-world-shell-${options.projectId}`;
  root.add(shell);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#101D27';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#B4DDFF';
    ctx.font = '28px sans-serif';
    ctx.fillText(options.title.slice(0, 28), 24, 120);
    ctx.fillStyle = '#9AFFE0';
    ctx.font = '18px monospace';
    ctx.fillText('World unavailable · return to master', 24, 160);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  plate.position.z = 0.4;
  root.add(plate);
  options.parent.add(root);

  let suspended = false;
  return {
    root,
    projectId: options.projectId,
    suspend: () => {
      suspended = true;
      root.visible = false;
      root.userData.state = 'suspended';
    },
    resume: () => {
      suspended = false;
      root.visible = true;
      root.userData.state = 'active';
    },
    dispose: () => {
      void suspended;
      options.parent.remove(root);
      geo.dispose();
      mat.dispose();
      tex.dispose();
      (plate.geometry as THREE.BufferGeometry).dispose();
      (plate.material as THREE.Material).dispose();
      root.clear();
    },
  };
}
