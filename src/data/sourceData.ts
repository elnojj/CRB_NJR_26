import { COLOUR_TOKENS, StationId, CdeDimensionId } from '../tokens/colours';

export interface SourceMapEntry {
  code: string;
  fileName: string;
  status: 'ATTACHED' | 'MISSING';
  usageInApp: string;
}

export const SOURCE_MAP: SourceMapEntry[] = [
  {
    code: '01',
    fileName: '01_CEREBRO_KB_HANDOFF_2026-10-21',
    status: 'ATTACHED',
    usageInApp: 'Defines Cerebro HQ architecture, 17-panel colour system (§7), locked Media (#F2B66D) & People (#E6A2B4) tokens, 8s loader with "Take off", people/agent roster (39, Shweekar, KR, Baghira, Kinzo, Grandy, Zebda, Fakir, Bilal, Katib, Musa, Rasma), Drive folder IDs, and Masri + English voice rules.',
  },
  {
    code: '02',
    fileName: '02_CEREBRO_BLUEPRINT_RASMA_v0.2_DRAFT.pdf',
    status: 'ATTACHED',
    usageInApp: '24-page wireframe PRD & MADAR motion spec v0.1: NASAQ colour/contrast tokens (#101D27 canvas, #142632 glass at 88%, #F2F6F8 / #BDCBD3 text, #4C8DFF cobalt, #65ACFF focus ring, 1px white 40% outlines), 176×44 top-left lockup slot, 8-dot SEVEN brief pager, camera touch/drag/pinch arc indicators, and unified easing (.22,1,.36,1).',
  },
  {
    code: '03',
    fileName: '03_CEREBRO_WIREFRAME_PREVIEW.png',
    status: 'ATTACHED',
    usageInApp: '4-up visual reference for WF03 (Sphere home), WF05 (Project inspection workspace with Tasks/Files/Decisions), WF08 (Full-screen Media aperture), and WF10 (Camera and two-hand control).',
  },
  {
    code: '04a',
    fileName: '04_WF09_portrait.svg',
    status: 'ATTACHED',
    usageInApp: 'Exact SVG coordinates and layout for sphere nodes (Projects, Files, Media, Tasks, People, Core), signal curves, travel beads, and called-in Google workspace panel (Drive / Inbox / Calendar).',
  },
  {
    code: '04b',
    fileName: '04_WF10_camera_hands_portrait.svg',
    status: 'ATTACHED',
    usageInApp: 'Exact 21-landmark hand geometry, bone connections, palm polygons, and portrait layout for Hands overlay ("Pinch and move to orbit · Two-hand spread controls zoom · Filtered camera preview · no recording").',
  },
  {
    code: '04c',
    fileName: '04_WF10_camera_hands_landscape.svg',
    status: 'ATTACHED',
    usageInApp: 'Exact 21-landmark hand geometry and landscape layout (1366×1024 / 1194×834 iPad target) with dimmed camera layer behind the visible 3D sphere.',
  },
  {
    code: '05a',
    fileName: '05_SEVEN_00_Master_Index_and_Source_Register',
    status: 'ATTACHED',
    usageInApp: 'Source control legend (CONFIRMED / INFERRED / PROPOSED / UNVERIFIED), Drive folder register, and list of the 5 published portal PDFs.',
  },
  {
    code: '05b',
    fileName: '05_SEVEN_01_Verified_Facts_and_Evidence',
    status: 'ATTACHED',
    usageInApp: 'Verified text for NOJARA Studios (founded 2016, Cairo and Riyadh, creative strategy, production, talent, media technology, NJR+ execution intelligence; Young & Human, Drafteers, Museum of Almost, El Batron, Gondwana), Tarek Nojara, Mohammed Alhamdan, and "SEVEN × NOJARA — A reason to return".',
  },
  {
    code: '05c',
    fileName: '05_SEVEN_02_Agent_Identity_Conversation_Permissions',
    status: 'ATTACHED',
    usageInApp: 'Permission model, audience disclosure gates (Owner only / Partner or assistant present / Public), and rule that proposals/drafts are never misstated as approved client commitments.',
  },
  {
    code: '05d',
    fileName: '05_SEVEN_03_Portal_Routes_Assets_Rights',
    status: 'ATTACHED',
    usageInApp: 'Defines the 8-chapter interactive journey structure (#welcome, #gallery, #proposal, #studio, #tarek, #hamdan, #activations, #proposal-downloads) mirrored by the CDE Profile / Bio journey.',
  },
  {
    code: '05e',
    fileName: '05_SEVEN_04_Voice_Agent_Auto_Greet_Diagnosis',
    status: 'ATTACHED',
    usageInApp: 'Voice session lifecycle stages (Gate -> Start gesture -> Connecting -> Speaking) and single-welcome rule (never re-greet after navigation or tool execution).',
  },
  {
    code: '05f',
    fileName: '05_SEVEN_05_Gaps_Decisions_Validation_Plan',
    status: 'ATTACHED',
    usageInApp: 'Open validation items, Arabic NOJARA spelling flag (ج vs چ), and rights/approval tracking in Files & Decisions panels.',
  },
  {
    code: '06a',
    fileName: '06_SEVEN_30_Assets_Manifest_2026-10-14.json',
    status: 'ATTACHED',
    usageInApp: '30 sculptural 3D design elements across 5 groups (Identity, Journey, Participation, Media, Systems) with exact materials, companion stickers, and motions used for CDE 3D nodes and chapter artifacts.',
  },
  {
    code: '06b',
    fileName: '06_SEVEN_Tabuk_concept_render_mobile_1080x1920.jpg',
    status: 'ATTACHED',
    usageInApp: 'Real visual asset rendered in the Media station, SEVEN project workspace, and full-screen Media aperture (portrait/mobile view).',
  },
  {
    code: '06c',
    fileName: '06_SEVEN_Tabuk_concept_render_desktop_3840x2160.jpg',
    status: 'ATTACHED',
    usageInApp: 'Real visual asset rendered in the Media station, SEVEN project workspace, CDE journey, and full-screen Media aperture (landscape/desktop view).',
  },
  {
    code: '07',
    fileName: '07_NOJARA_Project_Register_SNAPSHOT_2026-10-23',
    status: 'ATTACHED',
    usageInApp: '52 real read-only PMO records across SEVEN, YAH (Young & Human), MHE (Abu Hamdan x Wahag / Floward / Barry), and BSOCIAL. Populates Projects, Tasks, Decisions, Meeting Rollups, and File locators.',
  },
  {
    code: '08',
    fileName: '08 Design system (Cerebro Design System.dc.html / cerebro.config.json)',
    status: 'MISSING',
    usageInApp: 'Listed as "To be added to the same folder" in Master Instruction. Meshes, materials, and station colours are built from 01 KB Handoff + 02 Blueprint + 04 SVGs; missing CDE dimension tokens are mapped from 01 KB and flagged.',
  },
  {
    code: '09',
    fileName: '09 Media (Hotspot_26_media folder: showreel films & audio)',
    status: 'MISSING',
    usageInApp: 'Listed as "To be added to the same folder". Only the two attached 06 SEVEN Tabuk renders are displayed as real media; video showreels are labelled SAMPLE.',
  },
  {
    code: '10',
    fileName: '10 NOJARA company profile + Tarek Nojara bio PDFs',
    status: 'MISSING',
    usageInApp: 'Listed as "To be added to the same folder" (NOJARA_Full_Company_Profile_v04.pdf, Tarek_Nojara_Full_Visual_Bio_v04.pdf). CDE Story Journey uses ONLY verified text from 01 KB Handoff & 05 SEVEN 01, with unattached sections labelled SAMPLE.',
  },
];

export interface MissingItem {
  id: string;
  item: string;
  referencedIn: string;
  currentFallbackInPhase0: string;
}

export const MISSING_ITEMS: MissingItem[] = [
  {
    id: 'M01',
    item: '08 Design system (Cerebro Design System.dc.html, config/cerebro.config.json, experience/*.js)',
    referencedIn: 'Master Instruction v2 ("To be added to the same folder: 08 Design system") & 01 KB Handoff §6',
    currentFallbackInPhase0: 'Used locked tokens from 01 KB Handoff §7 + 02 Blueprint p.2/p.23 + 04 WF09/WF10 SVGs. Mapped CDE dimension colours to existing locked/proposed tokens (#3D8BFF, #FF7A59, #E6A2B4, #3DDC97).',
  },
  {
    id: 'M02',
    item: '09 Media (Hotspot_26_media 1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh video showreels & audio)',
    referencedIn: 'Master Instruction v2 ("09 Media: the only media allowed") & 01 KB Handoff §3',
    currentFallbackInPhase0: 'Used the 2 attachedrenders (06_SEVEN_Tabuk_concept_render_desktop & mobile) and labelled unattached video showreels as SAMPLE.',
  },
  {
    id: 'M03',
    item: '10 NOJARA company profile + Tarek Nojara bio full PDFs (NOJARA_Full_Company_Profile_v04.pdf, Tarek_Nojara_Full_Consultant_Profile_v04.pdf, Tarek_Nojara_Full_Visual_Bio_v04.pdf)',
    referencedIn: 'Master Instruction v2 ("10 NOJARA company profile + Tarek Nojara bio") & 05 SEVEN 00/03',
    currentFallbackInPhase0: 'Used strictly verified excerpts from 05_SEVEN_01_Verified_Facts_and_Evidence & 01_CEREBRO_KB_HANDOFF; marked full multi-page PDF body text as SAMPLE.',
  },
  {
    id: 'M04',
    item: 'Jaapokki-Regular.woff2 font file & Master Brand Lockup Illustrator/SVG source',
    referencedIn: 'Master Instruction v2 ("a square-Kufic Bismillah image above the CEREBRO wordmark") & Brand Typography Spec',
    currentFallbackInPhase0: 'Rendered dedicated white vector assets (/assets/cerebro-bismillah.svg above /assets/cerebro-wordmark.svg) in BrandLockup.tsx and configured @font-face for Jaapokki in index.css with Sora geometric fallback until Jaapokki-Regular.woff2 is attached.',
  },
  {
    id: 'M05',
    item: '30 individual 4K PNG renders from 06_SEVEN_30_Assets_Manifest (/workspace/scratch/.../PNG_4K/A01..A30.png)',
    referencedIn: '06_SEVEN_30_Assets_Manifest_2026-10-14.json',
    currentFallbackInPhase0: 'Constructed composite 3D procedural geometries in Three.js matching the manifest subjects/materials (brushed steel, oxblood ceramic, navy enamel, amber optical glass) and marked raster 4K PNGs as SAMPLE.',
  },
  {
    id: 'M06',
    item: 'Confirmed 17 project codes, quantitative progress percentages, and per-project RACI sign-offs',
    referencedIn: '01 KB Handoff §9 ("Confirm the 17 project codes and supply real clients, contacts, owners, dates") & 07 Project Register',
    currentFallbackInPhase0: 'Used all 4 active project codes in 07 Project Register (SEVEN, YAH, MHE, BSOCIAL) plus portfolio programmes (AL-AHRAM, MUSEUM-OF-ALMOST, EL-BATRON, GONDWANA) with exact record counts; labelled unverified progress % and RACI cells as SAMPLE.',
  },
  {
    id: 'M07',
    item: 'External Gmail OAuth / SMTP credentials & Cursor Cloud Webhook endpoint',
    referencedIn: 'Workspace Integration & Development Tracker',
    currentFallbackInPhase0: 'Meeting notes save locally to disk (.cerebro-data/store.json) with honest status "Draft ready — email not connected". Tasks, notes, and messages persist locally without fabricating external Gmail or Cursor receipts.',
  },
];

