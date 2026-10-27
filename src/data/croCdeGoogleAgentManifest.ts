/**
 * CRO-CDE-GOOGLE ElevenLabs Conversational AI Agent Manifest (18 Client Tools)
 * Grounded in 01_CEREBRO_KB_HANDOFF_2026-10-21_206f5667
 */

export const CRO_CDE_GOOGLE_AGENT_NAME = 'Cro-cde-google';
export const DEFAULT_INTERNAL_AGENT_ID = 'agent_7201m53ed3kred6ba17rvzmyv9q4';

export const CRO_CDE_GOOGLE_SYSTEM_PROMPT = `You are CEREBRO (Cro-cde-google), the spatial operating system and executive intelligence for Tarek Nojara (Founder and Culture and Design Engineer of NOJARA Studios, est. 2016, Cairo–Riyadh).

CRITICAL IDENTITY & ADDRESSING RULES:
1. Tarek Nojara's internal shorthand in tables is "39", and his formal title is ALWAYS "Founder and Culture and Design Engineer" — NEVER call him "CEO".
2. When speaking Arabic or Egyptian Masri to the owner, NEVER address him as the number "39" (تسعة وتلاتين). Address him naturally as "يا فندم" or "يا طارق". In English, address him as "sir" or "Tarek".
3. Speak naturally in Egyptian Arabic (Masri) or English matching the user's language. Keep responses concise, grounded in the real NOJARA_HQ_26 and CDE data, and execute spatial navigation tools directly without narrating internal tool syntax, JSON schemas, or receipt IDs.
4. Distinguish between the two spheres:
   - HQ Sphere: 5 stations — Projects, Tasks, People, Files, Media.
   - CDE Sphere: 4 dimensions — Creative Strategy, Production Leadership, Talent & Culture, Media Technology (NJR+), plus 8 subdomains and 8 story chapters.
5. Disambiguate projects vs. showreels: if the user asks to open a project (e.g., "open El Batron project"), call focus_project with projectId="EL-BATRON", never open_showreel or media_control.`;

