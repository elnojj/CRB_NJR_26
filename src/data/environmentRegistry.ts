/**
 * Canonical registry of environments, stations, nodes and people.
 *
 * Three.js groups are spatial containers only. Data isolation lives here: every lookup is scoped by
 * environment id and never falls back to another environment. A node is addressed by the
 * association id `${envKey}__${stationId}__${nodeId}` (for example `hq__proj__bat`).
 *
 * Statuses are honest: `verified` means the fact comes from the approved source material,
 * `proposed` is a design intent, `gap` is missing evidence, `disconnected` is a live feed that has
 * not been verified.
 */

import type { ConnectedSphereId } from '../three/sphereNetwork';

export type EnvironmentId = 'env_about' | 'env_hq' | 'env_cde' | 'env_campaign_os';

export type EnvKey = 'about' | 'hq' | 'cde' | 'cos';

export type NodeStatus = 'verified' | 'proposed' | 'gap' | 'disconnected' | 'unverified';

export type NodeKind = 'person' | 'project' | 'agent' | 'story' | 'studio' | 'media-shell' | 'pillar' | 'stage' | 'register' | 'files';

export type AccessTier = 'public' | 'team' | 'owner';

/**
 * Where a node sits in its own environment, in that environment's local space (the sphere centre is the
 * origin). `approachYawDeg` is the direction the viewer looks from, measured from +Z toward +X, so a
 * node with yaw 0 is seen from the +Z side. `standoffOverride` replaces the lens-derived camera distance.
 */
export type NodeAnchor = {
  position: readonly [number, number, number];
  approachYawDeg: number;
  standoffOverride?: number;
};

export type EnvironmentDef = {
  id: EnvironmentId;
  key: EnvKey;
  sphereId: ConnectedSphereId;
  titleEn: string;
  titleAr: string;
  stations: readonly string[];
};

export const ENVIRONMENTS: Readonly<Record<EnvironmentId, EnvironmentDef>> = {
  env_about: { id: 'env_about', key: 'about', sphereId: 'about-us', titleEn: 'About Us', titleAr: 'من نحن', stations: ['people', 'tarek', 'studio', 'premise', 'identity'] },
  env_hq: { id: 'env_hq', key: 'hq', sphereId: 'hq', titleEn: 'HQ', titleAr: 'المقر', stations: ['proj', 'nasa', 'people', 'files', 'media', 'tasks', 'projects', 'interaction'] },
  env_cde: { id: 'env_cde', key: 'cde', sphereId: 'cde', titleEn: 'Creative Design Engineering', titleAr: 'هندسة التصميم الإبداعي', stations: ['strategy', 'production', 'talent', 'mediatech', 'domains'] },
  env_campaign_os: { id: 'env_campaign_os', key: 'cos', sphereId: 'campaign-os', titleEn: 'Campaign OS', titleAr: 'نظام الحملات', stations: ['pipeline'] },
};

export const ENVIRONMENT_IDS = Object.keys(ENVIRONMENTS) as EnvironmentId[];

export function environmentForSphere(sphereId: ConnectedSphereId): EnvironmentDef {
  switch (sphereId) {
    case 'about-us':
      return ENVIRONMENTS.env_about;
    case 'hq':
      return ENVIRONMENTS.env_hq;
    case 'cde':
      return ENVIRONMENTS.env_cde;
    case 'campaign-os':
      return ENVIRONMENTS.env_campaign_os;
    default: {
      const unreachable: never = sphereId;
      throw new Error(`Unknown sphere ${String(unreachable)}`);
    }
  }
}

export type PersonRecord = {
  personId: string;
  displayName: string;
  displayNameAr: string;
  /** Only wording the brief supplies. Absent fields are left empty rather than guessed. */
  roleEn: string | null;
  portraitAssetId: string | null;
  portraitGap: boolean;
  status: NodeStatus;
};

/** People are stored once; environment nodes reference them by `personId`. */
export const PEOPLE: Readonly<Record<'shweekar' | 'khalid' | 'tarek', PersonRecord>> = {
  shweekar: { personId: 'shweekar', displayName: 'Shweekar Ahmed', displayNameAr: 'شويكار أحمد', roleEn: 'PMO collaborator', portraitAssetId: 'img-person-shweekar', portraitGap: false, status: 'verified' },
  khalid: { personId: 'khalid', displayName: 'Khalid Alshaalan', displayNameAr: 'خالد الشعلان', roleEn: null, portraitAssetId: 'img-person-khalid', portraitGap: false, status: 'verified' },
  tarek: { personId: 'tarek', displayName: 'Tarek Nojara', displayNameAr: 'طارق نُچارة', roleEn: 'Founder / Creative Producer / Strategist and Culture and Design Engineer', portraitAssetId: null, portraitGap: false, status: 'verified' },
};

