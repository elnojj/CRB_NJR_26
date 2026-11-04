import gsap from 'gsap';
import * as THREE from 'three';
import type { MediaPlaybackManager } from '../mediaPlayback';
import { buildBeatKeyframes, computeBeatPlacements, type BeatLayoutOptions } from './beatLayout';
import {
  BEAT_COUNT,
  type BeatCameraKeyframe,
  type BeatContent,
  type BeatContentProvider,
  type BeatMarkerSlot,
  type BeatMediaContent,
  type BeatMetricContent,
  type BeatPlacement,
  type BeatSlot,
  type BeatSlotFactories,
  type BeatTextContent,
} from './beatTypes';
import { DEFAULT_SLOT_FACTORIES } from './defaultSlotFactories';

/**
 * `BeatsTimelineContainer` holds the 25 beat nodes. Each node is an anchor on the sphere's inner spiral and
 * owns four things: a word-by-word text anchor, a media viewport, a metric card and a camera keyframe.
 * Slots are built by injectable factories and filled by an injectable content provider, so copy, media,
 * metrics and speed ramps can be supplied without touching this file.
 */

const DEFAULT_REVEAL_SEC = 1.3;
const HIDE_SEC = 0.5;

const SLOT_POSITION = {
  text: new THREE.Vector3(0, 0.6, 0.01),
  media: new THREE.Vector3(0, 0, 0),
  metric: new THREE.Vector3(0.95, -0.52, 0.06),
  marker: new THREE.Vector3(-0.98, -0.56, 0.02),
} as const;

export interface BeatNode {
  readonly index: number;
  readonly group: THREE.Group;
  readonly placement: BeatPlacement;
  readonly text: BeatSlot<BeatTextContent>;
  readonly media: BeatSlot<BeatMediaContent>;
  readonly metric: BeatSlot<BeatMetricContent>;
  readonly marker: BeatMarkerSlot;
  content: BeatContent | null;
  readonly state: { reveal: number };
}

export interface BeatsTimelineOptions {
  playback: MediaPlaybackManager;
  layout?: Partial<BeatLayoutOptions>;
  content?: BeatContentProvider;
  factories?: Partial<BeatSlotFactories>;
}

export class BeatsTimelineContainer {
  readonly group = new THREE.Group();
  readonly nodes: BeatNode[];

  private provider: BeatContentProvider | undefined;
  private activeIndex: number | null = null;
  private readonly tweens = gsap.context(() => undefined);
  private readonly slotList: Array<BeatSlot<unknown>> = [];

  constructor(options: BeatsTimelineOptions) {
    this.group.name = 'BeatsTimelineContainer';
    this.provider = options.content;
    const factories: BeatSlotFactories = { ...DEFAULT_SLOT_FACTORIES, ...options.factories };
    const placements = computeBeatPlacements({ count: BEAT_COUNT, ...options.layout });
    this.nodes = placements.map((placement) => this.buildNode(placement, placements.length, factories, options.playback));
    this.refreshContent();
  }

  get count(): number {
    return this.nodes.length;
  }

  getActiveIndex(): number | null {
    return this.activeIndex;
  }

  getContent(index: number): BeatContent | null {
    return this.nodes[index]?.content ?? null;
  }

  /** Swap the content provider and re-apply it to every beat. */
  setContentProvider(provider: BeatContentProvider | undefined): void {
    this.provider = provider;
    this.refreshContent();
  }

  applyContent(index: number, content: BeatContent | null): void {
    const node = this.nodes[index];
    if (!node) return;
    node.content = content;
    node.text.apply(content?.text);
    node.media.apply(content?.media);
    node.metric.apply(content?.metric);
  }

  /** Camera stops for the whole journey: defaults from the layout, overrides from the content provider. */
  getKeyframes(): BeatCameraKeyframe[] {
    return buildBeatKeyframes(
      this.nodes.map((node) => node.placement),
      this.nodes.map((node) => node.content)
    );
  }

  /** Show one beat's content and hide the rest. Pass null to hide everything. */
  setActiveBeat(index: number | null, reducedMotion = false): void {
    if (index === this.activeIndex) return;
    const previous = this.activeIndex;
    this.activeIndex = index;
    if (previous !== null) this.tweenReveal(previous, 0, reducedMotion);
    if (index !== null) this.tweenReveal(index, 1, reducedMotion);
  }

  update(dtSec: number, timeSec: number): void {
    for (const slot of this.slotList) slot.update?.(dtSec, timeSec);
  }

  dispose(): void {
    this.tweens.revert();
    for (const node of this.nodes) {
      node.text.dispose();
      node.media.dispose();
      node.metric.dispose();
      node.marker.dispose();
      node.group.removeFromParent();
    }
    this.slotList.length = 0;
    this.group.removeFromParent();
  }

  private buildNode(
    placement: BeatPlacement,
    count: number,
    factories: BeatSlotFactories,
    playback: MediaPlaybackManager
  ): BeatNode {
    const ctx = { index: placement.index, count, playback };
    const group = new THREE.Group();
    group.name = `Beat_${String(placement.index).padStart(2, '0')}`;
    group.position.set(...placement.anchor);
    group.rotation.y = placement.yawRad;
    const text = factories.createText(ctx);
    const media = factories.createMedia(ctx);
    const metric = factories.createMetric(ctx);
    const marker = factories.createMarker(ctx);
    text.object.position.copy(SLOT_POSITION.text);
    media.object.position.copy(SLOT_POSITION.media);
    metric.object.position.copy(SLOT_POSITION.metric);
    marker.object.position.copy(SLOT_POSITION.marker);
    group.add(media.object, text.object, metric.object, marker.object);
    this.group.add(group);
    this.slotList.push(text as BeatSlot<unknown>, media as BeatSlot<unknown>, metric as BeatSlot<unknown>);
    return { index: placement.index, group, placement, text, media, metric, marker, content: null, state: { reveal: 0 } };
  }

  private refreshContent(): void {
    for (const node of this.nodes) this.applyContent(node.index, this.provider?.(node.index) ?? null);
  }

  private applyReveal(node: BeatNode): void {
    const r = node.state.reveal;
    node.text.setReveal(r);
    node.media.setReveal(r);
    node.metric.setReveal(r);
    node.marker.setActivity(r);
  }

  private tweenReveal(index: number, target: 0 | 1, reducedMotion: boolean): void {
    const node = this.nodes[index];
    if (!node) return;
    gsap.killTweensOf(node.state);
    node.media.setActive?.(target === 1);
    if (reducedMotion) {
      node.state.reveal = target;
      this.applyReveal(node);
      return;
    }
    // Slots shape their own easing, so the reveal itself runs linearly and word timing stays as authored.
    const showSec = Math.max(
      DEFAULT_REVEAL_SEC,
      node.text.revealSec?.() ?? 0,
      node.media.revealSec?.() ?? 0,
      node.metric.revealSec?.() ?? 0
    );
    this.tweens.add(() => {
      gsap.to(node.state, {
        reveal: target,
        duration: target === 1 ? showSec : HIDE_SEC,
        ease: target === 1 ? 'none' : 'power2.in',
        onUpdate: () => this.applyReveal(node),
      });
    });
  }
}
