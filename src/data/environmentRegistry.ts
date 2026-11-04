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

export type EnvironmentDef = {
  id: EnvironmentId;
  key: EnvKey;
  sphereId: ConnectedSphereId;
  titleEn: string;
  titleAr: string;
  stations: readonly string[];
};

export const ENVIRONMENTS: Readonly<Record<EnvironmentId, EnvironmentDef>> = {
  env_about: { id: 'env_about', key: 'about', sphereId: 'about-us', titleEn: 'About Us', titleAr: 'من نحن', stations: ['people', 'tarek', 'studio'] },
  env_hq: { id: 'env_hq', key: 'hq', sphereId: 'hq', titleEn: 'HQ', titleAr: 'المقر', stations: ['proj', 'nasa', 'people', 'files', 'media', 'tasks'] },
  env_cde: { id: 'env_cde', key: 'cde', sphereId: 'cde', titleEn: 'Creative Design Engineering', titleAr: 'هندسة التصميم الإبداعي', stations: ['strategy', 'production', 'talent', 'mediatech'] },
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
export const PEOPLE: Readonly<Record<'shweekar' | 'khaled' | 'tarek', PersonRecord>> = {
  shweekar: { personId: 'shweekar', displayName: 'Shweekar Ahmed', displayNameAr: 'شويكار أحمد', roleEn: 'PMO collaborator', portraitAssetId: 'img-person-shweekar', portraitGap: false, status: 'verified' },
  khaled: { personId: 'khaled', displayName: 'Khaled Al Shaalan', displayNameAr: 'خالد الشعلان', roleEn: null, portraitAssetId: null, portraitGap: true, status: 'verified' },
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
  { stationId: 'people', nodeId: 'khaled', kind: 'person', titleEn: 'Khaled Al Shaalan', titleAr: 'خالد الشعلان', personId: 'khaled', access: 'public', status: 'gap', honestStateEn: 'Portrait pending confirmation.' },
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
  taskState: 'unknown';
  binding: AgentBinding;
};

export const NASA_ROSTER: readonly AgentRecord[] = NASA_AGENTS.map((a) => ({
  associationId: `hq__nasa__${a.nodeId}`,
  name: a.name,
  documentedProfileEn: a.documentedProfileEn,
  proposedRoleEn: a.proposedRoleEn,
  label: a.proposed ? 'PROPOSED' : 'DOCUMENTED',
  runtimeConnection: 'none',
  taskState: 'unknown',
  binding: { verified: false, scopes: [], lastPassedTestIso: null },
}));

export type AgentActions = { talk: boolean; assign: boolean; run: boolean };

export function agentActionsFor(agent: AgentRecord, envId: EnvironmentId): AgentActions {
  const ok = agent.binding.verified && agent.binding.lastPassedTestIso !== null && agent.binding.scopes.includes(envId);
  return { talk: ok, assign: ok, run: ok };
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
  { stationId: 'people', nodeId: 'khaled', kind: 'person', titleEn: 'Khaled Al Shaalan', personId: 'khaled', status: 'gap', honestStateEn: 'Portrait pending confirmation.' },
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

export const NODES: readonly NodeDef[] = [...ABOUT_NODES, ...HQ_NODES, ...CDE_NODES, ...COS_NODES];

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
  about__people_khaled: 'about__people__khaled',
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
const KEYWORD_TARGETS: readonly { pattern: RegExp; associationId: string }[] = [
  { pattern: /\b(el[\s-]?batron|batron|الباترون)\b/i, associationId: 'hq__proj__bat' },
  { pattern: /\b(yah|young\s*(&|and)\s*human)\b/i, associationId: 'hq__proj__yah' },
  { pattern: /\bseven\b/i, associationId: 'hq__proj__seven' },
  { pattern: /\bbsocial\b/i, associationId: 'hq__proj__bsocial' },
  { pattern: /\bmhe\b/i, associationId: 'hq__proj__mhe' },
  { pattern: /\b(39\s*os)\b/i, associationId: 'hq__proj__os39' },
  { pattern: /\b(laliga|la\s*liga)\b/i, associationId: 'hq__media__laliga' },
  { pattern: /\bshweekar\b/i, associationId: 'about__people__shweekar' },
  { pattern: /\bkhaled\b/i, associationId: 'about__people__khaled' },
  { pattern: /\btarek\b/i, associationId: 'about__people__tarek' },
  { pattern: /\b(showreel)\b/i, associationId: 'about__studio__showreel' },
  { pattern: /\b(nasa|agents?)\b/i, associationId: 'hq__nasa__fakir' },
];

export function matchKeywordTarget(text: string): NodeDef | null {
  for (const { pattern, associationId } of KEYWORD_TARGETS) {
    if (pattern.test(text)) return getNode(associationId);
  }
  return null;
}
