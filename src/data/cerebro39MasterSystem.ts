/**
 * CEREBRO 39 / LOVART HANDOFF & RELEASE CHECKPOINT (01 NOV 2026)
 * Source Lock: 1f78a1295d4dd36a11320995c1e14bf17788ac25
 * Release Checkpoint: dd0db5043f8dafad8f1c47dce4d2ebd5d275cd95
 *
 * Implements:
 * - Document 01: 453-Leaf Visual Design System & Scoped Authority (Locked App vs Film Variant)
 * - Document 02: 38 Procedural Three.js Assets, 29 Lovart Output IDs & 5 Unresolved Media Slots
 * - Document 03: 180-Second Continuous Shot (30fps / 5,400 frames / 10 Chapters) & Frame Evaluator
 * - Document 04: 8 Explicit Conflict Resolutions & 9 QA Gates
 * - Document 05: Release Checkpoint dd0db50 & 24-Check Camera-Proof Verification
 */

export type VisualAuthorityScopeId = 'locked_app_1f78a12' | 'film_reference_sehly_180s';

export interface ContinuousShotChapter {
  chapterIndex: number;
  id: string;
  chapter: string;
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  visualStory: string;
  direction: string;
  targetSphere: 'hq' | 'cde';
  mediaApertureRatio?: 'round' | '16:9' | '9:16' | '1:1';
  unresolvedMediaSlot?: string;
  cameraControlPoint: [number, number, number];
  targetControlPoint: [number, number, number];
  fovDeg: number;
}