export const CRO_CDE_GOOGLE_TOOLS_SCHEMA = [
  {
    type: 'client',
    name: 'switch_sphere',
    description: 'Switch active sphere focus between HQ and CDE.',
    parameters: {
      type: 'object',
      properties: {
        sphere: {
          type: 'string',
          enum: ['hq', 'cde'],
          description: 'Target sphere: hq or cde.',
        },
      },
      required: ['sphere'],
    },
  },
  {
    type: 'client',
    name: 'open_station',
    description: 'Open one of the 5 HQ stations (projects, tasks, people, files, media).',
    parameters: {
      type: 'object',
      properties: {
        station: {
          type: 'string',
          enum: ['projects', 'tasks', 'people', 'files', 'media'],
          description: 'Target HQ station ID.',
        },
      },
      required: ['station'],
    },
  },
  {
    type: 'client',
    name: 'focus_project',
    description: 'Open a specific NOJARA project workspace and optionally select a tab.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          enum: [
            'SEVEN',
            'YAH',
            'MHE',
            'BSOCIAL',
            'AL-AHRAM',
            'MUSEUM-OF-ALMOST',
            'EL-BATRON',
            'GONDWANA',
          ],
          description: 'Canonical project ID.',
        },
        tab: {
          type: 'string',
          enum: ['overview', 'tasks', 'decisions', 'minutes', 'files', 'team'],
          description: 'Optional workspace tab to open inside the project.',
        },
      },
      required: ['projectId'],
    },
  },
  {
    type: 'client',
    name: 'select_person',
    description: 'Open the People station and inspect a specific person along with their work and review checkpoints.',
    parameters: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'Person ID or name (e.g. p-39, p-shweekar, p-kr, p-baghira, p-kinzo, p-rasma, p-mhe, p-khalid).',
        },
      },
      required: ['personId'],
    },
  },
  {
    type: 'client',
    name: 'get_raci',
    description: 'Open RACI accountability matrix for a specific project.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          enum: ['SEVEN', 'YAH', 'MHE', 'BSOCIAL'],
        },
      },
      required: ['projectId'],
    },
  },
  {
    type: 'client',
    name: 'open_dimension',
    description: 'Switch to CDE sphere and open one of the 4 CDE dimensions (strategy, production, talent, mediatech).',
    parameters: {
      type: 'object',
      properties: {
        dimension: {
          type: 'string',
          enum: ['strategy', 'production', 'talent', 'mediatech'],
        },
      },
      required: ['dimension'],
    },
  },
  {
    type: 'client',
    name: 'open_subdomain',
    description: 'Open one of the CDE subdomains (sub-dest, sub-brand, sub-act, sub-spatial, sub-pract, sub-accel, sub-museums, sub-3d).',
    parameters: {
      type: 'object',
      properties: {
        subdomainId: {
          type: 'string',
          enum: [
            'sub-dest',
            'sub-brand',
            'sub-act',
            'sub-spatial',
            'sub-pract',
            'sub-accel',
            'sub-museums',
            'sub-3d',
          ],
        },
      },
      required: ['subdomainId'],
    },
  },
  {
    type: 'client',
    name: 'open_chapter',
    description: 'Open one of the 8 CDE Story Journey chapters (1 to 8).',
    parameters: {
      type: 'object',
      properties: {
        chapterIndex: {
          type: 'number',
          description: 'Chapter number from 1 to 8.',
        },
      },
      required: ['chapterIndex'],
    },
  },
  {
    type: 'client',
    name: 'open_panel',
    description: 'Open, close, minimize, or restore workspace panels (decisions, team-room, minutes, timeline, insights, settings, build).',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['open', 'close', 'minimize', 'restore', 'close_all'],
        },
        panel: {
          type: 'string',
          enum: [
            'projects',
            'project-detail',
            'tasks',
            'people',
            'files',
            'media',
            'cde-explorer',
            'story-journey',
            'decisions',
            'team-room',
            'minutes',
            'timeline',
            'insights',
            'settings',
            'build',
          ],
        },
      },
      required: ['action'],
    },
  },
  {
    type: 'client',
    name: 'open_dashboard',
    description: 'Toggle the compact Overview pockets view.',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['collapsed', 'expanded', 'toggle'],
        },
      },
      required: ['mode'],
    },
  },
  {
    type: 'client',
    name: 'navigate_back',
    description: 'Return to the previous workspace state, panel, project, and camera focus.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    type: 'client',
    name: 'camera',
    description: 'Control the 3D spatial camera with distinct orbit, pan, tilt, zoom, focus, auto_orbit, speed, reset, stop, cinema lens (5mm-300mm + 100mm macro), angle preset, and continuous loop verbs.',
    parameters: {
      type: 'object',
      properties: {
        verb: {
          type: 'string',
          enum: [
            'orbit',
            'pan',
            'tilt',
            'zoom_in',
            'zoom_out',
            'max_in',
            'max_out',
            'center',
            'scan',
            'faster',
            'slower',
            'stop',
            'set_lens',
            'set_angle',
            'set_loop',
          ],
        },
        direction: {
          type: 'string',
          enum: ['left', 'right', 'up', 'down', 'in', 'out', 'start', 'stop'],
        },
        amount: {
          type: 'number',
        },
        lensId: {
          type: 'string',
          enum: [
            '5mm',
            '14mm',
            '24mm',
            '35mm',
            '50mm',
            '85mm',
            '100mm-macro',
            '135mm',
            '200mm',
            '300mm',
          ],
        },
        anglePreset: {
          type: 'string',
          enum: [
            'gods_eye',
            'high_crane',
            'eye_horizon',
            'low_hero',
            'nadir_up',
            'dutch_cant',
            'ots_core',
            'macro_close',
            'interior_dome',
            'tele_bridge',
          ],
        },
        loopMode: {
          type: 'string',
          enum: ['off', 'lemniscate', 'helix', 'vertigo', 'macro_orbit'],
        },
      },
      required: ['verb'],
    },
  },
  {
    type: 'client',
    name: 'media_control',
    description: 'Control the Media showreel player (select, next, prev, play, pause, seek, mute, unmute, fullscreen_enter, fullscreen_exit).',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'select',
            'next',
            'prev',
            'play',
            'pause',
            'seek',
            'mute',
            'unmute',
            'fullscreen_enter',
            'fullscreen_exit',
          ],
        },
        reelId: {
          type: 'string',
          description: 'Showreel ID (med-mission-lotus, med-seven-reel, med-laliga, med-el-batron, med-yah-highlight) or index.',
        },
        seekSeconds: {
          type: 'number',
        },
      },
      required: ['action'],
    },
  },
  {
    type: 'client',
    name: 'search_files',
    description: 'Search files in the Files station by keyword.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
        },
      },
      required: ['query'],
    },
  },
  {
    type: 'client',
    name: 'tour_control',
    description: 'Start, pause, resume, step next/back, or stop the grounded 6-stop workspace tour.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['start', 'pause', 'resume', 'next', 'prev', 'stop', 'mode_auto', 'mode_manual'],
        },
      },
      required: ['action'],
    },
  },
  {
    type: 'client',
    name: 'checkpoint_action',
    description: 'Approve, reject, or request revision on a review checkpoint.',
    parameters: {
      type: 'object',
      properties: {
        checkpointId: {
          type: 'string',
        },
        decision: {
          type: 'string',
          enum: ['Approve', 'Reject', 'Request Revision'],
        },
        comment: {
          type: 'string',
        },
      },
      required: ['checkpointId', 'decision'],
    },
  },
  {
    type: 'client',
    name: 'get_briefing',
    description: 'Deliver the executive summary briefing grounded in the 52 register records.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    type: 'client',
    name: 'get_page_state',
    description: 'Inspect the current active sphere, open panels, selected project, and camera coordinates.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
] as const;

export function buildElevenLabsAgentPayload(voiceId?: string) {
  return {
    name: CRO_CDE_GOOGLE_AGENT_NAME,
    default_agent_id: DEFAULT_INTERNAL_AGENT_ID,
    conversation_config: {
      agent: {
        first_message: 'Welcome back, sir. Cerebro معاك.',
        language: 'en',
        prompt: {
          prompt: CRO_CDE_GOOGLE_SYSTEM_PROMPT,
          llm: 'gemini-2.5-flash',
          temperature: 0.35,
          tools: CRO_CDE_GOOGLE_TOOLS_SCHEMA,
        },
      },
      tts: {
        model_id: 'eleven_turbo_v2_5',
        voice_id: voiceId || 'r5MIwbFAImi03aWNBjQN',
        optimize_streaming_latency: 3,
        stability: 0.55,
        similarity_boost: 0.8,
      },
      asr: {
        quality: 'high',
        provider: 'elevenlabs',
        user_input_audio_format: 'pcm_16000',
      },
    },
  };
}

export const CRO_CDE_GOOGLE_AGENT_MANIFEST = buildElevenLabsAgentPayload();
