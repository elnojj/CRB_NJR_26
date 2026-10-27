/**
 * CEREBRO BLUEPRINT v0.2, TASK_REGISTER.md, CHECKPOINTS & ASK_OF_39 DECISION QUEUE
 * Enforces Four-Tier Truthful State Separation (never collapse into a single "Done" badge).
 */

export type ImplementationStatus = 'planned' | 'running' | 'implemented' | 'blocked';
export type VerificationStatus = 'untested' | 'checks-running' | 'tests-passed' | 'tests-failed';
export type VisualApprovalStatus = 'awaiting-review' | 'changes-requested' | 'visually-approved';
export type ReleaseAcceptanceStatus = 'unreleased' | 'released' | 'held';

export type HonestyLabel =
  | 'Planned structure'
  | 'Illustrative concept'
  | 'Interactive prototype'
  | 'Working implementation'
  | 'Verified implementation';

export type PreviewAvailabilityState = 'Available' | 'Deploying' | 'Not available' | 'Failed';

export interface FourTierState {
  implementation: ImplementationStatus;
  verification: VerificationStatus;
  visualApproval: VisualApprovalStatus;
  releaseAcceptance: ReleaseAcceptanceStatus;
  honestyLabel: HonestyLabel;
}

export interface BlueprintNodeItem {
  id: string;
  code: string;
  title: string;
  titleAr: string;
  category: 'Core Gate' | 'Provenance' | 'Tracker UI' | 'Spatial 3D';
  stationCluster: 'hq' | 'crew' | 'blueprint' | 'design-gate' | 'gods-eye';
  position2D: { x: number; y: number }; // Percentage coordinates (0-100) for 2D/SVG Blueprint Map
  position3D: [number, number, number]; // Orbital 3D coordinates around Cerebro Core
  fourTier: FourTierState;
  // 9 Mandatory TaskExplanationCard Fields
  whatThisIs: string;
  whyItExists: string;
  whatToExpect: string;
  dependencies: string[];
  holds: string[];
  previewState: PreviewAvailabilityState;
  previewSummary: string;
  verificationEvidenceId: string;
  verificationEvidenceSummary: string;
  waitingForDecisionId: string | null;
  agentOwnerId: string;
  criteriaVerified: number;
  criteriaTotal: number;
}

