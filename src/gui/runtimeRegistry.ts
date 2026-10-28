/**
 * CEREBRO + CDE / Stellar Command — Unified GUI, Voice, Tour & 3D Amendment v4.0
 * Live RuntimeUIRegistry (`cerebro-ui/4`), Canonical 70-Action Contract & ActionReceipt Engine
 */

import { GuiRect, intersectionArea } from './CollisionManager';

export const CEREBRO_UI_SCHEMA_V4 = 'cerebro-ui/4' as const;
export const CEREBRO_MANIFEST_VERSION = '4.0.0' as const;
export const CEREBRO_BUILD_ID = 'cro-cde-v4.0.0' as const;

export const CANONICAL_ACTION_IDS = [
  'auth.sign_in',
  'boot.skip',
  'voice.connect',
  'audience.set_presentation_mode',
  'tour.start',
  'briefing.open',
  'briefing.inspect_source',
  'projects.open',
  'projects.filter',
  'project.open',
  'project.select_tab',
  'project.open_tube',
  'tasks.open',
  'tasks.filter',
  'task.inspect',
  'insights.open',
  'insight.inspect',
  'gmail.open',
  'gmail.select_thread',
  'gmail.prepare_draft',
  'calendar.open',
  'calendar.set_view',
  'calendar.inspect_event',
  'files.open',
  'files.search',
  'file.open',
  'media.open',
  'document.go_to_page',
  'media.zoom',
  'media.close',
  'video.play',
  'video.pause',
  'video.seek',
  'people.open',
  'person.inspect',
  'raci.open',
  'crew.open',
  'crew.inspect_stream',
  'crew.prepare_draft',
  'planning.open',
  'bots.open',
  'planning.select_tab',
  'settings.open',
  'settings.set_motion',
  'hands.request_enable',
  'hands.disable',
  'sphere.switch',
  'dimension.open',
  'chapter.open',
  'domains.open',
  'domain.prepare',
  'workspace.restore',
  'tour.pause',
  'tour.resume',
  'tour.next',
  'tour.previous',
  'tour.stop',
  'ui.focus',
  'media.filter',
  'media.next',
  'media.previous',
  'video.set_volume',
  'domain.create',
  'domain.set_material',
  'panel.minimize',
  'panel.restore',
  'panel.close',
  'workspace.back',
  'checkpoint.save',
  'checkpoint.restore',
] as const;

export type CanonicalActionId = (typeof CANONICAL_ACTION_IDS)[number];

export type RuntimeTargetKind =
  | 'control'
  | 'panel'
  | 'tab'
  | 'chip'
  | 'object3d'
  | 'media_tile'
  | 'two_tap_gate'
  | 'voice_dock';

export type RuntimePermissionGate =
  | 'public_read'
  | 'partner_read'
  | 'owner_only'
  | 'two_tap_confirm'
  | 'explicit_hardware_gesture';

export interface RuntimeTargetEntry {
  targetId: string;
  kind: RuntimeTargetKind;
  screenId: string;
  label: string;
  actionIds: string[];
  mounted: boolean;
  visible: boolean;
  enabled: boolean;
  disabledReason: string | null;
  permission: RuntimePermissionGate;
  rectOrObject3DId: GuiRect | string;
  occluded: boolean;
}

export type ActionReceiptStatus =
  | 'accepted'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export interface ActionReceipt {
  actionId: string;
  runId: string;
  status: ActionReceiptStatus;
  targetId: string;
  buildId: string;
  stateVersion: number;
  observedState: Record<string, unknown>;
  errorCode?: string;
  evidence?: Record<string, unknown>;
}

export type EventDrivenTourPhase =
  | 'idle'
  | 'planning'
  | 'focusing'
  | 'travelling'
  | 'opening'
  | 'presenting'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'blocked';

export type TourControllerState = EventDrivenTourPhase;

export type ContextUpdateReason =
  | 'navigation'
  | 'panel_change'
  | 'focus_change'
  | 'media_change'
  | 'permission_change'
  | 'action_complete'
  | 'tour_pause_resume';

