/**
 * Editorial source of truth for the 180-second, 25-beat pitch.
 *
 * Transcribed from the pitch spec. This is editorial data, not executable camera coordinates and not
 * proof that anything is implemented: `verifyPitchBeats` reports what still blocks each beat.
 *
 * Contract: Drive /view URLs are provenance only. `runtimeUrl` and clip in/out stay null until a file is
 * ingested, reviewed and validated. Metrics describe specified structure or pending evidence, never results.
 */
import type { EnvironmentId } from './environmentRegistry';

export type PitchSourceId =
  | 'master' | 'shweekar' | 'khalid' | 'onfire' | 'traverse' | 'impact' | 'production' | 'outdoor'
  | 'riyadh_bts' | 'studio' | 'afrima' | 'gouna' | 'laliga' | 'riyadh' | 'batron' | 'batron_mov';

export type PitchSource = {
  title: string;
  driveFileId: string;
  /** Provenance link. Never a playable source. */
  driveUrl: string;
  runtimeUrl: null;
  inSec: null;
  outSec: null;
  note: string;
};

export type PitchMediaKind = 'mixed' | 'prototype';

export type PitchMetricEvidence = 'structure-count' | 'process-label' | 'pending';

export type PitchBeat = {
  index: number;
  jId: string;
  name: string;
  startSec: number;
  endSec: number;
  envId: EnvironmentId;
  targetId: string;
  onScreenText: string;
  voiceover: string;
  mediaKind: PitchMediaKind;
  mediaNote: string;
  sourceIds: readonly PitchSourceId[];
  camera: { focalMm: number; move: string };
  metric: { display: string; context: string; evidence: PitchMetricEvidence };
};

export const PITCH_TOTAL_SEC = 180;

export const PITCH_FILM_GAUGE_MM = 36;

export const PITCH_PACING = { wordSec: 0.18, sentencePauseSec: 0.45, minHoldSec: 1.4 } as const;

/** Phrases the spec forbids unless backed by source-tested evidence. */
export const PITCH_BANNED_CLAIMS: readonly RegExp[] = [
  /\b70\s?%/, /\b85\s?%/, /\b60\s?fps\b/i, /\b99\.9/, /zero churn/i, /zero cac/i, /\bexit(s)?\b/i,
];

const driveUrl = (id: string): string => `https://drive.google.com/file/d/${id}/view?usp=drivesdk`;

type SourceSeed = { title: string; driveFileId: string; note: string };