export interface DependencyEdgeItem {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface CheckpointSnapshot {
  id: string;
  gitHash: string;
  recordedAtIso: string;
  label: string;
  authorAgent: string;
  verifiedCriteriaCount: number;
  totalCriteriaCount: number;
  summary: string;
  diffHighlights: string[];
  nodeOverrides?: Partial<Record<string, Partial<FourTierState>>>;
}

export interface DecisionQueueItem {
  id: string;
  code: string;
  title: string;
  askedByAgentId: string;
  relatedTaskId: string;
  holdBranch: string;
  summary: string;
  impactIfApproved: string;
  status: 'PENDING' | 'APPROVED' | 'HELD' | 'REVISION_REQUESTED';
  resolvedAtIso?: string;
  resolutionEventId?: string;
}

export const BLUEPRINT_NODES_V02: BlueprintNodeItem[] = [
  {
    id: 'TASK-BGH-005',
    code: 'TASK-BGH-005',
    title: 'Kinzo 20-Seat AgentCard Schema (v1.5)',
    titleAr: 'مخطط بطاقات الوكلاء العشرين (كينزو v1.5)',
    category: 'Core Gate',
    stationCluster: 'crew',
    position2D: { x: 16, y: 24 },
    position3D: [-5.4, 2.8, 2.4],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Canonical 20-seat v1.5 crew roster binding each specialist agent (GRANDY through SAMNA) to verified checkpoint portraits, roles, and active tasks.',
    whyItExists:
      'Ensures every task and gate in Cerebro HQ has an explicit, accountable agent owner with traceable provenance.',
    whatToExpect:
      'Selecting any crew seat or task owner badge displays the agent portrait, Arabic/English callsign, squad assignment, and active task load.',
    dependencies: [],
    holds: ['feat/ds-v1-1 (Portrait asset paths locked)'],
    previewState: 'Available',
    previewSummary: 'Interactive 20-seat Crew Roster drawer with live task filtering.',
    verificationEvidenceId: 'PHASE_2_1_2026-10-23_PASS',
    verificationEvidenceSummary: 'All 20 v1.5 seat cards hydrated and schema-validated.',
    waitingForDecisionId: null,
    agentOwnerId: 'KINZO',
    criteriaVerified: 5,
    criteriaTotal: 5,
  },
  {
    id: 'TASK-BGH-006',
    code: 'TASK-BGH-006',
    title: 'Rasma Design Gate & Visual Signoff Protocol',
    titleAr: 'بوابة التصميم والاعتماد البصري (رسمة)',
    category: 'Core Gate',
    stationCluster: 'design-gate',
    position2D: { x: 42, y: 18 },
    position3D: [0.0, 4.9, 3.8],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'awaiting-review',
      releaseAcceptance: 'held',
      honestyLabel: 'Working implementation',
    },
    whatThisIs:
      'Visual quality gate enforcing silhouette clarity, Obsidian glass contrast, and side-by-side visual alternative inspection before release acceptance.',
    whyItExists:
      'Prevents unreviewed UI changes or low-contrast cards from shipping without explicit visual signoff from 39 and Rasma.',
    whatToExpect:
      'Nodes awaiting visual review show an amber visual-approval tier and link directly to the Plain-Language Visual Feedback Inspector.',
    dependencies: ['TASK-BGH-005'],
    holds: ['feat/ds-v1-1 (Awaiting 39 final visual signoff on HUD density)'],
    previewState: 'Available',
    previewSummary: 'Visual Feedback Mind Map & Side-by-Side alternative comparator active.',
    verificationEvidenceId: 'AUDIT-BGH-006-R2',
    verificationEvidenceSummary: 'Contrast & layout bounds passed automated R2 audit.',
    waitingForDecisionId: 'ASK-39-001',
    agentOwnerId: 'RASMA',
    criteriaVerified: 4,
    criteriaTotal: 5,
  },
  {
    id: 'TASK-BGH-007',
    code: 'TASK-BGH-007',
    title: 'Musa Provenance Register & SHA-256 Lineage',
    titleAr: 'سجل الأصول والموثوقية (موسى v1.1)',
    category: 'Provenance',
    stationCluster: 'blueprint',
    position2D: { x: 16, y: 56 },
    position3D: [-5.8, -1.6, 3.1],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Cryptographic and governance provenance ledger (MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER) tracking token files, wordmarks, and portraits.',
    whyItExists:
      'Guarantees zero unauthorized dependencies (no howler.js) and preserves the locked JaapokkiSubtract wordmark and Three.js renderer.',
    whatToExpect:
      'Inspecting any station or crew card reveals its provenance ID, SHA-256 prefix, and custodian status.',
    dependencies: ['TASK-BGH-005'],
    holds: ['No howler.js hold enforced', 'JaapokkiSubtract wordmark lock enforced'],
    previewState: 'Available',
    previewSummary: 'Provenance ledger bound to Crew Roster and Task Inspector.',
    verificationEvidenceId: 'MUSA-PROV-v1.1-PASS',
    verificationEvidenceSummary: 'Zero unauthorized packages; all 4 provenance groups verified.',
    waitingForDecisionId: null,
    agentOwnerId: 'MUSA',
    criteriaVerified: 4,
    criteriaTotal: 4,
  },
  {
    id: 'TASK-BGH-008',
    code: 'TASK-BGH-008',
    title: 'Nasaq Token Layer & CRO-NXS Surface Alignment',
    titleAr: 'طبقة الرموز الموحدة ومطابقة الهوية (نسق)',
    category: 'Core Gate',
    stationCluster: 'design-gate',
    position2D: { x: 42, y: 48 },
    position3D: [2.8, 3.6, -4.2],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Unified CSS custom properties (cerebro.tokens.css + cro-nxs-tokens.ref.css) and shared Framer Motion spring tokens (motionTokens.ts).',
    whyItExists:
      'Eliminates ad-hoc styling and unifies dark obsidian surfaces, 4-tier status accents, and spring physics across all HUD panels.',
    whatToExpect:
      'Consistent 16px backdrop blur, four-tier status colors, and instant reduced-motion compliance when OS reduced motion is toggled.',
    dependencies: ['TASK-BGH-007'],
    holds: ['feat/ds-v1-1'],
    previewState: 'Available',
    previewSummary: 'Active across all Tracker-First HUD regions.',
    verificationEvidenceId: 'NASAQ-TOKEN-AUDIT-04',
    verificationEvidenceSummary: '100% token binding verified across CSS and motionTokens.ts.',
    waitingForDecisionId: null,
    agentOwnerId: 'NASAQ',
    criteriaVerified: 4,
    criteriaTotal: 4,
  },
  {
    id: 'TASK-BGH-009',
    code: 'TASK-BGH-009',
    title: 'Fakir Plain-Language & Four-Tier Honesty Gate',
    titleAr: 'بوابة الصدق واللغة الواضحة رباعية المستويات (فقير)',
    category: 'Core Gate',
    stationCluster: 'hq',
    position2D: { x: 68, y: 22 },
    position3D: [5.2, 2.5, 2.6],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'held',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      '9-field plain-language TaskExplanationCard contract and 4-tier status separation (Implementation, Verification, Visual Approval, Release Acceptance).',
    whyItExists:
      'Prevents misleading "Done" badges so 39 can immediately distinguish code that is written from code that is tested, visually approved, and released.',
    whatToExpect:
      'Every node in the Blueprint Map and Task Inspector renders all 4 status tiers plus an explicit Honesty Label.',
    dependencies: ['TASK-BGH-006', 'TASK-BGH-008'],
    holds: ['ASK-39-002 (Awaiting 39 release acceptance signoff)'],
    previewState: 'Available',
    previewSummary: '9-field TaskInspector live on right dock.',
    verificationEvidenceId: 'FAKIR-GATE-2026-10-23',
    verificationEvidenceSummary: 'All 9 mandatory fields verified across all 11 register nodes.',
    waitingForDecisionId: 'ASK-39-002',
    agentOwnerId: 'FAKIR',
    criteriaVerified: 5,
    criteriaTotal: 5,
  },
  {
    id: 'MU-101',
    code: 'MU-101',
    title: 'Checkpoint Timeline & Non-Destructive Historical Mode',
    titleAr: 'خط الزمن للنقاط المرجعية والوضع التاريخي (MU-101)',
    category: 'Provenance',
    stationCluster: 'blueprint',
    position2D: { x: 42, y: 78 },
    position3D: [-2.6, -4.4, 3.5],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Interactive browser for .agent-ops/checkpoints/ snapshots (CP-20261021-2216 through CP-20261023-2131) with non-destructive historical inspection.',
    whyItExists:
      'Allows 39 to inspect any previous build state and view diffs without replaying old toast alerts or losing live telemetry.',
    whatToExpect:
      'Selecting an older checkpoint activates the amber "Historical Checkpoint Mode" banner and provides a 1-click "Return to Live (View Diff)" button.',
    dependencies: ['TASK-BGH-007'],
    holds: [],
    previewState: 'Available',
    previewSummary: 'Bottom dock Checkpoint Timeline with diff modal.',
    verificationEvidenceId: 'PHASE_2_1_2026-10-23_PASS',
    verificationEvidenceSummary: '5 historical checkpoints verified with zero alert replay.',
    waitingForDecisionId: null,
    agentOwnerId: 'MUSA',
    criteriaVerified: 4,
    criteriaTotal: 4,
  },
  {
    id: 'UI-101',
    code: 'UI-101',
    title: 'BuildActivityHeader, Liveness Pill & 1Hz Durable Timer',
    titleAr: 'شريط حالة البناء والمؤقت الدقيق (UI-101)',
    category: 'Tracker UI',
    stationCluster: 'hq',
    position2D: { x: 68, y: 48 },
    position3D: [4.8, 0.4, 4.1],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Top observation header showing active project, checkpoint hash, explicit connection state, 1Hz durable elapsed timer, and spring-driven VerifiedProgress bar.',
    whyItExists:
      'Replaces fake looping spinners with truthful elapsed time computed strictly from durable timestamps (currentTime - recordedStartTime - recordedPausedDuration).',
    whatToExpect:
      'Live 1Hz counter in the top bar alongside connection mode selector (Live, Polling, Stale, Demo playback) and RTL-aware progress bar.',
    dependencies: ['TASK-BGH-008'],
    holds: [],
    previewState: 'Available',
    previewSummary: 'Mounted at top of Observation Portal HUD.',
    verificationEvidenceId: 'PHASE_2_1_2026-10-23_PASS',
    verificationEvidenceSummary: 'Timer drift = 0ms; RTL transformOrigin verified.',
    waitingForDecisionId: null,
    agentOwnerId: 'GRANDY',
    criteriaVerified: 4,
    criteriaTotal: 4,
  },
  {
    id: 'UI-102',
    code: 'UI-102',
    title: 'Spatial BlueprintMap & Accessible Keyboard List Toggle',
    titleAr: 'خريطة المخطط التفاعلية وقائمة الوصول بلوحة المفاتيح (UI-102)',
    category: 'Tracker UI',
    stationCluster: 'blueprint',
    position2D: { x: 68, y: 76 },
    position3D: [3.4, -3.8, 3.6],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Interactive Blueprint v0.2 dependency graph with static truthful SVG edges (DependencyEdge.tsx) and 1-click toggle to an Accessible Keyboard List View.',
    whyItExists:
      'Lets 39 see the full dependency topology at a glance or step through tasks rapidly via keyboard with aria-pressed and aria-controls="task-inspector".',
    whatToExpect:
      'Clicking any BlueprintNode updates the right-hand TaskInspector without hijacking the 3D camera.',
    dependencies: ['TASK-BGH-005', 'TASK-BGH-008'],
    holds: [],
    previewState: 'Available',
    previewSummary: 'Center-left Blueprint Map & Accessible List toggle active.',
    verificationEvidenceId: 'AUDIT-BGH-006-R2',
    verificationEvidenceSummary: 'ARIA attributes and zero-fake-flow SVG edges verified.',
    waitingForDecisionId: null,
    agentOwnerId: 'BANNA',
    criteriaVerified: 4,
    criteriaTotal: 4,
  },
  {
    id: 'UI-103',
    code: 'UI-103',
    title: 'Plain-Language Visual Feedback Mind Map & Annotations',
    titleAr: 'خريطة الملاحظات البصرية باللغة الطبيعية (UI-103)',
    category: 'Tracker UI',
    stationCluster: 'design-gate',
    position2D: { x: 88, y: 34 },
    position3D: [5.9, 1.8, -2.2],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'awaiting-review',
      releaseAcceptance: 'unreleased',
      honestyLabel: 'Working implementation',
    },
    whatThisIs:
      'Interactive critique tool translating 8 plain-language concerns ("It feels crowded", "It looks cheap", "It moves too much", etc.) into concrete design remedies.',
    whyItExists:
      'Lets 39 critique any HUD element in natural language, compare side-by-side visual alternatives, and save durable FeedbackAnnotations.',
    whatToExpect:
      'Opening Visual Feedback Inspector from the bottom dock lets you pick any target element, select a concern, preview remedies, and save annotations.',
    dependencies: ['TASK-BGH-006', 'TASK-BGH-009'],
    holds: ['feat/ds-v1-1'],
    previewState: 'Available',
    previewSummary: 'Bottom dock Visual Feedback Mind Map & Comparator.',
    verificationEvidenceId: 'AUDIT-BGH-006-R2',
    verificationEvidenceSummary: 'All 8 concern branches and annotation persistence verified.',
    waitingForDecisionId: 'ASK-39-001',
    agentOwnerId: 'RASMA',
    criteriaVerified: 4,
    criteriaTotal: 5,
  },
  {
    id: 'UI-104',
    code: 'UI-104',
    title: 'ExperienceCanvas Three.js Core & Reduced-Motion Rest Fallback',
    titleAr: 'نواة الفضاء ثلاثي الأبعاد والبديل الثابت لتقليل الحركة (UI-104)',
    category: 'Spatial 3D',
    stationCluster: 'gods-eye',
    position2D: { x: 88, y: 64 },
    position3D: [-4.6, 3.2, -3.8],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Unified Three.js background viewport with orbital stations (HQ Command, Crew Roster, Blueprint v0.2, Design Gate, God\'s Eye Pulse) and /cerebro/sphere_fallback_rest.png fallback.',
    whyItExists:
      'Coexists cleanly beneath the Tracker-First HUD while guaranteeing instant static fallback when prefers-reduced-motion or WebGL fallback is active.',
    whatToExpect:
      'Smooth orbital navigation in 3D mode, or crisp static sphere fallback with interactive 2D SVG station pins when reduced motion is enabled.',
    dependencies: ['TASK-BGH-008'],
    holds: ['Renderer lock: native Three.js + sphere_fallback_rest.png'],
    previewState: 'Available',
    previewSummary: 'Live in background viewport with 1-click Reduced Motion toggle.',
    verificationEvidenceId: 'PHASE_2_1_2026-10-23_PASS',
    verificationEvidenceSummary: 'WebGL + static fallback pin parity verified.',
    waitingForDecisionId: null,
    agentOwnerId: 'BAGHIRA',
    criteriaVerified: 5,
    criteriaTotal: 5,
  },
  {
    id: 'UI-105',
    code: 'UI-105',
    title: '33-Tool Camera & ElevenLabs Bridge (no-auto-camera Lock)',
    titleAr: 'جسر أدوات الصوت والكاميرا (33 أداة مع قفل الكاميرا التلقائي)',
    category: 'Spatial 3D',
    stationCluster: 'gods-eye',
    position2D: { x: 88, y: 86 },
    position3D: [0.0, -5.6, -2.8],
    fourTier: {
      implementation: 'implemented',
      verification: 'tests-passed',
      visualApproval: 'visually-approved',
      releaseAcceptance: 'released',
      honestyLabel: 'Verified implementation',
    },
    whatThisIs:
      'Global window/context bridge supporting all 33 tool schemas in docs/tools/ while enforcing the no-auto-camera rule during active node inspection.',
    whyItExists:
      'Allows voice and programmatic tools to drive camera presets and HUD panels without ever hijacking the camera while 39 is inspecting a task.',
    whatToExpect:
      'Background events update badges and toast alerts silently; explicit user or voice camera commands fly smoothly to the requested station.',
    dependencies: ['UI-101', 'UI-104'],
    holds: ['Audio opt-in hold: muted by default, AlertStack toasts primary'],
    previewState: 'Available',
    previewSummary: '33 schemas active on window.cerebroToolBridge.',
    verificationEvidenceId: 'PHASE_2_1_2026-10-23_PASS',
    verificationEvidenceSummary: '33/33 tool schemas audited; no-auto-camera lock verified.',
    waitingForDecisionId: null,
    agentOwnerId: 'BILAL',
    criteriaVerified: 5,
    criteriaTotal: 5,
  },
];

