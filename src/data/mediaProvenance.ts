import { MEDIA_PROVENANCE_STATUSES, type MediaProvenanceStatus } from '../design/systemContract';

/** Runtime fetch / decode progress reported by the player, when one exists. */
export type MediaLoadState = 'idle' | 'loading' | 'ready' | 'failed';

export type MediaProvenanceInput = {
  runtimeUrl: string | null;
  posterUrl: string | null;
  loadState?: MediaLoadState;
};

/** `playing` is only reachable when a real runtime URL has finished loading. */
export type MediaProvenanceResult = MediaProvenanceStatus | 'playing';

/**
 * RULE-03: media that cannot play shows exactly one authentic status tag.
 * Nothing here ever fabricates a stream; absence of a source is `unavailable`.
 */
export function resolveMediaProvenance(input: MediaProvenanceInput): MediaProvenanceResult {
  if (input.loadState === 'failed') return 'error';
  if (!input.runtimeUrl) return input.posterUrl ? 'poster' : 'unavailable';
  if (input.loadState === 'ready') return 'playing';
  return 'loading';
}

export function isMediaProvenanceStatus(value: string): value is MediaProvenanceStatus {
  return (MEDIA_PROVENANCE_STATUSES as readonly string[]).includes(value);
}

export function mediaStatusTag(status: MediaProvenanceResult, detail?: string): string {
  return detail ? `${status} · ${detail}` : status;
}