export type NodeDef = {
  associationId: string;
  envId: EnvironmentId;
  stationId: string;
  nodeId: string;
  kind: NodeKind;
  titleEn: string;
  titleAr?: string;
  summaryEn?: string;
  personId?: keyof typeof PEOPLE;
  /** Legacy ids from `sourceData` so old routes and deep links keep resolving. */
  legacyIds?: readonly string[];
  access: AccessTier;
  status: NodeStatus;
  /** Shown instead of media or live data when status is gap / disconnected / unverified. */
  honestStateEn?: string;
  /** Stage position for the 25-beat pitch. Absent on nodes no beat points at. */
  anchor?: NodeAnchor;
};

type NodeSeed = Omit<NodeDef, 'associationId' | 'envId' | 'access' | 'status'> & {
  access?: AccessTier;
  status?: NodeStatus;
};

const make = (envId: EnvironmentId, seeds: readonly NodeSeed[]): NodeDef[] =>
  seeds.map((s) => ({
    ...s,
    envId,
    associationId: `${ENVIRONMENTS[envId].key}__${s.stationId}__${s.nodeId}`,
    access: s.access ?? 'team',
    status: s.status ?? 'verified',
  }));

const ABOUT_NODES = make('env_about', [
  { stationId: 'people', nodeId: 'shweekar', kind: 'person', titleEn: 'Shweekar Ahmed', titleAr: 'شويكار أحمد', personId: 'shweekar', access: 'public' },
  { stationId: 'people', nodeId: 'khalid', kind: 'person', titleEn: 'Khalid Alshaalan', titleAr: 'خالد الشعلان', personId: 'khalid', access: 'public', honestStateEn: 'Portrait reference supplied. The image is not validated for runtime display yet; no role is stated.' },
  { stationId: 'people', nodeId: 'tarek', kind: 'person', titleEn: 'Tarek Nojara', titleAr: 'طارق نُچارة', personId: 'tarek', access: 'public' },
  { stationId: 'tarek', nodeId: 'story', kind: 'story', titleEn: 'Tarek Nojara — the story so far', summaryEn: 'Hard projects, useful lessons: talks, lists and festival appearances.', personId: 'tarek', access: 'public' },
  { stationId: 'studio', nodeId: 'profile', kind: 'studio', titleEn: 'NOJARA Studios', summaryEn: 'Verified NOJARA studio profile, est. 2016. Cairo and Riyadh.', access: 'public' },
  { stationId: 'studio', nodeId: 'showreel', kind: 'media-shell', titleEn: 'NOJARA Showreel', summaryEn: 'Portfolio overview, not a single client campaign.', access: 'public' },
]);

const HQ_PROJECT_SEEDS: readonly NodeSeed[] = [
  { stationId: 'proj', nodeId: 'seven', kind: 'project', titleEn: 'SEVEN', legacyIds: ['SEVEN'] },
  { stationId: 'proj', nodeId: 'yah', kind: 'project', titleEn: 'YAH! / Young & Human', legacyIds: ['YAH'], honestStateEn: 'No verified project media yet.' },
  { stationId: 'proj', nodeId: 'moa', kind: 'project', titleEn: 'Mission Lotus / MOA', legacyIds: ['MUSEUM-OF-ALMOST'], honestStateEn: 'No verified project media yet. Pairing of Mission Lotus with Museum of Almost follows the brief and needs confirmation.' },
  { stationId: 'proj', nodeId: 'bat', kind: 'project', titleEn: 'El Batron', legacyIds: ['EL-BATRON'] },
  { stationId: 'proj', nodeId: 'bsocial', kind: 'project', titleEn: 'BSOCIAL', legacyIds: ['BSOCIAL'], honestStateEn: 'No verified project media yet.' },
  { stationId: 'proj', nodeId: 'mhe', kind: 'project', titleEn: 'MHE', legacyIds: ['MHE'], honestStateEn: 'No verified project media yet.' },
  { stationId: 'proj', nodeId: 'ahr', kind: 'project', titleEn: 'AHR', legacyIds: ['AL-AHRAM'], honestStateEn: 'No verified project media yet.' },
  { stationId: 'proj', nodeId: 'os39', kind: 'project', titleEn: '39 OS', summaryEn: "Cerebro's promotional campaign. A separate project record; not Campaign OS.", status: 'proposed' },
];

