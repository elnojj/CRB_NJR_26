/**
 * CEREBRO + CDE Master PRD & Wireframes v1.1 Canonical Data Store (`cerebroData.ts`)
 * Grounded in 01_CEREBRO_KB_HANDOFF_2026-10-21, 02_CEREBRO_BLUEPRINT_RASMA_v0.2,
 * and 07_NOJARA_Project_Register_SNAPSHOT_2026-10-23.
 */

export type PortfolioFilterChip = 'All' | 'Active' | 'Waiting on 39' | 'Blocked';

export type ProjectDetailTabV11 =
  | 'Overview'
  | 'Tasks'
  | 'People'
  | 'Files'
  | 'Media'
  | 'Budget'
  | 'Timeline'
  | 'Approvals'
  | 'Decisions';

export interface ProjectV11Item {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  client: string;
  location: string;
  status: 'Active' | 'Waiting on 39' | 'Blocked';
  health: 'On track' | 'At risk' | 'Blocked';
  ownerCode: string;
  leadName: string;
  summary: string;
  kpis: [
    { label: string; value: string; delta: string },
    { label: string; value: string; delta: string },
    { label: string; value: string; delta: string }
  ];
  budgetSummary: {
    allocated: string;
    committed: string;
    variance: string;
    burnStatus: string;
  };
  timelineMilestone: string;
  nextApproval: string;
  decisionPrompt: string;
  sunIndex?: number; // 0..5 for the 6 Project Suns in 3D space
}

