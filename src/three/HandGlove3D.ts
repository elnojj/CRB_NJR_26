import * as THREE from 'three';
import {
  GLOVE_PLANE_Z,
  LANDMARK_COUNT,
  MAX_HANDS,
  PINCH_THRESHOLD,
  handStateRef,
} from './handStateRef';
import { gloveFrustum } from './handTracker';

/**
 * Volumetric articulated glove parented to the active camera at z = -1.2 (camera-local), so the
 * hands travel with the camera along every spline flight and orbit. Matte carbon body, razor-sharp
 * step-function Fresnel contour in cobalt. No bloom, glow, or additive blending anywhere.
 */

const BODY = '#080A0F';
const COBALT = '#1E5EFF';
const OUTLINE_EDGE = 0.58;
const FOLLOW_RATE = 42;

const BONES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const JOINT_RADIUS: readonly number[] = [
  0.017, 0.013, 0.0115, 0.01, 0.0085,
  0.0125, 0.0105, 0.009, 0.0078,
  0.0125, 0.0105, 0.009, 0.0078,
  0.012, 0.0102, 0.0088, 0.0075,
  0.0115, 0.0095, 0.0082, 0.007,
];

const PALM_RING = [0, 1, 2, 5, 9, 13, 17] as const;
const PALM_HALF_THICKNESS = 0.011;

interface HandMesh {
  group: THREE.Group;
  bones: THREE.InstancedMesh;
  joints: THREE.InstancedMesh;
  palm: THREE.Mesh;
  palmPositions: Float32Array;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  disc: THREE.Mesh;
  display: Float32Array;
  seeded: boolean;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _mat = new THREE.Matrix4();

function createBodyMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: BODY,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const contour = new THREE.Color(COBALT);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uContour = { value: contour };
    shader.uniforms.uEdge = { value: OUTLINE_EDGE };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uContour;\nuniform float uEdge;\nvoid main() {')
      .replace(
        '#include <opaque_fragment>',
        `float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
         outgoingLight = mix(outgoingLight, uContour, step(uEdge, rim));
         #include <opaque_fragment>`
      );
  };
  material.customProgramCacheKey = () => 'hand-glove-contour-v1';
  return material;
}