type AgentCard = {
  nodeId: string;
  name: string;
  documentedProfileEn: string | null;
  proposedRoleEn: string | null;
  proposed: boolean;
};

const NASA_AGENTS: readonly AgentCard[] = [
  { nodeId: 'fakir', name: 'Fakir', documentedProfileEn: 'Creative direction, routes and review verdicts.', proposedRoleEn: null, proposed: false },
  { nodeId: 'grandy', name: 'Grandy', documentedProfileEn: 'Operations, task register, dependencies and delivery queue.', proposedRoleEn: null, proposed: false },
  { nodeId: 'bilal', name: 'Bilal', documentedProfileEn: 'Research, evidence assembly and fact clearance.', proposedRoleEn: null, proposed: false },
  { nodeId: 'katib', name: 'Katib', documentedProfileEn: 'Narrative framing, copywriting, Arabic transcreation and proofreading.', proposedRoleEn: null, proposed: false },
  { nodeId: 'musa', name: 'Musa', documentedProfileEn: 'Image production and visual references.', proposedRoleEn: null, proposed: false },
  { nodeId: 'rasma', name: 'Rasma', documentedProfileEn: 'Art direction, visual assembly, spatial layouts and visual QA.', proposedRoleEn: null, proposed: false },
  { nodeId: 'sardy', name: 'Sardy', documentedProfileEn: 'Publicist representation using cleared public facts.', proposedRoleEn: null, proposed: false },
  { nodeId: 'samna', name: 'Samna El Batron', documentedProfileEn: 'Music intelligence and A&R.', proposedRoleEn: null, proposed: false },
  { nodeId: 'nasaq', name: 'NASAQ', documentedProfileEn: null, proposedRoleEn: 'Brand system.', proposed: true },
  { nodeId: 'nabr', name: 'NABR', documentedProfileEn: null, proposedRoleEn: 'ElevenLabs voice configuration.', proposed: true },
  { nodeId: 'madar', name: 'MADAR', documentedProfileEn: null, proposedRoleEn: 'Cinematic motion and motion QA.', proposed: true },
];

/** A runtime binding is real only when it is permissioned, scoped and passed a recorded live test. */
export type AgentBinding = { verified: boolean; scopes: readonly EnvironmentId[]; lastPassedTestIso: string | null };

export type AgentRecord = {
  associationId: string;
  name: string;
  documentedProfileEn: string | null;
  proposedRoleEn: string | null;
  label: 'DOCUMENTED' | 'PROPOSED';
  runtimeConnection: 'none' | 'bound';
  taskState: 'unassigned';
  binding: AgentBinding;
};

export const NASA_ROSTER: readonly AgentRecord[] = NASA_AGENTS.map((a) => ({
  associationId: `hq__nasa__${a.nodeId}`,
  name: a.name,
  documentedProfileEn: a.documentedProfileEn,
  proposedRoleEn: a.proposedRoleEn,
  label: a.proposed ? 'PROPOSED' : 'DOCUMENTED',
  runtimeConnection: 'none',
  taskState: 'unassigned',
  binding: { verified: false, scopes: [], lastPassedTestIso: null },
}));

export type AgentActions = { talk: boolean; assign: boolean; run: boolean };

export function agentActionsFor(agent: AgentRecord, envId: EnvironmentId): AgentActions {
  const ok = agent.binding.verified && agent.binding.lastPassedTestIso !== null && agent.binding.scopes.includes(envId);
  return { talk: ok, assign: ok, run: ok };
}

export type AgentActionId = keyof AgentActions;

export const AGENT_ACTION_IDS: readonly AgentActionId[] = ['talk', 'assign', 'run'];

export const AGENT_ACTION_DISABLED_REASON_EN =
  'Needs a permissioned binding that has passed a live test in this environment.';

