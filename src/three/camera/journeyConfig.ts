/**
 * The 25-beat journey. J ids identify themes (J01-J25); array order is the playback order, and
 * About Us comes first. Every beat points at an environment node in `environmentRegistry` and lists
 * the manifest assets it shows. Beats whose evidence is missing carry an explicit `evidence` state
 * instead of borrowed media.
 */

import type { ConnectedSphereId } from '../sphereNetwork';
import { SPHERE_NETWORK, sphereNetworkCentroid } from '../sphereNetwork';

export type JourneyPersonId = 'shweekar' | 'khaled' | 'tarek' | null;

export type BeatEvidence =
  | 'assets'
  | 'gap'
  | 'concept'
  | 'example'
  | 'registry-only';

export type JourneyLook = ConnectedSphereId | 'centroid';

export type JourneyBeat = {
  id: string;
  jId: string;
  order: number;
  startSec: number;
  endSec: number;
  headlineEn: string;
  supportEn: string;
  narrationEn: string;
  look: JourneyLook;
  /** Association id in the environment registry, or null for scene-wide beats. */
  nodeId: string | null;
  person: JourneyPersonId;
  assetIds: readonly string[];
  evidence: BeatEvidence;
  /** Printed under the caption when the beat cannot show real evidence. */
  honestNoteEn?: string;
};

type BeatSeed = {
  jId: string;
  headlineEn: string;
  supportEn: string;
  narrationEn: string;
  look: JourneyLook;
  nodeId: string | null;
  person?: JourneyPersonId;
  assetIds?: readonly string[];
  evidence: BeatEvidence;
  honestNoteEn?: string;
  durationSec?: number;
};

const DEFAULT_BEAT_SEC = 6;