export interface StationNode {
  id: StationId;
  code: string;
  label: string;
  labelAr: string;
  colour: string;
  position: [number, number, number];
  summary: string;
  badgeCount: string;
}

export const CEREBRO_STATIONS: StationNode[] = [
  {
    id: 'projects',
    code: 'ST-01',
    label: 'Projects',
    labelAr: 'المشاريع',
    colour: COLOUR_TOKENS.stationProjects,
    position: [-0.38, 0.72, 1.55],
    summary: '4 Register Projects (SEVEN, YAH, MHE, BSOCIAL) + 4 Portfolio Programmes [SAMPLE]',
    badgeCount: '6 Suns · 4 Real',
  },
  {
    id: 'tasks',
    code: 'ST-02',
    label: 'Tasks',
    labelAr: 'المهام',
    colour: COLOUR_TOKENS.stationTasks,
    position: [-1.35, -0.82, 1.48],
    summary: '52 Parsed Register Records (13 Actions, 1 Decision, 5 Questions, 33 Updates)',
    badgeCount: '4 Open · 52 Total',
  },
  {
    id: 'people',
    code: 'ST-03',
    label: 'People',
    labelAr: 'الفريق والمسؤوليات',
    colour: COLOUR_TOKENS.stationPeople,
    position: [-1.18, -1.78, 1.85],
    summary: 'HQ (39, Shweekar) · Team & Contracts (12 Crew + Collaborators) · RACI Matrix',
    badgeCount: '12 Crew · RACI',
  },
  {
    id: 'files',
    code: 'ST-04',
    label: 'Files',
    labelAr: 'الملفات',
    colour: COLOUR_TOKENS.stationFiles,
    position: [-2.12, -0.45, 1.52],
    summary: '5 Published Portal PDFs + 4 Allowlisted Drive Folders + Register Evidence',
    badgeCount: '8 HQ Refs',
  },
  {
    id: 'media',
    code: 'ST-05',
    label: 'Media',
    labelAr: 'الوسائط والعروض',
    colour: COLOUR_TOKENS.stationMedia,
    position: [2.15, 0.78, 1.45],
    summary: '5 NOJARA Showreels + 2 Attached SEVEN Tabuk Renders + 30 Sculptural Assets',
    badgeCount: '5 Showreels',
  },
];

export interface RegisterRecord {
  id: string;
  projectId: 'SEVEN' | 'YAH' | 'MHE' | 'BSOCIAL';
  workstream: string;
  recordType: 'Action' | 'Decision' | 'Question' | 'Update';
  summary: string;
  detail: string;
  owner: string;
  dueText: string;
  reviewStatus: string;
  workStatus: string;
  updatedAt: string;
  evidenceLocator: string;
}

export const REGISTER_RECORDS: RegisterRecord[] = [
  // SEVEN Records (from 07_NOJARA_Project_Register_SNAPSHOT_2026-10-23)
  {
    id: 'rec-seven-delivery-failure',
    projectId: 'SEVEN',
    workstream: 'Pitch review delivery',
    recordType: 'Update',
    summary: 'SEVEN review-package delivery failed for one recipient',
    detail: 'Google reports permanent address-not-found failure (550 5.1.1) for the primary recipient of the six-PDF pitch email sent at 17:10:47 UTC. Recipient address needs owner verification before any resend.',
    owner: 'Unassigned (Needs 39 verification)',
    dueText: 'Immediate verification',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-06T17:15:00Z',
    evidenceLocator: 'gmail:me@nojara.com:1a112325e3c81bb0 · Delivery-status part 1.0: failed 5.1.1',
  },
  {
    id: 'rec-seven-discussion-draft',
    projectId: 'SEVEN',
    workstream: 'Pitch review package',
    recordType: 'Update',
    summary: 'SEVEN strategic discussion draft available',
    detail: 'Unpriced discussion proposal; consultancy mandate, scope, timing and rights remain unagreed. Does not establish a client appointment.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-07T04:58:00Z',
    evidenceLocator: 'drive:1zj8IkWlcECNPb587k05J8h3I6UlDK_8F · PDF pages 6–7',
  },
  {
    id: 'rec-seven-pilot-framework',
    projectId: 'SEVEN',
    workstream: 'Pitch review package',
    recordType: 'Update',
    summary: 'Proposed SEVEN pilot decision framework available',
    detail: 'Working creator-exchange case and draft review thresholds. Destination, accountable owners, rights, measurement definitions and launch timing require agreement.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-07T04:58:00Z',
    evidenceLocator: 'drive:10-Gz7K7j8kReUxNu0WMUwUgJepIy2F6T · PDF pages 1–4',
  },
  {
    id: 'rec-seven-three-stories',
    projectId: 'SEVEN',
    workstream: 'Standalone proposal package',
    recordType: 'Update',
    summary: 'SEVEN initial ideas and pilot opportunities documented',
    detail: 'Three illustrative concepts presented. One Destination, Three Stories is recommended as a first pilot, subject to destination, filming access, rights, scope and budget approval.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-07T12:06:20Z',
    evidenceLocator: 'drive:1yKMhCbitGPq5lbfVw0wOv4pH15hle6U7 · PDF pages 1–7',
  },
  {
    id: 'rec-seven-concepts-4k',
    projectId: 'SEVEN',
    workstream: 'Creative concept development',
    recordType: 'Update',
    summary: 'SEVEN master index reports two proposed concepts and pending image masters',
    detail: 'Links Creator Collisions (Riyadh) and The Next Moment (Abha), each with a ten-frame shotlist. Reports 20 individual 4K images not yet uploaded.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-08T16:05:55Z',
    evidenceLocator: 'drive:1dsTneYNnPhDPfMmf8-KWcTAXUzZInFbADZPl7brFzM0',
  },
  {
    id: 'rec-seven-family-activations',
    projectId: 'SEVEN',
    workstream: 'Destination activations',
    recordType: 'Update',
    summary: 'Proposed family activities and creator-led tournaments discussed',
    detail: 'Meeting discusses participatory family activities and teams represented by content creators for SEVEN. Creative proposal only.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-11T04:58:20Z',
    evidenceLocator: 'drive:1mTCC2P1LLaNjmZY9LeR6bPdRDH7e97p57hSJe39j09s · Transcript 01:00:25–01:09:27',
  },
  {
    id: 'rec-seven-portal-gaps',
    projectId: 'SEVEN',
    workstream: 'Portal validation',
    recordType: 'Question',
    summary: 'Portal validation and approval gaps remain',
    detail: 'Lists unresolved implementation ownership, approved document versions and rights evidence. Proposed validation steps are not completed tests.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-14T05:07:00Z',
    evidenceLocator: 'drive:1pz_5y0fhsOuI3qUvn3Ei9S1DFOOvGTObgCs0GZag9VQ',
  },
  {
    id: 'rec-seven-voice-diag',
    projectId: 'SEVEN',
    workstream: 'Voice experience',
    recordType: 'Update',
    summary: 'Voice greeting diagnosis prepared; fix not verified',
    detail: 'Distinguishes configured greeting from session-start behavior. Reports no deployed fix or authenticated end-to-end acceptance.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-14T05:07:00Z',
    evidenceLocator: 'drive:1t43PI52HGpr98jGKENO6FPGoKCakgHg8psq6Dxy3ZWU',
  },

  // YAH (Young & Human) Records
  {
    id: 'rec-yah-journey',
    projectId: 'YAH',
    workstream: 'Website experience',
    recordType: 'Update',
    summary: 'YAH website journey reviewed',
    detail: 'Notes describe a video-led opening and three paths: Museum of Almost, talent accelerator and About YAH. Discussion only.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-06T01:27:15Z',
    evidenceLocator: 'drive:1zqUgNXIuSPcLN7X3FGph3wRC1e3LCmBlkI7XqQ3qYZ4 · Transcript 00:01:33–00:04:43',
  },
  {
    id: 'rec-yah-assets',
    projectId: 'YAH',
    workstream: 'Website experience',
    recordType: 'Action',
    summary: 'Suggested: assemble Museum and brand assets',
    detail: 'Gemini suggests attaching relevant images and brand files. Upload completion, responsible owner and deadline are not established.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-06T01:27:15Z',
    evidenceLocator: 'drive:1zqUgNXIuSPcLN7X3FGph3wRC1e3LCmBlkI7XqQ3qYZ4 · Next steps: Send Assets',
  },
  {
    id: 'rec-yah-three-world',
    projectId: 'YAH',
    workstream: 'Website experience',
    recordType: 'Action',
    summary: 'Suggested: build the three-world opening',
    detail: 'Use existing layout references for a mobile-first, single-page-feel journey with horizontal navigation.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-06T01:27:15Z',
    evidenceLocator: 'drive:1zqUgNXIuSPcLN7X3FGph3wRC1e3LCmBlkI7XqQ3qYZ4 · Next steps: Build Website',
  },
  {
    id: 'rec-yah-quiz',
    projectId: 'YAH',
    workstream: 'Website experience',
    recordType: 'Action',
    summary: 'Suggested: implement role-specific quiz paths',
    detail: 'Branch questions and next steps for creator, talent-manager, music-producer and visual-artist selections.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-06T01:27:15Z',
    evidenceLocator: 'drive:1zqUgNXIuSPcLN7X3FGph3wRC1e3LCmBlkI7XqQ3qYZ4 · Transcript 00:10:51–00:11:24',
  },
  {
    id: 'rec-yah-eea-brief',
    projectId: 'YAH',
    workstream: 'EEA 2026 submission',
    recordType: 'Update',
    summary: 'Revised EEA visual brief available; eligibility and evidence remain unconfirmed',
    detail: 'Versions 2–5 revise the team brief. Entity/category selection, evidence validation and presenter permission remain open; explicitly reports no application submitted.',
    owner: 'Unassigned',
    dueText: 'Internal target: 18 Oct 2026 · Reported deadline: 19 Oct 2026',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-18T04:59:51Z',
    evidenceLocator: 'drive:1HPCVIMeDJcbwzpNtK756-E3xmikQgSJa · Pages 3–14',
  },
  {
    id: 'rec-yah-62-assets',
    projectId: 'YAH',
    workstream: 'Website visual asset handoff',
    recordType: 'Update',
    summary: 'Implementation handoff reports 62 current-source assets; wider asset scope remains unverified',
    detail: 'Matching Markdown and Word handoffs report 62 existing PNG assets and request validation before implementation.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-18T04:59:51Z',
    evidenceLocator: 'drive:1P-cbrL4pRtu5ywBj-uA4A61HrJexKWMR',
  },

  // MHE (Abu Hamdan / Mohammed Alhamdan) Records
  {
    id: 'rec-mhe-lead',
    projectId: 'MHE',
    workstream: 'Abu Hamdan x Wahag opportunity',
    recordType: 'Action',
    summary: 'Confirmed statement: Tarek accepts broad responsibility',
    detail: 'At 00:30:01 Tarek says, "I\'ll take care of whatever is needed." Broad commitment is explicit, but deliverables and limits are not defined.',
    owner: 'me@nojara.com (39 / Tarek Nojara)',
    dueText: 'Unknown',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-05T22:21:00Z',
    evidenceLocator: 'drive:1-YOfl4cWTpZ8yKeCFxlSakivw2TFGHlzx9_MCgPhZFk · Transcript 00:26:16–00:30:01',
  },
  {
    id: 'rec-mhe-pitch-decision',
    projectId: 'MHE',
    workstream: 'Abu Hamdan x Wahag opportunity',
    recordType: 'Decision',
    summary: 'Recorded alignment: lead client pitch with questions',
    detail: 'At 00:21:50 Tarek says, "We answer questions, not a presentation." Later requests for a company presentation remain in the same meeting.',
    owner: 'Unstated',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-05T22:21:00Z',
    evidenceLocator: 'drive:1-YOfl4cWTpZ8yKeCFxlSakivw2TFGHlzx9_MCgPhZFk · Transcript 00:21:50',
  },
  {
    id: 'rec-mhe-investor-pres',
    projectId: 'MHE',
    workstream: 'Abu Hamdan x Wahag opportunity',
    recordType: 'Action',
    summary: 'Proposed: prepare the investor-facing company presentation',
    detail: 'Notes suggest preparing a presentation for investors without a named delivery owner or date.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-05T22:21:00Z',
    evidenceLocator: 'drive:1-YOfl4cWTpZ8yKeCFxlSakivw2TFGHlzx9_MCgPhZFk · Transcript 00:34:12',
  },
  {
    id: 'rec-mhe-nov1-question',
    projectId: 'MHE',
    workstream: 'Music collaboration and rollout',
    recordType: 'Question',
    summary: 'Clarify which release the November 1 reference concerns',
    detail: 'Transcript mentions November 1 near a first music video and Double Dragon discussion. Speaker attribution and release identity are unclear.',
    owner: 'Unassigned',
    dueText: 'November 1st (release identity unverified)',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-11T04:58:20Z',
    evidenceLocator: 'drive:1mTCC2P1LLaNjmZY9LeR6bPdRDH7e97p57hSJe39j09s · Transcript 01:36:28',
  },
  {
    id: 'rec-mhe-identity-spelling',
    projectId: 'MHE',
    workstream: 'Editorial sign-off',
    recordType: 'Question',
    summary: 'Confirm portrait mapping and public name spelling',
    detail: 'Two documents flag conflicting portrait-to-persona mapping and Mohammed Al7amdan versus Mohammed Alhamdan spelling.',
    owner: 'Unassigned',
    dueText: 'Unverified',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-13T05:07:30Z',
    evidenceLocator: 'drive:1f1W7p1KubJbUUj6cR8ZcNOXSDpRJpP7Ju7POB_enaVI',
  },
  {
    id: 'rec-mhe-floward',
    projectId: 'MHE',
    workstream: 'Floward proposal',
    recordType: 'Update',
    summary: 'Floward editorial addendum V4 available; PDF unchanged',
    detail: 'Describes proposed editorial revisions and deliverable checks, explicitly stating the 25-slide PDF has not been modified.',
    owner: 'Unassigned',
    dueText: 'Unstated',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-15T05:05:10Z',
    evidenceLocator: 'drive:1N_hQFjy4Tk_236yiSIH82mUheN8W7rmxeQCN8jFYaMM',
  },

  // BSOCIAL Records
  {
    id: 'rec-bsocial-pitch',
    projectId: 'BSOCIAL',
    workstream: 'YAH collaboration preparation',
    recordType: 'Update',
    summary: 'Discussion pitch sent ahead of BSocial meeting',
    detail: 'Khalid sent a discussion-points PDF (NOJARA_BSocial_Young_and_Human_Pitch.pdf) to Ahmed Shams on 6 October.',
    owner: 'Khalid Al-Shaalan (Reported)',
    dueText: 'Sent 6 Oct 2026',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-06T13:58:30Z',
    evidenceLocator: 'gmail:me@nojara.com:1a111802fce5682d',
  },
  {
    id: 'rec-bsocial-access',
    projectId: 'BSOCIAL',
    workstream: 'YAH collaboration follow-up',
    recordType: 'Question',
    summary: 'Clarify requested project access for Ehab',
    detail: 'Ahmed Shams says next steps await Tarek sharing personal access with Ehab. Third-party request, not owner approval; no access granted.',
    owner: 'Unverified (Awaits 39 decision)',
    dueText: 'Unverified',
    reviewStatus: 'Needs review',
    workStatus: 'Open',
    updatedAt: '2026-10-06T15:26:40Z',
    evidenceLocator: 'gmail:me@nojara.com:1a111d09f970ea0b',
  },
];