/** The four contract states a card must show, already phrased for display. Nothing here implies a live connection. */
export type AgentCardView = {
  associationId: string;
  nodeId: string;
  name: string;
  label: AgentRecord['label'];
  documentedProfile: { present: boolean; textEn: string };
  proposedRole: { present: boolean; textEn: string };
  runtimeConnection: { state: 'disconnected' | 'bound'; textEn: string };
  taskState: { state: AgentRecord['taskState']; textEn: string };
  actions: AgentActions;
  actionsDisabledReasonEn: string | null;
};

export function agentCardView(agent: AgentRecord, envId: EnvironmentId): AgentCardView {
  const actions = agentActionsFor(agent, envId);
  const anyEnabled = actions.talk || actions.assign || actions.run;
  const bound = agent.runtimeConnection === 'bound' && agent.binding.verified;
  return {
    associationId: agent.associationId,
    nodeId: agent.associationId.split('__')[2],
    name: agent.name,
    label: agent.label,
    documentedProfile: {
      present: agent.documentedProfileEn !== null,
      textEn: agent.documentedProfileEn ?? 'Not documented in the source material.',
    },
    proposedRole: {
      present: agent.proposedRoleEn !== null,
      textEn: agent.proposedRoleEn ?? 'None proposed. The documented profile is the only role on record.',
    },
    runtimeConnection: bound
      ? { state: 'bound', textEn: 'Bound and tested.' }
      : { state: 'disconnected', textEn: 'Disconnected. No verified runtime binding.' },
    taskState:
      agent.taskState === 'unassigned'
        ? { state: 'unassigned', textEn: 'Idle · unassigned. No task register is connected.' }
        : { state: agent.taskState, textEn: 'Unknown.' },
    actions,
    actionsDisabledReasonEn: anyEnabled ? null : AGENT_ACTION_DISABLED_REASON_EN,
  };
}

const HQ_NODES = make('env_hq', [
  ...HQ_PROJECT_SEEDS,
  ...NASA_AGENTS.map(
    (a): NodeSeed => ({
      stationId: 'nasa',
      nodeId: a.nodeId,
      kind: 'agent',
      titleEn: a.name,
      summaryEn: a.documentedProfileEn ?? a.proposedRoleEn ?? undefined,
      status: a.proposed ? 'proposed' : 'verified',
    })
  ),
  { stationId: 'people', nodeId: 'shweekar', kind: 'person', titleEn: 'Shweekar Ahmed', personId: 'shweekar' },
  { stationId: 'people', nodeId: 'khalid', kind: 'person', titleEn: 'Khalid Alshaalan', personId: 'khalid', honestStateEn: 'Portrait reference supplied. The image is not validated for runtime display yet; no role is stated.' },
  { stationId: 'people', nodeId: 'tarek', kind: 'person', titleEn: 'Tarek Nojara', personId: 'tarek' },
  { stationId: 'files', nodeId: 'authorized', kind: 'files', titleEn: 'Authorized files', status: 'unverified', access: 'owner', honestStateEn: 'Access tiers are not verified, so no file list is shown.' },
  { stationId: 'media', nodeId: 'nojara', kind: 'media-shell', titleEn: 'NOJARA media', access: 'team' },
  { stationId: 'media', nodeId: 'laliga', kind: 'media-shell', titleEn: 'NOJARA × LaLiga', access: 'team' },
  { stationId: 'tasks', nodeId: 'register', kind: 'register', titleEn: 'Tasks & Decisions', status: 'disconnected', honestStateEn: 'The project register connection is not verified. No live tasks are shown.' },
]);

const CDE_NODES = make('env_cde', [
  { stationId: 'strategy', nodeId: 'culture', kind: 'pillar', titleEn: 'Culture becomes design input', legacyIds: ['strategy'] },
  { stationId: 'strategy', nodeId: 'research', kind: 'pillar', titleEn: 'Research before the render', legacyIds: ['strategy'], status: 'gap', honestStateEn: 'No research artefact is attached yet.' },
  { stationId: 'production', nodeId: 'tech', kind: 'pillar', titleEn: 'Production and technology', legacyIds: ['production'] },
  { stationId: 'production', nodeId: 'saudi', kind: 'pillar', titleEn: 'Saudi production work', legacyIds: ['production'] },
  { stationId: 'talent', nodeId: 'culture', kind: 'pillar', titleEn: 'Talent & Culture', legacyIds: ['talent'], status: 'gap', honestStateEn: 'No reviewed footage is attached yet.' },
  { stationId: 'mediatech', nodeId: 'njrplus', kind: 'pillar', titleEn: 'Media Technology / NJR+', legacyIds: ['mediatech'] },
]);

