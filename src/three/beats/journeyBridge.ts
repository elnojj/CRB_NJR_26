import type { JourneyBeat } from '../camera/journeyConfig';
import { BEAT_COUNT, type BeatContent } from './beatTypes';

/**
 * Adapts a Sphere 1 beat to the caption shape the app already renders. With no injected content the
 * caption says so plainly instead of borrowing copy from another environment.
 */
export function beatToJourneyBeat(index: number, content: BeatContent | null | undefined): JourneyBeat {
  const number = String(index + 1).padStart(2, '0');
  const narration = content?.text?.words.join(' ') ?? '';
  const hasContent = Boolean(content?.title || narration || content?.media || content?.metric);
  return {
    id: `beat-${number}`,
    jId: `B${number}`,
    order: index + 1,
    startSec: 0,
    endSec: 0,
    headlineEn: content?.title ?? `Beat ${number} of ${BEAT_COUNT}`,
    supportEn: 'Sphere 1 · 25 Beats',
    narrationEn: narration,
    look: 'hq',
    nodeId: null,
    person: null,
    assetIds: [],
    evidence: content?.media ? 'assets' : 'registry-only',
    honestNoteEn: hasContent ? undefined : 'Copy, media and metrics for this beat have not been supplied yet.',
  };
}
