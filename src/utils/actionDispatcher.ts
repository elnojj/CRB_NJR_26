import { CdeDimensionId, StationId } from '../tokens/colours';
import {
  CEREBRO_STATIONS,
  CDE_DIMENSIONS,
  STORY_CHAPTERS,
  PROJECTS_DATA,
  PEOPLE_DATA,
  SHOWREEL_ITEMS,
  TEAM_CHECKPOINTS,
} from '../data/sourceData';
import { CRO_CDE_GOOGLE_TOOLS_SCHEMA } from '../data/croCdeGoogleAgentManifest';
import { ProjectWorkspaceTab } from '../components/PanelsOverlay';
import {
  CinemaLensId,
  CameraAnglePresetId,
  CameraLoopMode,
} from '../components/CosmographCanvas';
import { CEREBRO_17_PROJECTS } from '../data/cerebroData';
import { DomainMaterialPreset } from './geminiScreenOrchestrator';
import { TourMode } from './cerebroTourAndCtaStore';

export type CameraVerb =
  | 'orbit'
  | 'pan'
  | 'tilt'
  | 'zoom_in'
  | 'zoom_out'
  | 'max_in'
  | 'max_out'
  | 'center'
  | 'scan'
  | 'faster'
  | 'slower'
  | 'stop'
  | 'set_lens'
  | 'set_angle'
  | 'set_loop';

export type CameraDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'in'
  | 'out'
  | 'start'
  | 'stop';

export type MediaActionType =
  | 'select'
  | 'next'
  | 'prev'
  | 'play'
  | 'pause'
  | 'seek'
  | 'mute'
  | 'unmute'
  | 'fullscreen_enter'
  | 'fullscreen_exit';

export type TourActionType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'next'
  | 'prev'
  | 'stop'
  | 'mode_auto'
  | 'mode_manual';

export type WorkspaceAction =
  | { type: 'switch_sphere'; sphere: 'hq' | 'cde' }
  | { type: 'open_station'; station: StationId }
  | { type: 'focus_project'; projectId: string; tab?: ProjectWorkspaceTab }
  | { type: 'select_person'; personId: string }
  | { type: 'get_raci'; projectId: string }
  | { type: 'open_dimension'; dimension: CdeDimensionId }
  | { type: 'open_subdomain'; subdomainId: string }
  | { type: 'open_chapter'; chapterIndex: number }
  | {
      type: 'open_panel';
      action: 'open' | 'close' | 'minimize' | 'restore' | 'close_all';
      panel?: string;
    }
  | {
      type: 'open_dashboard';
      mode: 'collapsed' | 'expanded' | 'toggle';
    }
  | { type: 'navigate_back' }
  | {
      type: 'camera';
      verb: CameraVerb;
      direction?: CameraDirection;
      amount?: number;
      lensId?: CinemaLensId;
      anglePreset?: CameraAnglePresetId;
      loopMode?: CameraLoopMode;
    }
  | {
      type: 'media_control';
      action: MediaActionType;
      reelId?: string;
      seekSeconds?: number;
    }
  | {
      type: 'search_files';
      query: string;
    }
  | {
      type: 'tour_control';
      action: TourActionType;
      mode?: TourMode;
      screenId?: string;
    }
  | {
      type: 'step_tour';
      directionOrScreen: string;
    }
  | {
      type: 'trigger_cta';
      ctaId: string;
      spokenReason?: string;
    }
  | {
      type: 'checkpoint_action';
      checkpointId: string;
      decision: 'Approve' | 'Reject' | 'Request Revision';
      comment?: string;
    }
  | { type: 'get_briefing' }
  | { type: 'get_page_state' }
  | {
      type: 'create_domain';
      name: string;
      sphere: 'hq' | 'cde';
      colour: string;
      parentNodeId: string;
    }
  | {
      type: 'update_domain_material';
      target: string;
      materialPreset: DomainMaterialPreset;
    }
  | {
      type: 'amend_screen_element';
      elementId: string;
      operation: 'set_text' | 'set_filter' | 'highlight' | 'switch_view';
      value: string;
    }
  | {
      type: 'workspace_sync';
      service: 'gmail' | 'calendar' | 'drive' | 'docs' | 'sheets' | 'meet';
      action: 'open' | 'refresh' | 'draft' | 'create_meet';
      query?: string;
    }
  | {
      type: 'project_media_tube';
      action: 'open' | 'close' | 'focus_tile' | 'fullview';
      projectId?: string;
      tileIndex?: number;
    };

export interface ActionResult {
  ok: boolean;
  action: string;
  target: string;
  resultingState: Record<string, unknown>;
  operationId: string;
  deduplicated?: boolean;
  error?: string;
}

export interface ToolAuditEntry {
  toolName: string;
  schemaDefined: boolean;
  handlerImplemented: boolean;
  requiredParams: string[];
  status: 'VERIFIED' | 'MISMATCH';
}

const recentIntentTimestamps = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1400;

export function buildActionDedupeKey(action: WorkspaceAction): string {
  switch (action.type) {
    case 'switch_sphere':
      return `switch_sphere:${action.sphere}`;
    case 'open_station':
      return `open_station:${action.station}`;
    case 'focus_project':
      return `focus_project:${action.projectId}:${action.tab || 'default'}`;
    case 'select_person':
      return `select_person:${action.personId}`;
    case 'get_raci':
      return `get_raci:${action.projectId}`;
    case 'open_dimension':
      return `open_dimension:${action.dimension}`;
    case 'open_subdomain':
      return `open_subdomain:${action.subdomainId}`;
    case 'open_chapter':
      return `open_chapter:${action.chapterIndex}`;
    case 'open_panel':
      return `open_panel:${action.action}:${action.panel || 'active'}`;
    case 'open_dashboard':
      return `open_dashboard:${action.mode}`;
    case 'navigate_back':
      return `navigate_back`;
    case 'camera':
      return `camera:${action.verb}:${action.direction || 'none'}:${action.lensId || ''}:${action.anglePreset || ''}:${action.loopMode || ''}`;
    case 'media_control':
      return `media_control:${action.action}:${action.reelId || ''}:${action.seekSeconds ?? ''}`;
    case 'search_files':
      return `search_files:${action.query}`;
    case 'tour_control':
      return `tour_control:${action.action}:${action.mode || ''}:${action.screenId || ''}`;
    case 'step_tour':
      return `step_tour:${action.directionOrScreen}`;
    case 'trigger_cta':
      return `trigger_cta:${action.ctaId}`;
    case 'checkpoint_action':
      return `checkpoint_action:${action.checkpointId}:${action.decision}`;
    case 'get_briefing':
      return `get_briefing`;
    case 'get_page_state':
      return `get_page_state`;
    case 'create_domain':
      return `create_domain:${action.sphere}:${action.name}`;
    case 'update_domain_material':
      return `update_domain_material:${action.target}:${action.materialPreset}`;
    case 'amend_screen_element':
      return `amend_screen_element:${action.elementId}:${action.operation}:${action.value}`;
    case 'workspace_sync':
      return `workspace_sync:${action.service}:${action.action}:${action.query || ''}`;
    case 'project_media_tube':
      return `project_media_tube:${action.action}:${action.projectId || ''}:${action.tileIndex ?? ''}`;
  }
}

export function shouldDeduplicateAction(
  action: WorkspaceAction,
  source: 'voice_tool' | 'voice_transcript' | 'ui' | 'keyboard' | 'tour' | 'test'
): boolean {
  if (source === 'ui' || source === 'keyboard' || source === 'tour' || source === 'test') {
    recentIntentTimestamps.set(buildActionDedupeKey(action), Date.now());
    return false;
  }
  const key = buildActionDedupeKey(action);
  const now = Date.now();
  const prev = recentIntentTimestamps.get(key);
  if (prev && now - prev < DEDUPE_WINDOW_MS) {
    return true;
  }
  recentIntentTimestamps.set(key, now);
  return false;
}