export const CEREBRO_17_PROJECTS: ProjectV11Item[] = [
  {
    id: 'SEVEN',
    code: 'PRJ-01 · SEVEN',
    name: 'SEVEN × NOJARA — Tabuk & Kingdom Destinations',
    nameAr: 'سفن × نوجارا — وجهة تبوك',
    client: 'Saudi Entertainment Ventures (SEVEN)',
    location: 'Riyadh · Tabuk, KSA',
    status: 'Waiting on 39',
    health: 'At risk',
    ownerCode: '39',
    leadName: 'Tarek Nojara (39) · Khalid Al-Shaalan',
    summary:
      '8-chapter interactive executive portal, 30 sculptural 3D design assets, and Tabuk destination activation blueprint ("A reason to return").',
    kpis: [
      { label: 'Register Records', value: '18 Verified', delta: '+4 this week' },
      { label: '3D Assets Ready', value: '30 / 30', delta: 'Manifest locked' },
      { label: 'Pending 39 Sign-off', value: '3 Gates', delta: 'Tabuk rights & Arabic ج' },
    ],
    budgetSummary: {
      allocated: 'SAR 4,850,000 [SAMPLE]',
      committed: 'SAR 3,120,000 [SAMPLE]',
      variance: '+4.2% On Target',
      burnStatus: 'Phase 2 Portal & 3D Asset Lock',
    },
    timelineMilestone: '28 Oct 2026 — Executive Portal Sign-off & Riyadh Pitch',
    nextApproval: 'CHK-SEVEN-01: Approve Tabuk 4K Hero Render & Arabic Orthography',
    decisionPrompt: 'Confirm Arabic NOJARA orthography (نوجارا vs نوچارا) on portal cover.',
    sunIndex: 0,
  },
  {
    id: 'YAH',
    code: 'PRJ-02 · YAH',
    name: 'Young & Human (YAH) — Youth Culture Platform',
    nameAr: 'يانج آند هيومان — منصة الثقافة الشبابية',
    client: 'NOJARA Cultural Ventures',
    location: 'Cairo · Riyadh',
    status: 'Active',
    health: 'On track',
    ownerCode: '39',
    leadName: 'Shweekar · KR',
    summary:
      'Flagship youth culture, Sonic Lab, and multidisciplinary creative residency program across Cairo and Riyadh.',
    kpis: [
      { label: 'Register Records', value: '14 Verified', delta: 'Active sprint' },
      { label: 'Residency Cohort', value: '24 Creators', delta: 'Cohort 03' },
      { label: 'Deliverables', value: '88% Ready', delta: 'Sonic Lab live' },
    ],
    budgetSummary: {
      allocated: 'USD 620,000 [SAMPLE]',
      committed: 'USD 445,000 [SAMPLE]',
      variance: '0.0% Balanced',
      burnStatus: 'Q4 Residency & Content Production',
    },
    timelineMilestone: '04 Nov 2026 — YAH Season 02 Launch & Showreel Cut',
    nextApproval: 'CHK-YAH-01: Approve Season 02 Master Showreel Audio Mix',
    decisionPrompt: 'Lock Cairo–Riyadh Dual Studio Exchange dates for November.',
    sunIndex: 1,
  },
  {
    id: 'MHE',
    code: 'PRJ-03 · MHE',
    name: 'Abu Hamdan × Wahag / Floward / Barry',
    nameAr: 'أبو حمدان × وهج / فلاورد / باري',
    client: 'Mohammed Alhamdan (MHE) Strategic Partnerships',
    location: 'Riyadh · GCC',
    status: 'Waiting on 39',
    health: 'On track',
    ownerCode: '39',
    leadName: 'Mohammed Alhamdan · Tarek Nojara (39)',
    summary:
      'High-impact celebrity & talent brand architecture, retail capsule drops, and regional campaign activations with Wahag, Floward, and Barry.',
    kpis: [
      { label: 'Register Records', value: '12 Verified', delta: '3 active tracks' },
      { label: 'Partner Streams', value: '3 Brands', delta: 'Wahag · Floward · Barry' },
      { label: 'Contract Gate', value: '1 Pending', delta: 'Needs 39 review' },
    ],
    budgetSummary: {
      allocated: 'SAR 2,900,000 [SAMPLE]',
      committed: 'SAR 2,150,000 [SAMPLE]',
      variance: '+1.8% Under Cap',
      burnStatus: 'Commercial Production & Talent Licensing',
    },
    timelineMilestone: '01 Nov 2026 — Wahag Campaign Commercial Delivery',
    nextApproval: 'CHK-MHE-01: Finalize Floward Seasonal Activation Term Sheet',
    decisionPrompt: 'Approve Barry Q4 Riyadh Pop-Up spatial layout.',
    sunIndex: 2,
  },
  {
    id: 'BSOCIAL',
    code: 'PRJ-04 · BSOCIAL',
    name: 'B-Social — Experiential Community & Hospitality',
    nameAr: 'بي سوشيال — مجتمع الضيافة والتجارب',
    client: 'B-Social Holding',
    location: 'Cairo · El Gouna',
    status: 'Blocked',
    health: 'Blocked',
    ownerCode: '39',
    leadName: 'Shweekar · Bilal (BL)',
    summary:
      'Experiential social club, curated culinary pop-ups, and community membership platform awaiting venue permit & sound spec clearance.',
    kpis: [
      { label: 'Register Records', value: '8 Verified', delta: '1 Blocker' },
      { label: 'Venue Readiness', value: '64%', delta: 'Permit hold' },
      { label: 'Blocked Tasks', value: '2 Critical', delta: 'Acoustic spec' },
    ],
    budgetSummary: {
      allocated: 'EGP 18,500,000 [SAMPLE]',
      committed: 'EGP 11,200,000 [SAMPLE]',
      variance: '-6.5% Hold Buffer',
      burnStatus: 'Paused on Acoustic & Municipal Sign-off',
    },
    timelineMilestone: '12 Nov 2026 — Acoustic & Municipal Clearance Unblock',
    nextApproval: 'CHK-BSOCIAL-01: Unblock Acoustic Hardware Procurement',
    decisionPrompt: 'Authorize alternative acoustic vendor to clear 14-day bottleneck.',
    sunIndex: 3,
  },
  {
    id: 'AL-AHRAM',
    code: 'PRJ-05 · AL-AHRAM',
    name: 'Al-Ahram Heritage & Giza Cultural Activation',
    nameAr: 'الأهرام — تفعيل التراث الثقافي بالجيزة',
    client: 'Cultural Heritage Consortium',
    location: 'Giza Plateau, Egypt',
    status: 'Active',
    health: 'On track',
    ownerCode: 'GD',
    leadName: 'Grandy (GD) · Rasma (RS)',
    summary:
      'Monumental projection mapping, spatial audio narrative, and visitor pavilion choreography at the Giza Plateau.',
    kpis: [
      { label: 'Spatial Zones', value: '6 Zones', delta: 'Mapped in 3D' },
      { label: 'Projection Rigs', value: '14 Arrays', delta: 'Calibrated' },
      { label: 'Approval Gate', value: 'On Track', delta: 'Ministry review' },
    ],
    budgetSummary: {
      allocated: 'USD 1,450,000 [SAMPLE]',
      committed: 'USD 980,000 [SAMPLE]',
      variance: '+2.1% On Track',
      burnStatus: 'Optical & Acoustic Field Testing',
    },
    timelineMilestone: '18 Nov 2026 — Night Projection Dress Rehearsal',
    nextApproval: 'CHK-AHR-01: Approve Horizon Soundscape Master',
    decisionPrompt: 'Select final Arabic voiceover narrator for Pavilion 01.',
    sunIndex: 4,
  },
  {
    id: 'EL-BATRON',
    code: 'PRJ-06 · EL-BATRON',
    name: 'El Batron — Coastal Architecture & Sonic Sanctuary',
    nameAr: 'البترون — الملاذ الصوتي والمعماري الساحلي',
    client: 'NOJARA Hospitality & Spatial Design',
    location: 'North Coast · Mediterranean',
    status: 'Active',
    health: 'On track',
    ownerCode: 'RS',
    leadName: 'Rasma (RS) · Musa (MU)',
    summary:
      'Mediterranean coastal amphitheater, kinetic wind sculptures, and sunset acoustic ritual architecture.',
    kpis: [
      { label: 'Architectural Plates', value: '22 Drawings', delta: 'v2.4 Issued' },
      { label: 'Acoustic Nodes', value: '8 Towers', delta: 'Wind-tested' },
      { label: 'Client Sign-off', value: '92%', delta: 'Phase 2 ready' },
    ],
    budgetSummary: {
      allocated: 'USD 890,000 [SAMPLE]',
      committed: 'USD 610,000 [SAMPLE]',
      variance: '+0.9% On Track',
      burnStatus: 'Material Fabrication & Stone Quarrying',
    },
    timelineMilestone: '25 Nov 2026 — Coastal Amphitheater Structural Lock',
    nextApproval: 'CHK-BAT-01: Sign off Limestone & Brushed Steel Material Board',
    decisionPrompt: 'Approve sunset lighting DMX cue sheet.',
    sunIndex: 5,
  },
  {
    id: 'MUSEUM-OF-ALMOST',
    code: 'PRJ-07 · MOA',
    name: 'Museum of Almost — Speculative Futures Exhibition',
    nameAr: 'متحف التقريب — معرض المستقبل التأملي',
    client: 'NOJARA Curatorial Lab',
    location: 'Cairo · Traveling',
    status: 'Waiting on 39',
    health: 'At risk',
    ownerCode: '39',
    leadName: 'Tarek Nojara (39) · Katib (KT)',
    summary:
      'Immersive exhibition of unrealized architectural monuments, counterfactual design artifacts, and interactive holographic archives.',
    kpis: [
      { label: 'Curated Artifacts', value: '42 Pieces', delta: '38 digitized' },
      { label: 'Catalogue Essays', value: '12 Bilingual', delta: 'AR / EN' },
      { label: '39 Curatorial Gate', value: '2 Pending', delta: 'Gallery 03' },
    ],
    budgetSummary: {
      allocated: 'USD 540,000 [SAMPLE]',
      committed: 'USD 390,000 [SAMPLE]',
      variance: '-1.5% Within Tolerance',
      burnStatus: 'Holographic Display Fabrication',
    },
    timelineMilestone: '02 Dec 2026 — Curatorial Walkthrough with 39',
    nextApproval: 'CHK-MOA-01: Approve Counterfactual Monument Plinths',
    decisionPrompt: 'Confirm Riyadh touring dates for Q1 2027.',
  },
  {
    id: 'GONDWANA',
    code: 'PRJ-08 · GND',
    name: 'Gondwana — Deep-Time Botanical & Land Art Reserve',
    nameAr: 'جوندوانا — محمية الفن الأرضي والنباتي',
    client: 'Red Sea Ecological Arts Initiative',
    location: 'Red Sea · Sinai',
    status: 'Active',
    health: 'On track',
    ownerCode: 'FK',
    leadName: 'Fakir (FK) · Nasaq (NQ)',
    summary:
      'Ecological land art installations, solar-powered desert listening stations, and botanical seed vault.',
    kpis: [
      { label: 'Land Art Sites', value: '5 Sites', delta: 'Survey complete' },
      { label: 'Solar Stations', value: '10 Units', delta: 'Off-grid 100%' },
      { label: 'Eco Permit', value: 'Approved', delta: 'Cleared' },
    ],
    budgetSummary: {
      allocated: 'USD 780,000 [SAMPLE]',
      committed: 'USD 510,000 [SAMPLE]',
      variance: '+3.0% Under Budget',
      burnStatus: 'Desert Listening Station Assembly',
    },
    timelineMilestone: '10 Dec 2026 — Site 01 Basalt Monolith Installation',
    nextApproval: 'CHK-GND-01: Approve Solar Telemetry Array Spec',
    decisionPrompt: 'Confirm botanical archive glass etching typography.',
  },
  {
    id: 'DRAFTEERS',
    code: 'PRJ-09 · DRF',
    name: 'Drafteers — Architectural & Engineering Talent Guild',
    nameAr: 'درافتيرز — نقابة المواهب الهندسية والمعمارية',
    client: 'NOJARA Talent & Practice',
    location: 'Cairo · Riyadh',
    status: 'Active',
    health: 'On track',
    ownerCode: 'BL',
    leadName: 'Bilal (BL) · Kinzo (KZ)',
    summary:
      'Distributed CAD/BIM and spatial engineering guild connecting 140+ vetted architects and technical directors across MENA.',
    kpis: [
      { label: 'Vetted Fellows', value: '142 Engineers', delta: '+18 this month' },
      { label: 'Active Placements', value: '9 Projects', delta: '96% utilization' },
      { label: 'QA Pass Rate', value: '99.1%', delta: 'ISO BIM compliant' },
    ],
    budgetSummary: {
      allocated: 'USD 410,000 [SAMPLE]',
      committed: 'USD 320,000 [SAMPLE]',
      variance: '+1.2% On Track',
      burnStatus: 'Fellowship Portal & BIM Automation',
    },
    timelineMilestone: '15 Nov 2026 — Cohort 05 Technical Assessment',
    nextApproval: 'CHK-DRF-01: Approve Senior BIM Lead Retainer Tier',
    decisionPrompt: 'Expand Riyadh structural engineering fellowship seats from 20 to 35.',
  },
  {
    id: 'NJR-PLUS',
    code: 'PRJ-10 · NJR+',
    name: 'NJR+ Execution Intelligence & Spatial OS Core',
    nameAr: 'إن جي آر بلس — ذكاء التنفيذ ونظام التشغيل المكاني',
    client: 'NOJARA Internal R&D',
    location: 'Cairo · Cloud',
    status: 'Active',
    health: 'On track',
    ownerCode: '39',
    leadName: 'Tarek Nojara (39) · Baghira (BG)',
    summary:
      'Proprietary execution intelligence engine powering CEREBRO HQ, CDE Universe, 22-tool voice orchestration, and MediaPipe hand rigs.',
    kpis: [
      { label: 'Client Tools', value: '22 Active', delta: '100% wired' },
      { label: 'WebGL Frame Rate', value: '60 FPS', delta: 'Dual-sphere' },
      { label: 'Self-Tests', value: '18 / 18 Pass', delta: 'Verified' },
    ],
    budgetSummary: {
      allocated: 'USD 950,000 [SAMPLE]',
      committed: 'USD 740,000 [SAMPLE]',
      variance: '0.0% On Target',
      burnStatus: 'v1.1 Master PRD & Google Workspace Sync',
    },
    timelineMilestone: '27 Oct 2026 — CEREBRO + CDE v1.1 Master Release',
    nextApproval: 'CHK-NJR-01: Owner 39 Final Release Acceptance',
    decisionPrompt: 'Enable live Gemini Screen Orchestrator in production mode.',
  },
  {
    id: 'MISSION-LOTUS',
    code: 'PRJ-11 · LOTUS',
    name: 'Mission Lotus — Autonomous Kinetic Stage & Film',
    nameAr: 'مهمة لوتس — المسرح الحركي والفيلم المستقل',
    client: 'NOJARA Originals',
    location: 'Cairo Studio 01',
    status: 'Active',
    health: 'On track',
    ownerCode: 'WS',
    leadName: 'Waseem (WS) · Zebda (ZB)',
    summary:
      'Robotic lotus aperture stage rig, high-speed motion control cinematography, and spatial Dolby Atmos master reel.',
    kpis: [
      { label: 'Showreel Cut', value: '01:42 Master', delta: '4K 60fps' },
      { label: 'Motion Axes', value: '12 Robotic', delta: 'Synced' },
      { label: 'Audio Stems', value: '24 Channels', delta: 'Atmos locked' },
    ],
    budgetSummary: {
      allocated: 'USD 380,000 [SAMPLE]',
      committed: 'USD 365,000 [SAMPLE]',
      variance: '+0.4% Complete',
      burnStatus: 'Final Color Grade & Showreel Distribution',
    },
    timelineMilestone: '30 Oct 2026 — Master Showreel Delivery',
    nextApproval: 'CHK-LOT-01: Approve 4K HDR Color Grade LUT',
    decisionPrompt: 'Include Mission Lotus as Reel #1 in CDE Showreel Carousel.',
  },
  {
    id: 'LALIGA-MENA',
    code: 'PRJ-12 · LALIGA',
    name: 'LaLiga MENA Fan Zone & Interactive Pitch',
    nameAr: 'لاليجا الشرق الأوسط — منطقة المشجعين التفاعلية',
    client: 'LaLiga Regional Partner',
    location: 'Riyadh · Jeddah',
    status: 'Waiting on 39',
    health: 'At risk',
    ownerCode: '39',
    leadName: 'Bilal (BL) · Waseem (WS)',
    summary:
      'Interactive LED pitch, real-time player telemetry wall, and youth football skill arena across Riyadh and Jeddah.',
    kpis: [
      { label: 'LED Floor Area', value: '480 sqm', delta: 'Spec locked' },
      { label: 'Sensor Latency', value: '< 12 ms', delta: 'LiDAR tracked' },
      { label: 'Sponsor Gate', value: 'Waiting 39', delta: 'Brand placement' },
    ],
    budgetSummary: {
      allocated: 'SAR 3,400,000 [SAMPLE]',
      committed: 'SAR 2,200,000 [SAMPLE]',
      variance: '-2.8% Shipping Expedite',
      burnStatus: 'LED Tile Customs & Sponsor Lockup',
    },
    timelineMilestone: '08 Nov 2026 — Riyadh Fan Zone Rigging Start',
    nextApproval: 'CHK-LAL-01: Approve Main Archway Sponsor Lockup',
    decisionPrompt: 'Confirm air-freight expedite for interactive floor sensors.',
  },
  {
    id: 'RIYADH-METRO-ART',
    code: 'PRJ-13 · RMA',
    name: 'Riyadh Transit Wayfinding & Kinetic Light Gates',
    nameAr: 'بوابات الضوء الحركية والإرشاد البصري بالرياض',
    client: 'Urban Mobility & Public Art Commission',
    location: 'Riyadh, KSA',
    status: 'Active',
    health: 'On track',
    ownerCode: 'NQ',
    leadName: 'Nasaq (NQ) · Musa (MU)',
    summary:
      'Bilingual Arabic/English typographic wayfinding system and commuter-reactive kinetic light portals.',
    kpis: [
      { label: 'Station Portals', value: '4 Hubs', delta: 'Prototyped' },
      { label: 'Contrast Ratio', value: 'AAA 9.4:1', delta: 'Verified' },
      { label: 'Glyph Set', value: '1,240 Glyphs', delta: 'Kufic + Sans' },
    ],
    budgetSummary: {
      allocated: 'SAR 5,100,000 [SAMPLE]',
      committed: 'SAR 3,400,000 [SAMPLE]',
      variance: '+1.5% On Track',
      burnStatus: 'Anodized Aluminum & LED Diffuser Mockups',
    },
    timelineMilestone: '20 Nov 2026 — Full-Scale Portal Mockup Inspection',
    nextApproval: 'CHK-RMA-01: Approve Square-Kufic Directional Stencil',
    decisionPrompt: 'Lock warm 3200K vs 4000K twilight transition curve.',
  },
  {
    id: 'CAIRO-DESIGN-WEEK',
    code: 'PRJ-14 · CDW',
    name: 'Cairo Design Week — Citadel & Downtown Pavilion',
    nameAr: 'أسبوع القاهرة للتصميم — جناح القلعة ووسط البلد',
    client: 'CDW Curatorial Board',
    location: 'Historic Cairo',
    status: 'Active',
    health: 'On track',
    ownerCode: 'RS',
    leadName: 'Rasma (RS) · Katib (KT)',
    summary:
      'Modular timber-and-steel pavilion, acoustic majlis, and design talks amphitheater in Historic Cairo.',
    kpis: [
      { label: 'Pavilion Modules', value: '18 Units', delta: 'CNC cut' },
      { label: 'Speaker Lineup', value: '32 Talks', delta: 'Confirmed' },
      { label: 'Footfall Target', value: '45,000', delta: 'Ticketing live' },
    ],
    budgetSummary: {
      allocated: 'EGP 9,200,000 [SAMPLE]',
      committed: 'EGP 7,800,000 [SAMPLE]',
      variance: '+0.6% On Track',
      burnStatus: 'On-Site Assembly & Lighting Focus',
    },
    timelineMilestone: '14 Nov 2026 — VIP Opening Night at the Citadel',
    nextApproval: 'CHK-CDW-01: Approve Opening Night Keynote Deck',
    decisionPrompt: 'Confirm live streaming feed to Riyadh studio.',
  },
  {
    id: 'DIRIYAH-SOUQ',
    code: 'PRJ-15 · DRY',
    name: 'Diriyah Artisanal Craft & Perfumery Atelier',
    nameAr: 'الدرعية — مشغل الحرف والعطور التراثية',
    client: 'Heritage Retail Development',
    location: 'Diriyah, KSA',
    status: 'Waiting on 39',
    health: 'On track',
    ownerCode: '39',
    leadName: 'Tarek Nojara (39) · Fakir (FK)',
    summary:
      'Tactile mud-brick and brass olfactory bar, interactive scent organ, and Najdi craft archive.',
    kpis: [
      { label: 'Scent Vessels', value: '36 Handblown', delta: 'Amber glass' },
      { label: 'Brass Fixtures', value: '100% Custom', delta: 'Artisan forged' },
      { label: '39 Sign-off', value: '1 Pending', delta: 'Packaging seal' },
    ],
    budgetSummary: {
      allocated: 'SAR 2,650,000 [SAMPLE]',
      committed: 'SAR 1,920,000 [SAMPLE]',
      variance: '+2.4% Under Cap',
      burnStatus: 'Custom Glassware & Brass Millwork',
    },
    timelineMilestone: '29 Nov 2026 — Atelier Sensory Commissioning',
    nextApproval: 'CHK-DRY-01: Approve Wax Seal & Box Embossing Die',
    decisionPrompt: 'Select Oud & Taif Rose signature ambient diffusion profile.',
  },
  {
    id: 'SOUND-OF-NILE',
    code: 'PRJ-16 · NILE',
    name: 'Sound of the Nile — Hydro-Acoustic Documentary & Spatial Installation',
    nameAr: 'صوت النيل — التثبيت الصوتي والفيلم الوثائقي',
    client: 'NOJARA Audio & Film Lab',
    location: 'Aswan · Luxor · Cairo',
    status: 'Blocked',
    health: 'Blocked',
    ownerCode: 'WS',
    leadName: 'Waseem (WS) · Zebda (ZB)',
    summary:
      'Sub-aquatic hydrophone recordings from Aswan to the Delta paired with a 16-channel spatial sound dome.',
    kpis: [
      { label: 'Field Recordings', value: '64 Hours', delta: '24-bit 192kHz' },
      { label: 'Dome Rig', value: '16 Speakers', delta: 'Customs hold' },
      { label: 'Blocker', value: 'Customs Carnet', delta: 'Aswan river rig' },
    ],
    budgetSummary: {
      allocated: 'USD 310,000 [SAMPLE]',
      committed: 'USD 215,000 [SAMPLE]',
      variance: '-4.1% Customs Delay',
      burnStatus: 'Blocked on Hydrophone Array Carnet Release',
    },
    timelineMilestone: '19 Nov 2026 — Customs Carnet Release & Luxor Capture',
    nextApproval: 'CHK-NIL-01: Authorize Local Backup Hydrophone Rental',
    decisionPrompt: 'Approve local equipment substitution to resume Aswan shoot.',
  },
  {
    id: 'RED-SEA-PAVILION',
    code: 'PRJ-17 · RSP',
    name: 'Red Sea Coral Bio-Acoustic & Glass Pavilion',
    nameAr: 'جناح البحر الأحمر الزجاجي والصوتي الحيوي',
    client: 'Coastal Regenerative Tourism',
    location: 'Red Sea Coast, KSA',
    status: 'Active',
    health: 'On track',
    ownerCode: 'GD',
    leadName: 'Grandy (GD) · Baghira (BG)',
    summary:
      'Low-impact cast-glass coastal pavilion translating live reef bio-acoustics into refractive light caustics.',
    kpis: [
      { label: 'Cast Glass Ribs', value: '28 Structural', delta: 'Load tested' },
      { label: 'Reef Telemetry', value: 'Live Stream', delta: 'Solar buoy' },
      { label: 'Structural Sign-off', value: '100%', delta: 'Verified' },
    ],
    budgetSummary: {
      allocated: 'SAR 6,200,000 [SAMPLE]',
      committed: 'SAR 4,500,000 [SAMPLE]',
      variance: '+1.9% On Track',
      burnStatus: 'Cast Glass Annealing & Optical Coating',
    },
    timelineMilestone: '05 Dec 2026 — Reef Buoy Optical Link Test',
    nextApproval: 'CHK-RSP-01: Approve Refractive Caustic Shader Calibration',
    decisionPrompt: 'Confirm night-mode zero-light-pollution turtle protection cap.',
  },
];

