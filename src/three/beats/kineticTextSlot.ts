import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { WEBGL_RENDER_ORDER } from '../renderOrder';
import { layoutWords, wordReveal, type WordSlot } from './beatLayout';
import type { BeatSlot, BeatTextContent } from './beatTypes';

const DEFAULT_FONT_SIZE = 0.17;
const DEFAULT_COLOR = '#f2f6f8';
const MAX_BLOCK_WIDTH = 2.5;
const GAP_EM = 0.3;
const LINE_HEIGHT_EM = 1.3;
const RISE_EM = 0.6;
const DEFAULT_STAGGER_SEC = 0.12;
/** Width guess used until troika reports real glyph bounds. */
const EST_ADVANCE_EM = 0.58;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/**
 * Word-by-word SDF text. Each word is its own mesh so it can rise and fade on its own beat of the
 * reveal. The block grows upward from its anchor, so it never overlaps the media below it.
 */
export class KineticTextSlot implements BeatSlot<BeatTextContent> {
  readonly object = new THREE.Group();

  private readonly material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  private words: Text[] = [];
  private widths: number[] = [];
  private placed: WordSlot[] = [];
  private content: BeatTextContent | null = null;
  private reveal = 0;
  private generation = 0;

  constructor() {
    this.object.name = 'BeatTextAnchor';
    this.object.visible = false;
  }

  apply(content: BeatTextContent | null | undefined): void {
    this.clearWords();
    this.generation += 1;
    this.content = content && content.words.length > 0 ? content : null;
    if (!this.content) {
      this.object.visible = false;
      return;
    }
    const generation = this.generation;
    const fontSize = this.content.fontSize ?? DEFAULT_FONT_SIZE;
    this.words = this.content.words.map((word) => {
      const text = new Text();
      text.text = word;
      text.fontSize = fontSize;
      text.color = this.content?.colorHex ?? DEFAULT_COLOR;
      text.anchorX = 'left';
      text.anchorY = 'middle';
      text.whiteSpace = 'nowrap';
      text.material = this.material;
      text.renderOrder = WEBGL_RENDER_ORDER.beatsContent;
      text.fillOpacity = 0;
      this.object.add(text);
      return text;
    });
    this.widths = this.content.words.map((word) => word.length * fontSize * EST_ADVANCE_EM);
    this.relayout();
    this.words.forEach((text, i) => {
      text.sync(() => {
        if (generation !== this.generation) return;
        const bounds = text.textRenderInfo?.blockBounds;
        if (bounds) this.widths[i] = bounds[2] - bounds[0];
        this.relayout();
      });
    });
  }

  setReveal(reveal: number): void {
    this.reveal = reveal;
    this.object.visible = this.content !== null && reveal > 0.001;
    this.pose();
  }

  revealSec(): number {
    const n = this.content?.words.length ?? 0;
    return Math.max(0.9, n * (this.content?.staggerSec ?? DEFAULT_STAGGER_SEC) + 0.6);
  }

  dispose(): void {
    this.generation += 1;
    this.clearWords();
    this.material.dispose();
    this.object.removeFromParent();
  }

  private relayout(): void {
    const fontSize = this.content?.fontSize ?? DEFAULT_FONT_SIZE;
    const laid = layoutWords(
      this.widths.map((width) => ({ width })),
      { maxWidth: MAX_BLOCK_WIDTH, gap: fontSize * GAP_EM, lineHeight: fontSize * LINE_HEIGHT_EM }
    );
    const lastLine = laid.reduce((max, slot) => Math.max(max, slot.line), 0);
    this.placed = laid.map((slot) => ({ ...slot, y: slot.y + lastLine * fontSize * LINE_HEIGHT_EM }));
    this.pose();
  }

  private pose(): void {
    const fontSize = this.content?.fontSize ?? DEFAULT_FONT_SIZE;
    this.words.forEach((text, i) => {
      const slot = this.placed[i];
      if (!slot) return;
      const p = easeOutCubic(wordReveal(this.reveal, i, this.words.length));
      text.position.set(slot.x, slot.y - (1 - p) * fontSize * RISE_EM, 0);
      text.fillOpacity = p;
    });
  }

  private clearWords(): void {
    for (const text of this.words) {
      text.removeFromParent();
      text.dispose();
    }
    this.words = [];
    this.widths = [];
    this.placed = [];
  }
}
