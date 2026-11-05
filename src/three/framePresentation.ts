import type { Camera, Scene, WebGLRenderer } from 'three';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

/** Canvas allocation clears its drawing buffer. Resize first, then present in the same frame. */
export function presentFrame(
  renderer: Pick<WebGLRenderer, 'setPixelRatio' | 'render'>,
  scene: Scene,
  camera: Camera,
  nextPixelRatio: number | null,
  composer?: Pick<EffectComposer, 'setPixelRatio' | 'render'> | null,
): void {
  if (nextPixelRatio !== null) {
    renderer.setPixelRatio(nextPixelRatio);
    composer?.setPixelRatio(nextPixelRatio);
  }
  if (composer) composer.render();
  else renderer.render(scene, camera);
}