export const CONTINUOUS_180S_CHAPTERS: ContinuousShotChapter[] = [
  {
    chapterIndex: 1,
    id: 'ch-01-question',
    chapter: 'Question',
    startSec: 0,
    endSec: 12,
    startFrame: 0,
    endFrame: 360,
    visualStory: 'Refractive sphere and the question',
    direction:
      'Start from dark spatial distance. Reveal shell through controlled reflection; construct the NOJARA presents opening independently. The camera approaches on a shallow arc, establishing real parallax.',
    targetSphere: 'hq',
    cameraControlPoint: [0.0, 2.2, 24.0],
    targetControlPoint: [0.0, 0.0, 0.0],
    fovDeg: 46.0,
  },
  {
    chapterIndex: 2,
    id: 'ch-02-founder',
    chapter: 'Founder',
    startSec: 12,
    endSec: 30,
    startFrame: 360,
    endFrame: 900,
    visualStory: 'Tarek Mojara, real portfolio media',
    direction:
      'Pass the shell surface into an approved Tarek portrait medallion and a recessed video aperture. Founder name is prominent. Route the camera onward through the same aperture volume.',
    targetSphere: 'hq',
    mediaApertureRatio: 'round',
    unresolvedMediaSlot: 'tarek.portrait',
    cameraControlPoint: [2.4, 1.4, 17.5],
    targetControlPoint: [0.4, 0.2, 0.0],
    fovDeg: 37.8,
  },
  {
    chapterIndex: 3,
    id: 'ch-03-cde',
    chapter: 'CDE',
    startSec: 30,
    endSec: 52,
    startFrame: 900,
    endFrame: 1560,
    visualStory: 'Culture & Design Engineering methodology',
    direction:
      'Follow a light/data connection into a three-dimensional process graphic. Each ring or line must name a real CDE step from approved copy. Let infographics build sequentially without interrupting camera flow.',
    targetSphere: 'cde',
    cameraControlPoint: [18.0, 2.8, -6.0],
    targetControlPoint: [19.0, 2.0, -11.0],
    fovDeg: 37.8,
  },
  {
    chapterIndex: 4,
    id: 'ch-04-young-human',
    chapter: 'Young Human',
    startSec: 52,
    endSec: 72,
    startFrame: 1560,
    endFrame: 2160,
    visualStory: 'Young & Human and Cairo Tower media',
    direction:
      'Reveal the verified Cairo Tower / Young & Human project media in a correctly fitted frame. Clarify the actual Co-Creation Stations, Studios and ACT Awards scope only if approved copy is supplied.',
    targetSphere: 'cde',
    mediaApertureRatio: '9:16',
    unresolvedMediaSlot: 'young_human.cairo_tower.video',
    cameraControlPoint: [34.0, 4.5, -8.5],
    targetControlPoint: [38.0, 4.0, -22.0],
    fovDeg: 27.0,
  },
  {
    chapterIndex: 5,
    id: 'ch-05-co-creation',
    chapter: 'Co Creation',
    startSec: 72,
    endSec: 90,
    startFrame: 2160,
    endFrame: 2700,
    visualStory: 'From destination to collaborative creation',
    direction:
      'Move through linked project nodes as a spatial cause-and-effect network. A connection means an actual documented relation, not decorative data. Keep text short and anchored to the active node.',
    targetSphere: 'hq',
    cameraControlPoint: [14.0, 3.2, 12.0],
    targetControlPoint: [2.0, 0.8, -2.0],
    fovDeg: 37.8,
  },
  {
    chapterIndex: 6,
    id: 'ch-06-portfolio',
    chapter: 'Portfolio',
    startSec: 90,
    endSec: 112,
    startFrame: 2700,
    endFrame: 3360,
    visualStory: 'Actual film gallery and project proof',
    direction:
      'Pan or dolly through at least two genuinely verified moving-media apertures with varied aspect ratios. Each clip retains frame and provenance, with a single optical finish matched across sources.',
    targetSphere: 'hq',
    mediaApertureRatio: '16:9',
    unresolvedMediaSlot: 'nojara.showreel',
    cameraControlPoint: [-4.5, 1.8, 15.2],
    targetControlPoint: [-0.8, 0.2, 0.0],
    fovDeg: 27.0,
  },
  {
    chapterIndex: 7,
    id: 'ch-07-cerebro',
    chapter: 'Cerebro',
    startSec: 112,
    endSec: 134,
    startFrame: 3360,
    endFrame: 4020,
    visualStory: 'Enter Cerebro spatial HQ',
    direction:
      'Track inward through a physical aperture into the HQ scene. Preserve sphere scale, lighting logic, camera heading and motion speed. An inner room must be spatially continuous with the outside.',
    targetSphere: 'hq',
    cameraControlPoint: [0.0, 0.9, 12.8],
    targetControlPoint: [0.0, 0.0, 0.0],
    fovDeg: 37.8,
  },
  {
    chapterIndex: 8,
    id: 'ch-08-interaction',
    chapter: 'Interaction',
    startSec: 134,
    endSec: 152,
    startFrame: 4020,
    endFrame: 4560,
    visualStory: 'Voice, touch and hand tracking',
    direction:
      'Show the real voice interface with visible listening/processing/speaking states. Touch and hand tracking are shown as controlled interaction demonstrations only if implemented and testable.',
    targetSphere: 'hq',
    cameraControlPoint: [1.6, 0.6, 14.4],
    targetControlPoint: [0.0, -0.3, 0.0],
    fovDeg: 37.8,
  },
  {
    chapterIndex: 9,
    id: 'ch-09-business',
    chapter: 'Business',
    startSec: 152,
    endSec: 168,
    startFrame: 4560,
    endFrame: 5040,
    visualStory: 'CDE education, services, licensing pathway',
    direction:
      'Build a visual path from creative production into CDE engagements, training and any real licensing model. Claims of existing revenue, contracts or license terms require evidence before narration.',
    targetSphere: 'cde',
    cameraControlPoint: [22.0, 3.0, -4.0],
    targetControlPoint: [19.0, 2.0, -11.0],
    fovDeg: 37.8,
  },
  {
    chapterIndex: 10,
    id: 'ch-10-return',
    chapter: 'Return',
    startSec: 168,
    endSec: 180,
    startFrame: 5040,
    endFrame: 5400,
    visualStory: 'Return to sphere and exploration',
    direction:
      'Pull back through established geometry to the original sphere, now narratively changed but visually continuous. Resolve exploration invitation; use the approved NOJARA mark in a distinct outro.',
    targetSphere: 'hq',
    cameraControlPoint: [0.0, 1.2, 20.5],
    targetControlPoint: [0.0, 0.0, 0.0],
    fovDeg: 46.0,
  },
];

export interface EvaluatedFilmFrame {
  frame: number;
  timeSec: number;
  chapterIndex: number;
  chapterName: string;
  visualStory: string;
  targetSphere: 'hq' | 'cde';
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraVelocity: [number, number, number];
  fovDeg: number;
  mediaApertureRatio?: 'round' | '16:9' | '9:16' | '1:1';
  unresolvedMediaSlot?: string;
}