export type ProjectHealth = 'On track' | 'At risk' | 'Blocked';

export interface ProjectSummary {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  isSample: boolean;
  health: ProjectHealth;
  healthNote: string;
  progress: number;
  progressLabel: string;
  owner: string;
  nextDeadline: string;
  openTaskCount: number;
  totalRecordCount: number;
  lastActivity: string;
  thumbnailAsset?: string;
  dimensionId: CdeDimensionId;
  subdomain: string;
  description: string;
  sunPositionHq: [number, number, number];
  sunPositionCde: [number, number, number];
}

export const PROJECTS_DATA: ProjectSummary[] = [
  {
    id: 'SEVEN',
    code: 'SEVEN',
    name: 'SEVEN × NOJARA',
    subtitle: 'A Reason to Return — Destination Storytelling & Pilot',
    isSample: false,
    health: 'At risk',
    healthNote: 'Email 550 5.1.1 bounce on pitch package + portal validation/rights gaps open (Register 14 Oct)',
    progress: 68,
    progressLabel: '68% [SAMPLE — 17 Register Records]',
    owner: 'Unassigned (Needs 39 sign-off)',
    nextDeadline: 'TBD (Pilot & Rights Review)',
    openTaskCount: 17,
    totalRecordCount: 17,
    lastActivity: '14 Oct 2026 · 05:07 UTC',
    thumbnailAsset: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    dimensionId: 'strategy',
    subdomain: 'Destination Storytelling',
    description: 'Connected programme of family experiences, local creativity and destination storytelling across experience design, production leadership, content/audience, and NJR+ execution intelligence.',
    sunPositionHq: [1.18, 0.22, 1.65],
    sunPositionCde: [-2.4, 1.8, 1.6],
  },
  {
    id: 'YAH',
    code: 'YAH',
    name: 'Young & Human (YAH)',
    subtitle: 'Three-World Website, Talent Accelerator & EEA 2026',
    isSample: false,
    health: 'On track',
    healthNote: '62 PNG assets reported in handoff; EEA 2026 eligibility & motion ZIP open (Register 18 Oct)',
    progress: 74,
    progressLabel: '74% [SAMPLE — 14 Register Records]',
    owner: 'Unassigned (PMO Intake)',
    nextDeadline: '19 Oct 2026 (EEA Reported Deadline)',
    openTaskCount: 14,
    totalRecordCount: 14,
    lastActivity: '18 Oct 2026 · 04:59 UTC',
    dimensionId: 'talent',
    subdomain: 'Talent Accelerator',
    description: 'Video-led opening journey connecting Museum of Almost, Talent Accelerator, and role-specific creator/music-producer/visual-artist pathways.',
    sunPositionHq: [1.32, 1.48, 1.35],
    sunPositionCde: [-2.3, -1.4, 1.8],
  },
  {
    id: 'MHE',
    code: 'MHE',
    name: 'Abu Hamdan (MHE)',
    subtitle: 'Wahag Opportunity, Floward V4 & Barry Music Rollout',
    isSample: false,
    health: 'On track',
    healthNote: '39 accepted broad lead at 00:30:01; Nov 1 release reference & name spelling open (Register 15 Oct)',
    progress: 62,
    progressLabel: '62% [SAMPLE — 18 Register Records]',
    owner: 'me@nojara.com (39 / Tarek Nojara)',
    nextDeadline: 'Nov 1 (Unverified Release Ref)',
    openTaskCount: 18,
    totalRecordCount: 18,
    lastActivity: '15 Oct 2026 · 05:05 UTC',
    dimensionId: 'talent',
    subdomain: 'Multidisciplinary Practitioners',
    description: 'Saudi multidisciplinary practice across music, contemporary art, design, creative direction, Floward campaign proposal, and SEVEN destination involvement.',
    sunPositionHq: [-1.95, -1.62, 1.65],
    sunPositionCde: [-2.6, -1.9, 1.5],
  },
  {
    id: 'BSOCIAL',
    code: 'BSOCIAL',
    name: 'BSocial × YAH',
    subtitle: 'Young & Human Collaboration & Access Governance',
    isSample: false,
    health: 'Blocked',
    healthNote: 'Awaiting 39 clarification on third-party request for Ehab project access (Register 6 Oct)',
    progress: 40,
    progressLabel: '40% [SAMPLE — 3 Register Records]',
    owner: 'Awaiting 39 Decision',
    nextDeadline: 'Pending Access Clarification',
    openTaskCount: 3,
    totalRecordCount: 3,
    lastActivity: '06 Oct 2026 · 15:26 UTC',
    dimensionId: 'production',
    subdomain: 'Destination Activations',
    description: 'Collaboration follow-up after Khalid dispatched NOJARA_BSocial_Young_and_Human_Pitch.pdf to Ahmed Shams.',
    sunPositionHq: [1.05, -1.35, 1.72],
    sunPositionCde: [2.5, 1.7, 1.5],
  },
  {
    id: 'AL-AHRAM',
    code: 'AHR',
    name: 'Al-Ahram [SAMPLE]',
    subtitle: 'Named in 02 Blueprint Frame 01/05/06 — Illustrative Plan',
    isSample: true,
    health: 'On track',
    healthNote: 'Named in 02 Blueprint p.3/4; no rows in 07 Register Snapshot [SAMPLE]',
    progress: 50,
    progressLabel: '50% [SAMPLE]',
    owner: 'SAMPLE — Unassigned',
    nextDeadline: 'TBD [SAMPLE]',
    openTaskCount: 4,
    totalRecordCount: 4,
    lastActivity: '18 Oct 2026 [SAMPLE]',
    dimensionId: 'strategy',
    subdomain: 'Brand & Cultural Systems',
    description: 'Referenced in 02_CEREBRO_BLUEPRINT_RASMA v0.2 Projects list alongside Young & Human and SEVEN. Marked SAMPLE pending full register linkage.',
    sunPositionHq: [2.15, 2.15, 1.05],
    sunPositionCde: [-2.5, 0.6, 1.9],
  },
  {
    id: 'MUSEUM-OF-ALMOST',
    code: 'MOA',
    name: 'Museum of Almost [SAMPLE]',
    subtitle: 'NOJARA Programme Identity (05 SEVEN 01 & YAH Register)',
    isSample: true,
    health: 'On track',
    healthNote: 'Confirmed NOJARA identity in 05 SEVEN 01; parallax/depth layers in YAH Register [SAMPLE]',
    progress: 55,
    progressLabel: '55% [SAMPLE]',
    owner: 'SAMPLE — NOJARA Studios',
    nextDeadline: 'TBD [SAMPLE]',
    openTaskCount: 2,
    totalRecordCount: 2,
    lastActivity: '06 Oct 2026 [SAMPLE]',
    dimensionId: 'mediatech',
    subdomain: 'Interactive Museums',
    description: 'Distinct NOJARA programme and experiential world within the YAH journey with masked foreground objects and parallax depth layers.',
    sunPositionHq: [2.95, 1.58, 0.85],
    sunPositionCde: [2.5, -1.8, 1.6],
  },
  {
    id: 'EL-BATRON',
    code: 'BAT',
    name: 'El Batron [SAMPLE]',
    subtitle: 'NOJARA Programme Identity (05 SEVEN 01 & 02)',
    isSample: true,
    health: 'On track',
    healthNote: 'Confirmed NOJARA identity in 05 SEVEN 01/02; detailed rows marked SAMPLE',
    progress: 80,
    progressLabel: '80% [SAMPLE]',
    owner: 'SAMPLE — NOJARA Studios',
    nextDeadline: 'TBD [SAMPLE]',
    openTaskCount: 1,
    totalRecordCount: 1,
    lastActivity: '13 Oct 2026 [SAMPLE]',
    dimensionId: 'production',
    subdomain: 'Live Spatial Directing',
    description: 'Distinct identity and production programme within the NOJARA Studios portfolio.',
    sunPositionHq: [2.65, 2.08, 0.95],
    sunPositionCde: [2.6, 0.6, 1.8],
  },
  {
    id: 'GONDWANA',
    code: 'GND',
    name: 'Gondwana [SAMPLE]',
    subtitle: 'NOJARA Programme Identity (05 SEVEN 01)',
    isSample: true,
    health: 'At risk',
    healthNote: 'Confirmed NOJARA identity in 05 SEVEN 01; schedule marked SAMPLE',
    progress: 45,
    progressLabel: '45% [SAMPLE]',
    owner: 'SAMPLE — NOJARA Studios',
    nextDeadline: 'TBD [SAMPLE]',
    openTaskCount: 2,
    totalRecordCount: 2,
    lastActivity: '13 Oct 2026 [SAMPLE]',
    dimensionId: 'production',
    subdomain: 'Film & Showreel Production',
    description: 'Experiential and production programme presented in the NOJARA Studios company profile.',
    sunPositionHq: [-2.42, -2.35, 1.25],
    sunPositionCde: [2.4, -0.7, 1.9],
  },
];

