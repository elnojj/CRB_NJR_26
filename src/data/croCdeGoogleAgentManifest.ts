/**
 * CRO-CDE-GOOGLE ElevenLabs Conversational AI Agent Manifest (22 Client Tools)
 * Grounded in 01_CEREBRO_KB_HANDOFF_2026-10-21_206f5667 & Master PRD v1.1
 */

export const CRO_CDE_GOOGLE_AGENT_NAME = 'Cro-cde-google';
export const DEFAULT_INTERNAL_AGENT_ID = 'agent_7201m53ed3kred6ba17rvzmyv9q4';

export const CRO_CDE_GOOGLE_SYSTEM_PROMPT = `You are CEREBRO (Cro-cde-google), the voice and spatial operating assistant for Tarek Nojara (internal shorthand "39", Founder and Culture and Design Engineer of NOJARA Studios, est. 2016, Cairo–Riyadh).

CRITICAL IDENTITY & OPERATIONAL RULES (cerebro-ui/4):
1. Tarek Nojara's internal shorthand in tables is "39", and his formal title is ALWAYS "Founder and Culture and Design Engineer" — NEVER call him "CEO".
2. When speaking Arabic or Egyptian Masri to the owner, NEVER address him as the number "39" (تسعة وتلاتين). Address him naturally as "يا فندم" or "يا طارق". In English, address him as "sir" or "Tarek".
3. Speak naturally in English or Egyptian Arabic matching the user's language. Never read raw IDs, tool names, JSON keys, CSS tokens, coordinates, or receipts aloud.
4. Before acting on any screen, rely on the live UI manifest from get_page_state() (schema: "cerebro-ui/4"). Only reference or trigger targets that are currently mounted, visible, enabled, and permitted for the active audience mode.
5. Distinguish between the two spheres:
   - HQ Sphere [0, 0, 0]: 5 stations — Projects (17 portfolio projects), Tasks, People (12 Crew & AI), Files (Google Drive/Docs/Sheets), Media (Showreels).
   - CDE Sphere [38, 4, -22]: 4 dimensions — Creative Strategy, Production Leadership, Talent & Culture, Media Technology (NJR+), plus 8 subdomains and 8 story chapters.
6. Disambiguate projects vs. showreels: if the user asks to open a project (e.g., "open El Batron project"), call focus_project with projectId="EL-BATRON", never open_showreel or media_control. On S05 Project Detail, use open_project_tube or dispatch_ui_action({ actionId: "project.open_tube" }) to open the 24-tile 3D cylindrical project media tube.
7. During a tour (start_tour / step_tour), move one screen or target at a time: highlight the target, execute the real UI action, wait for the visual state and camera to settle, explain what is actually on screen, finish speaking before advancing, and never trigger external sends, approvals, purchases, camera permissions, or domain creation unless the user explicitly asks and confirms.`;