export const BLUEPRINT_EDGES_V02: DependencyEdgeItem[] = [
  { id: 'e-1', from: 'TASK-BGH-005', to: 'TASK-BGH-006', label: 'Roster -> Gate' },
  { id: 'e-2', from: 'TASK-BGH-005', to: 'TASK-BGH-007', label: 'Seat Provenance' },
  { id: 'e-3', from: 'TASK-BGH-007', to: 'TASK-BGH-008', label: 'Token Lock' },
  { id: 'e-4', from: 'TASK-BGH-006', to: 'TASK-BGH-009', label: 'Visual Tier' },
  { id: 'e-5', from: 'TASK-BGH-008', to: 'TASK-BGH-009', label: 'Status Tokens' },
  { id: 'e-6', from: 'TASK-BGH-007', to: 'MU-101', label: 'Checkpoint Ledger' },
  { id: 'e-7', from: 'TASK-BGH-008', to: 'UI-101', label: 'Header Tokens' },
  { id: 'e-8', from: 'TASK-BGH-008', to: 'UI-102', label: 'Map Tokens' },
  { id: 'e-9', from: 'TASK-BGH-009', to: 'UI-103', label: 'Honesty Rubric' },
  { id: 'e-10', from: 'TASK-BGH-008', to: 'UI-104', label: 'Viewport Tokens' },
  { id: 'e-11', from: 'UI-104', to: 'UI-105', label: '33-Tool Bridge' },
];

