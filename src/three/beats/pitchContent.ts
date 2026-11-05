import { ENVIRONMENTS } from '../../data/environmentRegistry';
import { mediaStatusTag, resolveMediaProvenance } from '../../data/mediaProvenance';
import { PITCH_BEATS, PITCH_PACING, PITCH_SOURCES, type PitchBeat } from '../../data/pitchBeats';
import type { BeatContent, BeatContentProvider, SpeedRamp } from './beatTypes';

const PITCH_EASE = 'power3.inOut';
const MAX_TRAVEL_SEC = 3;
const TRAVEL_SHARE = 0.4;

const mmss = (sec: number): string => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export const pitchWords = (beat: PitchBeat): string[] => beat.onScreenText.split(/\s+/).filter(Boolean);

/** The beat's timeline slot split into flight and rest, so each beat ends exactly on the authored clock. */
export function pitchRamp(beat: PitchBeat): SpeedRamp {
  const duration = beat.endSec - beat.startSec;
  const travelSec = Math.min(MAX_TRAVEL_SEC, duration * TRAVEL_SHARE);
  return { ease: PITCH_EASE, travelSec, holdSec: duration - travelSec };
}

function mediaFor(beat: PitchBeat): BeatContent['media'] {
  if (beat.sourceIds.length === 0) {
    const status = resolveMediaProvenance({ runtimeUrl: null, posterUrl: null });
    return { kind: 'title', title: beat.mediaKind === 'prototype' ? 'Concept' : 'No media', caption: mediaStatusTag(status, 'not live') };
  }
  const first = PITCH_SOURCES[beat.sourceIds[0]];
  const sources = beat.sourceIds.map(id => ({ id, title: PITCH_SOURCES[id].title }));
  const status = resolveMediaProvenance({ runtimeUrl: first.runtimeUrl, posterUrl: null });
  return { kind: 'title', title: sources.length > 1 ? `${sources.length} source files` : first.title,
    sources: sources.length > 1 ? sources : undefined, caption: mediaStatusTag(status, 'source supplied') };
}

function honestNoteFor(beat: PitchBeat): string {
  if (beat.sourceIds.length > 0) return 'Source files are supplied as provenance. Playback has not been validated yet.';
  return 'Concept or prototype. Not a live system and not measured results.';
}

export function pitchBeatContent(beat: PitchBeat): BeatContent {
  const showMetric = beat.metric.evidence !== 'pending';
  return {
    label: beat.jId,
    title: beat.name,
    supportLine: `${ENVIRONMENTS[beat.envId].titleEn} · ${mmss(beat.startSec)}–${mmss(beat.endSec)}`,
    honestNote: honestNoteFor(beat),
    text: { words: pitchWords(beat), staggerSec: PITCH_PACING.wordSec, sentencePauseSec: PITCH_PACING.sentencePauseSec },
    media: mediaFor(beat),
    metric: showMetric
      ? { value: beat.metric.display, label: beat.metric.evidence === 'structure-count' ? 'Specified structure' : 'Process label' }
      : undefined,
    camera: { focalMm: beat.camera.focalMm, ramp: pitchRamp(beat) },
  };
}

export const pitchContentProvider: BeatContentProvider = (index) => {
  const beat = PITCH_BEATS[index];
  return beat ? pitchBeatContent(beat) : null;
};