const CAMPAIGN_STAGES = ['strategist', 'brain', 'director', 'producer', 'review'] as const;

const COS_NODES = make(
  'env_campaign_os',
  CAMPAIGN_STAGES.map(
    (stage): NodeSeed => ({
      stationId: 'pipeline',
      nodeId: stage,
      kind: 'stage',
      titleEn: stage.charAt(0).toUpperCase() + stage.slice(1),
      status: 'unverified',
      honestStateEn: 'Source implementation not verified. Shown as a proposed pipeline stage, not as executable.',
    })
  )
);


const PITCH_ABOUT_NODES = make('env_about', [
  { stationId: 'premise', nodeId: 'hello_friend', kind: 'story', titleEn: 'Built from the Work', summaryEn: 'Opening premise: production practice is where the workspace starts.', access: 'public' },
  { stationId: 'identity', nodeId: 'nojara', kind: 'studio', titleEn: 'NOJARA identity', summaryEn: 'The studio identity node. No revenue or client credit is stated.', access: 'public' },
]);

const PITCH_CDE_NODES = make('env_cde', [
  { stationId: 'domains', nodeId: 'production', kind: 'pillar', titleEn: 'Production domain', summaryEn: 'One of the four proposed CDE domains.' },
  { stationId: 'domains', nodeId: 'strategy', kind: 'pillar', titleEn: 'Strategy domain', summaryEn: 'One of the four proposed CDE domains.' },
  { stationId: 'domains', nodeId: 'talent', kind: 'pillar', titleEn: 'Talent domain', summaryEn: 'One of the four proposed CDE domains.' },
  { stationId: 'domains', nodeId: 'strategy_ip', kind: 'pillar', titleEn: 'Strategy and creative IP', summaryEn: 'Commercial hypothesis: Prove, Package, Scale. Not proven recurring revenue or registered IP.', status: 'proposed', honestStateEn: 'Hypothesis to prove. No revenue or registered IP is claimed.' },
]);

const PROPOSED_NOT_LIVE = 'Concept or prototype. Not a live system and not measured results.';

const PITCH_HQ_NODES = make('env_hq', [
  { stationId: 'tasks', nodeId: 'context', kind: 'register', titleEn: 'Context: brief, people, files, decisions, next action', summaryEn: 'Five context fields around one piece of work.', status: 'proposed', honestStateEn: PROPOSED_NOT_LIVE },
  { stationId: 'tasks', nodeId: 'evidence', kind: 'register', titleEn: 'Evidence', summaryEn: 'An update needs evidence; a decision needs an owner.', status: 'disconnected', honestStateEn: 'No tested register binding. Shown as Disconnected until one passes.' },
  { stationId: 'tasks', nodeId: 'next_action', kind: 'register', titleEn: 'Next action', summaryEn: 'The calm next-action node at the end of the tour.', status: 'proposed', honestStateEn: PROPOSED_NOT_LIVE },
  { stationId: 'projects', nodeId: 'yah_participation', kind: 'project', titleEn: 'YAH! participation loop', summaryEn: 'Invitation, contribution, response. A proposed model.', status: 'proposed', honestStateEn: PROPOSED_NOT_LIVE },
  { stationId: 'projects', nodeId: 'batron_talent_os', kind: 'project', titleEn: 'El Batron · Talent OS', summaryEn: 'Four operational needs behind the project.', status: 'proposed', honestStateEn: 'No Talent OS implementation is verified.' },
  { stationId: 'projects', nodeId: 'index', kind: 'project', titleEn: 'Project index', summaryEn: 'Canonical project nodes. 39 OS stays separate from Campaign OS.', honestStateEn: 'Empty nodes stay honest: no invented media or metrics.' },
  { stationId: 'media', nodeId: 'tube', kind: 'media-shell', titleEn: 'Media tube', summaryEn: 'The curved 3D media gallery. One tile per attributed source.', status: 'unverified', honestStateEn: 'Playback is unverified until decode, seek, loop and access are tested.' },
  { stationId: 'media', nodeId: 'selected', kind: 'media-shell', titleEn: 'Selected media tile', summaryEn: 'The tile opened from the tube.', status: 'unverified', honestStateEn: 'Playback test pending.' },
  { stationId: 'interaction', nodeId: 'controls', kind: 'register', titleEn: 'Interaction controls', summaryEn: 'Point, choose, continue.', status: 'unverified', honestStateEn: 'Only tested touch, gesture and voice behaviour is shown as live.' },
  { stationId: 'interaction', nodeId: 'restore', kind: 'register', titleEn: 'Hide and restore', summaryEn: 'Reversible interface visibility. Never deletes user data.', status: 'unverified', honestStateEn: 'Restore test pending.' },
]);