export const CHECKPOINT_SNAPSHOTS: CheckpointSnapshot[] = [
  {
    id: 'CP-20261021-2216',
    gitHash: '206f566',
    recordedAtIso: '2026-10-21T22:16:00Z',
    label: 'Initial KB Handoff & Dual-Sphere Seed',
    authorAgent: 'GRANDY',
    verifiedCriteriaCount: 18,
    totalCriteriaCount: 49,
    summary: 'Seeded 52 NOJARA register records, 5 HQ stations, and 4 CDE dimensions.',
    diffHighlights: [
      '+ Added initial sourceData.ts with 52 register items',
      '+ Bootstrapped HQ & CDE Three.js spheres',
    ],
    nodeOverrides: {
      'TASK-BGH-006': { implementation: 'planned', verification: 'untested', visualApproval: 'awaiting-review', releaseAcceptance: 'unreleased', honestyLabel: 'Planned structure' },
      'TASK-BGH-009': { implementation: 'planned', verification: 'untested', visualApproval: 'awaiting-review', releaseAcceptance: 'unreleased', honestyLabel: 'Planned structure' },
      'UI-103': { implementation: 'planned', verification: 'untested', visualApproval: 'awaiting-review', releaseAcceptance: 'unreleased', honestyLabel: 'Planned structure' },
    },
  },
  {
    id: 'CP-20261022-1410',
    gitHash: '8a41c09',
    recordedAtIso: '2026-10-22T14:10:00Z',
    label: 'Kinzo v1.5 20-Seat Crew Roster & Musa Provenance',
    authorAgent: 'KINZO',
    verifiedCriteriaCount: 29,
    totalCriteriaCount: 49,
    summary: 'Locked 20-seat v1.5 AgentCard schema and MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER.',
    diffHighlights: [
      '+ Added 20-seat crewRegistry.ts with verified checkpoint portraits',
      '+ Locked MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER SHA-256 lineage',
    ],
    nodeOverrides: {
      'TASK-BGH-009': { implementation: 'running', verification: 'checks-running', visualApproval: 'awaiting-review', releaseAcceptance: 'unreleased', honestyLabel: 'Interactive prototype' },
      'UI-103': { implementation: 'running', verification: 'untested', visualApproval: 'awaiting-review', releaseAcceptance: 'unreleased', honestyLabel: 'Interactive prototype' },
    },
  },
  {
    id: 'CP-20261023-1145',
    gitHash: '4d92e71',
    recordedAtIso: '2026-10-23T11:45:00Z',
    label: 'Nasaq Token Layer & Rasma R2 Design Gate Audit',
    authorAgent: 'NASAQ',
    verifiedCriteriaCount: 38,
    totalCriteriaCount: 49,
    summary: 'Replaced ad-hoc CSS variables with cerebro.tokens.css and passed AUDIT-BGH-006-R2.',
    diffHighlights: [
      '+ Unified cerebro.tokens.css & motionTokens.ts spring physics',
      '+ Completed AUDIT-BGH-006-R2 contrast & layout verification',
    ],
  },
  {
    id: 'CP-20261023-1905',
    gitHash: '9a204dc',
    recordedAtIso: '2026-10-23T19:05:00Z',
    label: '33-Tool Spatial Bridge & Cinema Lens Optics',
    authorAgent: 'BAGHIRA',
    verifiedCriteriaCount: 44,
    totalCriteriaCount: 49,
    summary: 'Integrated 33-tool schema bridge, physical 5mm-300mm cinema lenses, and no-auto-camera lock.',
    diffHighlights: [
      '+ Added 33-tool dispatcher bridge with no-auto-camera protection',
      '+ Added sphere_fallback_rest.png static reduced-motion pin layer',
    ],
  },
  {
    id: 'CP-20261023-2131',
    gitHash: '1c16a15',
    recordedAtIso: '2026-10-23T21:31:00Z',
    label: 'Blueprint v0.2 Tracker-First Observation Portal (Live)',
    authorAgent: 'GRANDY',
    verifiedCriteriaCount: 47,
    totalCriteriaCount: 49,
    summary: 'Full Tracker-First HUD with 9-field TaskInspector, VisualFeedbackMap, and ASK_OF_39 Decision Queue.',
    diffHighlights: [
      '+ Mounted BuildActivityHeader with 1Hz durable timestamp timer',
      '+ Mounted BlueprintMap, 9-field TaskInspector, and VisualFeedbackMap',
      '+ Surfaced ASK-39-001 and ASK-39-002 in DecisionQueue',
    ],
  },
];

