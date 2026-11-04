/**
 * Curved media aperture — maps a film or still onto the inner far wall of a sphere shell,
 * so media is seen through the glass inside the shared Cosmograph scene (no DOM card).
 */
import * as THREE from 'three';

export type CurvedMediaKind = 'video' | 'image';

export type CurvedMediaApertureOptions = {
  src: string;
  kind: CurvedMediaKind;
  center: THREE.Vector3;
  shellRadius: number;
  /** Portrait apertures are taller than wide; film apertures are wide. */
  shape: 'portrait' | 'film';
  /** 0 = centre crop, 1 = keep the top of the frame (faces). */
  focalBiasY?: number;
  onReady?: () => void;
  onError?: () => void;
};

export type CurvedMediaAperture = {
  object: THREE.Group;
  video: HTMLVideoElement | null;
  /** Reveal factor 0..1 drives opacity and a slight scale settle. */
  setReveal: (k: number) => void;
  /** Keep the aperture on the shell wall opposite the camera. */
  face: (cameraPosition: THREE.Vector3) => void;
  isReady: () => boolean;
  dispose: () => void;
};

const SHAPES = {
  portrait: { phiLength: 0.95, thetaLength: 1.2 },
  film: { phiLength: 1.55, thetaLength: 0.88 },
} as const;

export function createCurvedMediaAperture(opts: CurvedMediaApertureOptions): CurvedMediaAperture {
  const { phiLength, thetaLength } = SHAPES[opts.shape];
  const radius = opts.shellRadius * 0.9;
  const geometry = new THREE.SphereGeometry(
    radius,
    48,
    32,
    Math.PI / 2 - phiLength / 2,
    phiLength,
    Math.PI / 2 - thetaLength / 2,
    thetaLength
  );
  // Viewed from inside the shell the far wall is mirrored; flip U so text and faces read correctly.
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  uv.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'curved-media-aperture';
  mesh.renderOrder = -1;

  const group = new THREE.Group();
  group.name = 'curved-media-aperture-root';
  group.position.copy(opts.center);
  group.add(mesh);

  const capAspect = (phiLength * Math.sin(Math.PI / 2)) / thetaLength;
  const focalBiasY = opts.focalBiasY ?? 0.5;
  let ready = false;
  let disposed = false;
  let texture: THREE.Texture | null = null;
  let video: HTMLVideoElement | null = null;

  const fitCover = (tex: THREE.Texture, w: number, h: number) => {
    if (!w || !h) return;
    const mediaAspect = w / h;
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    if (mediaAspect > capAspect) {
      tex.repeat.x = capAspect / mediaAspect;
      tex.offset.x = (1 - tex.repeat.x) / 2;
    } else {
      tex.repeat.y = mediaAspect / capAspect;
      tex.offset.y = (1 - tex.repeat.y) * focalBiasY;
    }
    tex.needsUpdate = true;
  };

  const markReady = () => {
    if (disposed || ready) return;
    ready = true;
    opts.onReady?.();
  };

  if (opts.kind === 'video') {
    video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.src = opts.src;
    const vt = new THREE.VideoTexture(video);
    vt.colorSpace = THREE.SRGBColorSpace;
    vt.minFilter = THREE.LinearFilter;
    vt.magFilter = THREE.LinearFilter;
    vt.generateMipmaps = false;
    texture = vt;
    material.map = vt;
    const onData = () => {
      if (!video) return;
      fitCover(vt, video.videoWidth, video.videoHeight);
      markReady();
    };
    video.addEventListener('loadeddata', onData, { once: true });
    video.addEventListener('error', () => opts.onError?.(), { once: true });
    void video.play().catch(() => {
      /* muted autoplay can still be deferred; the texture starts when frames decode */
    });
  } else {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      opts.src,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        texture = tex;
        material.map = tex;
        material.needsUpdate = true;
        const img = tex.image as { width?: number; height?: number } | undefined;
        fitCover(tex, img?.width || 1, img?.height || 1);
        markReady();
      },
      undefined,
      () => opts.onError?.()
    );
  }

  const lookTarget = new THREE.Vector3();

  return {
    object: group,
    video,
    setReveal(k: number) {
      const r = THREE.MathUtils.clamp(k, 0, 1);
      material.opacity = ready ? 0.96 * r : 0;
      const s = 0.94 + 0.06 * r;
      mesh.scale.setScalar(s);
    },
    face(cameraPosition: THREE.Vector3) {
      lookTarget.copy(opts.center).multiplyScalar(2).sub(cameraPosition);
      group.lookAt(lookTarget);
    },
    isReady: () => ready,
    dispose() {
      disposed = true;
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    },
  };
}
