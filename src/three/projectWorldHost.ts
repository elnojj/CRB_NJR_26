/**
 * Project-world GPU ownership helpers (L03).
 * Ensures textures/geometries/listeners from a world can be suspended/disposed
 * without creating a second renderer or camera owner.
 */
import * as THREE from 'three';
import { createMatLiquidGlassShell } from '../materials/matLiquidGlassShell';

export type ProjectWorldHostHandle = {
  root: THREE.Group;
  projectId: string;
  suspend: () => void;
  resume: () => void;
  dispose: () => void;
};

/**
 * Mount a minimal unavailable/placeholder world under the master sphere.
 * Does not invent playable media — verified poster when provided, else ice caption plate
 * + MAT_LIQUID_GLASS_SHELL only.
 */
export function mountUnavailableProjectWorld(options: {
  parent: THREE.Object3D;
  projectId: string;
  title: string;
  /** Verified still or showreel poster URL — never a fabricated asset. */
  posterUrl?: string | null;
  /** Short provenance line for the caption plate. */
  provenanceNote?: string | null;
}): ProjectWorldHostHandle {
  const root = new THREE.Group();
  root.name = `project-world-${options.projectId}`;
  root.userData = {
    projectWorld: true,
    projectId: options.projectId,
    state: 'unavailable',
    posterUrl: options.posterUrl || null,
  };

  const geo = new THREE.SphereGeometry(2.2, 32, 24);
  // Named registry shell — do not invent an alternate transmission recipe.
  const mat = createMatLiquidGlassShell({ face: 'front' });
  const shell = new THREE.Mesh(geo, mat);
  shell.name = `project-world-shell-${options.projectId}`;
  root.add(shell);

  const disposables: Array<{ dispose: () => void }> = [];
  let plate: THREE.Mesh;

  if (options.posterUrl) {
    const loader = new THREE.TextureLoader();
    const posterTex = loader.load(
      options.posterUrl,
      undefined,
      undefined,
      () => {
        // Poster failed — leave glass shell; caption plate already mounted as backup text.
      }
    );
    posterTex.colorSpace = THREE.SRGBColorSpace;
    plate = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.8),
      new THREE.MeshBasicMaterial({
        map: posterTex,
        transparent: true,
        depthWrite: false,
      })
    );
    plate.name = `project-world-poster-${options.projectId}`;
    plate.position.z = 0.35;
    root.add(plate);
    disposables.push({
      dispose: () => {
        posterTex.dispose();
      },
    });

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(16,29,39,0.82)';
      ctx.fillRect(0, 0, 512, 96);
      ctx.fillStyle = '#9AFFE0';
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText('World unavailable · verified poster only', 16, 40);
      ctx.fillStyle = '#B4DDFF';
      ctx.font = '14px "Inter", "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(options.title.slice(0, 40), 16, 68);
    }
    const captionTex = new THREE.CanvasTexture(canvas);
    captionTex.colorSpace = THREE.SRGBColorSpace;
    const caption = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.56),
      new THREE.MeshBasicMaterial({ map: captionTex, transparent: true, depthWrite: false })
    );
    caption.position.set(0, -1.35, 0.45);
    root.add(caption);
    disposables.push({
      dispose: () => {
        captionTex.dispose();
        (caption.geometry as THREE.BufferGeometry).dispose();
        (caption.material as THREE.Material).dispose();
      },
    });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#101D27';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#B4DDFF';
      ctx.font = '28px "JaapokkiSubtract", "Sora", sans-serif';
      ctx.fillText(options.title.slice(0, 28), 24, 100);
      ctx.fillStyle = '#9AFFE0';
      ctx.font = '18px "JetBrains Mono", monospace';
      ctx.fillText('World unavailable · return to master', 24, 140);
      if (options.provenanceNote) {
        ctx.fillStyle = '#7A8B9A';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText(options.provenanceNote.slice(0, 52), 24, 180);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    plate = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.6),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    plate.position.z = 0.4;
    root.add(plate);
    disposables.push({
      dispose: () => {
        tex.dispose();
      },
    });
  }

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
      (plate.geometry as THREE.BufferGeometry).dispose();
      (plate.material as THREE.Material).dispose();
      disposables.forEach((d) => d.dispose());
      root.clear();
    },
  };
}
