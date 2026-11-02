import React, { useEffect, useRef, useState } from 'react';
import { BrandLockup } from './BrandLockup';
import { COLOUR_TOKENS } from '../tokens/colours';

interface BootLoaderProps {
  reducedMotion: boolean;
  initialPhase?: 'keypad' | 'loader';
  lockOnComplete?: boolean;
  onTakeOff: () => void;
  /** Optional health telemetry strip (offline / WebGL / voice). */
  healthLine?: string | null;
}

const STATUS_LINES = [
  'Preparing four-sphere constellation: HQ · CDE · Campaign OS · About Us',
  'Loading 17 Wireframes v1.1 panels, 5 HQ stations, and 4 CDE dimensions',
  'Reading NOJARA project register snapshot (23 Oct 2026 · 52 records · 17 projects)',
  'Initializing 22-tool Cro-cde-google voice bridge and camera controls',
];

export const BootLoader: React.FC<BootLoaderProps> = ({
  reducedMotion,
  initialPhase = 'loader',
  lockOnComplete = false,
  onTakeOff,
  healthLine = null,
}) => {
  const [phase, setPhase] = useState<'keypad' | 'loader'>(initialPhase);
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const onTakeOffRef = useRef(onTakeOff);
  const lockOnCompleteRef = useRef(lockOnComplete);

  useEffect(() => {
    onTakeOffRef.current = onTakeOff;
  }, [onTakeOff]);

  useEffect(() => {
    lockOnCompleteRef.current = lockOnComplete;
  }, [lockOnComplete]);

  useEffect(() => {
    setPhase(initialPhase);
  }, [initialPhase]);

  const totalDurationMs = reducedMotion ? 800 : 8000;
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (phase !== 'loader') return;
    const start = performance.now();
    let completed = false;

    // 12-second watchdog timeout: entry never stalls on desktop or phone
    const watchdog = window.setTimeout(() => {
      if (!completed && !lockOnCompleteRef.current) {
        completed = true;
        window.clearInterval(interval);
        console.warn('[BootLoader] 12s watchdog timeout reached — invoking onTakeOff immediately');
        onTakeOffRef.current();
      }
    }, 12000);

    const interval = window.setInterval(() => {
      const now = performance.now();
      const diff = Math.min(totalDurationMs, now - start);
      setElapsedMs(diff);
      if (diff >= totalDurationMs && !completed) {
        completed = true;
        window.clearInterval(interval);
        window.clearTimeout(watchdog);
        if (!lockOnCompleteRef.current) {
          onTakeOffRef.current();
        }
      }
    }, 50);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(watchdog);
    };
    // Intentionally omit onTakeOff/lockOnComplete: parent re-renders (telemetry,
    // layout) would otherwise restart the loader and pin progress near 1%.
  }, [phase, totalDurationMs]);

  const handleDigitPress = (digit: string) => {
    setPinError(null);
    const next = (pinCode + digit).slice(0, 4);
    setPinCode(next);
    if (next.length === 4) {
      if (next === '3939') {
        setPhase('loader');
      } else {
        setPinError('Invalid Sovereign PIN · Expected Owner Gate 3939');
        window.setTimeout(() => setPinCode(''), 550);
      }
    }
  };

  if (phase === 'keypad') {
    return (
      <div
        data-testid="owner-gate-keypad"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none safe-top safe-bottom pointer-events-auto"
        style={{
          backgroundColor: 'rgba(16, 22, 34, 0.45)',
        }}
      >
        <div className="cj-glass-card w-full max-w-sm rounded-xl p-5 flex flex-col items-center gap-4 neural-reveal">
          {/* Standardized Panel Header Bar (#17) */}
          <div
            className="w-full flex items-center justify-between gap-2 pb-2.5 border-b"
            style={{ borderColor: 'rgba(197, 204, 214, 0.22)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COLOUR_TOKENS.cobaltAccent }}
              />
              <span className="font-display font-semibold text-xs tracking-[0.08em] uppercase text-[#F2F6F8] truncate">
                #17 · S01 OWNER GATE KEYPAD
              </span>
            </div>
            <span
              className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded border shrink-0"
              style={{
                backgroundColor: '#101622',
                borderColor: 'rgba(197, 204, 214, 0.22)',
                color: '#C5CCD6',
              }}
            >
              LIVE
            </span>
          </div>

          {/* Official NOJARA Brand Lockup */}
          <BrandLockup mode="loader" />

          <div className="text-center">
            <div className="text-xs text-[#C5CCD6]">
              Enter 4-digit Owner Code (
              <span className="font-mono tabular-nums text-[#FFF4D0]">3939</span>) to
              unlock CEREBRO HQ
            </div>
          </div>

          {/* 4-dot PIN display */}
          <div className="flex items-center justify-center gap-3 my-0.5">
            {[0, 1, 2, 3].map((slot) => {
              const filled = pinCode.length > slot;
              return (
                <div
                  key={slot}
                  className="w-11 h-12 rounded-lg border flex items-center justify-center font-mono tabular-nums text-lg font-bold transition-all"
                  style={{
                    backgroundColor: filled
                      ? 'rgba(27, 34, 48, 0.92)'
                      : 'rgba(16, 22, 34, 0.78)',
                    borderColor: pinError
                      ? COLOUR_TOKENS.systemErrorRed
                      : filled
                      ? COLOUR_TOKENS.focusRing
                      : 'rgba(197, 204, 214, 0.22)',
                    color: COLOUR_TOKENS.textPrimary,
                  }}
                >
                  {filled ? pinCode[slot] : '·'}
                </div>
              );
            })}
          </div>

          {pinError && (
            <div
              className="text-[11px] font-mono text-center px-3 py-1 rounded-lg border"
              style={{
                color: COLOUR_TOKENS.systemErrorRed,
                borderColor: COLOUR_TOKENS.systemErrorRed,
                backgroundColor: 'rgba(255, 86, 102, 0.14)',
              }}
            >
              {pinError}
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                data-testid={`keypad-digit-${d}`}
                onClick={() => handleDigitPress(d)}
                className="h-11 rounded-lg border font-mono tabular-nums text-base font-semibold text-[#F2F6F8] hover:border-[#D4AF37] active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(16, 22, 34, 0.78)',
                  borderColor: 'rgba(197, 204, 214, 0.22)',
                }}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPinCode('');
                setPinError(null);
              }}
              className="h-11 rounded-lg border font-mono text-xs text-[#C5CCD6] hover:text-[#F2F6F8] hover:border-[#D4AF37] cursor-pointer"
              style={{
                backgroundColor: 'rgba(16, 22, 34, 0.78)',
                borderColor: 'rgba(197, 204, 214, 0.22)',
              }}
            >
              CLR
            </button>
            <button
              type="button"
              data-testid="keypad-digit-0"
              onClick={() => handleDigitPress('0')}
              className="h-11 rounded-lg border font-mono tabular-nums text-base font-semibold text-[#F2F6F8] hover:border-[#D4AF37] active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: 'rgba(16, 22, 34, 0.78)',
                borderColor: 'rgba(197, 204, 214, 0.22)',
              }}
            >
              0
            </button>
            <button
              type="button"
              data-testid="keypad-quick-3939"
              onClick={() => {
                setPinCode('3939');
                setPhase('loader');
              }}
              className="h-11 rounded-lg border font-mono tabular-nums text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: COLOUR_TOKENS.cobaltAccent,
                color: '#101622',
                borderColor: COLOUR_TOKENS.focusRing,
              }}
            >
              3939 ›
            </button>
          </div>

          <button
            type="button"
            data-testid="boot-take-off"
            data-cta-id="loader-take-off"
            onClick={onTakeOff}
            className="w-full py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider text-[#C5CCD6] hover:text-[#F2F6F8] hover:border-[#D4AF37] border cursor-pointer"
            style={{
              backgroundColor: 'rgba(16, 22, 34, 0.78)',
              borderColor: 'rgba(197, 204, 214, 0.22)',
            }}
          >
            Instant Take off Bypass ›
          </button>
        </div>
      </div>
    );
  }

  const progressRatio = Math.min(1, elapsedMs / totalDurationMs);
  const activeLineIndex = Math.min(3, Math.floor(progressRatio * 4));
  const isExiting = progressRatio >= 0.96;

  const KINETIC_SUPERS = [
    { title: 'INITIALIZING SPATIAL WORKSPACE', subtitle: 'HQ · CDE · Campaign OS · About Us constellation' },
    { title: 'CALIBRATING DUAL-SPHERE OPTICS', subtitle: 'Refractive liquid glass & 35mm Master Prime standard' },
    { title: 'ALIGNING NEURAL PROJECT GRAPHS', subtitle: '52 verified records · 17 projects snapshot' },
    { title: 'CEREBRO ACTIVE · WELCOME 39', subtitle: 'Founder and Culture & Design Engineering' },
  ];

  return (
    <div
      data-testid="boot-loader-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 select-none safe-top safe-bottom pointer-events-auto overflow-hidden"
      style={{
        backgroundColor: 'rgba(10, 18, 24, 0.72)',
        backdropFilter: 'blur(16px) saturate(1.25)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.25)',
      }}
    >
      {/* Background Spatial Optical Compass / Orbital Ring Infographics */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <svg
          className="w-[900px] h-[900px] max-w-[95vw] max-h-[95vh] opacity-35"
          viewBox="0 0 800 800"
          fill="none"
        >
          <circle
            cx="400"
            cy="400"
            r="320"
            stroke="#D4AF37"
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="4 8"
            className="animate-spin"
            style={{ animationDuration: '60s' }}
          />
          <circle
            cx="400"
            cy="400"
            r="240"
            stroke="#B4DDFF"
            strokeOpacity="0.18"
            strokeWidth="0.8"
          />
          <circle
            cx="400"
            cy="400"
            r="160"
            stroke="#D4AF37"
            strokeOpacity="0.28"
            strokeWidth="1.2"
            strokeDasharray="8 6"
          />
          <line x1="400" y1="40" x2="400" y2="760" stroke="#FFF4D0" strokeOpacity="0.12" strokeWidth="0.8" />
          <line x1="40" y1="400" x2="760" y2="400" stroke="#FFF4D0" strokeOpacity="0.12" strokeWidth="0.8" />
          <line x1="160" y1="160" x2="640" y2="640" stroke="#B4DDFF" strokeOpacity="0.08" strokeWidth="0.8" />
          <line x1="160" y1="640" x2="640" y2="160" stroke="#B4DDFF" strokeOpacity="0.08" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Top Telemetry Header Bar — Minimal & Translucent */}
      <header
        className={`w-full max-w-5xl flex items-center justify-between gap-4 py-2 z-10 transition-opacity duration-500 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: COLOUR_TOKENS.cobaltAccent }}
          />
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#FFF4D0]">
            CEREBRO · SPATIAL KINEMATIC BOOT
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-[#C5CCD6] px-2 py-0.5 rounded border border-white/10 bg-[#101622]/60">
            HQ · CDE · Campaign OS · About Us
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums text-xs text-[#FFF4D0]">
            {(elapsedMs / 1000).toFixed(1)}s / {(totalDurationMs / 1000).toFixed(1)}s
          </span>
          <button
            type="button"
            onClick={() => setPhase('keypad')}
            className="min-h-[38px] px-3 py-1 rounded-lg text-[11px] font-mono border text-[#C5CCD6] hover:text-[#F2F6F8] hover:border-[#D4AF37] bg-[#101622]/80 cursor-pointer transition-colors"
            style={{ borderColor: 'rgba(197, 204, 214, 0.22)' }}
          >
            3939 Gate
          </button>
          <span
            className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded border bg-[#101622]/80"
            style={{ borderColor: 'rgba(197, 204, 214, 0.22)', color: '#36E88D' }}
          >
            LIVE
          </span>
        </div>
      </header>

      {/* Central Spatial Floating Composition: Decoupled 3D NOJARA Logo + Kinetic Supers */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 z-10 my-auto text-center px-4 max-w-2xl">
        {/* Floating Decoupled 3D Logo Layer */}
        <div className="relative group transition-transform duration-700 hover:scale-105">
          <div className="absolute -inset-8 bg-gradient-to-r from-[#D4AF37]/15 via-[#65ACFF]/15 to-[#D4AF37]/15 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
          <div className="relative z-10">
            <BrandLockup mode="loader" />
          </div>
        </div>

        {/* Kinetic Typography: Single Focused Animated Super (3-7 words) */}
        <div className="flex flex-col items-center gap-2 min-h-[76px] transition-all duration-300">
          <div
            key={activeLineIndex}
            className="font-display text-base md:text-xl font-bold tracking-[0.12em] uppercase text-[#F2F6F8] animate-fadeIn"
            style={{ textShadow: '0 2px 14px rgba(0, 0, 0, 0.8)' }}
          >
            {KINETIC_SUPERS[activeLineIndex].title}
          </div>
          <div className="font-mono text-xs text-[#BDCBD3] tracking-wide">
            {KINETIC_SUPERS[activeLineIndex].subtitle}
          </div>
        </div>

        {/* Spatial Micro-Trajectory Progress Ring & Precision Filament */}
        <div className="w-full max-w-md flex flex-col items-center gap-2">
          <div
            className="w-full h-1 rounded-full overflow-hidden border"
            style={{
              backgroundColor: 'rgba(16, 22, 34, 0.75)',
              borderColor: 'rgba(197, 204, 214, 0.25)',
            }}
          >
            <div
              className="h-full transition-all duration-100 ease-out"
              style={{
                width: `${Math.round(progressRatio * 100)}%`,
                background: 'linear-gradient(90deg, #4C8DFF 0%, #D4AF37 100%)',
                boxShadow: '0 0 12px rgba(212, 175, 55, 0.65)',
              }}
            />
          </div>

          <div className="w-full flex items-center justify-between font-mono text-[10px] text-[#C5CCD6]">
            <span>ORBIT: DUAL-SPHERE</span>
            <span>{Math.round(progressRatio * 100)}% LOADED</span>
            <span>SPATIAL AUDIO: ARMED</span>
          </div>
          {healthLine && (
            <div
              role="status"
              aria-live="polite"
              data-testid="boot-health-line"
              className="w-full mt-2 font-mono text-[10px] text-[#9AFFE0] text-center"
            >
              {healthLine}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar — Negative Space, Clear Controls, Arabic Greeting */}
      <footer className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="boot-take-off"
            data-cta-id="loader-take-off"
            onClick={onTakeOff}
            className="min-h-[44px] min-w-[150px] px-6 py-2.5 rounded-xl font-display font-semibold text-xs tracking-[0.1em] uppercase transition-all duration-200 active:scale-95 cursor-pointer border shadow-lg hover:shadow-[#D4AF37]/20"
            style={{
              backgroundColor: '#D4AF37',
              color: '#101622',
              borderColor: '#FFF4D0',
            }}
          >
            Enter Cerebro →
          </button>
          <button
            type="button"
            data-testid="boot-skip"
            data-cta-id="boot.skip"
            onClick={onTakeOff}
            className="min-h-[44px] px-4 py-2.5 rounded-xl font-mono text-xs text-[#D0DCE3] hover:text-[#F2F6F8] border border-[rgba(197,204,214,0.22)] bg-[#101622]/80 hover:bg-[#142632] cursor-pointer transition-colors"
          >
            Skip
          </button>
        </div>

        <span
          dir="rtl"
          lang="ar"
          className="font-arabic text-base md:text-lg text-[#F2F6F8] font-medium"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
        >
          أهلاً بيك يا فندم · Cerebro معاك
        </span>
      </footer>
    </div>
  );
};