// Panel #4: TaskBoard 4-Column Items (To do, Doing, Waiting, Done)
export type TaskBoardColumnId = 'To do' | 'Doing' | 'Waiting' | 'Done';

export interface TaskBoardCard {
  id: string;
  title: string;
  projectCode: string;
  ownerCode: string;
  ownerName: string;
  column: TaskBoardColumnId;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate: string;
  blockerReason?: string;
  description: string;
  subtasks: { id: string; text: string; done: boolean }[];
}

export const INITIAL_TASK_BOARD_CARDS: TaskBoardCard[] = [
  {
    id: 'TSK-101',
    title: 'Lock Arabic NOJARA orthography (نوجارا vs نوچارا) on SEVEN cover',
    projectCode: 'SEVEN',
    ownerCode: '39',
    ownerName: 'Tarek Nojara (39)',
    column: 'Waiting',
    priority: 'HIGH',
    dueDate: '28 Oct 2026',
    description:
      '05_SEVEN_05 flags Arabic spelling consistency across all 5 portal PDFs and the 3D title card.',
    subtasks: [
      { id: 'st-1', text: 'Audit 5 portal PDF headers', done: true },
      { id: 'st-2', text: 'Owner 39 final glyph choice', done: false },
    ],
  },
  {
    id: 'TSK-102',
    title: 'Approve Tabuk 4K Concept Renders (Desktop 3840×2160 & Mobile 1080×1920)',
    projectCode: 'SEVEN',
    ownerCode: 'RS',
    ownerName: 'Rasma (RS)',
    column: 'Doing',
    priority: 'HIGH',
    dueDate: '27 Oct 2026',
    description:
      'Verify contrast and safe-area framing on iPad 1180×820 and Phone 390×844 viewports.',
    subtasks: [
      { id: 'st-3', text: 'Mount 06b mobile & 06c desktop renders', done: true },
      { id: 'st-4', text: 'Calibrate #F2B66D amber chrome frame', done: true },
      { id: 'st-5', text: 'Final 39 visual sign-off', done: false },
    ],
  },
  {
    id: 'TSK-103',
    title: 'Clear B-Social acoustic hardware procurement hold',
    projectCode: 'BSOCIAL',
    ownerCode: 'BL',
    ownerName: 'Bilal (BL)',
    column: 'Waiting',
    priority: 'HIGH',
    dueDate: '29 Oct 2026',
    blockerReason: 'Blocked: Municipal acoustic limit requires directional array substitution.',
    description:
      'Replace standard sub-bass cabinets with cardioid directional arrays to pass venue decibel ceiling.',
    subtasks: [
      { id: 'st-6', text: 'Receive acoustic simulation report', done: true },
      { id: 'st-7', text: 'Approve alternative vendor quote', done: false },
    ],
  },
  {
    id: 'TSK-104',
    title: 'Deliver Wahag × Abu Hamdan commercial director cut v3',
    projectCode: 'MHE',
    ownerCode: 'WS',
    ownerName: 'Waseem (WS)',
    column: 'Doing',
    priority: 'HIGH',
    dueDate: '30 Oct 2026',
    description:
      'Integrate spatial audio stems and Riyadh rooftop twilight grade into 60-second hero cut.',
    subtasks: [
      { id: 'st-8', text: 'Lock 60s picture edit', done: true },
      { id: 'st-9', text: 'Mix Arabic voiceover + Atmos bed', done: false },
    ],
  },
  {
    id: 'TSK-105',
    title: 'Finalize YAH Season 02 Residency Cohort 03 contracts',
    projectCode: 'YAH',
    ownerCode: 'KT',
    ownerName: 'Katib (KT)',
    column: 'To do',
    priority: 'MEDIUM',
    dueDate: '02 Nov 2026',
    description:
      'Prepare bilingual residency agreements for 24 Cairo and Riyadh fellows.',
    subtasks: [
      { id: 'st-10', text: 'Draft IP & showcase terms', done: true },
      { id: 'st-11', text: 'Send via Gmail Two-Tap Confirm', done: false },
    ],
  },
  {
    id: 'TSK-106',
    title: 'Calibrate El Batron coastal wind-harp acoustic resonance',
    projectCode: 'EL-BATRON',
    ownerCode: 'MU',
    ownerName: 'Musa (MU)',
    column: 'To do',
    priority: 'MEDIUM',
    dueDate: '04 Nov 2026',
    description:
      'Tune pentatonic C4–A4 harmonic chambers for 12–28 knot Mediterranean coastal winds.',
    subtasks: [
      { id: 'st-12', text: 'Run harmonic CFD simulation', done: false },
      { id: 'st-13', text: 'Verify marine-grade 316L steel gauge', done: false },
    ],
  },
  {
    id: 'TSK-107',
    title: 'Hydrate 52 NOJARA_HQ_26 register records into CEREBRO store',
    projectCode: 'NJR-PLUS',
    ownerCode: 'BG',
    ownerName: 'Baghira (BG)',
    column: 'Done',
    priority: 'HIGH',
    dueDate: '23 Oct 2026',
    description:
      'All 52 read-only PMO snapshot records verified and indexed across HQ and CDE.',
    subtasks: [
      { id: 'st-14', text: 'Parse 07_NOJARA_Project_Register', done: true },
      { id: 'st-15', text: 'Bind to 22-tool agent manifest', done: true },
    ],
  },
  {
    id: 'TSK-108',
    title: 'Verify Dual-Sphere WebGL shaders (#4C8DFF HQ & #F2B66D CDE)',
    projectCode: 'NJR-PLUS',
    ownerCode: 'GD',
    ownerName: 'Grandy (GD)',
    column: 'Done',
    priority: 'HIGH',
    dueDate: '26 Oct 2026',
    description:
      'Refractive Cobalt Liquid Glass at [0,0,0] and Warm Amber Caustic Crystal at [38,4,-22] with 6,400 DOF galaxy particles.',
    subtasks: [
      { id: 'st-16', text: 'Compile Fresnel caustic shader', done: true },
      { id: 'st-17', text: 'Lock 15-token Neural Observatory palette', done: true },
    ],
  },
];