export interface PersonRecord {
  id: string;
  name: string;
  title: string;
  group: 'HQ' | 'Team and Contracts';
  subGroup: 'Leadership & PMO' | 'Orchestration & Planners' | 'Grok Crew Bots' | 'External Collaborators';
  status: string;
  isSample: boolean;
  notes: string;
}

export const PEOPLE_DATA: PersonRecord[] = [
  {
    id: 'p-39',
    name: '39 (Tarek Nojara)',
    title: 'Founder and Culture and Design Engineer',
    group: 'HQ',
    subGroup: 'Leadership & PMO',
    status: 'Owner · Cairo–Riyadh',
    isSample: false,
    notes: 'Founder of NOJARA Studios (est. 2016). Never titled CEO. Accountable owner across HQ & CDE.',
  },
  {
    id: 'p-shweekar',
    name: 'Shweekar',
    title: 'PMO Collaborator',
    group: 'HQ',
    subGroup: 'Leadership & PMO',
    status: 'PMO Access Verified',
    isSample: false,
    notes: "39's designated collaborator with PMO access (01 KB Handoff §2).",
  },
  {
    id: 'p-cerebro',
    name: 'Cerebro',
    title: 'Master Brain & Voice Pilot',
    group: 'Team and Contracts',
    subGroup: 'Orchestration & Planners',
    status: 'Active Pilot (HQ + CDE)',
    isSample: false,
    notes: 'Orchestration layer and voice pilot of both spheres. Speaks English and Egyptian Arabic (Masri).',
  },
  {
    id: 'p-kr',
    name: 'KR',
    title: 'Reviews, Validation & Drive Media Index',
    group: 'Team and Contracts',
    subGroup: 'Orchestration & Planners',
    status: 'Active · Speech Policy v1.0',
    isSample: false,
    notes: 'Reviews, validation briefs, speech policy, browser setup and Drive media index.',
  },
  {
    id: 'p-baghira',
    name: 'Baghira',
    title: 'Chief of Planning',
    group: 'Team and Contracts',
    subGroup: 'Orchestration & Planners',
    status: 'Planner Agent · #F4F4F0',
    isSample: false,
    notes: 'Chief of Planning (01 KB Handoff §2 & §7 #14).',
  },
  {
    id: 'p-kinzo',
    name: 'Kinzo',
    title: 'Crew Controller',
    group: 'Team and Contracts',
    subGroup: 'Orchestration & Planners',
    status: 'Crew Control · #7FB34A',
    isSample: false,
    notes: 'Controls the Grok crew bots (01 KB Handoff §2 & §7 #15).',
  },
  {
    id: 'p-grandy',
    name: 'Grandy',
    title: 'COO Bot (Grok)',
    group: 'Team and Contracts',
    subGroup: 'Grok Crew Bots',
    status: '02_ORG_PACK · Downstream',
    isSample: false,
    notes: 'COO Bot; relays design/motion notes across 02_ORG_PACK under NOJARA_HQ_26.',
  },
  {
    id: 'p-zebda',
    name: 'Zebda',
    title: 'Executive Coordinator (Grok)',
    group: 'Team and Contracts',
    subGroup: 'Grok Crew Bots',
    status: '02_ORG_PACK',
    isSample: false,
    notes: 'Executive Coordinator bot (01 KB Handoff §2).',
  },
  {
    id: 'p-rasma',
    name: 'Rasma',
    title: 'Art Direction Crew Bot',
    group: 'Team and Contracts',
    subGroup: 'Grok Crew Bots',
    status: 'Blueprint v0.2 Author',
    isSample: false,
    notes: 'Authored 02_CEREBRO_BLUEPRINT_RASMA_v0.2 with MADAR motion spec.',
  },
  {
    id: 'p-fakir-bilal-katib-musa',
    name: 'Fakir · Bilal · Katib · Musa',
    title: 'Idea & Craft · Ops · Copy · Research Crew Bots',
    group: 'Team and Contracts',
    subGroup: 'Grok Crew Bots',
    status: '02_ORG_PACK',
    isSample: false,
    notes: 'Grok crew bots; Katib authors UI copy placeholders; Fakir reviews idea & craft.',
  },
  {
    id: 'p-mhe',
    name: 'Mohammed Alhamdan (Abu Hamdan)',
    title: 'Saudi Multidisciplinary Practitioner',
    group: 'Team and Contracts',
    subGroup: 'External Collaborators',
    status: 'Terms / Rights Unagreed (05 SEVEN 01)',
    isSample: false,
    notes: 'Music, contemporary art, design, creative direction, acting & performance. Availability, rights, and commercial terms require agreement before production.',
  },
  {
    id: 'p-khalid',
    name: 'Khalid Al-Shaalan',
    title: 'Collaborator (BSocial Pitch Dispatch)',
    group: 'Team and Contracts',
    subGroup: 'External Collaborators',
    status: 'Recorded in 07 Register',
    isSample: false,
    notes: 'Dispatched NOJARA_BSocial_Young_and_Human_Pitch.pdf on 6 Oct 2026.',
  },
];

export interface RaciRow {
  projectId: string;
  projectName: string;
  deliverable: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
  sourceStatus: string;
}

export const RACI_MATRIX: RaciRow[] = [
  {
    projectId: 'SEVEN',
    projectName: 'SEVEN × NOJARA',
    deliverable: 'Creative Proposal, Pilot Framework & Portal Governance',
    responsible: 'NOJARA Studios Team · KR (KB & Portal Audit) [SAMPLE]',
    accountable: '39 (Tarek Nojara) — Owner confirmation required before delivery (05 SEVEN 01)',
    consulted: 'Shweekar (PMO) · Mohammed Alhamdan (Subject to agreement)',
    informed: 'SEVEN Stakeholders (Pitch package resend pending 550 5.1.1 fix)',
    sourceStatus: '05 SEVEN 01 + 07 Register (RACI mapping marked SAMPLE)',
  },
  {
    projectId: 'YAH',
    projectName: 'Young & Human (YAH)',
    deliverable: 'Three-World Website, 62 Visual Assets & EEA 2026 Brief',
    responsible: 'YAH Web & Visual Team · Katib / Rasma [SAMPLE]',
    accountable: '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
    consulted: 'Shweekar (PMO Intake) · Baghira (Planning)',
    informed: 'NOJARA HQ Crew',
    sourceStatus: '07 Register (14 rows) + SAMPLE RACI assignment',
  },
  {
    projectId: 'MHE',
    projectName: 'Abu Hamdan (MHE)',
    deliverable: 'Wahag Opportunity, Floward V4 & Barry Music Rollout',
    responsible: '39 (Tarek Nojara — accepted broad responsibility at 00:30:01 in Register)',
    accountable: '39 (Tarek Nojara)',
    consulted: 'Mohammed Alhamdan · Barry · Mohammed Wahq',
    informed: 'Shweekar (PMO)',
    sourceStatus: 'CONFIRMED Lead in 07 Register (rec:t003001-lead) + SAMPLE RACI columns',
  },
  {
    projectId: 'BSOCIAL',
    projectName: 'BSocial × YAH',
    deliverable: 'Collaboration Pitch & Ehab Access Request Clarification',
    responsible: 'Khalid Al-Shaalan (Pitch dispatch 6 Oct)',
    accountable: '39 (Tarek Nojara — Personal access approval gate)',
    consulted: 'Ahmed Shams (BSocial)',
    informed: 'Ehab (Pending 39 decision; no access granted)',
    sourceStatus: 'CONFIRMED in 07 Register (gmail:1a111d09f970ea0b)',
  },
];

