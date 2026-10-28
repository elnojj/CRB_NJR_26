/**
 * Liquid Glass v7 — amber particle horizon (reference A).
 * Dense toward a thin horizon band; sparse elsewhere. Seed 3939.
 */

import * as THREE from 'three';
import { LG_V7_PARTICLES, particleCountForWidth } from '../design/liquidGlassV7';
import { WEBGL_RENDER_ORDER } from './renderOrder';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ParticleHorizonHandle {
  points: THREE.Points;
  update: (delta: number, reducedMotion: boolean) => void;
  resize: (width: number) => void;
  dispose: () => void;
}

export function createParticleHorizon(
  scene: THREE.Scene,
  viewportWidth: number
): ParticleHorizonHandle {
  const cfg = LG_V7_PARTICLES.horizon;
  const rand = mulberry32(cfg.seed);
  let count = particleCountForWidth(viewportWidth);

  const build = (n: number) => {
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const amber = new THREE.Color('#F2B66D');
    const dim = new THREE.Color('#3A2A18');
    for (let i = 0; i < n; i++) {
      // Bias density toward a thin horizon band (normalized Y ≈ 0)
      const u = Math.pow(rand(), cfg.densityExponent);
      const y = (rand() - 0.5) * 2;
      const horizonPull = Math.exp(-Math.pow(y / cfg.horizonBandNormalized, 2));
      const radius = 28 + u * 55 * (0.35 + 0.65 * (1 - horizonPull));
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.clamp(y * (0.55 + 0.45 * horizonPull), -1, 1));
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.42;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const c = amber.clone().lerp(dim, 1 - horizonPull * 0.85);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: cfg.pointSizePx,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = WEBGL_RENDER_ORDER.galaxyParticles - 1;
    points.frustumCulled = false;
    return { points, geo, mat };
  };

  let built = build(count);
  scene.add(built.points);

  const update = (delta: number, reducedMotion: boolean) => {
    if (reducedMotion) return;
    built.points.rotation.y += delta * cfg.rotationRadPerSec;
  };

  const resize = (width: number) => {
    const next = particleCountForWidth(width);
    if (next === count) return;
    count = next;
    scene.remove(built.points);
    built.geo.dispose();
    built.mat.dispose();
    built = build(count);
    scene.add(built.points);
  };

  const dispose = () => {
    scene.remove(built.points);
    built.geo.dispose();
    built.mat.dispose();
  };

  return { points: built.points, update, resize, dispose };
}
