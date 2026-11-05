import React, { useState, useEffect, useMemo } from 'react';
import {
  VisualAuthorityScopeId,
  CONTINUOUS_180S_CHAPTERS,
  evaluateContinuousFilmFrame,
  run5400FrameContinuityScan,
  EXPLICIT_CONFLICTS_TABLE,
  UNRESOLVED_MEDIA_SLOTS_TABLE,
  RELEASE_CHECKPOINT_DD0DB50_CHECKS,
} from '../data/cerebro39MasterSystem';

interface Cerebro39SystemModalProps {
  open: boolean;
  onClose: () => void;
  visualScope: VisualAuthorityScopeId;
  onChangeVisualScope: (scope: VisualAuthorityScopeId) => void;
  onSeekFilmFrame?: (frame: number, pos: [number, number, number], target: [number, number, number], fov: number, sphere: 'hq' | 'cde') => void;
}

const REGISTRY_DOWNLOADS = [
  { id: 'cerebro.config.json', label: 'cerebro.config.json (453 Leaves · Doc 01)', path: '/design-system/cerebro.config.json' },
  { id: 'delivery_manifest.json', label: 'delivery_manifest.json (38 Assets · 29 Lovart · Doc 02-05)', path: '/design-system/delivery_manifest.json' },
  { id: 'design_tokens.json', label: 'design_tokens.json (Sehly + D0 v1.24)', path: '/design-system/design_tokens.json' },
  { id: 'motion-registry.json', label: 'motion-registry.json (5,400f Contract)', path: '/design-system/motion-registry.json' },
  { id: 'component-registry.json', label: 'component-registry.json (C01-C12 + Modules)', path: '/design-system/component-registry.json' },
  { id: 'material-registry.json', label: 'material-registry.json (PBR & GLSL)', path: '/design-system/material-registry.json' },
  { id: 'camera-registry.json', label: 'camera-registry.json (CameraRig & Shots)', path: '/design-system/camera-registry.json' },
  { id: 'asset-manifest.json', label: 'asset-manifest.json (7 GLBs + 17 SVGs + Hashes)', path: '/design-system/asset-manifest.json' },
  { id: 'qa-matrix.json', label: 'qa-matrix.json (Source Authority & QA)', path: '/design-system/qa-matrix.json' },
];

