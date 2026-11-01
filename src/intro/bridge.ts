import * as THREE from 'three';
import {
  createEquatorialVideoBandGeometry,
  createPortalDiskGeometry,
  createSphericalVideoShellGeometry,
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
  hqShell?: THREE.Object3D;
  cdeShell?: THREE.Object3D;
  hqCore?: THREE.Object3D;
  cdeCore?: THREE.Object3D;
};

type IntroMediaEntry = {
  el?: HTMLVideoElement;
  texture: THREE.Texture;
  asset: any;
  aspect: number;
};

type InnerSphereMedia = {
  nodeId: string;
  mediaId: string;
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  parent: THREE.Object3D;
};

const HQ_CENTER = new THREE.Vector3(0, 0, 0);
const CDE_CENTER = new THREE.Vector3(38, 4, -22);
const SHELL_RADIUS = 5.92;
const WRAP_RADIUS = 5.9;
const PORTAL_RADIUS = 5.05;

/** Default video plate for interactive inner cores / beads. */
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

const WRAP_MEDIA_IDS = new Set(['showreel', 'production', 'laliga', 'tarek', 'young-human', 'el-batron']);

const videoFrag = `
  uniform sampler2D map;
  uniform float alpha;
  uniform float circularMask;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, vUv);
    float radial = 1.0 - smoothstep(0.46, 0.5, length(vUv - 0.5));
    float edge = 1.0 - smoothstep(0.94, 1.0, abs(vUv.y - 0.5) * 2.0);
    float mask = mix(edge, radial, circularMask);
    float a = c.a * alpha * mask;
    if (a < 0.004) discard;
    gl_FragColor = vec4(c.rgb, a);
    #include <colorspace_fragment>
  }
`;
const videoVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

function makeVideoMat(circularMask: number, side: THREE.Side) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null },
      alpha: { value: 0 },
      circularMask: { value: circularMask },
    },
    vertexShader: videoVert,
    fragmentShader: videoFrag,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side,
    toneMapped: false,
  });
}

/**
 * Spherical intro media surface:
 * - full curved wrap shell (SphereGeometry) — primary, fixes flattened showreel
 * - equatorial band accent
 * - optional portal disk (de-emphasized; hidden for wrap-first plates like showreel)
 */
