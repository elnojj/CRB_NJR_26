import * as THREE from 'three';

import {
  getSphereTextureAsset,
  resolveAssetPlaybackUrl,
  type DriveMediaAsset,
} from '../data/driveMediaCatalog';
import { resolveVerifiedProjectVideoUrl } from '../data/projectWorldMedia';

export type SphereVideoHandle = {
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
  portalMesh: THREE.Mesh;
  shellBandMesh: THREE.Mesh;
  wrapMesh?: THREE.Mesh;
  dispose: () => void;
  setSourceUrl: (url: string) => void;
  bindMaterial: (mat: THREE.MeshBasicMaterial | THREE.MeshPhysicalMaterial) => void;
};

/**
 * Ambient plates for project / station node shells.
 * These keep nodes lit; they are NOT project-credit masters.
 * Verified showreels (e.g. El Batron Wix) win when present in the catalog binding.
 */
export const PROJECT_MEDIA_SRC: Record<string, string> = {
  SEVEN: '/assets/media/production.mp4',
  YAH: '/assets/media/young-human.mp4',
  MHE: '/assets/media/tarek.mp4',
  BSOCIAL: '/assets/media/young-human.mp4',
  'AL-AHRAM': '/assets/media/production.mp4',
  'MUSEUM-OF-ALMOST': '/assets/media/showreel.mp4',
  'EL-BATRON': '/assets/media/el-batron.mp4',
  GONDWANA: '/assets/media/laliga.mp4',
};

export function resolveProjectMediaSrc(projectId: string): string {
  const verified = resolveVerifiedProjectVideoUrl(projectId);
  if (verified) return verified;
  return PROJECT_MEDIA_SRC[projectId] || '/assets/media/showreel.mp4';
}

export type NodeVideoHandle = {
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
  mesh: THREE.Mesh;
  dispose: () => void;
};

/**
 * Builds a latitudinal sphere band whose UV V span matches a 16:9 plate.
 * Using phiStart/phiLength avoids polar pinch distortion from full-sphere UVs.
 */
export function createEquatorialVideoBandGeometry(
  radius: number,
  aspect = 16 / 9,
  widthSegments = 96,
  heightSegments = 48
): THREE.SphereGeometry {
  const halfV = Math.atan(1 / aspect);
  const phiLength = THREE.MathUtils.clamp(halfV * 2 * 1.08, Math.PI * 0.28, Math.PI * 0.72);
  const phiStart = (Math.PI - phiLength) / 2;
  const geo = new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments,
    0,
    Math.PI * 2,
    phiStart,
    phiLength
  );

  // Re-normalize UVs so the full 16:9 frame maps onto the band without stretch at the seams.
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    // Keep U cyclic; squeeze V slightly toward center to letterbox extreme edges.
    const vCentered = 0.5 + (v - 0.5) * 0.96;
    uv.setXY(i, u, THREE.MathUtils.clamp(vCentered, 0, 1));
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Near-full spherical shell for wrapping a 16:9 video plate onto curved glass.
 * Uses full longitude and a tall latitude span so the frame reads as wrapped
 * volume, not a flat portal disk. V is letterboxed to the plate aspect so poles
 * feather out instead of pinching the image.
 */
export function createSphericalVideoShellGeometry(
  radius: number,
  aspect = 16 / 9,
  widthSegments = 96,
  heightSegments = 64
): THREE.SphereGeometry {
  // Cover most of the sphere; leave tiny polar caps so the plate doesn't singularity-stretch.
  const phiLength = Math.PI * 0.92;
  const phiStart = (Math.PI - phiLength) / 2;
  const geo = new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments,
    0,
    Math.PI * 2,
    phiStart,
    phiLength
  );

  const uv = geo.attributes.uv;
  const vSpan = 1 / Math.max(aspect, 1);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    // Keep U around the equator; compress V into a 16:9 band centered on the sphere.
    const vMapped = 0.5 + (v - 0.5) * vSpan * 1.02;
    uv.setXY(i, u, THREE.MathUtils.clamp(vMapped, 0, 1));
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Flat portal disk with aspect-correct UVs (letterboxed 16:9 inside a unit circle).
 * Prevents circular crop stretch of the video plate inside the media aperture rim.
 */