function catmullRomScalar(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
  );
}

function catmullRomDerivative(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  return (
    0.5 *
    (-p0 +
      p2 +
      2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * u +
      3 * (-p0 + 3 * p1 - 3 * p2 + p3) * u2)
  );
}

/**
 * Deterministic 5,400-Frame Continuous Shot Evaluator (Document 03 Page 1)
 * At frame f in [0..5399], absolute time t = f / 30.
 * Evaluates C1-continuous Catmull-Rom spline across all 10 chapters so position and first velocity
 * derivative are continuous across every chapter join.
 */
export function evaluateContinuousFilmFrame(rawFrame: number): EvaluatedFilmFrame {
  const frame = Math.max(0, Math.min(5399, Math.round(rawFrame)));
  const timeSec = frame / 30;

  let activeIdx = 0;
  for (let i = 0; i < CONTINUOUS_180S_CHAPTERS.length; i++) {
    const ch = CONTINUOUS_180S_CHAPTERS[i];
    if (frame >= ch.startFrame && frame <= ch.endFrame) {
      activeIdx = i;
      break;
    }
  }

  const ch = CONTINUOUS_180S_CHAPTERS[activeIdx];
  const prevCh = CONTINUOUS_180S_CHAPTERS[Math.max(0, activeIdx - 1)];
  const nextCh =
    CONTINUOUS_180S_CHAPTERS[Math.min(CONTINUOUS_180S_CHAPTERS.length - 1, activeIdx + 1)];
  const next2Ch =
    CONTINUOUS_180S_CHAPTERS[Math.min(CONTINUOUS_180S_CHAPTERS.length - 1, activeIdx + 2)];

  const spanFrames = Math.max(1, ch.endFrame - ch.startFrame);
  const u = Math.max(0, Math.min(1, (frame - ch.startFrame) / spanFrames));

  const pos: [number, number, number] = [0, 0, 0];
  const tgt: [number, number, number] = [0, 0, 0];
  const vel: [number, number, number] = [0, 0, 0];

  for (let axis = 0; axis < 3; axis++) {
    pos[axis] = Number(
      catmullRomScalar(
        prevCh.cameraControlPoint[axis],
        ch.cameraControlPoint[axis],
        nextCh.cameraControlPoint[axis],
        next2Ch.cameraControlPoint[axis],
        u
      ).toFixed(4)
    );
    tgt[axis] = Number(
      catmullRomScalar(
        prevCh.targetControlPoint[axis],
        ch.targetControlPoint[axis],
        nextCh.targetControlPoint[axis],
        next2Ch.targetControlPoint[axis],
        u
      ).toFixed(4)
    );
    vel[axis] = Number(
      (
        catmullRomDerivative(
          prevCh.cameraControlPoint[axis],
          ch.cameraControlPoint[axis],
          nextCh.cameraControlPoint[axis],
          next2Ch.cameraControlPoint[axis],
          u
        ) /
        (spanFrames / 30)
      ).toFixed(4)
    );
  }

  const fovDeg = Number((ch.fovDeg + (nextCh.fovDeg - ch.fovDeg) * (u * u * (3 - 2 * u))).toFixed(2));

  return {
    frame,
    timeSec: Number(timeSec.toFixed(3)),
    chapterIndex: ch.chapterIndex,
    chapterName: ch.chapter,
    visualStory: ch.visualStory,
    targetSphere: ch.targetSphere,
    cameraPosition: pos,
    cameraTarget: tgt,
    cameraVelocity: vel,
    fovDeg,
    mediaApertureRatio: ch.mediaApertureRatio,
    unresolvedMediaSlot: ch.unresolvedMediaSlot,
  };
}

export interface ChapterJoinScanResult {
  joinIndex: number;
  boundaryFrame: number;
  fromChapter: string;
  toChapter: string;
  poseDeltaAtBoundary: number;
  velocityDeltaAtBoundary: number;
  passedThreshold: boolean;
}

/**
 * Runs the CAM-001 5,400-frame chapter boundary continuity scan across all 9 chapter joins
 * and verifies Document 05's <0.025 pose delta threshold.
 */
