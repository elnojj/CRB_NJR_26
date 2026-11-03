import * as THREE from 'three';
import {
  getMountedSphereInstance,
  getMountedSphereInstances,
  type ConnectedSphereId,
  type MountedSphereInstance,
  SPHERE_NETWORK,
} from '../three/sphereNetwork';

export const FPS = 60;
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smoother = (x: number) => {
  x = clamp(x);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export function hermite(keys: any[], t: number, key: string): any {
  const f = t * FPS;
  let i = keys.findIndex((x: any, j: number) => j < keys.length - 1 && f <= keys[j + 1].frame);
  if (i < 0) i = keys.length - 2;
  const a = keys[i];
  const b = keys[i + 1];
  const dt = (b.frame - a.frame) / FPS;
  const u = clamp((f - a.frame) / (b.frame - a.frame));
  const vec = Array.isArray(a[key]);
  const av = vec ? a[key] : [a[key]];
  const bv = vec ? b[key] : [b[key]];
  const val = av.map((x: number, k: number) => {
    const prev = keys[Math.max(0, i - 1)];
    const next = keys[Math.min(keys.length - 1, i + 2)];
    const pv = vec ? prev[key][k] : prev[key];
    const nv = vec ? next[key][k] : next[key];
    const m0 = i === 0 ? 0 : (bv[k] - pv) / ((b.frame - prev.frame) / FPS);
    const m1 = i + 1 === keys.length - 1 ? 0 : (nv - x) / ((next.frame - a.frame) / FPS);
    return (
      (2 * u * u * u - 3 * u * u + 1) * x +
      (u * u * u - 2 * u * u + u) * dt * m0 +
      (-2 * u * u * u + 3 * u * u) * bv[k] +
      (u * u * u - u * u) * dt * m1
    );
  });
  return vec ? val : val[0];
}

export function samplePose(config: any, t: number) {
  const k = config.motion.cameraKeys;
  return {
    position: hermite(k, t, 'position'),
    target: hermite(k, t, 'target'),
    focalMm: hermite(k, t, 'focalMm'),
  };
}

export type SceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  spheres?: ReadonlyMap<ConnectedSphereId, MountedSphereInstance>;
  hqShell?: THREE.Object3D;
  cdeShell?: THREE.Object3D;
  hqCore?: THREE.Object3D;
  cdeCore?: THREE.Object3D;
};

/** Default media asset lookup for interactive inner cores / stations during intro inspection. */
const INNER_MEDIA_BY_NODE: Record<string, string> = {
  'core-hq': 'production',
  'core-cde': 'showreel',
  people: 'tarek',
  media: 'el-batron',
  projects: 'production',
  production: 'laliga',
  YAH: 'young-human',
  'EL-BATRON': 'el-batron',
};

