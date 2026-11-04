import { BeatMarker } from './beatMarker';
import { KineticTextSlot } from './kineticTextSlot';
import { MediaViewportSlot } from './mediaViewportSlot';
import { MetricSlot } from './metricSlot';
import type { BeatSlotFactories } from './beatTypes';

/** Stock slot implementations. Pass any subset to `BeatsTimelineContainer` to replace them. */
export const DEFAULT_SLOT_FACTORIES: BeatSlotFactories = {
  createText: () => new KineticTextSlot(),
  createMedia: (ctx) => new MediaViewportSlot(ctx),
  createMetric: () => new MetricSlot(),
  createMarker: (ctx) => new BeatMarker(ctx.index),
};
