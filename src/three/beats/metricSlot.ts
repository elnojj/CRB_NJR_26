import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { WEBGL_RENDER_ORDER } from '../renderOrder';
import type { BeatMetricContent, BeatSlot } from './beatTypes';

const CARD_W = 0.78;
const CARD_H = 0.42;
const DEFAULT_ACCENT = '#d4af37';
const VALUE_MAX_FONT = 0.21;
const VALUE_MIN_FONT = 0.075;
/** Usable text width inside the card, in units of font size times characters. */
const VALUE_FIT = 1.24;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export function formatMetricValue(value: number | string, progress: number, decimals = 0): string {
  if (typeof value === 'string') return value;
  return (value * progress).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Callout card with one headline number. Numbers count up from zero as the card is revealed. */
export class MetricSlot implements BeatSlot<BeatMetricContent> {
  readonly object = new THREE.Group();

  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private readonly backing = new THREE.MeshBasicMaterial({
    color: 0x06101e,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly bar = new THREE.MeshBasicMaterial({ color: DEFAULT_ACCENT, transparent: true, opacity: 0, depthWrite: false });
  private readonly textMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  private readonly value = new Text();
  private readonly label = new Text();
  private readonly card = new THREE.Mesh(this.geometry, this.backing);
  private readonly accent = new THREE.Mesh(this.geometry, this.bar);

  private content: BeatMetricContent | null = null;
  private shown = '';

  constructor() {
    this.object.name = 'BeatMetricDisplay';
    this.object.visible = false;
    this.card.scale.set(CARD_W, CARD_H, 1);
    this.accent.scale.set(0.012, CARD_H * 0.8, 1);
    this.accent.position.set(-CARD_W / 2 + 0.03, 0, 0.002);
    for (const text of [this.value, this.label]) {
      text.anchorX = 'left';
      text.anchorY = 'middle';
      text.whiteSpace = 'nowrap';
      text.material = this.textMaterial;
      text.fillOpacity = 0;
    }
    this.value.fontSize = 0.21;
    this.value.color = '#f2f6f8';
    this.value.position.set(-CARD_W / 2 + 0.08, 0.05, 0.004);
    this.label.fontSize = 0.062;
    this.label.letterSpacing = 0.08;
    this.label.color = '#9fb7d8';
    this.label.position.set(-CARD_W / 2 + 0.08, -0.12, 0.004);
    for (const mesh of [this.card, this.accent, this.value, this.label]) mesh.renderOrder = WEBGL_RENDER_ORDER.beatsContent;
    this.object.add(this.card, this.accent, this.value, this.label);
  }

  apply(content: BeatMetricContent | null | undefined): void {
    this.content = content ?? null;
    if (!content) {
      this.object.visible = false;
      return;
    }
    this.bar.color.set(content.accentHex ?? DEFAULT_ACCENT);
    this.label.text = content.label.toUpperCase();
    this.label.sync();
    this.shown = '';
    const length = typeof content.value === 'string' ? content.value.length : String(content.value).length + 2;
    this.value.fontSize = Math.min(VALUE_MAX_FONT, Math.max(VALUE_MIN_FONT, VALUE_FIT / Math.max(6, length)));
    this.setReveal(0);
  }

  setReveal(reveal: number): void {
    const content = this.content;
    this.object.visible = content !== null && reveal > 0.001;
    if (!content) return;
    const e = easeOutCubic(reveal);
    const next = `${formatMetricValue(content.value, e, content.decimals)}${content.unit ?? ''}`;
    if (next !== this.shown) {
      this.shown = next;
      this.value.text = next;
      this.value.sync();
    }
    this.backing.opacity = 0.74 * e;
    this.bar.opacity = e;
    this.value.fillOpacity = e;
    this.label.fillOpacity = e * 0.9;
    this.object.scale.setScalar(0.92 + 0.08 * e);
  }

  dispose(): void {
    this.value.dispose();
    this.label.dispose();
    this.geometry.dispose();
    this.backing.dispose();
    this.bar.dispose();
    this.textMaterial.dispose();
    this.object.removeFromParent();
  }
}
