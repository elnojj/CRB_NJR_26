/**
 * Procedural إصطمبة mould proof (R05).
 * Reconstruction only — never implies ABINFER_MOULD asset presence.
 */
import * as THREE from 'three';
import type { ProjectWorldInteractionState } from '../data/projectWorldManifest';

export type IstanbaProofHandle = {
  group: THREE.Group;
  setState: (state: ProjectWorldInteractionState, t01?: number) => void;
  dispose: () => void;
};

function makeDieHalf(side: 1 | -1, colour: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(2.4, 1.6, 1.1, 1, 1, 1);
  const mat = new THREE.MeshPhysicalMaterial({
    color: colour,
    metalness: 0.72,
    roughness: 0.28,
    clearcoat: 0.45,
    clearcoatRoughness: 0.22,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(side * 1.15, 0, 0);
  mesh.name = side > 0 ? 'die-half-a' : 'die-half-b';
  mesh.userData.reconstruction = true;
  mesh.userData.label = 'Procedural reconstruction — not ABINFER_MOULD';
  return mesh;
}

export function createIstanbaMouldProof(parent: THREE.Object3D): IstanbaProofHandle {
  const group = new THREE.Group();
  group.name = 'istanba-mould-proof';
  group.userData.reconstruction = true;
  group.userData.rightsState = 'proposed_procedural';

  const halfA = makeDieHalf(1, 0x8c6a45);
  const halfB = makeDieHalf(-1, 0x685218);
  const cavity = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0xb4ddff,
      metalness: 0.05,
      roughness: 0.18,
      transmission: 0.35,
      thickness: 0.4,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  cavity.name = 'impression-cavity';
  cavity.userData.reconstruction = true;

  const mediaSlot = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.9),
    new THREE.MeshBasicMaterial({
      color: 0x101622,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  mediaSlot.name = 'sourced-media-slot';
  mediaSlot.position.set(0, 0, 0.85);
  mediaSlot.userData.rightsState = 'unavailable';
  mediaSlot.userData.placeholderLabel = 'Media unavailable / rights-blocked';

  const labelSprite = makeTextSprite('RECONSTRUCTION · إصطمبة');
  labelSprite.position.set(0, 1.55, 0);

  group.add(halfA, halfB, cavity, mediaSlot, labelSprite);
  group.visible = false;
  parent.add(group);

  const setState = (state: ProjectWorldInteractionState, t01 = 1) => {
    const t = THREE.MathUtils.clamp(t01, 0, 1);
    const open = state === 'project_world' || state === 'media_inspection' ? 1.35 * t : 0.15 * t;
    halfA.position.x = 1.15 + open;
    halfB.position.x = -(1.15 + open);
    cavity.scale.setScalar(state === 'media_inspection' ? 1.15 : 1);
    mediaSlot.visible = state === 'media_inspection' || state === 'project_world';
    group.visible =
      state === 'threshold_flight' ||
      state === 'project_world' ||
      state === 'media_inspection' ||
      state === 'return_flight';
    group.position.y = state === 'threshold_flight' ? THREE.MathUtils.lerp(-2.2, 0, t) : 0;
  };

  const dispose = () => {
    parent.remove(group);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const m = obj.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  };

  return { group, setState, dispose };
}

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = 'rgba(5,9,14,0.72)';
  ctx.fillRect(0, 0, 512, 96);
  ctx.font = '600 28px sans-serif';
  ctx.fillStyle = '#F2F6F8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.6, 1);
  sprite.userData.reconstruction = true;
  return sprite;
}
