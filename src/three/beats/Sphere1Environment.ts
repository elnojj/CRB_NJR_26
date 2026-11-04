import * as THREE from 'three';
import { createMatLiquidGlassShell } from '../../materials/matLiquidGlassShell';
import type { MediaPlaybackManager } from '../mediaPlayback';
import { WEBGL_RENDER_ORDER } from '../renderOrder';
import { applyNeutralStudioEnvironment } from '../studioEnvironment';
import { BeatsTimelineContainer, type BeatsTimelineOptions } from './BeatsTimelineContainer';
import { SPHERE1_SHELL_RADIUS } from './beatLayout';
import { disposeObject3D, isolateScene, markCoreRig, type IsolationReport } from './disposal';

/**
 * The clean-slate master environment: Sphere 1 and nothing else.
 *
 *   Scene
 *   |- Sphere1_BaseLighting   core rig, retained
 *   |- AudioListener          core rig, retained (lives on the camera)
 *   '- Sphere1_Root           centred at the origin
 *      |- Sphere1_Shell        canonical liquid-glass shell (back faces, then front faces)
 *      '- BeatsTimelineContainer
 *
 * Mounting first strips the scene of everything outside the core rig and disposes it.
 */

export const SPHERE1_ROOT_NAME = 'Sphere1_Root';
export const SPHERE1_LIGHTING_NAME = 'Sphere1_BaseLighting';

const SHELL_SEGMENTS: readonly [number, number] = [96, 64];
/** The back shell draws first so the front shell lays over it and over everything inside. */
const BACK_SHELL_ORDER = WEBGL_RENDER_ORDER.refractiveGlassShell - 1;

export interface Sphere1Options extends Omit<BeatsTimelineOptions, 'layout'> {
  softwareGl: boolean;
  shellRadius?: number;
  playback: MediaPlaybackManager;
}

export class Sphere1Environment {
  readonly root = new THREE.Group();
  readonly beats: BeatsTimelineContainer;
  /** Parented to the camera by `attachAudioListener`. Attach any `THREE.Audio` / `PositionalAudio` to it. */
  listener: THREE.AudioListener | null = null;

  private readonly shellRadius: number;
  private readonly lighting = new THREE.Group();
  private readonly shellGeometry: THREE.SphereGeometry;
  private readonly frontShell: THREE.Mesh;
  private readonly backShell: THREE.Mesh;
  private readonly playback: MediaPlaybackManager;
  private pulse = 0;
  private disposed = false;

  constructor(options: Sphere1Options) {
    this.shellRadius = options.shellRadius ?? SPHERE1_SHELL_RADIUS;
    this.playback = options.playback;
    this.root.name = SPHERE1_ROOT_NAME;
    this.root.position.set(0, 0, 0);

    this.shellGeometry = new THREE.SphereGeometry(this.shellRadius, SHELL_SEGMENTS[0], SHELL_SEGMENTS[1]);
    this.backShell = new THREE.Mesh(
      this.shellGeometry,
      createMatLiquidGlassShell({ softwareGl: options.softwareGl, face: 'back' })
    );
    this.frontShell = new THREE.Mesh(
      this.shellGeometry,
      createMatLiquidGlassShell({ softwareGl: options.softwareGl, face: 'front' })
    );
    this.backShell.name = 'Sphere1_ShellBack';
    this.frontShell.name = 'Sphere1_Shell';
    this.backShell.renderOrder = BACK_SHELL_ORDER;
    this.frontShell.renderOrder = WEBGL_RENDER_ORDER.refractiveGlassShell;

    this.beats = new BeatsTimelineContainer({
      playback: options.playback,
      layout: { shellRadius: this.shellRadius },
      content: options.content,
      factories: options.factories,
    });
    this.root.add(this.backShell, this.frontShell, this.beats.group);

    this.lighting.name = SPHERE1_LIGHTING_NAME;
    markCoreRig(this.lighting);
    this.lighting.add(...this.buildLights());
  }

  /** Strip the scene down to the core rig, then add this environment. Returns what was removed. */
  mount(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): IsolationReport {
    const report = isolateScene(scene);
    scene.add(this.lighting, this.root);
    applyNeutralStudioEnvironment(scene, renderer);
    return report;
  }

  /**
   * Browsers refuse to start an AudioContext before a user gesture, so the listener is created on the first
   * gesture (the canvas calls this) rather than on mount. Idempotent.
   */
  attachAudioListener(camera: THREE.Camera): THREE.AudioListener {
    if (!this.listener) {
      this.listener = markCoreRig(new THREE.AudioListener());
      camera.add(this.listener);
    }
    return this.listener;
  }

  /** `audioRms` is the live voice / sound level, 0..1. It breathes the shell and nothing else. */
  update(dtSec: number, timeSec: number, audioRms: number): void {
    this.playback.reconcile();
    this.beats.update(dtSec, timeSec);
    this.pulse += (Math.min(1, Math.max(0, audioRms)) - this.pulse) * (1 - Math.exp(-8 * dtSec));
    const breathe = 1 + this.pulse * 0.012;
    this.frontShell.scale.setScalar(breathe);
    this.backShell.scale.setScalar(breathe);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.beats.dispose();
    // The AudioContext is shared across the page; only the listener node is released here.
    this.listener?.removeFromParent();
    this.listener = null;
    disposeObject3D(this.root);
    disposeObject3D(this.lighting);
  }

  private buildLights(): THREE.Light[] {
    const hemi = new THREE.HemisphereLight(0x6a8cff, 0x05081a, 0.55);
    const key = new THREE.DirectionalLight(0xdfeaff, 1.35);
    key.position.set(7, 11, 8);
    const rim = new THREE.DirectionalLight(0x5cc8ff, 0.85);
    rim.position.set(-9, -3, -10);
    const warm = new THREE.PointLight(0xffd9a0, 1.1, this.shellRadius * 3, 1.6);
    warm.position.set(0, this.shellRadius * 0.2, 0);
    return [hemi, key, rim, warm];
  }
}