// Panel #5: Insights ("What needs you · 6 signals" with #FF5666 Blocked error red + Inspect drawers)
export interface InsightSignalItem {
  id: string;
  code: string;
  title: string;
  projectCode: string;
  severity: 'BLOCKED' | 'WAITING_ON_39' | 'TIMELINE_WATCH';
  metricBadge: string;
  summary: string;
  inspectDetail: string;
  recommendedAction: string;
  targetPanel: string;
  targetProjectId: string;
}

export const INSIGHTS_6_SIGNALS: InsightSignalItem[] = [
  {
    id: 'SIG-01',
    code: 'SIGNAL 01 · BLOCKED',
    title: 'B-Social Acoustic Permit & Array Substitution Hold',
    projectCode: 'BSOCIAL',
    severity: 'BLOCKED',
    metricBadge: 'BLOCKED · 14d impact',
    summary:
      'Venue municipal decibel cap blocks standard sub-bass rig. Cardioid array quote ready for 39 authorization.',
    inspectDetail:
      'Record REG-BS-04: Acoustic consultant verified that switching to directional cardioid cabinets reduces perimeter spill by 11 dB(A) and clears the municipal permit immediately without structural changes.',
    recommendedAction: 'Open B-Social Decisions & Authorize Cardioid Array',
    targetPanel: 'project-detail',
    targetProjectId: 'BSOCIAL',
  },
  {
    id: 'SIG-02',
    code: 'SIGNAL 02 · BLOCKED',
    title: 'Sound of the Nile Hydrophone Array Carnet Hold',
    projectCode: 'SOUND-OF-NILE',
    severity: 'BLOCKED',
    metricBadge: 'BLOCKED · Customs',
    summary:
      'Sub-aquatic 16-channel hydrophone rig held at customs clearance. Local backup array available in Cairo.',
    inspectDetail:
      'Waseem (WS) confirmed a calibrated 8-channel Ambient ASF-1 MKII hydrophone kit is available from Cairo Studio 01 so the Aswan capture window stays on schedule.',
    recommendedAction: 'Inspect Sound of the Nile & Approve Backup Rig',
    targetPanel: 'project-detail',
    targetProjectId: 'SOUND-OF-NILE',
  },
  {
    id: 'SIG-03',
    code: 'SIGNAL 03 · WAITING ON 39',
    title: 'SEVEN × NOJARA Arabic Orthography & Rights Gate',
    projectCode: 'SEVEN',
    severity: 'WAITING_ON_39',
    metricBadge: '39 GATE · 3 items',
    summary:
      'Confirm نوجارا vs نوچارا across the 5 portal PDFs and approve Tabuk 4K render rights release.',
    inspectDetail:
      '05_SEVEN_05 Validation Plan requires Owner 39 sign-off on standard Arabic Jīm (نوجارا) vs three-dot Chīm (نوچارا) before locking the Riyadh pitch deck.',
    recommendedAction: 'Open SEVEN Approvals & Lock Orthography',
    targetPanel: 'project-detail',
    targetProjectId: 'SEVEN',
  },
  {
    id: 'SIG-04',
    code: 'SIGNAL 04 · WAITING ON 39',
    title: 'Abu Hamdan × Floward Q4 Term Sheet Sign-Off',
    projectCode: 'MHE',
    severity: 'WAITING_ON_39',
    metricBadge: '39 GATE · Commercial',
    summary:
      'Regional talent licensing and Riyadh seasonal capsule deliverables ready for final signature.',
    inspectDetail:
      'All creative deliverables and shoot dates with Mohammed Alhamdan are aligned; legal redlines cleared by Katib (KT).',
    recommendedAction: 'Open MHE Project Workspace',
    targetPanel: 'project-detail',
    targetProjectId: 'MHE',
  },
  {
    id: 'SIG-05',
    code: 'SIGNAL 05 · TIMELINE WATCH',
    title: 'LaLiga MENA Interactive LED Floor Air-Freight Window',
    projectCode: 'LALIGA-MENA',
    severity: 'TIMELINE_WATCH',
    metricBadge: '48h WINDOW',
    summary:
      'LiDAR sensor modules require air-freight confirmation within 48 hours to meet 08 Nov Riyadh rigging.',
    inspectDetail:
      'Bilal (BL) prepared the expedited DHL air-waybill; switching from sea to air saves 9 calendar days.',
    recommendedAction: 'Open LaLiga MENA Timeline & Approve Expedite',
    targetPanel: 'project-detail',
    targetProjectId: 'LALIGA-MENA',
  },
  {
    id: 'SIG-06',
    code: 'SIGNAL 06 · WAITING ON 39',
    title: 'Museum of Almost Curatorial Plinth & Riyadh Tour Gate',
    projectCode: 'MUSEUM-OF-ALMOST',
    severity: 'WAITING_ON_39',
    metricBadge: '39 GATE · Curatorial',
    summary:
      '38 of 42 counterfactual artifacts digitized; Gallery 03 holographic plinth height awaits 39 review.',
    inspectDetail:
      'Rasma (RS) and Musa (MU) prepared 1:10 scale elevation drawings in FileViewerPanel (Page 2 / 14).',
    recommendedAction: 'Open File Viewer & Inspect Elevation Plate',
    targetPanel: 'file-viewer',
    targetProjectId: 'MUSEUM-OF-ALMOST',
  },
];