export interface FileEntry {
  id: string;
  name: string;
  folder: string;
  driveId: string;
  lastSaved: string;
  type: 'PDF' | 'Folder' | 'Register CSV' | 'Manifest JSON' | 'Blueprint PDF' | 'Render JPG';
  status: 'Verified' | 'Allowlisted' | 'Missing from attachment';
  pagesOrSize: string;
  restricted?: boolean;
}

export const FILES_DATA: FileEntry[] = [
  {
    id: 'f-build-kit',
    name: 'CEREBRO_AI_STUDIO_BUILD_KIT_2026-10-23',
    folder: 'Google Drive Root Source of Truth',
    driveId: '1xO_Jdrtenw8opJ_cHmyXQnkpwp9ZsWgj',
    lastSaved: '23 Oct 2026',
    type: 'Folder',
    status: 'Verified',
    pagesOrSize: '16 Attached Files',
  },
  {
    id: 'f-blueprint',
    name: '02_CEREBRO_BLUEPRINT_RASMA_v0.2_DRAFT.pdf',
    folder: 'CEREBRO_AI_STUDIO_BUILD_KIT_2026-10-23',
    driveId: 'local:/assets/aistudio/02_CEREBRO_BLUEPRINT_RASMA_v0.2_DRAFT_c77c20ec.pdf',
    lastSaved: '18 Oct 2026 · Cairo',
    type: 'Blueprint PDF',
    status: 'Verified',
    pagesOrSize: '24 pages',
  },
  {
    id: 'f-register',
    name: '07_NOJARA_Project_Register_SNAPSHOT_2026-10-23',
    folder: 'CEREBRO_AI_STUDIO_BUILD_KIT_2026-10-23',
    driveId: 'local:/assets/aistudio/07_NOJARA_Project_Register_SNAPSHOT_2026-10-23_17f92911',
    lastSaved: '23 Oct 2026',
    type: 'Register CSV',
    status: 'Verified',
    pagesOrSize: '52 records · 40.7 KB',
    restricted: true,
  },
  {
    id: 'f-seven-manifest',
    name: '06_SEVEN_30_Assets_Manifest_2026-10-14.json',
    folder: 'CEREBRO_AI_STUDIO_BUILD_KIT_2026-10-23',
    driveId: '1Oz0SVCwUjz9QPmjP13ckCpD29mVsvJKZ',
    lastSaved: '14 Oct 2026 · Cairo',
    type: 'Manifest JSON',
    status: 'Verified',
    pagesOrSize: '30 sculptural assets · 86.8 KB',
  },
  {
    id: 'f-seven-prop',
    name: 'SEVEN_Full_Creative_Proposal_v03.pdf',
    folder: 'SEVEN Portal Downloads (05_SEVEN_00)',
    driveId: '1zj8IkWlcECNPb587k05J8h3I6UlDK_8F',
    lastSaved: '13 Oct 2026',
    type: 'PDF',
    status: 'Verified',
    pagesOrSize: '12 pages',
  },
  {
    id: 'f-nojara-prof',
    name: 'NOJARA_Full_Company_Profile_v04.pdf',
    folder: '10 Profile & Bio (Referenced in 05_SEVEN_00)',
    driveId: '1oChJryKzNjCMTyhAlN5lpbYQfPIa68gf',
    lastSaved: '13 Oct 2026',
    type: 'PDF',
    status: 'Missing from attachment',
    pagesOrSize: '21 pages (Text in 05_SEVEN_01)',
  },
  {
    id: 'f-tarek-cons',
    name: 'Tarek_Nojara_Full_Consultant_Profile_v04.pdf',
    folder: '10 Profile & Bio (Referenced in 05_SEVEN_00)',
    driveId: '1gnOXhnLyRqRjGXEsB8MyRHwmDA9J3lN0',
    lastSaved: '13 Oct 2026',
    type: 'PDF',
    status: 'Missing from attachment',
    pagesOrSize: '10 pages',
  },
  {
    id: 'f-tarek-bio',
    name: 'Tarek_Nojara_Full_Visual_Bio_v04.pdf',
    folder: '10 Profile & Bio (Referenced in 05_SEVEN_00)',
    driveId: 'drive:Tarek_Nojara_Full_Visual_Bio_v04',
    lastSaved: '13 Oct 2026',
    type: 'PDF',
    status: 'Missing from attachment',
    pagesOrSize: '10 pages',
  },
  {
    id: 'f-mhe-prof',
    name: 'Mohammed_Alhamdan_Profile_and_Involvement_v04.pdf',
    folder: 'SEVEN Portal Downloads (05_SEVEN_00)',
    driveId: '1J5tdEOYhOacTAqeIKT4-EXbmazSo96Fe',
    lastSaved: '13 Oct 2026',
    type: 'PDF',
    status: 'Missing from attachment',
    pagesOrSize: '9 pages',
  },
  {
    id: 'f-bsocial-pitch',
    name: 'NOJARA_BSocial_Young_and_Human_Pitch.pdf',
    folder: 'Gmail Attachment (07 Register)',
    driveId: 'gmail:1a111802fce5682d',
    lastSaved: '06 Oct 2026 · 13:55 UTC',
    type: 'PDF',
    status: 'Verified',
    pagesOrSize: '14.2 MB',
    restricted: true,
  },
  {
    id: 'f-hq-folder',
    name: 'NOJARA_HQ_26',
    folder: 'Allowlisted Drive Root (01 KB Handoff §3)',
    driveId: '151TXi5udU_tAWo-dyfOuzeufB1f4MBa0',
    lastSaved: '21 Oct 2026',
    type: 'Folder',
    status: 'Allowlisted',
    pagesOrSize: 'Allowlisted Root',
    restricted: true,
  },
  {
    id: 'f-hotspot-media',
    name: 'Hotspot_26_media (09 Media Single Source)',
    folder: 'Allowlisted Drive Root (01 KB Handoff §3)',
    driveId: '1qmYmTQ-VA6WR9OBmmu8r2hdX-YmImMKh',
    lastSaved: '21 Oct 2026',
    type: 'Folder',
    status: 'Missing from attachment',
    pagesOrSize: 'Locked single media source',
  },
];

export interface MediaAssetItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'Render JPG' | '3D Sculptural Spec' | 'Showreel Video [SAMPLE]';
  url?: string;
  aspect: '16:9' | '9:16' | '1:1';
  material?: string;
  companionSticker?: string;
  motionSpec?: string;
  isSample: boolean;
}

export const MEDIA_ITEMS: MediaAssetItem[] = [
  {
    id: 'media-tabuk-desktop',
    title: 'SEVEN Tabuk — Concept Render (Desktop 3840×2160)',
    subtitle: 'Attached in 06 · Polychrome Canopy & Terracotta Facade',
    type: 'Render JPG',
    url: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    aspect: '16:9',
    companionSticker: 'Every destination has a story',
    motionSpec: 'Full-screen aperture inspection',
    isSample: false,
  },
  {
    id: 'media-tabuk-mobile',
    title: 'SEVEN Tabuk — Concept Render (Mobile 1080×1920)',
    subtitle: 'Attached in 06 · Vertical Architectural Canopy Walkthrough',
    type: 'Render JPG',
    url: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
    aspect: '9:16',
    companionSticker: 'On arrival',
    motionSpec: 'Vertical architectural reveal',
    isSample: false,
  },
  {
    id: 'media-wireframe-ref',
    title: 'Cerebro Wireframe Preview (WF03 / WF05 / WF08 / WF10)',
    subtitle: 'Attached in 03 · Reference Sheet',
    type: 'Render JPG',
    url: '/assets/aistudio/03_CEREBRO_WIREFRAME_PREVIEW_d85e2d39.png',
    aspect: '16:9',
    companionSticker: 'System Reference',
    motionSpec: 'Static reference',
    isSample: false,
  },
  {
    id: 'media-a01',
    title: 'A01 · Destination Constellation',
    subtitle: '06 Manifest Group: Identity · 7 Polished Metal Nodes',
    type: '3D Sculptural Spec',
    aspect: '1:1',
    material: 'Brushed stainless steel, fine directional scratches and polished bevels',
    companionSticker: 'Every destination has a story',
    motionSpec: 'Slow in-plane drift',
    isSample: false,
  },
  {
    id: 'media-a04',
    title: 'A04 · Identity Relief',
    subtitle: '06 Manifest Group: Identity · Concentric Topographic Tile',
    type: '3D Sculptural Spec',
    aspect: '1:1',
    material: 'Oxblood glazed ceramic #B4403F, subtle fired speckling',
    companionSticker: 'Start with its identity',
    motionSpec: 'Small in-plane tilt',
    isSample: false,
  },
  {
    id: 'media-a06',
    title: 'A06 · Destination Prism',
    subtitle: '06 Manifest Group: Identity · Split Beveled Triangular Prism',
    type: '3D Sculptural Spec',
    aspect: '1:1',
    material: 'Thick amber optical glass with internal refraction',
    companionSticker: 'Local knowledge shapes the work',
    motionSpec: 'Vertical rise',
    isSample: false,
  },
  {
    id: 'media-a19',
    title: 'A19 · Cinema Lens',
    subtitle: '06 Manifest Group: Media · Concentric Metal Barrel & Amber Core',
    type: '3D Sculptural Spec',
    aspect: '1:1',
    material: 'Graphite satin rubber barrel, silver ridges, amber optical glass',
    companionSticker: 'Film meets experience',
    motionSpec: 'Slow scale reveal',
    isSample: false,
  },
  {
    id: 'media-a25',
    title: 'A25 · Production Layers',
    subtitle: '06 Manifest Group: Systems · 5 Exploded Solid Slabs',
    type: '3D Sculptural Spec',
    aspect: '1:1',
    material: 'Stainless steel, ivory paper, navy enamel, graphite rubber and amber glass layers',
    companionSticker: 'Build the production plan',
    motionSpec: 'Vertical reveal',
    isSample: false,
  },
  {
    id: 'media-film-01',
    title: 'Portfolio / Showreel — Film 01 [SAMPLE]',
    subtitle: '02 Blueprint Frame 03 & 06 · Awaiting 09 Media (Hotspot_26_media)',
    type: 'Showreel Video [SAMPLE]',
    aspect: '16:9',
    material: 'Duration 02:59 · Resolution Asset / Pending',
    companionSticker: 'SYNTHETIC SLATE NOT A FILM',
    motionSpec: 'Unfolds 450 ms from tapped source',
    isSample: true,
  },
];