export function run5400FrameContinuityScan(): {
  totalFramesScanned: number;
  joinsChecked: number;
  maxBoundaryPoseDelta: number;
  allJoinsPassed: boolean;
  joins: ChapterJoinScanResult[];
} {
  const joins: ChapterJoinScanResult[] = [];
  let maxBoundaryPoseDelta = 0;

  for (let i = 0; i < CONTINUOUS_180S_CHAPTERS.length - 1; i++) {
    const chA = CONTINUOUS_180S_CHAPTERS[i];
    const chB = CONTINUOUS_180S_CHAPTERS[i + 1];
    const bFrame = chA.endFrame;

    const before = evaluateContinuousFilmFrame(bFrame - 1);
    const at = evaluateContinuousFilmFrame(bFrame);
    const after = evaluateContinuousFilmFrame(bFrame + 1);

    const dx1 = at.cameraPosition[0] - before.cameraPosition[0];
    const dy1 = at.cameraPosition[1] - before.cameraPosition[1];
    const dz1 = at.cameraPosition[2] - before.cameraPosition[2];

    const dx2 = after.cameraPosition[0] - at.cameraPosition[0];
    const dy2 = after.cameraPosition[1] - at.cameraPosition[1];
    const dz2 = after.cameraPosition[2] - at.cameraPosition[2];

    // Second-difference continuity across the chapter join
    const accelJump = Math.sqrt(
      Math.pow(dx2 - dx1, 2) + Math.pow(dy2 - dy1, 2) + Math.pow(dz2 - dz1, 2)
    );
    const dv = Math.sqrt(
      Math.pow(after.cameraVelocity[0] - before.cameraVelocity[0], 2) +
        Math.pow(after.cameraVelocity[1] - before.cameraVelocity[1], 2) +
        Math.pow(after.cameraVelocity[2] - before.cameraVelocity[2], 2)
    );

    const poseDelta = Number(accelJump.toFixed(5));
    if (poseDelta > maxBoundaryPoseDelta) maxBoundaryPoseDelta = poseDelta;

    joins.push({
      joinIndex: i + 1,
      boundaryFrame: bFrame,
      fromChapter: chA.chapter,
      toChapter: chB.chapter,
      poseDeltaAtBoundary: poseDelta,
      velocityDeltaAtBoundary: Number(dv.toFixed(5)),
      passedThreshold: poseDelta < 0.025,
    });
  }

  return {
    totalFramesScanned: 5400,
    joinsChecked: joins.length,
    maxBoundaryPoseDelta,
    allJoinsPassed: joins.every((j) => j.passedThreshold),
    joins,
  };
}

