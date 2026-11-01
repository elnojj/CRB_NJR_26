/**
 * CEREBRO v1.5 CREW ROSTER (20 SEATS) & MUSA PROVENANCE REGISTER
 * Grounded in TASK-BGH-005 (Kinzo AgentCards), TASK-BGH-006 (Rasma Design Gate),
 * and TASK-BGH-007 (MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER).
 */

export interface ProvenanceRecord {
  assetId: string;
  title: string;
  custodian: 'MUSA' | 'RASMA' | 'NASAQ' | 'KINZO';
  sha256Prefix: string;
  licenseStatus: 'VERIFIED-1P' | 'GOVERNANCE-HOLD' | 'CHECKPOINT-LOCKED';
  checkpointRef: string;
  notes: string;
}

export interface CrewSeatCard {
  id: string;
  callsign: string;
  arabicName: string;
  roleTitle: string;
  squad: 'Command & Architecture' | 'Design & Brand Gate' | 'Intelligence & Provenance' | 'Production & Media Ops';
  seatNumber: number;
  status: 'ACTIVE' | 'GATE-KEEPING' | 'ON-STANDBY' | 'HELD';
  portraitUrl: string;
  accentHex: string;
  assignedTaskIds: string[];
  provenanceId: string;
  specialtySummary: string;
}

/**
 * Generates an inline SVG data URI avatar with the seat callsign and accent color
 * so checkpoint portraits never render broken images if static files are offline.
 */
