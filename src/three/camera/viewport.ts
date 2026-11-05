import type { PerspectiveCamera } from 'three';

/** Resize the projection without borrowing the Home preset's lens or view offset for one frame. */
export function resizeCameraViewport(camera: PerspectiveCamera, width: number, height: number): void {
  camera.aspect = Math.max(1, width) / Math.max(1, height);
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