export class HandGlove3D {
  readonly group = new THREE.Group();
  private readonly hands: HandMesh[] = [];
  private readonly bodyMaterial = createBodyMaterial();
  private readonly boneGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false);
  private readonly jointGeo = new THREE.SphereGeometry(1, 14, 10);

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.group.name = 'hand-glove';
    this.group.frustumCulled = false;
    for (let i = 0; i < MAX_HANDS; i += 1) {
      const hand = this.buildHand();
      this.hands.push(hand);
      this.group.add(hand.group);
    }
    camera.add(this.group);
  }

  private buildHand(): HandMesh {
    const group = new THREE.Group();
    group.visible = false;
    const bones = new THREE.InstancedMesh(this.boneGeo, this.bodyMaterial, BONES.length);
    const joints = new THREE.InstancedMesh(this.jointGeo, this.bodyMaterial, LANDMARK_COUNT);
    bones.frustumCulled = false;
    joints.frustumCulled = false;

    const palmGeo = new THREE.BufferGeometry();
    const n = PALM_RING.length;
    const palmPositions = new Float32Array(n * 2 * 3);
    palmGeo.setAttribute('position', new THREE.BufferAttribute(palmPositions, 3));
    const indices: number[] = [];
    for (let i = 1; i < n - 1; i += 1) {
      indices.push(0, i, i + 1);
      indices.push(n, n + i + 1, n + i);
    }
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      indices.push(i, n + i, j, j, n + i, n + j);
    }
    palmGeo.setIndex(indices);
    const palm = new THREE.Mesh(palmGeo, this.bodyMaterial);
    palm.frustumCulled = false;

    const ringMat = new THREE.MeshBasicMaterial({ color: COBALT, transparent: true, opacity: 0.7, depthTest: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.0205, 0.0245, 40), ringMat);
    ring.renderOrder = 1005;
    ring.frustumCulled = false;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.0245, 40),
      new THREE.MeshBasicMaterial({ color: COBALT, depthTest: false })
    );
    disc.renderOrder = 1005;
    disc.visible = false;
    disc.frustumCulled = false;
    ring.add(disc);

    group.add(bones, joints, palm, ring);
    return { group, bones, joints, palm, palmPositions, ring, ringMat, disc, display: new Float32Array(LANDMARK_COUNT * 3), seeded: false };
  }

  /** Per-frame update from the mutable hand ref. No React state, no allocations. */
  update(dt: number): void {
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * Math.abs(GLOVE_PLANE_Z);
    gloveFrustum.halfH = halfH;
    gloveFrustum.halfW = halfH * this.camera.aspect;

    const state = handStateRef.current;
    const fresh = state.tracking && performance.now() - state.updatedAtMs <= 250;
    for (let hi = 0; hi < this.hands.length; hi += 1) {
      const mesh = this.hands[hi];
      const slot = state.hands[hi];
      const visible = fresh && slot.present;
      mesh.group.visible = visible;
      if (!visible) {
        mesh.seeded = false;
        continue;
      }
      const target = slot.landmarks;
      const disp = mesh.display;
      if (!mesh.seeded) {
        disp.set(target);
        mesh.seeded = true;
      } else {
        const k = 1 - Math.exp(-FOLLOW_RATE * dt);
        for (let i = 0; i < disp.length; i += 1) disp[i] += (target[i] - disp[i]) * k;
      }
      this.pose(mesh, slot.pinchDistance, slot.pinching);
    }
  }

  private pose(mesh: HandMesh, pinchDistance: number, pinching: boolean): void {
    const L = mesh.display;
    for (let b = 0; b < BONES.length; b += 1) {
      const [i, j] = BONES[b];
      _a.set(L[i * 3], L[i * 3 + 1], L[i * 3 + 2]);
      _b.set(L[j * 3], L[j * 3 + 1], L[j * 3 + 2]);
      _dir.subVectors(_b, _a);
      const len = Math.max(1e-4, _dir.length());
      _dir.divideScalar(len);
      _mid.addVectors(_a, _b).multiplyScalar(0.5);
      _quat.setFromUnitVectors(_up, _dir);
      const r = Math.min(JOINT_RADIUS[i], JOINT_RADIUS[j]) * 0.92;
      _scale.set(r, len, r);
      mesh.bones.setMatrixAt(b, _mat.compose(_mid, _quat, _scale));
    }
    mesh.bones.instanceMatrix.needsUpdate = true;

    _quat.identity();
    for (let j = 0; j < LANDMARK_COUNT; j += 1) {
      _a.set(L[j * 3], L[j * 3 + 1], L[j * 3 + 2]);
      const r = JOINT_RADIUS[j];
      _scale.set(r, r, r);
      mesh.joints.setMatrixAt(j, _mat.compose(_a, _quat, _scale));
    }
    mesh.joints.instanceMatrix.needsUpdate = true;

    const n = PALM_RING.length;
    for (let i = 0; i < n; i += 1) {
      const id = PALM_RING[i];
      const x = L[id * 3];
      const y = L[id * 3 + 1];
      const z = L[id * 3 + 2];
      mesh.palmPositions[i * 3] = x;
      mesh.palmPositions[i * 3 + 1] = y;
      mesh.palmPositions[i * 3 + 2] = z + PALM_HALF_THICKNESS;
      mesh.palmPositions[(n + i) * 3] = x;
      mesh.palmPositions[(n + i) * 3 + 1] = y;
      mesh.palmPositions[(n + i) * 3 + 2] = z - PALM_HALF_THICKNESS;
    }
    const attr = mesh.palm.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    mesh.palm.geometry.computeVertexNormals();

    _a.set(L[4 * 3], L[4 * 3 + 1], L[4 * 3 + 2]);
    _b.set(L[8 * 3], L[8 * 3 + 1], L[8 * 3 + 2]);
    mesh.ring.position.addVectors(_a, _b).multiplyScalar(0.5);
    const closeness = THREE.MathUtils.clamp(pinchDistance / (PINCH_THRESHOLD * 3), 0.55, 1.35);
    mesh.ring.scale.setScalar(pinching ? 1 : closeness);
    mesh.disc.visible = pinching;
    mesh.ringMat.opacity = pinching ? 1 : 0.7;
  }

  dispose(): void {
    this.camera.remove(this.group);
    this.boneGeo.dispose();
    this.jointGeo.dispose();
    this.bodyMaterial.dispose();
    for (const hand of this.hands) {
      hand.bones.dispose();
      hand.joints.dispose();
      hand.palm.geometry.dispose();
      hand.ring.geometry.dispose();
      hand.ringMat.dispose();
      hand.disc.geometry.dispose();
      (hand.disc.material as THREE.Material).dispose();
    }
  }
}
