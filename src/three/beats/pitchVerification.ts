import { ENVIRONMENTS, getNode, type EnvironmentId } from '../../data/environmentRegistry';
import { getMediaRecord, JOURNEY_MEDIA_MANIFEST } from '../../data/journeyMediaManifest';
import { PITCH_BEATS, PITCH_PACING, PITCH_SOURCES, type PitchBeat } from '../../data/pitchBeats';
import { textRevealSec } from './beatLayout';
import { ENTER_AT } from './beatJourney';
import { pitchRamp, pitchWords } from './pitchContent';

export type BeatVerificationStatus = 'blocked' | 'ready';

export interface BeatVerification {
  jId: string;
  index: number;
  name: string;
  status: BeatVerificationStatus;
  blockers: string[];
  notes: string[];
}

/** `env_about__people__shweekar` -> registry association id `about__people__shweekar`. */
export function pitchTargetToAssociation(envId: EnvironmentId, targetId: string): string {
  const prefix = `${envId}__`;
  const rest = targetId.startsWith(prefix) ? targetId.slice(prefix.length) : targetId;
  return `${ENVIRONMENTS[envId].key}__${rest}`;
}

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');

function personNameFromText(beat: PitchBeat): string | null {
  const match = /^([A-Z][a-z]+ [A-Z][a-z]+)\./.exec(beat.onScreenText);
  return match ? match[1] : null;
}

export function verifyPitchBeat(beat: PitchBeat): BeatVerification {
  const blockers: string[] = [];
  const notes: string[] = [];

  const association = pitchTargetToAssociation(beat.envId, beat.targetId);
  const node = getNode(association);
  if (!node) blockers.push(`Target ${beat.targetId} has no registry entry (looked up ${association}).`);
  else {
    if (node.envId !== beat.envId) blockers.push(`Target resolves to ${node.envId}, not ${beat.envId}.`);
    if (node.status !== 'verified') notes.push(`Registry status is ${node.status}${node.honestStateEn ? `: ${node.honestStateEn}` : ''}`);
    const spoken = personNameFromText(beat);
    if (spoken && node.kind === 'person' && normalize(spoken) !== normalize(node.titleEn)) {
      notes.push(`Spec spells "${spoken}"; registry has "${node.titleEn}". Confirm the approved spelling.`);
    }
  }

  for (const sourceId of beat.sourceIds) {
    const source = PITCH_SOURCES[sourceId];
    const record = JOURNEY_MEDIA_MANIFEST.find((r) => r.driveFileId === source.driveFileId) ?? null;
    if (!record) blockers.push(`Source "${source.title}" (${source.driveFileId}) is not in the media manifest.`);
    else {
      if (!getMediaRecord(record.assetId)) blockers.push(`Manifest record ${record.assetId} is not retrievable.`);
      if (!record.runtimeUrl) blockers.push(`"${source.title}": runtime URL unresolved; Drive link is provenance only.`);
      if (record.timecodes.length === 0 && record.kind === 'video') blockers.push(`"${source.title}": no reviewed in/out excerpt.`);
    }
  }
  if (beat.sourceIds.length > 0) notes.push('Rights and usage review pending for every source on this beat.');
  if (beat.mediaKind === 'prototype') notes.push('Prototype or concept beat: must carry a visible Concept label.');

  const ramp = pitchRamp(beat);
  const available = beat.endSec - beat.startSec - ramp.travelSec * ENTER_AT;
  const needed = textRevealSec(pitchWords(beat), PITCH_PACING.wordSec, PITCH_PACING.sentencePauseSec) + PITCH_PACING.minHoldSec;
  if (needed > available) blockers.push(`Copy needs ${needed.toFixed(2)} s including the 1.4 s hold but only ${available.toFixed(2)} s remain.`);

  if (beat.metric.evidence === 'pending') notes.push(`Metric "${beat.metric.display}" is pending; the overlay is omitted from the investor view.`);

  return { jId: beat.jId, index: beat.index, name: beat.name, status: blockers.length > 0 ? 'blocked' : 'ready', blockers, notes };
}

export const verifyPitchBeats = (): BeatVerification[] => PITCH_BEATS.map(verifyPitchBeat);