export function resolveProjectId(raw: string): string | null {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'seven' || s.includes('سفن')) return 'SEVEN';
  if (s === 'yah' || s.includes('young') || s.includes('human')) return 'YAH';
  if (s === 'mhe' || s.includes('hamdan') || s.includes('ابو حمدان') || s.includes('حمدان')) return 'MHE';
  if (s === 'bsocial' || s.includes('b-social') || s.includes('بي سوشيال')) return 'BSOCIAL';
  if (s === 'al-ahram' || s === 'ahram' || s === 'ahr' || s.includes('الأهرام')) return 'AL-AHRAM';
  if (s === 'museum-of-almost' || s === 'moa' || s.includes('almost')) return 'MUSEUM-OF-ALMOST';
  if (s === 'el-batron' || s === 'el batron' || s === 'batron' || s === 'bat' || s.includes('باترون')) return 'EL-BATRON';
  if (s === 'gondwana' || s === 'gnd' || s.includes('جوندوانا')) return 'GONDWANA';

  const exact17 = CEREBRO_17_PROJECTS.find(
    (p) =>
      p.id.toLowerCase() === s ||
      p.code.toLowerCase().includes(s) ||
      p.name.toLowerCase().includes(s)
  );
  if (exact17) return exact17.id;

  const exact = PROJECTS_DATA.find(
    (p) => p.id.toLowerCase() === s || p.code.toLowerCase() === s || p.name.toLowerCase() === s
  );
  return exact ? exact.id : null;
}

export function resolvePersonId(raw: string): string | null {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s === '39' || s === 'p-39' || s.includes('tarek') || s.includes('طارق')) return 'p-39';
  if (s === 'gd' || s === 'grandy' || s === 'p-grandy' || s.includes('جراندي')) return 'p-grandy';
  if (s === 'bl' || s === 'bilal' || s === 'p-bilal' || s.includes('بلال')) return 'p-fakir-bilal-katib-musa';
  if (s === 'rs' || s === 'rasma' || s === 'p-rasma' || s.includes('رسمة')) return 'p-rasma';
  if (s === 'mu' || s === 'musa' || s === 'p-musa' || s.includes('موسى')) return 'p-fakir-bilal-katib-musa';
  if (s === 'kt' || s === 'katib' || s === 'p-katib' || s.includes('كاتب')) return 'p-fakir-bilal-katib-musa';
  if (s === 'fk' || s === 'fakir' || s === 'p-fakir' || s.includes('فكير')) return 'p-fakir-bilal-katib-musa';
  if (s === 'nq' || s === 'nasaq' || s === 'p-nasaq' || s.includes('نسق')) return 'p-rasma';
  if (s === 'ws' || s === 'waseem' || s === 'p-waseem' || s.includes('وسيم')) return 'p-kr';
  if (s === 'zb' || s === 'zebda' || s === 'p-zebda' || s.includes('زبدة')) return 'p-zebda';
  if (s === 'bg' || s === 'baghira' || s === 'p-baghira' || s.includes('باغيرا')) return 'p-baghira';
  if (s === 'kz' || s === 'kinzo' || s === 'p-kinzo' || s.includes('كينزو')) return 'p-kinzo';
  if (s === 'shweekar' || s === 'p-shweekar' || s.includes('شويكار')) return 'p-shweekar';
  if (s === 'cerebro' || s === 'p-cerebro') return 'p-cerebro';
  if (s === 'kr' || s === 'p-kr') return 'p-kr';
  if (
    s.includes('fakir') ||
    s.includes('bilal') ||
    s.includes('katib') ||
    s.includes('musa') ||
    s === 'p-fakir-bilal-katib-musa'
  ) {
    return 'p-fakir-bilal-katib-musa';
  }
  if (s === 'mhe' || s === 'p-mhe' || s.includes('hamdan') || s.includes('حمدان')) return 'p-mhe';
  if (s === 'khalid' || s === 'p-khalid' || s.includes('خالد')) return 'p-khalid';

  const found = PEOPLE_DATA.find(
    (p) => p.id.toLowerCase() === s || p.name.toLowerCase().includes(s)
  );
  return found ? found.id : null;
}

export function resolveReelId(raw: string): string | null {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s.includes('lotus') || s === '0' || s === '01' || s === 'reel-01') return 'med-mission-lotus';
  if (s.includes('seven') || s.includes('tabuk') || s === '1' || s === '02' || s === 'reel-02') return 'med-seven-reel';
  if (s.includes('laliga') || s === '2' || s === '03' || s === 'reel-03') return 'med-laliga';
  if (s.includes('batron') || s === '3' || s === '04' || s === 'reel-04') return 'med-el-batron';
  if (s.includes('yah') || s.includes('young') || s === '4' || s === '05' || s === 'reel-05') return 'med-yah-highlight';

  const found = SHOWREEL_ITEMS.find(
    (r) => r.id.toLowerCase() === s || r.title.toLowerCase().includes(s)
  );
  return found ? found.id : null;
}

/**
 * Convert an ElevenLabs structured client_tool_call into a typed WorkspaceAction
 * WITHOUT flattening parameters with Object.values(...).join(...).
 */
