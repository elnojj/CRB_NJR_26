import React from 'react';
import { useReducedMotion } from 'motion/react';
import {
  DualSphereCanvas,
  CameraCommandPayload,
  CameraTelemetry,
  AnchoredLabel2D,
} from '../components/DualSphereCanvas';
import { MediaTubeStateProp, ProjectMediaTubeItem } from '../components/CosmographCanvas';
import {
  CustomDomain3D,
  DomainMaterialPreset,
} from '../utils/geminiScreenOrchestrator';
import { GuiRect } from '../gui/CollisionManager';
import { GuiCameraPresetId } from '../gui/cameraPresets';
import { ProjectedTargetScreenCoords } from '../gui/GuiFocusOverlay';

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
    accentHex: '#4C8DFF',
    linkedTaskId: 'UI-101',
  },
  {
    id: 'crew-roster',
    label: 'Crew Roster (v1.5)',
    sublabel: 'Kinzo · 12 Crew & AI',
    cluster: 'crew',
    xPct: 28,
    yPct: 34,
    accentHex: '#7CE0B8',
    linkedTaskId: 'TASK-BGH-005',
  },
  {
    id: 'blueprint-v02',
    label: 'Blueprint v0.2',
    sublabel: 'Banna · 11 Register Nodes',
    cluster: 'blueprint',
    xPct: 32,
    yPct: 66,
    accentHex: '#9DB8D6',
    linkedTaskId: 'UI-102',
  },
  {
    id: 'design-gate',
    label: 'Design Gate (RASMA/MUSA)',
    sublabel: 'Rasma & Musa · Provenance',
    cluster: 'design-gate',
    xPct: 69,
    yPct: 35,
    accentHex: '#F2B66D',
    linkedTaskId: 'TASK-BGH-006',
  },
  {
    id: 'gods-eye-pulse',
    label: "God's Eye Pulse",
    sublabel: 'Baghira · 22-Tool Bridge',
    cluster: 'gods-eye',
    xPct: 68,
    yPct: 65,
    accentHex: '#5CC8D7',
    linkedTaskId: 'UI-105',
  },
];

/**
 * Generates an inline SVG data URI for /cerebro/sphere_fallback_rest.png
 * so reduced-motion or WebGL fallback renders an authentic neural core sphere at rest with zero 404s.
 */
export const SPHERE_FALLBACK_REST_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" fill="none">
    <defs>
      <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#4C8DFF" stop-opacity="0.32"/>
        <stop offset="45%" stop-color="#142632" stop-opacity="0.48"/>
        <stop offset="100%" stop-color="#101D27" stop-opacity="0.96"/>
      </radialGradient>
    </defs>
    <rect width="800" height="800" fill="#101D27"/>
    <circle cx="400" cy="400" r="290" fill="url(#coreGlow)" stroke="#B4DDFF" stroke-opacity="0.35" stroke-width="1.5"/>
    <circle cx="400" cy="400" r="230" stroke="#4C8DFF" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="6 6"/>
    <ellipse cx="400" cy="400" rx="285" ry="110" stroke="#B4DDFF" stroke-opacity="0.28" stroke-width="1.2" transform="rotate(-18 400 400)"/>
    <ellipse cx="400" cy="400" rx="285" ry="110" stroke="#7CE0B8" stroke-opacity="0.22" stroke-width="1.2" transform="rotate(24 400 400)"/>
    <circle cx="400" cy="400" r="26" fill="#4C8DFF" fill-opacity="0.25" stroke="#F2F6F8" stroke-width="2"/>
  </svg>`
)}`;

interface ExperienceCanvasProps {
  activeSphere: 'hq' | 'cde';
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
  onSelectNode: (id: string, nodeType: AnchoredLabel2D['nodeType'], sphere: 'hq' | 'cde') => void;
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
  sphereMaterials = { hq: 'cobalt-glass', cde: 'amber-crystal' },
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
}) => {
  const osReducedMotion = useReducedMotion();
  const effectiveReducedMotion = Boolean(reducedMotion || osReducedMotion);

  return (
    <>
      <DualSphereCanvas
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
      />

      {/* Reduced-Motion / Fallback Rest Sphere + Interactive 2D SVG Orbital Station Pins */}
      {(effectiveReducedMotion || forceWebglFallback) && (
        <div
          data-testid="sphere-fallback-rest-layer"
          className="fixed inset-0 z-[7] pointer-events-none flex items-center justify-center"
        >
          <img
            src="/cerebro/sphere_fallback_rest.png"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== SPHERE_FALLBACK_REST_DATA_URI) {
                target.src = SPHERE_FALLBACK_REST_DATA_URI;
              }
            }}
            alt="Cerebro Neural Core Sphere (Static Rest Fallback)"
            className="w-[520px] h-[520px] max-w-[78vw] max-h-[78vh] object-contain opacity-45"
          />
          <svg
            className="fixed inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {PORTAL_ORBITAL_STATIONS.map((st) => (
              <line
                key={`line-${st.id}`}
                x1={50}
                y1={46}
                x2={st.xPct}
                y2={st.yPct}
                stroke={st.accentHex}
                strokeOpacity="0.35"
                strokeWidth="0.2"
                strokeDasharray="0.8 0.6"
              />
            ))}
          </svg>
          {PORTAL_ORBITAL_STATIONS.map((st) => {
            const isSelected = selectedBlueprintTaskId === st.linkedTaskId;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectPortalStation?.(st)}
                style={{
                  left: `${st.xPct}%`,
                  top: `${st.yPct}%`,
                  borderColor: isSelected ? st.accentHex : 'rgba(255, 255, 255, 0.40)',
                }}
                className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2.5 py-1.5 rounded-lg bg-[#142632]/90 border backdrop-blur-md text-left hover:border-[#4C8DFF] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: st.accentHex }}
                  />
                  <span className="font-mono text-[11px] font-semibold text-[#F2F6F8]">
                    {st.label}
                  </span>
                </div>
                <div className="font-mono text-[9px] text-[#BDCBD3]">{st.sublabel}</div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