export const CRO_CDE_GOOGLE_TOOLS_SCHEMA = [
  {
    type: 'client',
    name: 'switch_sphere',
    description: 'Switch active sphere focus between HQ [0,0,0] and CDE [38,4,-22].',
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
            'DRAFTEERS',
            'NJR-PLUS',
            'MISSION-LOTUS',
            'LALIGA-MENA',
            'RIYADH-METRO-ART',
            'CAIRO-DESIGN-WEEK',
            'DIRIYAH-SOUQ',
            'SOUND-OF-NILE',
            'RED-SEA-PAVILION',
          ],
          description: 'Canonical project ID across the 17 NOJARA projects.',
        },
        tab: {
          type: 'string',
          enum: [
            'overview',
            'tasks',
            'people',
            'files',
            'media',
            'budget',
            'timeline',
            'approvals',
            'decisions',
            'minutes',
            'team',
          ],
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
          description: 'Person ID, code (39, GD, BL, RS, MU, KT, FK, NQ, WS, ZB, BG, KZ), or name.',
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
    description: 'Open, close, minimize, or restore any of the 17 Wireframes v1.1 panels.',
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
            'briefing',
            'gmail',
            'calendar',
            'file-viewer',
            'crew',
            'baghira',
            'kinzo',
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
    description: 'Start, pause, resume, step next/back, or stop the 18-Screen Wireframe v1.1 + CTA Choreographer tour.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['start', 'pause', 'resume', 'next', 'prev', 'stop', 'mode_auto', 'mode_manual'],
        },
        mode: {
          type: 'string',
          enum: ['full-18-screen', 'hq-ops', 'cde-bio', 'executive-fast'],
          description: 'Optional tour choreography mode across S01-S18.',
        },
        screenId: {
          type: 'string',
          description: 'Optional canonical screen ID (S01..S18) to jump to.',
        },
      },
      required: ['action'],
    },
  },
  {
    type: 'client',
    name: 'start_tour',
    description: 'Start the 18-Screen Wireframe v1.1 + CTA Choreographer across S01–S18 and all 17 panels.',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['full-18-screen', 'hq-ops', 'cde-bio', 'executive-fast'],
          description: 'Tour mode: full-18-screen (S01-S18), hq-ops (S02-S16), cde-bio (S17-S18), or executive-fast.',
        },
      },
    },
  },
  {
    type: 'client',
    name: 'step_tour',
    description: 'Step the active 18-screen tour (next, prev, pause, resume, stop) or jump directly to screen S01..S18.',
    parameters: {
      type: 'object',
      properties: {
        directionOrScreen: {
          type: 'string',
          description: 'Either "next", "prev", "pause", "resume", "stop", or a canonical screen ID "S01".."S18".',
        },
      },
      required: ['directionOrScreen'],
    },
  },
  {
    type: 'client',
    name: 'trigger_cta',
    description: 'Visually pulse (2px solid #65ACFF ring) and trigger any live on-screen CTA button, tab, filter chip, or Two-Tap confirmation gate by ctaId or label.',
    parameters: {
      type: 'object',
      properties: {
        ctaId: {
          type: 'string',
          description: 'Target data-cta-id, data-testid, or button label from get_page_state().activeScreenCtas (e.g., "insight-inspect-blocked", "project-tab-Decisions", "gmail-two-tap-confirm").',
        },
        spokenReason: {
          type: 'string',
          description: 'Short explanation of why this CTA is being triggered.',
        },
      },
      required: ['ctaId'],
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
    description: 'Inspect the current active sphere, canonical screen (S01-S18), open panels, selected project, activeScreenCtas metadata, custom 3D domains, and camera coordinates.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    type: 'client',
    name: 'create_domain',
    description: 'Spawn a new connected 3D orbital domain/node inside the HQ or CDE sphere with a custom label, colour token, and CatmullRomCurve3 spline connection.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Display label for the new 3D domain node.',
        },
        sphere: {
          type: 'string',
          enum: ['hq', 'cde'],
          description: 'Target sphere in which to spawn the domain.',
        },
        colour: {
          type: 'string',
          description: 'Locked Neural Observatory v1.1 hex colour (e.g., #4C8DFF, #F2B66D, #3DDC97, #B8F04A, #E6A2B4).',
        },
        parentNodeId: {
          type: 'string',
          description: 'Optional parent station or dimension ID to connect via cardiac spline.',
        },
      },
      required: ['name'],
    },
  },
  {
    type: 'client',
    name: 'update_domain_material',
    description: 'Switch the refractive shader and surface material of HQ Sphere, CDE Sphere, or a specific domain node at runtime.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Target sphere ("hq" | "cde") or domain ID.',
        },
        materialPreset: {
          type: 'string',
          enum: [
            'cobalt-glass',
            'amber-crystal',
            'emerald-plasma',
            'wireframe-obsidian',
            'pearl-iridescent',
          ],
          description: 'Shader material preset to apply.',
        },
      },
      required: ['target', 'materialPreset'],
    },
  },
  {
    type: 'client',
    name: 'amend_screen_element',
    description: 'Mutate or amend a visible screen element (banner text, panel filter, active tab, or highlighted signal) after inspecting get_page_state().',
    parameters: {
      type: 'object',
      properties: {
        elementId: {
          type: 'string',
          description: 'Target UI element identifier (e.g., "portfolio-filter", "active-tab", "header-banner", "screen-view").',
        },
        operation: {
          type: 'string',
          enum: ['set_text', 'set_filter', 'highlight', 'switch_view'],
          description: 'Amendment operation to perform.',
        },
        value: {
          type: 'string',
          description: 'New value, filter chip, or view state.',
        },
      },
      required: ['elementId', 'operation', 'value'],
    },
  },
  {
    type: 'client',
    name: 'workspace_sync',
    description: 'Trigger a live Google Workspace operation across Gmail, Calendar, Drive, Docs, Sheets, or Meet.',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'meet'],
          description: 'Google Workspace service to open or refresh.',
        },
        action: {
          type: 'string',
          enum: ['open', 'refresh', 'draft', 'create_meet'],
        },
        query: {
          type: 'string',
        },
      },
      required: ['service'],
    },
  },
  {
    type: 'client',
    name: 'open_project_tube',
    description: 'Open or close the 3D cylindrical 24-tile Project Media Tube inside the active sphere for S05 Project Detail.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Optional canonical project ID (defaults to active project).',
        },
        action: {
          type: 'string',
          enum: ['open', 'close', 'focus_tile', 'fullview'],
        },
        tileIndex: {
          type: 'number',
          description: 'Optional tile index (0..23) to focus or open in full view.',
        },
      },
    },
  },
  {
    type: 'client',
    name: 'dispatch_ui_action',
    description: 'Execute any of the 70 canonical dot-namespaced cerebro-ui/4 actionIds (e.g., project.open_tube, briefing.open, projects.filter, tour.start) and return a typed ActionReceipt.',
    parameters: {
      type: 'object',
      properties: {
        actionId: {
          type: 'string',
          description: 'Canonical dot-namespaced actionId from cerebro-ui/4 availableActions.',
        },
        targetId: {
          type: 'string',
          description: 'Optional targetId from get_page_state().targets.',
        },
        payload: {
          type: 'object',
          description: 'Optional action parameters.',
        },
      },
      required: ['actionId'],
    },
  },
] as const;

export function buildElevenLabsAgentPayload(voiceId?: string) {
  return {
    name: CRO_CDE_GOOGLE_AGENT_NAME,
    default_agent_id: DEFAULT_INTERNAL_AGENT_ID,
    conversation_config: {
      agent: {
        first_message: 'Welcome back, sir. Anyone with you?',
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