export function parseStructuredToolCall(
  toolName: string,
  params: Record<string, unknown> = {}
): { ok: boolean; action?: WorkspaceAction; error?: string } {
  const name = String(toolName || '').trim().toLowerCase();

  switch (name) {
    case 'switch_sphere': {
      const rawSphere = String(params.sphere || params.target || '').toLowerCase();
      if (rawSphere === 'cde') {
        return { ok: true, action: { type: 'switch_sphere', sphere: 'cde' } };
      }
      if (rawSphere === 'hq' || rawSphere === 'cerebro') {
        return { ok: true, action: { type: 'switch_sphere', sphere: 'hq' } };
      }
      return { ok: false, error: `Invalid sphere parameter: ${String(params.sphere)}` };
    }

    case 'open_station': {
      const st = String(params.station || params.stationId || '').toLowerCase() as StationId;
      const valid = CEREBRO_STATIONS.some((s) => s.id === st);
      if (!valid) {
        return { ok: false, error: `Unknown station: ${st}` };
      }
      return { ok: true, action: { type: 'open_station', station: st } };
    }

    case 'focus_project':
    case 'open_project':
    case 'get_project': {
      const resolved = resolveProjectId(String(params.projectId || params.project || ''));
      if (!resolved) {
        return { ok: false, error: `Unknown projectId: ${String(params.projectId || params.project)}` };
      }
      const rawTab = String(params.tab || '').toLowerCase();
      const tabAlias: Record<string, ProjectWorkspaceTab> = {
        overview: 'overview',
        tasks: 'tasks',
        decisions: 'decisions',
        checkpoints: 'decisions',
        reviews: 'decisions',
        minutes: 'minutes',
        notes: 'minutes',
        files: 'files',
        team: 'team',
      };
      return {
        ok: true,
        action: {
          type: 'focus_project',
          projectId: resolved,
          tab: tabAlias[rawTab],
        },
      };
    }

    case 'select_person': {
      const resolved = resolvePersonId(String(params.personId || params.person || ''));
      if (!resolved) {
        return { ok: false, error: `Unknown personId: ${String(params.personId)}` };
      }
      return { ok: true, action: { type: 'select_person', personId: resolved } };
    }

    case 'get_raci': {
      const resolved = resolveProjectId(String(params.projectId || params.project || 'SEVEN')) || 'SEVEN';
      return { ok: true, action: { type: 'get_raci', projectId: resolved } };
    }

    case 'open_dimension': {
      const dim = String(params.dimension || params.dimensionId || '').toLowerCase() as CdeDimensionId;
      const valid = CDE_DIMENSIONS.some((d) => d.id === dim);
      if (!valid) {
        return { ok: false, error: `Unknown CDE dimension: ${dim}` };
      }
      return { ok: true, action: { type: 'open_dimension', dimension: dim } };
    }

    case 'open_subdomain': {
      const raw = String(params.subdomainId || params.subdomain || '').toLowerCase();
      const allSubs = CDE_DIMENSIONS.flatMap((d) => d.subdomains);
      const found = allSubs.find(
        (s) => s.id.toLowerCase() === raw || s.name.toLowerCase().includes(raw)
      );
      if (!found) {
        return { ok: false, error: `Unknown CDE subdomain: ${raw}` };
      }
      return { ok: true, action: { type: 'open_subdomain', subdomainId: found.id } };
    }

    case 'open_chapter': {
      const idx = Number(params.chapterIndex || params.chapter || 1);
      const found = STORY_CHAPTERS.find((c) => c.index === idx);
      if (!found) {
        return { ok: false, error: `Unknown CDE chapter index: ${String(params.chapterIndex)}` };
      }
      return { ok: true, action: { type: 'open_chapter', chapterIndex: found.index } };
    }

    case 'open_panel':
    case 'panel_control': {
      const act = String(params.action || 'open').toLowerCase() as
        | 'open'
        | 'close'
        | 'minimize'
        | 'restore'
        | 'close_all';
      const panel = params.panel ? String(params.panel).toLowerCase() : undefined;
      return { ok: true, action: { type: 'open_panel', action: act, panel } };
    }

    case 'open_dashboard': {
      const mode = String(params.mode || 'toggle').toLowerCase() as
        | 'collapsed'
        | 'expanded'
        | 'toggle';
      return { ok: true, action: { type: 'open_dashboard', mode } };
    }

    case 'navigate_back': {
      return { ok: true, action: { type: 'navigate_back' } };
    }

    case 'camera': {
      const verb = String(params.verb || params.action || 'center').toLowerCase() as CameraVerb;
      const direction = params.direction
        ? (String(params.direction).toLowerCase() as CameraDirection)
        : undefined;
      const amount = typeof params.amount === 'number' ? params.amount : undefined;
      const lensId = params.lensId ? (String(params.lensId) as CinemaLensId) : undefined;
      const anglePreset = params.anglePreset
        ? (String(params.anglePreset) as CameraAnglePresetId)
        : undefined;
      const loopMode = params.loopMode
        ? (String(params.loopMode) as CameraLoopMode)
        : undefined;
      return {
        ok: true,
        action: { type: 'camera', verb, direction, amount, lensId, anglePreset, loopMode },
      };
    }

    case 'media_control':
    case 'open_showreel':
    case 'carousel_control': {
      const defaultAct =
        name === 'open_showreel'
          ? 'select'
          : name === 'carousel_control'
          ? String(params.action || 'next')
          : String(params.action || 'play');
      const act = defaultAct.toLowerCase() as MediaActionType;
      const reelId = params.reelId ? resolveReelId(String(params.reelId)) || String(params.reelId) : undefined;
      const seekSeconds = typeof params.seekSeconds === 'number' ? params.seekSeconds : undefined;
      return { ok: true, action: { type: 'media_control', action: act, reelId, seekSeconds } };
    }

    case 'search_files': {
      const query = String(params.query || '').trim();
      return { ok: true, action: { type: 'search_files', query } };
    }

    case 'tour_control':
    case 'start_tour':
    case 'stop_tour': {
      const defaultAct = name === 'start_tour' ? 'start' : name === 'stop_tour' ? 'stop' : 'start';
      const act = String(params.action || defaultAct).toLowerCase() as TourActionType;
      const rawMode = String(params.mode || '').toLowerCase();
      const validModes: TourMode[] = ['full-18-screen', 'hq-ops', 'cde-bio', 'executive-fast'];
      const mode: TourMode | undefined = validModes.includes(rawMode as TourMode)
        ? (rawMode as TourMode)
        : name === 'start_tour'
        ? 'full-18-screen'
        : undefined;
      const screenId = params.screenId ? String(params.screenId).toUpperCase() : undefined;
      return { ok: true, action: { type: 'tour_control', action: act, mode, screenId } };
    }

    case 'step_tour': {
      const directionOrScreen = String(
        params.directionOrScreen || params.direction || params.screenId || 'next'
      ).trim();
      return {
        ok: true,
        action: {
          type: 'step_tour',
          directionOrScreen,
        },
      };
    }

    case 'trigger_cta': {
      const ctaId = String(params.ctaId || params.id || params.target || '').trim();
      if (!ctaId) {
        return { ok: false, error: 'Missing required ctaId parameter for trigger_cta' };
      }
      const spokenReason = params.spokenReason ? String(params.spokenReason) : undefined;
      return {
        ok: true,
        action: {
          type: 'trigger_cta',
          ctaId,
          spokenReason,
        },
      };
    }

    case 'checkpoint_action': {
      const rawId = String(params.checkpointId || '').toLowerCase();
      const found =
        TEAM_CHECKPOINTS.find((c) => c.id.toLowerCase() === rawId) || TEAM_CHECKPOINTS[0];
      const rawDec = String(params.decision || 'Approve').toLowerCase();
      const decision: 'Approve' | 'Reject' | 'Request Revision' = rawDec.includes('reject')
        ? 'Reject'
        : rawDec.includes('revision')
        ? 'Request Revision'
        : 'Approve';
      return {
        ok: true,
        action: {
          type: 'checkpoint_action',
          checkpointId: found.id,
          decision,
          comment: params.comment ? String(params.comment) : undefined,
        },
      };
    }

    case 'get_briefing': {
      return { ok: true, action: { type: 'get_briefing' } };
    }

    case 'get_page_state': {
      return { ok: true, action: { type: 'get_page_state' } };
    }

    case 'create_domain': {
      const domainName = String(params.name || 'New Orbital Domain').trim();
      const sphere = String(params.sphere || 'hq').toLowerCase() === 'cde' ? 'cde' : 'hq';
      const colour = String(params.colour || (sphere === 'hq' ? '#4C8DFF' : '#F2B66D'));
      const parentNodeId = String(
        params.parentNodeId || (sphere === 'hq' ? 'projects' : 'strategy')
      );
      return {
        ok: true,
        action: {
          type: 'create_domain',
          name: domainName,
          sphere,
          colour,
          parentNodeId,
        },
      };
    }

    case 'update_domain_material': {
      const target = String(params.target || 'hq').toLowerCase();
      const rawMat = String(params.materialPreset || 'cobalt-glass').toLowerCase();
      const validPresets: DomainMaterialPreset[] = [
        'cobalt-glass',
        'amber-crystal',
        'emerald-plasma',
        'wireframe-obsidian',
        'pearl-iridescent',
      ];
      const materialPreset: DomainMaterialPreset = validPresets.includes(
        rawMat as DomainMaterialPreset
      )
        ? (rawMat as DomainMaterialPreset)
        : 'cobalt-glass';
      return {
        ok: true,
        action: {
          type: 'update_domain_material',
          target,
          materialPreset,
        },
      };
    }

    case 'amend_screen_element': {
      const elementId = String(params.elementId || 'header-banner').trim();
      const rawOp = String(params.operation || 'set_text').toLowerCase();
      const operation: 'set_text' | 'set_filter' | 'highlight' | 'switch_view' =
        rawOp === 'set_filter' || rawOp === 'highlight' || rawOp === 'switch_view'
          ? rawOp
          : 'set_text';
      const value = String(params.value || '');
      return {
        ok: true,
        action: {
          type: 'amend_screen_element',
          elementId,
          operation,
          value,
        },
      };
    }

    case 'workspace_sync': {
      const rawSvc = String(params.service || 'gmail').toLowerCase();
      const service: 'gmail' | 'calendar' | 'drive' | 'docs' | 'sheets' | 'meet' =
        rawSvc === 'calendar' ||
        rawSvc === 'drive' ||
        rawSvc === 'docs' ||
        rawSvc === 'sheets' ||
        rawSvc === 'meet'
          ? rawSvc
          : 'gmail';
      const rawAct = String(params.action || 'open').toLowerCase();
      const action: 'open' | 'refresh' | 'draft' | 'create_meet' =
        rawAct === 'refresh' || rawAct === 'draft' || rawAct === 'create_meet'
          ? rawAct
          : 'open';
      return {
        ok: true,
        action: {
          type: 'workspace_sync',
          service,
          action,
          query: params.query ? String(params.query) : undefined,
        },
      };
    }

    case 'open_project_tube': {
      const act = String(params.action || 'open').toLowerCase() as
        | 'open'
        | 'close'
        | 'focus_tile'
        | 'fullview';
      const projectId = params.projectId
        ? resolveProjectId(String(params.projectId)) || String(params.projectId)
        : undefined;
      const tileIndex = typeof params.tileIndex === 'number' ? params.tileIndex : undefined;
      return {
        ok: true,
        action: { type: 'project_media_tube', action: act, projectId, tileIndex },
      };
    }

    case 'dispatch_ui_action': {
      const actionId = String(params.actionId || params.action || '').trim();
      const payload =
        params.payload && typeof params.payload === 'object'
          ? (params.payload as Record<string, unknown>)
          : params;
      return mapCanonicalActionIdToWorkspaceAction(actionId, payload);
    }

    default: {
      if (name.includes('.')) {
        return mapCanonicalActionIdToWorkspaceAction(name, params);
      }
      return { ok: false, error: `Unsupported tool call: ${toolName}` };
    }
  }
}