export interface ShowreelSpec {
  id: string;
  title: string;
  subtitle: string;
  projectCode: string;
  timecodePreview: string;
  drivePath: string;
  sourceKind: 'Attached 4K Render' | 'Hotspot_26_media [SAMPLE]' | 'Vimeo / Custom Embed';
  posterUrl?: string;
  embedUrl?: string;
  companionSticker: string;
}

export const SHOWREEL_ITEMS: ShowreelSpec[] = [
  {
    id: 'med-mission-lotus',
    title: '01 · Mission Lotus — Spatial & Experiential Reel',
    subtitle: 'NOJARA Studios · Experiential Direction & Production Leadership',
    projectCode: 'MISSION-LOTUS',
    timecodePreview: '00:00 — 02:14 · 4K 24fps',
    drivePath: 'drive:Hotspot_26_media/Mission_Lotus_Master_Reel_2026.mp4',
    sourceKind: 'Hotspot_26_media [SAMPLE]',
    companionSticker: 'Scale without sameness',
  },
  {
    id: 'med-seven-reel',
    title: '02 · SEVEN × NOJARA — A Reason to Return (Tabuk)',
    subtitle: 'Destination Participation, Creator Collisions & Architectural Walkthrough',
    projectCode: 'SEVEN',
    timecodePreview: '00:00 — 02:59 · 3840×2160',
    drivePath: 'local:/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    sourceKind: 'Attached 4K Render',
    posterUrl: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_desktop_3840x2160_a125f8eb.jpg',
    companionSticker: 'Every destination has a story',
  },
  {
    id: 'med-laliga',
    title: '03 · NOJARA × LaLiga — Cultural Collision & Live Broadcast',
    subtitle: 'Cairo–Riyadh Sports Culture & Multidisciplinary Activation',
    projectCode: 'LALIGA',
    timecodePreview: '00:00 — 01:48 · 1080p',
    drivePath: 'drive:Hotspot_26_media/NOJARA_LaLiga_Activation_Reel.mp4',
    sourceKind: 'Hotspot_26_media [SAMPLE]',
    companionSticker: 'Let disciplines collide',
  },
  {
    id: 'med-el-batron',
    title: '04 · El Batron — Immersive World & Sonic Identity',
    subtitle: 'NOJARA Programme Identity · Live Spatial Experience',
    projectCode: 'EL-BATRON',
    timecodePreview: '00:00 — 02:05 · 4K',
    drivePath: 'drive:Hotspot_26_media/El_Batron_Spatial_Showreel.mp4',
    sourceKind: 'Hotspot_26_media [SAMPLE]',
    companionSticker: 'Film meets experience',
  },
  {
    id: 'med-yah-highlight',
    title: '05 · Young & Human (YAH) — Three-World Opening & Museum of Almost',
    subtitle: 'Talent Accelerator, Creator Quiz Paths & Interactive Exhibition',
    projectCode: 'YAH',
    timecodePreview: '00:00 — 01:56 · 4K',
    drivePath: 'drive:1P-cbrL4pRtu5ywBj-uA4A61HrJexKWMR/YAH_Opening_Reel',
    sourceKind: 'Hotspot_26_media [SAMPLE]',
    posterUrl: '/assets/aistudio/06_SEVEN_Tabuk_concept_render_mobile_1080x1920_8efe6dff.jpg',
    companionSticker: 'Design the next moment',
  },
];

export interface CdeDimensionNode {
  id: CdeDimensionId;
  label: string;
  labelAr: string;
  colour: string;
  position: [number, number, number];
  description: string;
  subdomains: {
    id: string;
    name: string;
    position: [number, number, number];
    projectIds: string[];
  }[];
}

export const CDE_DIMENSIONS: CdeDimensionNode[] = [
  {
    id: 'strategy',
    label: 'Creative Strategy',
    labelAr: 'الاستراتيجية الإبداعية',
    colour: COLOUR_TOKENS.cdeStrategy,
    position: [-0.42, 0.76, 1.55],
    description: 'Experience design, destination storytelling, and cultural positioning across Cairo and Riyadh (05_SEVEN_01).',
    subdomains: [
      { id: 'sub-dest', name: 'Destination Storytelling', position: [-2.15, 1.85, 1.45], projectIds: ['SEVEN'] },
      { id: 'sub-brand', name: 'Brand & Cultural Systems [SAMPLE]', position: [-2.35, 0.55, 1.65], projectIds: ['AL-AHRAM'] },
    ],
  },
  {
    id: 'production',
    label: 'Production Leadership',
    labelAr: 'قيادة الإنتاج',
    colour: COLOUR_TOKENS.cdeProduction,
    position: [2.12, 0.78, 1.42],
    description: 'Joined-up destination activations, spatial directing, and film/experiential production (05_SEVEN_01).',
    subdomains: [
      { id: 'sub-act', name: 'Destination Activations', position: [2.55, 1.85, 1.25], projectIds: ['BSOCIAL', 'SEVEN'] },
      { id: 'sub-spatial', name: 'Live Spatial & Film [SAMPLE]', position: [2.65, -0.35, 1.55], projectIds: ['EL-BATRON', 'GONDWANA'] },
    ],
  },
  {
    id: 'talent',
    label: 'Talent & Culture',
    labelAr: 'المواهب والثقافة',
    colour: COLOUR_TOKENS.cdeTalent,
    position: [-1.35, -0.85, 1.48],
    description: 'Multidisciplinary practitioners, creator exchange, and talent accelerators (Young & Human, Abu Hamdan, Drafteers).',
    subdomains: [
      { id: 'sub-pract', name: 'Multidisciplinary Practitioners', position: [-2.25, -1.95, 1.45], projectIds: ['MHE'] },
      { id: 'sub-accel', name: 'Talent Accelerator', position: [-1.85, -1.15, 1.85], projectIds: ['YAH'] },
    ],
  },
  {
    id: 'mediatech',
    label: 'Media Technology (NJR+)',
    labelAr: 'تكنولوجيا الإعلام',
    colour: COLOUR_TOKENS.cdeMediaTech,
    position: [1.32, 1.48, 1.32],
    description: 'NJR+ execution intelligence for decisions, versions, approvals, costs, delivery, results and learning, plus conversational 3D systems.',
    subdomains: [
      { id: 'sub-museums', name: 'Interactive Worlds & Museums', position: [1.85, -1.55, 1.55], projectIds: ['MUSEUM-OF-ALMOST', 'YAH'] },
      { id: 'sub-3d', name: '3D Cosmographic & Sculptural Assets', position: [1.22, 0.18, 1.65], projectIds: ['SEVEN'] },
    ],
  },
];

export interface StoryChapter {
  index: number;
  id: string;
  routeAlias: string;
  title: string;
  kicker: string;
  colour: string;
  cameraTarget: [number, number, number];
  sculpturalAssetId: string;
  sculpturalAssetName: string;
  companionSticker: string;
  verifiedBody: string;
  sampleNote?: string;
}

/**
 * 8-Chapter Story Journey mirroring the SEVEN 8-dot experience (02 Blueprint p.7-8 & 05_SEVEN_03)
 * Uses ONLY verified text from 01_CEREBRO_KB_HANDOFF and 05_SEVEN_01..03.
 */