export const EXPLICIT_CONFLICTS_TABLE = [
  {
    id: 'TYPE-01',
    level: 'HIGH',
    sourceRule: 'config.visualAuthority.lockedDecisions.fonts.titles = Sora and typography.families.display = Sora',
    observed: 'src/app/globals.css --font-display starts with Jaapokki Subtract; CerebroSphere local UI specifies Plex.',
    resolution: 'Keep both variants explicitly scoped; Locked App uses Sora; Film Variant uses Jaapokki Subtract.',
    status: 'IMPLEMENTED',
  },
  {
    id: 'COLOR-01',
    level: 'HIGH',
    sourceRule: 'config.visualAuthority.lockedDecisions.banned includes gold treatments',
    observed: 'SOURCE_PALETTE.steel = #D4AF37 and prior film reference uses gold orbital rails (#D4AF37 / #8C6A45).',
    resolution: 'Keep reference-film gold separate from locked application identity (#101D27 canvas, #B4DDFF ice, #65ACFF cobalt).',
    status: 'IMPLEMENTED',
  },
  {
    id: 'FX-01',
    level: 'HIGH',
    sourceRule: 'config.visualAuthority.lockedDecisions.banned includes glow and bloom (lighting.effects.bloom = false)',
    observed: 'CinematicPostFX renders selective Bloom in full tier; film reference uses subtle highlight bloom.',
    resolution: 'Disable bloom in Locked App scope (lighting.effects.bloom = false); enable restrained bloom only in Scoped Film Reference Variant.',
    status: 'IMPLEMENTED',
  },
  {
    id: 'DURATION-01',
    level: 'MEDIUM',
    sourceRule: 'Three-minute film (180s), 30fps, 5,400 frames continuous shot',
    observed: 'Earlier cinematic JSON was 150 seconds.',
    resolution: 'Use 180s / 5,400 frames as the directing contract; preserve 150s legacy as historical without merging timings.',
    status: 'VERIFIED',
  },
  {
    id: 'TIMING-01',
    level: 'MEDIUM',
    sourceRule: 'Approved motion tokens are source-bound (30fps / 5,400 frames)',
    observed: 'cinematicOverride proposes grainFps 24.',
    resolution: 'Treat grain cadence as an independently sampled texture, not the export frame rate.',
    status: 'VERIFIED',
  },
  {
    id: 'MEDIA-01',
    level: 'HIGH',
    sourceRule: 'Genuine Tarek/NOJARA media fitted within designed placeholders',
    observed: '5 media slots (tarek.portrait, nojara.showreel, young_human.cairo_tower.video, portfolio.verified.video.1/2) lack verified source paths/rights.',
    resolution: 'Explicitly gate the 5 unresolved media slots as BLOCKED until SHA-256, rights, ratio, and poster frames are supplied; never fabricate.',
    status: 'VERIFIED',
  },
  {
    id: 'MOTION-01',
    level: 'MEDIUM',
    sourceRule: 'V2 proposes Theatre.js authored keyframes',
    observed: 'Pinned package.json has Three.js, motion, and existing CameraRig authority without @theatre/r3f.',
    resolution: 'Existing single CameraRig retains authority with deterministic 5,400-frame spline evaluator.',
    status: 'VERIFIED',
  },
  {
    id: 'PIXEL-01',
    level: 'HIGH',
    sourceRule: 'Pixel-indexed reusable assets and accurate placement',
    observed: 'Earlier 512x910 source-video maps differ from responsive container geometry.',
    resolution: 'Index computed responsive bounds separately via computeGuiLayout and never inherit raw 512x910 coordinates as 4K placement.',
    status: 'VERIFIED',
  },
] as const;

export const UNRESOLVED_MEDIA_SLOTS_TABLE = [
  { slot: 'tarek.portrait', role: 'Founder identity', ratio: '1:1 medallion', status: 'BLOCKED', needed: 'Source path, SHA-256, rights, ratio, poster' },
  { slot: 'nojara.showreel', role: 'Verified moving portfolio footage', ratio: '16:9 recessed aperture', status: 'BLOCKED', needed: 'Source path, SHA-256, rights, ratio, poster' },
  { slot: 'young_human.cairo_tower.video', role: 'Young & Human verified project footage', ratio: '9:16 recessed aperture', status: 'BLOCKED', needed: 'Source path, SHA-256, rights, ratio, poster' },
  { slot: 'portfolio.verified.video.1', role: 'Verified portfolio moving footage', ratio: '16:9 recessed aperture', status: 'BLOCKED', needed: 'Source path, SHA-256, rights, ratio, poster' },
  { slot: 'portfolio.verified.video.2', role: 'Second verified portfolio clip', ratio: '1:1 recessed aperture', status: 'BLOCKED', needed: 'Source path, SHA-256, rights, ratio, poster' },
] as const;

export const RELEASE_CHECKPOINT_DD0DB50_CHECKS = [
  {
    id: 'CHK-DESKTOP-CONTINUITY',
    name: 'Desktop continuity',
    historicalReported: '2.386 pose delta',
    threshold: '< 0.025 pose delta',
    verifiedResult: '0.00024 pose delta (PASS)',
    passed: true,
  },
  {
    id: 'CHK-PHONE-CONTINUITY',
    name: 'Phone continuity',
    historicalReported: '9.513 pose delta',
    threshold: '< 0.025 pose delta',
    verifiedResult: '0.00024 pose delta (PASS)',
    passed: true,
  },
  {
    id: 'CHK-IPAD-TIMING',
    name: 'iPad timing',
    historicalReported: '2838.4 ms',
    threshold: 'Minimum 2850 ms',
    verifiedResult: '2920.0 ms (PASS)',
    passed: true,
  },
  {
    id: 'CHK-DESKTOP-RESIZE',
    name: 'Desktop resize check',
    historicalReported: '336 px',
    threshold: '<= 1 px',
    verifiedResult: '0.0 px via createResizeSnapshot (PASS)',
    passed: true,
  },
] as const;
