/**
 * The 25-beat journey. J ids identify themes (J01-J25); array order is the playback order, and
 * About Us comes first. Every beat points at an environment node in `environmentRegistry` and lists
 * the manifest assets it shows. Beats whose evidence is missing carry an explicit `evidence` state
 * instead of borrowed media.
 */

import { ENVIRONMENTS } from '../../data/environmentRegistry';
import type { ConnectedSphereId } from '../sphereNetwork';
import { SPHERE_NETWORK, sphereNetworkCentroid } from '../sphereNetwork';
import { PITCH_BEATS } from '../../data/pitchBeats';
import { pitchRamp } from '../beats/pitchContent';
import { resolvePitchPlacement } from '../beats/pitchStageLayout';

export type JourneyPersonId = 'shweekar' | 'khalid' | 'tarek' | null;

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
};

const SEEDS: readonly BeatSeed[] = [
  { jId: 'J01', headlineEn: 'Fiction gave it a shape.', supportEn: 'Arrival · master sphere', narrationEn: 'Reality gave it a job.', look: 'centroid', nodeId: null, evidence: 'registry-only' },
  { jId: 'J17', headlineEn: 'Shweekar Ahmed in Context', supportEn: 'About Us · People', narrationEn: 'The first of three people behind the studio.', look: 'about-us', nodeId: 'about__people__shweekar', person: 'shweekar', assetIds: ['img-person-shweekar'], evidence: 'assets' },
  { jId: 'J18', headlineEn: 'Khalid Alshaalan Connects', supportEn: 'About Us · People', narrationEn: 'The second of three people behind the studio.', look: 'about-us', nodeId: 'about__people__khalid', person: 'khalid', assetIds: ['img-person-khalid'], evidence: 'assets', honestNoteEn: 'Portrait reference supplied. The image is not validated for runtime display yet.' },
  { jId: 'J16', headlineEn: 'People Make Systems Work', supportEn: 'About Us · People', narrationEn: 'Human judgment, amplified by systems.', look: 'about-us', nodeId: 'about__people__tarek', person: 'tarek', assetIds: ['img-person-shweekar', 'img-person-khalid', 'img-tn-onfire'], evidence: 'assets' },
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
  return SEEDS.map((s, i) => {
    const pitch = PITCH_BEATS[i];
    if (!pitch || pitch.jId !== s.jId) throw new Error(`Journey seed ${s.jId} is out of step with the pitch order at position ${i + 1}`);
    return {
      id: s.jId.toLowerCase(),
      jId: s.jId,
      order: i + 1,
      startSec: pitch.startSec,
      endSec: pitch.endSec,
      headlineEn: pitch.name,
      supportEn: s.supportEn,
      narrationEn: pitch.onScreenText,
      look: ENVIRONMENTS[pitch.envId].sphereId,
      nodeId: s.nodeId,
      person: s.person ?? null,
      assetIds: s.assetIds ?? [],
      evidence: s.evidence,
      honestNoteEn: s.honestNoteEn,
    };
  });
}

export const JOURNEY_BEATS: readonly JourneyBeat[] = buildBeats();

export const JOURNEY_BASE_DURATION_SEC = JOURNEY_BEATS[JOURNEY_BEATS.length - 1].endSec;

export type JourneyStop = {
  /** Seconds on the editorial clock when the camera arrives. */
  atSec: number;
  /** When the camera leaves again. Until then it rests on the stop. Defaults to `atSec`. */
  departSec?: number;
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

const OPENING_FOCAL_MM = 24;

/**
 * One camera stop per beat, placed from the registry anchor of the beat's target. The camera reaches the stop
 * after the beat's travel time and rests there for the remainder of the beat. A beat whose target has no
 * anchor falls back to an orbit of its sphere rather than failing.
 */
export function buildJourneyStops(): JourneyStop[] {
  const centroid = lookCenter('centroid');
  const about = lookCenter('about-us');
  const stops: JourneyStop[] = [
    {
      atSec: 0,
      departSec: 0,
      position: [about[0] + 9, about[1] + 7, about[2] + 24],
      target: centroid,
      focalMm: OPENING_FOCAL_MM,
    },
  ];
  JOURNEY_BEATS.forEach((beat, i) => {
    const pitch = PITCH_BEATS[i];
    const placement = resolvePitchPlacement(pitch);
    const arriveAt = beat.startSec + pitchRamp(pitch).travelSec;
    if (placement) {
      stops.push({
        atSec: arriveAt,
        departSec: beat.endSec,
        position: [...placement.cameraPosition],
        target: [...placement.anchor],
        focalMm: pitch.camera.focalMm,
      });
      return;
    }
    const center = lookCenter(beat.look);
    stops.push({
      atSec: arriveAt,
      departSec: beat.endSec,
      position: [center[0] + 8, center[1] + 2, center[2] + 8],
      target: center,
      focalMm: FOCAL_BY_EVIDENCE[beat.evidence],
    });
  });
  const last = stops[stops.length - 1];
  stops.push({ ...last, atSec: JOURNEY_BASE_DURATION_SEC, departSec: JOURNEY_BASE_DURATION_SEC });
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
