import React, { useEffect, useState } from 'react';
import { BrandLockup } from './BrandLockup';
import { COLOUR_TOKENS } from '../tokens/colours';

interface BootLoaderProps {
  reducedMotion: boolean;
  initialPhase?: 'keypad' | 'loader';
  lockOnComplete?: boolean;
  onTakeOff: () => void;
}

const STATUS_LINES = [
  'Preparing HQ [0,0,0] and CDE [38,4,-22] dual-sphere spatial workspace',
  'Loading 17 Wireframes v1.1 panels, 5 HQ stations, and 4 CDE dimensions',
  'Reading NOJARA project register snapshot (23 Oct 2026 · 52 records · 17 projects)',
  'Initializing 22-tool Cro-cde-google voice bridge and camera controls',
];

export const BootLoader: React.FC<BootLoaderProps> = ({
  reducedMotion,
  initialPhase = 'loader',
  lockOnComplete = false,
  onTakeOff,
}) => {
  const [phase, setPhase] = useState<'keypad' | 'loader'>(initialPhase);
  const [pinCode, setPinCode] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

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
      if (!completed && !lockOnComplete) {
        completed = true;
        window.clearInterval(interval);
        console.warn('[BootLoader] 12s watchdog timeout reached — invoking onTakeOff immediately');
        onTakeOff();
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
        if (!lockOnComplete) {
          onTakeOff();
        }
      }
    }, 50);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(watchdog);
    };
  }, [phase, totalDurationMs, lockOnComplete, onTakeOff]);

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
          backgroundColor: 'rgba(16, 29, 39, 0.36)',
        }}
      >
        <div
          className="w-full max-w-sm rounded-xl p-5 flex flex-col items-center gap-4 border neural-reveal"
          style={{
            background: 'rgba(16, 29, 39, 0.84)',
            backdropFilter: 'blur(12px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
            borderColor: 'rgba(255, 255, 255, 0.14)',
            boxShadow:
              'inset 0 1px 0 rgba(180, 221, 255, 0.18), 0 20px 50px rgba(0, 0, 0, 0.55)',
          }}
        >
          {/* Standardized Panel Header Bar (#17) */}
          <div
            className="w-full flex items-center justify-between gap-2 pb-2.5 border-b"
            style={{ borderColor: 'rgba(255, 255, 255, 0.14)' }}
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
                backgroundColor: '#142632',
                borderColor: 'rgba(180, 221, 255, 0.16)',
                color: '#B4DDFF',
              }}
            >
              LIVE
            </span>
          </div>

          {/* Square-Kufic Bismillah SVG + Brand Lockup */}
          <svg
            width="136"
            height="28"
            viewBox="0 0 136 28"
            fill="none"
            aria-label="Square-Kufic Bismillah"
            className="opacity-95"
          >
            <rect
              x="2"
              y="4"
              width="132"
              height="20"
              rx="2"
              stroke="#B4DDFF"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            <path
              d="M12 18H28V10H34V18H48V8H54V18H70V10H76V18H92V8H98V18H114V10H124"
              stroke="#F2F6F8"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
          <BrandLockup mode="loader" />

          <div className="text-center">
            <div className="text-xs text-[#BDCBD3]">
              Enter 4-digit Owner Code (
              <span className="font-mono tabular-nums text-[#FFF1D4]">3939</span>) to
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
                      ? 'rgba(20, 38, 50, 0.92)'
                      : 'rgba(20, 38, 50, 0.72)',
                    borderColor: pinError
                      ? COLOUR_TOKENS.systemErrorRed
                      : filled
                      ? COLOUR_TOKENS.focusRing
                      : 'rgba(180, 221, 255, 0.16)',
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
                className="h-11 rounded-lg border font-mono tabular-nums text-base font-semibold text-[#F2F6F8] hover:border-[#65ACFF] active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(20, 38, 50, 0.72)',
                  borderColor: 'rgba(180, 221, 255, 0.16)',
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
              className="h-11 rounded-lg border font-mono text-xs text-[#BDCBD3] hover:text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer"
              style={{
                backgroundColor: 'rgba(20, 38, 50, 0.72)',
                borderColor: 'rgba(180, 221, 255, 0.16)',
              }}
            >
              CLR
            </button>
            <button
              type="button"
              data-testid="keypad-digit-0"
              onClick={() => handleDigitPress('0')}
              className="h-11 rounded-lg border font-mono tabular-nums text-base font-semibold text-[#F2F6F8] hover:border-[#65ACFF] active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: 'rgba(20, 38, 50, 0.72)',
                borderColor: 'rgba(180, 221, 255, 0.16)',
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
                color: '#101D27',
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
            className="w-full py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider text-[#BDCBD3] hover:text-[#F2F6F8] hover:border-[#65ACFF] border cursor-pointer"
            style={{
              backgroundColor: 'rgba(20, 38, 50, 0.72)',
              borderColor: 'rgba(180, 221, 255, 0.16)',
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

  return (
    <div
      data-testid="boot-loader-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 select-none safe-top safe-bottom pointer-events-auto"
      style={{
        backgroundColor: 'rgba(16, 29, 39, 0.36)',
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl p-6 flex flex-col items-center gap-5 border neural-reveal"
        style={{
          background: 'rgba(16, 29, 39, 0.84)',
          backdropFilter: 'blur(12px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
          borderColor: 'rgba(255, 255, 255, 0.14)',
          boxShadow:
            'inset 0 1px 0 rgba(180, 221, 255, 0.18), 0 20px 50px rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Standardized Panel Header Bar (#17) */}
        <div
          className="w-full flex items-center justify-between gap-2 pb-2.5 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.14)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: COLOUR_TOKENS.cobaltAccent }}
            />
            <span className="font-display font-semibold text-xs tracking-[0.08em] uppercase text-[#F2F6F8] truncate">
              #17 · S02 TELEMETRY BOOT LOADER
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono tabular-nums text-[11px] text-[#FFF1D4]">
              {(elapsedMs / 1000).toFixed(1)}s / 8.0s
            </span>
            <button
              type="button"
              onClick={() => setPhase('keypad')}
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono tabular-nums border text-[#BDCBD3] hover:text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer"
              style={{
                backgroundColor: '#142632',
                borderColor: 'rgba(180, 221, 255, 0.16)',
              }}
            >
              3939 Gate
            </button>
            <span
              className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded border"
              style={{
                backgroundColor: '#142632',
                borderColor: 'rgba(180, 221, 255, 0.16)',
                color: '#B4DDFF',
              }}
            >
              LIVE
            </span>
          </div>
        </div>

        {/* Center Square-Kufic Bismillah SVG + Brand Lockup */}
        <svg
          width="156"
          height="32"
          viewBox="0 0 156 32"
          fill="none"
          aria-label="Locked Square-Kufic Bismillah SVG"
          className="opacity-95"
        >
          <rect
            x="2"
            y="4"
            width="152"
            height="24"
            rx="3"
            stroke="#B4DDFF"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
          <path
            d="M14 22H32V11H40V22H56V9H64V22H82V11H90V22H108V9H116V22H134V11H144"
            stroke="#F2F6F8"
            strokeWidth="2.2"
            strokeLinecap="square"
          />
        </svg>

        <BrandLockup mode="loader" />

        {/* Progress Bar */}
        <div className="w-full flex flex-col gap-1.5">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden border"
            style={{
              backgroundColor: '#142632',
              borderColor: 'rgba(180, 221, 255, 0.16)',
            }}
          >
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${Math.round(progressRatio * 100)}%`,
                backgroundColor: COLOUR_TOKENS.trackingValid,
              }}
            />
          </div>
        </div>

        {/* Four Sequential Telemetry Lines in Inner Optical Sub-Pocket */}
        <div
          className="w-full rounded-lg p-4 flex flex-col gap-2.5 border"
          style={{
            backgroundColor: 'rgba(20, 38, 50, 0.72)',
            borderColor: 'rgba(180, 221, 255, 0.16)',
          }}
        >
          {STATUS_LINES.map((line, idx) => {
            const isReached = idx <= activeLineIndex || progressRatio >= 1;
            const isCurrent = idx === activeLineIndex && progressRatio < 1;
            return (
              <div
                key={line}
                className={`text-xs flex items-center justify-between transition-opacity duration-200 ${
                  isReached
                    ? 'opacity-100 text-[#F2F6F8]'
                    : 'opacity-45 text-[#BDCBD3]'
                }`}
              >
                <span className="truncate pr-3">
                  0{idx + 1}. {line}
                </span>
                <span
                  className="text-[11px] shrink-0 font-mono tabular-nums"
                  style={{
                    color:
                      progressRatio >= 1 || idx < activeLineIndex
                        ? COLOUR_TOKENS.trackingValid
                        : isCurrent
                        ? COLOUR_TOKENS.focusRing
                        : '#BDCBD3',
                  }}
                >
                  {progressRatio >= 1 || idx < activeLineIndex
                    ? 'Ready'
                    : isCurrent
                    ? 'Loading'
                    : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Take off button + Arabic greeting */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            data-testid="boot-take-off"
            data-cta-id="loader-take-off"
            onClick={onTakeOff}
            className="min-h-[42px] min-w-[140px] px-7 py-2 rounded-lg font-display font-semibold text-xs tracking-[0.08em] uppercase transition-transform active:scale-95 cursor-pointer border"
            style={{
              backgroundColor: COLOUR_TOKENS.cobaltAccent,
              color: '#101D27',
              borderColor: COLOUR_TOKENS.focusRing,
            }}
          >
            Take off →
          </button>

          <span
            dir="rtl"
            lang="ar"
            className="font-arabic text-[15px] text-[#F2F6F8]"
          >
            أهلاً بيك يا فندم · Cerebro معاك
          </span>
        </div>
      </div>
    </div>
  );
};