export interface RuntimeManifestV4 {
  schema: typeof CEREBRO_UI_SCHEMA_V4;
  buildId: string;
  manifestVersion: string;
  registryHash: string;
  stateVersion: number;
  agentIdResolved: string;
  agentBranchOrVersionWhenVerified: string | null;
  providerConnection: {
    status: string;
    liveWebSocketOpen: boolean;
    usingFallback: boolean;
    muted: boolean;
    rawTranscriptExecutesCommands: boolean;
  };
  activeScreenId: string;
  substate: {
    activeSphere: 'hq' | 'cde';
    activeProjectTab: string;
    peopleSubTab: string;
    selectedDimensionId: string;
    selectedSubdomainId: string | null;
    activeChapterIndex: number;
    dashboardCollapsed: boolean;
    projectMediaTubeOpen: boolean;
    projectMediaTubeAssetId: string | null;
  };
  selectedProjectId: string;
  focusedTargetId: string | null;
  openPanels: string[];
  panelRects: Record<string, GuiRect>;
  sceneSafeRect: GuiRect;
  cameraPose: {
    azimuthDeg: number;
    polarDeg: number;
    distance: number;
    panOffset: [number, number];
    autoOrbit: boolean;
    turnSeconds: number;
    isMoving: boolean;
  };
  cameraLens: {
    presetId: string;
    activeLensId: string;
    focalLengthMm: number;
    verticalFovDeg: number;
  };
  mediaState: {
    activeShowreelId: string | null;
    playing: boolean;
    muted: boolean;
    currentTimeSec: number;
    durationSec: number;
    fullscreenActive: boolean;
    tubeActive: boolean;
    tubeProjectId: string | null;
    tubeFocusedAssetId: string | null;
  };
  tourState: {
    active: boolean;
    paused: boolean;
    phase: EventDrivenTourPhase;
    mode: string;
    step: number;
    total: number;
    currentScreenId: string;
    minimumDwellMs: number;
    postNarrationHoldMs: number;
    safeTourPolicy: true;
  };
  availableActions: string[];
  permissions: {
    audienceLevel: string;
    ownerPinVerified: boolean;
    googleWorkspaceConnected: boolean;
    cameraMicExplicitlyGranted: boolean;
    externalMutationsRequireTwoTap: true;
  };
  dataProvenance: {
    portfolioProjects: 'seeded_local_store' | 'live_verified';
    tasksAndNotes: 'seeded_local_store' | 'live_verified';
    googleWorkspace: 'live_verified' | 'cached_snapshot';
    voiceAgent: 'live_verified' | 'simulated_fallback';
  };
  targets: RuntimeTargetEntry[];
  lastReceipt: ActionReceipt | null;
}

function computeSimpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a-${(h >>> 0).toString(16).padStart(8, '0')}`;
}

export function inferCanonicalActionIdsForTarget(ctaId: string, panelId: string): string[] {
  const id = ctaId.toLowerCase();
  if (id.includes('take-off') || id.includes('skip')) return ['boot.skip'];
  if (id.includes('privacy')) return ['audience.set_presentation_mode'];
  if (id.includes('voice-stop')) return ['tour.stop', 'video.pause'];
  if (id.includes('connect-elevenlabs')) return ['voice.connect'];
  if (id.includes('briefing')) {
    return id.includes('approve') || id.includes('inspect')
      ? ['briefing.inspect_source']
      : ['briefing.open'];
  }
  if (id.includes('portfolio-filter')) return ['projects.filter'];
  if (id.includes('project-open-tube') || id.includes('media-tube')) return ['project.open_tube'];
  if (id.includes('project-tab-')) return ['project.select_tab'];
  if (id.includes('task-')) return ['task.inspect', 'tasks.open'];
  if (id.includes('insight-')) return ['insight.inspect', 'insights.open'];
  if (id.includes('gmail-')) return ['gmail.prepare_draft', 'gmail.select_thread'];
  if (id.includes('calendar-')) return ['calendar.set_view', 'calendar.inspect_event'];
  if (id.includes('drive-') || id.includes('file-viewer')) {
    if (id.includes('zoom')) return ['media.zoom'];
    if (id.includes('page')) return ['document.go_to_page'];
    return ['file.open', 'files.search'];
  }
  if (id.includes('media-')) {
    if (id.includes('next')) return ['media.next'];
    if (id.includes('prev')) return ['media.previous'];
    if (id.includes('fullscreen')) return ['media.open'];
    return ['video.play', 'video.pause'];
  }
  if (id.includes('people-') || id.includes('crew-chip')) {
    if (id.includes('raci')) return ['raci.open'];
    return ['person.inspect', 'people.open'];
  }
  if (id.includes('crew-')) return ['crew.prepare_draft', 'crew.inspect_stream'];
  if (id.includes('baghira-')) return ['planning.select_tab', 'planning.open'];
  if (id.includes('kinzo-')) return ['bots.open'];
  if (id.includes('settings-') || id.includes('synth-note')) return ['settings.open'];
  if (id.includes('cde-dim')) return ['dimension.open'];
  if (id.includes('cde-ch')) return ['chapter.open'];
  if (id.includes('s18-spawn')) return ['domain.prepare', 'domain.create'];
  if (panelId !== 'hud') return ['ui.focus'];
  return ['ui.focus'];
}

class RuntimeUIRegistryEngine {
  private stateVersion = 1;
  private customTargets = new Map<string, RuntimeTargetEntry>();
  private receipts: ActionReceipt[] = [];
  private contextDebounceTimer: number | null = null;
  private lastContextSentAt = 0;
  private pendingReasons = new Set<ContextUpdateReason>();

  public getStateVersion(): number {
    return this.stateVersion;
  }

  public bumpStateVersion(): number {
    this.stateVersion += 1;
    return this.stateVersion;
  }

  public registerTarget(entry: RuntimeTargetEntry): void {
    this.customTargets.set(entry.targetId, entry);
  }

  public unregisterTarget(targetId: string): void {
    this.customTargets.delete(targetId);
  }

  public createReceipt(params: {
    actionId: string;
    targetId: string;
    status: ActionReceiptStatus;
    observedState: Record<string, unknown>;
    errorCode?: string;
    evidence?: Record<string, unknown>;
  }): ActionReceipt {
    this.stateVersion += 1;
    const receipt: ActionReceipt = {
      actionId: params.actionId,
      runId: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      status: params.status,
      targetId: params.targetId,
      buildId: CEREBRO_BUILD_ID,
      stateVersion: this.stateVersion,
      observedState: params.observedState,
      errorCode: params.errorCode,
      evidence: params.evidence,
    };
    this.receipts.push(receipt);
    if (this.receipts.length > 60) {
      this.receipts.shift();
    }
    return receipt;
  }

  public getLastReceipt(): ActionReceipt | null {
    return this.receipts.length > 0 ? this.receipts[this.receipts.length - 1] : null;
  }

  public getRecentReceipts(limit = 12): ActionReceipt[] {
    return this.receipts.slice(-limit);
  }

  /**
   * Scans live DOM targets (`[data-cta-id]`, `[data-ui-id]`, `button[data-testid]`) plus registered 3D objects,
   * computing real bounding rects and checking whether any floating surface occludes them.
   * Strictly read-only: never mutates DOM or application state.
   */
  public scanLiveTargets(
    activeScreenId: string,
    audienceLevel: string,
    panelRects: Record<string, GuiRect>,
    voiceRect?: GuiRect
  ): RuntimeTargetEntry[] {
    const entries: RuntimeTargetEntry[] = [];
    const seen = new Set<string>();

    // Include registered 3D targets (spheres, stations, project suns, media tube tiles)
    for (const [, t] of this.customTargets) {
      entries.push({ ...t, screenId: t.screenId || activeScreenId });
      seen.add(t.targetId);
    }

    if (typeof document === 'undefined') {
      return entries;
    }

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-ui-id], [data-cta-id], button[data-testid], [data-panel-id]'
      )
    );

    const occluderRects: GuiRect[] = [...Object.values(panelRects)];
    if (voiceRect) occluderRects.push(voiceRect);

    for (const el of elements) {
      const targetId =
        el.getAttribute('data-ui-id') ||
        el.getAttribute('data-cta-id') ||
        el.getAttribute('data-testid') ||
        el.getAttribute('data-panel-id') ||
        '';
      if (!targetId || seen.has(targetId)) continue;
      seen.add(targetId);

      const r = el.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0;
      const rect: GuiRect = {
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };

      const panelHost = el.closest('[data-panel-id]');
      const hostPanelId = panelHost?.getAttribute('data-panel-id') || 'hud';
      const isDisabled =
        (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true';
      const requiresTwoTap =
        el.getAttribute('data-requires-two-tap') === 'true' ||
        targetId.includes('two-tap') ||
        targetId.includes('confirm');

      const explicitActionAttr = el.getAttribute('data-action-id');
      const actionIds = explicitActionAttr
        ? explicitActionAttr.split(',').map((s) => s.trim())
        : inferCanonicalActionIdsForTarget(targetId, hostPanelId);

      // Check if an unrelated panel or voice dock occludes this control
      let occluded = false;
      if (visible && hostPanelId === 'hud' && !el.closest('[data-testid="voice-card"]')) {
        for (const occ of occluderRects) {
          if (intersectionArea(rect, occ, 0) > rect.w * rect.h * 0.35) {
            occluded = true;
            break;
          }
        }
      }

      const rawLabel = (
        el.getAttribute('aria-label') ||
        el.textContent ||
        targetId
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 72);

      entries.push({
        targetId,
        kind: el.hasAttribute('data-panel-id')
          ? 'panel'
          : requiresTwoTap
          ? 'two_tap_gate'
          : targetId.includes('tab-')
          ? 'tab'
          : targetId.includes('filter-')
          ? 'chip'
          : 'control',
        screenId: activeScreenId,
        label: rawLabel || targetId,
        actionIds,
        mounted: true,
        visible,
        enabled: !isDisabled && (audienceLevel !== 'Public' || !requiresTwoTap),
        disabledReason: isDisabled
          ? 'Control is disabled in current state'
          : audienceLevel === 'Public' && requiresTwoTap
          ? 'Public presentation mode blocks external mutations'
          : null,
        permission: requiresTwoTap
          ? 'two_tap_confirm'
          : audienceLevel === 'Owner only'
          ? 'owner_only'
          : 'public_read',
        rectOrObject3DId: rect,
        occluded,
      });
    }

    return entries;
  }

  /**
   * Builds the strictly read-only `cerebro-ui/4` page state manifest.
   * Never mutates UI state, never opens the developer drawer, never resets filters.
   */
  public buildManifestSnapshot(params: {
    agentIdResolved: string;
    providerConnection: RuntimeManifestV4['providerConnection'];
    activeScreenId: string;
    substate: RuntimeManifestV4['substate'];
    selectedProjectId: string;
    focusedTargetId: string | null;
    openPanels: string[];
    panelRects: Record<string, GuiRect>;
    sceneSafeRect: GuiRect;
    voiceRect?: GuiRect;
    cameraPose: RuntimeManifestV4['cameraPose'];
    cameraLens: RuntimeManifestV4['cameraLens'];
    mediaState: RuntimeManifestV4['mediaState'];
    tourState: RuntimeManifestV4['tourState'];
    permissions: RuntimeManifestV4['permissions'];
    dataProvenance: RuntimeManifestV4['dataProvenance'];
  }): RuntimeManifestV4 {
    const targets = this.scanLiveTargets(
      params.activeScreenId,
      params.permissions.audienceLevel,
      params.panelRects,
      params.voiceRect
    );

    const activeActionSet = new Set<string>(CANONICAL_ACTION_IDS);
    for (const t of targets) {
      if (t.visible && t.enabled) {
        t.actionIds.forEach((a) => activeActionSet.add(a));
      }
    }

    const hashSeed = `${params.activeScreenId}|${params.selectedProjectId}|${params.openPanels.join(',')}|${targets.length}|${this.stateVersion}`;

    return {
      schema: CEREBRO_UI_SCHEMA_V4,
      buildId: CEREBRO_BUILD_ID,
      manifestVersion: CEREBRO_MANIFEST_VERSION,
      registryHash: computeSimpleHash(hashSeed),
      stateVersion: this.stateVersion,
      agentIdResolved: params.agentIdResolved,
      agentBranchOrVersionWhenVerified: 'main@v4.0.0',
      providerConnection: params.providerConnection,
      activeScreenId: params.activeScreenId,
      substate: params.substate,
      selectedProjectId: params.selectedProjectId,
      focusedTargetId: params.focusedTargetId,
      openPanels: params.openPanels,
      panelRects: params.panelRects,
      sceneSafeRect: params.sceneSafeRect,
      cameraPose: params.cameraPose,
      cameraLens: params.cameraLens,
      mediaState: params.mediaState,
      tourState: params.tourState,
      availableActions: Array.from(activeActionSet),
      permissions: params.permissions,
      dataProvenance: params.dataProvenance,
      targets,
      lastReceipt: this.getLastReceipt(),
    };
  }

  /**
   * Schedules a debounced (`250ms`, max `4Hz`) contextual update to the active voice provider.
   */
  public scheduleContextualUpdate(
    reason: ContextUpdateReason,
    buildSummaryFn: (reasons: ContextUpdateReason[]) => string,
    sendFn: (summaryText: string) => void
  ): void {
    this.pendingReasons.add(reason);
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const minIntervalMs = 250; // 4Hz max
    const elapsed = now - this.lastContextSentAt;
    const waitMs = Math.max(250, minIntervalMs - elapsed);

    if (this.contextDebounceTimer !== null) {
      window.clearTimeout(this.contextDebounceTimer);
    }

    this.contextDebounceTimer = window.setTimeout(() => {
      this.contextDebounceTimer = null;
      this.lastContextSentAt = Date.now();
      const reasons = Array.from(this.pendingReasons);
      this.pendingReasons.clear();
      const summary = buildSummaryFn(reasons);
      if (summary) {
        sendFn(summary);
      }
    }, waitMs);
  }
}

export const runtimeUIRegistry = new RuntimeUIRegistryEngine();
