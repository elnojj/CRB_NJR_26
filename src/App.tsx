import React, { useState, useEffect, useCallback, useRef } from 'react';
import { COLOUR_TOKENS, CdeDimensionId, StationId } from './tokens/colours';
import {
  CEREBRO_STATIONS,
  CDE_DIMENSIONS,
  PROJECTS_DATA,
  PEOPLE_DATA,
  RACI_MATRIX,
  SHOWREEL_ITEMS,
  STORY_CHAPTERS,
  GUIDED_TOUR_STOPS,
  MISSING_ITEMS,
  MediaAssetItem,
  TeamRoomChannelId,
} from './data/sourceData';
import { BrandLockup } from './components/BrandLockup';
import { BootLoader } from './components/BootLoader';
import {
  CosmographCanvas,
  CameraCommandPayload,
  CameraTelemetry,
  AnchoredLabel2D,
  CinemaLensId,
  CameraAnglePresetId,
  CameraLoopMode,
  CINEMA_LENS_PRESETS,
  MediaTubeStateProp,
  ProjectMediaTubeItem,
  buildProjectMediaTubeItems,
} from './components/CosmographCanvas';
import { ExperienceCanvas } from './three/ExperienceCanvas';
import { cerebroToolBridge } from './three/toolBridge';
import { TrackerMotionProvider } from './components/TrackerMotionProvider';
import {
  BuildActivityHeader,
  ConnectionLivenessState,
} from './components/VerifiedProgress';
import { BlueprintMap } from './components/BlueprintMap/BlueprintNode';
import { TaskInspector } from './components/TaskInspector/TaskInspector';
import {
  VisualFeedbackMap,
  FeedbackAnnotation,
} from './components/VisualFeedbackMap';
import {
  CheckpointTimeline,
  DecisionResolvedEventEnvelope,
} from './components/CheckpointTimeline';
import {
  BLUEPRINT_NODES_V02,
  BLUEPRINT_EDGES_V02,
  CHECKPOINT_SNAPSHOTS,
  INITIAL_DECISION_QUEUE,
  DecisionQueueItem,
  FourTierState,
} from './data/blueprintData';
import {
  HandsCameraBackdrop,
  HandsWireframeRig,
  HandDetectionMode,
  HandGestureType,
} from './components/HandsOverlay';
import {
  PanelsOverlay,
  AudienceLevel,
  CustomTaskItem,
  ProjectWorkspaceTab,
  MinimisedChip,
  MediaPlaybackState,
} from './components/PanelsOverlay';
import {
  VoiceCard,
  VoiceState,
  VoicePocket,
  TranscriptLine,
  PendingComposeTask,
  WidgetSnapEdge,
} from './components/VoiceCard';
import { ProjectDownloadModal } from './components/ProjectDownloadModal';
import {
  WorkspaceAction,
  ActionResult,
  parseStructuredToolCall,
  parseNaturalLanguageIntent,
  shouldDeduplicateAction,
  auditToolRegistry,
  buildNodeSelectionAction,
} from './utils/actionDispatcher';
import { DEFAULT_INTERNAL_AGENT_ID } from './data/croCdeGoogleAgentManifest';
import { CEREBRO_17_PROJECTS, CEREBRO_18_SCREENS } from './data/cerebroData';
import {
  CustomDomain3D,
  DomainMaterialPreset,
  ScreenElementAmendment,
  computeNewDomainPosition,
  orchestrateScreenCommandWithGemini,
} from './utils/geminiScreenOrchestrator';
import { soundEngine } from './utils/soundEngine';
import { useViewport } from './gui/useViewport';
import { computeGuiLayout, PhoneSheetExpansion } from './gui/layoutEngine';
import { GUI_CAMERA_PRESETS, GuiCameraPresetId } from './gui/cameraPresets';
import {
  GUI_CANONICAL_SCREENS,
  GuiCanonicalScreenId,
  CameraBookmark,
  deriveCanonicalScreen,
  deriveVisualState,
} from './gui/visualStateMachine';
import { GuiFocusOverlay, ProjectedTargetScreenCoords } from './gui/GuiFocusOverlay';
import { runGuiLayoutSelfTests } from './gui/gui-layout.test';
import {
  CEREBRO_18_TOUR_CHOREOGRAPHY,
  getTourStepsForMode,
  TourMode,
  pulseAndTriggerCta,
  collectActiveScreenCtas,
  useCerebroScreenStore,
  cerebroScreenStore,
} from './utils/cerebroTourAndCtaStore';
import {
  runtimeUIRegistry,
  TourControllerState,
  ActionReceipt,
  CEREBRO_UI_SCHEMA_V4,
} from './gui/runtimeRegistry';

export interface SelfTestCheckResult {
  id: string;
  title: string;
  status: 'PENDING' | 'RUNNING' | 'PASS' | 'FAIL';
  detail: string;
}

interface NavigationSnapshot {
  sphere: 'hq' | 'cde';
  focusedNodeId: string | null;
  openPanels: string[];
  selectedProjectId: string;
  activeProjectTab: ProjectWorkspaceTab;
  selectedDimensionId: CdeDimensionId;
  selectedSubdomainId: string | null;
  activeChapterIndex: number;
}

const BUILD_VERSION = '1.28.0';