const SEEDS: readonly BeatSeed[] = [
  { jId: 'J01', headlineEn: 'Fiction gave it a shape.', supportEn: 'Arrival · master sphere', narrationEn: 'Reality gave it a job.', look: 'centroid', nodeId: null, evidence: 'registry-only', durationSec: 8 },
  { jId: 'J17', headlineEn: 'Shweekar Ahmed in Context', supportEn: 'About Us · People', narrationEn: 'The first of three people behind the studio.', look: 'about-us', nodeId: 'about__people__shweekar', person: 'shweekar', assetIds: ['img-person-shweekar'], evidence: 'assets' },
  { jId: 'J18', headlineEn: 'Khaled Al Shaalan Connects', supportEn: 'About Us · People', narrationEn: 'The second of three people behind the studio.', look: 'about-us', nodeId: 'about__people__khaled', person: 'khaled', evidence: 'gap', honestNoteEn: 'Portrait pending confirmation. No substitute image is shown.' },
  { jId: 'J16', headlineEn: 'People Make Systems Work', supportEn: 'About Us · People', narrationEn: 'Human judgment, amplified by systems.', look: 'about-us', nodeId: 'about__people__tarek', person: 'tarek', assetIds: ['img-person-shweekar'], evidence: 'assets', durationSec: 8 },
  { jId: 'J02', headlineEn: 'Hard Projects. Useful Lessons.', supportEn: 'About Us · Tarek Nojara', narrationEn: 'Talks, lists and festival rooms from Tarek Nojara.', look: 'about-us', nodeId: 'about__tarek__story', person: 'tarek', assetIds: ['med-traverse-talks-disruption', 'med-tn-impact-list'], evidence: 'assets' },
  { jId: 'J03', headlineEn: 'Craft Meets Creative Tech.', supportEn: 'CDE · Production and Technology', narrationEn: 'Production footage from sets and Saudi-related work.', look: 'cde', nodeId: 'cde__production__tech', assetIds: ['med-but-first-production', 'img-tn-production-set', 'med-saudi-clip-a', 'med-saudi-clip-b', 'med-saudi-clip-c', 'med-saudi-clip-d'], evidence: 'assets' },
  { jId: 'J04', headlineEn: 'The Studio Connects Everything.', supportEn: 'About Us · Studio', narrationEn: 'The NOJARA showreel is a portfolio overview, not one campaign.', look: 'about-us', nodeId: 'about__studio__showreel', assetIds: ['med-nojara-showreel'], evidence: 'assets' },
  { jId: 'J05', headlineEn: 'Culture Becomes Design Input.', supportEn: 'CDE · Strategy', narrationEn: 'Footage from Traverse Talks, AFRIMA and El Gouna, pending review.', look: 'cde', nodeId: 'cde__strategy__culture', assetIds: ['med-traverse-talks-disruption', 'med-tn-afrima-awards', 'med-tn-gouna-film-festival'], evidence: 'assets' },
  { jId: 'J06', headlineEn: 'Research Before the Render.', supportEn: 'CDE · Strategy and evidence', narrationEn: 'Talks footage stands in until a research artefact is attached.', look: 'cde', nodeId: 'cde__strategy__research', assetIds: ['med-traverse-talks-disruption'], evidence: 'gap', honestNoteEn: 'No research artefact is attached yet.' },
  { jId: 'J07', headlineEn: 'Design for Real Participation.', supportEn: 'CDE · Talent & Culture', narrationEn: 'Reviewed participation footage has not been supplied.', look: 'cde', nodeId: 'cde__talent__culture', evidence: 'gap', honestNoteEn: 'Placeholder. No reviewed footage is attached.' },
  { jId: 'J08', headlineEn: 'Operate What You Imagine.', supportEn: 'HQ · Tasks & Decisions', narrationEn: 'Production footage in the working environment.', look: 'hq', nodeId: 'hq__tasks__register', assetIds: ['med-but-first-production'], evidence: 'assets', honestNoteEn: 'The task register is not connected, so no live tasks appear.' },
  { jId: 'J09', headlineEn: 'Measure What Actually Happened.', supportEn: 'HQ · Evidence', narrationEn: 'Connected data is not verified. This is a labelled example.', look: 'hq', nodeId: 'hq__tasks__register', evidence: 'example', honestNoteEn: 'EXAMPLE. No measured data is connected.' },
  { jId: 'J10', headlineEn: 'Young & Human Opens.', supportEn: 'HQ · Projects · YAH!', narrationEn: 'The YAH! project node.', look: 'hq', nodeId: 'hq__proj__yah', evidence: 'gap', honestNoteEn: 'No verified YAH! media in the approved folder.' },
  { jId: 'J11', headlineEn: 'Watching Becomes Making Together.', supportEn: 'HQ · YAH! participation', narrationEn: 'Participation footage has not been verified.', look: 'hq', nodeId: 'hq__proj__yah', evidence: 'gap', honestNoteEn: 'No verified participation footage.' },
  { jId: 'J12', headlineEn: 'The Work Has Evidence.', supportEn: 'HQ · Media', narrationEn: 'One tile per attributed source.', look: 'hq', nodeId: 'hq__media__nojara', assetIds: ['med-master-media-kit-reel', 'med-njr-laliga-mov', 'med-el-batron-mp4'], evidence: 'assets' },
  { jId: 'J13', headlineEn: 'El Batron Takes Shape.', supportEn: 'HQ · Projects · El Batron', narrationEn: 'The El Batron showreel.', look: 'hq', nodeId: 'hq__proj__bat', assetIds: ['med-el-batron-mp4'], evidence: 'assets' },
  { jId: 'J14', headlineEn: 'Talent Needs Working Infrastructure.', supportEn: 'El Batron · Talent OS', narrationEn: 'A second El Batron reel. The Talent OS system is not shown as running.', look: 'hq', nodeId: 'hq__proj__bat', assetIds: ['med-el-batron-mov'], evidence: 'assets', honestNoteEn: 'No Talent OS implementation is verified.' },
  { jId: 'J15', headlineEn: 'Made in Egypt Next.', supportEn: 'CDE · Talent & Culture', narrationEn: 'Future-facing. No evidence is claimed.', look: 'cde', nodeId: 'cde__talent__culture', evidence: 'gap', honestNoteEn: 'Future-facing; no reviewed media.' },
  { jId: 'J19', headlineEn: 'Services Meet Creative IP.', supportEn: 'CDE · Strategy', narrationEn: 'Studio and project media with their own attribution.', look: 'cde', nodeId: 'cde__strategy__culture', assetIds: ['med-nojara-showreel', 'med-njr-laliga-mov'], evidence: 'assets' },
  { jId: 'J20', headlineEn: 'Projects Become Connected Domains.', supportEn: 'HQ · Projects', narrationEn: 'The project nodes in the registry.', look: 'hq', nodeId: 'hq__proj__seven', evidence: 'registry-only' },
  { jId: 'J21', headlineEn: 'Open the Actual Work.', supportEn: 'HQ · Media', narrationEn: 'Open a real asset from its tile.', look: 'hq', nodeId: 'hq__media__laliga', assetIds: ['med-noj-laliga-wal3ana'], evidence: 'assets' },
  { jId: 'J22', headlineEn: 'Small Gestures. Clear Intent.', supportEn: 'Interaction layer', narrationEn: 'Touch, point and poke on nodes.', look: 'hq', nodeId: null, evidence: 'concept', honestNoteEn: 'Hand gestures are shown only as tested in this build.' },
  { jId: 'J23', headlineEn: 'Wipe. Vanish. Bring Back.', supportEn: 'Interaction layer', narrationEn: 'A concept. It is not claimed to work.', look: 'hq', nodeId: null, evidence: 'concept', honestNoteEn: 'CONCEPT. Not implemented.' },
  { jId: 'J24', headlineEn: 'One Scene. Many Stories.', supportEn: 'Shared environments', narrationEn: 'Every world sits in the same scene.', look: 'centroid', nodeId: null, evidence: 'registry-only' },
  { jId: 'J25', headlineEn: 'Enter Your Creative Ecosystem.', supportEn: 'HQ · Workspace', narrationEn: 'Control returns to you.', look: 'hq', nodeId: null, evidence: 'registry-only' },
];