// Panel #6: Morning Briefing (06:00–10:30 Africa/Cairo)
export const MORNING_BRIEFING_DATA = {
  cairoWindowLabel: '06:00–10:30 Africa/Cairo · Executive Briefing',
  greetingEn: 'Good morning, sir. Here is your Cairo–Riyadh studio alignment.',
  greetingAr: 'صباح الخير يا فندم · ملخص استوديو القاهرة والرياض جاهز',
  todayPriorities: [
    {
      id: 'MB-T1',
      time: '09:30 CAI',
      title: 'SEVEN × NOJARA Tabuk Portal Final Walkthrough',
      project: 'SEVEN',
      owner: '39 · Khalid Al-Shaalan',
    },
    {
      id: 'MB-T2',
      time: '11:00 RUH',
      title: 'Abu Hamdan × Wahag Commercial Cut Review',
      project: 'MHE',
      owner: '39 · Mohammed Alhamdan',
    },
    {
      id: 'MB-T3',
      time: '14:00 CAI',
      title: 'B-Social Acoustic Array Unblock Decision',
      project: 'BSOCIAL',
      owner: '39 · Shweekar · Bilal',
    },
  ],
  meetings: [
    {
      id: 'MB-M1',
      slot: '10:00 – 10:45',
      title: 'SEVEN Executive Pitch Sync (Riyadh / Google Meet)',
      attendees: 'Tarek Nojara, Khalid Al-Shaalan, Shweekar',
      location: 'Google Meet · Riyadh Link',
    },
    {
      id: 'MB-M2',
      slot: '13:00 – 13:45',
      title: 'YAH Season 02 Sonic Lab & Residency Review',
      attendees: 'Tarek Nojara, KR, Waseem',
      location: 'Cairo Studio 01',
    },
    {
      id: 'MB-M3',
      slot: '16:30 – 17:15',
      title: 'CEREBRO + CDE v1.1 Architecture Sign-off',
      attendees: 'Tarek Nojara, Grandy, Rasma, Baghira',
      location: 'CEREBRO Spatial Room',
    },
  ],
  approvals: [
    {
      id: 'CHK-SEVEN-01',
      project: 'SEVEN',
      title: 'Approve Tabuk 4K Concept Render & Arabic Orthography (نوجارا)',
      requestedBy: 'Rasma (RS)',
    },
    {
      id: 'CHK-BSOCIAL-01',
      project: 'BSOCIAL',
      title: 'Authorize Directional Cardioid Acoustic Array Procurement',
      requestedBy: 'Bilal (BL)',
    },
    {
      id: 'CHK-MHE-01',
      project: 'MHE',
      title: 'Sign off Floward Q4 Seasonal Activation Term Sheet',
      requestedBy: 'Katib (KT)',
    },
  ],
};

// Panel #7: Gmail Default Snapshot Threads (me@nojara.com)
export interface GmailThreadItem {
  id: string;
  subject: string;
  from: string;
  to: string;
  timestamp: string;
  projectCode: string;
  unread: boolean;
  snippet: string;
  body: string;
}

export const INITIAL_GMAIL_THREADS: GmailThreadItem[] = [
  {
    id: 'GML-01',
    subject: 'SEVEN × NOJARA — Tabuk Destination Portal v0.4 & 30 Asset Pack',
    from: 'Khalid Al-Shaalan <khalid@nojara.com>',
    to: 'Tarek Nojara <me@nojara.com>',
    timestamp: 'Today · 08:42',
    projectCode: 'SEVEN',
    unread: true,
    snippet:
      'Tarek, the Riyadh executive team reviewed the 8-chapter Tabuk journey. Ready for your final sign-off on the Arabic lockup.',
    body: `Dear Tarek,\n\nThe Riyadh executive team completed the pre-review of the 8-chapter SEVEN × NOJARA portal ("A reason to return") and the 30 sculptural 3D design assets.\n\nKey items awaiting your confirmation today:\n1. Final Arabic orthography lock (نوجارا vs نوچارا) on the cover plate.\n2. Release clearance for 06_SEVEN_Tabuk_concept_render_desktop_3840x2160.jpg.\n\nWarm regards,\nKhalid Al-Shaalan`,
  },
  {
    id: 'GML-02',
    subject: 'MHE × Wahag / Floward — Q4 Production Schedule & Term Sheet',
    from: 'Shweekar <shweekar@nojara.com>',
    to: 'Tarek Nojara <me@nojara.com>',
    timestamp: 'Today · 07:55',
    projectCode: 'MHE',
    unread: true,
    snippet:
      'Abu Hamdan commercial cut v3 is in the Media station. Floward term sheet is ready for your Two-Tap approval.',
    body: `Hi Tarek,\n\nWe have uploaded the Wahag commercial rough cut to the Media station and locked the Cairo–Riyadh shoot calendar with Mohammed Alhamdan.\n\nPlease review the attached Floward seasonal capsule term sheet when you open the MHE workspace.\n\nBest,\nShweekar`,
  },
  {
    id: 'GML-03',
    subject: 'B-Social Acoustic Simulation & Cardioid Array Unblock Quote',
    from: 'Bilal (BL) <bilal@nojara.com>',
    to: 'Tarek Nojara <me@nojara.com>',
    timestamp: 'Yesterday · 19:20',
    projectCode: 'BSOCIAL',
    unread: false,
    snippet:
      'Acoustic report attached. Switching to cardioid arrays clears the municipal permit immediately.',
    body: `Ya Fandem,\n\nThe acoustic engineer completed the perimeter decibel test for B-Social. By substituting the directional cardioid sub-array, we drop exterior spill by 11 dB and clear the permit bottleneck immediately.\n\nReady to execute upon your confirmation.\n\n— Bilal`,
  },
  {
    id: 'GML-04',
    subject: 'YAH Season 02 — Cohort 03 Fellowship Roster & Sonic Lab Mix',
    from: 'KR <kr@nojara.com>',
    to: 'Tarek Nojara <me@nojara.com>',
    timestamp: '25 Oct · 16:10',
    projectCode: 'YAH',
    unread: false,
    snippet:
      'All 24 fellows across Cairo and Riyadh are confirmed. Showreel audio stem is ready in Panel #10.',
    body: `Tarek,\n\nCohort 03 for Young & Human (YAH) is locked with 14 fellows in Cairo and 10 in Riyadh. Waseem has uploaded the spatial audio mix for your review.\n\n— KR`,
  },
];

// Panel #8: Calendar Week Grid (Mon–Sun, 09:00–19:00)
export interface CalendarGridEvent {
  id: string;
  title: string;
  dayIndex: number; // 0 = Mon .. 6 = Sun
  dayLabel: string;
  startHour: number; // 9..18
  durationHours: number;
  projectCode: string;
  location: string;
  attendees: string;
  meetLink?: string;
}