export const STORY_CHAPTERS: StoryChapter[] = [
  {
    index: 1,
    id: 'ch-01-origin',
    routeAlias: '#welcome',
    title: '01 · NOJARA Studios (Est. 2016)',
    kicker: 'CAIRO – RIYADH · ORIGIN & OPERATING CONTEXT',
    colour: COLOUR_TOKENS.cdeStrategy,
    cameraTarget: [-5.5, 3.8, 2.4],
    sculpturalAssetId: 'A01_destination_constellation',
    sculpturalAssetName: 'A01 · Destination Constellation (Brushed Steel)',
    companionSticker: 'Every destination has a story',
    verifiedBody: 'NOJARA Productions was founded in 2016 and operates across Cairo and Riyadh. NOJARA Studios practices across four connected pillars: creative strategy, production leadership, talent, and media technology.',
    sampleNote: 'Full 21-page text from NOJARA_Full_Company_Profile_v04.pdf is marked SAMPLE (File 10 in MISSING).',
  },
  {
    index: 2,
    id: 'ch-02-founder',
    routeAlias: '#tarek',
    title: '02 · 39 — Tarek Nojara',
    kicker: 'FOUNDER AND CULTURE AND DESIGN ENGINEER',
    colour: COLOUR_TOKENS.textPrimary,
    cameraTarget: [0, 2.5, 4.0],
    sculpturalAssetId: 'A04_identity_relief',
    sculpturalAssetName: 'A04 · Identity Relief (Oxblood Ceramic #B4403F)',
    companionSticker: 'Start with its identity',
    verifiedBody: 'Tarek Nojara (39) is Founder and Culture and Design Engineer of NOJARA Studios — never titled CEO. Presented across the verified portal records as founder, creative producer, and strategist orchestrating multidisciplinary teams and AI crew systems.',
    sampleNote: 'Full 10-page text from Tarek_Nojara_Full_Visual_Bio_v04.pdf & Consultant_Profile_v04.pdf is marked SAMPLE (File 10 in MISSING).',
  },
  {
    index: 3,
    id: 'ch-03-identities',
    routeAlias: '#studio',
    title: '03 · Programmes & Identities',
    kicker: 'YOUNG & HUMAN · DRAFTEERS · MUSEUM OF ALMOST · EL BATRON · GONDWANA',
    colour: COLOUR_TOKENS.cdeTalent,
    cameraTarget: [-5.4, -3.8, 2.5],
    sculpturalAssetId: 'A05_different_together',
    sculpturalAssetName: 'A05 · Different Together (Navy Enamel #223C73)',
    companionSticker: 'Scale without sameness',
    verifiedBody: 'NOJARA Studios presents Young & Human (YAH), Drafteers, Museum of Almost, El Batron, and Gondwana as distinct identities and programmes with project-defined roles across culture, talent acceleration, and experiential production.',
  },
  {
    index: 4,
    id: 'ch-04-njr-plus',
    routeAlias: '#gallery',
    title: '04 · NJR+ Execution Intelligence',
    kicker: 'DECISIONS · VERSIONS · APPROVALS · COSTS · DELIVERY · LEARNING',
    colour: COLOUR_TOKENS.cdeMediaTech,
    cameraTarget: [5.4, -3.8, 2.5],
    sculpturalAssetId: 'A25_production_layers',
    sculpturalAssetName: 'A25 · Production Layers (5-Material Stack)',
    companionSticker: 'Build the production plan',
    verifiedBody: 'NJR+ is NOJARA Studios’ execution-intelligence approach connecting creative intent to delivery: tracking decisions, versions, approvals, costs, delivery milestones, results, and institutional learning inside Cerebro HQ.',
  },
  {
    index: 5,
    id: 'ch-05-seven',
    routeAlias: '#proposal',
    title: '05 · SEVEN × NOJARA — A Reason to Return',
    kicker: 'DESTINATION PARTICIPATION · CREATION · SHARING · RETURN',
    colour: COLOUR_TOKENS.stationMedia,
    cameraTarget: [-7.8, 5.2, 3.6],
    sculpturalAssetId: 'A12_return_spiral',
    sculpturalAssetName: 'A12 · Return Spiral (Oxblood Translucent Resin)',
    companionSticker: 'Give return a reason',
    verifiedBody: '"A Reason to Return" is a NOJARA proposal connecting destination participation, local creativity, and destination storytelling. Recommended pilot concept: One Destination, Three Stories, alongside Creator Collisions (Riyadh) and The Next Moment (Abha).',
  },
  {
    index: 6,
    id: 'ch-06-hamdan',
    routeAlias: '#hamdan',
    title: '06 · Multidisciplinary Collisions (Abu Hamdan)',
    kicker: 'MUSIC · CONTEMPORARY ART · DESIGN · PERFORMANCE',
    colour: COLOUR_TOKENS.cdeProduction,
    cameraTarget: [-7.8, -5.0, 3.5],
    sculpturalAssetId: 'A13_creator_interlock',
    sculpturalAssetName: 'A13 · Creator Interlock (Steel & Navy Enamel)',
    companionSticker: 'Let disciplines collide',
    verifiedBody: 'Collaborations with Saudi multidisciplinary practitioner Mohammed Alhamdan (Abu Hamdan) span music, contemporary art, creative direction, and experiential concepts — with availability, rights, and commercial terms gated prior to production.',
  },
  {
    index: 7,
    id: 'ch-07-activations',
    routeAlias: '#activations',
    title: '07 · Participatory Destination Activations',
    kicker: 'FAMILY EXPERIENCES · CREATOR TOURNAMENTS · EDUTAINMENT',
    colour: COLOUR_TOKENS.stationTasks,
    cameraTarget: [8.0, 5.0, 3.4],
    sculpturalAssetId: 'A15_tournament_steps',
    sculpturalAssetName: 'A15 · Tournament Steps (Chamfered Podium)',
    companionSticker: 'Design the next moment',
    verifiedBody: 'Participatory family activities, gamified venue experiences, and creator-led tournaments designed to turn passive visitors into active participants and build long-term destination IP.',
  },
  {
    index: 8,
    id: 'ch-08-governance',
    routeAlias: '#proposal-downloads',
    title: '08 · Rights, Approvals & Precision Delivery',
    kicker: 'SOURCE-BOUND GOVERNANCE · ZERO UNVERIFIED CLAIMS',
    colour: COLOUR_TOKENS.cobaltAccent,
    cameraTarget: [0, 0, 0],
    sculpturalAssetId: 'A28_rights_lock',
    sculpturalAssetName: 'A28 · Rights Lock (Amber Glass & Brushed Silver)',
    companionSticker: 'Agree the rights',
    verifiedBody: 'Every NOJARA programme enforces strict governance: approvals, permissions, responsibilities, rights, consent, release, safety, suppliers, quality, cost, and ownership are verified before delivery.',
  },
];

export interface TourStop {
  stopIndex: number;
  title: string;
  sphere: 'hq' | 'cde';
  targetId: string;
  panelToOpen: string;
  durationSec: number;
  narrationEn: string;
  narrationAr: string;
  captionBubbleText: string;
}

export const GUIDED_TOUR_STOPS: TourStop[] = [
  {
    stopIndex: 1,
    title: 'Stop 01 · Cerebro HQ Core & Projects Station',
    sphere: 'hq',
    targetId: 'projects',
    panelToOpen: 'projects',
    durationSec: 30,
    narrationEn: 'Welcome back, sir. Starting at Cerebro HQ Projects station. Four active register workstreams — SEVEN, Young and Human, Abu Hamdan, and BSocial — are loaded from the 23 October snapshot.',
    narrationAr: 'أهلاً بيك يا فندم. بنبدأ من محطة المشاريع في Cerebro HQ.',
    captionBubbleText: 'HQ Projects: 4 Register Workstreams + 4 Portfolio Programmes [SAMPLE]',
  },
  {
    stopIndex: 2,
    title: 'Stop 02 · Tasks & Meeting Parser Rollups',
    sphere: 'hq',
    targetId: 'tasks',
    panelToOpen: 'tasks',
    durationSec: 30,
    narrationEn: 'Moving to Tasks. Fifty-two meeting and email records are parsed into Actions, Decisions, Questions, and Updates with source locators.',
    narrationAr: 'اتنقلنا لمحطة المهام. ٥٢ سجل من الاجتماعات والإيميلات.',
    captionBubbleText: 'Tasks Station: 52 Parsed Records (Actions, Decisions, Questions)',
  },
  {
    stopIndex: 3,
    title: 'Stop 03 · People Station (HQ, Team & RACI Matrix)',
    sphere: 'hq',
    targetId: 'people',
    panelToOpen: 'people',
    durationSec: 30,
    narrationEn: 'At People station. Sub-panels cover HQ leadership, Grok crew bots under Kinzo and Baghira, and the per-project RACI accountability matrix.',
    narrationAr: 'محطة الفريق: الإدارة، فريق الـ Agents، ومصفوفة RACI.',
    captionBubbleText: 'People Station: 39 (Founder & CDE) · Shweekar (PMO) · RACI Matrix',
  },
  {
    stopIndex: 4,
    title: 'Stop 04 · Media Station (Amber #F2B66D)',
    sphere: 'hq',
    targetId: 'media',
    panelToOpen: 'media',
    durationSec: 30,
    narrationEn: 'Landing at Media station in locked amber. The two SEVEN Tabuk concept renders and thirty sculptural 3D asset specifications are ready for full-screen inspection.',
    narrationAr: 'محطة الميديا باللون الكهرماني المعتمد وعروض SEVEN تبوك.',
    captionBubbleText: 'Media Station (#F2B66D): SEVEN Tabuk Renders + 30 Sculptural Specs',
  },
  {
    stopIndex: 5,
    title: 'Stop 05 · Transition to CDE Sphere (The Universe)',
    sphere: 'cde',
    targetId: 'strategy',
    panelToOpen: 'cde-explorer',
    durationSec: 30,
    narrationEn: 'Travelling across the orbital bridge to the CDE Sphere — Culture and Design Engineer universe — mapping Dimensions, Subdomains, and Projects.',
    narrationAr: 'رحلة متصلة لكوكب CDE: الأبعاد الإبداعية والمشاريع.',
    captionBubbleText: 'CDE Sphere: Creative Strategy · Production · Talent · Media Tech',
  },
  {
    stopIndex: 6,
    title: 'Stop 06 · NOJARA Studios & 39 Interactive Story Journey',
    sphere: 'cde',
    targetId: 'mediatech',
    panelToOpen: 'story-journey',
    durationSec: 30,
    narrationEn: 'Completing the tour at the eight-chapter NOJARA Studios and Tarek Nojara interactive journey, modelled on the SEVEN experience.',
    narrationAr: 'المحطة السادسة: رحلة قصة NOJARA وطارق نوجارا في ٨ فصول.',
    captionBubbleText: '8-Chapter Journey: Cairo–Riyadh (Est. 2016) to NJR+ Execution Intelligence',
  },
];

export interface TeamCheckpointItem {
  id: string;
  agentOrPerson: string;
  role: string;
  projectId: string;
  title: string;
  summary: string;
  evidenceLocator: string;
  defaultStatus: 'Pending 39 Sign-off' | 'Approved' | 'Revision Requested' | 'Rejected';
}