export function mapCanonicalActionIdToWorkspaceAction(
  actionId: string,
  params: Record<string, unknown> = {}
): { ok: boolean; action?: WorkspaceAction; error?: string } {
  const id = String(actionId || '').trim().toLowerCase();
  switch (id) {
    case 'auth.sign_in':
      return {
        ok: true,
        action: { type: 'trigger_cta', ctaId: 'gate-key-9', spokenReason: 'Unlocking Gate 3939' },
      };
    case 'boot.skip':
      return {
        ok: true,
        action: { type: 'trigger_cta', ctaId: 'loader-take-off', spokenReason: 'Take off bypass' },
      };
    case 'voice.connect':
      return {
        ok: true,
        action: { type: 'trigger_cta', ctaId: 'connect-elevenlabs-btn', spokenReason: 'Connecting voice' },
      };
    case 'audience.set_presentation_mode': {
      const mode = String(params.mode || 'owner').toLowerCase();
      const ctaId =
        mode.includes('public')
          ? 'privacy-public'
          : mode.includes('partner')
          ? 'privacy-partner'
          : 'privacy-owner-only';
      return { ok: true, action: { type: 'trigger_cta', ctaId } };
    }
    case 'tour.start':
      return {
        ok: true,
        action: {
          type: 'tour_control',
          action: 'start',
          mode: (params.mode as TourMode) || 'full-18-screen',
        },
      };
    case 'tour.pause':
      return { ok: true, action: { type: 'tour_control', action: 'pause' } };
    case 'tour.resume':
      return { ok: true, action: { type: 'tour_control', action: 'resume' } };
    case 'tour.next':
      return { ok: true, action: { type: 'step_tour', directionOrScreen: 'next' } };
    case 'tour.previous':
      return { ok: true, action: { type: 'step_tour', directionOrScreen: 'prev' } };
    case 'tour.stop':
      return { ok: true, action: { type: 'tour_control', action: 'stop' } };
    case 'briefing.open':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'briefing' } };
    case 'briefing.inspect_source':
      return {
        ok: true,
        action: { type: 'trigger_cta', ctaId: 'briefing-approve-chk-seven-pack' },
      };
    case 'projects.open':
      return { ok: true, action: { type: 'open_station', station: 'projects' } };
    case 'projects.filter':
      return {
        ok: true,
        action: {
          type: 'amend_screen_element',
          elementId: 'portfolio-filter',
          operation: 'set_filter',
          value: String(params.filter || 'Waiting on 39'),
        },
      };
    case 'project.open': {
      const pid = resolveProjectId(String(params.projectId || 'SEVEN')) || 'SEVEN';
      return { ok: true, action: { type: 'focus_project', projectId: pid } };
    }
    case 'project.select_tab': {
      const pid = resolveProjectId(String(params.projectId || 'SEVEN')) || 'SEVEN';
      return {
        ok: true,
        action: {
          type: 'focus_project',
          projectId: pid,
          tab: (params.tab as ProjectWorkspaceTab) || 'decisions',
        },
      };
    }
    case 'project.open_tube': {
      const pid = params.projectId ? resolveProjectId(String(params.projectId)) || undefined : undefined;
      return {
        ok: true,
        action: {
          type: 'project_media_tube',
          action: (params.action as 'open' | 'close' | 'focus_tile' | 'fullview') || 'open',
          projectId: pid,
          tileIndex: typeof params.tileIndex === 'number' ? params.tileIndex : undefined,
        },
      };
    }
    case 'tasks.open':
      return { ok: true, action: { type: 'open_station', station: 'tasks' } };
    case 'tasks.filter':
    case 'task.inspect':
      return { ok: true, action: { type: 'trigger_cta', ctaId: 'task-filter-Blocked' } };
    case 'insights.open':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'insights' } };
    case 'insight.inspect':
      return { ok: true, action: { type: 'trigger_cta', ctaId: 'insight-inspect-blocked' } };
    case 'gmail.open':
    case 'gmail.select_thread':
      return { ok: true, action: { type: 'workspace_sync', service: 'gmail', action: 'open' } };
    case 'gmail.prepare_draft':
      return { ok: true, action: { type: 'trigger_cta', ctaId: 'gmail-two-tap-arm' } };
    case 'calendar.open':
    case 'calendar.set_view':
    case 'calendar.inspect_event':
      return { ok: true, action: { type: 'workspace_sync', service: 'calendar', action: 'open' } };
    case 'files.open':
      return { ok: true, action: { type: 'open_station', station: 'files' } };
    case 'files.search':
      return {
        ok: true,
        action: { type: 'search_files', query: String(params.query || 'Tabuk') },
      };
    case 'file.open':
    case 'document.go_to_page':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'file-viewer' } };
    case 'media.open':
    case 'media.filter':
      return { ok: true, action: { type: 'open_station', station: 'media' } };
    case 'media.zoom':
      return { ok: true, action: { type: 'media_control', action: 'fullscreen_enter' } };
    case 'media.close':
      return { ok: true, action: { type: 'media_control', action: 'fullscreen_exit' } };
    case 'media.next':
      return { ok: true, action: { type: 'media_control', action: 'next' } };
    case 'media.previous':
      return { ok: true, action: { type: 'media_control', action: 'prev' } };
    case 'video.play':
      return { ok: true, action: { type: 'media_control', action: 'play' } };
    case 'video.pause':
      return { ok: true, action: { type: 'media_control', action: 'pause' } };
    case 'video.seek':
      return {
        ok: true,
        action: {
          type: 'media_control',
          action: 'seek',
          seekSeconds: Number(params.seekSeconds || 10),
        },
      };
    case 'video.set_volume':
      return {
        ok: true,
        action: {
          type: 'media_control',
          action: Number(params.volume ?? 1) === 0 ? 'mute' : 'unmute',
        },
      };
    case 'people.open':
      return { ok: true, action: { type: 'open_station', station: 'people' } };
    case 'person.inspect':
      return {
        ok: true,
        action: {
          type: 'select_person',
          personId: resolvePersonId(String(params.personId || 'p-39')) || 'p-39',
        },
      };
    case 'raci.open':
      return {
        ok: true,
        action: {
          type: 'get_raci',
          projectId: resolveProjectId(String(params.projectId || 'SEVEN')) || 'SEVEN',
        },
      };
    case 'crew.open':
    case 'crew.inspect_stream':
    case 'crew.prepare_draft':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'crew' } };
    case 'planning.open':
    case 'planning.select_tab':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'kinzo' } };
    case 'bots.open':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'baghira' } };
    case 'settings.open':
    case 'settings.set_motion':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'settings' } };
    case 'hands.request_enable':
    case 'hands.disable':
      return { ok: true, action: { type: 'trigger_cta', ctaId: 'settings-hands-toggle' } };
    case 'sphere.switch':
      return {
        ok: true,
        action: {
          type: 'switch_sphere',
          sphere: String(params.sphere || 'cde').toLowerCase() === 'hq' ? 'hq' : 'cde',
        },
      };
    case 'dimension.open':
      return {
        ok: true,
        action: {
          type: 'open_dimension',
          dimension: (params.dimension as CdeDimensionId) || 'strategy',
        },
      };
    case 'chapter.open':
      return {
        ok: true,
        action: { type: 'open_chapter', chapterIndex: Number(params.chapterIndex || 1) },
      };
    case 'domains.open':
    case 'domain.prepare':
      return { ok: true, action: { type: 'open_panel', action: 'open', panel: 'cde-explorer' } };
    case 'domain.create':
      return {
        ok: true,
        action: {
          type: 'create_domain',
          name: String(params.name || 'New Orbital Domain'),
          sphere: String(params.sphere || 'hq').toLowerCase() === 'cde' ? 'cde' : 'hq',
          colour: String(params.colour || '#4C8DFF'),
          parentNodeId: String(params.parentNodeId || 'projects'),
        },
      };
    case 'domain.set_material':
      return {
        ok: true,
        action: {
          type: 'update_domain_material',
          target: String(params.target || 'hq'),
          materialPreset: (params.materialPreset as DomainMaterialPreset) || 'cobalt-glass',
        },
      };
    case 'workspace.restore':
    case 'checkpoint.restore':
    case 'checkpoint.save':
      return { ok: true, action: { type: 'trigger_cta', ctaId: 'settings-restore-cp04' } };
    case 'workspace.back':
      return { ok: true, action: { type: 'navigate_back' } };
    case 'panel.minimize':
      return {
        ok: true,
        action: {
          type: 'open_panel',
          action: 'minimize',
          panel: params.panel ? String(params.panel) : undefined,
        },
      };
    case 'panel.restore':
      return {
        ok: true,
        action: {
          type: 'open_panel',
          action: 'restore',
          panel: params.panel ? String(params.panel) : undefined,
        },
      };
    case 'panel.close':
      return {
        ok: true,
        action: {
          type: 'open_panel',
          action: 'close',
          panel: params.panel ? String(params.panel) : undefined,
        },
      };
    case 'ui.focus':
      return {
        ok: true,
        action: {
          type: 'trigger_cta',
          ctaId: String(params.targetId || params.ctaId || 'voice-stop'),
        },
      };
    default:
      return { ok: false, error: `Unknown canonical actionId: ${actionId}` };
  }
}