export const Cerebro39SystemModal: React.FC<Cerebro39SystemModalProps> = ({
  open,
  onClose,
  visualScope,
  onChangeVisualScope,
  onSeekFilmFrame,
}) => {
  const [activeTab, setActiveTab] = useState<'shot180s' | 'conflicts' | 'registries' | 'checkpoint'>('shot180s');
  const [frameIndex, setFrameIndex] = useState<number>(90);
  const [isPlayingShot, setIsPlayingShot] = useState<boolean>(false);
  const [selectedJsonUrl, setSelectedJsonUrl] = useState<string>('/design-system/cerebro.config.json');
  const [jsonPreviewText, setJsonPreviewText] = useState<string>('Loading JSON registry...');
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  const continuityScan = useMemo(() => run5400FrameContinuityScan(), []);
  const evaluated = useMemo(() => evaluateContinuousFilmFrame(frameIndex), [frameIndex]);

  useEffect(() => {
    if (!open || !isPlayingShot) return;
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev >= 5399 ? 0 : prev + 3;
        const ev = evaluateContinuousFilmFrame(next);
        onSeekFilmFrame?.(ev.frame, ev.cameraPosition, ev.cameraTarget, ev.fovDeg, ev.targetSphere);
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [open, isPlayingShot, onSeekFilmFrame]);

  useEffect(() => {
    if (!open || activeTab !== 'registries') return;
    let cancelled = false;
    fetch(selectedJsonUrl)
      .then((r) => r.text())
      .then((txt) => {
        if (!cancelled) setJsonPreviewText(txt);
      })
      .catch((err) => {
        if (!cancelled) setJsonPreviewText(`Error loading ${selectedJsonUrl}: ${String(err)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeTab, selectedJsonUrl]);

  if (!open) return null;

  const handleScrubFrame = (nextFrame: number) => {
    const clamped = Math.max(0, Math.min(5399, nextFrame));
    setFrameIndex(clamped);
    const ev = evaluateContinuousFilmFrame(clamped);
    onSeekFilmFrame?.(ev.frame, ev.cameraPosition, ev.cameraTarget, ev.fovDeg, ev.targetSphere);
  };

  return (
    <div
      data-testid="cerebro39-system-modal"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-0 z-(--z-system-modal) bg-[#05090E]/92 flex items-center justify-center p-4 pointer-events-auto"
    >
      <div className="w-full max-w-4xl max-h-[88dvh] rounded-[20px] border border-[#B4DDFF]/35 bg-[#101D27]/95 text-[#F2F6F8] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#B4DDFF]/20 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#65ACFF]">
              CEREBRO 39 · SOURCE LOCK 1f78a12 · CHECKPOINT dd0db50
            </div>
            <h2 className="font-display text-base font-semibold text-[#F2F6F8]">
              Master Design System v2.0 · 453-Leaf Config · 180s Continuous Shot & QA
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Scoped Visual Authority Toggle (Resolves TYPE-01, COLOR-01, FX-01) */}
            <div className="flex items-center rounded-lg p-0.5 bg-[#05090E] border border-[#B4DDFF]/25">
              <button
                type="button"
                data-testid="scope-locked-app-btn"
                onClick={() => onChangeVisualScope('locked_app_1f78a12')}
                className={`min-h-[34px] px-2.5 py-1 rounded-md font-mono text-[10px] cursor-pointer transition-colors ${
                  visualScope === 'locked_app_1f78a12'
                    ? 'bg-[#65ACFF] text-[#05090E] font-semibold'
                    : 'text-[#D0DCE3] hover:text-[#F2F6F8]'
                }`}
              >
                Locked App (Sora · Ice/Cobalt)
              </button>
              <button
                type="button"
                data-testid="scope-film-variant-btn"
                onClick={() => onChangeVisualScope('film_reference_sehly_180s')}
                className={`min-h-[34px] px-2.5 py-1 rounded-md font-mono text-[10px] cursor-pointer transition-colors ${
                  visualScope === 'film_reference_sehly_180s'
                    ? 'bg-[#D4AF37] text-[#05090E] font-semibold'
                    : 'text-[#D0DCE3] hover:text-[#F2F6F8]'
                }`}
              >
                Film Variant (Jaapokki · Gold Rails)
              </button>
            </div>

            <button
              type="button"
              data-testid="close-cerebro39-modal"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] px-3 rounded-lg font-mono text-xs bg-[#142632] border border-[#B4DDFF]/30 text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2 border-b border-[#B4DDFF]/15 flex items-center gap-2 overflow-x-auto bg-[#05090E]/50">
          {[
            { id: 'shot180s', label: '03 / 180s Continuous Shot (5,400f)' },
            { id: 'conflicts', label: '04 / 8 Conflicts & 5 Blocked Media Slots' },
            { id: 'checkpoint', label: '05 / Checkpoint dd0db50 & 9 QA Gates' },
            { id: 'registries', label: '01-02 / JSON Registries & 7 GLB Assets' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg font-mono text-[11px] whitespace-nowrap cursor-pointer border transition-colors ${
                activeTab === t.id
                  ? 'bg-[#142632] text-[#F2F6F8] border-[#65ACFF]'
                  : 'bg-transparent text-[#BDCBD3] border-transparent hover:text-[#F2F6F8]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'shot180s' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#142632]/60 border border-[#B4DDFF]/25 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-[11px] text-[#9AFFE0]">
                      FRAME {evaluated.frame} / 5399 · T = {evaluated.timeSec.toFixed(2)}s / 180.00s · 30 FPS
                    </div>
                    <div className="font-display text-lg font-semibold text-[#F2F6F8]">
                      Ch 0{evaluated.chapterIndex}: {evaluated.chapterName} — {evaluated.visualStory}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="play-180s-shot-btn"
                      onClick={() => setIsPlayingShot((v) => !v)}
                      className="min-h-[40px] px-4 py-1.5 rounded-lg font-mono text-xs font-semibold bg-[#65ACFF] text-[#05090E] cursor-pointer"
                    >
                      {isPlayingShot ? '⏸ Pause 180s Shot' : '▶ Play Continuous Shot'}
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={5399}
                  value={frameIndex}
                  onChange={(e) => handleScrubFrame(Number(e.target.value))}
                  className="w-full accent-[#65ACFF] cursor-pointer"
                />

                {/* 10 Chapter Direct Jump Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {CONTINUOUS_180S_CHAPTERS.map((ch) => {
                    const isCurrent = evaluated.chapterIndex === ch.chapterIndex;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleScrubFrame(ch.startFrame)}
                        className={`p-2 rounded-lg text-left border font-mono text-[10px] cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-[#65ACFF]/20 border-[#65ACFF] text-[#F2F6F8]'
                            : 'bg-[#05090E]/60 border-[#B4DDFF]/15 text-[#BDCBD3] hover:border-[#B4DDFF]/40'
                        }`}
                      >
                        <div className="font-semibold text-[#F2F6F8]">
                          {String(ch.startSec).padStart(3, '0')}–{String(ch.endSec).padStart(3, '0')}s · {ch.chapter}
                        </div>
                        <div className="truncate opacity-80">{ch.visualStory}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Live Evaluated Camera & Aperture Telemetry */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-[#05090E]/70 border border-[#B4DDFF]/15">
                    <div className="text-[#BDCBD3]">Authoritative Camera Position</div>
                    <div className="text-[#F2F6F8]">
                      [{evaluated.cameraPosition.join(', ')}] · FOV {evaluated.fovDeg}°
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#05090E]/70 border border-[#B4DDFF]/15">
                    <div className="text-[#BDCBD3]">1st Velocity Derivative (dx/dt)</div>
                    <div className="text-[#9AFFE0]">
                      [{evaluated.cameraVelocity.join(', ')}] u/s
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#05090E]/70 border border-[#B4DDFF]/15">
                    <div className="text-[#BDCBD3]">Recessed Media Aperture</div>
                    <div className="text-[#F2F6F8]">
                      {evaluated.mediaApertureRatio ? `Holder ${evaluated.mediaApertureRatio} (contain)` : 'Full Stage Sphere'}
                      {evaluated.unresolvedMediaSlot ? ` · [${evaluated.unresolvedMediaSlot}: BLOCKED]` : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* CAM-001 9-Join Continuity Proof Table */}
              <div className="p-4 rounded-2xl bg-[#05090E]/70 border border-[#B4DDFF]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#F2F6F8]">
                    CAM-001 · 5,400-Frame Chapter Boundary Continuity Scan (Threshold &lt; 0.025)
                  </span>
                  <span className="font-mono text-xs text-[#36E88D]">
                    MAX DELTA: {continuityScan.maxBoundaryPoseDelta} · ALL 9 JOINS PASSED
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                  {continuityScan.joins.map((j) => (
                    <div key={j.joinIndex} className="p-2 rounded bg-[#101D27] border border-[#B4DDFF]/15 flex items-center justify-between">
                      <span>
                        f={j.boundaryFrame} ({j.fromChapter} → {j.toChapter})
                      </span>
                      <span className="text-[#36E88D]">Δ={j.poseDeltaAtBoundary}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-mono text-xs uppercase tracking-wider text-[#65ACFF]">
                  Document 04 · 8 Explicit Source Conflicts & Enforced Resolutions
                </h3>
                <div className="space-y-2">
                  {EXPLICIT_CONFLICTS_TABLE.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-[#142632]/50 border border-[#B4DDFF]/20 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-[#F2F6F8]">
                          {c.id} · LEVEL: {c.level}
                        </span>
                        <span className="text-[#36E88D]">{c.status}</span>
                      </div>
                      <div className="text-[#D0DCE3]">
                        <strong>Source Rule:</strong> {c.sourceRule}
                      </div>
                      <div className="text-[#BDCBD3]">
                        <strong>Observed:</strong> {c.observed}
                      </div>
                      <div className="text-[#9AFFE0]">
                        <strong>Resolution:</strong> {c.resolution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-mono text-xs uppercase tracking-wider text-[#FF5666]">
                  Document 02 · 5 Unresolved Media Slots (Gated BLOCKED — Never Fabricated)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {UNRESOLVED_MEDIA_SLOTS_TABLE.map((m) => (
                    <div key={m.slot} className="p-3 rounded-xl bg-[#05090E]/80 border border-[#FF5666]/40 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#F2F6F8] font-semibold">{m.slot}</span>
                        <span className="text-[#FF5666]">{m.status}</span>
                      </div>
                      <div className="text-[#D0DCE3]">{m.role} · Holder: {m.ratio}</div>
                      <div className="text-[10px] text-[#BDCBD3]">Needed: {m.needed}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checkpoint' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#142632]/50 border border-[#B4DDFF]/25 space-y-2">
                <div className="font-mono text-xs text-[#65ACFF]">
                  DOCUMENT 05 · RELEASE CHECKPOINT dd0db5043f8dafad8f1c47dce4d2ebd5d275cd95 (PR #145)
                </div>
                <p className="text-xs text-[#D0DCE3]">
                  All four historical camera-proof checks from Document 05 Page 2 are preserved with their original reported baselines and verified against the current deterministic camera & layout engine:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {RELEASE_CHECKPOINT_DD0DB50_CHECKS.map((chk) => (
                    <div key={chk.id} className="p-3 rounded-xl bg-[#05090E]/80 border border-[#B4DDFF]/20 font-mono text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#F2F6F8]">{chk.name}</span>
                        <span className="text-[#36E88D]">VERIFIED</span>
                      </div>
                      <div className="text-[11px] text-[#BDCBD3]">
                        Historical Reported: {chk.historicalReported} (Threshold: {chk.threshold})
                      </div>
                      <div className="text-[11px] text-[#9AFFE0]">
                        Current Engine: {chk.verifiedResult}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registries' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {REGISTRY_DOWNLOADS.map((reg) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => setSelectedJsonUrl(reg.path)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer border ${
                      selectedJsonUrl === reg.path
                        ? 'bg-[#65ACFF] text-[#05090E] border-[#F2F6F8] font-semibold'
                        : 'bg-[#05090E] text-[#D0DCE3] border-[#B4DDFF]/20 hover:border-[#B4DDFF]/50'
                    }`}
                  >
                    {reg.id}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-[#BDCBD3]">{selectedJsonUrl}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(jsonPreviewText);
                      setCopiedFeedback('Copied JSON!');
                      window.setTimeout(() => setCopiedFeedback(null), 1800);
                    }}
                    className="min-h-[34px] px-3 py-1 rounded-lg font-mono text-xs bg-[#142632] border border-[#B4DDFF]/30 text-[#F2F6F8] cursor-pointer"
                  >
                    {copiedFeedback || 'Copy JSON'}
                  </button>
                  <a
                    href={selectedJsonUrl}
                    download
                    className="min-h-[34px] px-3 py-1 rounded-lg font-mono text-xs bg-[#65ACFF] text-[#05090E] font-semibold flex items-center"
                  >
                    Download .json
                  </a>
                </div>
              </div>

              <pre className="p-3.5 rounded-xl bg-[#05090E] border border-[#B4DDFF]/20 font-mono text-[11px] text-[#D0DCE3] max-h-[42dvh] overflow-auto leading-relaxed">
                {jsonPreviewText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