export const TEAM_CHECKPOINTS: TeamCheckpointItem[] = [
  {
    id: 'chk-rasma-blueprint',
    agentOrPerson: 'Rasma',
    role: 'Art Direction Crew Bot',
    projectId: 'SEVEN',
    title: '02_CEREBRO_BLUEPRINT_RASMA_v0.2 & MADAR Motion Spec',
    summary: '24-page wireframe PRD, NASAQ contrast tokens, 176×44 lockup slot, and (.22,1,.36,1) camera curve.',
    evidenceLocator: 'drive:02_CEREBRO_BLUEPRINT_RASMA_v0.2_DRAFT.pdf',
    defaultStatus: 'Pending 39 Sign-off',
  },
  {
    id: 'chk-baghira-seven-pilot',
    agentOrPerson: 'Baghira',
    role: 'Chief of Planning',
    projectId: 'SEVEN',
    title: 'SEVEN Pilot Decision Framework & Three Stories Scope',
    summary: 'Creator-exchange pilot thresholds and destination filming access gate prior to client appointment.',
    evidenceLocator: 'drive:10-Gz7K7j8kReUxNu0WMUwUgJepIy2F6T · Pages 1–4',
    defaultStatus: 'Pending 39 Sign-off',
  },
  {
    id: 'chk-kinzo-crew-pack',
    agentOrPerson: 'Kinzo',
    role: 'Crew Controller',
    projectId: 'YAH',
    title: '02_ORG_PACK Grok Crew Bot Dispatch & 62 PNG Asset Validation',
    summary: 'Validates 62 current-source PNG assets and role-specific quiz paths before YAH frontend lock.',
    evidenceLocator: 'drive:1P-cbrL4pRtu5ywBj-uA4A61HrJexKWMR',
    defaultStatus: 'Pending 39 Sign-off',
  },
  {
    id: 'chk-grandy-org-pack',
    agentOrPerson: 'Grandy',
    role: 'COO Bot (Grok)',
    projectId: 'CEREBRO',
    title: '02_ORG_PACK Cross-Stream Operations & Motion Note Relay',
    summary: 'Relays Rasma motion notes and operational gates across NOJARA_HQ_26 downstream packs.',
    evidenceLocator: 'drive:151TXi5udU_tAWo-dyfOuzeufB1f4MBa0 · 02_ORG_PACK',
    defaultStatus: 'Pending 39 Sign-off',
  },
  {
    id: 'chk-zebda-exec-brief',
    agentOrPerson: 'Zebda',
    role: 'Executive Coordinator (Grok)',
    projectId: 'CEREBRO',
    title: 'Daily Executive Brief & Action Item Consolidation for 39',
    summary: 'Consolidates daily meeting rollups, pending approvals, and owner-only calendar gates.',
    evidenceLocator: 'drive:01_CEREBRO_KB_HANDOFF_v1.0 · §2',
    defaultStatus: 'Pending 39 Sign-off',
  },
  {
    id: 'chk-shweekar-eea',
    agentOrPerson: 'Shweekar',
    role: 'PMO Collaborator',
    projectId: 'YAH',
    title: 'EEA 2026 Visual Brief v5 Eligibility & Presenter Permission',
    summary: 'Entity/category selection and presenter permission verification ahead of reported 19 Oct deadline.',
    evidenceLocator: 'drive:1HPCVIMeDJcbwzpNtK756-E3xmikQgSJa · Pages 3–14',
    defaultStatus: 'Pending 39 Sign-off',
  },
  {
    id: 'chk-mhe-spelling-rights',
    agentOrPerson: 'Mohammed Alhamdan (Abu Hamdan)',
    role: 'Saudi Multidisciplinary Practitioner',
    projectId: 'MHE',
    title: 'Portrait-to-Persona Mapping, Name Spelling & Commercial Terms Gate',
    summary: 'Resolve Al7amdan vs Alhamdan public spelling and Nov 1 release attribution.',
    evidenceLocator: 'drive:1f1W7p1KubJbUUj6cR8ZcNOXSDpRJpP7Ju7POB_enaVI',
    defaultStatus: 'Pending 39 Sign-off',
  },
  {
    id: 'chk-khalid-bsocial-ehab',
    agentOrPerson: 'Khalid Al-Shaalan',
    role: 'External Collaborator',
    projectId: 'BSOCIAL',
    title: 'BSocial × YAH Follow-up & Ehab Personal Access Request',
    summary: 'Third-party request from Ahmed Shams awaiting 39 decision on Ehab access (currently blocked/withheld).',
    evidenceLocator: 'gmail:me@nojara.com:1a111d09f970ea0b',
    defaultStatus: 'Pending 39 Sign-off',
  },
];

export type TeamRoomChannelId = 'General' | 'Approvals' | 'Daily brief' | 'Cerebro build' | 'Media';

export interface TeamRoomMessage {
  id: string;
  channel: TeamRoomChannelId;
  sender: string;
  role: string;
  timestamp: string;
  text: string;
}

export const INITIAL_TEAM_ROOM_MESSAGES: TeamRoomMessage[] = [
  {
    id: 'tr-gen-1',
    channel: 'General',
    sender: 'Cerebro',
    role: 'Master Brain & Voice Pilot',
    timestamp: '22:00 UTC',
    text: 'HQ and CDE spheres synced with 52 read-only register records from 23 Oct 2026.',
  },
  {
    id: 'tr-app-1',
    channel: 'Approvals',
    sender: 'KR',
    role: 'Reviews & Validation',
    timestamp: '21:45 UTC',
    text: '6 checkpoints queued in H02 (Rasma Blueprint v0.2, SEVEN Pilot Rights, YAH 62 Assets, EEA Brief, MHE Spelling, BSocial Access Gate).',
  },
  {
    id: 'tr-brief-1',
    channel: 'Daily brief',
    sender: 'Baghira',
    role: 'Chief of Planning',
    timestamp: '08:30 UTC',
    text: 'Urgent items: (1) SEVEN pitch email 550 5.1.1 recipient bounce verification; (2) YAH EEA eligibility; (3) MHE Nov 1 release identity.',
  },
  {
    id: 'tr-build-1',
    channel: 'Cerebro build',
    sender: 'Rasma',
    role: 'Art Direction Crew Bot',
    timestamp: '20:15 UTC',
    text: 'Blueprint v0.2 NASAQ contrast tokens, 176×44 Square-Kufic Bismillah lockup, and 6-stop 30s Paced Tour active.',
  },
  {
    id: 'tr-med-1',
    channel: 'Media',
    sender: 'Kinzo',
    role: 'Crew Controller',
    timestamp: '19:50 UTC',
    text: 'ST-05 Media Carousel loaded with 5 NOJARA reels + 2 attached SEVEN Tabuk renders (3840×2160 & 1080×1920).',
  },
];

export interface TimelineMilestone {
  id: string;
  projectId: string;
  title: string;
  dateLabel: string;
  startPct: number;
  widthPct: number;
  health: ProjectHealth;
  owner: string;
  sourceRef: string;
}

export const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    id: 'tl-mhe-lead',
    projectId: 'MHE',
    title: 'Wahag Opportunity & Pitch Alignment ("Lead with questions")',
    dateLabel: '05 Oct – 15 Oct 2026',
    startPct: 5,
    widthPct: 32,
    health: 'On track',
    owner: '39 (me@nojara.com)',
    sourceRef: 'drive:1-YOfl4cWTpZ8yKeCFxlSakivw2TFGHlzx9_MCgPhZFk',
  },
  {
    id: 'tl-bsocial-gate',
    projectId: 'BSOCIAL',
    title: 'BSocial Pitch Dispatch & Ehab Access Clarification Gate',
    dateLabel: '06 Oct 2026 – Hold',
    startPct: 12,
    widthPct: 24,
    health: 'Blocked',
    owner: 'Awaiting 39 Decision',
    sourceRef: 'gmail:1a111d09f970ea0b',
  },
  {
    id: 'tl-seven-package',
    projectId: 'SEVEN',
    title: 'SEVEN Six-PDF Pitch Review, 30 Sculptural Specs & Portal Audit',
    dateLabel: '06 Oct – 23 Oct 2026',
    startPct: 15,
    widthPct: 55,
    health: 'At risk',
    owner: '39 / KR',
    sourceRef: 'drive:1zj8IkWlcECNPb587k05J8h3I6UlDK_8F',
  },
  {
    id: 'tl-yah-eea',
    projectId: 'YAH',
    title: 'YAH Three-World Journey, 62 Assets & EEA 2026 Submission Brief',
    dateLabel: '06 Oct – 19 Oct 2026',
    startPct: 18,
    widthPct: 48,
    health: 'On track',
    owner: 'YAH Team / PMO',
    sourceRef: 'drive:1HPCVIMeDJcbwzpNtK756-E3xmikQgSJa',
  },
  {
    id: 'tl-mhe-nov1',
    projectId: 'MHE',
    title: 'Nov 1 Music Release Reference & Floward V4 Editorial Check',
    dateLabel: '15 Oct – 01 Nov 2026',
    startPct: 45,
    widthPct: 45,
    health: 'At risk',
    owner: 'Unassigned (Needs verification)',
    sourceRef: 'drive:1mTCC2P1LLaNjmZY9LeR6bPdRDH7e97p57hSJe39j09s',
  },
];

export interface BuildTrackerTier {
  tier: string;
  title: string;
  status: 'VERIFIED' | 'LOCAL_ONLY' | 'EXTERNAL_NOT_CONFIGURED';
  items: { code: string; name: string; status: string; evidence: string }[];
}

export const BUILD_TRACKER_TIERS: BuildTrackerTier[] = [
  {
    tier: 'TIER 01',
    title: 'Visual & Spatial Core (Dual Spheres, NASAQ Tokens, WebGL Recovery & Camera)',
    status: 'VERIFIED',
    items: [
      { code: 'B01', name: '8s Boot Loader + Bismillah & CEREBRO Vector Lockup + "Take off"', status: 'VERIFIED', evidence: 'BootLoader.tsx / BrandLockup.tsx' },
      { code: 'B02', name: 'Sphere 01 (HQ) + Sphere 02 (CDE) + WebGL Context Recovery & Fallback', status: 'VERIFIED', evidence: 'CosmographCanvas.tsx' },
      { code: 'B03', name: 'Authoritative Camera Rig (Orbit, Tilt, True Pan, Zoom, Reset, Hard Stop)', status: 'VERIFIED', evidence: 'CosmographCanvas.tsx' },
    ],
  },
  {
    tier: 'TIER 02',
    title: 'Workspace Stations, Minimise/Restore Draft Persistence & Reviews',
    status: 'VERIFIED',
    items: [
      { code: 'B04', name: '5 HQ Stations + 52 Register Records + Non-Red Health Shapes', status: 'VERIFIED', evidence: 'PanelsOverlay.tsx' },
      { code: 'B05', name: 'Minimise/Restore Dock Chips Preserving Project, Tab, Scroll & Unsent Drafts', status: 'VERIFIED', evidence: 'App.tsx + PanelsOverlay.tsx' },
      { code: 'B06', name: 'Reviews (Checkpoints) + Meeting Notes (Alias Resolution & Honest Draft Status)', status: 'VERIFIED', evidence: 'PanelsOverlay.tsx + server.ts' },
    ],
  },
  {
    tier: 'TIER 03',
    title: 'Persistent Conversation, Voice Bridge, Media Player & Grounded Tour',
    status: 'VERIFIED',
    items: [
      { code: 'B07', name: 'Persistent ElevenLabs Voice Session Across Navigation & Panel Changes', status: 'VERIFIED', evidence: 'elevenLabsBridge.ts + VoiceCard.tsx' },
      { code: 'B08', name: 'Durable Disk Persistence (.cerebro-data/store.json) + Binary File Uploads', status: 'VERIFIED', evidence: 'server.ts' },
      { code: 'B09', name: 'Grounded 6-Stop Tour Waiting for Camera Settle & Visible DOM Bounds', status: 'VERIFIED', evidence: 'App.tsx' },
    ],
  },
  {
    tier: 'TIER 04',
    title: 'Single-Stream MediaPipe Hands, Developer Diagnostics & External Connectors',
    status: 'LOCAL_ONLY',
    items: [
      { code: 'B10', name: 'Single Shared Camera Stream for Preview + MediaPipe HandLandmarker GPU', status: 'VERIFIED', evidence: 'HandsOverlay.tsx' },
      { code: 'B11', name: 'Authenticated Developer View + 16 Assertion-Based Self-Tests', status: 'VERIFIED', evidence: 'App.tsx + actionDispatcher.ts' },
      { code: 'B12', name: 'External Gmail SMTP/OAuth & Cursor Cloud Webhook Dispatch', status: 'EXTERNAL_NOT_CONFIGURED', evidence: 'Local store active; external webhook credentials not attached' },
    ],
  },
];

