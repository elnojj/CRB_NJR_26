import * as THREE from 'three';

import {
  getSphereTextureAsset,
  resolveAssetPlaybackUrl,
  type DriveMediaAsset,
} from '../data/driveMediaCatalog';

export type SphereVideoHandle = {
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
  portalMesh: THREE.Mesh;
  shellBandMesh: THREE.Mesh;
  dispose: () => void;
  setSourceUrl: (url: string) => void;
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

function createVideoElement(src: string): HTMLVideoElement {
  const video = document.createElement('video');
  video.src = src;
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  return video;
}

export function mountSphereVideoTexture(options: {
  parent: THREE.Object3D;
  asset?: DriveMediaAsset;
  portalRadius?: number;
  shellBandRadius?: number;
}): SphereVideoHandle {
  const asset = options.asset ?? getSphereTextureAsset();
  const initialUrl = resolveAssetPlaybackUrl(asset);
  const video = createVideoElement(initialUrl);

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const portalGeo = createPortalDiskGeometry(options.portalRadius ?? 5.05, 16 / 9, 72);
  const portalMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    toneMapped: false,
  });
  const portalMesh = new THREE.Mesh(portalGeo, portalMat);
  portalMesh.name = 'hq-media-portal-video';
  portalMesh.renderOrder = 3;
  // Match recessed media portal aperture orientation in buildSphereAssembly
  portalMesh.rotation.set(0.18, -0.24, 0.08);
  portalMesh.position.set(0, 0, 0.12);
  options.parent.add(portalMesh);

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
    opacity: 0.22,
    depthWrite: false,
    toneMapped: false,
  });
  const shellBandMesh = new THREE.Mesh(bandGeo, bandMat);
  shellBandMesh.name = 'hq-equator-video-band';
  shellBandMesh.renderOrder = 2;
  options.parent.add(shellBandMesh);

  const tryPlay = () => {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Autoplay can be blocked until a user gesture; texture still mounts.
      });
    }
  };
  video.addEventListener('canplay', tryPlay, { once: true });
  tryPlay();

  return {
    video,
    texture,
    portalMesh,
    shellBandMesh,
    setSourceUrl: (url: string) => {
      if (video.src.endsWith(url) || video.getAttribute('src') === url) return;
      video.src = url;
      video.load();
      tryPlay();
    },
    dispose: () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
      portalGeo.dispose();
      bandGeo.dispose();
      portalMat.dispose();
      bandMat.dispose();
      options.parent.remove(portalMesh);
      options.parent.remove(shellBandMesh);
    },
  };
}
