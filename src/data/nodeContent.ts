/**
 * What every node in every environment contains, and which of its media can actually be shown.
 *
 * Media is real only when the browser can load it (a same-origin file or a public URL). Anything else is
 * reported as an honest empty state, never replaced with a stand-in picture.
 */
import { CDE_DIMENSIONS, CEREBRO_STATIONS, HQ_NESTED_PROJECT_PARENT, HQ_PROJECTS_DATA, VISIBLE_PROJECTS_DATA } from './sourceData';
import { ABOUT_US_NODES, CAMPAIGN_OS_NODES } from './peerSphereContent';
import {
  PROJECT_MEDIA_TUBE_SPECS,
  mixTubeKey,
  realMediaForSource,
  type ProjectMediaTubeItem,
} from '../three/mediaTubeItems';
import type { ConnectedSphereId } from '../three/sphereNetwork';

export type ContentNodeType = 'core' | 'station' | 'dimension' | 'subdomain' | 'project';

export type NodeThumb = { url: string; kind: 'image' | 'video' };

export type NodeContent = {
  nodeId: string;
  sphere: ConnectedSphereId;
  nodeType: ContentNodeType;
  title: string;
  kindLabel: string;
  /** What the node holds, in one plain sentence. */
  summary: string;
  /** Tube key to open, or null when the node has no displayable media. */
  tubeKey: string | null;
  /** Tube tile to bring to the front on open. */
  focusTile: number;
  videoCount: number;
  imageCount: number;
  thumbs: NodeThumb[];
  /** Why there is no media, when there is none. */
  honest: string | null;
  /** Station this node sits under, or null for a top-level node. */
  parentId: string | null;
};

const NOJARA_TUBE = 'NOJARA';

const SPHERE_LABEL: Record<ConnectedSphereId, string> = {
  hq: 'HQ',
  cde: 'CDE',
  'campaign-os': 'Campaign OS',
  'about-us': 'About Us',
};

const NO_MEDIA_REASON: Record<string, string> = {
  tasks: 'This node holds register records, not media.',
  people: 'This node holds the NASA roster: people, agents and responsibilities. No approved media is available to show.',
  files: 'This node holds documents and register evidence, not media.',
};

type MediaSummary = Pick<NodeContent, 'tubeKey' | 'focusTile' | 'videoCount' | 'imageCount' | 'thumbs'>;

const EMPTY_MEDIA: MediaSummary = { tubeKey: null, focusTile: 0, videoCount: 0, imageCount: 0, thumbs: [] };

function thumbOf(item: ProjectMediaTubeItem): NodeThumb | null {
  const url = item.posterUrl ?? item.url;
  return url ? { url, kind: item.kind === 'video' ? 'video' : 'image' } : null;
}

/** Media summary for a set of sources (project ids, NOJARA, GALLERY). */
function mediaFor(sources: readonly string[]): MediaSummary {
  const unique = Array.from(new Set(sources.map((s) => s.toUpperCase())));
  const real = unique.flatMap(realMediaForSource);
  if (real.length === 0) return EMPTY_MEDIA;
  const thumbs = real.map(thumbOf).filter((t): t is NodeThumb => t !== null);
  const videoCount = real.filter((item) => item.kind === 'video').length;
  const imageCount = real.length - videoCount;
  if (unique.length === 1) {
    const only = unique[0];
    const tiles = realMediaForSource(only);
    const focus = tiles.find((item) => item.index < PROJECT_MEDIA_TUBE_SPECS.columns) ?? tiles[0];
    return { tubeKey: only === 'GALLERY' ? mixTubeKey([only]) : only, focusTile: only === 'GALLERY' ? 0 : (focus?.index ?? 0), videoCount, imageCount, thumbs };
  }
  return { tubeKey: mixTubeKey(unique), focusTile: 0, videoCount, imageCount, thumbs };
}

type NodeBase = Omit<NodeContent, keyof MediaSummary | 'honest' | 'parentId'> & { parentId?: string | null };