const SOURCE_SEEDS: Record<PitchSourceId, SourceSeed> = {
  "master": {
    "title": "Master Media Kit Reel",
    "driveFileId": "19dUAIdbULKjOCbigIt_vQXgFZn0jVoBu",
    "note": "Studio candidate; content and usage review pending."
  },
  "shweekar": {
    "title": "Shweekar Ahmed portrait",
    "driveFileId": "15gAJwJvL1Yma0MCGQOJmej6zZRlViu9-",
    "note": "User-confirmed portrait reference."
  },
  "khalid": {
    "title": "Khalid Alshaalan portrait",
    "driveFileId": "1Hod7c-5Zi53w8VSwwmvtcp2Dife_cGbf",
    "note": "User-confirmed portrait reference."
  },
  "onfire": {
    "title": "TN_ONFIRE",
    "driveFileId": "170WxTGtMYvmHVFAUhY-wXLEB6iKTUgbx",
    "note": "User approved Tarek image."
  },
  "traverse": {
    "title": "Traverse Talks: The Art of Disruption",
    "driveFileId": "10wkMG1uToiOzivulOf6z_p929HfnHuS0",
    "note": "User-approved Tarek media; quote/excerpt review pending."
  },
  "impact": {
    "title": "TN Impact List",
    "driveFileId": "18E4nCk7NDxkGlOFakl5bD-gHeyus_8X-",
    "note": "User-approved Tarek media; no ranking claim inferred."
  },
  "production": {
    "title": "But First, Production with Tarek Nojara",
    "driveFileId": "1FNtBCltin3KBB5lPSSqXcLMkdXJTsUAX",
    "note": "User-approved Tarek media; excerpt review pending."
  },
  "outdoor": {
    "title": "Outdoor production",
    "driveFileId": "1ucm2Zc9YeiCH8M10gzEGc5F4vk2_vu8j",
    "note": "User-approved Tarek media; contextual caption review pending."
  },
  "riyadh_bts": {
    "title": "Riyadh Season BTS",
    "driveFileId": "15vzqgrVAyTcjZ6Dyb8972d1KcnGF0HSW",
    "note": "Saudi-related work only; contextual caption review pending."
  },
  "studio": {
    "title": "NOJARA Showreel",
    "driveFileId": "143QDgWYEcU9kI7F87XVMHr9WZuWl6HBe",
    "note": "Studio candidate; content and usage review pending."
  },
  "afrima": {
    "title": "All Africa Music Awards",
    "driveFileId": "13doivicNrG4XoDlU3IPd6Ou4cSYKJPl9",
    "note": "User-approved Tarek media; role and excerpt review pending."
  },
  "gouna": {
    "title": "Gouna Film Festival",
    "driveFileId": "1v35MmuknjUKZjiEgAfdCmATDkveIiYbH",
    "note": "User-approved Tarek media; role and excerpt review pending."
  },
  "laliga": {
    "title": "NOJ LaLiga Wal3ana",
    "driveFileId": "1JuftO8KtXKGeEcEPCXDpDXmtiS5a9orQ",
    "note": "User-approved personal/work media; precise credit review pending."
  },
  "riyadh": {
    "title": "Riyadh Season launch campaign",
    "driveFileId": "1WOsaz0C-F9sTnWl_xQaSN1wt86I_jRoA",
    "note": "Saudi-related work only; excerpt review pending."
  },
  "batron": {
    "title": "El Batron MP4",
    "driveFileId": "1xh0Dqv4yo-sUO7oSZbThIG0e1RDXLln8",
    "note": "Project candidate; excerpt review pending."
  },
  "batron_mov": {
    "title": "El Batron MOV",
    "driveFileId": "1WWWK8gL9_0y1VPbivuXy3uzUmS3XbBFZ",
    "note": "Separate source from MP4; do not dedupe by title."
  }
};

export const PITCH_SOURCES: Readonly<Record<PitchSourceId, PitchSource>> = Object.fromEntries(
  (Object.keys(SOURCE_SEEDS) as PitchSourceId[]).map((id) => [
    id,
    { ...SOURCE_SEEDS[id], driveUrl: driveUrl(SOURCE_SEEDS[id].driveFileId), runtimeUrl: null, inSec: null, outSec: null },
  ]),
) as Record<PitchSourceId, PitchSource>;

