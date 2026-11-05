import React, { useCallback, useMemo } from 'react';
import * as THREE from 'three';
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
} from '../components/CosmographCanvas';
import type { JourneyBeat } from './camera/journeyConfig';
import type { HandDetectionMode } from './handStateRef';
import {
  CustomDomain3D,
  DomainMaterialPreset,
} from '../utils/geminiScreenOrchestrator';
import { GuiRect } from '../gui/CollisionManager';
import { GuiCameraPresetId } from '../gui/cameraPresets';
import { ProjectedTargetScreenCoords } from '../gui/GuiFocusOverlay';

export {
  CINEMA_LENS_PRESETS,
  buildProjectMediaTubeItems,
  type CameraCommandPayload,
  type CameraTelemetry,
  type AnchoredLabel2D,
  type CinemaLensId,
  type CameraAnglePresetId,
  type CameraLoopMode,
  type MediaTubeStateProp,
  type ProjectMediaTubeItem,
};

export { NEUTRAL_STUDIO_ENV_CONFIG, applyNeutralStudioEnvironment } from './studioEnvironment';
import { applyNeutralStudioEnvironment } from './studioEnvironment';

export interface PortalOrbitalStation {
  id: string;
  label: string;
  sublabel: string;
  cluster: 'hq' | 'crew' | 'blueprint' | 'design-gate' | 'gods-eye';
  xPct: number;
  yPct: number;
  accentHex: string;
  linkedTaskId: string;
}

export const PORTAL_ORBITAL_STATIONS: PortalOrbitalStation[] = [
  {
    id: 'hq-command',
    label: 'HQ Command',
    sublabel: 'Grandy · Orchestrator',
    cluster: 'hq',
    xPct: 50,
    yPct: 46,
    accentHex: '#D4AF37',
    linkedTaskId: 'UI-101',
  },
  {
    id: 'crew-roster',
    label: 'Crew Roster (v1.5)',
    sublabel: 'Kinzo · 12 Crew & AI',
    cluster: 'crew',
    xPct: 28,
    yPct: 34,
    accentHex: '#C5CCD6',
    linkedTaskId: 'TASK-BGH-005',
  },
  {
    id: 'blueprint-v02',
    label: 'Blueprint v0.2',
    sublabel: 'Banna · 11 Register Nodes',
    cluster: 'blueprint',
    xPct: 32,
    yPct: 66,
    accentHex: '#FFF4D0',
    linkedTaskId: 'UI-102',
  },
  {
    id: 'design-gate',
    label: 'Design Gate (RASMA/MUSA)',
    sublabel: 'Rasma & Musa · Provenance',
    cluster: 'design-gate',
    xPct: 69,
    yPct: 35,
    accentHex: '#D4AF37',
    linkedTaskId: 'TASK-BGH-006',
  },
  {
    id: 'gods-eye-pulse',
    label: "God's Eye Pulse",
    sublabel: 'Baghira · 22-Tool Bridge',
    cluster: 'gods-eye',
    xPct: 68,
    yPct: 65,
    accentHex: '#C5CCD6',
    linkedTaskId: 'UI-105',
  },
];

import type { SpatialPanelSpec } from './spatialPanels';
import { Sphere1Canvas } from './beats/Sphere1Canvas';
import { pitchContentProvider } from './beats/pitchContent';
import { beatToJourneyBeat } from './beats/journeyBridge';
import { resolveEnvironmentMode, type EnvironmentMode } from './beats/environmentMode';
import type { BeatContentProvider, BeatSlotFactories } from './beats/beatTypes';

interface ExperienceCanvasProps {
  activeSphere: 'hq' | 'cde' | 'campaign-os' | 'about-us';
  focusedNodeId: string | null;
  tourHighlightId: string | null;
  captionBubble: string | null;
  reducedMotion: boolean;
  audioRms?: number;
  forceWebglFallback?: boolean;
  cameraCommand: CameraCommandPayload | null;
  customDomains?: CustomDomain3D[];
  sphereMaterials?: { hq: DomainMaterialPreset; cde: DomainMaterialPreset };
  selectedBlueprintTaskId?: string | null;
  onSelectNode: (
    id: string,
    nodeType: AnchoredLabel2D['nodeType'],
    sphere: 'hq' | 'cde' | 'campaign-os' | 'about-us'
  ) => void;
  onSelectPortalStation?: (station: PortalOrbitalStation) => void;
  onUserTouchPauseTour: () => void;
  onTelemetryChange: (telemetry: CameraTelemetry) => void;
  onCameraSettled?: (commandId: number, telemetry: CameraTelemetry) => void;
  unobstructedRect?: GuiRect;
  guiCameraPreset?: GuiCameraPresetId;
  onProjectedTargetChange?: (target: ProjectedTargetScreenCoords | null) => void;
  onHoverNodeChange?: (nodeId: string | null) => void;
  mediaTubeState?: MediaTubeStateProp | null;
  onSelectMediaTubeTile?: (tileIndex: number, item: ProjectMediaTubeItem) => void;
  onOpenMediaTubeFullView?: (tileOrIndex: number | ProjectMediaTubeItem, tile?: ProjectMediaTubeItem) => void;
  onCloseMediaTube?: () => void;
  gestureTrackingActive?: boolean;
  /** False while hand tracking owns orbit — see CosmographCanvas.pointerOrbitEnabled. */
  pointerOrbitEnabled?: boolean;
  projectWorldId?: string | null;
  projectWorldState?: 'entry' | 'active' | 'suspended' | 'exiting' | 'unavailable' | null;
  idleOrbitAllowed?: boolean;
  handsActive?: boolean;
  handMode?: HandDetectionMode;
  onJourneyBeat?: (beat: JourneyBeat | null) => void;
  spatialPanels?: SpatialPanelSpec[];
  /** The 25 Beats explainer is playing: scene and pitch content only. */
  cinematic?: boolean;
  /** Defaults to the connected network; `?env=sphere1` selects the isolated Sphere 1 clean slate. */
  environment?: EnvironmentMode;
  /** Sphere 1 only: per-beat copy, media, metrics and camera overrides. */
  beatContent?: BeatContentProvider;
  /** Sphere 1 only: replace how the text, media and metric slots are drawn. */
  beatSlotFactories?: Partial<BeatSlotFactories>;
}

