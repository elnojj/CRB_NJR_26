import React, { useEffect, useState } from 'react';
import {
  GUI_POINTER_FOCUS_TOKENS,
  GUI_Z_LAYERS,
  GuiBreakpoint,
} from './guiTokens';
import {
  GUI_CANONICAL_SCREENS,
  GuiCanonicalScreenId,
  GuiVisualState,
} from './visualStateMachine';
import { GUI_CAMERA_PRESETS, GuiCameraPresetId } from './cameraPresets';
import { GuiRect } from './CollisionManager';
import { runGuiLayoutSelfTests, GuiSelfTestSummary } from './gui-layout.test';

export interface ProjectedTargetScreenCoords {
  id: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

interface GuiFocusOverlayProps {
  visualState: GuiVisualState;
  activeScreen: GuiCanonicalScreenId;
  cameraPreset: GuiCameraPresetId;
  breakpoint: GuiBreakpoint;
  viewportW: number;
  viewportH: number;
  centerSafeRect: GuiRect;
  projectedTarget: ProjectedTargetScreenCoords | null;
  projectedOrigin?: ProjectedTargetScreenCoords | null;
  isCameraInFlight: boolean;
  flightDestinationTitle?: string | null;
  showQaHud: boolean;
  onCloseQaHud: () => void;
  onSelectScreen: (screen: GuiCanonicalScreenId | null) => void;
  onSelectCameraPreset: (preset: GuiCameraPresetId) => void;
  onSelectViewportPreset: (preset: string | null) => void;
  activeViewportPreset: string | null;
  onResumePreviousBookmark?: () => void;
  hasBookmark: boolean;
}

export const GuiFocusOverlay: React.FC<GuiFocusOverlayProps> = ({
  visualState,
  activeScreen,
  cameraPreset,
  breakpoint,
  viewportW,
  viewportH,
  centerSafeRect,
  projectedTarget,
  projectedOrigin,
  isCameraInFlight,
  flightDestinationTitle,
  showQaHud,
  onCloseQaHud,
  onSelectScreen,
  onSelectCameraPreset,
  onSelectViewportPreset,
  activeViewportPreset,
  onResumePreviousBookmark,
  hasBookmark,
}) => {
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [trailStart, setTrailStart] = useState<{ x: number; y: number } | null>(null);
  const [testSummary, setTestSummary] = useState<GuiSelfTestSummary | null>(null);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const next = { x: e.clientX, y: e.clientY };
      setPointerPos((prev) => {
        if (!prev) {
          setTrailStart(next);
          return next;
        }
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(GUI_POINTER_FOCUS_TOKENS.focusTrailMaxPx, dist * 2.2);
        const angle = Math.atan2(dy, dx);
        setTrailStart({
          x: next.x - Math.cos(angle) * clampedDist,
          y: next.y - Math.sin(angle) * clampedDist,
        });
        return next;
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useEffect(() => {
    if (showQaHud) {
      setTestSummary(runGuiLayoutSelfTests());
    }
  }, [showQaHud, viewportW, viewportH]);

  const screenSpec = GUI_CANONICAL_SCREENS[activeScreen];

  return (
    <>
      {/* Z-35 Focus Pointer, Projected Target Ring & S04 Flight Route Line */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: GUI_Z_LAYERS.focusPointer }}
        aria-hidden="true"
      >
        <svg className="w-full h-full">
          {/* Pointer Focus Trail (max 120px) */}
          {pointerPos && trailStart && (
            <line
              x1={trailStart.x}
              y1={trailStart.y}
              x2={pointerPos.x}
              y2={pointerPos.y}
              stroke="rgba(197, 204, 214, 0.22)"
              strokeWidth={1.25}
              strokeLinecap="round"
            />
          )}

          {/* S04 Travel / Flight Spline Route Indicator */}
          {isCameraInFlight && projectedTarget && projectedTarget.visible && (
            <g>
              <line
                x1={projectedOrigin?.x ?? centerSafeRect.x + centerSafeRect.w / 2}
                y1={projectedOrigin?.y ?? centerSafeRect.y + centerSafeRect.h / 2}
                x2={projectedTarget.x}
                y2={projectedTarget.y}
                stroke="#D4AF37"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <circle
                cx={projectedTarget.x}
                cy={projectedTarget.y}
                r={6}
                fill="#FFF4D0"
              />
            </g>
          )}

          {/* Projected 3D Target 44px Focus Ring (1.5px stroke) */}
          {projectedTarget && projectedTarget.visible && (
            <g transform={`translate(${projectedTarget.x}, ${projectedTarget.y})`}>
              <circle
                r={GUI_POINTER_FOCUS_TOKENS.focusRingPx / 2}
                fill="none"
                stroke="#D4AF37"
                strokeWidth={GUI_POINTER_FOCUS_TOKENS.focusStrokePx}
              />
              <circle
                r={GUI_POINTER_FOCUS_TOKENS.pointerHaloPx / 2}
                fill="rgba(212, 175, 55, 0.14)"
                stroke="rgba(212, 175, 55, 0.35)"
                strokeWidth={1}
              />
            </g>
          )}

          {/* 32px Pointer Halo on Hover / Focus */}
          {pointerPos && (visualState === 'hover' || visualState === 'focus') && (
            <circle
              cx={pointerPos.x}
              cy={pointerPos.y}
              r={GUI_POINTER_FOCUS_TOKENS.pointerHaloPx / 2}
              fill="rgba(212, 175, 55, 0.08)"
              stroke="rgba(212, 175, 55, 0.35)"
              strokeWidth={1}
            />
          )}

          {/* Optional Debug Safe Frame Outline when QA HUD is open */}
          {showQaHud && (
            <rect
              x={centerSafeRect.x}
              y={centerSafeRect.y}
              width={centerSafeRect.w}
              height={centerSafeRect.h}
              fill="rgba(212, 175, 55, 0.03)"
              stroke="rgba(212, 175, 55, 0.45)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              rx={14}
            />
          )}
        </svg>

        {/* Short Label Chip on Projected 3D Target (S02 / S03 / S04) */}
        {projectedTarget && projectedTarget.visible && (
          <div
            className="cj-glass-card absolute -translate-x-1/2 pointer-events-none px-2.5 py-1 rounded-md text-[12px] font-mono tracking-wider uppercase text-[#F2F6F8] cerebro-stellar-glass"
            style={{
              left: `${Math.max(64, Math.min(viewportW - 64, projectedTarget.x))}px`,
              top: `${Math.max(64, projectedTarget.y - 38)}px`,
            }}
          >
            {isCameraInFlight && flightDestinationTitle
              ? `→ ${flightDestinationTitle}`
              : projectedTarget.label}
          </div>
        )}
      </div>

      {/* S09 Return / Resume Camera Bookmark Chip (Ambient HUD layer z-10) */}
      {hasBookmark && onResumePreviousBookmark && (
        <div
          className="fixed left-4 bottom-24 pointer-events-auto"
          style={{ zIndex: GUI_Z_LAYERS.ambientHUD + 5 }}
        >
          <button
            type="button"
            onClick={onResumePreviousBookmark}
            className="cj-glass-card min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-[18px] cerebro-stellar-glass text-[12px] font-mono uppercase tracking-wider text-[#C5CCD6] hover:text-[#F2F6F8] hover:border-[#D4AF37] transition-colors flex items-center gap-2"
            title="S09 Return / Resume previous camera bookmark & panel state"
          >
            <span>↩</span>
            <span>Resume Bookmark (S09)</span>
          </button>
        </div>
      )}

      {/* QA & GUI Amendment v3.0 Inspector Drawer */}
      {showQaHud && (
        <div
          className="cj-glass-card fixed right-4 top-20 w-[360px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-120px)] overflow-y-auto cerebro-stellar-glass p-4 text-[#F2F6F8] pointer-events-auto"
          style={{ zIndex: GUI_Z_LAYERS.modalContent }}
          role="dialog"
          aria-label="CEREBRO Stellar GUI v3.0 QA Inspector"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgba(197,204,214,0.22)]">
            <div>
              <div className="text-[12px] font-mono uppercase tracking-widest text-[#D4AF37]">
                cerebro.nojara.d0/v1.24
              </div>
              <div className="text-[17px] font-semibold">
                GUI Layout & Optical QA
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseQaHud}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#C5CCD6] hover:text-[#F2F6F8] border border-[rgba(197,204,214,0.22)]"
              aria-label="Close GUI QA Inspector"
            >
              ✕
            </button>
          </div>

          {/* Live State Telemetry */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-[12px] font-mono">
            <div className="p-2 rounded-lg bg-[#101622]/85 border border-[rgba(197,204,214,0.22)]">
              <div className="text-[#C5CCD6]">SCREEN</div>
              <div className="text-[#F2F6F8] font-semibold">
                {activeScreen} · {screenSpec.title}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#101622]/85 border border-[rgba(197,204,214,0.22)]">
              <div className="text-[#C5CCD6]">VISUAL STATE</div>
              <div className="text-[#D4AF37] font-semibold uppercase">{visualState}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#101622]/85 border border-[rgba(197,204,214,0.22)]">
              <div className="text-[#C5CCD6]">VIEWPORT ({breakpoint.toUpperCase()})</div>
              <div className="text-[#F2F6F8]">
                {viewportW}×{viewportH}px
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#101622]/85 border border-[rgba(197,204,214,0.22)]">
              <div className="text-[#C5CCD6]">OPTICAL LENS</div>
              <div className="text-[#F2F6F8]">
                {GUI_CAMERA_PRESETS[cameraPreset].focalMm}mm ({GUI_CAMERA_PRESETS[cameraPreset].verticalFovDeg}°)
              </div>
            </div>
          </div>

          {/* Canonical Screens S01..S09 Switcher */}
          <div className="mb-3">
            <div className="text-[12px] font-mono uppercase tracking-wider text-[#C5CCD6] mb-1.5">
              Canonical Screens (S01–S09)
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(GUI_CANONICAL_SCREENS) as GuiCanonicalScreenId[]).map((sid) => (
                <button
                  key={sid}
                  type="button"
                  onClick={() => onSelectScreen(sid)}
                  className={`min-h-[44px] px-2 py-1 rounded-lg text-[12px] font-mono border text-left transition-colors ${
                    activeScreen === sid
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFF4D0]'
                      : 'bg-[#101622]/75 border-[rgba(197,204,214,0.22)] text-[#C5CCD6] hover:text-[#F2F6F8]'
                  }`}
                >
                  <div className="font-bold">{sid}</div>
                  <div className="truncate text-[10px]">
                    {GUI_CANONICAL_SCREENS[sid].title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4 Canonical Camera Presets */}
          <div className="mb-3">
            <div className="text-[12px] font-mono uppercase tracking-wider text-[#C5CCD6] mb-1.5">
              36×24mm Sensor Presets
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(GUI_CAMERA_PRESETS) as GuiCameraPresetId[]).map((pid) => {
                const spec = GUI_CAMERA_PRESETS[pid];
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => onSelectCameraPreset(pid)}
                    className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-[12px] font-mono border text-left ${
                      cameraPreset === pid
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFF4D0]'
                        : 'bg-[#101622]/75 border-[rgba(197,204,214,0.22)] text-[#C5CCD6]'
                    }`}
                  >
                    <div className="font-semibold uppercase">
                      {pid} · {spec.focalMm}mm
                    </div>
                    <div className="text-[11px] text-[#C5CCD6]">
                      vFOV {spec.verticalFovDeg}° · {spec.travelMs}ms
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Test Matrix Viewports */}
          <div className="mb-3">
            <div className="text-[12px] font-mono uppercase tracking-wider text-[#C5CCD6] mb-1.5">
              Test Matrix Viewports (v4.0)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: null, label: 'Live Window' },
                { id: 'phone_390x844', label: 'Phone 390×844' },
                { id: 'ipad_820x1180', label: 'iPad 820×1180' },
                { id: 'ipad_landscape_1180x820', label: 'iPad Land 1180×820' },
                { id: 'desktop_1440x900', label: 'Desktop 1440×900' },
                { id: 'wide_1920x1080', label: 'Wide 1920×1080' },
              ].map((vp) => (
                <button
                  key={vp.id ?? 'live'}
                  type="button"
                  onClick={() => onSelectViewportPreset(vp.id)}
                  className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-[12px] font-mono border ${
                    activeViewportPreset === vp.id
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFF4D0]'
                      : 'bg-[#101622]/75 border-[rgba(197,204,214,0.22)] text-[#C5CCD6]'
                  }`}
                >
                  {vp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Automated Test Assertions Summary */}
          {testSummary && (
            <div className="pt-2 border-t border-[rgba(197,204,214,0.22)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-mono uppercase text-[#C5CCD6]">
                  gui-layout.test.ts
                </span>
                <span
                  className={`text-[12px] font-mono font-bold ${
                    testSummary.failed === 0 ? 'text-[#78D3B2]' : 'text-[#FF5666]'
                  }`}
                >
                  {testSummary.passed}/{testSummary.total} PASSED
                </span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {testSummary.results.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between text-[12px] font-mono py-0.5"
                  >
                    <span className="truncate text-[#C5CCD6] pr-2">{r.name}</span>
                    <span className={r.passed ? 'text-[#78D3B2]' : 'text-[#FF5666]'}>
                      {r.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