function buildBeats(): JourneyBeat[] {
  let cursor = 0;
  return SEEDS.map((s, i) => {
    const dur = s.durationSec ?? DEFAULT_BEAT_SEC;
    const beat: JourneyBeat = {
      id: s.jId.toLowerCase(),
      jId: s.jId,
      order: i + 1,
      startSec: cursor,
      endSec: cursor + dur,
      headlineEn: s.headlineEn,
      supportEn: s.supportEn,
      narrationEn: s.narrationEn,
      look: s.look,
      nodeId: s.nodeId,
      person: s.person ?? null,
      assetIds: s.assetIds ?? [],
      evidence: s.evidence,
      honestNoteEn: s.honestNoteEn,
    };
    cursor += dur;
    return beat;
  });
}

export const JOURNEY_BEATS: readonly JourneyBeat[] = buildBeats();

export const JOURNEY_BASE_DURATION_SEC = JOURNEY_BEATS[JOURNEY_BEATS.length - 1].endSec;

export type JourneyStop = {
  /** Seconds on the editorial clock. */
  atSec: number;
  position: [number, number, number];
  target: [number, number, number];
  focalMm: number;
};

function lookCenter(look: JourneyLook): [number, number, number] {
  if (look === 'centroid') {
    const c = sphereNetworkCentroid();
    return [c.x, c.y, c.z];
  }
  const node = SPHERE_NETWORK.find((s) => s.id === look);
  return node ? [...node.center] : [0, 0, 0];
}

const FOCAL_BY_EVIDENCE: Record<BeatEvidence, number> = {
  assets: 42,
  gap: 36,
  concept: 34,
  example: 36,
  'registry-only': 32,
};

/** One camera stop per beat. Repeat visits to the same sphere orbit it so consecutive beats differ. */
export function buildJourneyStops(): JourneyStop[] {
  const visits = new Map<JourneyLook, number>();
  const centroid = lookCenter('centroid');
  const stops: JourneyStop[] = [
    { atSec: 0, position: [centroid[0] + 6, centroid[1] + 10, centroid[2] + 58], target: centroid, focalMm: 24 },
  ];
  JOURNEY_BEATS.forEach((beat, i) => {
    const center = lookCenter(beat.look);
    const n = visits.get(beat.look) ?? 0;
    visits.set(beat.look, n + 1);
    const wide = beat.look === 'centroid';
    const radius = wide ? 34 : 11.5 - (n % 3) * 1.1;
    const az = (0.55 + n * 0.95) % (Math.PI * 2);
    const height = wide ? 8 : 1.6 + (n % 4) * 0.7;
    const dur = beat.endSec - beat.startSec;
    const arrive = i === 0 ? 0.85 : 0.5;
    stops.push({
      atSec: beat.startSec + dur * arrive,
      position: [center[0] + Math.sin(az) * radius, center[1] + height, center[2] + Math.cos(az) * radius],
      target: [center[0], center[1] + (wide ? 0 : 0.3), center[2]],
      focalMm: FOCAL_BY_EVIDENCE[beat.evidence],
    });
  });
  const last = stops[stops.length - 1];
  stops.push({ ...last, atSec: JOURNEY_BASE_DURATION_SEC });
  return stops;
}

export function journeyBeatAt(editorialSec: number): { beat: JourneyBeat; index: number } {
  for (let i = 0; i < JOURNEY_BEATS.length; i += 1) {
    const beat = JOURNEY_BEATS[i];
    if (editorialSec >= beat.startSec && editorialSec < beat.endSec) return { beat, index: i };
  }
  const last = JOURNEY_BEATS.length - 1;
  return { beat: JOURNEY_BEATS[last], index: last };
}
