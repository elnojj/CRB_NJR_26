declare module 'troika-three-text' {
  import type { Mesh } from 'three';

  /** SDF text mesh. The package ships types that do not extend THREE.Mesh, so the surface used by the HUD is declared here. */
  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    color: number | string;
    anchorX: number | string;
    anchorY: number | string;
    whiteSpace: string;
    letterSpacing: number;
    fillOpacity: number;
    maxWidth: number;
    sync(callback?: () => void): void;
    dispose(): void;
  }
}