export const ExperienceCanvas: React.FC<ExperienceCanvasProps> = ({
  activeSphere,
  focusedNodeId,
  tourHighlightId,
  captionBubble,
  reducedMotion,
  audioRms = 0,
  forceWebglFallback = false,
  cameraCommand,
  customDomains = [],
  sphereMaterials = { hq: 'cobalt-glass', cde: 'cobalt-glass' },
  selectedBlueprintTaskId,
  onSelectNode,
  onSelectPortalStation,
  onUserTouchPauseTour,
  onTelemetryChange,
  onCameraSettled,
  unobstructedRect,
  guiCameraPreset,
  onProjectedTargetChange,
  onHoverNodeChange,
  mediaTubeState = null,
  onSelectMediaTubeTile,
  onOpenMediaTubeFullView,
  onCloseMediaTube,
  gestureTrackingActive = true,
  pointerOrbitEnabled = true,
  projectWorldId = null,
  projectWorldState = null,
  idleOrbitAllowed = true,
  handsActive = false,
  handMode,
  onJourneyBeat,
  spatialPanels,
  cinematic = false,
  environment,
  beatContent,
  beatSlotFactories,
}) => {
  // The OS setting is resolved once in App (see utils/motionPreference); do not re-join it here or
  // a device-level Reduce Motion silently freezes every camera flight.
  const effectiveReducedMotion = reducedMotion;
  const handleSceneReady = useCallback((scene: THREE.Scene) => {
    applyNeutralStudioEnvironment(scene);
  }, []);

  const environmentMode = useMemo<EnvironmentMode>(
    () => environment ?? resolveEnvironmentMode(typeof window === 'undefined' ? '' : window.location.search),
    [environment]
  );

  return (
    <>
      {environmentMode === 'sphere1-beats' ? (
        <>
          <Sphere1Canvas
            reducedMotion={effectiveReducedMotion}
            audioRms={audioRms}
            idleOrbitAllowed={idleOrbitAllowed}
            forceWebglFallback={forceWebglFallback}
            cameraCommand={cameraCommand}
            content={beatContent ?? pitchContentProvider}
            factories={beatSlotFactories}
            onBeat={(index, content) => onJourneyBeat?.(index === null ? null : beatToJourneyBeat(index, content))}
            onTelemetryChange={onTelemetryChange}
            onUserTouchPauseTour={onUserTouchPauseTour}
          />
          {spatialPanels && spatialPanels.length > 0 ? (
            <div className="cerebro-spatial-fallback" data-testid="spatial-panels-fallback">
              {spatialPanels.map((panel) => (
                <div key={panel.id} className="cerebro-spatial-panel" data-lod="full"
                  inert={Boolean(panel.suspended)} aria-hidden={panel.suspended || undefined}
                  style={panel.suspended ? { display: 'none' } : undefined}>
                  {panel.content}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
      <CosmographCanvas
        onSceneReady={handleSceneReady}
        activeSphere={activeSphere}
        focusedNodeId={focusedNodeId}
        tourHighlightId={tourHighlightId}
        captionBubble={captionBubble}
        reducedMotion={effectiveReducedMotion}
        audioRms={audioRms}
        forceWebglFallback={forceWebglFallback}
        cameraCommand={cameraCommand}
        customDomains={customDomains}
        sphereMaterials={sphereMaterials}
        onSelectNode={onSelectNode}
        onUserTouchPauseTour={onUserTouchPauseTour}
        onTelemetryChange={onTelemetryChange}
        onCameraSettled={onCameraSettled}
        unobstructedRect={unobstructedRect}
        guiCameraPreset={guiCameraPreset}
        onProjectedTargetChange={onProjectedTargetChange}
        onHoverNodeChange={onHoverNodeChange}
        mediaTubeState={mediaTubeState}
        onSelectMediaTubeTile={onSelectMediaTubeTile}
        onOpenMediaTubeFullView={onOpenMediaTubeFullView}
        onCloseMediaTube={onCloseMediaTube}
        gestureTrackingActive={gestureTrackingActive}
        pointerOrbitEnabled={pointerOrbitEnabled}
        projectWorldId={projectWorldId}
        projectWorldState={projectWorldState}
        idleOrbitAllowed={idleOrbitAllowed}
        handsActive={handsActive}
        handMode={handMode}
        onJourneyBeat={onJourneyBeat}
        spatialPanels={spatialPanels}
        cinematic={cinematic}
      />
      )}


    </>
  );
};