function withMedia(base: NodeBase, media: MediaSummary, fallbackHonest: string): NodeContent {
  return { ...base, parentId: base.parentId ?? null, ...media, honest: media.tubeKey ? null : fallbackHonest };
}

function projectName(projectId: string): string {
  return VISIBLE_PROJECTS_DATA.find((p) => p.id === projectId)?.code ?? projectId;
}

function resolveHq(nodeId: string, nodeType: ContentNodeType): NodeContent | null {
  const sphere: ConnectedSphereId = 'hq';
  if (nodeType === 'station') {
    const station = CEREBRO_STATIONS.find((st) => st.id === nodeId);
    if (!station) return null;
    const base = { nodeId, sphere, nodeType, title: station.label, kindLabel: 'HQ station', summary: station.summary };
    if (nodeId === 'projects') {
      const ids = HQ_PROJECTS_DATA.map((p) => p.id);
      return withMedia(base, mediaFor(ids), 'No project has approved media to show yet.');
    }
    return withMedia(base, EMPTY_MEDIA, NO_MEDIA_REASON[nodeId] ?? 'No media attached to this node.');
  }
  if (nodeType === 'project') {
    const project = HQ_PROJECTS_DATA.find((p) => p.id === nodeId);
    if (!project) return null;
    return withMedia(
      {
        nodeId,
        sphere,
        nodeType,
        title: project.code,
        kindLabel: 'Project in Projects',
        parentId: HQ_NESTED_PROJECT_PARENT,
        summary: `${project.name}. ${project.progressLabel}.`,
      },
      mediaFor([project.id]),
      'No verified media for this project in the approved folder yet.'
    );
  }
  return null;
}

function resolveCde(nodeId: string, nodeType: ContentNodeType): NodeContent | null {
  const sphere: ConnectedSphereId = 'cde';
  if (nodeType === 'dimension') {
    const dim = CDE_DIMENSIONS.find((d) => d.id === nodeId);
    if (!dim) return null;
    const ids = dim.subdomains.flatMap((sub) => sub.projectIds);
    return withMedia(
      {
        nodeId,
        sphere,
        nodeType,
        title: dim.label,
        kindLabel: 'CDE dimension',
        summary: `${dim.subdomains.length} subdomains: ${dim.subdomains.map((s) => s.name).join(', ')}.`,
      },
      mediaFor(ids),
      'None of its projects has approved media to show yet.'
    );
  }
  if (nodeType === 'subdomain') {
    for (const dim of CDE_DIMENSIONS) {
      const sub = dim.subdomains.find((s) => s.id === nodeId);
      if (!sub) continue;
      return withMedia(
        {
          nodeId,
          sphere,
          nodeType,
          title: sub.name,
          kindLabel: 'CDE subdomain',
          summary: `Projects: ${sub.projectIds.map(projectName).join(', ')}.`,
        },
        mediaFor(sub.projectIds),
        'None of its projects has approved media to show yet.'
      );
    }
    return null;
  }
  if (nodeType === 'project') {
    const project = VISIBLE_PROJECTS_DATA.find((p) => p.id === nodeId);
    if (!project) return null;
    return withMedia(
      {
        nodeId,
        sphere,
        nodeType,
        title: project.code,
        kindLabel: 'Project',
        summary: `${project.name}. ${project.subdomain}.`,
      },
      mediaFor([project.id]),
      'No verified media for this project in the approved folder yet.'
    );
  }
  return null;
}

const CAMPAIGN_SOURCES: Readonly<Record<string, { sources: string[]; tile?: number }>> = {
  'camp-laliga': { sources: [NOJARA_TUBE], tile: 1 },
  'camp-nojara-showreel': { sources: [NOJARA_TUBE], tile: 0 },
  'camp-el-batron': { sources: ['EL-BATRON'] },
  'camp-seven': { sources: ['SEVEN'] },
};

const ABOUT_SOURCES: Readonly<Record<string, string[]>> = {
  'nojara-studios': [NOJARA_TUBE],
  'about-gallery': ['GALLERY'],
};