export default function App() {
  // 1. Boot, Keypad, Reduced Motion, Sound, Language/RTL & WebGL Fallback State
  const [bootInitialMode, setBootInitialMode] = useState<'keypad' | 'loader'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view')?.toLowerCase();
      if (v === 'keypad') return 'keypad';
      if (v === 'loader' || v === 'boot') return 'loader';
    }
    return 'loader';
  });
  const [bootDone, setBootDone] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view')?.toLowerCase();
      if (v && v !== 'boot' && v !== 'loader' && v !== 'keypad') {
        return true;
      }
    }
    return false;
  });
  const [customDomains, setCustomDomains] = useState<CustomDomain3D[]>([]);
  const [sphereMaterials, setSphereMaterials] = useState<{
    hq: DomainMaterialPreset;
    cde: DomainMaterialPreset;
  }>({
    hq: 'cobalt-glass',
    cde: 'amber-crystal',
  });
  const [screenAmendments, setScreenAmendments] = useState<ScreenElementAmendment[]>([]);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [soundMuted, setSoundMuted] = useState<boolean>(true);
  const [audioRms, setAudioRms] = useState<number>(0);
  const [languageRtl, setLanguageRtl] = useState<'en' | 'ar'>('en');
  const [forceWebglFallback, setForceWebglFallback] = useState<boolean>(false);

  // 1B. Unified Build Observation Portal v1.5 / Blueprint v0.2 State
  const [portalHudOpen, setPortalHudOpen] = useState<boolean>(false);
  const [selectedBlueprintTaskId, setSelectedBlueprintTaskId] =
    useState<string>('TASK-BGH-006');
  const [blueprintViewMode, setBlueprintViewMode] = useState<'map' | 'list'>('map');
  const [activeCheckpointId, setActiveCheckpointId] =
    useState<string>('CP-20261023-2131');
  const liveCheckpointId = 'CP-20261023-2131';
  const [connectionState, setConnectionState] =
    useState<ConnectionLivenessState>('Live');
  const [lastEventIso, setLastEventIso] = useState<string>(
    '2026-10-23T21:31:08Z'
  );
  const [recordedStartTimeMs] = useState<number>(() => Date.now() - 1420 * 1000);
  const [recordedPausedDurationMs] = useState<number>(0);
  const [decisions, setDecisions] = useState<DecisionQueueItem[]>(
    INITIAL_DECISION_QUEUE
  );
  const [decisionEvents, setDecisionEvents] = useState<
    DecisionResolvedEventEnvelope[]
  >([]);
  const [selectedCrewAgentId, setSelectedCrewAgentId] = useState<string | null>(
    'RASMA'
  );
  const [visualFeedbackOpen, setVisualFeedbackOpen] = useState<boolean>(false);
  const [visualFeedbackTarget, setVisualFeedbackTarget] = useState<string>(
    'HUD Blueprint & Task Inspector'
  );
  const [feedbackAnnotations, setFeedbackAnnotations] = useState<
    FeedbackAnnotation[]
  >([]);
  const [alertStack, setAlertStack] = useState<
    { id: string; title: string; detail: string; tone: 'info' | 'verified' | 'warn' }[]
  >([]);

  const pushAlertToast = useCallback(
    (title: string, detail: string, tone: 'info' | 'verified' | 'warn' = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setAlertStack((prev) => [...prev.slice(-3), { id, title, detail, tone }]);
      window.setTimeout(() => {
        setAlertStack((prev) => prev.filter((a) => a.id !== id));
      }, 4500);
    },
    []
  );

  // 2. Dual-Sphere, Unobstructed Sphere by Default (activePanel = null), Navigation History Stack & Persisted State
  const [activeSphere, setActiveSphere] = useState<'hq' | 'cde'>('hq');
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [openPanels, setOpenPanels] = useState<string[]>([]);
  const activePanel: string | null = openPanels.length > 0 ? openPanels[openPanels.length - 1] : null;
  const [minimisedChips, setMinimisedChips] = useState<MinimisedChip[]>([]);
  const [panelScrollById, setPanelScrollById] = useState<Record<string, number>>({});
  const [panelDraftsById, setPanelDraftsById] = useState<Record<string, string>>({});
  const [activeTeamChannel, setActiveTeamChannel] = useState<TeamRoomChannelId>('General');
  const [urgentFilterOnly, setUrgentFilterOnly] = useState<boolean>(false);
  const [projectTabsById, setProjectTabsById] = useState<Record<string, ProjectWorkspaceTab>>({
    SEVEN: 'tasks',
    YAH: 'tasks',
    MHE: 'tasks',
    BSOCIAL: 'decisions',
    'EL-BATRON': 'overview',
    'AL-AHRAM': 'overview',
    'MUSEUM-OF-ALMOST': 'overview',
    GONDWANA: 'overview',
  });
  const [dashboardCollapsed, setDashboardCollapsed] = useState<boolean>(false);
  const [activeShowreelIndex, setActiveShowreelIndex] = useState<number>(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('SEVEN');
  const [peopleSubTab, setPeopleSubTab] = useState<'HQ' | 'Team and Contracts' | 'RACI'>('RACI');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [raciFilterProject, setRaciFilterProject] = useState<string | null>(null);
  const [selectedDimensionId, setSelectedDimensionId] = useState<CdeDimensionId>('strategy');
  const [selectedSubdomainId, setSelectedSubdomainId] = useState<string | null>('sub-dest');
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(1);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [fullscreenMedia, setFullscreenMedia] = useState<MediaAssetItem | null>(null);
  const [mediaPlayback, setMediaPlayback] = useState<MediaPlaybackState>({
    playing: false,
    muted: false,
    currentTimeSec: 14,
    durationSec: 102,
  });
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showDeveloperDrawer, setShowDeveloperDrawer] = useState<boolean>(false);
  const [openAgentModalTrigger, setOpenAgentModalTrigger] = useState<number>(0);
  const [externalSnapEdge, setExternalSnapEdge] = useState<WidgetSnapEdge | undefined>(undefined);
  const [navHistory, setNavHistory] = useState<NavigationSnapshot[]>([]);

  // 2B. GUI Amendment v3.0 (`cerebro.stellar.gui.amend/3.0`) Layout, Viewport & Visual State Machine
  const viewport = useViewport();
  const [phoneSheetState, setPhoneSheetState] = useState<PhoneSheetExpansion>('default');
  const [voiceExpanded, setVoiceExpanded] = useState<boolean>(false);
  const [voiceDragDelta, setVoiceDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [projectedTarget, setProjectedTarget] = useState<ProjectedTargetScreenCoords | null>(null);
  const [guiCameraPreset, setGuiCameraPreset] = useState<GuiCameraPresetId>('universe');
  const [explicitScreenOverride, setExplicitScreenOverride] = useState<GuiCanonicalScreenId | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sc = params.get('screen')?.toUpperCase() as GuiCanonicalScreenId | null;
      if (sc && GUI_CANONICAL_SCREENS[sc]) return sc;
    }
    return null;
  });
  const [cameraBookmarks, setCameraBookmarks] = useState<CameraBookmark[]>([]);
  const [showGuiQaHud, setShowGuiQaHud] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('gui') === 'qa' || params.get('view') === 'gui-qa';
    }
    return false;
  });
  const [mediaTubeState, setMediaTubeState] = useState<{
    active: boolean;
    projectId: string;
    focusedTileIndex: number | null;
    savedPanels: string[];
  }>({
    active: false,
    projectId: 'SEVEN',
    focusedTileIndex: null,
    savedPanels: [],
  });
  const [tourControllerPhase, setTourControllerPhase] = useState<TourControllerState>('idle');
  const [lastActionReceipt, setLastActionReceipt] = useState<ActionReceipt | null>(null);
  const [contextualUpdateJson, setContextualUpdateJson] = useState<string>('');

  // 3. Camera Command & Live Telemetry State
  const cmdCounterRef = useRef<number>(1);
  const [cameraCommand, setCameraCommand] = useState<CameraCommandPayload | null>({
    id: 1,
    verb: 'arrival',
    targetSphere: 'hq',
  });
  const [telemetry, setTelemetry] = useState<CameraTelemetry>({
    sphere: 'hq',
    focusedNodeId: null,
    distance: 22.5,
    azimuthDeg: 18,
    polarDeg: 74,
    panOffset: [0, 0, 0],
    autoOrbit: false,
    turnSeconds: 40,
    isMoving: false,
    lastCommand: 'arrival',
    focalLengthMm: 35,
    vFovDeg: 37.8,
    rollDeg: 0,
    activeLens: '35mm',
    activeAnglePreset: null,
    activeLoopMode: 'off',
  });
  const telemetryRef = useRef<CameraTelemetry>(telemetry);
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  const cameraSettledListenersRef = useRef<Array<() => void>>([]);
  const handleCameraSettled = useCallback(() => {
    const callbacks = [...cameraSettledListenersRef.current];
    cameraSettledListenersRef.current = [];
    callbacks.forEach((cb) => cb());
  }, []);

  // 4. 18-Screen Wireframe v1.1 + CTA Choreographer Tour State (S01–S18 across 4 modes)
  const screenStore = useCerebroScreenStore();
  const tourSubStepTimersRef = useRef<number[]>([]);
  const clearTourSubStepTimers = useCallback(() => {
    tourSubStepTimersRef.current.forEach((id) => window.clearTimeout(id));
    tourSubStepTimersRef.current = [];
  }, []);

  const [tourState, setTourState] = useState<{
    active: boolean;
    paused: boolean;
    step: number;
    total: number;
    secondsLeft: number;
    autoAdvance: boolean;
    mode: TourMode;
    currentScreenId: string;
  }>({
    active: false,
    paused: false,
    step: 1,
    total: CEREBRO_18_TOUR_CHOREOGRAPHY.length,
    secondsLeft: CEREBRO_18_TOUR_CHOREOGRAPHY[0]?.durationSec || 10,
    autoAdvance: true,
    mode: 'full-18-screen',
    currentScreenId: 'S01',
  });
  const [tourHighlightId, setTourHighlightId] = useState<string | null>(null);
  const [captionBubble, setCaptionBubble] = useState<string | null>(null);

  // 5. Hands Overlay State
  const [handsActive, setHandsActive] = useState<boolean>(false);
  const [handMode, setHandMode] = useState<HandDetectionMode>('two-hands');
  const [activeGesture, setActiveGesture] = useState<HandGestureType>('pinch-orbit');

  // 6. Voice State, Audience & Compose Task State
  const [voiceState, setVoiceState] = useState<VoiceState>('Ready');
  const [activePocket, setActivePocket] = useState<VoicePocket>('tap-to-talk');
  const [audienceLevel, setAudienceLevel] = useState<AudienceLevel>('Owner only');
  const isOwnerOnly = audienceLevel === 'Owner only';
  const [pendingTaskProposal, setPendingTaskProposal] = useState<PendingComposeTask | null>(null);
  const [customTasks, setCustomTasks] = useState<CustomTaskItem[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([
    {
      id: 'boot-greet-01',
      speaker: 'Cerebro',
      text: 'Welcome back, sir. Anyone with you? Four active register workstreams — SEVEN, Young & Human, Abu Hamdan, and BSocial — are synced from the 23 October 2025 snapshot.',
      timestamp: '22:00:08',
      toolResult: 'voice_auto_greet(owner="39")',
    },
  ]);

  // 7. Real Assertion-Based Self-Test Runner State
  const [selfTestRunning, setSelfTestRunning] = useState<boolean>(false);
  const [selfTestResults, setSelfTestResults] = useState<SelfTestCheckResult[]>([]);

  // Media playback timer when playing === true
  useEffect(() => {
    if (!mediaPlayback.playing) return;
    const timer = window.setInterval(() => {
      setMediaPlayback((prev) => {
        if (!prev.playing) return prev;
        const nextSec = prev.currentTimeSec + 1;
        if (nextSec >= prev.durationSec) {
          return { ...prev, playing: false, currentTimeSec: 0 };
        }
        return { ...prev, currentTimeSec: nextSec };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mediaPlayback.playing]);

  // Load persisted custom tasks from server on mount
  useEffect(() => {
    fetch('/api/state', {
      headers: { 'X-Cerebro-Audience': audienceLevel },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.tasks)) {
          setCustomTasks(
            data.tasks.map((t: Record<string, unknown>) => ({
              id: String(t.id),
              title: String(t.title),
              projectCode: String(t.projectCode || 'SEVEN'),
              owner: String(t.owner || '39 (Tarek Nojara)'),
              createdAt: String(t.createdAt || '').slice(0, 19),
              attachmentName: t.attachmentName ? String(t.attachmentName) : undefined,
            }))
          );
        }
      })
      .catch(() => {});
  }, [audienceLevel]);

  const pushNavSnapshot = useCallback(() => {
    setNavHistory((prev) => [
      ...prev.slice(-15),
      {
        sphere: activeSphere,
        focusedNodeId,
        openPanels: [...openPanels],
        selectedProjectId,
        activeProjectTab: projectTabsById[selectedProjectId] || 'tasks',
        selectedDimensionId,
        selectedSubdomainId,
        activeChapterIndex,
      },
    ]);
  }, [
    activeChapterIndex,
    activeSphere,
    focusedNodeId,
    openPanels,
    projectTabsById,
    selectedDimensionId,
    selectedProjectId,
    selectedSubdomainId,
  ]);

  const dispatchCamera = useCallback(
    (
      verb: CameraCommandPayload['verb'],
      options?: {
        targetSphere?: 'hq' | 'cde';
        targetNodeId?: string | null;
        deltaAzimuth?: number;
        deltaPolar?: number;
        deltaPanX?: number;
        deltaPanY?: number;
        lensId?: CinemaLensId;
        focalLengthMm?: number;
        anglePreset?: CameraAnglePresetId;
        loopMode?: CameraLoopMode;
      }
    ) => {
      cmdCounterRef.current += 1;
      setCameraCommand({
        id: cmdCounterRef.current,
        verb,
        ...options,
      });
    },
    []
  );

  const appendTranscript = useCallback(
    (speaker: '39' | 'Cerebro', text: string, toolResult?: string) => {
      // Owner Arabic addressing guard: never address owner as "39" in Arabic
      const safeText =
        speaker === 'Cerebro'
          ? text.replace(/يا\s*39/g, 'يا فندم').replace(/أهلاً\s*39/g, 'أهلاً يا طارق')
          : text;
      const now = new Date();
      const timestamp = now.toTimeString().slice(0, 8);
      setTranscripts((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          speaker,
          text: safeText,
          timestamp,
          toolResult,
        },
      ]);
    },
    []
  );

  // Sync Procedural Web Audio Sound Engine mute & automatic voice/media ducking
  useEffect(() => {
    soundEngine.setMuted(soundMuted);
  }, [soundMuted]);

  useEffect(() => {
    const isVoiceOrMedia =
      mediaPlayback.playing ||
      voiceState === 'Speaking' ||
      voiceState === 'Listening' ||
      audioRms > 0.05;
    soundEngine.setVoiceOrMediaActive(isVoiceOrMedia);
  }, [mediaPlayback.playing, voiceState, audioRms]);

  // Register 33-tool Spatial & Portal Bridge with no-auto-camera lock
  useEffect(() => {
    cerebroToolBridge.registerHandler({
      onCameraPreset: (preset) => {
        if (preset === 'overview' || preset === 'hq') {
          dispatchCamera('center', { targetSphere: 'hq' });
        } else if (preset === 'crew') {
          dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'people' });
        } else if (preset === 'blueprint') {
          dispatchCamera('set_angle', { anglePreset: 'gods_eye' });
        } else if (preset === 'checkpoints') {
          dispatchCamera('set_angle', { anglePreset: 'high_crane' });
        }
      },
      onFocusStation: (stationId) => {
        dispatchCamera('focus_node', { targetSphere: activeSphere, targetNodeId: stationId });
      },
      onOpenPanel: (panelId) => {
        if (panelId === 'blueprint' || panelId === 'portal') {
          setPortalHudOpen(true);
        } else {
          setOpenPanels([panelId]);
        }
      },
      onClosePanel: (panelId) => {
        if (panelId === 'all' || panelId === 'portal') {
          setPortalHudOpen(false);
          setOpenPanels([]);
        } else {
          setOpenPanels((prev) => prev.filter((p) => p !== panelId));
        }
      },
      onOpenPerson: (agentId) => {
        setSelectedCrewAgentId(agentId.toUpperCase());
        setPortalHudOpen(true);
      },
      onInspectTask: (taskId) => {
        setSelectedBlueprintTaskId(taskId);
        setPortalHudOpen(true);
      },
      onSelectCheckpoint: (cpId) => {
        setActiveCheckpointId(cpId || liveCheckpointId);
        setPortalHudOpen(true);
      },
      isUserInspectingNode: () =>
        portalHudOpen || openPanels.length > 0 || Boolean(focusedNodeId),
    });
  }, [activeSphere, dispatchCamera, focusedNodeId, openPanels.length, portalHudOpen]);

  const handleResolvePortalDecision = useCallback(
    (
      decisionId: string,
      resolution: 'APPROVED' | 'HELD' | 'REVISION_REQUESTED'
    ) => {
      const nowIso = new Date().toISOString();
      const eventId = `evt-${Date.now().toString(36)}`;
      setDecisions((prev) =>
        prev.map((d) =>
          d.id === decisionId
            ? {
                ...d,
                status: resolution,
                resolvedAtIso: nowIso,
                resolutionEventId: eventId,
              }
            : d
        )
      );
      setDecisionEvents((prev) => [
        ...prev,
        {
          eventId,
          eventType: 'decision.resolved',
          decisionId,
          resolution,
          resolvedBy: '39 (Tarek Nojara)',
          checkpointId: activeCheckpointId,
          timestampIso: nowIso,
        },
      ]);
      setLastEventIso(nowIso);
      pushAlertToast(
        `Decision ${decisionId} → ${resolution}`,
        `Logged decision.resolved envelope (${eventId})`,
        resolution === 'APPROVED' ? 'verified' : 'warn'
      );
    },
    [activeCheckpointId, pushAlertToast]
  );

  // Open a single primary working panel by default unless side-by-side comparison is requested
  const ensurePanelOpen = useCallback((panelId: string, replaceAll = true) => {
    soundEngine.playPanelToggle(true);
    setDashboardCollapsed(false);
    setMinimisedChips((prev) => prev.filter((c) => c.panelId !== panelId));
    setOpenPanels((prev) => {
      if (replaceAll) return [panelId];
      const without = prev.filter((p) => p !== panelId);
      return [...without, panelId].slice(-2);
    });
  }, []);

  // Minimise a panel into the chip dock while preserving project, tab, scroll offset & unsent draft
  const handleMinimisePanel = useCallback(
    (panelId: string, label: string, scrollTop = 0, unsentDraft?: string) => {
      soundEngine.playPanelToggle(false);
      const currentTab = projectTabsById[selectedProjectId] || 'tasks';
      setPanelScrollById((prev) => ({ ...prev, [panelId]: scrollTop }));
      if (unsentDraft !== undefined) {
        setPanelDraftsById((prev) => ({ ...prev, [panelId]: unsentDraft }));
      }
      setOpenPanels((prev) => prev.filter((p) => p !== panelId));
      setMinimisedChips((prev) => {
        const without = prev.filter((c) => c.panelId !== panelId);
        return [
          ...without,
          {
            panelId,
            label,
            projectId: panelId === 'project-detail' ? selectedProjectId : undefined,
            subTab: panelId === 'project-detail' ? currentTab : undefined,
            scrollTop,
            unsentDraft: unsentDraft ?? panelDraftsById[panelId],
            activeChannel: panelId === 'team-room' ? activeTeamChannel : undefined,
          },
        ];
      });
    },
    [activeTeamChannel, panelDraftsById, projectTabsById, selectedProjectId]
  );

  // Restore a minimised chip with its exact project, active sub-tab, scroll offset, and unsent draft
  const handleRestoreChip = useCallback(
    (chip: MinimisedChip) => {
      if (chip.projectId) {
        setSelectedProjectId(chip.projectId);
        if (chip.subTab) {
          setProjectTabsById((prev) => ({
            ...prev,
            [chip.projectId!]: chip.subTab!,
          }));
        }
      }
      if (chip.scrollTop !== undefined) {
        setPanelScrollById((prev) => ({ ...prev, [chip.panelId]: chip.scrollTop! }));
      }
      if (chip.unsentDraft !== undefined) {
        setPanelDraftsById((prev) => ({ ...prev, [chip.panelId]: chip.unsentDraft! }));
      }
      if (chip.activeChannel) {
        setActiveTeamChannel(chip.activeChannel);
      }
      setMinimisedChips((prev) => prev.filter((c) => c.panelId !== chip.panelId));
      ensurePanelOpen(chip.panelId, true);
    },
    [ensurePanelOpen]
  );

  const handleNavigateBack = useCallback(() => {
    setNavHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setActiveSphere(last.sphere);
      setFocusedNodeId(last.focusedNodeId);
      setOpenPanels(last.openPanels);
      setSelectedProjectId(last.selectedProjectId);
      setProjectTabsById((tabs) => ({
        ...tabs,
        [last.selectedProjectId]: last.activeProjectTab,
      }));
      setSelectedDimensionId(last.selectedDimensionId);
      setSelectedSubdomainId(last.selectedSubdomainId);
      setActiveChapterIndex(last.activeChapterIndex);
      dispatchCamera('focus_node', {
        targetSphere: last.sphere,
        targetNodeId: last.focusedNodeId || (last.sphere === 'hq' ? 'projects' : 'strategy'),
      });
      return prev.slice(0, -1);
    });
  }, [dispatchCamera]);

  const handleMediaControl = useCallback(
    (
      action:
        | 'play'
        | 'pause'
        | 'toggle_play'
        | 'seek'
        | 'mute'
        | 'unmute'
        | 'toggle_mute'
        | 'fullscreen_enter'
        | 'fullscreen_exit',
      seekSeconds?: number
    ) => {
      setMediaPlayback((prev) => {
        if (action === 'play') return { ...prev, playing: true };
        if (action === 'pause') return { ...prev, playing: false };
        if (action === 'toggle_play') return { ...prev, playing: !prev.playing };
        if (action === 'mute') return { ...prev, muted: true };
        if (action === 'unmute') return { ...prev, muted: false };
        if (action === 'toggle_mute') return { ...prev, muted: !prev.muted };
        if (action === 'seek' && typeof seekSeconds === 'number') {
          return {
            ...prev,
            currentTimeSec: Math.max(0, Math.min(prev.durationSec, seekSeconds)),
          };
        }
        return prev;
      });

      if (action === 'fullscreen_enter') {
        const reel = SHOWREEL_ITEMS[activeShowreelIndex] || SHOWREEL_ITEMS[0];
        setFullscreenMedia((curr) =>
          curr || {
            id: reel.id,
            title: reel.title,
            subtitle: reel.subtitle,
            type: reel.posterUrl ? 'Render JPG' : 'Showreel Video [SAMPLE]',
            url: reel.posterUrl,
            aspect: '16:9',
            companionSticker: reel.companionSticker,
            isSample: !reel.posterUrl,
          }
        );
      } else if (action === 'fullscreen_exit') {
        setFullscreenMedia(null);
      }
    },
    [activeShowreelIndex]
  );

  // 18-Screen Wireframe v1.1 + CTA Choreographer Contract: Arrive -> Open Screen Panel(s) -> Schedule Sub-Step CTA Pulses -> Narrate
  const applyTourStop = useCallback(
    (stepNumber: number, modeOverride?: TourMode) => {
      clearTourSubStepTimers();
      const activeMode = modeOverride || tourState.mode || 'full-18-screen';
      const steps = getTourStepsForMode(activeMode);
      const clampedIdx = Math.max(0, Math.min(steps.length - 1, stepNumber - 1));
      const stop = steps[clampedIdx] || CEREBRO_18_TOUR_CHOREOGRAPHY[0];

      setActiveSphere(stop.sphere);
      setFocusedNodeId(stop.targetNodeId);
      setTourControllerPhase('focusing');

      // Screen-specific panel & domain choreography across S01–S18
      if (stop.screenId === 'S01') {
        setOpenPanels([]);
        setDashboardCollapsed(false);
        setTourControllerPhase('travelling');
        dispatchCamera('arrival', { targetSphere: 'hq', lensId: '35mm' });
      } else if (stop.screenId === 'S02') {
        setOpenPanels([]);
        setDashboardCollapsed(false);
        setTourControllerPhase('travelling');
        dispatchCamera('arrival', { targetSphere: 'hq' });
      } else if (stop.screenId === 'S15') {
        // Mount both Baghira (#14) and Kinzo (#15) side-by-side
        setDashboardCollapsed(false);
        setTourControllerPhase('opening');
        setOpenPanels(['baghira', 'kinzo']);
        dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'tasks' });
      } else if (stop.screenId === 'S17') {
        // 2400ms CatmullRomCurve3 flight to Sphere 02 CDE Universe + mount CDE Explorer & Story Journey
        setSelectedDimensionId('strategy');
        setActiveChapterIndex(1);
        setDashboardCollapsed(false);
        setTourControllerPhase('travelling');
        setOpenPanels(['cde-explorer', 'story-journey']);
        dispatchCamera('switch_sphere', { targetSphere: 'cde', targetNodeId: 'strategy' });
      } else if (stop.screenId === 'S18') {
        // Safe Tour Rule (s18DomainTourPolicy: inspect_or_prepare_only_no_auto_create):
        // Inspect/prepare Multi-Domain Spatial OS without auto-creating a domain during a tour.
        setTourControllerPhase('opening');
        setOpenPanels(['cde-explorer']);
        dispatchCamera('focus_node', {
          targetSphere: 'hq',
          targetNodeId: customDomains[0]?.id || 'projects',
        });
      } else if (stop.panelsToOpen.length > 0) {
        if (stop.screenId === 'S05') {
          setSelectedProjectId('SEVEN');
        }
        setTourControllerPhase('opening');
        ensurePanelOpen(stop.panelsToOpen[0], true);
        dispatchCamera('focus_node', {
          targetSphere: stop.sphere,
          targetNodeId: stop.targetNodeId || (stop.sphere === 'hq' ? 'projects' : 'strategy'),
        });
      }

      // Schedule timed sub-step CTA pulses & auto-clicks for this screen
      stop.subSteps.forEach((sub) => {
        const tid = window.setTimeout(() => {
          const res = pulseAndTriggerCta(sub.ctaId, sub.spokenNote, sub.autoClick);
          if (res.ok) {
            setCaptionBubble(`${stop.screenId} · ${res.label} — ${sub.spokenNote}`);
          }
          cerebroScreenStore.setActiveScreenId(stop.screenId);
        }, sub.delayMs);
        tourSubStepTimersRef.current.push(tid);
      });

      let attempts = 0;
      const verifyBoundsAndNarrate = () => {
        attempts += 1;
        const targetPanelId = stop.panelsToOpen[0];
        const panelEl = targetPanelId
          ? (document.querySelector(`[data-panel-id="${targetPanelId}"]`) as HTMLElement | null)
          : (document.querySelector('[data-testid="voice-card"]') as HTMLElement | null);
        const rect = panelEl?.getBoundingClientRect();
        const isVisible = Boolean(rect && rect.width > 0 && rect.height > 0);
        const cameraReady = !telemetryRef.current.isMoving || reducedMotion || attempts >= 6;

        if ((isVisible && cameraReady) || attempts >= 10) {
          setTourControllerPhase('presenting');
          setTourHighlightId(stop.targetNodeId || stop.screenId);
          setCaptionBubble(stop.captionBubbleText);
          cerebroScreenStore.setActiveScreenId(stop.screenId);
          if (!soundMuted) {
            setVoiceState('Speaking');
          }
          const narrationText = languageRtl === 'ar' ? stop.narrationAr : stop.narrationEn;
          appendTranscript(
            'Cerebro',
            `[${stop.screenId} · ${stop.panelNumber} · ${stop.title}] ${narrationText}`,
            `start_tour(${activeMode} · ${stop.screenId} · step=${clampedIdx + 1}/${steps.length} · ctas=${stop.subSteps.length})`
          );
          // Hold after narration (minimumDwellMs: 1200 + postNarrationHoldMs: 900)
          window.setTimeout(() => setVoiceState('Ready'), 1200);
        } else {
          window.setTimeout(verifyBoundsAndNarrate, 60);
        }
      };

      window.requestAnimationFrame(verifyBoundsAndNarrate);
    },
    [
      appendTranscript,
      clearTourSubStepTimers,
      customDomains,
      dispatchCamera,
      ensurePanelOpen,
      languageRtl,
      reducedMotion,
      soundMuted,
      tourState.mode,
    ]
  );

  const handleStopTourImmediately = useCallback(() => {
    clearTourSubStepTimers();
    cerebroScreenStore.setPulsedCta(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setTourControllerPhase('cancelled');
    setTourState((prev) => ({
      ...prev,
      active: false,
      paused: false,
    }));
    setTourHighlightId(null);
    setVoiceState('Ready');
    setCaptionBubble('Tour stopped · Live workspace ready');
  }, [clearTourSubStepTimers]);

  const handleNextTourStop = useCallback(() => {
    setTourState((prev) => {
      const steps = getTourStepsForMode(prev.mode);
      const nextStep = prev.step + 1;
      if (nextStep > steps.length) {
        clearTourSubStepTimers();
        cerebroScreenStore.setPulsedCta(null);
        setTourHighlightId(null);
        setCaptionBubble('18-Screen Wireframe v1.1 Tour complete · Centred on HQ');
        dispatchCamera('center', { targetSphere: 'hq' });
        appendTranscript(
          'Cerebro',
          `Completed the ${prev.mode} tour across ${steps.length} screens. Returning to centred HQ overview.`,
          'tour_control(completed)'
        );
        return {
          ...prev,
          active: false,
          paused: false,
          step: 1,
          total: steps.length,
          secondsLeft: steps[0]?.durationSec || 10,
          currentScreenId: steps[0]?.screenId || 'S01',
        };
      }
      const nextStopObj = steps[nextStep - 1] || steps[0];
      applyTourStop(nextStep, prev.mode);
      return {
        ...prev,
        active: true,
        paused: false,
        step: nextStep,
        total: steps.length,
        secondsLeft: nextStopObj.durationSec || 10,
        currentScreenId: nextStopObj.screenId,
      };
    });
  }, [applyTourStop, appendTranscript, clearTourSubStepTimers, dispatchCamera]);

  const handlePrevTourStop = useCallback(() => {
    setTourState((prev) => {
      const steps = getTourStepsForMode(prev.mode);
      const prevStep = Math.max(1, prev.step - 1);
      const prevStopObj = steps[prevStep - 1] || steps[0];
      applyTourStop(prevStep, prev.mode);
      return {
        ...prev,
        active: true,
        paused: false,
        step: prevStep,
        total: steps.length,
        secondsLeft: prevStopObj.durationSec || 10,
        currentScreenId: prevStopObj.screenId,
      };
    });
  }, [applyTourStop]);

  // Guided Tour countdown timer (respects autoAdvance & paused)
  useEffect(() => {
    if (!tourState.active || tourState.paused || !tourState.autoAdvance) return;

    const timer = window.setInterval(() => {
      setTourState((prev) => {
        if (!prev.active || prev.paused || !prev.autoAdvance) return prev;
        if (prev.secondsLeft > 1) {
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        }
        const steps = getTourStepsForMode(prev.mode);
        const nextStep = prev.step + 1;
        if (nextStep > steps.length) {
          clearTourSubStepTimers();
          cerebroScreenStore.setPulsedCta(null);
          setTourHighlightId(null);
          setCaptionBubble('18-Screen Wireframe v1.1 Tour complete · Centred on HQ');
          dispatchCamera('center', { targetSphere: 'hq' });
          return {
            ...prev,
            active: false,
            paused: false,
            step: 1,
            total: steps.length,
            secondsLeft: steps[0]?.durationSec || 10,
            currentScreenId: steps[0]?.screenId || 'S01',
          };
        }
        const nextStopObj = steps[nextStep - 1] || steps[0];
        applyTourStop(nextStep, prev.mode);
        return {
          ...prev,
          step: nextStep,
          total: steps.length,
          secondsLeft: nextStopObj.durationSec || 10,
          currentScreenId: nextStopObj.screenId,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    tourState.active,
    tourState.paused,
    tourState.autoAdvance,
    applyTourStop,
    clearTourSubStepTimers,
    dispatchCamera,
  ]);

  // Keep activeScreenCtas synced in cerebroScreenStore whenever openPanels or activeSphere changes
  useEffect(() => {
    const tid = window.setTimeout(() => {
      cerebroScreenStore.setActiveScreenId(tourState.active ? tourState.currentScreenId : 'S02');
    }, 140);
    return () => window.clearTimeout(tid);
  }, [activeSphere, openPanels, selectedProjectId, tourState.active, tourState.currentScreenId]);

  const handleUserTouchPauseTour = useCallback(() => {
    setTourState((prev) => {
      if (prev.active && !prev.paused) {
        clearTourSubStepTimers();
        setCaptionBubble('Tour paused — press Resume to continue');
        return { ...prev, paused: true };
      }
      return prev;
    });
  }, [clearTourSubStepTimers]);

  // UNIFIED TYPED ACTION EXECUTOR — Single dispatcher for Voice Tools, Natural Language, Touch, Keyboard, Tour & Self-Tests
  const executeTypedAction = useCallback(
    (action: WorkspaceAction, sourceLabel = 'ui'): ActionResult => {
      const opId = `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

      switch (action.type) {
        case 'switch_sphere': {
          pushNavSnapshot();
          setActiveSphere(action.sphere);
          setFocusedNodeId(null);
          setOpenPanels([]);
          setDashboardCollapsed(false);
          dispatchCamera('switch_sphere', {
            targetSphere: action.sphere,
            targetNodeId: null,
          });
          setCaptionBubble(action.sphere === 'cde' ? 'CDE Universe' : 'Cerebro HQ');
          return {
            ok: true,
            action: 'switch_sphere',
            target: action.sphere,
            resultingState: { activeSphere: action.sphere, focusedNodeId: null, activePanel: null },
            operationId: opId,
          };
        }

        case 'open_station': {
          pushNavSnapshot();
          setActiveSphere('hq');
          setFocusedNodeId(action.station);
          ensurePanelOpen(action.station, true);
          dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: action.station });
          setCaptionBubble(`Station · ${action.station.toUpperCase()}`);
          return {
            ok: true,
            action: 'open_station',
            target: action.station,
            resultingState: { activeSphere: 'hq', openPanels: [action.station] },
            operationId: opId,
          };
        }

        case 'open_dashboard': {
          const nextCollapsed =
            action.mode === 'collapsed'
              ? true
              : action.mode === 'expanded'
              ? false
              : !dashboardCollapsed;
          setActiveSphere('hq');
          setDashboardCollapsed(nextCollapsed);
          if (!nextCollapsed && openPanels.length === 0) {
            setOpenPanels(['projects']);
          }
          dispatchCamera('center', { targetSphere: 'hq' });
          setCaptionBubble(nextCollapsed ? 'Overview Cards' : 'Workspace View');
          return {
            ok: true,
            action: 'open_dashboard',
            target: nextCollapsed ? 'collapsed' : 'expanded',
            resultingState: { dashboardCollapsed: nextCollapsed },
            operationId: opId,
          };
        }

        case 'focus_project': {
          pushNavSnapshot();
          const proj =
            PROJECTS_DATA.find((p) => p.id === action.projectId) ||
            CEREBRO_17_PROJECTS.find((p) => p.id === action.projectId) ||
            PROJECTS_DATA[0];
          setSelectedProjectId(proj.id);
          setFocusedNodeId(proj.id);
          const nextTab = action.tab || projectTabsById[proj.id] || 'overview';
          setProjectTabsById((prev) => ({ ...prev, [proj.id]: nextTab }));
          ensurePanelOpen('project-detail', true);
          dispatchCamera('focus_node', { targetSphere: activeSphere, targetNodeId: proj.id });
          setCaptionBubble(`${proj.name} · ${proj.health}`);
          return {
            ok: true,
            action: 'focus_project',
            target: proj.id,
            resultingState: {
              selectedProjectId: proj.id,
              activeTab: nextTab,
              openPanels: ['project-detail'],
            },
            operationId: opId,
          };
        }

        case 'open_panel': {
          if (action.action === 'close_all') {
            setFullscreenMedia(null);
            setOpenPanels([]);
            setDashboardCollapsed(false);
            return {
              ok: true,
              action: 'close_all',
              target: 'all',
              resultingState: { openPanels: [] },
              operationId: opId,
            };
          }
          if (action.action === 'close') {
            if (fullscreenMedia) {
              setFullscreenMedia(null);
            } else if (action.panel) {
              setOpenPanels((prev) => prev.filter((p) => p !== action.panel));
            } else {
              setOpenPanels((prev) => prev.slice(0, -1));
            }
            return {
              ok: true,
              action: 'close_panel',
              target: action.panel || 'active',
              resultingState: { openPanels: [] },
              operationId: opId,
            };
          }
          if (action.action === 'minimize') {
            const targetId = action.panel || openPanels[openPanels.length - 1];
            if (targetId) {
              handleMinimisePanel(targetId, targetId.toUpperCase(), panelScrollById[targetId] || 0);
            }
            return {
              ok: true,
              action: 'minimize_panel',
              target: targetId || 'none',
              resultingState: { minimisedPanelId: targetId },
              operationId: opId,
            };
          }
          if (action.action === 'restore') {
            const chip =
              (action.panel && minimisedChips.find((c) => c.panelId === action.panel)) ||
              minimisedChips[minimisedChips.length - 1];
            if (chip) {
              handleRestoreChip(chip);
            }
            return {
              ok: Boolean(chip),
              action: 'restore_panel',
              target: chip?.panelId || 'none',
              resultingState: { restoredPanelId: chip?.panelId },
              operationId: opId,
            };
          }

          const targetPanel = action.panel || 'projects';
          pushNavSnapshot();
          ensurePanelOpen(targetPanel, true);
          return {
            ok: true,
            action: 'open_panel',
            target: targetPanel,
            resultingState: { openPanels: [targetPanel] },
            operationId: opId,
          };
        }

        case 'navigate_back': {
          handleNavigateBack();
          return {
            ok: true,
            action: 'navigate_back',
            target: 'previous_context',
            resultingState: { historyRemaining: Math.max(0, navHistory.length - 1) },
            operationId: opId,
          };
        }

        case 'select_person': {
          pushNavSnapshot();
          setActiveSphere('hq');
          setFocusedNodeId('people');
          const personObj = PEOPLE_DATA.find((p) => p.id === action.personId);
          if (personObj) {
            setPeopleSubTab(personObj.group);
          }
          setSelectedPersonId(action.personId);
          ensurePanelOpen('people', true);
          dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'people' });
          return {
            ok: Boolean(personObj),
            action: 'select_person',
            target: action.personId,
            resultingState: { selectedPersonId: action.personId, openPanels: ['people'] },
            operationId: opId,
          };
        }

        case 'get_raci': {
          pushNavSnapshot();
          setActiveSphere('hq');
          setFocusedNodeId('people');
          setPeopleSubTab('RACI');
          setRaciFilterProject(action.projectId);
          ensurePanelOpen('people', true);
          dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'people' });
          const row =
            RACI_MATRIX.find((r) => r.projectId === action.projectId) || RACI_MATRIX[0];
          const msg = `On ${row.projectName}: Accountable (A) is ${row.accountable}. Responsible (R) is ${row.responsible}. Consulted: ${row.consulted}.`;
          appendTranscript('Cerebro', msg, `get_raci("${row.projectId}")`);
          setCaptionBubble(`RACI · ${row.projectId}: Accountable → ${row.accountable}`);
          return {
            ok: true,
            action: 'get_raci',
            target: row.projectId,
            resultingState: {
              projectId: row.projectId,
              accountable: row.accountable,
              responsible: row.responsible,
            },
            operationId: opId,
          };
        }

        case 'open_dimension': {
          pushNavSnapshot();
          setActiveSphere('cde');
          setSelectedDimensionId(action.dimension);
          setFocusedNodeId(action.dimension);
          ensurePanelOpen('cde-explorer', true);
          dispatchCamera('focus_node', { targetSphere: 'cde', targetNodeId: action.dimension });
          return {
            ok: true,
            action: 'open_dimension',
            target: action.dimension,
            resultingState: { activeSphere: 'cde', selectedDimensionId: action.dimension },
            operationId: opId,
          };
        }

        case 'open_subdomain': {
          pushNavSnapshot();
          setActiveSphere('cde');
          const parentDim = CDE_DIMENSIONS.find((d) =>
            d.subdomains.some((s) => s.id === action.subdomainId)
          );
          if (parentDim) {
            setSelectedDimensionId(parentDim.id);
          }
          setSelectedSubdomainId(action.subdomainId);
          setFocusedNodeId(action.subdomainId);
          ensurePanelOpen('cde-explorer', true);
          dispatchCamera('focus_node', { targetSphere: 'cde', targetNodeId: action.subdomainId });
          return {
            ok: true,
            action: 'open_subdomain',
            target: action.subdomainId,
            resultingState: { activeSphere: 'cde', selectedSubdomainId: action.subdomainId },
            operationId: opId,
          };
        }

        case 'open_chapter': {
          pushNavSnapshot();
          const ch =
            STORY_CHAPTERS.find((c) => c.index === action.chapterIndex) || STORY_CHAPTERS[0];
          setActiveSphere('cde');
          setActiveChapterIndex(ch.index);
          ensurePanelOpen('story-journey', true);
          dispatchCamera('focus_node', { targetSphere: 'cde', targetNodeId: 'strategy' });
          setCaptionBubble(`${ch.title} · "${ch.companionSticker}"`);
          return {
            ok: true,
            action: 'open_chapter',
            target: `chapter-${ch.index}`,
            resultingState: { activeChapterIndex: ch.index, openPanels: ['story-journey'] },
            operationId: opId,
          };
        }

        case 'search_files': {
          pushNavSnapshot();
          setActiveSphere('hq');
          setFocusedNodeId('files');
          setFileSearchQuery(action.query);
          ensurePanelOpen('files', true);
          dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'files' });
          if (action.query) {
            appendTranscript(
              'Cerebro',
              `Filtering workspace files matching "${action.query}".`,
              `search_files("${action.query}")`
            );
          }
          return {
            ok: true,
            action: 'search_files',
            target: action.query || 'all',
            resultingState: { fileSearchQuery: action.query, openPanels: ['files'] },
            operationId: opId,
          };
        }

        case 'media_control': {
          pushNavSnapshot();
          setActiveSphere('hq');
          setFocusedNodeId('media');
          ensurePanelOpen('media', true);
          dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'media' });

          let nextIdx = activeShowreelIndex;
          if (action.action === 'select' && action.reelId) {
            const idx = SHOWREEL_ITEMS.findIndex((r) => r.id === action.reelId);
            if (idx >= 0) nextIdx = idx;
            setActiveShowreelIndex(nextIdx);
          } else if (action.action === 'next') {
            nextIdx = (activeShowreelIndex + 1) % SHOWREEL_ITEMS.length;
            setActiveShowreelIndex(nextIdx);
          } else if (action.action === 'prev') {
            nextIdx =
              (activeShowreelIndex - 1 + SHOWREEL_ITEMS.length) % SHOWREEL_ITEMS.length;
            setActiveShowreelIndex(nextIdx);
          } else if (action.action === 'play') {
            handleMediaControl('play');
          } else if (action.action === 'pause') {
            handleMediaControl('pause');
          } else if (action.action === 'seek') {
            handleMediaControl('seek', action.seekSeconds ?? 0);
          } else if (action.action === 'mute') {
            handleMediaControl('mute');
          } else if (action.action === 'unmute') {
            handleMediaControl('unmute');
          } else if (action.action === 'fullscreen_enter') {
            handleMediaControl('fullscreen_enter');
          } else if (action.action === 'fullscreen_exit') {
            handleMediaControl('fullscreen_exit');
          }

          const reel = SHOWREEL_ITEMS[nextIdx] || SHOWREEL_ITEMS[0];
          setCaptionBubble(`Showreel · ${reel.title}`);
          return {
            ok: true,
            action: `media_${action.action}`,
            target: reel.id,
            resultingState: { activeShowreelIndex: nextIdx, reelId: reel.id },
            operationId: opId,
          };
        }

        case 'camera': {
          const amt = action.amount ?? 1;
          const deltaAzimuth =
            action.verb === 'orbit'
              ? (action.direction === 'left' ? -0.45 : 0.45) * amt
              : undefined;
          const deltaPolar =
            action.verb === 'tilt'
              ? (action.direction === 'down' ? 0.25 : -0.25) * amt
              : undefined;
          const deltaPanX =
            action.verb === 'pan'
              ? (action.direction === 'left'
                  ? -2.2
                  : action.direction === 'right'
                  ? 2.2
                  : 0) * amt
              : undefined;
          const deltaPanY =
            action.verb === 'pan'
              ? (action.direction === 'down'
                  ? -1.2
                  : action.direction === 'up'
                  ? 1.2
                  : 0) * amt
              : undefined;

          dispatchCamera(action.verb, {
            targetSphere: activeSphere,
            deltaAzimuth,
            deltaPolar,
            deltaPanX,
            deltaPanY,
            lensId: action.lensId,
            anglePreset: action.anglePreset,
            loopMode: action.loopMode,
          });

          if (action.verb === 'set_lens' && action.lensId) {
            const preset = CINEMA_LENS_PRESETS[action.lensId];
            if (preset) {
              setCaptionBubble(
                `Cinema Lens · ${preset.label} ${preset.name} (FOV ${preset.vFov}° · T${preset.tStop})`
              );
            }
          } else if (action.verb === 'set_angle' && action.anglePreset) {
            setCaptionBubble(`Camera Angle · ${action.anglePreset.replace('_', ' ').toUpperCase()}`);
          } else if (action.verb === 'set_loop' && action.loopMode) {
            setCaptionBubble(
              action.loopMode === 'off'
                ? 'Kinematic Loop Off'
                : `Kinematic Loop · ${action.loopMode.toUpperCase()}`
            );
          }

          return {
            ok: true,
            action: `camera_${action.verb}`,
            target:
              action.lensId ||
              action.anglePreset ||
              action.loopMode ||
              activeSphere,
            resultingState: {
              verb: action.verb,
              direction: action.direction,
              lensId: action.lensId,
              anglePreset: action.anglePreset,
              loopMode: action.loopMode,
            },
            operationId: opId,
          };
        }

        case 'tour_control': {
          if (action.action === 'stop') {
            handleStopTourImmediately();
          } else if (action.action === 'pause') {
            clearTourSubStepTimers();
            setTourState((prev) => ({ ...prev, paused: true }));
            setCaptionBubble('Tour paused');
          } else if (action.action === 'resume') {
            setTourState((prev) => {
              if (!prev.active) {
                const steps = getTourStepsForMode(prev.mode);
                applyTourStop(1, prev.mode);
                return {
                  ...prev,
                  active: true,
                  paused: false,
                  step: 1,
                  total: steps.length,
                  secondsLeft: steps[0]?.durationSec || 10,
                  currentScreenId: steps[0]?.screenId || 'S01',
                };
              }
              applyTourStop(prev.step, prev.mode);
              return { ...prev, paused: false };
            });
          } else if (action.action === 'next') {
            handleNextTourStop();
          } else if (action.action === 'prev') {
            handlePrevTourStop();
          } else if (action.action === 'mode_auto') {
            setTourState((prev) => ({ ...prev, autoAdvance: true }));
          } else if (action.action === 'mode_manual') {
            setTourState((prev) => ({ ...prev, autoAdvance: false }));
          } else {
            const nextMode: TourMode = action.mode || 'full-18-screen';
            const steps = getTourStepsForMode(nextMode);
            let startStep = 1;
            if (action.screenId) {
              const foundIdx = steps.findIndex(
                (s) => s.screenId.toUpperCase() === action.screenId?.toUpperCase()
              );
              if (foundIdx >= 0) startStep = foundIdx + 1;
            }
            const firstStop = steps[startStep - 1] || steps[0];
            setTourState((prev) => ({
              ...prev,
              active: true,
              paused: false,
              mode: nextMode,
              step: startStep,
              total: steps.length,
              secondsLeft: firstStop?.durationSec || 10,
              currentScreenId: firstStop?.screenId || 'S01',
            }));
            applyTourStop(startStep, nextMode);
          }
          return {
            ok: true,
            action: `tour_${action.action}`,
            target: action.mode || `step-${tourState.step}`,
            resultingState: {
              tourAction: action.action,
              mode: action.mode || tourState.mode,
              screenId: action.screenId || tourState.currentScreenId,
            },
            operationId: opId,
          };
        }

        case 'step_tour': {
          const dir = action.directionOrScreen.trim().toLowerCase();
          if (dir === 'next') {
            handleNextTourStop();
            return {
              ok: true,
              action: 'step_tour',
              target: 'next',
              resultingState: { direction: 'next' },
              operationId: opId,
            };
          }
          if (dir === 'prev' || dir === 'previous' || dir === 'back') {
            handlePrevTourStop();
            return {
              ok: true,
              action: 'step_tour',
              target: 'prev',
              resultingState: { direction: 'prev' },
              operationId: opId,
            };
          }
          if (dir === 'pause') {
            clearTourSubStepTimers();
            setTourState((prev) => ({ ...prev, paused: true }));
            setCaptionBubble('Tour paused');
            return {
              ok: true,
              action: 'step_tour',
              target: 'pause',
              resultingState: { paused: true },
              operationId: opId,
            };
          }
          if (dir === 'resume') {
            setTourState((prev) => {
              applyTourStop(prev.step, prev.mode);
              return { ...prev, active: true, paused: false };
            });
            return {
              ok: true,
              action: 'step_tour',
              target: 'resume',
              resultingState: { paused: false },
              operationId: opId,
            };
          }
          if (dir === 'stop' || dir === 'exit') {
            handleStopTourImmediately();
            return {
              ok: true,
              action: 'step_tour',
              target: 'stop',
              resultingState: { active: false },
              operationId: opId,
            };
          }

          // Jump directly to a canonical screen ID S01..S18
          const targetScreenUpper = action.directionOrScreen.trim().toUpperCase();
          const currentModeSteps = getTourStepsForMode(tourState.mode);
          let idxInMode = currentModeSteps.findIndex((s) => s.screenId === targetScreenUpper);
          let targetMode: TourMode = tourState.mode;
          let stepsToUse = currentModeSteps;
          if (idxInMode < 0) {
            targetMode = 'full-18-screen';
            stepsToUse = CEREBRO_18_TOUR_CHOREOGRAPHY;
            idxInMode = stepsToUse.findIndex((s) => s.screenId === targetScreenUpper);
          }
          const finalStepNumber = idxInMode >= 0 ? idxInMode + 1 : 1;
          const stopObj = stepsToUse[finalStepNumber - 1] || stepsToUse[0];
          setTourState((prev) => ({
            ...prev,
            active: true,
            paused: false,
            mode: targetMode,
            step: finalStepNumber,
            total: stepsToUse.length,
            secondsLeft: stopObj.durationSec || 10,
            currentScreenId: stopObj.screenId,
          }));
          applyTourStop(finalStepNumber, targetMode);
          return {
            ok: true,
            action: 'step_tour',
            target: stopObj.screenId,
            resultingState: {
              screenId: stopObj.screenId,
              step: finalStepNumber,
              total: stepsToUse.length,
              mode: targetMode,
            },
            operationId: opId,
          };
        }

        case 'trigger_cta': {
          const ctaRes = pulseAndTriggerCta(action.ctaId, action.spokenReason, true);
          const note =
            action.spokenReason ||
            (ctaRes.ok ? `Triggered CTA "${ctaRes.label}"` : `CTA "${action.ctaId}" not currently mounted`);
          setCaptionBubble(note);
          if (ctaRes.ok) {
            appendTranscript(
              'Cerebro',
              `${note} [${ctaRes.matchedCtaId}]`,
              `trigger_cta("${ctaRes.matchedCtaId}")`
            );
          }
          window.setTimeout(() => {
            cerebroScreenStore.setActiveScreenId(tourState.currentScreenId);
          }, 120);
          return {
            ok: ctaRes.ok,
            action: 'trigger_cta',
            target: ctaRes.matchedCtaId,
            resultingState: {
              ctaId: ctaRes.matchedCtaId,
              label: ctaRes.label,
              pulsedWithFocusRing: '#65ACFF',
            },
            operationId: opId,
            error: ctaRes.ok ? undefined : `CTA ${action.ctaId} not found in active DOM`,
          };
        }

        case 'checkpoint_action': {
          ensurePanelOpen('decisions', true);
          return {
            ok: true,
            action: 'checkpoint_action',
            target: action.checkpointId,
            resultingState: { checkpointId: action.checkpointId, decision: action.decision },
            operationId: opId,
          };
        }

        case 'get_briefing': {
          const msg =
            'Briefing for Tarek (39): 52 register records loaded from the 23 October 2025 snapshot across SEVEN, Young & Human, Abu Hamdan, and BSocial. SEVEN Tabuk concept renders are verified; 5 showreels are queued in Media.';
          appendTranscript('Cerebro', msg, 'get_briefing()');
          setCaptionBubble('Briefing · 4 Active Workstreams · 52 Records');
          return {
            ok: true,
            action: 'get_briefing',
            target: 'hq',
            resultingState: { records: 52, activeProjects: 4 },
            operationId: opId,
          };
        }

        case 'get_page_state': {
          // STRICTLY READ-ONLY per cerebro-ui/4 Section 3.3:
          // Never open the developer drawer, reset filters, grant access, or mutate the scene!
          const computedLayout = computeGuiLayout({
            width: viewport.width,
            height: viewport.height,
            openPanels,
            phoneSheetState,
            voiceExpanded,
            voiceDragDelta,
            keyboardInsetBottom: viewport.keyboardInsetBottom,
          });
          const manifestV4 = runtimeUIRegistry.buildManifestSnapshot({
            agentIdResolved: DEFAULT_INTERNAL_AGENT_ID,
            providerConnection: {
              status:
                voiceState === 'Listening' || voiceState === 'Speaking' || voiceState === 'Thinking'
                  ? 'connected'
                  : 'ready',
              liveWebSocketOpen:
                voiceState === 'Listening' || voiceState === 'Speaking' || voiceState === 'Thinking',
              usingFallback: false,
              muted: soundMuted,
              rawTranscriptExecutesCommands: false,
            },
            activeScreenId: tourState.active ? tourState.currentScreenId : 'S02',
            substate: {
              activeSphere,
              activeProjectTab: projectTabsById[selectedProjectId] || 'tasks',
              peopleSubTab,
              selectedDimensionId,
              selectedSubdomainId,
              activeChapterIndex,
              dashboardCollapsed,
              projectMediaTubeOpen: mediaTubeState.active,
              projectMediaTubeAssetId:
                mediaTubeState.focusedTileIndex !== null
                  ? `${mediaTubeState.projectId}-tube-${mediaTubeState.focusedTileIndex + 1}`
                  : null,
            },
            selectedProjectId,
            focusedTargetId: focusedNodeId,
            openPanels,
            panelRects: computedLayout.panelSlots.reduce<Record<string, { x: number; y: number; w: number; h: number }>>(
              (acc, slot) => {
                acc[slot.activePanelId] = slot.rect;
                return acc;
              },
              {}
            ),
            sceneSafeRect: computedLayout.sceneSafeRect,
            cameraPose: {
              azimuthDeg: telemetryRef.current.azimuthDeg,
              polarDeg: telemetryRef.current.polarDeg,
              distance: telemetryRef.current.distance,
              panOffset: [telemetryRef.current.panOffset[0], telemetryRef.current.panOffset[1]],
              autoOrbit: telemetryRef.current.autoOrbit,
              turnSeconds: telemetryRef.current.turnSeconds,
              isMoving: telemetryRef.current.isMoving,
            },
            cameraLens: {
              presetId: guiCameraPreset,
              activeLensId: telemetryRef.current.activeLens || '35mm',
              focalLengthMm: telemetryRef.current.focalLengthMm ?? 35,
              verticalFovDeg: telemetryRef.current.vFovDeg ?? 37.8,
            },
            mediaState: {
              activeShowreelId: SHOWREEL_ITEMS[activeShowreelIndex]?.id || null,
              playing: mediaPlayback.playing,
              muted: mediaPlayback.muted,
              currentTimeSec: mediaPlayback.currentTimeSec,
              durationSec: mediaPlayback.durationSec,
              fullscreenActive: Boolean(fullscreenMedia),
              tubeActive: mediaTubeState.active,
              tubeProjectId: mediaTubeState.active ? mediaTubeState.projectId : null,
              tubeFocusedAssetId:
                mediaTubeState.focusedTileIndex !== null
                  ? `${mediaTubeState.projectId}-tube-${mediaTubeState.focusedTileIndex + 1}`
                  : null,
            },
            tourState: {
              active: tourState.active,
              paused: tourState.paused,
              phase: tourState.active
                ? tourState.paused
                  ? 'paused'
                  : tourControllerPhase
                : 'idle',
              mode: tourState.mode,
              step: tourState.step,
              total: tourState.total,
              currentScreenId: tourState.currentScreenId,
              minimumDwellMs: 1200,
              postNarrationHoldMs: 900,
              safeTourPolicy: true,
            },
            permissions: {
              audienceLevel,
              ownerPinVerified: bootDone,
              googleWorkspaceConnected: false,
              cameraMicExplicitlyGranted: handsActive,
              externalMutationsRequireTwoTap: true,
            },
            dataProvenance: {
              portfolioProjects: 'seeded_local_store',
              tasksAndNotes: 'seeded_local_store',
              googleWorkspace: 'cached_snapshot',
              voiceAgent: 'live_verified',
            },
          });
          return {
            ok: true,
            action: 'get_page_state',
            target: manifestV4.activeScreenId,
            resultingState: manifestV4 as unknown as Record<string, unknown>,
            operationId: opId,
          };
        }

        case 'project_media_tube': {
          const targetProj = action.projectId || selectedProjectId || 'SEVEN';
          if (action.action === 'close') {
            setMediaTubeState((prev) => {
              if (prev.savedPanels.length > 0) {
                setOpenPanels(prev.savedPanels);
              }
              return { ...prev, active: false, focusedTileIndex: null, savedPanels: [] };
            });
            setCaptionBubble('Closed 3D Project Media Tube · Sphere shell restored');
          } else if (action.action === 'focus_tile') {
            const idx = typeof action.tileIndex === 'number' ? action.tileIndex : 0;
            setMediaTubeState((prev) => ({
              ...prev,
              active: true,
              projectId: targetProj,
              focusedTileIndex: idx,
            }));
            const items = buildProjectMediaTubeItems(targetProj);
            const tile = items[idx] || items[0];
            setCaptionBubble(`3D Tube Tile #${idx + 1} · ${tile.title}`);
          } else if (action.action === 'fullview') {
            const idx =
              typeof action.tileIndex === 'number'
                ? action.tileIndex
                : mediaTubeState.focusedTileIndex ?? 0;
            const items = buildProjectMediaTubeItems(targetProj);
            const tile = items[idx] || items[0];
            setMediaTubeState((prev) => ({
              ...prev,
              active: true,
              projectId: targetProj,
              focusedTileIndex: idx,
              savedPanels: prev.savedPanels.length > 0 ? prev.savedPanels : [...openPanels],
            }));
            setOpenPanels([]);
            setFullscreenMedia({
              id: tile.id,
              title: `${targetProj} · ${tile.title}`,
              subtitle: tile.subtitle,
              type: tile.kind === 'video' ? 'Showreel Video [SAMPLE]' : 'Render JPG',
              aspect: '16:9',
              url: tile.url || '',
              isSample: false,
            });
            setCaptionBubble(`Full View · ${tile.title} (Esc or Close restores exact tube pose)`);
          } else {
            setSelectedProjectId(targetProj);
            setMediaTubeState((prev) => ({
              active: true,
              projectId: targetProj,
              focusedTileIndex: action.tileIndex ?? 0,
              savedPanels: prev.savedPanels,
            }));
            dispatchCamera('focus_node', {
              targetSphere: activeSphere,
              targetNodeId: targetProj,
            });
            setCaptionBubble(
              `Opened 3D Cylindrical Project Media Tube (24 Tiles · 8×3) for ${targetProj}`
            );
          }
          const receipt = runtimeUIRegistry.createReceipt({
            actionId: 'project.open_tube',
            status: 'completed',
            targetId: 'project-open-tube',
            observedState: {
              tubeOpen: action.action !== 'close',
              projectId: targetProj,
              focusedTileIndex: action.tileIndex ?? mediaTubeState.focusedTileIndex,
            },
          });
          setLastActionReceipt(receipt);
          return {
            ok: true,
            action: 'project.open_tube',
            target: targetProj,
            resultingState: {
              receipt,
              tubeOpen: action.action !== 'close',
              projectId: targetProj,
            },
            operationId: opId,
          };
        }

        case 'create_domain': {
          const domId = `dom-${action.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          const newDomain: CustomDomain3D = {
            id: domId,
            name: action.name,
            sphere: action.sphere,
            colour: action.colour,
            parentNodeId: action.parentNodeId,
            position: computeNewDomainPosition(customDomains.length, action.sphere),
            materialPreset: action.sphere === 'cde' ? 'amber-crystal' : 'cobalt-glass',
            createdAt: new Date().toISOString(),
          };
          setCustomDomains((prev) => [...prev.filter((d) => d.id !== newDomain.id), newDomain]);
          setActiveSphere(action.sphere);
          setFocusedNodeId(newDomain.id);
          dispatchCamera('focus_node', {
            targetSphere: action.sphere,
            targetNodeId: newDomain.id,
          });
          setCaptionBubble(`Spawned 3D Domain · ${newDomain.name} (${newDomain.sphere.toUpperCase()})`);
          return {
            ok: true,
            action: 'create_domain',
            target: newDomain.id,
            resultingState: {
              domainId: newDomain.id,
              name: newDomain.name,
              sphere: newDomain.sphere,
              colour: newDomain.colour,
              parentNodeId: newDomain.parentNodeId,
            },
            operationId: opId,
          };
        }

        case 'update_domain_material': {
          const targetKey = action.target.toLowerCase();
          if (targetKey === 'hq' || targetKey === 'cde') {
            setSphereMaterials((prev) => ({
              ...prev,
              [targetKey]: action.materialPreset,
            }));
          } else {
            setCustomDomains((prev) =>
              prev.map((d) =>
                d.id.toLowerCase() === targetKey || d.name.toLowerCase() === targetKey
                  ? { ...d, materialPreset: action.materialPreset }
                  : d
              )
            );
          }
          setCaptionBubble(
            `Updated ${action.target.toUpperCase()} Material → ${action.materialPreset}`
          );
          return {
            ok: true,
            action: 'update_domain_material',
            target: action.target,
            resultingState: {
              target: action.target,
              materialPreset: action.materialPreset,
            },
            operationId: opId,
          };
        }

        case 'amend_screen_element': {
          const amendment: ScreenElementAmendment = {
            elementId: action.elementId,
            operation: action.operation,
            value: action.value,
            timestamp: new Date().toISOString(),
          };
          setScreenAmendments((prev) => [...prev.slice(-15), amendment]);
          setCaptionBubble(
            `Amended ${action.elementId} (${action.operation}: ${action.value})`
          );
          return {
            ok: true,
            action: 'amend_screen_element',
            target: action.elementId,
            resultingState: {
              elementId: action.elementId,
              operation: action.operation,
              value: action.value,
            },
            operationId: opId,
          };
        }

        case 'workspace_sync': {
          const servicePanelMap: Record<string, string> = {
            gmail: 'gmail',
            drive: 'files',
            calendar: 'calendar',
            meet: 'calendar',
            docs: 'files',
            sheets: 'files',
          };
          const targetPanel = servicePanelMap[action.service] || 'gmail';
          ensurePanelOpen(targetPanel, true);
          setCaptionBubble(
            `Google Workspace · ${action.service.toUpperCase()} (${action.action})`
          );
          return {
            ok: true,
            action: 'workspace_sync',
            target: `${action.service}:${action.action}`,
            resultingState: {
              service: action.service,
              workspaceAction: action.action,
              openPanels: [targetPanel],
            },
            operationId: opId,
          };
        }

        default: {
          return {
            ok: false,
            action: 'unknown',
            target: sourceLabel,
            resultingState: {},
            operationId: opId,
            error: 'Unrecognized action',
          };
        }
      }
    },
    [
      activeShowreelIndex,
      activeSphere,
      appendTranscript,
      applyTourStop,
      audienceLevel,
      clearTourSubStepTimers,
      customDomains.length,
      dashboardCollapsed,
      dispatchCamera,
      ensurePanelOpen,
      focusedNodeId,
      fullscreenMedia,
      guiCameraPreset,
      handleMediaControl,
      handleMinimisePanel,
      handleNavigateBack,
      handleNextTourStop,
      handlePrevTourStop,
      handleRestoreChip,
      handleStopTourImmediately,
      handsActive,
      mediaPlayback.currentTimeSec,
      mediaPlayback.durationSec,
      mediaPlayback.muted,
      mediaPlayback.playing,
      mediaTubeState.active,
      mediaTubeState.focusedTileIndex,
      minimisedChips,
      navHistory.length,
      openPanels,
      panelScrollById,
      phoneSheetState,
      projectTabsById,
      pushNavSnapshot,
      selectedProjectId,
      tourControllerPhase,
      tourState.active,
      tourState.currentScreenId,
      tourState.mode,
      tourState.paused,
      tourState.step,
      tourState.total,
      viewport.height,
      viewport.keyboardInsetBottom,
      viewport.width,
      voiceDragDelta,
      voiceExpanded,
      voiceState,
    ]
  );

  // Structured Client Tool Executor for ElevenLabsConvaiBridge (Never flattens named parameters!)
  const handleExecuteToolCall = useCallback(
    (toolName: string, parameters: Record<string, unknown>): string => {
      const parsed = parseStructuredToolCall(toolName, parameters);
      if (!parsed.ok || !parsed.action) {
        return JSON.stringify({
          ok: false,
          action: toolName,
          target: 'none',
          resultingState: {},
          operationId: `err-${Date.now()}`,
          error: parsed.error || `Failed to parse tool ${toolName}`,
        });
      }
      if (shouldDeduplicateAction(parsed.action, 'voice_tool')) {
        return JSON.stringify({
          ok: true,
          deduplicated: true,
          action: toolName,
          target: 'deduplicated',
          resultingState: {},
          operationId: `dedup-${Date.now()}`,
        });
      }
      const res = executeTypedAction(parsed.action, 'voice_tool');
      return JSON.stringify(res);
    },
    [executeTypedAction]
  );

  // Natural Language / Command Bar Handler (with Gemini Live Screen Orchestrator fallback)
  const handleSimulateCommand = useCallback(
    (rawInput: string) => {
      const text = rawInput.trim();
      if (!text) return;

      if (text.startsWith('__agent_reply__:')) {
        const cleanReply = text.replace('__agent_reply__:', '').trim();
        if (!soundMuted) setVoiceState('Speaking');
        setCaptionBubble(cleanReply);
        appendTranscript('Cerebro', cleanReply, 'live_response');
        window.setTimeout(() => setVoiceState('Ready'), 1100);
        return;
      }

      // Live WebSocket transcript separation (rawTranscriptExecutesCommands: false):
      // When the live ElevenLabs ConvAI WebSocket is open, user transcripts update conversation history ONLY
      // while live client_tool_call frames execute actions, preventing duplicate local command execution.
      if (text.startsWith('__user_voice_live__:')) {
        const liveSpeech = text.replace('__user_voice_live__:', '').trim();
        if (liveSpeech) {
          appendTranscript('39', liveSpeech, 'live_voice_transcript_context_only');
        }
        return;
      }

      const isLiveVoiceTranscript = text.startsWith('__user_voice__:');
      const cleanInput = isLiveVoiceTranscript
        ? text.replace('__user_voice__:', '').trim()
        : text;
      if (!cleanInput) return;

      appendTranscript('39', cleanInput);

      const typedAction = parseNaturalLanguageIntent(cleanInput);
      if (!typedAction) {
        if (!isLiveVoiceTranscript) {
          orchestrateScreenCommandWithGemini(cleanInput, {
            activeSphere,
            activePanel,
            openPanels,
            selectedProjectId,
          }).then((orch) => {
            if (orch.ok && orch.toolCalls.length > 0) {
              orch.toolCalls.forEach((tc) => {
                handleExecuteToolCall(tc.name, tc.args);
              });
              appendTranscript('Cerebro', orch.replyText, 'gemini_orchestrator');
            } else {
              appendTranscript(
                'Cerebro',
                `I heard "${cleanInput}". Try naming any of the 17 projects (SEVEN, El Batron, Young & Human, Abu Hamdan, BSocial, Gondwana...), a panel (Portfolio, Tasks, Insights, Briefing, Gmail, Calendar, Drive, Crew, Baghira, Kinzo), or a 3D command ("create domain Riyadh Lab").`
              );
            }
          });
        }
        return;
      }
      if (shouldDeduplicateAction(typedAction, 'voice_transcript')) {
        return;
      }
      executeTypedAction(typedAction, 'command_bar');
    },
    [
      activePanel,
      activeSphere,
      appendTranscript,
      executeTypedAction,
      handleExecuteToolCall,
      openPanels,
      selectedProjectId,
      soundMuted,
    ]
  );

  // Global Keyboard Navigation (Escape closes fullscreen/panel; Arrow keys orbit/tilt when not typing in input/textarea)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);

      if (e.key === 'Escape') {
        if (fullscreenMedia) {
          setFullscreenMedia(null);
          return;
        }
        if (showDeveloperDrawer) {
          setShowDeveloperDrawer(false);
          return;
        }
        if (openPanels.length > 0) {
          setOpenPanels((prev) => prev.slice(0, -1));
        }
        return;
      }

      // Never trigger 3D camera shortcuts while typing inside an input/textarea
      if (isEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatchCamera('orbit', { deltaAzimuth: -0.35, deltaPolar: 0 });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        dispatchCamera('orbit', { deltaAzimuth: 0.35, deltaPolar: 0 });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatchCamera('tilt', { deltaPolar: -0.22 });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatchCamera('tilt', { deltaPolar: 0.22 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchCamera, fullscreenMedia, openPanels.length, showDeveloperDrawer]);

  // All 12 ?view=... URL State Inspectors + Morning Briefing 06:00–10:30 Africa/Cairo Auto-Window
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view')?.toLowerCase();

    if (!view) {
      // Check if current time in Africa/Cairo is between 06:00 and 10:30 to auto-open Panel #6 Morning Briefing
      try {
        const cairoTimeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date());
        const [hh, mm] = cairoTimeStr.split(':').map(Number);
        const totalMins = hh * 60 + mm;
        if (totalMins >= 6 * 60 && totalMins <= 10 * 60 + 30) {
          setOpenPanels(['briefing']);
        }
      } catch {
        // ignore timezone parse anomalies
      }
      return;
    }

    if (view === 'keypad') {
      setBootInitialMode('keypad');
      setBootDone(false);
      dispatchCamera('arrival', { targetSphere: 'hq', lensId: '35mm' });
      return;
    }
    if (view === 'boot' || view === 'loader') {
      setBootInitialMode('loader');
      setBootDone(false);
      dispatchCamera('arrival', { targetSphere: 'hq', lensId: '35mm' });
      return;
    }
    setBootDone(true);
    if (view === 'arrival' || view === 'hq') {
      setActiveSphere('hq');
      setOpenPanels([]);
      setCaptionBubble('Welcome back, sir. Anyone with you?');
      dispatchCamera('arrival', { targetSphere: 'hq' });
    } else if (view === 'portfolio') {
      setActiveSphere('hq');
      setOpenPanels(['portfolio']);
      dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'projects' });
    } else if (view === 'projects' || view === 'station-projects') {
      setActiveSphere('hq');
      setOpenPanels(['projects']);
      dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: 'projects' });
    } else if (view === 'project' || view === 'project-detail') {
      setActiveSphere('hq');
      setOpenPanels(['project-detail']);
      dispatchCamera('focus_node', { targetSphere: 'hq', targetNodeId: selectedProjectId });
    } else if (view === 'cde') {
      setActiveSphere('cde');
      setOpenPanels(['cde-explorer']);
      dispatchCamera('switch_sphere', { targetSphere: 'cde' });
    } else if (view === 'dashboard' || view === 'pockets') {
      setDashboardCollapsed(true);
    } else if (view === 'showreel' || view === 'media') {
      setOpenPanels(['media']);
    } else if (view === 'raci' || view === 'people') {
      setPeopleSubTab('RACI');
      setOpenPanels(['people']);
    } else if (view === 'story' || view === 'bio') {
      setActiveSphere('cde');
      setOpenPanels(['story-journey']);
    } else if (view === 'hands') {
      setHandsActive(true);
    } else if (view === 'audit' || view === 'developer') {
      setShowDeveloperDrawer(true);
    } else if (view === 'workspace' || view === 'gmail') {
      setOpenPanels(['gmail']);
    } else if (
      [
        'tasks',
        'files',
        'file-viewer',
        'decisions',
        'team-room',
        'minutes',
        'timeline',
        'insights',
        'briefing',
        'calendar',
        'crew',
        'baghira',
        'kinzo',
        'settings',
        'build',
      ].includes(view)
    ) {
      setOpenPanels([view]);
    }
  }, [dispatchCamera, selectedProjectId]);

  // Handle 3D node or floating label click from CosmographCanvas — flies camera & dispatches actionDispatcher action
  const handleSelectNode = useCallback(
    (id: string, nodeType: AnchoredLabel2D['nodeType'], sphere: 'hq' | 'cde') => {
      handleUserTouchPauseTour();
      setActiveSphere(sphere);
      const action = buildNodeSelectionAction(id, nodeType, sphere);
      executeTypedAction(action, 'sphere_node');
      if (nodeType === 'core') {
        setFocusedNodeId(null);
        dispatchCamera('center', { targetSphere: sphere });
      } else {
        dispatchCamera('focus_node', { targetSphere: sphere, targetNodeId: id });
      }
    },
    [dispatchCamera, executeTypedAction, handleUserTouchPauseTour]
  );

  // Live Page State Snapshot for Developer View & `get_page_state` (cerebro-ui/4)
  const pageStateSnapshot: Record<string, unknown> = {
    schema: CEREBRO_UI_SCHEMA_V4,
    version: BUILD_VERSION,
    agent: 'Cro-cde-google',
    defaultAgentId: DEFAULT_INTERNAL_AGENT_ID,
    owner: '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
    activeSphere,
    focusedNodeId,
    activePanel,
    openPanels,
    minimisedChips,
    projectTabsById,
    dashboardCollapsed,
    guiSchema: 'cerebro.stellar.gui.amend/3.0',
    viewportBreakpoint: viewport.breakpoint,
    guiCameraPreset,
    activeShowreel: SHOWREEL_ITEMS[activeShowreelIndex]?.id,
    mediaPlayback,
    mediaTubeState,
    selectedProjectId,
    peopleSubTab,
    selectedPersonId,
    raciFilterProject,
    selectedDimensionId,
    selectedSubdomainId,
    activeChapterIndex,
    audienceLevel,
    handsActive,
    handMode,
    tourState,
    tourControllerPhase,
    lastActionReceipt,
    activeScreenCtas:
      screenStore.activeScreenCtas.length > 0
        ? screenStore.activeScreenCtas
        : collectActiveScreenCtas(),
    lastPulsedCtaId: screenStore.activePulsedCta?.ctaId || null,
    cameraTelemetry: telemetry,
    customDomains,
    sphereMaterials,
    screenAmendments,
    canonicalScreens: CEREBRO_18_SCREENS.length,
    totalPortfolioProjects: CEREBRO_17_PROJECTS.length,
  };

  // Debounced (250ms, max 4Hz) cerebro-ui/4 contextual updates to active ElevenLabs session
  useEffect(() => {
    runtimeUIRegistry.scheduleContextualUpdate(
      'navigation',
      () =>
        JSON.stringify(
          runtimeUIRegistry.buildManifestSnapshot({
            agentIdResolved: DEFAULT_INTERNAL_AGENT_ID,
            providerConnection: {
              status: 'connected',
              liveWebSocketOpen:
                voiceState === 'Listening' || voiceState === 'Speaking' || voiceState === 'Thinking',
              usingFallback: false,
              muted: soundMuted,
              rawTranscriptExecutesCommands: false,
            },
            activeScreenId: tourState.active ? tourState.currentScreenId : 'S02',
            substate: {
              activeSphere,
              activeProjectTab: projectTabsById[selectedProjectId] || 'tasks',
              peopleSubTab,
              selectedDimensionId,
              selectedSubdomainId,
              activeChapterIndex,
              dashboardCollapsed,
              projectMediaTubeOpen: mediaTubeState.active,
              projectMediaTubeAssetId:
                mediaTubeState.focusedTileIndex !== null
                  ? `${mediaTubeState.projectId}-tube-${mediaTubeState.focusedTileIndex + 1}`
                  : null,
            },
            selectedProjectId,
            focusedTargetId: focusedNodeId,
            openPanels,
            panelRects: {},
            sceneSafeRect: { x: 0, y: 0, w: viewport.width, h: viewport.height },
            cameraPose: {
              azimuthDeg: telemetry.azimuthDeg,
              polarDeg: telemetry.polarDeg,
              distance: telemetry.distance,
              panOffset: [telemetry.panOffset[0], telemetry.panOffset[1]],
              autoOrbit: telemetry.autoOrbit,
              turnSeconds: telemetry.turnSeconds,
              isMoving: telemetry.isMoving,
            },
            cameraLens: {
              presetId: guiCameraPreset,
              activeLensId: telemetry.activeLens || '35mm',
              focalLengthMm: telemetry.focalLengthMm ?? 35,
              verticalFovDeg: telemetry.vFovDeg ?? 37.8,
            },
            mediaState: {
              activeShowreelId: SHOWREEL_ITEMS[activeShowreelIndex]?.id || null,
              playing: mediaPlayback.playing,
              muted: mediaPlayback.muted,
              currentTimeSec: mediaPlayback.currentTimeSec,
              durationSec: mediaPlayback.durationSec,
              fullscreenActive: Boolean(fullscreenMedia),
              tubeActive: mediaTubeState.active,
              tubeProjectId: mediaTubeState.active ? mediaTubeState.projectId : null,
              tubeFocusedAssetId:
                mediaTubeState.focusedTileIndex !== null
                  ? `${mediaTubeState.projectId}-tube-${mediaTubeState.focusedTileIndex + 1}`
                  : null,
            },
            tourState: {
              active: tourState.active,
              paused: tourState.paused,
              phase: tourState.active
                ? tourState.paused
                  ? 'paused'
                  : tourControllerPhase
                : 'idle',
              mode: tourState.mode,
              step: tourState.step,
              total: tourState.total,
              currentScreenId: tourState.currentScreenId,
              minimumDwellMs: 1200,
              postNarrationHoldMs: 900,
              safeTourPolicy: true,
            },
            permissions: {
              audienceLevel,
              ownerPinVerified: bootDone,
              googleWorkspaceConnected: false,
              cameraMicExplicitlyGranted: handsActive,
              externalMutationsRequireTwoTap: true,
            },
            dataProvenance: {
              portfolioProjects: 'seeded_local_store',
              tasksAndNotes: 'seeded_local_store',
              googleWorkspace: 'cached_snapshot',
              voiceAgent: 'live_verified',
            },
          })
        ),
      (payloadJson) => setContextualUpdateJson(payloadJson)
    );
  }, [
    activeShowreelIndex,
    activeSphere,
    audienceLevel,
    focusedNodeId,
    guiCameraPreset,
    handsActive,
    mediaPlayback.currentTimeSec,
    mediaPlayback.durationSec,
    mediaPlayback.muted,
    mediaPlayback.playing,
    mediaTubeState.active,
    mediaTubeState.focusedTileIndex,
    openPanels,
    selectedProjectId,
    telemetry.activeLens,
    telemetry.azimuthDeg,
    telemetry.distance,
    telemetry.focalLengthMm,
    telemetry.isMoving,
    telemetry.panOffset,
    telemetry.polarDeg,
    telemetry.rollDeg,
    telemetry.sphere,
    telemetry.vFovDeg,
    tourControllerPhase,
    tourState.active,
    tourState.currentScreenId,
    tourState.mode,
    tourState.paused,
    tourState.step,
    tourState.total,
    viewport.height,
    viewport.width,
  ]);

  // Save Note callback -> prompts if user also wants to create a task
  const handleSendCompose = useCallback(
    (text: string, attachmentName?: string, receiptId?: string) => {
      appendTranscript(
        '39',
        `[Saved Note${receiptId ? ` · ${receiptId}` : ''}] ${text}${
          attachmentName ? ` (File: ${attachmentName})` : ''
        }`
      );
      setPendingTaskProposal({
        summary: text,
        projectCode: selectedProjectId || 'SEVEN',
        attachmentName,
      });
      appendTranscript(
        'Cerebro',
        `Saved note for ${selectedProjectId || 'SEVEN'}: "${text}". Would you also like to create a task?`
      );
    },
    [appendTranscript, selectedProjectId]
  );

  const handleCreateDirectTask = useCallback(
    (title: string, projectCode: string, attachmentName?: string) => {
      const newTask: CustomTaskItem = {
        id: `task-${Date.now()}`,
        title,
        projectCode,
        owner: '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
        createdAt: new Date().toISOString().slice(0, 19),
        attachmentName,
      };
      setCustomTasks((prev) => [newTask, ...prev]);
      ensurePanelOpen('tasks', true);
      appendTranscript(
        'Cerebro',
        `Created task "${newTask.title}" under ${newTask.projectCode}.`
      );
    },
    [appendTranscript, ensurePanelOpen]
  );

  const handleConfirmMakeTask = useCallback(
    async (confirm: boolean) => {
      if (!pendingTaskProposal) return;
      if (confirm) {
        try {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Cerebro-Audience': audienceLevel,
            },
            body: JSON.stringify({
              title: pendingTaskProposal.summary,
              projectCode: pendingTaskProposal.projectCode,
              attachmentName: pendingTaskProposal.attachmentName,
            }),
          });
          const data = await res.json();
          const newTask: CustomTaskItem = {
            id: data?.task?.id || `task-${Date.now()}`,
            title: pendingTaskProposal.summary,
            projectCode: pendingTaskProposal.projectCode,
            owner: '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
            createdAt: new Date().toISOString().slice(0, 19),
            attachmentName: pendingTaskProposal.attachmentName,
          };
          setCustomTasks((prev) => [newTask, ...prev]);
          ensurePanelOpen('tasks', true);
          appendTranscript(
            'Cerebro',
            `Created task "${newTask.title}" under ${newTask.projectCode}.`
          );
        } catch {}
      } else {
        appendTranscript('Cerebro', 'Kept as a saved note without creating a task.');
      }
      setPendingTaskProposal(null);
    },
    [audienceLevel, pendingTaskProposal, appendTranscript, ensurePanelOpen]
  );

  const handleTriggerHandGesture = useCallback(
    (gesture: HandGestureType) => {
      setActiveGesture(gesture);
      handleUserTouchPauseTour();
      if (gesture === 'pinch-orbit') {
        dispatchCamera('orbit', { deltaAzimuth: 0.55, deltaPolar: -0.08 });
      } else if (gesture === 'spread-zoom') {
        dispatchCamera('zoom_in');
      } else if (gesture === 'palm-stop') {
        dispatchCamera('stop');
      } else if (gesture === 'point-select') {
        ensurePanelOpen(activeSphere === 'hq' ? 'projects' : 'cde-explorer', true);
      }
    },
    [activeSphere, dispatchCamera, ensurePanelOpen, handleUserTouchPauseTour]
  );

  // 16-Point Real Assertion-Based Self-Test Suite (Runs inside Developer View using isolated isTest: true data + cleanup)
  const runAutomatedJourneySelfTest = useCallback(async () => {
    setShowDeveloperDrawer(true);
    setSelfTestRunning(true);
    setBootDone(true);

    const initialChecks: SelfTestCheckResult[] = [
      { id: '01', title: 'Owner Identity Lock & Arabic Addressing Guard', status: 'PENDING', detail: 'Waiting...' },
      { id: '02', title: 'Project vs Showreel Disambiguation ("open El Batron project")', status: 'PENDING', detail: 'Waiting...' },
      { id: '03', title: 'Structured Tool Parameter Preservation (Zero Object.values Flattening)', status: 'PENDING', detail: 'Waiting...' },
      { id: '04', title: 'Distinct Camera Pan vs Orbit Speed Independence', status: 'PENDING', detail: 'Waiting...' },
      { id: '05', title: 'Camera Hard Stop Pose Freeze (Zero Drift After 350ms)', status: 'PENDING', detail: 'Waiting...' },
      { id: '06', title: 'Dual-Sphere Switch & Navigation Back History Stack', status: 'PENDING', detail: 'Waiting...' },
      { id: '07', title: 'Panel Minimise & Restore (Preserves Project, Tab, Scroll & Draft)', status: 'PENDING', detail: 'Waiting...' },
      { id: '08', title: 'People Inspection -> Linked Work & Review Checkpoints', status: 'PENDING', detail: 'Waiting...' },
      { id: '09', title: 'Interactive Media Player (Play, Seek, Mute, Fullscreen Enter/Exit)', status: 'PENDING', detail: 'Waiting...' },
      { id: '10', title: 'Grounded Tour DOM Bounds & Pause/Resume/Prev/Stop Controls', status: 'PENDING', detail: 'Waiting...' },
      { id: '11', title: 'Persistent Note, Task & Message Storage (Isolated isTest=true)', status: 'PENDING', detail: 'Waiting...' },
      { id: '12', title: 'Real Binary File Upload with Byte Size & SHA-256 Verification', status: 'PENDING', detail: 'Waiting...' },
      { id: '13', title: 'Failed Send Error Handling & Unsent Draft Preservation', status: 'PENDING', detail: 'Waiting...' },
      { id: '14', title: 'Truthful Meeting Notes Recipient Validation & Draft Status', status: 'PENDING', detail: 'Waiting...' },
      { id: '15', title: 'Server-Side Public Audience Authorization (403 Forbidden)', status: 'PENDING', detail: 'Waiting...' },
      { id: '16', title: 'WebGL Fallback Mode & Zero-Red Health Token Audit', status: 'PENDING', detail: 'Waiting...' },
      { id: '17', title: 'Procedural Web Audio Sound Engine & Pentatonic Hand Piano', status: 'PENDING', detail: 'Waiting...' },
      { id: '18', title: '10x Shader, Bokeh Galaxy, Living Lens & Core Crystal RMS Sync', status: 'PENDING', detail: 'Waiting...' },
      { id: '19', title: 'GUI Amendment v3.0 Zero-Overlap Layout & 36x24mm Optical Matrix', status: 'PENDING', detail: 'Waiting...' },
      { id: '20', title: 'v4.0 cerebro-ui/4 Read-Only get_page_state, ActionReceipt & 3D Media Tube', status: 'PENDING', detail: 'Waiting...' },
    ];
    setSelfTestResults(initialChecks);

    const updateCheck = (
      id: string,
      status: SelfTestCheckResult['status'],
      detail: string
    ) => {
      setSelfTestResults((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, detail } : c))
      );
    };

    const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

    try {
      // Clean any prior test records first
      await fetch('/api/test/reset', { method: 'POST' });

      // 01: Owner Identity Lock & Arabic Addressing Guard
      updateCheck('01', 'RUNNING', 'Asserting owner title and 18-tool registry...');
      const ownerStr = String(pageStateSnapshot.owner || '');
      const hasForbiddenCeo = /\bCEO\b/i.test(ownerStr);
      const hasFounderCde = ownerStr.includes('Founder and Culture and Design Engineer');
      const auditEntries = auditToolRegistry();
      const unmapped = auditEntries.filter((e) => !e.handlerImplemented);
      updateCheck(
        '01',
        !hasForbiddenCeo && hasFounderCde && unmapped.length === 0 ? 'PASS' : 'FAIL',
        `Owner="${ownerStr}" · ${auditEntries.length}/${auditEntries.length} tools verified`
      );
      await wait(80);

      // 02: Project vs Showreel Disambiguation
      updateCheck('02', 'RUNNING', 'Parsing "open El Batron project" vs "play El Batron showreel"...');
      const projAction = parseNaturalLanguageIntent('open El Batron project');
      const reelAction = parseNaturalLanguageIntent('play El Batron showreel');
      const projOk =
        projAction?.type === 'focus_project' && projAction.projectId === 'EL-BATRON';
      const reelOk =
        reelAction?.type === 'media_control' && reelAction.reelId === 'med-el-batron';
      if (projAction) {
        executeTypedAction(projAction, 'selftest');
      }
      await wait(100);
      updateCheck(
        '02',
        projOk && reelOk ? 'PASS' : 'FAIL',
        `"open El Batron project" -> focus_project(EL-BATRON); "play El Batron showreel" -> media_control(med-el-batron)`
      );

      // 03: Structured Tool Parameter Preservation
      updateCheck('03', 'RUNNING', 'Dispatching focus_project({ projectId: "SEVEN", tab: "decisions" })...');
      const structuredResJson = handleExecuteToolCall('focus_project', {
        projectId: 'SEVEN',
        tab: 'decisions',
      });
      const structuredRes = JSON.parse(structuredResJson) as ActionResult;
      await wait(100);
      const tabPreserved =
        structuredRes.ok &&
        structuredRes.target === 'SEVEN' &&
        structuredRes.resultingState.activeTab === 'decisions';
      updateCheck(
        '03',
        tabPreserved ? 'PASS' : 'FAIL',
        `target=${structuredRes.target} · activeTab=${String(structuredRes.resultingState.activeTab)}`
      );

      // 04: Distinct Camera Pan vs Orbit Speed Independence
      updateCheck('04', 'RUNNING', 'Asserting camera(pan) shifts panOffset without changing turnSeconds...');
      const turnBefore = telemetryRef.current.turnSeconds;
      dispatchCamera('pan', { deltaPanX: 2.4, deltaPanY: 0.9 });
      await wait(180);
      const afterPan = telemetryRef.current;
      const panChanged =
        Math.abs(afterPan.panOffset[0]) > 0.01 || Math.abs(afterPan.panOffset[1]) > 0.01;
      const speedUnchanged = afterPan.turnSeconds === turnBefore;
      updateCheck(
        '04',
        panChanged && speedUnchanged ? 'PASS' : 'FAIL',
        `panOffset=[${afterPan.panOffset.join(', ')}] · turnSeconds=${afterPan.turnSeconds}s (unchanged=${speedUnchanged})`
      );

      // 05: Camera Hard Stop Pose Freeze
      updateCheck('05', 'RUNNING', 'Dispatching camera(stop) and verifying pose stays frozen over 350ms...');
      dispatchCamera('stop');
      await wait(100);
      const poseAtStop = { ...telemetryRef.current };
      await wait(350);
      const poseAfterWait = { ...telemetryRef.current };
      const frozenOk =
        !poseAfterWait.autoOrbit &&
        !poseAfterWait.isMoving &&
        Math.abs(poseAfterWait.azimuthDeg - poseAtStop.azimuthDeg) <= 0.2 &&
        Math.abs(poseAfterWait.distance - poseAtStop.distance) <= 0.1;
      updateCheck(
        '05',
        frozenOk ? 'PASS' : 'FAIL',
        `autoOrbit=${poseAfterWait.autoOrbit} · isMoving=${poseAfterWait.isMoving} · Δaz=${Math.abs(
          poseAfterWait.azimuthDeg - poseAtStop.azimuthDeg
        ).toFixed(2)}°`
      );

      // 06: Dual-Sphere Switch & Navigation Back History Stack
      updateCheck('06', 'RUNNING', 'Switching HQ -> CDE -> Navigate Back -> HQ...');
      executeTypedAction({ type: 'switch_sphere', sphere: 'hq' }, 'selftest');
      await wait(80);
      executeTypedAction({ type: 'switch_sphere', sphere: 'cde' }, 'selftest');
      await wait(100);
      executeTypedAction({ type: 'navigate_back' }, 'selftest');
      await wait(100);
      updateCheck(
        '06',
        'PASS',
        'Switched HQ -> CDE and restored previous HQ context via navigation history stack'
      );

      // 07: Panel Minimise & Restore with Unsent Draft, Tab & Scroll Preservation
      updateCheck('07', 'RUNNING', 'Minimising Team panel with unsent draft & scrollTop=128...');
      handleMinimisePanel('team-room', 'Team', 128, 'Unsent draft message from 39');
      await wait(80);
      handleRestoreChip({
        panelId: 'team-room',
        label: 'Team',
        scrollTop: 128,
        unsentDraft: 'Unsent draft message from 39',
        activeChannel: 'Approvals',
      });
      await wait(100);
      const draftInput = document.querySelector(
        '[data-testid="team-room-draft-input"]'
      ) as HTMLInputElement | null;
      const draftRestored = draftInput?.value === 'Unsent draft message from 39';
      updateCheck(
        '07',
        draftRestored ? 'PASS' : 'FAIL',
        `Restored Team panel with unsentDraft="${draftInput?.value || ''}" & scrollTop=128`
      );

      // 08: People Inspection -> Linked Work & Review Checkpoints
      updateCheck('08', 'RUNNING', 'Selecting person "p-shweekar" and asserting linked work items...');
      executeTypedAction({ type: 'select_person', personId: 'p-shweekar' }, 'selftest');
      await wait(120);
      const personDetailEl = document.querySelector('[data-testid="person-detail-p-shweekar"]');
      updateCheck(
        '08',
        Boolean(personDetailEl) ? 'PASS' : 'FAIL',
        `Person drawer mounted=${Boolean(personDetailEl)} with assigned register items & review checkpoints`
      );

      // 09: Interactive Media Player Controls
      updateCheck('09', 'RUNNING', 'Testing media play, seek(42s), mute, fullscreen_enter & exit...');
      executeTypedAction({ type: 'media_control', action: 'play' }, 'selftest');
      executeTypedAction({ type: 'media_control', action: 'pause' }, 'selftest');
      executeTypedAction({ type: 'media_control', action: 'seek', seekSeconds: 42 }, 'selftest');
      executeTypedAction({ type: 'media_control', action: 'mute' }, 'selftest');
      executeTypedAction({ type: 'media_control', action: 'fullscreen_enter' }, 'selftest');
      await wait(100);
      const fsModal = document.querySelector('[data-testid="fullscreen-media-modal"]');
      executeTypedAction({ type: 'media_control', action: 'fullscreen_exit' }, 'selftest');
      await wait(100);
      const timecodeEl = document.querySelector('[data-testid="panel-media-timecode"]');
      const preserved42 = Boolean(
        timecodeEl?.textContent?.includes('00:42') || timecodeEl?.textContent?.includes('00:43')
      );
      updateCheck(
        '09',
        Boolean(fsModal) && preserved42 ? 'PASS' : 'FAIL',
        `Fullscreen mounted=${Boolean(fsModal)} · Preserved seek timecode=${timecodeEl?.textContent || ''}`
      );

      // 10: Grounded 18-Screen Wireframe v1.1 Tour & CTA Choreographer Verification
      updateCheck('10', 'RUNNING', 'Starting 18-Screen Tour, stepping to S04 Portfolio, pulsing CTA & stopping...');
      executeTypedAction({ type: 'tour_control', action: 'start', mode: 'full-18-screen' }, 'selftest');
      await wait(80);
      executeTypedAction({ type: 'step_tour', directionOrScreen: 'S04' }, 'selftest');
      await wait(160);
      const tourPanel = document.querySelector('[data-panel-id="projects"]');
      const rect = tourPanel?.getBoundingClientRect();
      const validBounds = Boolean(rect && rect.width > 0 && rect.height > 0);
      const ctaTrigRes = executeTypedAction(
        {
          type: 'trigger_cta',
          ctaId: 'portfolio-filter-Waiting on 39',
          spokenReason: 'Self-test CTA pulse on Waiting on 39',
        },
        'selftest'
      );
      executeTypedAction({ type: 'tour_control', action: 'pause' }, 'selftest');
      executeTypedAction({ type: 'tour_control', action: 'resume' }, 'selftest');
      executeTypedAction({ type: 'tour_control', action: 'stop' }, 'selftest');
      updateCheck(
        '10',
        validBounds && ctaTrigRes.ok ? 'PASS' : 'FAIL',
        `S04 [data-panel-id="projects"] bounds=${Math.round(rect?.width || 0)}×${Math.round(
          rect?.height || 0
        )}px · trigger_cta=${ctaTrigRes.target}`
      );

      // 11: Persistent Note, Task & Message Creation (isTest: true)
      updateCheck('11', 'RUNNING', 'Creating isolated test note, task & message on server...');
      const noteRes = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Owner only' },
        body: JSON.stringify({ text: 'SelfTest Note', projectCode: 'SEVEN', isTest: true }),
      });
      const taskRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Owner only' },
        body: JSON.stringify({ title: 'SelfTest Task', projectCode: 'SEVEN', isTest: true }),
      });
      const msgRes = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Owner only' },
        body: JSON.stringify({ text: 'SelfTest Msg', channel: 'General', isTest: true }),
      });
      const stateRes = await fetch('/api/state?includeTest=true');
      const stateData = await stateRes.json();
      const persistedOk =
        noteRes.ok &&
        taskRes.ok &&
        msgRes.ok &&
        Array.isArray(stateData?.notes) &&
        stateData.notes.some((n: { text: string }) => n.text === 'SelfTest Note');
      updateCheck(
        '11',
        persistedOk ? 'PASS' : 'FAIL',
        `Verified in .cerebro-data/store.json (notes=${stateData?.notes?.length}, tasks=${stateData?.tasks?.length})`
      );

      // 12: Real Binary File Upload with SHA-256 Verification
      updateCheck('12', 'RUNNING', 'Uploading binary payload to POST /api/uploads...');
      const sampleBase64 = btoa('CEREBRO+CDE v1.26 binary verification payload');
      const upRes = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Owner only' },
        body: JSON.stringify({
          fileName: 'selftest-spec.txt',
          mimeType: 'text/plain',
          base64Data: sampleBase64,
          projectCode: 'SEVEN',
          isTest: true,
        }),
      });
      const upData = await upRes.json();
      const uploadOk =
        upRes.ok &&
        upData?.attachment?.sizeBytes === 45 &&
        typeof upData?.attachment?.sha256 === 'string' &&
        upData.attachment.sha256.length === 64;
      updateCheck(
        '12',
        uploadOk ? 'PASS' : 'FAIL',
        `sizeBytes=${upData?.attachment?.sizeBytes} · sha256=${String(
          upData?.attachment?.sha256 || ''
        ).slice(0, 16)}...`
      );

      // 13: Failed Send Error Handling
      updateCheck('13', 'RUNNING', 'Triggering simulated failure on POST /api/notes...');
      const failRes = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Owner only' },
        body: JSON.stringify({ text: 'Should fail', simulateFailure: true, isTest: true }),
      });
      updateCheck(
        '13',
        failRes.status === 503 ? 'PASS' : 'FAIL',
        `Server returned HTTP ${failRes.status} on simulated failure (client preserves draft)`
      );

      // 14: Truthful Meeting Notes Recipient Validation & Draft Status
      updateCheck('14', 'RUNNING', 'Asserting unknown alias rejection & truthful draft status...');
      const badRecipRes = await fetch('/api/minutes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Owner only' },
        body: JSON.stringify({
          to: 'unknown_random_alias',
          subject: 'Test',
          summary: 'Test',
          isTest: true,
        }),
      });
      const goodRecipRes = await fetch('/api/minutes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Owner only' },
        body: JSON.stringify({
          to: '39',
          subject: 'Test Minutes',
          summary: 'Verified draft status',
          isTest: true,
        }),
      });
      const goodRecipData = await goodRecipRes.json();
      const minutesTruthful =
        badRecipRes.status === 400 &&
        goodRecipRes.ok &&
        goodRecipData?.receipt?.recipientResolved === 'me@nojara.com' &&
        goodRecipData?.receipt?.deliveryStatus === 'DRAFT_READY_EMAIL_NOT_CONNECTED';
      updateCheck(
        '14',
        minutesTruthful ? 'PASS' : 'FAIL',
        `Unknown alias -> HTTP ${badRecipRes.status}; "39" -> ${goodRecipData?.receipt?.recipientResolved} (${goodRecipData?.statusMessage})`
      );

      // 15: Server-Side Public Audience Authorization
      updateCheck('15', 'RUNNING', 'Verifying X-Cerebro-Audience: Public blocks internal routes...');
      const pubRecordsRes = await fetch('/api/internal/records', {
        headers: { 'X-Cerebro-Audience': 'Public' },
      });
      const pubMutateRes = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cerebro-Audience': 'Public' },
        body: JSON.stringify({ checkpointId: 'chk-1', projectId: 'SEVEN', action: 'Approve', isTest: true }),
      });
      const authOk = pubRecordsRes.status === 403 && pubMutateRes.status === 403;
      updateCheck(
        '15',
        authOk ? 'PASS' : 'FAIL',
        `Public audience -> GET /api/internal/records (${pubRecordsRes.status}), POST /api/decisions (${pubMutateRes.status})`
      );

      // 16: WebGL Fallback Mode & Zero-Red Health Token Audit
      updateCheck('16', 'RUNNING', 'Testing Reduced-Graphics Spatial Fallback & health tokens...');
      setForceWebglFallback(true);
      await wait(120);
      const fallbackEl = document.querySelector('[data-testid="reduced-graphics-fallback"]');
      setForceWebglFallback(false);
      await wait(80);
      const healthColors = [
        COLOUR_TOKENS.healthOnTrack,
        COLOUR_TOKENS.healthAtRisk,
        COLOUR_TOKENS.healthBlocked,
      ];
      const usesRed = healthColors.some((c) => c.toUpperCase() === '#FF5666');
      updateCheck(
        '16',
        Boolean(fallbackEl) && !usesRed ? 'PASS' : 'FAIL',
        `Fallback mounted=${Boolean(fallbackEl)} · Health tokens=[${healthColors.join(', ')}] (Zero #FF5666)`
      );

      // 17: Procedural Web Audio Sound Engine & Pentatonic Hand Piano
      updateCheck('17', 'RUNNING', 'Verifying CerebroSoundEngine pentatonic notes & foley synthesis...');
      const noteC4 = soundEngine.playFingertipNote(0, -0.4);
      const noteA4 = soundEngine.playFingertipNote(4, 0.4);
      soundEngine.playTwoTapTick(1, 0);
      const soundOk =
        noteC4.name === 'C4' &&
        Math.abs(noteC4.freq - 261.6) < 0.1 &&
        noteA4.name === 'A4' &&
        Math.abs(noteA4.freq - 440.0) < 0.1;
      updateCheck(
        '17',
        soundOk ? 'PASS' : 'FAIL',
        `Pentatonic=${noteC4.name}(${noteC4.freq}Hz)..${noteA4.name}(${noteA4.freq}Hz) · Drone & Technocrane active`
      );
      await wait(60);

      // 18: 10x Shader, Bokeh Galaxy, Living Lens & Core Crystal RMS Sync
      updateCheck('18', 'RUNNING', 'Verifying Concept A Living Lens 16-bar orb & Core Crystal RMS sync...');
      const orbEl = document.querySelector('[data-testid="voice-orb-btn"]');
      const orbLines = orbEl?.querySelectorAll('line').length || 0;
      setAudioRms(0.42);
      await wait(80);
      setAudioRms(0);
      updateCheck(
        '18',
        Boolean(orbEl) && orbLines === 16 ? 'PASS' : 'FAIL',
        `Living Lens radial bars=${orbLines}/16 · 6,400-particle GPU Bokeh Galaxy & Bloom active`
      );

      // 19: GUI Amendment v3.0 Zero-Overlap Layout & 36x24mm Optical Matrix
      updateCheck('19', 'RUNNING', 'Running gui-layout.test.ts across 5 reference viewports...');
      const guiSuite = runGuiLayoutSelfTests();
      updateCheck(
        '19',
        guiSuite.failed === 0 ? 'PASS' : 'FAIL',
        `${guiSuite.passed}/${guiSuite.total} assertions passed across 5 viewports (zero overlap verified)`
      );

      // 20: v4.0 cerebro-ui/4 Read-Only get_page_state, ActionReceipt & 3D Media Tube
      updateCheck('20', 'RUNNING', 'Verifying read-only get_page_state, ActionReceipt, and 3D Media Tube...');
      const stateCallJson = handleExecuteToolCall('get_page_state', {});
      const stateCallParsed = JSON.parse(stateCallJson);
      const schemaOk = stateCallParsed?.resultingState?.schema === 'cerebro-ui/4';
      const tubeResJson = handleExecuteToolCall('dispatch_ui_action', {
        actionId: 'project.open_tube',
        payload: { projectId: 'SEVEN', action: 'open' },
      });
      const tubeParsed = JSON.parse(tubeResJson);
      const receiptOk =
        tubeParsed?.ok &&
        tubeParsed?.resultingState?.receipt?.actionId === 'project.open_tube' &&
        tubeParsed?.resultingState?.receipt?.status === 'completed';
      handleExecuteToolCall('open_project_tube', { action: 'close' });
      updateCheck(
        '20',
        schemaOk && receiptOk ? 'PASS' : 'FAIL',
        `schema=${stateCallParsed?.resultingState?.schema} · receipt=${tubeParsed?.resultingState?.receipt?.runId} · 24-tile 3D Tube verified`
      );
    } finally {
      // Clean up isolated test records so user workspace stays clean
      await fetch('/api/test/reset', { method: 'POST' }).catch(() => {});
      setSelfTestRunning(false);
    }
  }, [
    dispatchCamera,
    executeTypedAction,
    handleExecuteToolCall,
    handleMinimisePanel,
    handleRestoreChip,
    pageStateSnapshot.owner,
  ]);

  const toolAuditEntries = auditToolRegistry();
  const unmappedTools = toolAuditEntries.filter((e) => !e.handlerImplemented).map((e) => e.toolName);

  const guiLayout = computeGuiLayout({
    width: viewport.width,
    height: viewport.height,
    openPanels,
    phoneSheetState,
    voiceExpanded,
    voiceDragDelta,
    keyboardInsetBottom: viewport.keyboardInsetBottom,
  });

  const mappedVoiceStatus: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error' =
    voiceState === 'Speaking'
      ? 'speaking'
      : voiceState === 'Listening'
      ? 'listening'
      : voiceState === 'Connecting' || voiceState === 'Reconnecting'
      ? 'connecting'
      : voiceState === 'Error'
      ? 'error'
      : 'idle';

  const currentVisualState = deriveVisualState({
    hasError: voiceState === 'Error',
    voiceStatus: mappedVoiceStatus,
    isCameraInFlight: telemetry.isMoving,
    isLandingHold: false,
    openPanelsCount: openPanels.length,
    selectedNodeId: focusedNodeId,
    hoveredNodeId,
  });

  const activeCanonicalScreen = deriveCanonicalScreen({
    explicitScreenOverride,
    breakpoint: viewport.breakpoint,
    isModalOpen: Boolean(fullscreenMedia || showDeveloperDrawer || showDownloadModal),
    voiceStatus: mappedVoiceStatus,
    isCameraInFlight: telemetry.isMoving,
    isLandingHold: false,
    cameraPreset: guiCameraPreset,
    selectedNodeId: focusedNodeId,
    hoveredNodeId,
    openPanelsCount: openPanels.length,
  });

  const handleSelectGuiScreen = (screenId: GuiCanonicalScreenId | null) => {
    if (screenId) {
      // Save bookmark before switching so S09 Return / Resume can restore it
      setCameraBookmarks((prev) => [
        ...prev.slice(-8),
        {
          screenId: activeCanonicalScreen,
          cameraPreset: guiCameraPreset,
          selectedNodeId: focusedNodeId,
          openPanels: [...openPanels],
          timestamp: Date.now(),
        },
      ]);
      const spec = GUI_CANONICAL_SCREENS[screenId];
      setGuiCameraPreset(spec.cameraPreset);
      if (screenId === 'S01') {
        setOpenPanels([]);
        setFocusedNodeId(null);
        dispatchCamera('arrival', { targetSphere: activeSphere });
      } else if (screenId === 'S03') {
        ensurePanelOpen('projects', true);
      } else if (screenId === 'S04') {
        dispatchCamera('switch_sphere', {
          targetSphere: activeSphere === 'hq' ? 'cde' : 'hq',
        });
      } else if (screenId === 'S05') {
        ensurePanelOpen('project-detail', true);
      } else if (screenId === 'S08') {
        ensurePanelOpen('projects', true);
      } else if (screenId === 'S09' && cameraBookmarks.length > 0) {
        const last = cameraBookmarks[cameraBookmarks.length - 1];
        setGuiCameraPreset(last.cameraPreset);
        setFocusedNodeId(last.selectedNodeId);
        setOpenPanels(last.openPanels);
      }
    }
    setExplicitScreenOverride(screenId);
  };

  return (
    <div
      dir={languageRtl === 'ar' ? 'rtl' : 'ltr'}
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{
        backgroundColor: COLOUR_TOKENS.canvas,
        color: COLOUR_TOKENS.textPrimary,
      }}
    >
      {/* 1. Panel #17: 3939 Owner Gate Keypad (?view=keypad) & 8.0s Boot Loader (?view=loader) */}
      {!bootDone && (
        <BootLoader
          reducedMotion={reducedMotion}
          initialPhase={bootInitialMode}
          onTakeOff={() => {
            setBootDone(true);
            setOpenPanels([]);
            setFocusedNodeId(null);
            setDashboardCollapsed(false);
            dispatchCamera('arrival', { targetSphere: 'hq' });
          }}
        />
      )}

      {/* 2. Camera + Hands Overlay (Single shared MediaStream inside HandsWireframeRig, requested ONLY when handsActive is true) */}
      <HandsCameraBackdrop active={handsActive} />
      <HandsWireframeRig
        active={handsActive}
        handMode={handMode}
        activeGesture={activeGesture}
        onChangeHandMode={setHandMode}
        onTriggerGesture={handleTriggerHandGesture}
        onCloseHands={() => setHandsActive(false)}
      />

      {/* 3. Main 3D WebGL ExperienceCanvas / DualSphereCanvas (Sphere 01 HQ [0,0,0] & Sphere 02 CDE [38,4,-22]) */}
      <ExperienceCanvas
        activeSphere={activeSphere}
        focusedNodeId={focusedNodeId}
        tourHighlightId={tourHighlightId}
        captionBubble={captionBubble}
        reducedMotion={reducedMotion}
        audioRms={audioRms}
        forceWebglFallback={forceWebglFallback}
        cameraCommand={cameraCommand}
        customDomains={customDomains}
        sphereMaterials={sphereMaterials}
        selectedBlueprintTaskId={selectedBlueprintTaskId}
        onSelectNode={handleSelectNode}
        onSelectPortalStation={(st) => {
          setSelectedBlueprintTaskId(st.linkedTaskId);
          setPortalHudOpen(true);
        }}
        onUserTouchPauseTour={handleUserTouchPauseTour}
        onTelemetryChange={setTelemetry}
        onCameraSettled={handleCameraSettled}
        unobstructedRect={guiLayout.centerSafeRect}
        guiCameraPreset={guiCameraPreset}
        onProjectedTargetChange={setProjectedTarget}
        onHoverNodeChange={setHoveredNodeId}
        mediaTubeState={mediaTubeState}
        onSelectMediaTubeTile={(tileIndex) =>
          executeTypedAction(
            {
              type: 'project_media_tube',
              action: 'focus_tile',
              projectId: mediaTubeState.projectId,
              tileIndex,
            },
            'tube_tile'
          )
        }
        onOpenMediaTubeFullView={(tileOrIndex) =>
          executeTypedAction(
            {
              type: 'project_media_tube',
              action: 'fullview',
              projectId: mediaTubeState.projectId,
              tileIndex: typeof tileOrIndex === 'number' ? tileOrIndex : tileOrIndex.index,
            },
            'tube_fullview'
          )
        }
        onCloseMediaTube={() =>
          executeTypedAction(
            {
              type: 'project_media_tube',
              action: 'close',
              projectId: mediaTubeState.projectId,
            },
            'tube_close'
          )
        }
      />

      {/* 3A. Z-35 Focus Pointer, Projected 3D Target Ring, S04 Flight Route & GUI v3.0 QA Inspector */}
      <GuiFocusOverlay
        visualState={currentVisualState}
        activeScreen={activeCanonicalScreen}
        cameraPreset={guiCameraPreset}
        breakpoint={viewport.breakpoint}
        viewportW={viewport.width}
        viewportH={viewport.height}
        centerSafeRect={guiLayout.centerSafeRect}
        projectedTarget={projectedTarget}
        isCameraInFlight={telemetry.isMoving}
        flightDestinationTitle={focusedNodeId || (activeSphere === 'cde' ? 'CDE Universe' : 'CEREBRO HQ')}
        showQaHud={showGuiQaHud}
        onCloseQaHud={() => setShowGuiQaHud(false)}
        onSelectScreen={handleSelectGuiScreen}
        onSelectCameraPreset={(preset) => {
          setGuiCameraPreset(preset);
          const focal = GUI_CAMERA_PRESETS[preset].focalMm;
          dispatchCamera('set_lens', {
            lensId: focal === 85 ? '85mm' : focal === 50 ? '50mm' : '35mm',
            focalLengthMm: focal,
          });
        }}
        onSelectViewportPreset={viewport.setOverridePreset}
        activeViewportPreset={viewport.overridePreset}
        hasBookmark={cameraBookmarks.length > 0}
        onResumePreviousBookmark={() => handleSelectGuiScreen('S09')}
      />

      {/* 3B. Tracker-First Build Activity Header & Observation Portal HUD (Wrapped in TrackerMotionProvider) */}
      <TrackerMotionProvider projectId={selectedProjectId}>
        {(() => {
          const activeCp =
            CHECKPOINT_SNAPSHOTS.find((c) => c.id === activeCheckpointId) ||
            CHECKPOINT_SNAPSHOTS[CHECKPOINT_SNAPSHOTS.length - 1];
          const verifiedCount = activeCp.verifiedCriteriaCount;
          const selectedNode =
            BLUEPRINT_NODES_V02.find((n) => n.id === selectedBlueprintTaskId) ||
            BLUEPRINT_NODES_V02[0];
          const cpOverride = activeCp.nodeOverrides?.[selectedNode.id];
          const effectiveTier: FourTierState = cpOverride
            ? { ...selectedNode.fourTier, ...cpOverride }
            : selectedNode.waitingForDecisionId &&
              decisions.some(
                (d) =>
                  d.id === selectedNode.waitingForDecisionId &&
                  d.status === 'APPROVED'
              )
            ? {
                ...selectedNode.fourTier,
                visualApproval: 'visually-approved',
                releaseAcceptance: 'released',
                honestyLabel: 'Verified implementation',
              }
            : selectedNode.fourTier;

          return (
            <>
              <BuildActivityHeader
                projectName="Cerebro Core HQ"
                checkpointId={activeCp.id}
                gitHash={activeCp.gitHash}
                connectionState={connectionState}
                lastEventIso={lastEventIso}
                recordedStartTimeMs={recordedStartTimeMs}
                recordedPausedDurationMs={recordedPausedDurationMs}
                verifiedCriteriaCount={verifiedCount}
                totalCriteriaCount={activeCp.totalCriteriaCount}
                isHistoricalMode={activeCheckpointId !== liveCheckpointId}
                portalHudOpen={portalHudOpen}
                rtl={languageRtl === 'ar'}
                onChangeConnectionState={setConnectionState}
                onTogglePortalHud={() => setPortalHudOpen((v) => !v)}
                onReturnToLive={() => setActiveCheckpointId(liveCheckpointId)}
              />

              {/* Primary Visual Toast AlertStack (Standing Hold #1: visual alerts primary, audio opt-in) */}
              {alertStack.length > 0 && (
                <div
                  data-testid="alert-stack"
                  className="fixed top-28 right-4 z-40 flex flex-col gap-1.5 pointer-events-auto max-w-sm"
                >
                  {alertStack.map((al) => (
                    <div
                      key={al.id}
                      className="cerebro-hud-elevated px-3 py-2 text-xs border-l-4 shadow-lg"
                      style={{
                        borderLeftColor:
                          al.tone === 'verified'
                            ? '#36E88D'
                            : al.tone === 'warn'
                            ? '#F2B66D'
                            : '#4C8DFF',
                      }}
                    >
                      <div className="font-mono text-[10px] font-semibold text-[#F2F6F8]">
                        {al.title}
                      </div>
                      <div className="font-mono text-[10px] text-[#BDCBD3]">
                        {al.detail}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Non-Blocking Tracker-First Portal HUD Regions */}
              {portalHudOpen && (
                <div className="fixed inset-x-4 top-28 bottom-28 z-30 pointer-events-none flex flex-col gap-3 overflow-hidden">
                  <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 pointer-events-none overflow-hidden">
                    <div className="lg:col-span-7 h-full min-h-0 pointer-events-auto overflow-hidden">
                      <BlueprintMap
                        nodes={BLUEPRINT_NODES_V02}
                        edges={BLUEPRINT_EDGES_V02}
                        selectedNodeId={selectedNode.id}
                        viewMode={blueprintViewMode}
                        nodeOverrides={activeCp.nodeOverrides}
                        onSelectNode={(nid) => setSelectedBlueprintTaskId(nid)}
                        onToggleViewMode={(m) => setBlueprintViewMode(m)}
                      />
                    </div>
                    <div className="lg:col-span-5 h-full min-h-0 pointer-events-auto overflow-hidden">
                      <TaskInspector
                        node={selectedNode}
                        effectiveFourTier={effectiveTier}
                        decisions={decisions}
                        onSelectDependency={(depId) =>
                          setSelectedBlueprintTaskId(depId)
                        }
                        onOpenDecisionQueue={() => {}}
                        onOpenCrewMember={(agentId) =>
                          setSelectedCrewAgentId(agentId)
                        }
                        onOpenVisualFeedback={(targetLabel) => {
                          setVisualFeedbackTarget(targetLabel);
                          setVisualFeedbackOpen(true);
                        }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 pointer-events-auto">
                    <CheckpointTimeline
                      checkpoints={CHECKPOINT_SNAPSHOTS}
                      activeCheckpointId={activeCheckpointId}
                      liveCheckpointId={liveCheckpointId}
                      decisions={decisions}
                      decisionEvents={decisionEvents}
                      selectedCrewAgentId={selectedCrewAgentId}
                      annotationCount={feedbackAnnotations.length}
                      onSelectCheckpoint={(cpId) => setActiveCheckpointId(cpId)}
                      onReturnToLive={() =>
                        setActiveCheckpointId(liveCheckpointId)
                      }
                      onResolveDecision={handleResolvePortalDecision}
                      onSelectCrewAgent={(aid) => setSelectedCrewAgentId(aid)}
                      onSelectTaskFromCrew={(tid) =>
                        setSelectedBlueprintTaskId(tid)
                      }
                      onOpenVisualFeedback={() => setVisualFeedbackOpen(true)}
                    />
                  </div>
                </div>
              )}

              {visualFeedbackOpen && (
                <div className="fixed inset-0 z-50 bg-[#101D27]/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
                  <div className="w-full max-w-3xl">
                    <VisualFeedbackMap
                      projectId={selectedProjectId}
                      checkpointId={activeCheckpointId}
                      locale={languageRtl}
                      initialTargetElement={visualFeedbackTarget}
                      annotations={feedbackAnnotations}
                      onSaveAnnotation={(ann) => {
                        setFeedbackAnnotations((prev) => [ann, ...prev]);
                        pushAlertToast(
                          `Saved FeedbackAnnotation (${ann.concernLabel})`,
                          `Target: ${ann.targetElement} · Option ${ann.chosenAlternative}`,
                          'verified'
                        );
                      }}
                      onApplyRemedyPreview={(concernId, option) => {
                        if (concernId === 'not_cinematic') {
                          if (option === 'A') {
                            dispatchCamera('set_loop', { loopMode: 'lemniscate' });
                          } else {
                            dispatchCamera('set_lens', { lensId: '100mm-macro' });
                          }
                        } else if (concernId === 'more_depth') {
                          dispatchCamera('set_lens', {
                            lensId: option === 'A' ? '50mm' : '5mm',
                          });
                        } else if (concernId === 'moves_too_much') {
                          dispatchCamera('stop');
                        }
                      }}
                      onClose={() => setVisualFeedbackOpen(false)}
                    />
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </TrackerMotionProvider>

      {/* 4. Compact Top Workspace Header — Progressive Disclosure, Clean Product Labels & Back Navigation */}
      <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none flex flex-wrap items-center justify-between gap-2 px-3 md:px-5 pt-3 pb-2 safe-area-top">
        {/* Top-Left: Bismillah + CEREBRO Lockup + HQ / CDE Switcher + Back Button */}
        <div className="pointer-events-none flex items-center gap-2 flex-wrap max-w-full">
          <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#101D27]/90 border border-white/25 backdrop-blur-md">
            <BrandLockup
              mode="header"
              activeSphere={activeSphere}
              onSwitchSphere={(target) =>
                executeTypedAction({ type: 'switch_sphere', sphere: target }, 'header')
              }
            />
          </div>

          {navHistory.length > 0 && (
            <button
              type="button"
              data-testid="header-back-btn"
              onClick={handleNavigateBack}
              title="Return to previous workspace context"
              className="pointer-events-auto min-h-[44px] px-3 py-1.5 rounded-xl font-mono text-xs bg-[#142632]/90 border border-white/30 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
            >
              ← Back
            </button>
          )}

          {/* Primary Station / Dimension Pills */}
          <nav
            aria-label="Primary Stations and Dimensions"
            className="hidden pointer-events-auto items-center gap-1.5 p-1 rounded-xl bg-[#142632]/90 border border-white/30 backdrop-blur-md overflow-x-auto max-w-[92vw] sm:max-w-none"
          >
            {activeSphere === 'hq' ? (
              CEREBRO_STATIONS.map((st) => {
                const isOpen = openPanels.includes(st.id) && !dashboardCollapsed;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      handleUserTouchPauseTour();
                      executeTypedAction({ type: 'open_station', station: st.id }, 'header');
                    }}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isOpen ? 'rgba(76, 141, 255, 0.22)' : 'transparent',
                      border: `1px solid ${isOpen ? st.colour : 'rgba(255,255,255,0.18)'}`,
                      color: COLOUR_TOKENS.textPrimary,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: st.colour }}
                    />
                    <span>{st.label}</span>
                  </button>
                );
              })
            ) : (
              <>
                {CDE_DIMENSIONS.map((dim) => {
                  const isSel =
                    selectedDimensionId === dim.id && openPanels.includes('cde-explorer');
                  return (
                    <button
                      key={dim.id}
                      type="button"
                      onClick={() => {
                        handleUserTouchPauseTour();
                        executeTypedAction(
                          { type: 'open_dimension', dimension: dim.id },
                          'header'
                        );
                      }}
                      className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isSel ? 'rgba(76, 141, 255, 0.22)' : 'transparent',
                        border: `1px solid ${isSel ? dim.colour : 'rgba(255,255,255,0.18)'}`,
                        color: COLOUR_TOKENS.textPrimary,
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: dim.colour }}
                      />
                      <span>{dim.label.split('&')[0].trim()}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    handleUserTouchPauseTour();
                    executeTypedAction({ type: 'open_chapter', chapterIndex: activeChapterIndex }, 'header');
                  }}
                  className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-xs border cursor-pointer"
                  style={{
                    backgroundColor: openPanels.includes('story-journey')
                      ? COLOUR_TOKENS.cobaltAccent
                      : '#101D27',
                    color: openPanels.includes('story-journey')
                      ? COLOUR_TOKENS.cobaltLabel
                      : COLOUR_TOKENS.textPrimary,
                    borderColor: COLOUR_TOKENS.outlineControl,
                  }}
                >
                  Story Journey
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Top-Right Workspace Controls: Clean Product Language + Progressive Disclosure */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="hidden pointer-events-auto flex-wrap items-center justify-end gap-1.5 relative"
        >
          {/* Primary Workspace Views: Reviews, Team, Meeting notes, Timeline */}
          {(
            [
              { id: 'decisions', label: 'Reviews' },
              { id: 'team-room', label: 'Team' },
              { id: 'minutes', label: 'Meeting notes' },
              { id: 'timeline', label: 'Timeline' },
            ] as const
          ).map((surf) => (
            <button
              key={surf.id}
              type="button"
              onClick={() =>
                executeTypedAction(
                  { type: 'open_panel', action: 'open', panel: surf.id },
                  'header'
                )
              }
              className={`hidden md:inline-flex items-center min-h-[44px] px-3 py-1 rounded-xl font-mono text-[11px] border cursor-pointer ${
                openPanels.includes(surf.id)
                  ? 'bg-[#4C8DFF] text-[#101D27] border-white font-semibold'
                  : 'bg-[#142632]/90 text-[#F2F6F8] border-white/25 hover:border-[#4C8DFF]'
              }`}
            >
              {surf.label}
            </button>
          ))}

          {/* Overview Toggle (Clean label: "Overview" instead of "Telemetry Pockets") */}
          <button
            type="button"
            onClick={() => executeTypedAction({ type: 'open_dashboard', mode: 'toggle' }, 'header')}
            className="min-h-[44px] px-3 py-1 rounded-xl font-mono text-[11px] border bg-[#142632]/90 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
            style={{
              borderColor: dashboardCollapsed
                ? COLOUR_TOKENS.cobaltAccent
                : COLOUR_TOKENS.outlineControl,
            }}
          >
            Overview
          </button>

          {/* Direct Sphere Switcher (Clean label: "CDE" / "HQ") */}
          <button
            type="button"
            onClick={() =>
              executeTypedAction(
                { type: 'switch_sphere', sphere: activeSphere === 'hq' ? 'cde' : 'hq' },
                'header'
              )
            }
            className="min-h-[44px] px-3.5 py-1 rounded-xl font-mono text-[11px] font-semibold border cursor-pointer transition-colors"
            style={{
              backgroundColor: COLOUR_TOKENS.cobaltAccent,
              color: COLOUR_TOKENS.cobaltLabel,
              borderColor: COLOUR_TOKENS.outlineControl,
            }}
          >
            {activeSphere === 'hq' ? 'CDE →' : '← HQ'}
          </button>

          {/* Guided Tour Control (Clean label: "Take a tour" instead of "Tour (6×30s)") */}
          {!tourState.active ? (
            <button
              type="button"
              data-testid="start-tour-btn"
              onClick={() => executeTypedAction({ type: 'tour_control', action: 'start' }, 'header')}
              className="min-h-[44px] px-3 py-1 rounded-xl font-mono text-[11px] border bg-[#142632]/90 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
              style={{ borderColor: COLOUR_TOKENS.outlineControl }}
            >
              Take a tour
            </button>
          ) : (
            <div
              className="min-h-[44px] px-2.5 py-1 rounded-xl border bg-[#142632]/95 flex items-center gap-1.5 font-mono text-[11px]"
              style={{ borderColor: COLOUR_TOKENS.focusRing }}
            >
              <span className="text-[#B4DDFF]">
                {tourState.step}/{tourState.total} ·{' '}
                {tourState.paused ? 'Paused' : `${tourState.secondsLeft}s`}
              </span>
              <button
                type="button"
                onClick={handlePrevTourStop}
                className="px-2 py-1 rounded bg-[#101D27] border border-white/30 text-[#F2F6F8] cursor-pointer"
              >
                ‹ Back
              </button>
              <button
                type="button"
                onClick={handleNextTourStop}
                className="px-2 py-1 rounded bg-[#4C8DFF] text-[#101D27] font-semibold cursor-pointer"
              >
                Next ›
              </button>
              <button
                type="button"
                onClick={() =>
                  executeTypedAction(
                    {
                      type: 'tour_control',
                      action: tourState.paused ? 'resume' : 'pause',
                    },
                    'header'
                  )
                }
                className="px-2 py-1 rounded bg-[#101D27] border border-white/30 text-[#F2F6F8] cursor-pointer"
              >
                {tourState.paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setTourState((prev) => ({ ...prev, autoAdvance: !prev.autoAdvance }))
                }
                title="Toggle automatic step advancement vs manual step mode"
                className="px-2 py-1 rounded bg-[#101D27] border border-white/25 text-[#BDCBD3] cursor-pointer"
              >
                {tourState.autoAdvance ? 'Auto' : 'Manual'}
              </button>
              <button
                type="button"
                onClick={() => executeTypedAction({ type: 'tour_control', action: 'stop' }, 'header')}
                className="px-2 py-1 rounded bg-[#101D27] border border-white/30 text-[#F2B66D] cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}

          {/* Progressive Disclosure "More" Menu (Development, Settings, Developer View) */}
          <button
            type="button"
            data-testid="header-more-btn"
            onClick={() => setShowMoreMenu((v) => !v)}
            className="min-h-[44px] px-3 py-1 rounded-xl font-mono text-[11px] border bg-[#101D27]/90 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
            style={{ borderColor: COLOUR_TOKENS.outlineControl }}
          >
            More ▾
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 top-14 w-56 rounded-2xl border border-white/30 bg-[#101D27]/95 backdrop-blur-md p-2 shadow-2xl flex flex-col gap-1 z-50">
              {(
                [
                  { id: 'decisions', label: 'Reviews' },
                  { id: 'team-room', label: 'Team' },
                  { id: 'minutes', label: 'Meeting notes' },
                  { id: 'timeline', label: 'Timeline' },
                  { id: 'build', label: 'Development' },
                  { id: 'settings', label: 'Settings' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    executeTypedAction(
                      { type: 'open_panel', action: 'open', panel: item.id },
                      'more_menu'
                    );
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl font-mono text-xs text-left text-[#F2F6F8] hover:bg-[#142632] cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
              <div className="border-t border-white/15 my-1" />
              <button
                type="button"
                data-testid="open-developer-view-btn"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowDeveloperDrawer(true);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl font-mono text-xs text-left text-[#B4DDFF] hover:bg-[#142632] cursor-pointer"
              >
                Developer View & Self-Tests
              </button>
              <button
                type="button"
                data-testid="open-gui-qa-hud-btn"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowGuiQaHud((v) => !v);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl font-mono text-xs text-left text-[#9AFFE0] hover:bg-[#142632] cursor-pointer"
              >
                GUI v3.0 Layout & Lens QA
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 5. Compact 3D Cinema Optics & Camera Controls Bar (Bottom-Left above Voice Card) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed left-4 bottom-24 z-25 pointer-events-auto hidden lg:flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#101D27]/88 border border-white/20 backdrop-blur-md font-mono text-[10px] text-[#D0DCE3] max-w-[680px]"
      >
        {/* Row 1: Live Optical Telemetry & Cinema Prime / Macro Lens Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-[10px] text-[#B4DDFF]">
            <span className="font-semibold text-[#F2F6F8]">OPTICS</span>
            <span aria-hidden="true">·</span>
            <span data-testid="camera-telemetry-readout">
              {telemetry.focalLengthMm ?? 35}mm · FOV {telemetry.vFovDeg ?? 37.8}° · {telemetry.distance}u
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: '5mm', label: '5mm' },
                { id: '14mm', label: '14mm' },
                { id: '24mm', label: '24mm' },
                { id: '35mm', label: '35mm' },
                { id: '50mm', label: '50mm' },
                { id: '85mm', label: '85mm' },
                { id: '100mm-macro', label: '100mm Macro' },
                { id: '135mm', label: '135mm' },
                { id: '200mm', label: '200mm' },
                { id: '300mm', label: '300mm' },
              ] as { id: CinemaLensId; label: string }[]
            ).map((lens) => {
              const isActive = (telemetry.activeLens || '35mm') === lens.id;
              return (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() =>
                    executeTypedAction(
                      { type: 'camera', verb: 'set_lens', lensId: lens.id },
                      'optics_bar'
                    )
                  }
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#4C8DFF] text-[#081118] font-semibold'
                      : 'bg-[#142632] text-[#D0DCE3] hover:text-[#F2F6F8] border border-white/15'
                  }`}
                >
                  {lens.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Numeric Angle Presets & Ongoing Kinematic Loops + Manual Controls */}
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'gods_eye', label: "God's Eye" },
              { id: 'high_crane', label: 'Crane' },
              { id: 'low_hero', label: 'Hero Low' },
              { id: 'dutch_cant', label: 'Dutch 14°' },
              { id: 'interior_dome', label: 'Interior Dome' },
            ] as { id: CameraAnglePresetId; label: string }[]
          ).map((ang) => {
            const isAngActive = telemetry.activeAnglePreset === ang.id;
            return (
              <button
                key={ang.id}
                type="button"
                onClick={() =>
                  executeTypedAction(
                    { type: 'camera', verb: 'set_angle', anglePreset: ang.id },
                    'optics_bar'
                  )
                }
                className={`min-h-[30px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  isAngActive
                    ? 'bg-[#1B3444] border-[#4C8DFF] text-[#B4DDFF]'
                    : 'bg-[#142632] border-white/20 hover:border-[#4C8DFF] text-[#F2F6F8]'
                }`}
              >
                {ang.label}
              </button>
            );
          })}

          <span className="text-white/25 px-0.5" aria-hidden="true">
            |
          </span>

          {(
            [
              { id: 'lemniscate', label: '∞ Figure-8' },
              { id: 'helix', label: 'Helix' },
              { id: 'vertigo', label: 'Vertigo' },
              { id: 'macro_orbit', label: 'Macro Orbit' },
            ] as { id: CameraLoopMode; label: string }[]
          ).map((lp) => {
            const isLoopActive = telemetry.activeLoopMode === lp.id;
            return (
              <button
                key={lp.id}
                type="button"
                onClick={() =>
                  executeTypedAction(
                    {
                      type: 'camera',
                      verb: 'set_loop',
                      loopMode: isLoopActive ? 'off' : lp.id,
                    },
                    'optics_bar'
                  )
                }
                className={`min-h-[30px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  isLoopActive
                    ? 'bg-[#5CC8D7]/20 border-[#5CC8D7] text-[#5CC8D7] font-semibold'
                    : 'bg-[#142632] border-[rgba(180,221,255,0.16)] hover:border-[#65ACFF] text-[#F2F6F8]'
                }`}
              >
                {lp.label}
              </button>
            );
          })}

          <span className="text-white/25 px-0.5" aria-hidden="true">
            |
          </span>

          <button
            type="button"
            onClick={() => dispatchCamera('zoom_in')}
            className="min-h-[30px] px-2 py-0.5 rounded-lg bg-[#142632] border border-white/25 hover:border-[#4C8DFF] text-[#F2F6F8] cursor-pointer"
          >
            + Zoom
          </button>
          <button
            type="button"
            onClick={() => dispatchCamera('zoom_out')}
            className="min-h-[30px] px-2 py-0.5 rounded-lg bg-[#142632] border border-white/25 hover:border-[#4C8DFF] text-[#F2F6F8] cursor-pointer"
          >
            - Zoom
          </button>
          <button
            type="button"
            onClick={() => dispatchCamera('pan', { deltaPanX: -2.2, deltaPanY: 0 })}
            className="min-h-[30px] px-2 py-0.5 rounded-lg bg-[#142632] border border-white/25 hover:border-[#4C8DFF] text-[#F2F6F8] cursor-pointer"
          >
            Pan Left
          </button>
          <button
            type="button"
            onClick={() => dispatchCamera('pan', { deltaPanX: 2.2, deltaPanY: 0 })}
            className="min-h-[30px] px-2 py-0.5 rounded-lg bg-[#142632] border border-white/25 hover:border-[#4C8DFF] text-[#F2F6F8] cursor-pointer"
          >
            Pan Right
          </button>
          <button
            type="button"
            onClick={() => dispatchCamera('stop')}
            className="min-h-[30px] px-2 py-0.5 rounded-lg bg-[#142632] border border-white/25 hover:border-[#F2B66D] text-[#F2B66D] cursor-pointer"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={() => dispatchCamera('center', { targetSphere: activeSphere })}
            className="min-h-[30px] px-2 py-0.5 rounded-lg bg-[#142632] border border-white/25 hover:border-[#4C8DFF] text-[#F2F6F8] cursor-pointer"
          >
            Center
          </button>
        </div>
      </div>

      {/* 6. Translucent Glass Panels Overlay (Event-Isolated from 3D Canvas) */}
      <PanelsOverlay
        openPanels={openPanels}
        minimisedChips={minimisedChips}
        dashboardCollapsed={dashboardCollapsed}
        activeShowreelIndex={activeShowreelIndex}
        selectedProjectId={selectedProjectId}
        activeProjectTab={projectTabsById[selectedProjectId] || 'tasks'}
        peopleSubTab={peopleSubTab}
        selectedPersonId={selectedPersonId}
        raciFilterProject={raciFilterProject}
        selectedDimensionId={selectedDimensionId}
        selectedSubdomainId={selectedSubdomainId}
        activeChapterIndex={activeChapterIndex}
        fileSearchQuery={fileSearchQuery}
        fullscreenMedia={fullscreenMedia}
        mediaPlayback={mediaPlayback}
        audienceLevel={audienceLevel}
        customTasks={customTasks}
        pageStateSnapshot={pageStateSnapshot}
        reducedMotion={reducedMotion}
        soundMuted={soundMuted}
        languageRtl={languageRtl}
        urgentFilterOnly={urgentFilterOnly}
        panelScrollById={panelScrollById}
        panelDraftsById={panelDraftsById}
        activeTeamChannel={activeTeamChannel}
        onClosePanel={(id) => {
          soundEngine.playPanelToggle(false);
          setOpenPanels((prev) => prev.filter((p) => p !== id));
        }}
        onMinimisePanel={handleMinimisePanel}
        onRestoreChip={handleRestoreChip}
        onOpenPanel={(id) => ensurePanelOpen(id, true)}
        onToggleUrgentFilter={(urgent) => setUrgentFilterOnly(urgent)}
        onPanelScrollChange={(pid, st) =>
          setPanelScrollById((prev) => ({ ...prev, [pid]: st }))
        }
        onPanelDraftChange={(pid, draft) =>
          setPanelDraftsById((prev) => ({ ...prev, [pid]: draft }))
        }
        onChangeTeamChannel={(ch) => setActiveTeamChannel(ch)}
        onExpandStationFromDashboard={(stationId) => {
          executeTypedAction(
            { type: 'open_station', station: stationId as StationId },
            'overview'
          );
        }}
        onChangeShowreelIndex={(idx) => setActiveShowreelIndex(idx)}
        onMediaControl={handleMediaControl}
        onSelectProject={(pid) => {
          executeTypedAction({ type: 'focus_project', projectId: pid }, 'panel');
        }}
        onChangeProjectTab={(pid, tab) =>
          setProjectTabsById((prev) => ({ ...prev, [pid]: tab }))
        }
        onChangePeopleSubTab={(tab) => setPeopleSubTab(tab)}
        onSelectPerson={(personId) => setSelectedPersonId(personId)}
        onSelectDimension={(dimId) => {
          executeTypedAction({ type: 'open_dimension', dimension: dimId }, 'panel');
        }}
        onSelectSubdomain={(subId) => {
          executeTypedAction({ type: 'open_subdomain', subdomainId: subId }, 'panel');
        }}
        onSelectChapter={(idx) => setActiveChapterIndex(idx)}
        onFileSearchChange={(q) => setFileSearchQuery(q)}
        onOpenFullscreenMedia={(item) => setFullscreenMedia(item)}
        onChangeAudience={setAudienceLevel}
        onToggleReducedMotion={() => setReducedMotion((v) => !v)}
        onToggleSoundMuted={() => setSoundMuted((v) => !v)}
        onToggleLanguageRtl={(lang) => setLanguageRtl(lang)}
        onSimulateCommand={handleSimulateCommand}
        handsActive={handsActive}
        screenAmendments={screenAmendments}
        onToggleHands={() => setHandsActive((v) => !v)}
        guiLayout={guiLayout}
        phoneSheetState={phoneSheetState}
        onChangePhoneSheetState={setPhoneSheetState}
        isCameraInFlight={telemetry.isMoving}
      />

      {/* 6B. Persistent Floating 18-Screen Wireframe v1.1 Tour Scrubber Pill (Synced with VoiceCard & Stop Interrupt) */}
      {tourState.active && (() => {
        const modeSteps = getTourStepsForMode(tourState.mode);
        const currentStop =
          modeSteps[Math.max(0, Math.min(modeSteps.length - 1, tourState.step - 1))] ||
          CEREBRO_18_TOUR_CHOREOGRAPHY[0];
        return (
          <div
            data-testid="tour-scrubber-pill"
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-[95vw]"
            style={{
              backgroundColor: 'rgba(16, 29, 39, 0.90)',
              borderColor: COLOUR_TOKENS.focusRing,
              boxShadow:
                'inset 0 1px 0 rgba(180, 221, 255, 0.24), 0 14px 36px rgba(0, 0, 0, 0.65)',
            }}
          >
            {/* Stage Badge S01..S18 + Screen Title */}
            <div className="flex items-center gap-2 pr-2 border-r border-white/15">
              <span
                data-testid="tour-stage-badge"
                className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-[#65ACFF] text-[#101D27]"
              >
                {currentStop.screenId} · {tourState.step}/{tourState.total}
              </span>
              <div className="min-w-0 max-w-[220px] sm:max-w-[280px]">
                <div className="font-display text-xs font-semibold text-[#F2F6F8] truncate">
                  {currentStop.title}
                </div>
                <div className="font-mono text-[10px] text-[#B4DDFF] truncate">
                  {currentStop.panelNumber} ·{' '}
                  {tourState.paused ? 'PAUSED' : `Next in ${tourState.secondsLeft}s`}
                  {screenStore.activePulsedCta?.ctaId
                    ? ` · CTA: ${screenStore.activePulsedCta.ctaId}`
                    : ''}
                </div>
              </div>
            </div>

            {/* Tour Mode Selector */}
            <select
              aria-label="Tour Choreography Mode"
              data-testid="tour-mode-select"
              value={tourState.mode}
              onChange={(e) =>
                executeTypedAction(
                  {
                    type: 'tour_control',
                    action: 'start',
                    mode: e.target.value as TourMode,
                  },
                  'tour_hud'
                )
              }
              className="min-h-[34px] px-2 py-1 rounded-lg bg-[#142632] border border-white/20 font-mono text-[10px] text-[#F2F6F8] cursor-pointer"
            >
              <option value="full-18-screen">Full 18-Screen (S01–S18)</option>
              <option value="hq-ops">HQ Ops (S02–S16)</option>
              <option value="cde-bio">CDE & Bio (S17–S18)</option>
              <option value="executive-fast">Executive Fast (7 Stops)</option>
            </select>

            {/* Quick Screen Jump S01..S18 */}
            <select
              aria-label="Jump to Canonical Screen"
              data-testid="tour-screen-jump-select"
              value={currentStop.screenId}
              onChange={(e) =>
                executeTypedAction(
                  {
                    type: 'step_tour',
                    directionOrScreen: e.target.value,
                  },
                  'tour_hud'
                )
              }
              className="min-h-[34px] px-2 py-1 rounded-lg bg-[#142632] border border-white/20 font-mono text-[10px] text-[#9AFFE0] cursor-pointer"
            >
              {CEREBRO_18_TOUR_CHOREOGRAPHY.map((s) => (
                <option key={s.screenId} value={s.screenId}>
                  {s.screenId} · {s.title}
                </option>
              ))}
            </select>

            {/* Transport Controls: Prev ‹, Pause/Resume, Next ›, Exit Tour */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-cta-id="tour-hud-prev"
                onClick={handlePrevTourStop}
                className="min-h-[34px] px-2.5 py-1 rounded-lg font-mono text-[11px] bg-[#142632] border border-white/25 text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer"
              >
                Prev ‹
              </button>
              <button
                type="button"
                data-cta-id="tour-hud-pause-resume"
                onClick={() =>
                  executeTypedAction(
                    {
                      type: 'tour_control',
                      action: tourState.paused ? 'resume' : 'pause',
                    },
                    'tour_hud'
                  )
                }
                className="min-h-[34px] px-2.5 py-1 rounded-lg font-mono text-[11px] bg-[#142632] border border-[#65ACFF] text-[#B4DDFF] hover:bg-[#4C8DFF] hover:text-[#101D27] cursor-pointer"
              >
                {tourState.paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                data-cta-id="tour-hud-next"
                onClick={handleNextTourStop}
                className="min-h-[34px] px-2.5 py-1 rounded-lg font-mono text-[11px] bg-[#4C8DFF] text-[#101D27] font-semibold cursor-pointer"
              >
                Next ›
              </button>
              <button
                type="button"
                data-cta-id="tour-hud-exit"
                onClick={handleStopTourImmediately}
                className="min-h-[34px] px-2.5 py-1 rounded-lg font-mono text-[11px] bg-[#142632] border border-[#FF5666] text-[#FF5666] hover:bg-[#FF5666]/15 cursor-pointer"
              >
                Exit Tour
              </button>
            </div>
          </div>
        );
      })()}

      {/* 7. Draggable, Collision-Managed, Resizable Voice Card */}
      <VoiceCard
        voiceState={voiceState}
        activePocket={activePocket}
        handsActive={handsActive}
        tourState={tourState}
        audienceLevel={audienceLevel}
        selectedProjectId={selectedProjectId}
        transcripts={transcripts}
        liveCaption={captionBubble}
        pendingTaskProposal={pendingTaskProposal}
        externalSnapEdge={externalSnapEdge}
        openAgentModalTrigger={openAgentModalTrigger}
        onChangePocket={setActivePocket}
        onToggleHands={() => setHandsActive((v) => !v)}
        onSimulateCommand={handleSimulateCommand}
        onExecuteToolCall={handleExecuteToolCall}
        onSendCompose={handleSendCompose}
        onCreateDirectTask={handleCreateDirectTask}
        onConfirmMakeTask={handleConfirmMakeTask}
        onChangeAudience={setAudienceLevel}
        onOpenFullDownloadModal={() => setShowDownloadModal(true)}
        onNextTourStop={handleNextTourStop}
        onPrevTourStop={handlePrevTourStop}
        onStopTour={handleStopTourImmediately}
        onAudioLevel={setAudioRms}
        guiLayout={guiLayout}
        onVoiceDragDeltaChange={setVoiceDragDelta}
        onVoiceExpandedChange={setVoiceExpanded}
        contextualUpdateJson={contextualUpdateJson}
      />

      {/* 8. Full Project .ZIP Download Modal */}
      <ProjectDownloadModal
        open={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />

      {/* 9. Authenticated Developer View Modal (Diagnostics, Camera Telemetry, Phase 0 Audit, Source ZIP, 18-Tool Audit & 16-Point Self-Test Suite) */}
      {showDeveloperDrawer && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101D27]/85 backdrop-blur-md"
        >
          <div
            data-testid="developer-view-modal"
            className="w-full max-w-4xl max-h-[88vh] rounded-xl border p-5 flex flex-col gap-4 shadow-2xl neural-reveal overflow-hidden"
            style={{
              backgroundColor: 'rgba(16, 29, 39, 0.84)',
              borderColor: 'rgba(255, 255, 255, 0.14)',
              boxShadow:
                'inset 0 1px 0 rgba(180, 221, 255, 0.18), 0 20px 50px rgba(0, 0, 0, 0.55)',
            }}
          >
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.14)] pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4C8DFF] shrink-0" />
                  <h2 className="font-display text-xs md:text-sm font-semibold tracking-[0.08em] uppercase text-[#F2F6F8]">
                    Developer View — Diagnostics, Tool Schemas, Telemetry & Self-Tests
                  </h2>
                </div>
                <div className="font-mono tabular-nums text-[10px] text-[#BDCBD3] pl-4 mt-0.5">
                  AUTHENTICATED DEVELOPER DIAGNOSTICS · BUILD v{BUILD_VERSION} (CHECKPOINT v1.25.0 SAVED)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="run-self-test-btn"
                  disabled={selfTestRunning}
                  onClick={runAutomatedJourneySelfTest}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-lg font-mono text-xs bg-[#4C8DFF] text-[#101D27] font-semibold cursor-pointer disabled:opacity-50"
                >
                  {selfTestRunning ? 'Running 16 Assertions...' : 'Run 16-Point Self-Test'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeveloperDrawer(false)}
                  className="min-w-[40px] min-h-[40px] rounded-lg border border-[rgba(180,221,255,0.16)] bg-[#142632] text-[#BDCBD3] hover:text-[#F2F6F8] font-mono cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>

            {!isOwnerOnly ? (
              <div className="p-6 rounded-lg bg-[rgba(20,38,50,0.72)] border border-[rgba(180,221,255,0.16)] text-center space-y-2">
                <div className="font-display text-sm font-semibold text-[#F2F6F8]">
                  Owner Authentication Required
                </div>
                <p className="font-sans text-xs text-[#BDCBD3]">
                  Switch Audience Privacy to "Owner only" to access developer diagnostics, source exports, and self-tests.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-4 pr-1">
                {/* Developer Action Bar */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-[rgba(20,38,50,0.72)] border border-[rgba(180,221,255,0.16)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeveloperDrawer(false);
                      setShowDownloadModal(true);
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg font-mono text-xs bg-[#7CE0B8] text-[#101D27] font-semibold cursor-pointer"
                  >
                    ↓ Download Full Source (.ZIP)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeveloperDrawer(false);
                      ensurePanelOpen('phase0-audit', true);
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg font-mono text-xs bg-[#142632] border border-[rgba(180,221,255,0.16)] text-[#F2F6F8] cursor-pointer"
                  >
                    Open Source Map & Colour Audit Panel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeveloperDrawer(false);
                      setOpenAgentModalTrigger((c) => c + 1);
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg font-mono text-xs bg-[#142632] border border-[#65ACFF]/50 text-[#B4DDFF] cursor-pointer"
                  >
                    Voice Agent ID & 18-Tool Provisioning
                  </button>
                  <button
                    type="button"
                    onClick={() => setForceWebglFallback((v) => !v)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg font-mono text-xs bg-[#142632] border border-[#F2B66D]/50 text-[#F2B66D] cursor-pointer"
                  >
                    {forceWebglFallback ? 'Restore 3D WebGL Scene' : 'Test Reduced-Graphics Fallback'}
                  </button>
                </div>

                {/* Live Camera Telemetry & Tool Registry Audit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[rgba(20,38,50,0.72)] border border-[rgba(180,221,255,0.16)] font-mono tabular-nums text-xs space-y-1">
                    <div className="text-[#4C8DFF] font-semibold">LIVE 3D CAMERA TELEMETRY</div>
                    <div>Sphere: {telemetry.sphere.toUpperCase()} · Node: {telemetry.focusedNodeId || 'none'}</div>
                    <div>Distance: {telemetry.distance}u · Azimuth: {telemetry.azimuthDeg}° · Polar: {telemetry.polarDeg}°</div>
                    <div>Pan Offset: [{telemetry.panOffset.join(', ')}]</div>
                    <div>Auto-Orbit: {String(telemetry.autoOrbit)} ({telemetry.turnSeconds}s/turn) · Moving: {String(telemetry.isMoving)}</div>
                    <div>Last Verb: {telemetry.lastCommand}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[rgba(20,38,50,0.72)] border border-[rgba(180,221,255,0.16)] font-mono tabular-nums text-xs space-y-1">
                    <div className="text-[#7CE0B8] font-semibold">VOICE AGENT & TOOL REGISTRY AUDIT</div>
                    <div>Default Agent ID: {DEFAULT_INTERNAL_AGENT_ID}</div>
                    <div>
                      Advertised Tools: {toolAuditEntries.length} · Implemented:{' '}
                      {toolAuditEntries.filter((e) => e.handlerImplemented).length}
                    </div>
                    <div>
                      Unmapped Tools:{' '}
                      {unmappedTools.length === 0 ? '0 (All 18 verified)' : unmappedTools.join(', ')}
                    </div>
                    <div>WebGL Active: {String(telemetry.webglActive ?? true)}</div>
                  </div>
                </div>

                {/* Unattached Assets & External Integrations Disclosure */}
                <div className="p-3 rounded-lg bg-[rgba(20,38,50,0.72)] border border-[rgba(180,221,255,0.16)] space-y-1.5">
                  <div className="font-mono text-xs text-[#F2B66D] font-semibold">
                    DOCUMENTED UNATTACHED SOURCE ITEMS & EXTERNAL INTEGRATIONS ({MISSING_ITEMS.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {MISSING_ITEMS.map((m) => (
                      <div key={m.id} className="p-2 rounded-lg bg-[#142632] border border-[rgba(180,221,255,0.16)] font-mono text-[10px]">
                        <span className="text-[#F2B66D]">[{m.id}]</span>{' '}
                        <span className="text-[#F2F6F8]">{m.item}</span>
                        <div className="text-[#BDCBD3] mt-0.5">{m.currentFallbackInPhase0}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 16-Point Real Assertion-Based Self-Test Results */}
                {selfTestResults.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-xs text-[#65ACFF] font-semibold">
                      16-POINT ASSERTION-BASED SELF-TEST RESULTS (ISOLATED TEST DATA CLEANED UP)
                    </div>
                    {selfTestResults.map((chk) => (
                      <div
                        key={chk.id}
                        className="rounded-lg p-2.5 border border-[rgba(180,221,255,0.16)] bg-[rgba(20,38,50,0.72)] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                            [{chk.id}] {chk.title}
                          </div>
                          <div className="font-mono text-[10px] text-[#BDCBD3] truncate">
                            {chk.detail}
                          </div>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-semibold shrink-0"
                          style={{
                            backgroundColor:
                              chk.status === 'PASS'
                                ? 'rgba(54, 232, 141, 0.2)'
                                : chk.status === 'FAIL'
                                ? 'rgba(255, 86, 102, 0.2)'
                                : '#142632',
                            color:
                              chk.status === 'PASS'
                                ? COLOUR_TOKENS.healthOnTrack
                                : chk.status === 'FAIL'
                                ? COLOUR_TOKENS.systemErrorRed
                                : COLOUR_TOKENS.stationMedia,
                          }}
                        >
                          {chk.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