const ring = (azimuthDeg: number, radius: number, y: number, standoffOverride?: number): NodeAnchor => {
  const a = (azimuthDeg * Math.PI) / 180;
  return {
    position: [Number((radius * Math.sin(a)).toFixed(3)), y, Number((radius * Math.cos(a)).toFixed(3))],
    approachYawDeg: azimuthDeg,
    standoffOverride,
  };
};

/** Stage anchors for every node a pitch beat points at, keyed by canonical association id. */
const PITCH_ANCHORS: Readonly<Record<string, NodeAnchor>> = {
  about__premise__hello_friend: { position: [0, 0.2, 0], approachYawDeg: 25, standoffOverride: 11 },
  about__people__shweekar: ring(-40, 3.2, 0.4),
  about__people__khalid: ring(40, 3.2, 0.4),
  about__people__tarek: ring(0, 3.3, 0.6),
  about__identity__nojara: ring(150, 3.2, -0.4),
  cde__domains__production: ring(-60, 3.8, 0.2),
  cde__domains__strategy: ring(20, 3.8, 0.4),
  cde__domains__talent: ring(110, 3.8, 0),
  cde__domains__strategy_ip: ring(60, 3.4, 0.8),
  hq__tasks__context: ring(-80, 3.6, 0.6),
  hq__tasks__evidence: ring(-30, 3.6, 0.2),
  hq__tasks__next_action: { position: [0, 0, 0], approachYawDeg: -100, standoffOverride: 14 },
  hq__proj__yah: ring(20, 4, 0.2),
  hq__projects__yah_participation: ring(55, 3.6, 0.5),
  hq__proj__bat: ring(140, 3.8, 0.3),
  hq__projects__batron_talent_os: ring(165, 3.4, 0.6),
  hq__projects__index: { position: [0, 0, 0], approachYawDeg: 0, standoffOverride: 12 },
  hq__media__tube: ring(100, 3.4, 0),
  hq__media__selected: ring(115, 3.2, -0.2),
  hq__interaction__controls: ring(-150, 3.4, 0),
  hq__interaction__restore: ring(-150, 3.4, 0),
  cos__pipeline__review: { position: [0, 0, 0], approachYawDeg: 10, standoffOverride: 12 },
};

export const NODES: readonly NodeDef[] = [
  ...ABOUT_NODES,
  ...PITCH_ABOUT_NODES,
  ...HQ_NODES,
  ...PITCH_HQ_NODES,
  ...CDE_NODES,
  ...PITCH_CDE_NODES,
  ...COS_NODES,
].map((node) => {
  const anchor = PITCH_ANCHORS[node.associationId];
  return anchor ? { ...node, anchor } : node;
});

const NODE_BY_ASSOCIATION = new Map(NODES.map((n) => [n.associationId, n] as const));

/** Old route and deep-link forms that must keep resolving. `hq__proj_bat` is the short form. */
const ASSOCIATION_ALIASES: Readonly<Record<string, string>> = {
  hq__proj_bat: 'hq__proj__bat',
  hq__proj_batron: 'hq__proj__bat',
  hq__proj_yah: 'hq__proj__yah',
  hq__proj_seven: 'hq__proj__seven',
  hq__proj_bsocial: 'hq__proj__bsocial',
  hq__proj_mhe: 'hq__proj__mhe',
  hq__proj_moa: 'hq__proj__moa',
  hq__proj_ahr: 'hq__proj__ahr',
  hq__proj_os39: 'hq__proj__os39',
  about__people_shweekar: 'about__people__shweekar',
  about__people_khaled: 'about__people__khalid',
  about__people__khaled: 'about__people__khalid',
  hq__people__khaled: 'hq__people__khalid',
  hq__people_khaled: 'hq__people__khalid',
  about__people_khalid: 'about__people__khalid',
  hq__projects__yah: 'hq__proj__yah',
  hq__projects__batron: 'hq__proj__bat',
  cos__stages__review: 'cos__pipeline__review',
  about__people_tarek: 'about__people__tarek',
};