/**
 * Parse natural language voice/text command (English & Egyptian Masri/Arabic) into a typed WorkspaceAction.
 * Strictly disambiguates Projects vs. Showreels.
 */
export function parseNaturalLanguageIntent(rawInput: string): WorkspaceAction | null {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  // 0. Direct canonical cerebro-ui/4 actionId or 3D Media Tube command
  if (
    lower === 'project.open_tube' ||
    lower.includes('open_project_tube') ||
    lower.includes('3d media tube') ||
    lower.includes('open media tube') ||
    lower.includes('media tube')
  ) {
    if (lower.includes('close')) {
      return { type: 'project_media_tube', action: 'close' };
    }
    return { type: 'project_media_tube', action: 'open' };
  }
  if (/^[a-z_]+\.[a-z_]+$/i.test(trimmed)) {
    const mapped = mapCanonicalActionIdToWorkspaceAction(trimmed, {});
    if (mapped.ok && mapped.action) {
      return mapped.action;
    }
  }

  // 1. Back Navigation
  if (
    lower === 'back' ||
    lower === 'go back' ||
    lower === 'navigate back' ||
    lower.includes('ارجع ورا') ||
    lower === 'رجوع'
  ) {
    return { type: 'navigate_back' };
  }

  // 2. Tour & Live CTA Controls (18-Screen Wireframe v1.1 + CTA Choreographer)
  const triggerCtaMatch = trimmed.match(/^trigger_cta\(([^,)]+)(?:,\s*(.+))?\)$/i);
  if (triggerCtaMatch) {
    const ctaId = triggerCtaMatch[1].replace(/['"]/g, '').trim();
    const spokenReason = triggerCtaMatch[2]?.replace(/['"]/g, '').trim();
    return { type: 'trigger_cta', ctaId, spokenReason };
  }

  const stepTourCallMatch = trimmed.match(/^step_tour\(([^)]+)\)$/i);
  if (stepTourCallMatch) {
    return {
      type: 'step_tour',
      directionOrScreen: stepTourCallMatch[1].replace(/['"]/g, '').trim(),
    };
  }

  const screenJumpMatch = lower.match(/\b(go to|jump to|open|step to|tour)\s+(s0[1-9]|s1[0-8])\b/i);
  if (screenJumpMatch) {
    return {
      type: 'step_tour',
      directionOrScreen: screenJumpMatch[2].toUpperCase(),
    };
  }

  if (
    lower.includes('stop_tour') ||
    lower.includes('stop tour') ||
    lower.includes('end tour') ||
    lower.includes('exit tour') ||
    lower.includes('وقف التور') ||
    lower.includes('وقف الجولة') ||
    lower.includes('انهي الجولة')
  ) {
    return { type: 'tour_control', action: 'stop' };
  }
  if (
    lower.includes('pause_tour') ||
    lower.includes('pause tour') ||
    lower.includes('pause the tour') ||
    lower.includes('وقف مؤقت')
  ) {
    return { type: 'tour_control', action: 'pause' };
  }
  if (
    lower.includes('resume_tour') ||
    lower.includes('resume tour') ||
    lower.includes('resume the tour') ||
    lower === 'resume' ||
    lower.includes('كمل الجولة')
  ) {
    return { type: 'tour_control', action: 'resume' };
  }
  if (
    lower.includes('next stop') ||
    lower.includes('next screen') ||
    lower.includes('tour next') ||
    lower.includes('المحطة الجاية') ||
    lower.includes('الشاشة الجاية')
  ) {
    return { type: 'step_tour', directionOrScreen: 'next' };
  }
  if (
    lower.includes('prev stop') ||
    lower.includes('previous stop') ||
    lower.includes('prev screen') ||
    lower.includes('previous screen') ||
    lower.includes('tour back')
  ) {
    return { type: 'step_tour', directionOrScreen: 'prev' };
  }
  if (lower.includes('tour hq') || lower.includes('hq tour') || lower.includes('hq-ops')) {
    return { type: 'tour_control', action: 'start', mode: 'hq-ops' };
  }
  if (lower.includes('tour cde') || lower.includes('cde tour') || lower.includes('cde-bio')) {
    return { type: 'tour_control', action: 'start', mode: 'cde-bio' };
  }
  if (
    lower.includes('executive tour') ||
    lower.includes('fast tour') ||
    lower.includes('quick tour') ||
    lower.includes('executive-fast')
  ) {
    return { type: 'tour_control', action: 'start', mode: 'executive-fast' };
  }
  if (
    lower === 'tour' ||
    lower.includes('start_tour') ||
    lower.includes('start tour') ||
    lower.includes('take a tour') ||
    lower.includes('give me a tour') ||
    lower.includes('tour the wireframe') ||
    lower.includes('18-screen tour') ||
    lower.includes('18 screen tour') ||
    lower.includes('guided tour') ||
    lower.includes('ابدأ الجولة') ||
    lower.includes('خدني في جولة')
  ) {
    return { type: 'tour_control', action: 'start', mode: 'full-18-screen' };
  }

  // Natural-language CTA triggers ("click Inspect on Blocked", "switch to the Decisions tab", "confirm send", etc.)
  if (lower.includes('inspect') && lower.includes('blocked')) {
    return {
      type: 'trigger_cta',
      ctaId: 'insight-inspect-blocked',
      spokenReason: 'Inspecting Blocked signal in #FF5666.',
    };
  }
  if (lower.includes('switch to') && lower.includes('decision') && lower.includes('tab')) {
    return {
      type: 'trigger_cta',
      ctaId: 'project-tab-Decisions',
      spokenReason: 'Switching to Decisions tab.',
    };
  }
  if (lower.includes('confirm send')) {
    return {
      type: 'trigger_cta',
      ctaId: 'gmail-two-tap-confirm',
      spokenReason: 'Confirming Two-Tap Gmail send.',
    };
  }
  if (lower.includes('arm send') || (lower.includes('readback') && lower.includes('send'))) {
    return {
      type: 'trigger_cta',
      ctaId: 'gmail-two-tap-arm',
      spokenReason: 'Arming Two-Tap Gmail readback.',
    };
  }
  if (lower.includes('confirm create') && lower.includes('calendar')) {
    return {
      type: 'trigger_cta',
      ctaId: 'calendar-confirm-create',
      spokenReason: 'Confirming Two-Tap Calendar event creation.',
    };
  }
  if (lower.includes('approve draft') && lower.includes('crew')) {
    return {
      type: 'trigger_cta',
      ctaId: 'crew-approve-draft',
      spokenReason: 'Approving Crew live SSE draft.',
    };
  }
  if (lower.includes('make this a task')) {
    return {
      type: 'trigger_cta',
      ctaId: 'zebda-make-this-a-task',
      spokenReason: 'Triggering Zebda Make this a task CTA.',
    };
  }

  // 3. Camera Controls (Lenses, Angles, Loops, Orbit, Pan, Tilt, Zoom, Reset, Stop)
  if (
    lower === 'stop' ||
    lower === 'stop camera' ||
    lower === 'stop loop' ||
    lower === 'camera(stop)' ||
    lower === 'stop spin' ||
    lower === 'freeze' ||
    lower.includes('وقف الكاميرا') ||
    lower.includes('ثبت الكاميرا')
  ) {
    return { type: 'camera', verb: 'stop' };
  }

  // Ongoing Kinematic Loop Modes
  if (
    lower.includes('figure 8') ||
    lower.includes('figure-8') ||
    lower.includes('lemniscate') ||
    lower.includes('infinity loop') ||
    lower.includes('figure eight')
  ) {
    return { type: 'camera', verb: 'set_loop', loopMode: 'lemniscate' };
  }
  if (lower.includes('helix loop') || lower.includes('corkscrew') || lower === 'helix') {
    return { type: 'camera', verb: 'set_loop', loopMode: 'helix' };
  }
  if (
    lower.includes('vertigo') ||
    lower.includes('dolly zoom') ||
    lower.includes('dolly-zoom') ||
    lower.includes('hitchcock')
  ) {
    return { type: 'camera', verb: 'set_loop', loopMode: 'vertigo' };
  }
  if (lower.includes('macro orbit') || lower.includes('macro loop')) {
    return { type: 'camera', verb: 'set_loop', loopMode: 'macro_orbit' };
  }

  // 10 Numeric Camera Angle Presets
  if (
    lower.includes("god's eye") ||
    lower.includes('gods eye') ||
    lower.includes('gods_eye') ||
    lower.includes('top down angle')
  ) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'gods_eye' };
  }
  if (lower.includes('high crane') || lower.includes('high_crane') || lower.includes('crane shot')) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'high_crane' };
  }
  if (lower.includes('eye horizon') || lower.includes('eye_horizon') || lower.includes('eye level')) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'eye_horizon' };
  }
  if (
    lower.includes('low hero') ||
    lower.includes('hero low') ||
    lower.includes('low_hero') ||
    lower.includes('hero angle')
  ) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'low_hero' };
  }
  if (lower.includes('nadir') || lower.includes('nadir_up')) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'nadir_up' };
  }
  if (
    lower.includes('dutch angle') ||
    lower.includes('dutch cant') ||
    lower.includes('dutch_cant') ||
    lower.includes('dutch 14')
  ) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'dutch_cant' };
  }
  if (
    lower.includes('over the shoulder') ||
    lower.includes('ots_core') ||
    lower.includes('ots angle')
  ) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'ots_core' };
  }
  if (lower.includes('macro close') || lower.includes('macro_close')) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'macro_close' };
  }
  if (
    lower.includes('interior dome') ||
    lower.includes('interior_dome') ||
    lower.includes('inside dome') ||
    lower.includes('inside sphere')
  ) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'interior_dome' };
  }
  if (lower.includes('tele bridge') || lower.includes('tele_bridge')) {
    return { type: 'camera', verb: 'set_angle', anglePreset: 'tele_bridge' };
  }

  // Physical Cinema Lens Presets (5mm to 300mm + 100mm Macro)
  if (lower.includes('5mm') || lower.includes('fisheye')) {
    return { type: 'camera', verb: 'set_lens', lensId: '5mm' };
  }
  if (lower.includes('14mm') || lower.includes('ultra wide') || lower.includes('ultra-wide')) {
    return { type: 'camera', verb: 'set_lens', lensId: '14mm' };
  }
  if (lower.includes('24mm') || lower.includes('anamorphic')) {
    return { type: 'camera', verb: 'set_lens', lensId: '24mm' };
  }
  if (lower.includes('35mm') || lower.includes('master prime')) {
    return { type: 'camera', verb: 'set_lens', lensId: '35mm' };
  }
  if (lower.includes('50mm') || lower.includes('spherical prime')) {
    return { type: 'camera', verb: 'set_lens', lensId: '50mm' };
  }
  if (lower.includes('85mm') || lower.includes('portrait lens')) {
    return { type: 'camera', verb: 'set_lens', lensId: '85mm' };
  }
  if (
    lower.includes('100mm') ||
    lower.includes('macro lens') ||
    lower.includes('macro mode') ||
    lower === 'macro'
  ) {
    return { type: 'camera', verb: 'set_lens', lensId: '100mm-macro' };
  }
  if (lower.includes('135mm')) {
    return { type: 'camera', verb: 'set_lens', lensId: '135mm' };
  }
  if (lower.includes('200mm')) {
    return { type: 'camera', verb: 'set_lens', lensId: '200mm' };
  }
  if (lower.includes('300mm') || lower.includes('super telephoto') || lower.includes('telephoto lens')) {
    return { type: 'camera', verb: 'set_lens', lensId: '300mm' };
  }

  if (
    lower.includes('camera(center)') ||
    lower.includes('reset camera') ||
    lower === 'center' ||
    lower === 'home' ||
    lower.includes('هاتها في النص') ||
    lower.includes('رجع الكاميرا')
  ) {
    return { type: 'camera', verb: 'center' };
  }
  if (lower.includes('pan left') || lower.includes('حرك شمال')) {
    return { type: 'camera', verb: 'pan', direction: 'left' };
  }
  if (lower.includes('pan right') || lower.includes('camera(pan)') || lower.includes('حرك يمين')) {
    return { type: 'camera', verb: 'pan', direction: 'right' };
  }
  if (lower.includes('pan up') || lower.includes('حرك فوق')) {
    return { type: 'camera', verb: 'pan', direction: 'up' };
  }
  if (lower.includes('pan down') || lower.includes('حرك تحت')) {
    return { type: 'camera', verb: 'pan', direction: 'down' };
  }
  if (lower.includes('orbit left') || lower.includes('rotate left') || lower.includes('لف شمال')) {
    return { type: 'camera', verb: 'orbit', direction: 'left' };
  }
  if (lower.includes('orbit right') || lower.includes('rotate right') || lower.includes('لف يمين')) {
    return { type: 'camera', verb: 'orbit', direction: 'right' };
  }
  if (lower.includes('tilt up') || lower.includes('ميل فوق')) {
    return { type: 'camera', verb: 'tilt', direction: 'up' };
  }
  if (lower.includes('tilt down') || lower.includes('ميل تحت')) {
    return { type: 'camera', verb: 'tilt', direction: 'down' };
  }
  if (lower.includes('max-in') || lower.includes('max_in') || lower.includes('max zoom in')) {
    return { type: 'camera', verb: 'max_in' };
  }
  if (lower.includes('max-out') || lower.includes('max_out') || lower.includes('max zoom out')) {
    return { type: 'camera', verb: 'max_out' };
  }
  if (lower.includes('zoom in') || lower.includes('zoom_in') || lower.includes('fly in') || lower.includes('قرب')) {
    return { type: 'camera', verb: 'zoom_in' };
  }
  if (lower.includes('zoom out') || lower.includes('zoom_out') || lower.includes('fly out') || lower.includes('ابعد')) {
    return { type: 'camera', verb: 'zoom_out' };
  }
  if (lower.includes('faster') || lower.includes('اسرع')) {
    return { type: 'camera', verb: 'faster' };
  }
  if (lower.includes('slower') || lower.includes('ابطأ')) {
    return { type: 'camera', verb: 'slower' };
  }
  if (lower.includes('scan') || lower.includes('auto orbit') || lower.includes('دوران تلقائي')) {
    return { type: 'camera', verb: 'scan' };
  }

  // 4. Disambiguate Project vs Showreel BEFORE generic media or project checks
  const mentionsShowreelOrVideo =
    lower.includes('showreel') ||
    lower.includes('open_showreel') ||
    lower.includes('reel') ||
    lower.includes('video') ||
    lower.includes('فيديو') ||
    lower.includes('شوريل') ||
    lower.includes('عرض');

  const mentionsProjectExplicitly =
    lower.includes('project') ||
    lower.includes('focus_project') ||
    lower.includes('get_project') ||
    lower.includes('مشروع') ||
    lower.includes('workspace') ||
    lower.includes('tab') ||
    lower.includes('reviews') ||
    lower.includes('decisions') ||
    lower.includes('checkpoints') ||
    lower.includes('minutes') ||
    lower.includes('tasks');

  let requestedTab: ProjectWorkspaceTab | undefined;
  if (lower.includes('review') || lower.includes('decision') || lower.includes('checkpoint')) {
    requestedTab = 'decisions';
  } else if (lower.includes('task') || lower.includes('مهام')) {
    requestedTab = 'tasks';
  } else if (lower.includes('minute') || lower.includes('meeting note') || lower.includes('محضر')) {
    requestedTab = 'minutes';
  } else if (lower.includes('file') || lower.includes('ملفات')) {
    requestedTab = 'files';
  } else if (lower.includes('team') || lower.includes('فريق')) {
    requestedTab = 'team';
  } else if (lower.includes('overview')) {
    requestedTab = 'overview';
  }

  // RACI check before general project match
  if (
    lower.includes('get_raci') ||
    lower.includes('accountable') ||
    lower.includes('raci') ||
    lower.includes('مين مسؤول') ||
    lower.includes('مين المسؤول')
  ) {
    const targetProj = lower.includes('mhe') || lower.includes('hamdan')
      ? 'MHE'
      : lower.includes('yah') || lower.includes('young')
      ? 'YAH'
      : lower.includes('bsocial')
      ? 'BSOCIAL'
      : 'SEVEN';
    return { type: 'get_raci', projectId: targetProj };
  }

  const matchedProject =
    lower.includes('el batron') || lower.includes('el-batron') || lower.includes('batron') || lower.includes('باترون')
      ? 'EL-BATRON'
      : lower.includes('seven') || lower.includes('سفن')
      ? 'SEVEN'
      : lower.includes('young and human') || lower.includes('young & human') || lower.includes('yah')
      ? 'YAH'
      : lower.includes('abu hamdan') || lower.includes('alhamdan') || lower.includes('mhe') || lower.includes('حمدان')
      ? 'MHE'
      : lower.includes('bsocial') || lower.includes('b-social')
      ? 'BSOCIAL'
      : lower.includes('al-ahram') || lower.includes('ahram')
      ? 'AL-AHRAM'
      : lower.includes('museum of almost')
      ? 'MUSEUM-OF-ALMOST'
      : lower.includes('gondwana')
      ? 'GONDWANA'
      : null;

  if (matchedProject) {
    if (mentionsShowreelOrVideo && !mentionsProjectExplicitly) {
      const reelMap: Record<string, string> = {
        SEVEN: 'med-seven-reel',
        'EL-BATRON': 'med-el-batron',
        YAH: 'med-yah-highlight',
      };
      return {
        type: 'media_control',
        action: 'select',
        reelId: reelMap[matchedProject] || 'med-mission-lotus',
      };
    }
    return { type: 'focus_project', projectId: matchedProject, tab: requestedTab };
  }

  // 5. Media & Showreel Controls
  if (lower.includes('carousel_control(next)') || lower.includes('next reel') || lower.includes('next video')) {
    return { type: 'media_control', action: 'next' };
  }
  if (lower.includes('carousel_control(prev)') || lower.includes('prev reel') || lower.includes('previous reel')) {
    return { type: 'media_control', action: 'prev' };
  }
  if (lower.includes('pause video') || lower.includes('pause reel') || lower.includes('pause media')) {
    return { type: 'media_control', action: 'pause' };
  }
  if (lower.includes('play video') || lower.includes('play reel') || lower.includes('play showreel') || lower.includes('play_media')) {
    return { type: 'media_control', action: 'play' };
  }
  if (lower.includes('mute video') || lower.includes('mute media')) {
    return { type: 'media_control', action: 'mute' };
  }
  if (lower.includes('unmute video') || lower.includes('unmute media')) {
    return { type: 'media_control', action: 'unmute' };
  }
  if (lower.includes('exit fullscreen') || lower.includes('close fullscreen')) {
    return { type: 'media_control', action: 'fullscreen_exit' };
  }
  if (lower.includes('fullscreen')) {
    return { type: 'media_control', action: 'fullscreen_enter' };
  }
  if (
    lower.includes('open_showreel') ||
    lower.includes('showreel') ||
    lower.includes('my work') ||
    lower.includes('mission lotus') ||
    lower.includes('laliga')
  ) {
    const reelId = lower.includes('laliga')
      ? 'med-laliga'
      : lower.includes('lotus')
      ? 'med-mission-lotus'
      : undefined;
    return { type: 'media_control', action: 'select', reelId };
  }

  // 6. Story Chapters
  const chapMatch = lower.match(/open_chapter\((\d)\)/) || lower.match(/chapter\s*(\d)/);
  if (
    chapMatch ||
    lower.includes('story journey') ||
    lower.includes('tarek bio') ||
    lower.includes('company profile')
  ) {
    const idx = chapMatch ? Math.max(1, Math.min(8, parseInt(chapMatch[1], 10))) : 1;
    return { type: 'open_chapter', chapterIndex: idx };
  }

  // 7. CDE Subdomains & Dimensions
  for (const dim of CDE_DIMENSIONS) {
    for (const sub of dim.subdomains) {
      if (lower.includes(sub.id.toLowerCase()) || lower.includes(sub.name.toLowerCase())) {
        return { type: 'open_subdomain', subdomainId: sub.id };
      }
    }
  }
  if (lower.includes('strategy') || lower.includes('الاستراتيجية')) {
    return { type: 'open_dimension', dimension: 'strategy' };
  }
  if (lower.includes('production') || lower.includes('الإنتاج')) {
    return { type: 'open_dimension', dimension: 'production' };
  }
  if (lower.includes('talent') || lower.includes('المواهب')) {
    return { type: 'open_dimension', dimension: 'talent' };
  }
  if (lower.includes('mediatech') || lower.includes('media tech') || lower.includes('تكنولوجيا الإعلام')) {
    return { type: 'open_dimension', dimension: 'mediatech' };
  }

  // 8. People Inspection
  if (lower.includes('select person') || lower.includes('inspect person') || lower.includes('shweekar') || lower.includes('baghira') || lower.includes('kinzo') || lower.includes('rasma') || lower.includes('khalid')) {
    const pid = resolvePersonId(lower);
    if (pid) return { type: 'select_person', personId: pid };
  }

  // 9. Dashboard / Overview Pockets
  if (lower.includes('open_dashboard') || lower.includes('open dashboard') || lower.includes('overview pockets')) {
    const mode = lower.includes('expanded')
      ? 'expanded'
      : lower.includes('collapsed')
      ? 'collapsed'
      : 'toggle';
    return { type: 'open_dashboard', mode };
  }

  // 10. File Search
  if (lower.includes('search_files') || lower.startsWith('search files')) {
    const match = rawInput.match(/search_files\(([^)]+)\)/i);
    const query = match
      ? match[1].replace(/['"]/g, '')
      : rawInput.replace(/search[_\s]files/i, '').trim() || 'Tabuk';
    return { type: 'search_files', query };
  }

  // 11. Panels & Stations
  if (
    lower.includes('close_panel') ||
    lower.includes('close panel') ||
    lower.includes('قفل البانل') ||
    lower.includes('اقفل اللوحة')
  ) {
    return { type: 'open_panel', action: 'close_all' };
  }
  if (lower.includes('decisions') || lower.includes('checkpoints') || lower.includes('reviews') || lower.includes('h02')) {
    return { type: 'open_panel', action: 'open', panel: 'decisions' };
  }
  if (lower.includes('team-room') || lower.includes('team room') || lower === 'team' || lower.includes('c2')) {
    return { type: 'open_panel', action: 'open', panel: 'team-room' };
  }
  if (lower.includes('minutes') || lower.includes('meeting notes') || lower.includes('g4')) {
    return { type: 'open_panel', action: 'open', panel: 'minutes' };
  }
  if (lower.includes('timeline') || lower.includes('h04')) {
    return { type: 'open_panel', action: 'open', panel: 'timeline' };
  }
  if (lower.includes('insights') || lower.includes('i1')) {
    return { type: 'open_panel', action: 'open', panel: 'insights' };
  }
  if (lower.includes('settings') || lower.includes('x1')) {
    return { type: 'open_panel', action: 'open', panel: 'settings' };
  }
  if (lower.includes('open_panel(build)') || lower === '/build' || lower === 'development' || lower.includes('build tracker')) {
    return { type: 'open_panel', action: 'open', panel: 'build' };
  }

  if (
    lower.includes('open_station(projects)') ||
    lower.includes('open projects') ||
    lower.includes('هات المشاريع') ||
    lower.includes('افتح المشاريع') ||
    lower.includes('وريني المشاريع')
  ) {
    return { type: 'open_station', station: 'projects' };
  }
  if (
    lower.includes('open_station(tasks)') ||
    lower.includes('open tasks') ||
    lower.includes('المهام') ||
    lower.includes('افتح المهام') ||
    lower.includes('ايه اللي ورايا')
  ) {
    return { type: 'open_station', station: 'tasks' };
  }
  if (
    lower.includes('open_station(people)') ||
    lower.includes('open people') ||
    lower.includes('الفريق')
  ) {
    return { type: 'open_station', station: 'people' };
  }
  if (
    lower.includes('open_station(files)') ||
    lower.includes('open files') ||
    lower.includes('الملفات')
  ) {
    return { type: 'open_station', station: 'files' };
  }
  if (
    lower.includes('open_station(media)') ||
    lower.includes('open media') ||
    lower.includes('الوسائط')
  ) {
    return { type: 'open_station', station: 'media' };
  }

  // 12. Sphere Switch
  if (
    lower.includes('switch_sphere(cde)') ||
    lower.includes('take me to cde') ||
    lower.includes('to cde') ||
    lower.includes('وديني cde') ||
    lower === 'cde'
  ) {
    return { type: 'switch_sphere', sphere: 'cde' };
  }
  if (
    lower.includes('switch_sphere(hq)') ||
    lower.includes('back to hq') ||
    lower.includes('to hq') ||
    lower.includes('ارجع hq') ||
    lower === 'hq'
  ) {
    return { type: 'switch_sphere', sphere: 'hq' };
  }

  if (lower.includes('get_briefing') || lower.includes('briefing')) {
    return { type: 'get_briefing' };
  }
  if (lower.includes('get_page_state')) {
    return { type: 'get_page_state' };
  }

  return null;
}

