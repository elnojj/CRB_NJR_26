/**
 * Spherical media grid controller (Path A · WebGL).
 * Pooled meshes, render-loop updates, inertia damping — no per-scroll React remounts.
 */

import * as THREE from 'three';
import {
  MEDIA_GRID_CONTRACT,
  MEDIA_GRID_MOTION,
} from './contracts';
import {
  createMediaGlassMaterial,
  MediaGlassMaterialHandle,
  tickMediaGlassTime,
} from './MediaGlassMaterial';
import type { SpatialMediaAsset } from './types';
import { WEBGL_RENDER_ORDER } from '../three/renderOrder';

export interface MediaGridTileBinding {
  assetId: string | null;
  mesh: THREE.Mesh;
  glass: MediaGlassMaterialHandle;
  texture: THREE.Texture | null;
  label: string;
}

export interface MediaGrid3DOptions {
  parent: THREE.Object3D;
  radiusU?: number;
  columns?: number;
  maxTiles?: number;
  onSelectTile?: (index: number, assetId: string | null) => void;
}

export class MediaGrid3D {
  readonly group = new THREE.Group();
  readonly tiles: MediaGridTileBinding[] = [];
  private radius: number;
  private columns: number;
  private rowPitch: number;
  private tileW: number;
  private tileH: number;
  private rotationY = 0;
  private angularVelocity = 0;
  private reducedMotion = false;
  private focusedIndex: number | null = null;
  private loader = new THREE.TextureLoader();
  private disposed = false;
  private onSelectTile?: (index: number, assetId: string | null) => void;

  constructor(options: MediaGrid3DOptions) {
    this.radius = options.radiusU ?? MEDIA_GRID_CONTRACT.radiusU;
    this.columns = options.columns ?? MEDIA_GRID_CONTRACT.columns;
    this.rowPitch = MEDIA_GRID_CONTRACT.rowPitchU;
    this.tileW = MEDIA_GRID_CONTRACT.tileWidthU;
    this.tileH = MEDIA_GRID_CONTRACT.tileHeightU;
    this.onSelectTile = options.onSelectTile;
    this.group.name = 'SpatialMediaGrid3D';
    this.group.visible = false;
    options.parent.add(this.group);

    const max = options.maxTiles ?? MEDIA_GRID_CONTRACT.maximumMountedTiles;
    const [segX, segY] = MEDIA_GRID_CONTRACT.planeSegments;

    for (let idx = 0; idx < max; idx++) {
      const col = idx % this.columns;
      const row = Math.floor(idx / this.columns);
      const theta = (col / this.columns) * Math.PI * 2;
      const y = (1 - row) * this.rowPitch;
      const r = this.radius;

      const geo = new THREE.PlaneGeometry(
        this.tileW * 0.62,
        this.tileH * 0.62,
        segX,
        segY
      );
      // Spherical wrap: bend plane along cylinder / sphere arc
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const vx = pos.getX(v);
        const arc = vx / r;
        pos.setZ(v, (1 - Math.cos(arc)) * r * 0.35);
      }
      geo.computeVertexNormals();

      const glass = createMediaGlassMaterial({
        accentHex: '#65ACFF',
        qualityTier: 'desktop',
      });
      const mesh = new THREE.Mesh(geo, glass.material);
      mesh.position.set(Math.sin(theta) * r, y, Math.cos(theta) * r);
      mesh.lookAt(0, y, 0);
      mesh.rotateY(Math.PI);
      mesh.renderOrder = WEBGL_RENDER_ORDER.geodesicLattice;
      mesh.userData = {
        isSpatialMediaTile: true,
        tileIndex: idx,
        assetId: null as string | null,
      };
      this.group.add(mesh);
      this.tiles.push({
        assetId: null,
        mesh,
        glass,
        texture: null,
        label: '',
      });
    }
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (!visible) {
      this.angularVelocity = 0;
    }
  }

  setReducedMotion(rm: boolean): void {
    this.reducedMotion = rm;
    if (rm) this.angularVelocity = 0;
  }

  setPosition(center: THREE.Vector3): void {
    this.group.position.copy(center);
  }

  applyDragDelta(dxPx: number): void {
    this.angularVelocity += dxPx * MEDIA_GRID_MOTION.dragSensitivity;
    this.angularVelocity = THREE.MathUtils.clamp(
      this.angularVelocity,
      -MEDIA_GRID_MOTION.maximumAngularVelocity,
      MEDIA_GRID_MOTION.maximumAngularVelocity
    );
  }

  setFocusedIndex(index: number | null): void {
    this.focusedIndex = index;
    this.tiles.forEach((t, i) => {
      t.glass.setSelected(index === i);
      t.mesh.scale.setScalar(index === i ? 1.08 : 1);
    });
  }

  getMeshes(): THREE.Mesh[] {
    return this.tiles.map((t) => t.mesh);
  }

  async bindAssets(assets: SpatialMediaAsset[]): Promise<void> {
    const jobs = this.tiles.map(async (tile, idx) => {
      const asset = assets[idx] ?? null;
      tile.assetId = asset?.id ?? null;
      tile.mesh.userData.assetId = tile.assetId;
      tile.label = asset?.title ?? '';
      tile.glass.setMap(null);

      if (tile.texture) {
        tile.texture.dispose();
        tile.texture = null;
      }

      if (!asset) {
        tile.mesh.visible = false;
        return;
      }
      tile.mesh.visible = true;

      const url = asset.localCacheUrl || asset.thumbnailUrl || asset.playbackUrl;
      if (!url || asset.type === 'video') {
        // Placeholder accent glass until authorized stream/poster is ready
        tile.glass.setMap(null);
        return;
      }

      try {
        const tex = await this.loader.loadAsync(url);
        if (this.disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tile.texture = tex;
        tile.glass.setMap(tex);
      } catch {
        tile.glass.setMap(null);
      }
    });
    await Promise.all(jobs);
  }

  update(dt: number, elapsed: number): void {
    if (!this.group.visible) return;

    const idle =
      this.reducedMotion || this.focusedIndex !== null
        ? MEDIA_GRID_MOTION.reducedMotionIdleRotation
        : MEDIA_GRID_MOTION.idleRotationRadPerSecond;

    this.angularVelocity *= Math.pow(
      MEDIA_GRID_MOTION.dampingAt60Hz,
      Math.max(0, dt) * 60
    );
    this.rotationY += this.angularVelocity * dt + idle * dt;
    // Seamless wrap — rotation is unbounded; tile world positions wrap via cylinder math
    this.group.rotation.y = this.rotationY;

    for (const tile of this.tiles) {
      tickMediaGlassTime(tile.glass.material, elapsed);
    }
  }

  pickTile(raycaster: THREE.Raycaster): number | null {
    const hits = raycaster.intersectObjects(this.getMeshes(), false);
    if (!hits.length) return null;
    const idx = hits[0].object.userData.tileIndex;
    return typeof idx === 'number' ? idx : null;
  }

  selectPicked(raycaster: THREE.Raycaster): number | null {
    const idx = this.pickTile(raycaster);
    if (idx === null) return null;
    this.setFocusedIndex(idx);
    this.onSelectTile?.(idx, this.tiles[idx]?.assetId ?? null);
    return idx;
  }

  dispose(): void {
    this.disposed = true;
    this.tiles.forEach((t) => {
      t.texture?.dispose();
      t.glass.dispose();
      t.mesh.geometry.dispose();
    });
    this.group.parent?.remove(this.group);
  }
}
