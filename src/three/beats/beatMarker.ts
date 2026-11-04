import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { WEBGL_RENDER_ORDER } from '../renderOrder';

const RING_INNER = 0.085;
const RING_OUTER = 0.105;

/** Small numbered ring that marks a beat's position in the sphere whether or not its content is shown. */
export class BeatMarker {
  readonly object = new THREE.Group();

  private readonly geometry = new THREE.RingGeometry(RING_INNER, RING_OUTER, 40);
  private readonly ringMaterial = new THREE.MeshBasicMaterial({ color: 0x8fb4e8, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  private readonly textMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  private readonly label = new Text();

  constructor(index: number) {
    this.object.name = `BeatMarker_${String(index).padStart(2, '0')}`;
    const ring = new THREE.Mesh(this.geometry, this.ringMaterial);
    ring.renderOrder = WEBGL_RENDER_ORDER.beatsMarkers;
    this.label.text = String(index + 1).padStart(2, '0');
    this.label.fontSize = 0.07;
    this.label.anchorX = 'center';
    this.label.anchorY = 'middle';
    this.label.color = '#d6e6fa';
    this.label.material = this.textMaterial;
    this.label.renderOrder = WEBGL_RENDER_ORDER.beatsMarkers;
    this.label.sync();
    this.object.add(ring, this.label);
    this.setActivity(0);
  }

  /** 0 resting, 1 this beat is the current one. */
  setActivity(activity: number): void {
    this.ringMaterial.opacity = 0.34 + 0.5 * activity;
    this.label.fillOpacity = 0.4 + 0.55 * activity;
    this.object.scale.setScalar(1 + 0.25 * activity);
  }

  dispose(): void {
    this.label.dispose();
    this.geometry.dispose();
    this.ringMaterial.dispose();
    this.textMaterial.dispose();
    this.object.removeFromParent();
  }
}