export function auditToolRegistry(): ToolAuditEntry[] {
  const sampleParams: Record<string, Record<string, unknown>> = {
    switch_sphere: { sphere: 'cde' },
    open_station: { station: 'projects' },
    focus_project: { projectId: 'EL-BATRON', tab: 'overview' },
    select_person: { personId: 'p-39' },
    get_raci: { projectId: 'SEVEN' },
    open_dimension: { dimension: 'strategy' },
    open_subdomain: { subdomainId: 'sub-dest' },
    open_chapter: { chapterIndex: 1 },
    open_panel: { action: 'open', panel: 'decisions' },
    open_dashboard: { mode: 'collapsed' },
    navigate_back: {},
    camera: { verb: 'pan', direction: 'left', amount: 1 },
    media_control: { action: 'select', reelId: 'med-seven-reel' },
    search_files: { query: 'Tabuk' },
    tour_control: { action: 'start', mode: 'full-18-screen' },
    start_tour: { mode: 'full-18-screen' },
    step_tour: { directionOrScreen: 'next' },
    trigger_cta: { ctaId: 'insight-inspect-blocked', spokenReason: 'Inspect Blocked signal' },
    checkpoint_action: { checkpointId: 'chk-rasma-blueprint', decision: 'Approve' },
    get_briefing: {},
    get_page_state: {},
    create_domain: { name: 'Riyadh AI Lab', sphere: 'hq', colour: '#4C8DFF' },
    update_domain_material: { target: 'hq', materialPreset: 'cobalt-glass' },
    amend_screen_element: {
      elementId: 'portfolio-filter',
      operation: 'set_filter',
      value: 'Waiting on 39',
    },
    workspace_sync: { service: 'gmail', action: 'open' },
    open_project_tube: { projectId: 'SEVEN', action: 'open' },
    dispatch_ui_action: { actionId: 'project.open_tube', targetId: 'project-open-tube' },
  };

  return CRO_CDE_GOOGLE_TOOLS_SCHEMA.map((tool) => {
    const sample = sampleParams[tool.name] || {};
    const parsed = parseStructuredToolCall(tool.name, sample);
    const required =
      'required' in tool.parameters && Array.isArray(tool.parameters.required)
        ? [...tool.parameters.required]
        : [];
    return {
      toolName: tool.name,
      schemaDefined: Boolean(tool.name && tool.parameters),
      handlerImplemented: parsed.ok && Boolean(parsed.action),
      requiredParams: required,
      status: parsed.ok && parsed.action ? 'VERIFIED' : 'MISMATCH',
    };
  });
}

export function buildNodeSelectionAction(
  nodeId: string,
  nodeType: 'core' | 'station' | 'dimension' | 'subdomain' | 'project',
  _sphere: 'hq' | 'cde'
): WorkspaceAction {
  if (nodeType === 'station') {
    return { type: 'open_station', station: nodeId as StationId };
  }
  if (nodeType === 'project') {
    const resolved = resolveProjectId(nodeId) || nodeId;
    return { type: 'focus_project', projectId: resolved };
  }
  if (nodeType === 'dimension') {
    return { type: 'open_dimension', dimension: nodeId as CdeDimensionId };
  }
  if (nodeType === 'subdomain') {
    return { type: 'open_subdomain', subdomainId: nodeId };
  }
  return { type: 'camera', verb: 'center' };
}

