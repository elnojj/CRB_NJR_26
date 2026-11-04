import { CONTEXT_SURFACE_HOSTS, type ContextSurfaceHost } from '../design/systemContract';
import type { GuiBreakpoint } from './guiTokens';

/** RULE-04: panel ids that render inside the station inspector rather than the project workspace. */
const STATION_INSPECTOR_PANELS: ReadonlySet<string> = new Set(['cde-explorer', 'story-journey', 'people', 'media']);

export function classifySurfaceHost(panelId: string, breakpoint: GuiBreakpoint): ContextSurfaceHost {
  if (breakpoint === 'phone') return 'PhoneSheet';
  return STATION_INSPECTOR_PANELS.has(panelId) ? 'StationInspector' : 'ProjectWorkspacePanel';
}

export type SurfaceSnapshotContext = {
  projectTab: string | null;
  scrollTopByPanel: Readonly<Record<string, number>>;
  draftByPanel: Readonly<Record<string, string>>;
};

export type SurfaceSnapshot = {
  host: ContextSurfaceHost;
  panels: string[];
  projectTab: string | null;
  scrollTopByPanel: Record<string, number>;
  draftByPanel: Record<string, string>;
};

export type SingleSurfacePlan = {
  panels: string[];
  activeHost: ContextSurfaceHost | null;
  /** Snapshots of every host that was displaced; empty when nothing changed. */
  displaced: SurfaceSnapshot[];
};

function pick<T>(source: Readonly<Record<string, T>>, keys: readonly string[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of keys) if (key in source) out[key] = source[key];
  return out;
}

/**
 * Keeps panels of exactly one surface host. The host of the most recently opened panel wins; panels of
 * every other host are removed and their tab, scroll offset and unsent draft are returned so they can be
 * restored when that host is reopened.
 */
export function enforceSingleSurfaceHost(
  openPanels: readonly string[],
  breakpoint: GuiBreakpoint,
  context: SurfaceSnapshotContext
): SingleSurfacePlan {
  if (openPanels.length === 0) return { panels: [], activeHost: null, displaced: [] };
  const activeHost = classifySurfaceHost(openPanels[openPanels.length - 1], breakpoint);
  const kept: string[] = [];
  const dropped = new Map<ContextSurfaceHost, string[]>();
  for (const panelId of openPanels) {
    const host = classifySurfaceHost(panelId, breakpoint);
    if (host === activeHost) {
      kept.push(panelId);
    } else {
      dropped.set(host, [...(dropped.get(host) ?? []), panelId]);
    }
  }
  const displaced: SurfaceSnapshot[] = CONTEXT_SURFACE_HOSTS.flatMap((host) => {
    const panels = dropped.get(host);
    if (!panels) return [];
    return [
      {
        host,
        panels,
        projectTab: context.projectTab,
        scrollTopByPanel: pick(context.scrollTopByPanel, panels),
        draftByPanel: pick(context.draftByPanel, panels),
      },
    ];
  });
  return { panels: kept, activeHost, displaced };
}
