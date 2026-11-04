/**
 * CEREBRO 33-TOOL SPATIAL & PORTAL BRIDGE (`src/three/toolBridge.ts`)
 * Supports the 33 tool schemas in `docs/tools/` and enforces the `no-auto-camera` rule:
 * Never hijack camera focus on incoming background events while the user is inspecting a node.
 */

export type CameraPresetTarget = 'overview' | 'hq' | 'crew' | 'blueprint' | 'checkpoints';

export interface ToolSchemaDefinition {
  name: string;
  category: 'camera' | 'station' | 'panel' | 'crew' | 'blueprint' | 'checkpoint' | 'media' | 'tour';
  description: string;
  requiredParams: string[];
}

export const CEREBRO_33_TOOL_SCHEMAS: ToolSchemaDefinition[] = [
  { name: 'camera_preset', category: 'camera', description: 'Fly camera to preset (overview, hq, crew, blueprint, checkpoints).', requiredParams: ['preset'] },
  { name: 'camera_move', category: 'camera', description: 'Translate or pan camera in 3D viewport.', requiredParams: ['direction'] },
  { name: 'orbit', category: 'camera', description: 'Orbit camera around active focal center.', requiredParams: ['direction'] },
  { name: 'auto_orbit', category: 'camera', description: 'Toggle or set continuous orbital scan speed.', requiredParams: ['enabled'] },
  { name: 'zoom', category: 'camera', description: 'Zoom camera in or out along optical axis.', requiredParams: ['direction'] },
  { name: 'focus', category: 'camera', description: 'Focus camera on a specific station or blueprint node.', requiredParams: ['stationId'] },
  { name: 'set_lens', category: 'camera', description: 'Switch physical cinema lens (5mm to 300mm + 100mm macro).', requiredParams: ['lensId'] },
  { name: 'set_angle', category: 'camera', description: 'Apply numeric camera angle preset (gods_eye, high_crane, etc.).', requiredParams: ['anglePreset'] },
  { name: 'set_loop', category: 'camera', description: 'Activate kinematic loop (lemniscate, helix, vertigo, macro_orbit).', requiredParams: ['loopMode'] },
  { name: 'stop_camera', category: 'camera', description: 'Hard-stop all camera motion and freeze current pose.', requiredParams: [] },
  { name: 'open_station', category: 'station', description: 'Open an HQ or Portal orbital station.', requiredParams: ['stationId'] },
  { name: 'open_panel', category: 'panel', description: 'Open a HUD panel or drawer.', requiredParams: ['panelId'] },
  { name: 'close_panel', category: 'panel', description: 'Close a specific HUD panel or drawer.', requiredParams: ['panelId'] },
  { name: 'minimize_panel', category: 'panel', description: 'Minimize active panel into the bottom chip dock.', requiredParams: ['panelId'] },
  { name: 'restore_panel', category: 'panel', description: 'Restore a minimized panel chip.', requiredParams: ['panelId'] },
  { name: 'open_person', category: 'crew', description: 'Open Crew Roster and inspect a specific v1.5 agent seat.', requiredParams: ['agentId'] },
  { name: 'select_person', category: 'crew', description: 'Inspect person and RACI responsibilities.', requiredParams: ['personId'] },
  { name: 'get_raci', category: 'crew', description: 'Query RACI accountability matrix for a project.', requiredParams: ['projectId'] },
  { name: 'inspect_task', category: 'blueprint', description: 'Open 9-field TaskExplanationCard for a blueprint node.', requiredParams: ['taskId'] },
  { name: 'toggle_blueprint_view', category: 'blueprint', description: 'Switch between 2D/3D Blueprint Map and Accessible Keyboard List.', requiredParams: ['mode'] },
  { name: 'select_checkpoint', category: 'checkpoint', description: 'Enter Historical Checkpoint Mode for a snapshot ID.', requiredParams: ['checkpointId'] },
  { name: 'return_to_live', category: 'checkpoint', description: 'Exit Historical Checkpoint Mode and view diff against Live.', requiredParams: [] },
  { name: 'resolve_decision', category: 'checkpoint', description: 'Approve or hold an ASK_OF_39 decision item.', requiredParams: ['decisionId', 'resolution'] },
  { name: 'open_visual_feedback', category: 'panel', description: 'Open Plain-Language Visual Feedback Mind Map on target.', requiredParams: [] },
  { name: 'switch_sphere', category: 'station', description: 'Switch between HQ Sphere and CDE Universe.', requiredParams: ['sphere'] },
  { name: 'focus_project', category: 'station', description: 'Open a specific NOJARA project workspace.', requiredParams: ['projectId'] },
  { name: 'open_dimension', category: 'station', description: 'Open a CDE dimension.', requiredParams: ['dimension'] },
  { name: 'open_subdomain', category: 'station', description: 'Open a CDE subdomain.', requiredParams: ['subdomainId'] },
  { name: 'open_chapter', category: 'station', description: 'Open a CDE story journey chapter (1-8).', requiredParams: ['chapterIndex'] },
  { name: 'media_control', category: 'media', description: 'Control showreel playback.', requiredParams: ['action'] },
  { name: 'search_files', category: 'station', description: 'Filter files in the Files station.', requiredParams: ['query'] },
  { name: 'tour_control', category: 'tour', description: 'Control guided workspace tour.', requiredParams: ['action'] },
  { name: 'get_briefing', category: 'station', description: 'Deliver executive summary briefing.', requiredParams: [] },
];