export const INITIAL_CALENDAR_WEEK_EVENTS: CalendarGridEvent[] = [
  {
    id: 'CAL-01',
    title: 'SEVEN × NOJARA Tabuk Executive Sync',
    dayIndex: 0,
    dayLabel: 'Mon',
    startHour: 10,
    durationHours: 2,
    projectCode: 'SEVEN',
    location: 'Riyadh · Google Meet',
    attendees: '39, Khalid Al-Shaalan, Shweekar',
    meetLink: 'https://meet.google.com/new',
  },
  {
    id: 'CAL-02',
    title: 'YAH Season 02 Sonic Lab Walkthrough',
    dayIndex: 1,
    dayLabel: 'Tue',
    startHour: 11,
    durationHours: 2,
    projectCode: 'YAH',
    location: 'Cairo Studio 01',
    attendees: '39, KR, Waseem',
  },
  {
    id: 'CAL-03',
    title: 'Abu Hamdan × Wahag Director Cut Review',
    dayIndex: 2,
    dayLabel: 'Wed',
    startHour: 13,
    durationHours: 2,
    projectCode: 'MHE',
    location: 'Riyadh Screening Room',
    attendees: '39, Mohammed Alhamdan, Waseem',
  },
  {
    id: 'CAL-04',
    title: 'B-Social Acoustic Permit Unblock Session',
    dayIndex: 3,
    dayLabel: 'Thu',
    startHour: 14,
    durationHours: 1,
    projectCode: 'BSOCIAL',
    location: 'Cairo HQ',
    attendees: '39, Bilal, Shweekar',
  },
  {
    id: 'CAL-05',
    title: 'El Batron Coastal Amphitheater Material Lock',
    dayIndex: 4,
    dayLabel: 'Fri',
    startHour: 12,
    durationHours: 2,
    projectCode: 'EL-BATRON',
    location: 'Design Atelier',
    attendees: '39, Rasma, Musa',
  },
  {
    id: 'CAL-06',
    title: 'Museum of Almost Curatorial Plinth Review',
    dayIndex: 5,
    dayLabel: 'Sat',
    startHour: 15,
    durationHours: 2,
    projectCode: 'MUSEUM-OF-ALMOST',
    location: 'Cairo Gallery 03',
    attendees: '39, Katib, Rasma',
  },
  {
    id: 'CAL-07',
    title: 'CEREBRO + CDE Weekly Master Sprint Planning',
    dayIndex: 6,
    dayLabel: 'Sun',
    startHour: 10,
    durationHours: 2,
    projectCode: 'NJR-PLUS',
    location: 'CEREBRO Spatial OS',
    attendees: '39, Grandy, Baghira, Kinzo',
  },
];

// Panel #12: All 12 Crew & AI Members (39, GD, BL, RS, MU, KT, FK, NQ, WS, ZB, BG, KZ)
export interface CrewMember12 {
  code: '39' | 'GD' | 'BL' | 'RS' | 'MU' | 'KT' | 'FK' | 'NQ' | 'WS' | 'ZB' | 'BG' | 'KZ';
  id: string;
  name: string;
  nameAr: string;
  title: string;
  tier: 'Owner' | 'Core Crew' | 'Specialist' | 'Planner & Orchestrator';
  status: 'ONLINE' | 'STREAMING' | 'STANDBY';
  activeProject: string;
  currentTask: string;
  raciRole: 'A' | 'R' | 'C' | 'I';
  contractTermsProtected: string; // Revealed only after 3939 contract lock
  avatarUrl: string;
}

export const CREW_12_ROSTER: CrewMember12[] = [
  {
    code: '39',
    id: 'p-39',
    name: 'Tarek Nojara (39)',
    nameAr: 'طارق نوجارا',
    title: 'Founder and Culture and Design Engineer',
    tier: 'Owner',
    status: 'ONLINE',
    activeProject: 'ALL 17 PROJECTS',
    currentTask: 'Final executive sign-off on SEVEN, MHE, and B-Social gates',
    raciRole: 'A',
    contractTermsProtected: 'Founder & 100% Principal Authority · Sovereign Gate 3939',
    avatarUrl: '/baghira/character.svg',
  },
  {
    code: 'GD',
    id: 'p-grandy',
    name: 'Grandy (GD)',
    nameAr: 'جراندي',
    title: 'Executive Technical & Spatial Director',
    tier: 'Core Crew',
    status: 'STREAMING',
    activeProject: 'SEVEN · AL-AHRAM · RSP',
    currentTask: 'Dual-Sphere WebGL renderer & spatial architecture alignment',
    raciRole: 'R',
    contractTermsProtected: 'Executive Retainer Tier A · Cairo–Riyadh Principal Lead [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/madar.jpg',
  },
  {
    code: 'BL',
    id: 'p-bilal',
    name: 'Bilal (BL)',
    nameAr: 'بلال',
    title: 'Production & Field Operations Lead',
    tier: 'Core Crew',
    status: 'STREAMING',
    activeProject: 'BSOCIAL · LALIGA-MENA · DRAFTEERS',
    currentTask: 'B-Social directional acoustic array procurement & LaLiga freight',
    raciRole: 'R',
    contractTermsProtected: 'Senior Production Lead Contract · SAR 42,000/mo [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/banna.jpg',
  },
  {
    code: 'RS',
    id: 'p-rasma',
    name: 'Rasma (RS)',
    nameAr: 'رسمة',
    title: 'Spatial Wireframe & Visual Architecture Lead',
    tier: 'Core Crew',
    status: 'STREAMING',
    activeProject: 'SEVEN · EL-BATRON · CDW',
    currentTask: 'Wireframes v1.1 17-panel layout & Tabuk 4K visual inspection',
    raciRole: 'R',
    contractTermsProtected: 'Design Systems Lead Contract · EGP 165,000/mo [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/rasma.jpg',
  },
  {
    code: 'MU',
    id: 'p-musa',
    name: 'Musa (MU)',
    nameAr: 'موسى',
    title: 'Industrial, Material & Provenance Architect',
    tier: 'Core Crew',
    status: 'ONLINE',
    activeProject: 'EL-BATRON · SEVEN · RMA',
    currentTask: '30 sculptural 3D assets material spec & coastal limestone plates',
    raciRole: 'R',
    contractTermsProtected: 'Senior Material Architect · USD 6,800/mo [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/nasaq.jpg',
  },
  {
    code: 'KT',
    id: 'p-katib',
    name: 'Katib (KT)',
    nameAr: 'كاتب',
    title: 'Editorial, Bilingual Copy & Legal Register Lead',
    tier: 'Specialist',
    status: 'STREAMING',
    activeProject: 'SEVEN · YAH · MOA',
    currentTask: 'Bilingual AR/EN copy audit & YAH Cohort 03 fellowship contracts',
    raciRole: 'C',
    contractTermsProtected: 'Editorial & Legal Counsel Retainer · USD 5,400/mo [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/nabr.jpg',
  },
  {
    code: 'FK',
    id: 'p-fakir',
    name: 'Fakir (FK)',
    nameAr: 'فكير',
    title: 'Cultural Strategy & Research Lead',
    tier: 'Specialist',
    status: 'ONLINE',
    activeProject: 'SEVEN · GONDWANA · DIRIYAH-SOUQ',
    currentTask: 'Tabuk cultural narrative & Diriyah olfactory archive research',
    raciRole: 'C',
    contractTermsProtected: 'Strategy & Research Director · SAR 36,000/mo [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/madar.jpg',
  },
  {
    code: 'NQ',
    id: 'p-nasaq',
    name: 'Nasaq (NQ)',
    nameAr: 'نسق',
    title: 'Token Governance, Contrast & Accessibility Lead',
    tier: 'Specialist',
    status: 'ONLINE',
    activeProject: 'NJR-PLUS · RMA',
    currentTask: '15-token Neural Observatory v1.1 contrast & RTL typography lock',
    raciRole: 'R',
    contractTermsProtected: 'Design Systems & QA Specialist · USD 5,200/mo [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/nasaq.jpg',
  },
  {
    code: 'WS',
    id: 'p-waseem',
    name: 'Waseem (WS)',
    nameAr: 'وسيم',
    title: 'Sonic Architecture, Showreel & Atmos Director',
    tier: 'Specialist',
    status: 'ONLINE',
    activeProject: 'MISSION-LOTUS · MHE · SOUND-OF-NILE',
    currentTask: 'Mission Lotus Dolby Atmos stem & Wahag commercial audio mix',
    raciRole: 'R',
    contractTermsProtected: 'Audio & Showreel Director · USD 6,100/mo [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/nabr.jpg',
  },
  {
    code: 'ZB',
    id: 'p-zebda',
    name: 'Zebda (ZB)',
    nameAr: 'زبدة',
    title: 'Executive Briefing & Synthesis Engine',
    tier: 'Specialist',
    status: 'ONLINE',
    activeProject: 'ALL 17 PROJECTS',
    currentTask: 'Distilling 52 register records into 6 actionable executive signals',
    raciRole: 'I',
    contractTermsProtected: 'Internal Synthesis Agent · NJR+ Compute Allocation [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/banna.jpg',
  },
  {
    code: 'BG',
    id: 'p-baghira',
    name: 'Baghira (BG)',
    nameAr: 'باغيرا',
    title: 'Master Planner, Critical Path & Gantt Engine',
    tier: 'Planner & Orchestrator',
    status: 'ONLINE',
    activeProject: 'SEVEN · YAH · MHE · BSOCIAL',
    currentTask: 'Critical path Gantt tracking & milestone dependency verification',
    raciRole: 'R',
    contractTermsProtected: 'Autonomous Planning Core v1.1 · Sovereign Local Node [CONFIDENTIAL]',
    avatarUrl: '/baghira/character.svg',
  },
  {
    code: 'KZ',
    id: 'p-kinzo',
    name: 'Kinzo (KZ)',
    nameAr: 'كينزو',
    title: 'Crew-Bot Roster Controller & Dispatch Orchestrator',
    tier: 'Planner & Orchestrator',
    status: 'ONLINE',
    activeProject: 'NJR-PLUS · DRAFTEERS',
    currentTask: 'Orchestrating 2×2 Live SSE Crew Grid & PROPOSED bot allocations',
    raciRole: 'R',
    contractTermsProtected: 'Autonomous Crew Controller · PROPOSED Bot Pool [CONFIDENTIAL]',
    avatarUrl: '/checkpoints/rasma.jpg',
  },
];