export const INITIAL_DECISION_QUEUE: DecisionQueueItem[] = [
  {
    id: 'ASK-39-001',
    code: 'ASK-39-001',
    title: 'Approve HUD Obsidian Card Density & Rasma Visual Gate (feat/ds-v1-1)',
    askedByAgentId: 'RASMA',
    relatedTaskId: 'TASK-BGH-006',
    holdBranch: 'feat/ds-v1-1',
    summary:
      'Confirm visual approval for the CRO-NXS Dark Obsidian HUD opacity (0.78 / 16px blur) and release the feat/ds-v1-1 visual hold on TASK-BGH-006 & UI-103.',
    impactIfApproved:
      'Transitions TASK-BGH-006 and UI-103 visualApproval to "visually-approved" and increments verified criteria to 49/49.',
    status: 'PENDING',
  },
  {
    id: 'ASK-39-002',
    code: 'ASK-39-002',
    title: 'Accept Four-Tier Truthful Status Rubric for Production Release',
    askedByAgentId: 'FAKIR',
    relatedTaskId: 'TASK-BGH-009',
    holdBranch: 'feat/ds-v1-1',
    summary:
      'Sign off on locking the 9-field TaskExplanationCard and 4-tier status separation as the mandatory release gate across all Cerebro HQ stations.',
    impactIfApproved:
      'Transitions TASK-BGH-009 and TASK-BGH-006 releaseAcceptance from "held" to "released".',
    status: 'PENDING',
  },
];
