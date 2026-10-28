import {
  CEREBRO_18_TOUR_CHOREOGRAPHY,
  TourMode,
  TourScreenStepSpec,
  collectActiveScreenCtas,
  getTourStepsForMode,
} from './cerebroTourAndCtaStore';

export interface LiveTourItinerary {
  schemaVersion: 'cerebro-tour-v5';
  generatedAt: string;
  mode: TourMode;
  steps: TourScreenStepSpec[];
  liveCtaCount: number;
  source: 'live-registry' | 'choreography-fallback';
}

/**
 * Build a guided-tour itinerary from the *current* UI registry.
 * Prefers choreography stops whose primary CTA (or any sub-step CTA)
 * is actually present in the DOM; falls back to the full choreography
 * so the tour never invents screens that do not exist in source.
 */
export function buildLiveTourItinerary(
  mode: TourMode = 'full-18-screen'
): LiveTourItinerary {
  const base = getTourStepsForMode(mode);
  const liveCtas = collectActiveScreenCtas();
  const liveIds = new Set(liveCtas.map((c) => c.ctaId));

  const filtered = base.filter((step) => {
    if (liveIds.size === 0) return true;
    if (liveIds.has(step.primaryCtaId)) return true;
    if (step.subSteps.some((s) => liveIds.has(s.ctaId))) return true;
    // Keep structural stations even when their CTA is panel-hosted / not mounted yet.
    return step.panelsToOpen.length > 0 || step.targetNodeId !== null;
  });

  const steps = filtered.length > 0 ? filtered : base;

  return {
    schemaVersion: 'cerebro-tour-v5',
    generatedAt: new Date().toISOString(),
    mode,
    steps,
    liveCtaCount: liveCtas.length,
    source: liveCtas.length > 0 ? 'live-registry' : 'choreography-fallback',
  };
}

/** Resolve "full tour" / "take me on a tour" natural-language intents. */
export function isFullTourIntent(raw: string): boolean {
  const t = raw.toLowerCase();
  return (
    t.includes('full tour') ||
    t.includes('take me on a tour') ||
    t.includes('guided tour') ||
    t.includes('tour of cerebro') ||
    t.includes('show me everything')
  );
}

export function getCanonicalTourStepCount(): number {
  return CEREBRO_18_TOUR_CHOREOGRAPHY.length;
}