function createSphereContainedMediaGroup(): {
  root: THREE.Group;
  wrap: THREE.Mesh;
  band: THREE.Mesh;
  portal: THREE.Mesh;
  wrapMat: THREE.ShaderMaterial;
  bandMat: THREE.ShaderMaterial;
  portalMat: THREE.ShaderMaterial;
  dispose: () => void;
} {
  const root = new THREE.Group();
  root.name = 'intro-sphere-media';

  const wrapMat = makeVideoMat(0, THREE.BackSide);
  const bandMat = makeVideoMat(0, THREE.BackSide);
  const portalMat = makeVideoMat(1, THREE.DoubleSide);

  const wrapGeo = createSphericalVideoShellGeometry(WRAP_RADIUS, 16 / 9, 96, 64);
  const wrap = new THREE.Mesh(wrapGeo, wrapMat);
  wrap.name = 'intro-spherical-video-wrap';
  wrap.renderOrder = 3;
  wrap.visible = false;
  wrap.scale.setScalar(0.998);
  root.add(wrap);

  const bandGeo = createEquatorialVideoBandGeometry(SHELL_RADIUS, 16 / 9, 96, 36);
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.name = 'intro-equator-video-band';
  band.renderOrder = 3;
  band.visible = false;
  band.scale.setScalar(0.995);
  root.add(band);

  const portalGeo = createPortalDiskGeometry(PORTAL_RADIUS, 16 / 9, 72);
  const portal = new THREE.Mesh(portalGeo, portalMat);
  portal.name = 'intro-media-portal-disk';
  portal.renderOrder = 3;
  portal.visible = false;
  portal.rotation.set(0.18, -0.24, 0.08);
  portal.position.set(0, 0, 0.12);
  root.add(portal);

  return {
    root,
    wrap,
    band,
    portal,
    wrapMat,
    bandMat,
    portalMat,
    dispose: () => {
      wrapGeo.dispose();
      bandGeo.dispose();
      portalGeo.dispose();
      wrapMat.dispose();
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
  private videoHost: HTMLDivElement | null = null;
  private currentId = '';
  private anchors = new Map<string, THREE.Object3D>();
  private autoSuppressed = false;
  private hiddenLenses: THREE.Object3D[] = [];
  private activeShell: THREE.Object3D | null = null;
  private innerSpheres: InnerSphereMedia[] = [];
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

  private ensureVideoHost() {
    if (this.videoHost && document.body.contains(this.videoHost)) return this.videoHost;
    const host = document.createElement('div');
    host.id = 'intro-video-host';
    host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, {
      position: 'fixed',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      left: '0',
      top: '0',
      zIndex: '-1',
    });
    document.body.appendChild(host);
    this.videoHost = host;
    return host;
  }

  private hideStaticMediaLenses(scene: THREE.Scene) {
    this.hiddenLenses = [];
    scene.traverse((o) => {
      if (o.name === 'hq-media-lens' || o.name === 'cde-media-lens') {
        o.visible = false;
        this.hiddenLenses.push(o);
      }
    });
  }

  private mountMediaIntoShell(shell: THREE.Object3D | null | undefined, fallbackCenter: THREE.Vector3) {
    if (!this.mediaGroup || !this.ctx) return;
    const root = this.mediaGroup.root;
    if (root.parent) root.parent.remove(root);
    if (shell) {
      root.position.set(0, 0, 0);
      shell.add(root);
      this.activeShell = shell;
    } else {
      root.position.copy(fallbackCenter);
      this.ctx.scene.add(root);
      this.activeShell = null;
    }
  }

  /**
   * Wrap interactive inner cores / node spheres with their own curved video plates.
   * Click/tap uses existing Cosmograph raycasts (userData.nodeId) → CerebroIntro.selectNode.
   */
  private mountInnerSphereMedia(ctx: SceneContext) {
    this.disposeInnerSpheres();
    const candidates: { nodeId: string; parent: THREE.Object3D; radius: number }[] = [];

    const consider = (obj: THREE.Object3D | undefined | null, fallbackId: string, radius: number) => {
      if (!obj) return;
      const nodeId = (obj.userData?.nodeId as string) || fallbackId;
      const mediaId = INNER_MEDIA_BY_NODE[nodeId];
      if (!mediaId) return;
      candidates.push({ nodeId, parent: obj, radius });
    };

    consider(ctx.hqCore, 'core-hq', 0.72);
    consider(ctx.cdeCore, 'core-cde', 0.72);

    ctx.scene.traverse((o) => {
      if (!(o instanceof THREE.Group)) return;
      const nodeId = o.userData?.nodeId as string | undefined;
      if (!nodeId || !INNER_MEDIA_BY_NODE[nodeId]) return;
      if (nodeId === 'core-hq' || nodeId === 'core-cde') return;
      // Station / project groups — wrap at a readable interactive size.
      candidates.push({ nodeId, parent: o, radius: 0.55 });
    });

    const seen = new Set<string>();
    for (const c of candidates) {
      if (seen.has(c.nodeId)) continue;
      seen.add(c.nodeId);
      const mediaId = INNER_MEDIA_BY_NODE[c.nodeId];
      if (!mediaId) continue;
      const mat = makeVideoMat(0, THREE.FrontSide);
      const geo = createSphericalVideoShellGeometry(c.radius, 16 / 9, 48, 32);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `intro-inner-media-${c.nodeId}`;
      mesh.renderOrder = 3;
      mesh.userData = {
        nodeId: c.nodeId,
        nodeType: c.nodeId.startsWith('core-') ? 'core' : 'station',
        sphere: c.nodeId.includes('cde') ? 'cde' : 'hq',
        introMediaId: mediaId,
        introInteractive: true,
      };
      // Inherit pickability onto the wrap mesh.
      c.parent.add(mesh);
      this.innerSpheres.push({ nodeId: c.nodeId, mediaId, mesh, mat, parent: c.parent });
      // Warm the assigned clip so taps play immediately.
      this.getAsset(mediaId);
    }
  }

  private disposeInnerSpheres() {
    for (const inner of this.innerSpheres) {
      inner.parent.remove(inner.mesh);
      inner.mesh.geometry.dispose();
      inner.mat.dispose();
    }
    this.innerSpheres = [];
  }

  attach(ctx: SceneContext) {
    this.ctx = ctx;
    this.ready = true;
    ctx.scene.traverse((o) => {
      const id = o.userData?.nodeId;
      if (id && o instanceof THREE.Group && !this.anchors.has(id)) this.anchors.set(id, o);
    });

    const stale = ctx.scene.getObjectByName('intro-sphere-media');
    if (stale?.parent) stale.parent.remove(stale);

    this.mediaGroup = createSphereContainedMediaGroup();
    this.hideStaticMediaLenses(ctx.scene);
    this.mountMediaIntoShell(ctx.hqShell, HQ_CENTER);
    this.mountInnerSphereMedia(ctx);
    this.ensureVideoHost();
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
    if (a.type !== 'video') return null;
    const el = document.createElement('video');
    el.muted = true;
    el.defaultMuted = true;
    el.autoplay = true;
    el.playsInline = true;
    el.preload = 'auto';
    el.loop = false;
    el.crossOrigin = 'anonymous';
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    el.setAttribute('autoplay', '');
    el.src = new URL(a.src, document.baseURI).href;
    this.ensureVideoHost().appendChild(el);
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
    const kick = () => {
      el.muted = true;
      el.play().catch(() => {});
    };
    el.addEventListener('loadeddata', kick);
    el.addEventListener('canplay', kick);
    this.media.set(id, m);
    return m;
  }

  preload() {
    for (const [id, a] of Object.entries(this.config.assets || {})) {
      if ((a as { type?: string; src?: string }).type === 'video' && (a as { src?: string }).src) {
        this.getAsset(id);
      }
    }
  }

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

  /** Resolve media id for a raycast hit (inner wrap or node). */
  mediaIdForPick(nodeId: string | null | undefined): string | null {
    if (!nodeId) return null;
    return INNER_MEDIA_BY_NODE[nodeId] || null;
  }

  update = (t: number) => {
    if (!this.ctx || !this.config || !this.mediaGroup) return;
    const ch = this.chapter(t);
    const frame = t * FPS;
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
      p = Math.max(p, 0.35);
    }

    const media = id ? this.getAsset(id) : null;
    if (this.currentId !== (id || '')) {
      for (const [other, m] of this.media) {
        if (other !== id && m.el) {
          // Keep inner-sphere loops alive; only pause non-active timeline clips that aren't bound to inners.
          const boundInner = this.innerSpheres.some((s) => s.mediaId === other);
          if (!boundInner) m.el.pause();
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

    const wantCde = t >= 126;
    const targetShell = wantCde ? this.ctx.cdeShell : this.ctx.hqShell;
    const fallback = wantCde ? CDE_CENTER : HQ_CENTER;
    if (targetShell !== this.activeShell) {
      this.mountMediaIntoShell(targetShell, fallback);
    } else if (!this.activeShell) {
      this.mediaGroup.root.position.copy(fallback);
    }

    const show = !!media && p > 0.001;
    // Showreel / primary plates: curved wrap is the hero. Flat portal stays off so it never flattens the read.
    const useFullWrap = !!id && WRAP_MEDIA_IDS.has(id);
    this.mediaGroup.wrap.visible = show && useFullWrap;
    this.mediaGroup.band.visible = show;
    this.mediaGroup.portal.visible = show && !useFullWrap;

    if (media && show) {
      const alpha = smoother(Math.max(p, 0.5) * 2);
      this.mediaGroup.wrap.scale.setScalar(0.998);
      this.mediaGroup.band.scale.setScalar(0.995);
      this.mediaGroup.portal.scale.setScalar(1);

      this.mediaGroup.wrapMat.uniforms.map.value = media.texture;
      this.mediaGroup.wrapMat.uniforms.alpha.value = alpha * (id === 'showreel' ? 0.92 : 0.82);
      this.mediaGroup.bandMat.uniforms.map.value = media.texture;
      this.mediaGroup.bandMat.uniforms.alpha.value = alpha * (useFullWrap ? 0.35 : 0.72);
      this.mediaGroup.portalMat.uniforms.map.value = media.texture;
      this.mediaGroup.portalMat.uniforms.alpha.value = alpha * 0.55;

      media.texture.needsUpdate = true;
      if (media.el && media.el.paused) {
        media.el.muted = true;
        media.el.play().catch(() => {});
      }
    } else {
      this.mediaGroup.wrap.visible = false;
      this.mediaGroup.band.visible = false;
      this.mediaGroup.portal.visible = false;
    }

    // Drive each interactive inner sphere with its own video plate.
    for (const inner of this.innerSpheres) {
      const m = this.getAsset(inner.mediaId);
      const active = this.manualId === inner.mediaId || id === inner.mediaId;
      if (!m) {
        inner.mesh.visible = false;
        continue;
      }
      inner.mesh.visible = true;
      inner.mat.uniforms.map.value = m.texture;
      inner.mat.uniforms.alpha.value = active ? 0.95 : 0.55;
      m.texture.needsUpdate = true;
      if (m.el) {
        m.el.muted = true;
        // Inner plates loop quietly so taps always show motion.
        m.el.loop = true;
        if (m.el.paused) m.el.play().catch(() => {});
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
      m.el?.remove();
      m.texture.dispose();
    }
    this.hostPoseSampler = null;
    this.media.clear();
    this.anchors.clear();
    for (const lens of this.hiddenLenses) lens.visible = true;
    this.hiddenLenses = [];
    this.disposeInnerSpheres();
    if (this.mediaGroup) {
      if (this.mediaGroup.root.parent) this.mediaGroup.root.parent.remove(this.mediaGroup.root);
      this.mediaGroup.dispose();
    }
    this.mediaGroup = null;
    this.activeShell = null;
    this.videoHost?.remove();
    this.videoHost = null;
    this.ctx = null;
    this.ready = false;
  }
}

export const introBridge = new IntroBridge();