// Panel #14: Baghira Plan + Timeline Gantt Bars
export interface BaghiraGanttBar {
  id: string;
  projectCode: string;
  phaseName: string;
  ownerCode: string;
  startWeek: number; // 1..8
  spanWeeks: number; // 1..6
  progressPct: number;
  status: 'On track' | 'Waiting on 39' | 'Blocked';
  deliverable: string;
}

export const BAGHIRA_GANTT_BARS: BaghiraGanttBar[] = [
  {
    id: 'GNT-01',
    projectCode: 'SEVEN',
    phaseName: 'Phase 01 · 8-Chapter Portal & 30 Sculptural 3D Assets',
    ownerCode: '39 · RS',
    startWeek: 1,
    spanWeeks: 3,
    progressPct: 92,
    status: 'Waiting on 39',
    deliverable: 'Tabuk 4K Renders & Arabic Orthography Lock',
  },
  {
    id: 'GNT-02',
    projectCode: 'YAH',
    phaseName: 'Phase 02 · Season 02 Cohort 03 & Sonic Lab Master',
    ownerCode: 'KR · WS',
    startWeek: 2,
    spanWeeks: 4,
    progressPct: 84,
    status: 'On track',
    deliverable: '24 Residency Contracts & Season 02 Showreel',
  },
  {
    id: 'GNT-03',
    projectCode: 'MHE',
    phaseName: 'Phase 02 · Wahag Commercial Cut & Floward Capsule',
    ownerCode: '39 · WS',
    startWeek: 2,
    spanWeeks: 3,
    progressPct: 78,
    status: 'Waiting on 39',
    deliverable: 'Wahag 60s Hero Cut & Floward Term Sheet',
  },
  {
    id: 'GNT-04',
    projectCode: 'BSOCIAL',
    phaseName: 'Phase 01 · Acoustic Array Unblock & Venue Permit',
    ownerCode: 'BL · 39',
    startWeek: 1,
    spanWeeks: 4,
    progressPct: 64,
    status: 'Blocked',
    deliverable: 'Cardioid Sub-Array Substitution & Permit Clearance',
  },
  {
    id: 'GNT-05',
    projectCode: 'AL-AHRAM',
    phaseName: 'Phase 03 · Giza Plateau Projection & Spatial Audio',
    ownerCode: 'GD · RS',
    startWeek: 3,
    spanWeeks: 4,
    progressPct: 75,
    status: 'On track',
    deliverable: '14 Projection Arrays & Horizon Soundscape',
  },
  {
    id: 'GNT-06',
    projectCode: 'EL-BATRON',
    phaseName: 'Phase 02 · Coastal Amphitheater & Wind Sculptures',
    ownerCode: 'RS · MU',
    startWeek: 4,
    spanWeeks: 4,
    progressPct: 70,
    status: 'On track',
    deliverable: '22 Architectural Plates & Limestone Mockup',
  },
];

// Panel #15: Kinzo PROPOSED Crew-Bot Roster
export interface KinzoBotUnit {
  id: string;
  code: string;
  name: string;
  specialization: string;
  assignedProject: string;
  supervisorCode: string;
  status: 'PROPOSED · Awaiting 39 Approval' | 'ACTIVE SANDBOX' | 'PAUSED';
  tokenQuota: string;
  lastDraftSummary: string;
}

export const KINZO_PROPOSED_BOTS: KinzoBotUnit[] = [
  {
    id: 'BOT-01',
    code: 'KZ-CAD-01',
    name: 'Mimar-Bot (BIM & Elevation Drafter)',
    specialization: 'Automated DXF/SVG elevation sheet checks & scale verification',
    assignedProject: 'EL-BATRON · MUSEUM-OF-ALMOST',
    supervisorCode: 'RS',
    status: 'PROPOSED · Awaiting 39 Approval',
    tokenQuota: '45k tok / day',
    lastDraftSummary: 'Verified 1:10 scale dimensions on Museum of Almost Gallery 03 plinths.',
  },
  {
    id: 'BOT-02',
    code: 'KZ-PMO-02',
    name: 'Raqib-Bot (Register & RACI Auditor)',
    specialization: 'Cross-checks 52 NOJARA_HQ_26 register rows against Drive folders',
    assignedProject: 'SEVEN · YAH · MHE · BSOCIAL',
    supervisorCode: 'BG',
    status: 'ACTIVE SANDBOX',
    tokenQuota: '60k tok / day',
    lastDraftSummary: 'Flagged 2 missing RACI sign-off timestamps on B-Social acoustic package.',
  },
  {
    id: 'BOT-03',
    code: 'KZ-LOC-03',
    name: 'Lisan-Bot (Masri & Fusha Copy Harmonizer)',
    specialization: 'Bilingual Arabic/English terminology & orthography consistency',
    assignedProject: 'SEVEN · CAIRO-DESIGN-WEEK',
    supervisorCode: 'KT',
    status: 'PROPOSED · Awaiting 39 Approval',
    tokenQuota: '30k tok / day',
    lastDraftSummary: 'Prepared side-by-side نوجارا vs نوچارا specimen sheet for Owner 39.',
  },
  {
    id: 'BOT-04',
    code: 'KZ-AUD-04',
    name: 'Sada-Bot (Showreel Stem & Timecode Indexer)',
    specialization: 'Extracts frame-accurate cue markers for Dolby Atmos & Showreel cuts',
    assignedProject: 'MISSION-LOTUS · SOUND-OF-NILE',
    supervisorCode: 'WS',
    status: 'PROPOSED · Awaiting 39 Approval',
    tokenQuota: '25k tok / day',
    lastDraftSummary: 'Indexed 14 kinetic aperture cues on Mission Lotus 01:42 master cut.',
  },
];

// Panel #11: FileViewerPanel 14-page document deck
export interface FileViewerDocument {
  id: string;
  title: string;
  projectCode: string;
  type: 'PDF' | 'DOC' | 'IMAGE' | 'SHEET';
  totalPages: number;
  updatedAt: string;
  pages: {
    pageNumber: number;
    heading: string;
    subheading: string;
    body: string;
    callouts: string[];
    sheetRows?: string[][];
  }[];
}

