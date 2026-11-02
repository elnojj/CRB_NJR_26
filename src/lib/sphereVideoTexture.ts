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
};

/**
 * Verified project → video only. Shared /assets/media/*.mp4 duplicates are NOT
 * project masters — absent sources resolve to null (caller must use ice plate).
 */
export function resolveProjectMediaSrc(projectId: string): string | null {
  return resolveVerifiedProjectVideoUrl(projectId);
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

function createFallbackTexture(): THREE.Texture {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(SPHERE_MEDIA_FALLBACK_PLATE);
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
  video.autoplay = true;
  // Workspace ambient plate may loop; intro sequence uses introBridge (one-pass cuts).
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('autoplay', '');
  video.src = src;
  return video;
}

function attachVideoKeepAlive(video: HTMLVideoElement, tryPlay: () => void) {
  video.addEventListener('loadeddata', tryPlay);
  video.addEventListener('canplay', tryPlay);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && video.paused) tryPlay();
  });
  tryPlay();
  const keepAlive = window.setInterval(() => {
    if (video.paused && !document.hidden) tryPlay();
  }, 1500);
  (video as HTMLVideoElement & { __sphereKeepAlive?: number }).__sphereKeepAlive = keepAlive;
}

/**
 * World-shell video: curved spherical wrap + equatorial band.
 * Flat CircleGeometry portal disks are intentionally not mounted.
 */
export function mountSphereVideoTexture(options: {
  parent: THREE.Object3D;
  asset?: DriveMediaAsset;
  sourceUrl?: string;
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

  const applyFallbackPlate = (reason: string) => {
    if (usingFallback) return;
    usingFallback = true;
    console.warn(`[sphereVideoTexture] ${prefix}: ${reason} — applying ice fallback plate`);
    fallbackTexture = createFallbackTexture();
    wrapMat.map = fallbackTexture;
    bandMat.map = fallbackTexture;
    wrapMat.needsUpdate = true;
    bandMat.needsUpdate = true;
    window.dispatchEvent(
      new CustomEvent('cerebro:media-404', {
        detail: { sphere: prefix, source: initialUrl, reason },
      })
    );
  };

  const tryPlay = () => {
    if (usingFallback || options.iceOnly) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        applyFallbackPlate('autoplay/play rejected');
      });
    }
  };

  if (options.iceOnly) {
    applyFallbackPlate('iceOnly — no verified sphere footage bound');
  } else {
    attachVideoKeepAlive(video, tryPlay);
    video.addEventListener('error', () => {
      applyFallbackPlate('video element error (Drive/local 404 or decode failure)');
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
    setSourceUrl: (url: string) => {
      if (usingFallback) {
        // Retry live media after a prior 404.
        usingFallback = false;
        if (fallbackTexture) {
          fallbackTexture.dispose();
          fallbackTexture = null;
        }
        wrapMat.map = texture;
        bandMat.map = texture;
        wrapMat.needsUpdate = true;
        bandMat.needsUpdate = true;
      }
      if (video.src.endsWith(url) || video.getAttribute('src') === url) return;
      video.src = url;
      video.load();
      tryPlay();
    },
    dispose: () => {
      window.clearInterval(texGuard);
      const keepAlive = (video as HTMLVideoElement & { __sphereKeepAlive?: number })
        .__sphereKeepAlive;
      if (keepAlive) window.clearInterval(keepAlive);
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
  const verified = resolveProjectMediaSrc(options.projectId);
  const radius = options.radius ?? 0.62;
  const geo = createSphericalVideoShellGeometry(radius, 16 / 9, 48, 32);

  // Absent verified video → ice plate only (never invent a project master from shared fallbacks).
  if (!verified) {
    const ice = createFallbackTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: ice,
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = options.name || `project-video-${options.projectId}`;
    mesh.renderOrder = 4;
    mesh.userData = {
      projectMediaId: options.projectId,
      mediaUnavailable: true,
      introInteractive: true,
    };
    options.parent.add(mesh);
    const stub = document.createElement('video');
    return {
      video: stub,
      texture: ice as unknown as THREE.VideoTexture,
      mesh,
      dispose: () => {
        ice.dispose();
        geo.dispose();
        mat.dispose();
        options.parent.remove(mesh);
      },
    };
  }

  const video = createVideoElement(verified);
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

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
