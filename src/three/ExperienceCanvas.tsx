import React from 'react';
import { useReducedMotion } from 'motion/react';
import {
  CosmographCanvas,
  CameraCommandPayload,
  CameraTelemetry,
  AnchoredLabel2D,
} from '../components/CosmographCanvas';

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
    accentHex: '#38BDF8',
    linkedTaskId: 'UI-101',
  },
  {
    id: 'crew-roster',
    label: 'Crew Roster (v1.5)',
    sublabel: 'Kinzo · 20 Seats',
    cluster: 'crew',
    xPct: 28,
    yPct: 34,
    accentHex: '#818CF8',
    linkedTaskId: 'TASK-BGH-005',
  },
  {
    id: 'blueprint-v02',
    label: 'Blueprint v0.2',
    sublabel: 'Banna · 11 Register Nodes',
    cluster: 'blueprint',
    xPct: 32,
    yPct: 66,
    accentHex: '#10B981',
    linkedTaskId: 'UI-102',
  },
  {
    id: 'design-gate',
    label: 'Design Gate (RASMA/MUSA)',
    sublabel: 'Rasma & Musa · Provenance',
    cluster: 'design-gate',
    xPct: 69,
    yPct: 35,
    accentHex: '#F59E0B',
    linkedTaskId: 'TASK-BGH-006',
  },
  {
    id: 'gods-eye-pulse',
    label: "God's Eye Pulse",
    sublabel: 'Baghira · 33-Tool Bridge',
    cluster: 'gods-eye',
    xPct: 68,
    yPct: 65,
    accentHex: '#A855F7',
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
        <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.32"/>
        <stop offset="45%" stop-color="#1E293B" stop-opacity="0.48"/>
        <stop offset="100%" stop-color="#05070B" stop-opacity="0.96"/>
      </radialGradient>
    </defs>
    <rect width="800" height="800" fill="#05070B"/>
    <circle cx="400" cy="400" r="290" fill="url(#coreGlow)" stroke="#38BDF8" stroke-opacity="0.35" stroke-width="1.5"/>
    <circle cx="400" cy="400" r="230" stroke="#818CF8" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="6 6"/>
    <ellipse cx="400" cy="400" rx="285" ry="110" stroke="#38BDF8" stroke-opacity="0.28" stroke-width="1.2" transform="rotate(-18 400 400)"/>
    <ellipse cx="400" cy="400" rx="285" ry="110" stroke="#10B981" stroke-opacity="0.22" stroke-width="1.2" transform="rotate(24 400 400)"/>
    <circle cx="400" cy="400" r="26" fill="#38BDF8" fill-opacity="0.25" stroke="#F8FAFC" stroke-width="2"/>
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
  selectedBlueprintTaskId?: string | null;
  onSelectNode: (id: string, nodeType: AnchoredLabel2D['nodeType'], sphere: 'hq' | 'cde') => void;
  onSelectPortalStation?: (station: PortalOrbitalStation) => void;
  onUserTouchPauseTour: () => void;
  onTelemetryChange: (telemetry: CameraTelemetry) => void;
  onCameraSettled?: (commandId: number, telemetry: CameraTelemetry) => void;
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
  selectedBlueprintTaskId,
  onSelectNode,
  onSelectPortalStation,
  onUserTouchPauseTour,
  onTelemetryChange,
  onCameraSettled,
}) => {
  const osReducedMotion = useReducedMotion();
  const effectiveReducedMotion = Boolean(reducedMotion || osReducedMotion);

  return (
    <>
      <CosmographCanvas
        activeSphere={activeSphere}
        focusedNodeId={focusedNodeId}
        tourHighlightId={tourHighlightId}
        captionBubble={captionBubble}
        reducedMotion={effectiveReducedMotion}
        audioRms={audioRms}
        forceWebglFallback={forceWebglFallback}
        cameraCommand={cameraCommand}
        onSelectNode={onSelectNode}
        onUserTouchPauseTour={onUserTouchPauseTour}
        onTelemetryChange={onTelemetryChange}
        onCameraSettled={onCameraSettled}
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
                  borderColor: isSelected ? st.accentHex : 'rgba(148, 163, 184, 0.28)',
                }}
                className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2.5 py-1.5 rounded-lg bg-[#0C111A]/90 border backdrop-blur-md text-left hover:border-[#38BDF8] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: st.accentHex }}
                  />
                  <span className="font-mono text-[11px] font-semibold text-[#F8FAFC]">
                    {st.label}
                  </span>
                </div>
                <div className="font-mono text-[9px] text-[#94A3B8]">{st.sublabel}</div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
