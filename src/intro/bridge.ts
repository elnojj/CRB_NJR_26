import * as THREE from 'three';
import {
  createEquatorialVideoBandGeometry,
  createPortalDiskGeometry,
} from '../lib/sphereVideoTexture';

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

type SceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

type IntroMediaEntry = {
  el?: HTMLVideoElement;
  texture: THREE.Texture;
  asset: any;
  aspect: number;
};

const HQ_CENTER = new THREE.Vector3(0, 0, 0);
const CDE_CENTER = new THREE.Vector3(38, 4, -22);
const SHELL_RADIUS = 5.92;
const PORTAL_RADIUS = 5.05;

/**
 * Spherical intro media surface:
 * - equatorial shell band (curved SphereGeometry band — no polar pinch)
 * - circular portal disk (CircleGeometry — soft circular mask, never a square plate)
 * Parent group sits at HQ/CDE centre so media stays contained inside the glass sphere.
 */
function createSphereContainedMediaGroup(): {
  root: THREE.Group;
  band: THREE.Mesh;
  portal: THREE.Mesh;
  bandMat: THREE.ShaderMaterial;
  portalMat: THREE.ShaderMaterial;
  dispose: () => void;
} {
  const root = new THREE.Group();
  root.name = 'intro-sphere-media';

  // Soft circular / band alpha so rectangular video bounds never show.
  const fragmentShader = `
    uniform sampler2D map;
    uniform float alpha;
    uniform float aspect;
    uniform float circularMask;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      // Aspect-correct contain: letterbox/pillarbox inside the sphere UVs.
      float frameAspect = max(0.01, aspect);
      vec2 mapped = uv - 0.5;
      if (frameAspect > 1.0) {
        mapped.y *= frameAspect;
      } else {
        mapped.x /= frameAspect;
      }
      mapped += 0.5;
      float inside = step(0.0, mapped.x) * step(mapped.x, 1.0) * step(0.0, mapped.y) * step(mapped.y, 1.0);
      vec4 c = texture2D(map, clamp(mapped, 0.0, 1.0));

      // Soft circular aperture when circularMask=1 (portal disk); band uses edge feather only.
      float radial = 1.0 - smoothstep(0.46, 0.5, length(uv - 0.5));
      float mask = mix(1.0, radial, circularMask);
      float a = c.a * alpha * inside * mask;
      if (a < 0.004) discard;
      gl_FragColor = vec4(c.rgb, a);
      #include <colorspace_fragment>
    }
  `;
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const makeMat = (circularMask: number) =>
    new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null },
        alpha: { value: 0 },
        aspect: { value: 16 / 9 },
        circularMask: { value: circularMask },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

  const bandMat = makeMat(0);
  const portalMat = makeMat(1);

  const bandGeo = createEquatorialVideoBandGeometry(SHELL_RADIUS, 16 / 9, 96, 36);
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.name = 'intro-equator-video-band';
  band.renderOrder = 4;
  band.visible = false;
  // BackSide reads from inside the glass shell; DoubleSide already set — keep slight inset.
  band.scale.setScalar(0.995);
  root.add(band);

  const portalGeo = createPortalDiskGeometry(PORTAL_RADIUS, 16 / 9, 72);
  const portal = new THREE.Mesh(portalGeo, portalMat);
  portal.name = 'intro-media-portal-disk';
  portal.renderOrder = 5;
  portal.visible = false;
  // Match recessed media portal aperture orientation in CosmographCanvas buildSphereAssembly.
  portal.rotation.set(0.18, -0.24, 0.08);
  portal.position.set(0, 0, 0.12);
  root.add(portal);

  return {
    root,
    band,
    portal,
    bandMat,
    portalMat,
    dispose: () => {
      bandGeo.dispose();
      portalGeo.dispose();
      bandMat.dispose();
      portalMat.dispose();
    },
  };
}

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
  private media = new Map<string, IntroMediaEntry>();
  private mediaGroup: ReturnType<typeof createSphereContainedMediaGroup> | null = null;
  private currentId = '';
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

  attach(ctx: SceneContext) {
    this.ctx = ctx;
    this.ready = true;
    ctx.scene.traverse((o) => {
      const id = o.userData?.nodeId;
      if (id && o instanceof THREE.Group && !this.anchors.has(id)) this.anchors.set(id, o);
    });

    // Remove any previous rectangular portal leftovers if hot-reloaded.
    const stale = ctx.scene.getObjectByName('intro-sphere-media');
    if (stale) ctx.scene.remove(stale);

    this.mediaGroup = createSphereContainedMediaGroup();
    // Default at HQ; update() repositions to CDE after t>=126.
    this.mediaGroup.root.position.copy(HQ_CENTER);
    ctx.scene.add(this.mediaGroup.root);
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

  private getAsset(id: string): IntroMediaEntry | null {
    if (this.media.has(id)) return this.media.get(id)!;
    const a = this.config.assets[id];
    if (!a?.src) return null;
    // Sphere surface is video-only — never mount still images onto the shell.
    if (a.type !== 'video') return null;
    const el = document.createElement('video');
    el.muted = true;
    el.defaultMuted = true;
    el.autoplay = true;
    el.playsInline = true;
    el.preload = 'auto';
    // One pass per beat — the timeline cuts to the next script-matched clip.
    el.loop = false;
    el.crossOrigin = 'anonymous';
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    el.setAttribute('autoplay', '');
    el.src = new URL(a.src, document.baseURI).href;
    el.load();
    const texture = new THREE.VideoTexture(el);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const m: IntroMediaEntry = { el, texture, asset: a, aspect: 16 / 9 };
    el.addEventListener('loadedmetadata', () => {
      if (el.videoWidth > 0 && el.videoHeight > 0) m.aspect = el.videoWidth / el.videoHeight;
    });
    this.media.set(id, m);
    return m;
  }

  preload() {
    // Preload every video asset so script cuts can start immediately.
    for (const [id, a] of Object.entries(this.config.assets || {})) {
      if ((a as { type?: string; src?: string }).type === 'video' && (a as { src?: string }).src) {
        this.getAsset(id);
      }
    }
  }

  /** Force-play the active sphere video (muted) — does not wait for Begin. */
  ensureSpherePlayback(id: string | null) {
    if (!id) return;
    const media = this.getAsset(id);
    if (!media?.el) return;
    media.el.muted = true;
    if (media.el.paused) media.el.play().catch(() => {});
  }

  open(id: string) {
    this.autoSuppressed = true;
    const m = this.getAsset(id);
    if (m?.el && m.el.readyState >= 1) m.el.currentTime = 0;
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

  update = (t: number) => {
    if (!this.ctx || !this.config || !this.mediaGroup) return;
    const ch = this.chapter(t);
    const frame = t * FPS;
    // Script-driven cut list: chapter.mediaId / sphereVideo → one video per beat.
    let id: string | null =
      this.manualId ||
      (this.autoSuppressed ? null : ch.sphereVideo || ch.mediaId || null);
    let p = 0;
    if (this.manualId) {
      p = smoother((performance.now() - this.manualSince) / 1500);
      if (this.manualClosing) {
        p = 1 - smoother((performance.now() - this.manualCloseSince) / 1000);
        if (p <= 0) {
          this.manualId = null;
          this.manualClosing = false;
        }
      }
    } else if (id) {
      const open = ch.mediaOpenFrame ?? ch.startFrame;
      const close = ch.mediaCloseFrame ?? ch.endFrameExclusive - 1;
      const openFrames = this.config.motion?.media?.openFrames || 90;
      const closeFrames = this.config.motion?.media?.closeFrames || 60;
      p = smoother((frame - open) / openFrames) * (1 - smoother((frame - close) / closeFrames));
      // Keep a visible floor so the sphere stays live across the whole beat.
      p = Math.max(p, 0.35);
    }

    const media = id ? this.getAsset(id) : null;
    if (this.currentId !== (id || '')) {
      // Hard cut: pause prior clip, rewind and start the next one-pass video.
      for (const [other, m] of this.media) {
        if (other !== id && m.el) {
          m.el.pause();
        }
      }
      if (media?.el) {
        try {
          media.el.currentTime = 0;
        } catch {
          /* seek may fail before metadata */
        }
        media.el.loop = false;
        media.el.muted = true;
        media.el.play().catch(() => {});
      }
      this.currentId = id || '';
    }

    const centre = t >= 126 ? CDE_CENTER : HQ_CENTER;
    this.mediaGroup.root.position.copy(centre);

    const show = !!media && p > 0.001;
    this.mediaGroup.band.visible = show;
    this.mediaGroup.portal.visible = show;

    if (media && show) {
      const alpha = smoother(Math.max(p, 0.5) * 2);
      const pulse = 0.96 + 0.04 * p;
      this.mediaGroup.band.scale.setScalar(0.995 * pulse);
      this.mediaGroup.portal.scale.setScalar(pulse);

      for (const mat of [this.mediaGroup.bandMat, this.mediaGroup.portalMat]) {
        mat.uniforms.map.value = media.texture;
        mat.uniforms.alpha.value = alpha * (mat === this.mediaGroup.bandMat ? 0.55 : 0.92);
        mat.uniforms.aspect.value = media.aspect || 16 / 9;
      }

      // Keep the active one-pass clip playing inside the sphere even before Begin (muted).
      if (media.el && media.el.paused) {
        media.el.muted = true;
        media.el.play().catch(() => {});
      }
    }

    this.onFrame(t);
  };

  async settled() {
    await document.fonts.ready;
    const promises: Promise<unknown>[] = [];
    for (const m of this.media.values()) {
      if (m.el?.seeking) {
        promises.push(new Promise((r) => m.el!.addEventListener('seeked', r, { once: true })));
      }
    }
    await Promise.all(promises);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  detach() {
    for (const m of this.media.values()) {
      m.el?.pause();
      m.texture.dispose();
    }
    this.hostPoseSampler = null;
    this.media.clear();
    this.anchors.clear();
    if (this.mediaGroup && this.ctx) {
      this.ctx.scene.remove(this.mediaGroup.root);
      this.mediaGroup.dispose();
    }
    this.mediaGroup = null;
    this.ctx = null;
    this.ready = false;
  }
}

export const introBridge = new IntroBridge();