export function createPortalDiskGeometry(
  radius: number,
  aspect = 16 / 9,
  segments = 64
): THREE.CircleGeometry {
  const geo = new THREE.CircleGeometry(radius, segments);
  const uv = geo.attributes.uv;
  const invAspect = 1 / aspect;

  for (let i = 0; i < uv.count; i++) {
    // CircleGeometry UVs are [0,1] across the disk. Remap so 16:9 content
    // fits with horizontal letterboxing inside the circle.
    let u = uv.getX(i);
    let v = uv.getY(i);
    u = 0.5 + (u - 0.5);
    v = 0.5 + (v - 0.5) * invAspect;
    uv.setXY(i, THREE.MathUtils.clamp(u, 0, 1), THREE.MathUtils.clamp(v, 0, 1));
  }
  uv.needsUpdate = true;
  return geo;
}

/** Ice plate used when Drive/local video 404s or texImage2D fails — never leave empty shells. */
export const SPHERE_MEDIA_FALLBACK_PLATE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <radialGradient id="g" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stop-color="#243848"/>
          <stop offset="55%" stop-color="#142632"/>
          <stop offset="100%" stop-color="#05090E"/>
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#g)"/>
      <circle cx="640" cy="360" r="210" fill="none" stroke="#B4DDFF" stroke-opacity="0.28" stroke-width="2"/>
      <circle cx="640" cy="360" r="140" fill="none" stroke="#9AFFE0" stroke-opacity="0.22" stroke-width="1.5"/>
    </svg>`
  );

function createFallbackTexture(url: string = SPHERE_MEDIA_FALLBACK_PLATE): THREE.Texture {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createVideoElement(src: string): HTMLVideoElement {
  const video = document.createElement('video');
  // Muted + playsInline + loop is required for autoplay without a user gesture.
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.autoplay = true;
  // Workspace ambient plate may loop; intro sequence uses introBridge (one-pass cuts).
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  // Same-origin /media paths must not force CORS; only mark cross-origin for remotes.
  const host =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : '';
  if (/^https?:\/\//i.test(src) && host && !src.includes(host)) {
    video.crossOrigin = 'anonymous';
  }
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('autoplay', '');
  video.src = src;
  return video;
}

function isTransientPlayRejection(err: unknown): boolean {
  const name =
    err && typeof err === 'object' && 'name' in err
      ? String((err as { name?: string }).name)
      : '';
  // iPad / AI Studio often reject the first muted play() before a gesture, or abort mid-load.
  return name === 'NotAllowedError' || name === 'AbortError' || name === 'NotSupportedError';
}

function attachVideoKeepAlive(video: HTMLVideoElement, tryPlay: () => void) {
  video.addEventListener('loadeddata', tryPlay);
  video.addEventListener('canplay', tryPlay);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && video.paused) tryPlay();
  });
  const unlock = () => tryPlay();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  tryPlay();
  const keepAlive = window.setInterval(() => {
    if (video.paused && !document.hidden) tryPlay();
  }, 1500);
  (video as HTMLVideoElement & {
    __sphereKeepAlive?: number;
    __sphereUnlock?: () => void;
  }).__sphereKeepAlive = keepAlive;
  (video as HTMLVideoElement & { __sphereUnlock?: () => void }).__sphereUnlock = () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };
}

/**
 * World-shell video: curved spherical wrap + equatorial band.
 * Flat CircleGeometry portal disks are intentionally not mounted.
 */
export function mountSphereVideoTexture(options: {
  parent: THREE.Object3D;
  asset?: DriveMediaAsset;
  sourceUrl?: string;
  /** Optional still shown while video buffers / if decode fails (preferred over ice SVG). */
  posterUrl?: string | null;
  /** When true, skip video and mount ice plate only (no invented project footage). */
  iceOnly?: boolean;
  portalRadius?: number;
  shellBandRadius?: number;
  wrapRadius?: number;
  namePrefix?: string;
}): SphereVideoHandle {
  const asset = options.asset ?? getSphereTextureAsset();
  const initialUrl = options.iceOnly
    ? SPHERE_MEDIA_FALLBACK_PLATE
    : options.sourceUrl || resolveAssetPlaybackUrl(asset);
  const posterUrl = options.posterUrl ?? asset.poster ?? null;
  const video = createVideoElement(options.iceOnly ? '' : initialUrl);
  const prefix = options.namePrefix || 'sphere';

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // Curved hero wrap — replaces the old flat portal disk.
  const wrapGeo = createSphericalVideoShellGeometry(
    options.wrapRadius ?? options.shellBandRadius ?? 5.9,
    16 / 9,
    96,
    64
  );
  const wrapMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    toneMapped: false,
  });
  const wrapMesh = new THREE.Mesh(wrapGeo, wrapMat);
  wrapMesh.name = `${prefix}-spherical-video-wrap`;
  wrapMesh.renderOrder = 3;
  wrapMesh.scale.setScalar(0.998);
  options.parent.add(wrapMesh);

  // Keep a tiny invisible portal mesh reference for API compatibility (not added to scene).
  const portalGeo = createPortalDiskGeometry(options.portalRadius ?? 5.05, 16 / 9, 8);
  const portalMat = new THREE.MeshBasicMaterial({ visible: false });
  const portalMesh = new THREE.Mesh(portalGeo, portalMat);
  portalMesh.name = `${prefix}-media-portal-video-unused`;
  portalMesh.visible = false;

  const bandGeo = createEquatorialVideoBandGeometry(
    options.shellBandRadius ?? 5.88,
    16 / 9,
    96,
    36
  );
  const bandMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    toneMapped: false,
  });
  const shellBandMesh = new THREE.Mesh(bandGeo, bandMat);
  shellBandMesh.name = `${prefix}-equator-video-band`;
  shellBandMesh.renderOrder = 2;
  options.parent.add(shellBandMesh);

  let fallbackTexture: THREE.Texture | null = null;
  let usingFallback = false;
  let playRejectStreak = 0;
  let softPosterMounted = false;
  const boundMaterials: Array<THREE.MeshBasicMaterial | THREE.MeshPhysicalMaterial> = [];

  const applyMapToShells = (map: THREE.Texture) => {
    wrapMat.map = map;
    bandMat.map = map;
    wrapMat.needsUpdate = true;
    bandMat.needsUpdate = true;
    for (const mat of boundMaterials) {
      mat.map = map;
      if (mat instanceof THREE.MeshPhysicalMaterial) {
        mat.emissiveMap = map;
      }
      mat.needsUpdate = true;
    }
  };

  const mountSoftPoster = () => {
    if (softPosterMounted || usingFallback || options.iceOnly) return;
    const localPoster =
      (posterUrl && !posterUrl.endsWith('.mp4') ? posterUrl : null) ||
      '/media/riyadh-season-launch-still.jpg';
    softPosterMounted = true;
    fallbackTexture = createFallbackTexture(localPoster);
    applyMapToShells(fallbackTexture);
  };

  const applyFallbackPlate = (reason: string, softPoster = false) => {
    if (usingFallback) return;
    usingFallback = true;
    const plateUrl =
      softPoster && posterUrl && !posterUrl.endsWith('.mp4')
        ? posterUrl
        : softPoster
          ? '/media/riyadh-season-launch-still.jpg'
          : SPHERE_MEDIA_FALLBACK_PLATE;
    console.warn(
      `[sphereVideoTexture] ${prefix}: ${reason} — applying ${
        plateUrl === SPHERE_MEDIA_FALLBACK_PLATE ? 'ice' : 'poster'
      } fallback plate`
    );
    if (fallbackTexture) {
      fallbackTexture.dispose();
      fallbackTexture = null;
    }
    fallbackTexture = createFallbackTexture(plateUrl);
    applyMapToShells(fallbackTexture);
    // Only toast hard missing/decode failures — never autoplay/play rejects.
    const isAutoplayNoise = /autoplay|play rejected|NotAllowed|AbortError|never became ready/i.test(
      reason
    );
    if (!isAutoplayNoise && (!softPoster || plateUrl === SPHERE_MEDIA_FALLBACK_PLATE)) {
      window.dispatchEvent(
        new CustomEvent('cerebro:media-404', {
          detail: { sphere: prefix, source: initialUrl, reason },
        })
      );
    }
  };

  const tryPlay = () => {
    if (usingFallback || options.iceOnly) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err: unknown) => {
        if (isTransientPlayRejection(err)) {
          playRejectStreak += 1;
          // Keep the soft poster visible; retry via keepAlive / gesture — do NOT ice.
          mountSoftPoster();
          if (playRejectStreak >= 12 && video.readyState < 2) {
            applyFallbackPlate('video never became ready after repeated play rejects', true);
          }
          return;
        }
        applyFallbackPlate(`play failed: ${String(err)}`, true);
      });
    } else {
      playRejectStreak = 0;
    }
  };

  if (options.iceOnly) {
    applyFallbackPlate('iceOnly — no verified sphere footage bound');
  } else {
    // Seed the inner sieve with a poster immediately so glass never reads empty
    // while muted autoplay negotiates on iPad / AI Studio.
    mountSoftPoster();
    attachVideoKeepAlive(video, tryPlay);
    video.addEventListener('playing', () => {
      playRejectStreak = 0;
      if (!usingFallback) {
        applyMapToShells(texture);
      }
    });
    video.addEventListener('loadeddata', () => {
      if (!usingFallback && video.readyState >= 2) {
        applyMapToShells(texture);
      }
    });
    video.addEventListener('error', () => {
      applyFallbackPlate('video element error (Drive/local 404 or decode failure)', true);
    });
    video.addEventListener('stalled', () => {
      // Soft signal only; keepAlive will retry. Empty shell never preferred.
    });
  }

  // Detect WebGL texImage2D upload failures after first frames.
  const texGuard = window.setInterval(() => {
    if (usingFallback || options.iceOnly) {
      window.clearInterval(texGuard);
      return;
    }
    if (video.readyState >= 2 && texture.image) {
      try {
        // Force a needsUpdate; if the video frame is unusable, fall back.
        texture.needsUpdate = true;
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          applyFallbackPlate('texImage2D source has zero dimensions');
        }
      } catch {
        applyFallbackPlate('texImage2D upload failure');
      }
    }
  }, 2000);

  return {
    video,
    texture,
    portalMesh,
    shellBandMesh,
    wrapMesh,
    /** Bind an additional mesh material (e.g. recessed media-lens sieve) to the same plate. */
    bindMaterial: (mat: THREE.MeshBasicMaterial | THREE.MeshPhysicalMaterial) => {
      boundMaterials.push(mat);
      const current =
        (usingFallback || softPosterMounted) && fallbackTexture ? fallbackTexture : texture;
      mat.map = current;
      if (mat instanceof THREE.MeshPhysicalMaterial) {
        mat.emissiveMap = current;
      }
      mat.needsUpdate = true;
    },
    setSourceUrl: (url: string) => {
      if (usingFallback) {
        // Retry live media after a prior 404.
        usingFallback = false;
        if (fallbackTexture) {
          fallbackTexture.dispose();
          fallbackTexture = null;
        }
        softPosterMounted = false;
        applyMapToShells(texture);
      }
      if (video.src.endsWith(url) || video.getAttribute('src') === url) return;
      video.src = url;
      video.load();
      tryPlay();
    },
    dispose: () => {
      window.clearInterval(texGuard);
      const tagged = video as HTMLVideoElement & {
        __sphereKeepAlive?: number;
        __sphereUnlock?: () => void;
      };
      if (tagged.__sphereKeepAlive) window.clearInterval(tagged.__sphereKeepAlive);
      tagged.__sphereUnlock?.();
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
      fallbackTexture?.dispose();
      wrapGeo.dispose();
      wrapMat.dispose();
      portalGeo.dispose();
      bandGeo.dispose();
      portalMat.dispose();
      bandMat.dispose();
      boundMaterials.length = 0;
      options.parent.remove(wrapMesh);
      options.parent.remove(shellBandMesh);
    },
  };
}

/** Curved video shell for a project / station node (no flat CircleGeometry). */
export function mountProjectNodeVideoShell(options: {
  parent: THREE.Object3D;
  projectId: string;
  radius?: number;
  name?: string;
}): NodeVideoHandle {
  const url = resolveProjectMediaSrc(options.projectId);
  const video = createVideoElement(url);
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const radius = options.radius ?? 0.62;
  const geo = createSphericalVideoShellGeometry(radius, 16 / 9, 48, 32);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = options.name || `project-video-${options.projectId}`;
  mesh.renderOrder = 4;
  mesh.userData = {
    projectMediaId: options.projectId,
    verifiedShowreel: Boolean(resolveVerifiedProjectVideoUrl(options.projectId)),
    introInteractive: true,
  };
  options.parent.add(mesh);

  const tryPlay = () => {
    video.muted = true;
    video.loop = true;
    video.play().catch(() => {});
  };
  attachVideoKeepAlive(video, tryPlay);

  return {
    video,
    texture,
    mesh,
    dispose: () => {
      const keepAlive = (video as HTMLVideoElement & { __sphereKeepAlive?: number })
        .__sphereKeepAlive;
      if (keepAlive) window.clearInterval(keepAlive);
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
      geo.dispose();
      mat.dispose();
      options.parent.remove(mesh);
    },
  };
}