export const FILE_VIEWER_DOCUMENTS: FileViewerDocument[] = [
  {
    id: 'DOC-SEVEN-BLUEPRINT',
    title: '02_CEREBRO_BLUEPRINT_RASMA_v0.2_DRAFT.pdf',
    projectCode: 'SEVEN',
    type: 'PDF',
    totalPages: 14,
    updatedAt: '23 Oct 2026 · Verified Source',
    pages: Array.from({ length: 14 }, (_, idx) => {
      const pageNum = idx + 1;
      if (pageNum === 1) {
        return {
          pageNumber: 1,
          heading: 'Page 01 / 14 — CEREBRO + CDE Master Architecture & Dual-Sphere Spec',
          subheading: 'Sphere 01: CEREBRO HQ [0,0,0] · Sphere 02: CDE Universe [38,4,-22]',
          body: 'Defines the dual-sphere spatial operating system for NOJARA Studios. Sphere 01 renders Refractive Cobalt Liquid Glass (#4C8DFF, rim #B4DDFF, radius 6.2u). Sphere 02 renders Warm Amber Caustic Crystal (#F2B66D, rim #FFF1D4, radius 6.2u). Connected by CatmullRomCurve3 cardiac splines with traveling light pulses.',
          callouts: [
            'Canvas Ground: #101D27 · Liquid Glass: #142632 (88%)',
            'Voice Orb Mint: #9AFFE0 (strictly reserved for Voice Orb)',
            'Blocked / System Error Red: #FF5666 · Zero Purple/Gold',
          ],
        };
      }
      if (pageNum === 2) {
        return {
          pageNumber: 2,
          heading: 'Page 02 / 14 — Responsive Floating Pockets & Panel Avoidance Ring',
          subheading: 'Desktop 1440×900 (4 Quadrants) · iPad 1180×820 (2 Flanking) · Phone 390×844 (Bottom Sheet)',
          body: 'The central sphere panelAvoidance ring remains 100% clear at all times. Desktop renders up to 4 floating quadrant pockets around the sphere perimeter; iPad docks 2 side-by-side flanking panels with bottom-right VoiceWidget; Phone snaps a 50%/92% bottom sheet with top minimised station chips.',
          callouts: [
            '17 Canonical Panels (#1 VoiceWidget through #17 Gate + Loader)',
            'iPad 1-finger touch drag to orbit · 2-finger pinch-to-zoom (9.2u to 42u)',
            'Two-Tap Confirmation (4000ms confirm / 5000ms undo) on all external writes',
          ],
        };
      }
      return {
        pageNumber: pageNum,
        heading: `Page ${String(pageNum).padStart(2, '0')} / 14 — SEVEN × NOJARA Technical Plate & Register Evidence`,
        subheading: `Section ${pageNum}.0 · Grounded in 05_SEVEN_0${Math.min(5, pageNum - 1)} & 07_NOJARA_Project_Register`,
        body: `Verified architectural specification and PMO register record plate ${pageNum} of 14. Covers spatial choreography, Tabuk destination concept renders (3840×2160 & 1080×1920), 30 sculptural 3D assets, and RACI accountability matrix for Owner 39.`,
        callouts: [
          `Plate Reference: SEVEN-PLT-${String(pageNum).padStart(2, '0')}`,
          'Status: Verified against 23 Oct 2026 Snapshot (52 records)',
          'Pinch or use Zoom −/+ controls to inspect fine typography',
        ],
      };
    }),
  },
  {
    id: 'SHEET-NOJARA-REGISTER',
    title: '07_NOJARA_Project_Register_SNAPSHOT_2026-10-23.xlsx',
    projectCode: 'SEVEN',
    type: 'SHEET',
    totalPages: 14,
    updatedAt: '23 Oct 2026 · 52 PMO Records',
    pages: Array.from({ length: 14 }, (_, idx) => ({
      pageNumber: idx + 1,
      heading: `Sheet Tab ${idx + 1} / 14 — NOJARA_HQ_26 Master PMO Register`,
      subheading: 'Live Google Sheets Sync Ready · 52 Verified Records',
      body: 'Structured PMO register tracking SEVEN, YAH, MHE, BSOCIAL, and 13 additional NOJARA portfolio programmes.',
      callouts: ['Accountable: 39 (Tarek Nojara)', 'Sync Mode: Google Sheets API v4 + Local Store'],
      sheetRows: [
        ['Record ID', 'Project', 'Deliverable / Milestone', 'Owner', 'Status'],
        ['REG-01', 'SEVEN', 'Tabuk 8-Chapter Executive Portal', '39 · RS', 'Waiting on 39'],
        ['REG-02', 'SEVEN', '30 Sculptural 3D Assets Manifest', 'MU · GD', 'Active'],
        ['REG-03', 'YAH', 'Season 02 Cohort 03 Residency', 'KR · KT', 'Active'],
        ['REG-04', 'MHE', 'Wahag × Abu Hamdan 60s Hero Cut', '39 · WS', 'Waiting on 39'],
        ['REG-05', 'BSOCIAL', 'Cardioid Acoustic Array Unblock', 'BL · 39', 'Blocked'],
      ],
    })),
  },
];

// 18 Canonical Screens (S01–S18) & 12 ?view=... URL State Inspectors
export interface ScreenSpecItem {
  screenId: string; // S01..S18
  viewParam: string; // ?view=...
  title: string;
  panelNumber: string;
  description: string;
}

export const CEREBRO_18_SCREENS: ScreenSpecItem[] = [
  {
    screenId: 'S01',
    viewParam: 'keypad',
    title: 'S01 · 3939 Owner Gate Keypad',
    panelNumber: 'Panel #17a',
    description: 'Sovereign 3939 PIN keypad gate with tactile glass keys.',
  },
  {
    screenId: 'S02',
    viewParam: 'loader',
    title: 'S02 · 8.0s Square-Kufic Bismillah Boot Loader',
    panelNumber: 'Panel #17b',
    description: 'Locked Square-Kufic Bismillah SVG, 4 sequential telemetry lines, and instant Take off.',
  },
  {
    screenId: 'S03',
    viewParam: 'hq',
    title: 'S03 · Sphere 01: CEREBRO HQ [0,0,0]',
    panelNumber: 'Panel #1',
    description: 'Refractive Cobalt Liquid Glass (#4C8DFF, rim #B4DDFF, radius 6.2u) + 6 Project Suns.',
  },
  {
    screenId: 'S04',
    viewParam: 'cde',
    title: 'S04 · Sphere 02: CDE Universe [38,4,-22]',
    panelNumber: 'Panel #1',
    description: 'Warm Amber Caustic Crystal (#F2B66D, rim #FFF1D4, radius 6.2u) + 4 Dimensions.',
  },
  {
    screenId: 'S05',
    viewParam: 'pockets',
    title: 'S05 · 4-Quadrant Responsive Floating Pockets',
    panelNumber: 'Panels #1–#5',
    description: '4 quadrant pockets on Desktop, 2 flanking on iPad, bottom sheet on Phone; clear center ring.',
  },
  {
    screenId: 'S06',
    viewParam: 'portfolio',
    title: 'S06 · Portfolio (All 17 Uncapped Projects)',
    panelNumber: 'Panel #2',
    description: 'All 17 projects from cerebroData.ts with All, Active, Waiting on 39, Blocked filter chips.',
  },
  {
    screenId: 'S07',
    viewParam: 'project-detail',
    title: 'S07 · ProjectDetailPanel (9 Tabs + 3 KPIs)',
    panelNumber: 'Panel #3',
    description: 'Overview, Tasks, People, Files, Media, Budget, Timeline, Approvals, Decisions.',
  },
  {
    screenId: 'S08',
    viewParam: 'tasks',
    title: 'S08 · TaskBoard (4 Columns + Detail Sheet)',
    panelNumber: 'Panel #4',
    description: 'To do, Doing, Waiting, Done columns on iPad/Desktop + interactive Task Detail Sheet.',
  },
  {
    screenId: 'S09',
    viewParam: 'insights',
    title: 'S09 · Insights (What needs you · 6 signals)',
    panelNumber: 'Panel #5',
    description: '6 executive signals with #FF5666 Blocked error red + slide-out Inspect drawers.',
  },
  {
    screenId: 'S10',
    viewParam: 'briefing',
    title: 'S10 · Morning Briefing (06:00–10:30 Cairo)',
    panelNumber: 'Panel #6',
    description: 'Auto-opens 06:00–10:30 Africa/Cairo with Today, Meetings, and Approvals.',
  },
  {
    screenId: 'S11',
    viewParam: 'gmail',
    title: 'S11 · Gmail (me@nojara.com + Two-Tap Confirm)',
    panelNumber: 'Panel #7',
    description: 'Split thread/composer with twoTapConfirm (4000ms confirm / 5000ms undo) + live Gmail API.',
  },
  {
    screenId: 'S12',
    viewParam: 'calendar',
    title: 'S12 · Calendar (7-Day Week Grid + Meet)',
    panelNumber: 'Panel #8',
    description: 'Mon–Sun 09:00–19:00 Week grid on iPad/Desktop, Today list on Phone + Two-Tap Create.',
  },
  {
    screenId: 'S13',
    viewParam: 'files',
    title: 'S13 · Drive Files & FileViewer (Page 2 / 14)',
    panelNumber: 'Panels #9 & #11',
    description: 'LIVE badge after loadDrive(), breadcrumb search, and 14-page FileViewer with Zoom −/+.',
  },
  {
    screenId: 'S14',
    viewParam: 'media',
    title: 'S14 · Media Player & 3D Showreel Carousel',
    panelNumber: 'Panel #10',
    description: 'Locked Amber #F2B66D showreel carousel + elevated fullscreen chrome (z-210).',
  },
  {
    screenId: 'S15',
    viewParam: 'people',
    title: 'S15 · People & RACI (12 Crew + 3939 Lock)',
    panelNumber: 'Panel #12',
    description: 'All 12 Crew & AI members (39, GD, BL, RS, MU, KT, FK, NQ, WS, ZB, BG, KZ) + 3939 contract lock.',
  },
  {
    screenId: 'S16',
    viewParam: 'crew',
    title: 'S16 · Crew 2×2 Live SSE Streaming Grid',
    panelNumber: 'Panel #13',
    description: 'Live 2×2 streaming agent output marked "Draft only · needs your approval".',
  },
  {
    screenId: 'S17',
    viewParam: 'baghira',
    title: 'S17 · Baghira Gantt & Kinzo Bot Roster',
    panelNumber: 'Panels #14 & #15',
    description: 'Baghira Plan + Timeline Gantt bars and Kinzo PROPOSED crew-bot controller.',
  },
  {
    screenId: 'S18',
    viewParam: 'hands',
    title: 'S18 · Settings & 21-Landmark Hand Rig',
    panelNumber: 'Panel #16',
    description: 'General · Camera · Hands settings + OneEuroFilter 0.22/0.30 pinch hysteresis + C4–A4 synth.',
  },
];