function resolvePeer(nodeId: string, sphere: 'campaign-os' | 'about-us'): NodeContent | null {
  const specs = sphere === 'campaign-os' ? CAMPAIGN_OS_NODES : ABOUT_US_NODES;
  const spec = specs.find((s) => s.id === nodeId);
  if (!spec) return null;
  const base = {
    nodeId,
    sphere,
    nodeType: 'station' as const,
    title: spec.label,
    kindLabel: SPHERE_LABEL[sphere],
    summary: spec.sublabel,
  };
  if (sphere === 'campaign-os') {
    const entry = CAMPAIGN_SOURCES[nodeId];
    if (!entry) return withMedia(base, EMPTY_MEDIA, 'No media attached to this node.');
    const media = mediaFor(entry.sources);
    const focused =
      entry.tile !== undefined && media.tubeKey === NOJARA_TUBE ? { ...media, focusTile: entry.tile } : media;
    return withMedia(base, focused, 'No verified media for this campaign in the approved folder yet.');
  }
  const sources = ABOUT_SOURCES[nodeId];
  if (!sources) {
    return withMedia(
      base,
      EMPTY_MEDIA,
      spec.nodeType === 'person'
        ? 'No approved portrait is available to show. No substitute face is used.'
        : 'No media attached to this node.'
    );
  }
  return withMedia(base, mediaFor(sources), 'No media to show yet.');
}

export function resolveNodeContent(
  nodeId: string,
  nodeType: ContentNodeType,
  sphere: ConnectedSphereId
): NodeContent | null {
  if (nodeType === 'core') return null;
  switch (sphere) {
    case 'hq':
      return resolveHq(nodeId, nodeType);
    case 'cde':
      return resolveCde(nodeId, nodeType);
    case 'campaign-os':
    case 'about-us':
      return resolvePeer(nodeId, sphere);
    default: {
      const unhandled: never = sphere;
      return unhandled;
    }
  }
}

/** Short chip text for a node label: what it holds at a glance. */
export function contentChip(content: NodeContent | null): string {
  if (!content) return '';
  const parts: string[] = [];
  if (content.videoCount > 0) parts.push(`${content.videoCount} video${content.videoCount === 1 ? '' : 's'}`);
  if (content.imageCount > 0) parts.push(`${content.imageCount} photo${content.imageCount === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' · ') : 'No media yet';
}

export type DirectoryEntry = NodeContent & { chip: string };

/** Every pickable node across all four environments, grouped for the node browser. */
export function nodeDirectory(): Record<ConnectedSphereId, DirectoryEntry[]> {
  const entry = (content: NodeContent | null): DirectoryEntry[] =>
    content ? [{ ...content, chip: contentChip(content) }] : [];
  const hq: DirectoryEntry[] = CEREBRO_STATIONS.flatMap((st) => [
    ...entry(resolveNodeContent(st.id, 'station', 'hq')),
    ...(st.id === HQ_NESTED_PROJECT_PARENT
      ? HQ_PROJECTS_DATA.flatMap((p) => entry(resolveNodeContent(p.id, 'project', 'hq')))
      : []),
  ]);
  const cde: DirectoryEntry[] = [
    ...CDE_DIMENSIONS.flatMap((dim) => [
      ...entry(resolveNodeContent(dim.id, 'dimension', 'cde')),
      ...dim.subdomains.flatMap((sub) => entry(resolveNodeContent(sub.id, 'subdomain', 'cde'))),
    ]),
    ...VISIBLE_PROJECTS_DATA.flatMap((p) => entry(resolveNodeContent(p.id, 'project', 'cde'))),
  ];
  const campaign: DirectoryEntry[] = CAMPAIGN_OS_NODES.flatMap((n) =>
    entry(resolveNodeContent(n.id, 'station', 'campaign-os'))
  );
  const about: DirectoryEntry[] = ABOUT_US_NODES.flatMap((n) =>
    entry(resolveNodeContent(n.id, 'station', 'about-us'))
  );
  return { hq, cde, 'campaign-os': campaign, 'about-us': about };
}