export function buildCrewFallbackAvatar(callsign: string, accentHex: string): string {
  const initials = callsign.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
    <rect width="96" height="96" rx="18" fill="#0C111A"/>
    <circle cx="48" cy="48" r="38" stroke="${accentHex}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>
    <circle cx="48" cy="38" r="14" fill="#121926" stroke="${accentHex}" stroke-width="1.8"/>
    <path d="M24 78C26 64 36 58 48 58C60 58 70 64 72 78" stroke="${accentHex}" stroke-width="2" stroke-linecap="round"/>
    <text x="48" y="43" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER: ProvenanceRecord[] = [
  {
    assetId: 'PROV-DS-001',
    title: 'cerebro.tokens.css + cro-nxs-tokens.ref.css',
    custodian: 'MUSA',
    sha256Prefix: '1c16a15f8a92',
    licenseStatus: 'CHECKPOINT-LOCKED',
    checkpointRef: 'CP-20261023-2131',
    notes: 'Unified Obsidian HUD surface & Four-Tier status token dictionary.',
  },
  {
    assetId: 'PROV-DS-002',
    title: 'JaapokkiSubtract Wordmark & Sphere Fallback Rest PNG',
    custodian: 'RASMA',
    sha256Prefix: '7e4b902d31cc',
    licenseStatus: 'GOVERNANCE-HOLD',
    checkpointRef: 'feat/ds-v1-1',
    notes: 'Locked wordmark geometry and reduced-motion static sphere fallback.',
  },
  {
    assetId: 'PROV-DS-003',
    title: 'Kinzo v1.5 20-Seat AgentCard Schema & Portraits',
    custodian: 'KINZO',
    sha256Prefix: '9a204dc118ef',
    licenseStatus: 'VERIFIED-1P',
    checkpointRef: 'CP-20261023-1905',
    notes: 'Verified portraits for BANNA, MADAR, NABR, NASAQ, RASMA, and BAGHIRA.',
  },
  {
    assetId: 'PROV-DS-004',
    title: 'Nasaq Brand Contrast & Zero-Fake-Spinner Telemetry Audit',
    custodian: 'NASAQ',
    sha256Prefix: '4f819ae7720b',
    licenseStatus: 'VERIFIED-1P',
    checkpointRef: 'CP-20261023-2131',
    notes: 'WCAG AA contrast lock + durable timestamp elapsed timer verification.',
  },
];

export const CREW_ROSTER_V1_5: CrewSeatCard[] = [
  {
    id: 'GRANDY',
    callsign: 'GRANDY',
    arabicName: 'جراندي',
    roleTitle: 'Chief Systems Architect & Orchestrator',
    squad: 'Command & Architecture',
    seatNumber: 1,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('GRANDY', '#38BDF8'),
    accentHex: '#38BDF8',
    assignedTaskIds: ['UI-101', 'UI-105'],
    provenanceId: 'PROV-DS-001',
    specialtySummary: 'Multi-agent runtime topology, checkpoint recovery, and sovereign execution.',
  },
  {
    id: 'BAGHIRA',
    callsign: 'BAGHIRA',
    arabicName: 'باغيرا',
    roleTitle: 'Spatial Engine & Three.js Pipeline Lead',
    squad: 'Command & Architecture',
    seatNumber: 2,
    status: 'ACTIVE',
    portraitUrl: '/baghira/character.svg',
    accentHex: '#10B981',
    assignedTaskIds: ['TASK-BGH-005', 'TASK-BGH-006', 'UI-102'],
    provenanceId: 'PROV-DS-002',
    specialtySummary: 'Three.js neural core sphere, 33-tool camera bridge, and WebGL fallback safety.',
  },
  {
    id: 'KINZO',
    callsign: 'KINZO',
    arabicName: 'كينزو',
    roleTitle: 'AgentCard & Crew Seat Schema Director',
    squad: 'Command & Architecture',
    seatNumber: 3,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('KINZO', '#818CF8'),
    accentHex: '#818CF8',
    assignedTaskIds: ['TASK-BGH-005'],
    provenanceId: 'PROV-DS-003',
    specialtySummary: 'Maintains the 20-seat v1.5 AgentCard contracts and role capabilities.',
  },
  {
    id: 'MUSA',
    callsign: 'MUSA',
    arabicName: 'موسى',
    roleTitle: 'Provenance Archivist & Register Custodian',
    squad: 'Intelligence & Provenance',
    seatNumber: 4,
    status: 'GATE-KEEPING',
    portraitUrl: buildCrewFallbackAvatar('MUSA', '#F59E0B'),
    accentHex: '#F59E0B',
    assignedTaskIds: ['TASK-BGH-007', 'MU-101'],
    provenanceId: 'PROV-DS-001',
    specialtySummary: 'Custodian of MUSA_CEREBRO_DS_v1_1_PROVENANCE_REGISTER and SHA-256 lineage.',
  },
  {
    id: 'RASMA',
    callsign: 'RASMA',
    arabicName: 'رسمة',
    roleTitle: 'Visual Design Gate & Art Direction Lead',
    squad: 'Design & Brand Gate',
    seatNumber: 5,
    status: 'GATE-KEEPING',
    portraitUrl: '/checkpoints/rasma.jpg',
    accentHex: '#EC4899',
    assignedTaskIds: ['TASK-BGH-006', 'UI-103'],
    provenanceId: 'PROV-DS-002',
    specialtySummary: 'Visual approval signoff, silhouette clarity, and anti-slop HUD gatekeeper.',
  },
  {
    id: 'NASAQ',
    callsign: 'NASAQ',
    arabicName: 'نسق',
    roleTitle: 'Design Systems & Token Consistency Lead',
    squad: 'Design & Brand Gate',
    seatNumber: 6,
    status: 'ACTIVE',
    portraitUrl: '/checkpoints/nasaq.jpg',
    accentHex: '#38BDF8',
    assignedTaskIds: ['TASK-BGH-008', 'UI-104'],
    provenanceId: 'PROV-DS-004',
    specialtySummary: 'Enforces cerebro.tokens.css, typography rhythm, and RTL/LTR parity.',
  },
  {
    id: 'FAKIR',
    callsign: 'FAKIR',
    arabicName: 'فقير',
    roleTitle: 'Creative Strategy & Narrative Gate',
    squad: 'Design & Brand Gate',
    seatNumber: 7,
    status: 'GATE-KEEPING',
    portraitUrl: buildCrewFallbackAvatar('FAKIR', '#A855F7'),
    accentHex: '#A855F7',
    assignedTaskIds: ['TASK-BGH-009'],
    provenanceId: 'PROV-DS-004',
    specialtySummary: 'Validates plain-language explanation cards and executive decision clarity.',
  },
  {
    id: 'ZEBDA',
    callsign: 'ZEBDA',
    arabicName: 'زبدة',
    roleTitle: 'Executive Synthesis & Briefing Distiller',
    squad: 'Intelligence & Provenance',
    seatNumber: 8,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('ZEBDA', '#10B981'),
    accentHex: '#10B981',
    assignedTaskIds: ['UI-101'],
    provenanceId: 'PROV-DS-001',
    specialtySummary: 'Distills complex build logs into crisp plain-language briefings for 39.',
  },
  {
    id: 'BANNA',
    callsign: 'BANNA',
    arabicName: 'بنا',
    roleTitle: 'Structural UI Builder & Component Engineer',
    squad: 'Command & Architecture',
    seatNumber: 9,
    status: 'ACTIVE',
    portraitUrl: '/checkpoints/banna.jpg',
    accentHex: '#38BDF8',
    assignedTaskIds: ['UI-102', 'UI-103'],
    provenanceId: 'PROV-DS-003',
    specialtySummary: 'Builds deterministic React + motion/react HUD panels and accessible lists.',
  },
  {
    id: 'BILAL',
    callsign: 'BILAL',
    arabicName: 'بلال',
    roleTitle: 'Voice Bridge & Signal Routing Engineer',
    squad: 'Production & Media Ops',
    seatNumber: 10,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('BILAL', '#10B981'),
    accentHex: '#10B981',
    assignedTaskIds: ['UI-105'],
    provenanceId: 'PROV-DS-003',
    specialtySummary: 'ElevenLabs tool bridge synchronization and opt-in audio hold compliance.',
  },
  {
    id: 'KATIB',
    callsign: 'KATIB',
    arabicName: 'كاتب',
    roleTitle: 'Documentation & Register Scribe',
    squad: 'Intelligence & Provenance',
    seatNumber: 11,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('KATIB', '#94A3B8'),
    accentHex: '#94A3B8',
    assignedTaskIds: ['MU-101'],
    provenanceId: 'PROV-DS-001',
    specialtySummary: 'Maintains TASK_REGISTER.md, ASK_OF_39.md, and checkpoint changelogs.',
  },
  {
    id: 'MADAR',
    callsign: 'MADAR',
    arabicName: 'مدار',
    roleTitle: 'Orbital Telemetry & Loop Kinematics Specialist',
    squad: 'Command & Architecture',
    seatNumber: 12,
    status: 'ACTIVE',
    portraitUrl: '/checkpoints/madar.jpg',
    accentHex: '#818CF8',
    assignedTaskIds: ['UI-102'],
    provenanceId: 'PROV-DS-003',
    specialtySummary: 'Controls orbital station placement and enforces the no-auto-camera lock.',
  },
  {
    id: 'ARD',
    callsign: 'ARD',
    arabicName: 'عرض',
    roleTitle: 'Presentation & Viewport Stage Director',
    squad: 'Production & Media Ops',
    seatNumber: 13,
    status: 'ON-STANDBY',
    portraitUrl: buildCrewFallbackAvatar('ARD', '#F59E0B'),
    accentHex: '#F59E0B',
    assignedTaskIds: ['UI-104'],
    provenanceId: 'PROV-DS-002',
    specialtySummary: 'Manages viewport framing, guided tour stops, and stage presentation.',
  },
  {
    id: 'BAREED',
    callsign: 'BAREED',
    arabicName: 'بريد',
    roleTitle: 'Event Envelope & Dispatch Bus Operator',
    squad: 'Intelligence & Provenance',
    seatNumber: 14,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('BAREED', '#38BDF8'),
    accentHex: '#38BDF8',
    assignedTaskIds: ['UI-101'],
    provenanceId: 'PROV-DS-001',
    specialtySummary: 'Routes durable event envelopes and connection liveness heartbeats.',
  },
  {
    id: 'HAQQ',
    callsign: 'HAQQ',
    arabicName: 'حق',
    roleTitle: 'Truthfulness & Four-Tier Verification Auditor',
    squad: 'Intelligence & Provenance',
    seatNumber: 15,
    status: 'GATE-KEEPING',
    portraitUrl: buildCrewFallbackAvatar('HAQQ', '#10B981'),
    accentHex: '#10B981',
    assignedTaskIds: ['TASK-BGH-007', 'UI-103'],
    provenanceId: 'PROV-DS-004',
    specialtySummary: 'Blocks premature "Done" badges; enforces 4-tier state separation.',
  },
  {
    id: 'LAMHA',
    callsign: 'LAMHA',
    arabicName: 'لمحة',
    roleTitle: 'Visual Diff & Snapshot Comparison Analyst',
    squad: 'Design & Brand Gate',
    seatNumber: 16,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('LAMHA', '#A855F7'),
    accentHex: '#A855F7',
    assignedTaskIds: ['UI-104'],
    provenanceId: 'PROV-DS-002',
    specialtySummary: 'Generates side-by-side checkpoint diffs and visual feedback comparisons.',
  },
  {
    id: 'MEHWAR',
    callsign: 'MEHWAR',
    arabicName: 'محور',
    roleTitle: 'Dependency Graph & Critical Path Coordinator',
    squad: 'Command & Architecture',
    seatNumber: 17,
    status: 'ACTIVE',
    portraitUrl: buildCrewFallbackAvatar('MEHWAR', '#818CF8'),
    accentHex: '#818CF8',
    assignedTaskIds: ['UI-102'],
    provenanceId: 'PROV-DS-001',
    specialtySummary: 'Computes upstream/downstream blockers across Blueprint v0.2 nodes.',
  },
  {
    id: 'MONTEER',
    callsign: 'MONTEER',
    arabicName: 'مونتير',
    roleTitle: 'Showreel & Media Timeline Editor',
    squad: 'Production & Media Ops',
    seatNumber: 18,
    status: 'ON-STANDBY',
    portraitUrl: buildCrewFallbackAvatar('MONTEER', '#F59E0B'),
    accentHex: '#F59E0B',
    assignedTaskIds: [],
    provenanceId: 'PROV-DS-003',
    specialtySummary: 'Curates showreel cuts and frame-accurate media review checkpoints.',
  },
  {
    id: 'NABR',
    callsign: 'NABR',
    arabicName: 'نبر',
    roleTitle: 'Bilingual Tone & Masri/English Prosody Lead',
    squad: 'Production & Media Ops',
    seatNumber: 19,
    status: 'ACTIVE',
    portraitUrl: '/checkpoints/nabr.jpg',
    accentHex: '#10B981',
    assignedTaskIds: ['UI-105'],
    provenanceId: 'PROV-DS-003',
    specialtySummary: 'Calibrates natural Egyptian Masri & English voice prosody for 39.',
  },
  {
    id: 'SAMNA',
    callsign: 'SAMNA',
    arabicName: 'سمنة',
    roleTitle: 'Polish, Micro-Interaction & Spring Tuning Lead',
    squad: 'Design & Brand Gate',
    seatNumber: 20,
    status: 'HELD',
    portraitUrl: buildCrewFallbackAvatar('SAMNA', '#EC4899'),
    accentHex: '#EC4899',
    assignedTaskIds: ['UI-104'],
    provenanceId: 'PROV-DS-004',
    specialtySummary: 'Tunes motionTokens.ts spring physics while respecting prefers-reduced-motion.',
  },
];

export function getCrewMemberById(agentId: string): CrewSeatCard {
  const normalized = String(agentId || '').trim().toUpperCase();
  return (
    CREW_ROSTER_V1_5.find((c) => c.id === normalized || c.callsign === normalized) ||
    CREW_ROSTER_V1_5[0]
  );
}