class IntroBridge {
  /** Only true while CerebroIntro owns the canvas. Workspace Cosmograph uses normal camera when false. */
  enabled = false;
  private randomState = 39;
  random() {
    this.randomState = (1664525 * this.randomState + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
  hostPoseSampler: ((t: number) => any) | null = null;
  config: any;
  ctx: SceneContext | null = null;
  ready = false;
  onReady = () => {};
  onFrame: (t: number) => void = () => {};
  private getTime = () => 0;
  private getPlaying = () => false;
  private anchors = new Map<string, THREE.Object3D>();
  private autoSuppressed = false;
  manualId: string | null = null;
  manualSince = 0;
  manualClosing = false;
  manualCloseSince = 0;
  resumeFrom: any = null;
  resumeSince = 0;
  inspectPose: any = null;

  configure(config: any, time: () => number, playing: () => boolean) {
    this.config = config;
    this.randomState = config.scene.randomSeed || 39;
    this.getTime = time;
    this.getPlaying = playing;
  }

  audioRms(t: number) {
    return this.config?.audio.rmsByFrame?.[Math.min(10799, Math.max(0, Math.floor(t * 60)))] || 0;
  }

  time() {
    return clamp(this.getTime(), 0, 180);
  }

  /**
   * Attach directly to the shared mounted spheres from src/three/sphereNetwork.ts.
   * Never spawns duplicate sphere shells, video wraps, or alternate materials.
   */
  attach(ctx: SceneContext) {
    const sharedSpheres = ctx.spheres ?? getMountedSphereInstances();
    const hqInst = getMountedSphereInstance('hq');
    const cdeInst = getMountedSphereInstance('cde');

    this.ctx = {
      ...ctx,
      spheres: sharedSpheres,
      hqShell: ctx.hqShell ?? hqInst?.shellGroup,
      cdeShell: ctx.cdeShell ?? cdeInst?.shellGroup,
      hqCore: ctx.hqCore ?? hqInst?.coreGroup,
      cdeCore: ctx.cdeCore ?? cdeInst?.coreGroup,
    };
    this.ready = true;
    this.anchors.clear();

    for (const node of SPHERE_NETWORK) {
      const inst = sharedSpheres.get(node.id);
      if (inst) {
        this.anchors.set(node.id, inst.root);
      }
    }

    ctx.scene.traverse((o) => {
      const id = o.userData?.nodeId;
      if (id && o instanceof THREE.Group && !this.anchors.has(id)) {
        this.anchors.set(id, o);
      }
    });

    this.onReady();
  }

  applyCamera(camera: THREE.PerspectiveCamera, state: any, t: number) {
    if (!this.config) return;
    let p = this.hostPoseSampler ? this.hostPoseSampler(t) : samplePose(this.config, t);
    if (this.resumeFrom) {
      const u = smoother((performance.now() - this.resumeSince) / 1400);
      p = {
        position: this.resumeFrom.position.map((x: number, i: number) =>
          THREE.MathUtils.lerp(x, p.position[i], u)
        ),
        target: this.resumeFrom.target.map((x: number, i: number) =>
          THREE.MathUtils.lerp(x, p.target[i], u)
        ),
        focalMm: THREE.MathUtils.lerp(this.resumeFrom.focalMm, p.focalMm, u),
      };
      if (u >= 1) this.resumeFrom = null;
    }
    if (this.inspectPose) p = this.inspectPose;
    camera.position.fromArray(p.position);
    camera.up.set(0, 1, 0);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(24 / (2 * p.focalMm)));
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.lookAt(new THREE.Vector3().fromArray(p.target));
    camera.updateMatrixWorld();
    const centre = new THREE.Vector3().fromArray(p.target);
    state.currentCenter.copy(centre);
    state.targetCenter.copy(centre);
    state.radius = camera.position.distanceTo(centre);
    state.targetRadius = state.radius;
    state.focalLengthMm = p.focalMm;
    state.targetFocalLengthMm = p.focalMm;
    state.flightActive = false;
    state.autoOrbit = false;
    state.activeLoopMode = 'off';
    state.cameraRollDeg = 0;
    state.targetRollDeg = 0;
    state.panOffset.set(0, 0, 0);
    state.targetPanOffset.set(0, 0, 0);
  }

  chapter(t: number) {
    return (
      this.config?.chapters.find(
        (x: any) => t * FPS >= x.startFrame && t * FPS < x.endFrameExclusive
      ) || this.config?.chapters.at(-1)
    );
  }

  preload() {
    // Shared sphere network instances and liquid glass materials are mounted by CosmographCanvas.
  }

  ensureSpherePlayback(_id: string | null) {
    // No separate spherical video-wrap meshes are spawned in intro mode.
  }

  open(id: string) {
    this.autoSuppressed = true;
    this.manualId = id;
    this.manualSince = performance.now();
    this.manualClosing = false;
    this.inspectPose = this.currentPose();
  }

  close() {
    if (!this.manualId) return;
    this.manualClosing = true;
    this.manualCloseSince = performance.now();
  }

  resume() {
    this.autoSuppressed = false;
    if (this.inspectPose) {
      this.resumeFrom = this.inspectPose;
      this.resumeSince = performance.now();
      this.inspectPose = null;
    }
    this.manualId = null;
    this.manualClosing = false;
  }

  currentPose() {
    if (!this.ctx) return samplePose(this.config, this.time());
    return {
      position: this.ctx.camera.position.toArray(),
      target: this.inspectPose?.target || samplePose(this.config, this.time()).target,
      focalMm: 12 / Math.tan(THREE.MathUtils.degToRad(this.ctx.camera.fov / 2)),
    };
  }

  /** Resolve media id for a raycast hit (inner node). */
  mediaIdForPick(nodeId: string | null | undefined): string | null {
    if (!nodeId) return null;
    return INNER_MEDIA_BY_NODE[nodeId] || null;
  }

  update = (t: number) => {
    if (!this.enabled || !this.ctx || !this.config) return;
    if (this.manualId && this.manualClosing) {
      const p = 1 - smoother((performance.now() - this.manualCloseSince) / 1000);
      if (p <= 0) {
        this.manualId = null;
        this.manualClosing = false;
      }
    }
    void this.getPlaying;
    void this.autoSuppressed;
    this.onFrame(t);
  };

  async settled() {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  detach() {
    this.hostPoseSampler = null;
    this.anchors.clear();
    this.ctx = null;
    this.ready = false;
  }
}

export const introBridge = new IntroBridge();

/** Stellar consolidation: intro must not spawn background media wraps. */
export const INTRO_SPAWN_VIDEO_WRAPS = false;
export const INTRO_SPAWN_SPHERE_WRAPS = false;
export const INTRO_SPAWN_BACKGROUND_MEDIA_DISCS = false;

export function spawnIntroBackgroundMedia(_scene?: unknown): never[] {
  return [];
}

export function assertIntroBridgeClean(): void {
  if (
    INTRO_SPAWN_VIDEO_WRAPS ||
    INTRO_SPAWN_SPHERE_WRAPS ||
    INTRO_SPAWN_BACKGROUND_MEDIA_DISCS
  ) {
    throw new Error('intro/bridge must not enable background media wraps');
  }
  if (spawnIntroBackgroundMedia().length !== 0) {
    throw new Error('intro/bridge must spawn zero media wraps');
  }
}