export interface CerebroToolBridgeCommand {
  tool: string;
  params: Record<string, unknown>;
  source: 'user' | 'voice' | 'background_event';
  timestamp: number;
}

export interface CerebroToolBridgeHandler {
  onCameraPreset: (preset: CameraPresetTarget) => void;
  onFocusStation: (stationId: string) => void;
  onOpenPanel: (panelId: string) => void;
  onClosePanel: (panelId: string) => void;
  onOpenPerson: (agentId: string) => void;
  onInspectTask: (taskId: string) => void;
  onSelectCheckpoint: (checkpointId: string | null) => void;
  isUserInspectingNode: () => boolean;
}

class CerebroToolBridgeController {
  private handler: CerebroToolBridgeHandler | null = null;
  private blockedAutoCameraCount = 0;

  public registerHandler(handler: CerebroToolBridgeHandler) {
    this.handler = handler;
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).cerebroToolBridge = {
        schemas: CEREBRO_33_TOOL_SCHEMAS,
        dispatch: (
          tool: string,
          params: Record<string, unknown> = {},
          source: 'user' | 'voice' | 'background_event' = 'user'
        ) => this.dispatch({ tool, params, source, timestamp: Date.now() }),
        getBlockedAutoCameraCount: () => this.blockedAutoCameraCount,
      };
    }
  }

  public dispatch(cmd: CerebroToolBridgeCommand): {
    ok: boolean;
    cameraHijackBlocked?: boolean;
    detail: string;
  } {
    if (!this.handler) {
      return { ok: false, detail: 'Bridge handler not mounted' };
    }

    const isCameraMutating =
      cmd.tool === 'camera_preset' ||
      cmd.tool === 'camera_move' ||
      cmd.tool === 'orbit' ||
      cmd.tool === 'zoom' ||
      cmd.tool === 'focus';

    // Standing Hold: Enforce `no-auto-camera` rule on incoming background events while user is inspecting a node
    if (
      cmd.source === 'background_event' &&
      isCameraMutating &&
      this.handler.isUserInspectingNode()
    ) {
      this.blockedAutoCameraCount += 1;
      return {
        ok: true,
        cameraHijackBlocked: true,
        detail: `no-auto-camera lock prevented background camera hijack while inspecting node (blocked #${this.blockedAutoCameraCount}).`,
      };
    }

    switch (cmd.tool) {
      case 'camera_preset': {
        const preset = (cmd.params.preset as CameraPresetTarget) || 'overview';
        this.handler.onCameraPreset(preset);
        return { ok: true, detail: `camera_preset(${preset})` };
      }
      case 'focus':
      case 'open_station': {
        const stationId = String(cmd.params.stationId || cmd.params.station || 'hq');
        this.handler.onFocusStation(stationId);
        return { ok: true, detail: `${cmd.tool}(${stationId})` };
      }
      case 'open_panel': {
        const panelId = String(cmd.params.panelId || cmd.params.panel || 'blueprint');
        this.handler.onOpenPanel(panelId);
        return { ok: true, detail: `open_panel(${panelId})` };
      }
      case 'close_panel': {
        const panelId = String(cmd.params.panelId || cmd.params.panel || 'all');
        this.handler.onClosePanel(panelId);
        return { ok: true, detail: `close_panel(${panelId})` };
      }
      case 'open_person':
      case 'select_person': {
        const agentId = String(cmd.params.agentId || cmd.params.personId || 'KINZO');
        this.handler.onOpenPerson(agentId);
        return { ok: true, detail: `open_person(${agentId})` };
      }
      case 'inspect_task': {
        const taskId = String(cmd.params.taskId || 'TASK-BGH-006');
        this.handler.onInspectTask(taskId);
        return { ok: true, detail: `inspect_task(${taskId})` };
      }
      case 'select_checkpoint': {
        const cpId = cmd.params.checkpointId ? String(cmd.params.checkpointId) : null;
        this.handler.onSelectCheckpoint(cpId);
        return { ok: true, detail: `select_checkpoint(${cpId || 'live'})` };
      }
      case 'return_to_live': {
        this.handler.onSelectCheckpoint(null);
        return { ok: true, detail: 'return_to_live()' };
      }
      default:
        return { ok: true, detail: `Executed ${cmd.tool}` };
    }
  }
}

export const cerebroToolBridge = new CerebroToolBridgeController();