export const PITCH_BEATS: readonly PitchBeat[] = [
  {
    "index": 0,
    "jId": "J01",
    "name": "Built from the Work",
    "startSec": 0,
    "endSec": 6,
    "envId": "env_about",
    "targetId": "env_about__premise__hello_friend",
    "onScreenText": "Fiction gave it a shape. Reality gave it a job.",
    "voiceover": "Every production brings people, pressure and decisions together. Cerebro begins with that work.",
    "mediaKind": "mixed",
    "mediaNote": "Actual master sphere forms from a comet trail; optional reviewed reel stays inside one curved media shell.",
    "sourceIds": [
      "master"
    ],
    "camera": {
      "focalMm": 28,
      "move": "Wide reveal, decelerating along a curved approach to the master sphere."
    },
    "metric": {
      "display": "Built from practice",
      "context": "Narrative premise, not a traction claim.",
      "evidence": "process-label"
    }
  },
  {
    "index": 1,
    "jId": "J17",
    "name": "Shweekar Ahmed in Context",
    "startSec": 6,
    "endSec": 12,
    "envId": "env_about",
    "targetId": "env_about__people__shweekar",
    "onScreenText": "Shweekar Ahmed. People before platforms.",
    "voiceover": "Before a platform, there are people. Before a workflow, there is a conversation. This is where the story begins.",
    "mediaKind": "mixed",
    "mediaNote": "Portrait in a single floating frame beside the name; no inferred job title.",
    "sourceIds": [
      "shweekar"
    ],
    "camera": {
      "focalMm": 50,
      "move": "Continue through sphere opening; gentle lateral drift to portrait."
    },
    "metric": {
      "display": "Profile linked",
      "context": "Portrait source supplied; biography requires approval.",
      "evidence": "process-label"
    }
  },
  {
    "index": 2,
    "jId": "J18",
    "name": "Khalid Alshaalan Connects",
    "startSec": 12,
    "endSec": 18,
    "envId": "env_about",
    "targetId": "env_about__people__khalid",
    "onScreenText": "Khalid Alshaalan. Connection begins with people.",
    "voiceover": "People connect the work across ideas, conversations and decisions. The system should help those connections stay visible.",
    "mediaKind": "mixed",
    "mediaNote": "Portrait frame enters on the opposite side while previous frame recedes.",
    "sourceIds": [
      "khalid"
    ],
    "camera": {
      "focalMm": 50,
      "move": "Continuous shallow arc to second portrait; maintain eye-line."
    },
    "metric": {
      "display": "Profile linked",
      "context": "Portrait source supplied; role and credit require approval.",
      "evidence": "process-label"
    }
  },
  {
    "index": 3,
    "jId": "J16",
    "name": "People Make Systems Work",
    "startSec": 18,
    "endSec": 25,
    "envId": "env_about",
    "targetId": "env_about__people__tarek",
    "onScreenText": "People make systems work.",
    "voiceover": "Shweekar. Khalid. Tarek. One introduction, then into Tarek’s story: the work that shaped the system.",
    "mediaKind": "mixed",
    "mediaNote": "Three named profile frames share space; Tarek becomes the focal destination.",
    "sourceIds": [
      "shweekar",
      "khalid",
      "onfire"
    ],
    "camera": {
      "focalMm": 40,
      "move": "Ease backward enough to reveal all three, then drift toward Tarek."
    },
    "metric": {
      "display": "3 human profiles",
      "context": "Structural count in this opening, not the full team size.",
      "evidence": "structure-count"
    }
  },
  {
    "index": 4,
    "jId": "J02",
    "name": "Hard Projects Useful Lessons",
    "startSec": 25,
    "endSec": 34,
    "envId": "env_about",
    "targetId": "env_about__people__tarek",
    "onScreenText": "Hard projects. Useful lessons.",
    "voiceover": "I’m Tarek Nojara: founder, creative producer, strategist, and Culture and Design Engineer. Cerebro grows from how I approach the work.",
    "mediaKind": "mixed",
    "mediaNote": "Tarek portrait yields to one framed interview/production excerpt; no unverified awards or ranking overlays.",
    "sourceIds": [
      "traverse",
      "impact",
      "production"
    ],
    "camera": {
      "focalMm": 65,
      "move": "Gentle push from portrait toward reviewed work frame."
    },
    "metric": {
      "display": "Lessons, not inflated claims",
      "context": "No quantified performance result is established here.",
      "evidence": "process-label"
    }
  },
  {
    "index": 5,
    "jId": "J03",
    "name": "Craft Meets Creative Tech",
    "startSec": 34,
    "endSec": 41,
    "envId": "env_cde",
    "targetId": "env_cde__domains__production",
    "onScreenText": "Craft meets creative technology.",
    "voiceover": "Production engineering means turning an idea into something people can actually make, coordinate and deliver.",
    "mediaKind": "mixed",
    "mediaNote": "Production media paired with abstract brief-to-output geometry. Saudi material appears only with Saudi caption.",
    "sourceIds": [
      "production",
      "outdoor",
      "riyadh_bts"
    ],
    "camera": {
      "focalMm": 35,
      "move": "Follow a connecting path into CDE; modest 15-degree orbital move."
    },
    "metric": {
      "display": "Idea → working solution",
      "context": "Intended working method; no measured turnaround claim.",
      "evidence": "process-label"
    }
  },
  {
    "index": 6,
    "jId": "J04",
    "name": "The Studio Connects Everything",
    "startSec": 41,
    "endSec": 48,
    "envId": "env_about",
    "targetId": "env_about__identity__nojara",
    "onScreenText": "NOJARA connects the work.",
    "voiceover": "The studio brings strategy, production, talent and media technology into one conversation. Cerebro is the workspace we are developing around it.",
    "mediaKind": "mixed",
    "mediaNote": "Studio showreel framed within studio identity node; no revenue or client-credit inference.",
    "sourceIds": [
      "studio"
    ],
    "camera": {
      "focalMm": 40,
      "move": "One continuous curved return to identity node, then align toward CDE."
    },
    "metric": {
      "display": "4 connected disciplines",
      "context": "Count of the four proposed CDE domains.",
      "evidence": "structure-count"
    }
  },
  {
    "index": 7,
    "jId": "J05",
    "name": "Culture Becomes Design Input",
    "startSec": 48,
    "endSec": 55,
    "envId": "env_cde",
    "targetId": "env_cde__domains__strategy",
    "onScreenText": "Culture is an input. Not decoration.",
    "voiceover": "Culture and Design Engineering begins by understanding people, place and participation before choosing a format.",
    "mediaKind": "mixed",
    "mediaNote": "One reviewed cultural-context excerpt; text stays readable on a quiet adjacent plane.",
    "sourceIds": [
      "traverse",
      "afrima",
      "gouna"
    ],
    "camera": {
      "focalMm": 50,
      "move": "Slow lateral track through strategy node, with media depth behind text."
    },
    "metric": {
      "display": "Context before concept",
      "context": "Process principle; no audience-impact statistic asserted.",
      "evidence": "process-label"
    }
  },
  {
    "index": 8,
    "jId": "J06",
    "name": "Research Before the Render",
    "startSec": 55,
    "endSec": 62,
    "envId": "env_cde",
    "targetId": "env_cde__domains__strategy",
    "onScreenText": "Research before the render.",
    "voiceover": "The question comes first. Evidence shapes the brief, and the brief shapes what deserves to be built.",
    "mediaKind": "prototype",
    "mediaNote": "Illustrative research cards labeled Source, Question, Finding. Real documents only after permission and source checks.",
    "sourceIds": [],
    "camera": {
      "focalMm": 50,
      "move": "Crane gently downward to three evidence cards; no hard cut."
    },
    "metric": {
      "display": "Evidence required",
      "context": "Research-result metrics remain pending until a source is attached.",
      "evidence": "pending"
    }
  },
  {
    "index": 9,
    "jId": "J07",
    "name": "Design for Real Participation",
    "startSec": 62,
    "endSec": 69,
    "envId": "env_cde",
    "targetId": "env_cde__domains__talent",
    "onScreenText": "Design for participation.",
    "voiceover": "The goal is not simply to be watched. It is to give people a clear way to contribute. Participation must be tested, not assumed.",
    "mediaKind": "prototype",
    "mediaNote": "Illustrative contribution prompt and response node; visible Concept label.",
    "sourceIds": [],
    "camera": {
      "focalMm": 40,
      "move": "Orbit a modest 20 degrees around contribution node."
    },
    "metric": {
      "display": "Participation baseline pending",
      "context": "No reach, retention or conversion percentage is available.",
      "evidence": "pending"
    }
  },
  {
    "index": 10,
    "jId": "J08",
    "name": "Operate What You Imagine",
    "startSec": 69,
    "endSec": 78,
    "envId": "env_hq",
    "targetId": "env_hq__tasks__context",
    "onScreenText": "Brief. People. Files. Decisions. Next action.",
    "voiceover": "Cerebro organizes the context around a piece of work. Humans keep responsibility for the decisions and approvals.",
    "mediaKind": "mixed",
    "mediaNote": "Five actual context nodes if implemented; otherwise labeled interface prototype, with production media receding.",
    "sourceIds": [
      "production"
    ],
    "camera": {
      "focalMm": 35,
      "move": "Travel into HQ and follow the five-node context chain without stopping at every label."
    },
    "metric": {
      "display": "5 context fields",
      "context": "Structural count, not a proven efficiency gain.",
      "evidence": "structure-count"
    }
  },
  {
    "index": 11,
    "jId": "J09",
    "name": "Measure What Actually Happened",
    "startSec": 78,
    "endSec": 85,
    "envId": "env_hq",
    "targetId": "env_hq__tasks__evidence",
    "onScreenText": "Show what happened. Keep the source.",
    "voiceover": "An update needs evidence. A decision needs an owner. A proposed action is not an approved commitment.",
    "mediaKind": "prototype",
    "mediaNote": "Evidence panel using share-safe authorized metadata; visibly Disconnected if no tested register binding.",
    "sourceIds": [],
    "camera": {
      "focalMm": 50,
      "move": "Settle beside evidence panel with minimal drift for reading."
    },
    "metric": {
      "display": "Verification pending",
      "context": "Show real measured values only with dates, definitions and source links.",
      "evidence": "pending"
    }
  },
  {
    "index": 12,
    "jId": "J10",
    "name": "Young & Human Opens",
    "startSec": 85,
    "endSec": 92,
    "envId": "env_hq",
    "targetId": "env_hq__projects__yah",
    "onScreenText": "Young & Human. A place to begin.",
    "voiceover": "Young & Human asks a simple question: what happens when young people are invited to shape the experience, not just watch it?",
    "mediaKind": "prototype",
    "mediaNote": "YAH project node and typography; explicit Project media pending until correct assets are identified.",
    "sourceIds": [],
    "camera": {
      "focalMm": 40,
      "move": "Move through project orbit and approach YAH node."
    },
    "metric": {
      "display": "Project evidence pending",
      "context": "No substitution of unrelated Tarek footage or invented audience metrics.",
      "evidence": "pending"
    }
  },
  {
    "index": 13,
    "jId": "J11",
    "name": "Watching Becomes Making Together",
    "startSec": 92,
    "endSec": 99,
    "envId": "env_hq",
    "targetId": "env_hq__projects__yah_participation",
    "onScreenText": "From watching to making together.",
    "voiceover": "The ambition is participation: a clear invitation, a contribution, and a response. We will measure whether that loop works.",
    "mediaKind": "prototype",
    "mediaNote": "Illustrative three-step participation loop inside YAH; Concept label, not fake live participants.",
    "sourceIds": [],
    "camera": {
      "focalMm": 50,
      "move": "Track around the loop, resolving on contribution frame."
    },
    "metric": {
      "display": "3-step participation model",
      "context": "Proposed model; participation and retention outcomes remain unmeasured.",
      "evidence": "structure-count"
    }
  },
  {
    "index": 14,
    "jId": "J12",
    "name": "The Work Has Evidence",
    "startSec": 99,
    "endSec": 107,
    "envId": "env_hq",
    "targetId": "env_hq__media__tube",
    "onScreenText": "The work has evidence.",
    "voiceover": "Open the work, see its source, and understand the context. Each project keeps its own identity.",
    "mediaKind": "mixed",
    "mediaNote": "Preserve the real cylindrical 3D media gallery and curved tiles; distinct asset IDs and correct project captions.",
    "sourceIds": [
      "studio",
      "laliga",
      "riyadh"
    ],
    "camera": {
      "focalMm": 35,
      "move": "Enter the tube tangentially, tracking past tiles before one fills a safe frame."
    },
    "metric": {
      "display": "Source per populated tile",
      "context": "Binding requirement; playback is unverified until tested.",
      "evidence": "process-label"
    }
  },
  {
    "index": 15,
    "jId": "J13",
    "name": "El Batron Takes Shape",
    "startSec": 107,
    "endSec": 114,
    "envId": "env_hq",
    "targetId": "env_hq__projects__batron",
    "onScreenText": "El Batron takes shape.",
    "voiceover": "A cultural project needs more than a moment on screen. It needs a way to organize the work behind it.",
    "mediaKind": "mixed",
    "mediaNote": "El Batron MP4 in its own project frame; review excerpt before choosing cuts.",
    "sourceIds": [
      "batron"
    ],
    "camera": {
      "focalMm": 50,
      "move": "Follow selected tile outward into the El Batron project node."
    },
    "metric": {
      "display": "Project source linked",
      "context": "Asset association is proposed; no fabricated release or audience result.",
      "evidence": "process-label"
    }
  },
  {
    "index": 16,
    "jId": "J14",
    "name": "Talent Needs Working Infrastructure",
    "startSec": 114,
    "endSec": 121,
    "envId": "env_hq",
    "targetId": "env_hq__projects__batron_talent_os",
    "onScreenText": "Talent needs working infrastructure.",
    "voiceover": "Behind the cultural moment is the daily work: plans, responsibilities, assets and approvals. The ambition is to give that work a clearer home.",
    "mediaKind": "mixed",
    "mediaNote": "Reviewed alternate excerpt plus four labeled operational cards; Concept label if workflow is not live.",
    "sourceIds": [
      "batron_mov"
    ],
    "camera": {
      "focalMm": 40,
      "move": "Gentle pullback reveals supporting cards around project media."
    },
    "metric": {
      "display": "4 operational needs",
      "context": "Structural checklist, not proof of automated distribution or payouts.",
      "evidence": "structure-count"
    }
  },
  {
    "index": 17,
    "jId": "J15",
    "name": "Made in Egypt Next",
    "startSec": 121,
    "endSec": 128,
    "envId": "env_cde",
    "targetId": "env_cde__domains__talent",
    "onScreenText": "Made in Egypt. Built for what’s next.",
    "voiceover": "The ambition is to turn local creative experience into tools and opportunities that can travel. The next chapter still has to be earned.",
    "mediaKind": "mixed",
    "mediaNote": "Reviewed culturally relevant media; no unsupported international sales, partnership or export claims.",
    "sourceIds": [
      "afrima",
      "gouna"
    ],
    "camera": {
      "focalMm": 35,
      "move": "Rise gently from talent node to a wider CDE view."
    },
    "metric": {
      "display": "Future-facing ambition",
      "context": "No export revenue, jobs-created or impact figure claimed.",
      "evidence": "process-label"
    }
  },
  {
    "index": 18,
    "jId": "J19",
    "name": "Services Meet Creative IP",
    "startSec": 128,
    "endSec": 135,
    "envId": "env_cde",
    "targetId": "env_cde__domains__strategy_ip",
    "onScreenText": "Services teach us what to package.",
    "voiceover": "The commercial hypothesis is straightforward: learn through real projects, package useful patterns, and test whether customers will pay for them.",
    "mediaKind": "mixed",
    "mediaNote": "Studio work frame connects to three concept cards: Prove, Package, Scale.",
    "sourceIds": [
      "studio"
    ],
    "camera": {
      "focalMm": 50,
      "move": "Slow orbital reveal from evidence frame to concept cards."
    },
    "metric": {
      "display": "Prove → Package → Scale",
      "context": "Commercial hypothesis, not proven recurring revenue or registered IP.",
      "evidence": "process-label"
    }
  },
  {
    "index": 19,
    "jId": "J20",
    "name": "Projects Become Connected Domains",
    "startSec": 135,
    "endSec": 142,
    "envId": "env_hq",
    "targetId": "env_hq__projects__index",
    "onScreenText": "Different projects. Connected context.",
    "voiceover": "Projects keep their own people, files and decisions. A shared workspace should make connections without mixing facts or permissions.",
    "mediaKind": "prototype",
    "mediaNote": "Canonical project nodes, including 39 OS separately from Campaign OS; empty nodes remain honest.",
    "sourceIds": [],
    "camera": {
      "focalMm": 28,
      "move": "Wide arc across HQ project constellation, keeping active target obvious."
    },
    "metric": {
      "display": "Separate records. Explicit links.",
      "context": "No claim that all project sources or integrations are connected.",
      "evidence": "process-label"
    }
  },
  {
    "index": 20,
    "jId": "J21",
    "name": "Open the Actual Work",
    "startSec": 142,
    "endSec": 150,
    "envId": "env_hq",
    "targetId": "env_hq__media__selected",
    "onScreenText": "Open the actual work.",
    "voiceover": "A project is more than a name. Open the work behind it, and bring the conversation back to something concrete.",
    "mediaKind": "mixed",
    "mediaNote": "Demonstrate selected El Batron tile and controls after runtime validation; otherwise use approved static poster with Playback pending.",
    "sourceIds": [
      "batron"
    ],
    "camera": {
      "focalMm": 50,
      "move": "Approach selected frame and settle; no separate video-modal scene."
    },
    "metric": {
      "display": "Playback test pending",
      "context": "Pass only after real decode, seek, loop, mute and access checks.",
      "evidence": "pending"
    }
  },
  {
    "index": 21,
    "jId": "J22",
    "name": "Small Gestures Clear Intent",
    "startSec": 150,
    "endSec": 156,
    "envId": "env_hq",
    "targetId": "env_hq__interaction__controls",
    "onScreenText": "Small gestures. Clear intent.",
    "voiceover": "Point. Choose. Continue. Interaction should stay simple enough for the work to remain the focus. The user stays in control.",
    "mediaKind": "prototype",
    "mediaNote": "Real touch selection, plus only tested gesture/voice behavior. No synthetic demonstration passed off as live.",
    "sourceIds": [],
    "camera": {
      "focalMm": 40,
      "move": "Hold a stable user-height view; a short controlled drift yields to input."
    },
    "metric": {
      "display": "Input validation pending",
      "context": "No 60 FPS, fatigue-free or universal hardware guarantee.",
      "evidence": "pending"
    }
  },
  {
    "index": 22,
    "jId": "J23",
    "name": "Wipe Vanish Bring Back",
    "startSec": 156,
    "endSec": 162,
    "envId": "env_hq",
    "targetId": "env_hq__interaction__restore",
    "onScreenText": "Clear the view. Bring it back.",
    "voiceover": "Reducing visual clutter should not remove the work. A reversible interface lets the user stay in control.",
    "mediaKind": "prototype",
    "mediaNote": "Show actual reversible hide/restore if tested; otherwise a clearly labeled interaction concept.",
    "sourceIds": [],
    "camera": {
      "focalMm": 40,
      "move": "Same stable pose; scene content fades, not a new renderer or camera."
    },
    "metric": {
      "display": "Restore test pending",
      "context": "UI visibility only; never delete user data to demonstrate this beat.",
      "evidence": "pending"
    }
  },
  {
    "index": 23,
    "jId": "J24",
    "name": "One Scene Many Stories",
    "startSec": 162,
    "endSec": 170,
    "envId": "env_campaign_os",
    "targetId": "env_campaign_os__stages__review",
    "onScreenText": "One scene. Many stories. Human judgment.",
    "voiceover": "From brief to campaign to working solution, the ambition stays the same: connected context, useful assistance, and human judgment at every decision.",
    "mediaKind": "prototype",
    "mediaNote": "Traverse actual four environments; Campaign OS five stage labels. NASA profile cards separate from human portraits; proposed functions marked.",
    "sourceIds": [],
    "camera": {
      "focalMm": 28,
      "move": "Continuous broad S-curve through connected environments, ending aimed at HQ."
    },
    "metric": {
      "display": "Human approval remains",
      "context": "Not a claim of autonomous agents, live multi-user operation or universal integrations.",
      "evidence": "process-label"
    }
  },
  {
    "index": 24,
    "jId": "J25",
    "name": "Enter Your Creative Ecosystem",
    "startSec": 170,
    "endSec": 180,
    "envId": "env_hq",
    "targetId": "env_hq__tasks__next_action",
    "onScreenText": "Build the work. Prove the value.",
    "voiceover": "Cerebro: a creative workspace shaped by production experience. Our next step is to prove its usefulness, then package what works.",
    "mediaKind": "prototype",
    "mediaNote": "Return to actual HQ; one clear Enter workspace control and calm next-action node. Optional final subtitle: Prove. Package. Scale.",
    "sourceIds": [],
    "camera": {
      "focalMm": 35,
      "move": "Decelerate to comfortable overview, then hand full camera authority to user."
    },
    "metric": {
      "display": "Pilot evidence is next",
      "context": "Measure task completion, approval time and repeat use against a baseline. No results claimed.",
      "evidence": "process-label"
    }
  }
] as readonly PitchBeat[];