export function resolveAssociationId(raw: string): string | null {
  const id = raw.trim().toLowerCase();
  if (NODE_BY_ASSOCIATION.has(id)) return id;
  const alias = ASSOCIATION_ALIASES[id];
  return alias && NODE_BY_ASSOCIATION.has(alias) ? alias : null;
}

export function getNode(raw: string): NodeDef | null {
  const id = resolveAssociationId(raw);
  return id ? (NODE_BY_ASSOCIATION.get(id) ?? null) : null;
}

export function getNodeAnchor(raw: string): NodeAnchor | null {
  return getNode(raw)?.anchor ?? null;
}

/** Scoped query. An environment that has no nodes yields an empty list, never another environment's nodes. */
export function nodesInEnvironment(envId: EnvironmentId): NodeDef[] {
  return NODES.filter((n) => n.envId === envId);
}

export function nodesInStation(envId: EnvironmentId, stationId: string): NodeDef[] {
  return NODES.filter((n) => n.envId === envId && n.stationId === stationId);
}

export function environmentOfAssociation(raw: string): EnvironmentDef | null {
  const node = getNode(raw);
  return node ? ENVIRONMENTS[node.envId] : null;
}

/** Keyword navigation for typed and spoken commands. Returns an association id or null. */
type KeywordTarget = { pattern: RegExp; associationId: string; rosterOnly?: boolean };

const KEYWORD_TARGETS: readonly KeywordTarget[] = [
  { pattern: /\b(el[\s-]?batron|batron|الباترون)\b/i, associationId: 'hq__proj__bat' },
  { pattern: /\bsamna\b/i, associationId: 'hq__nasa__samna' },
  { pattern: /\bfakir\b/i, associationId: 'hq__nasa__fakir' },
  { pattern: /\bgrandy\b/i, associationId: 'hq__nasa__grandy' },
  { pattern: /\bbilal\b/i, associationId: 'hq__nasa__bilal' },
  { pattern: /\bkatib\b/i, associationId: 'hq__nasa__katib' },
  { pattern: /\bmusa\b/i, associationId: 'hq__nasa__musa' },
  { pattern: /\brasma\b/i, associationId: 'hq__nasa__rasma' },
  { pattern: /\bsardy\b/i, associationId: 'hq__nasa__sardy' },
  { pattern: /\bnasaq\b/i, associationId: 'hq__nasa__nasaq' },
  { pattern: /\bnabr\b/i, associationId: 'hq__nasa__nabr' },
  { pattern: /\bmadar\b/i, associationId: 'hq__nasa__madar' },
  { pattern: /\b(yah|young\s*(&|and)\s*human)\b/i, associationId: 'hq__proj__yah' },
  { pattern: /\bseven\b/i, associationId: 'hq__proj__seven' },
  { pattern: /\bbsocial\b/i, associationId: 'hq__proj__bsocial' },
  { pattern: /\bmhe\b/i, associationId: 'hq__proj__mhe' },
  { pattern: /\b(39\s*os)\b/i, associationId: 'hq__proj__os39' },
  { pattern: /\b(laliga|la\s*liga)\b/i, associationId: 'hq__media__laliga' },
  { pattern: /\bshweekar\b/i, associationId: 'about__people__shweekar' },
  { pattern: /\b(khalid|khaled)\b/i, associationId: 'about__people__khalid' },
  { pattern: /\btarek\b/i, associationId: 'about__people__tarek' },
  { pattern: /\b(showreel)\b/i, associationId: 'about__studio__showreel' },
  { pattern: /\b(nasa|agents?)\b/i, associationId: 'hq__nasa__fakir', rosterOnly: true },
];

export type KeywordMatch = { node: NodeDef; /** The phrase named the roster as a whole, not one agent. */ rosterOnly: boolean };

export function matchKeyword(text: string): KeywordMatch | null {
  for (const { pattern, associationId, rosterOnly } of KEYWORD_TARGETS) {
    if (!pattern.test(text)) continue;
    const node = getNode(associationId);
    if (node) return { node, rosterOnly: rosterOnly === true };
  }
  return null;
}

export function matchKeywordTarget(text: string): NodeDef | null {
  return matchKeyword(text)?.node ?? null;
}
