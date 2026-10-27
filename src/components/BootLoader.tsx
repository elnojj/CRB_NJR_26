import React, { useEffect, useState } from 'react';
import { BrandLockup } from './BrandLockup';
import { COLOUR_TOKENS } from '../tokens/colours';

interface BootLoaderProps {
  reducedMotion: boolean;
  onTakeOff: () => void;
}

const STATUS_LINES = [
  'Preparing HQ and CDE spatial workspace',
  'Loading 5 HQ stations and 4 CDE dimensions',
  'Reading NOJARA project register snapshot (23 Oct 2026 · 52 records)',
  'Initializing conversation and camera controls',
];

export const BootLoader: React.FC<BootLoaderProps> = ({ reducedMotion, onTakeOff }) => {
  const totalDurationMs = reducedMotion ? 800 : 2200;
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let completed = false;
    const interval = window.setInterval(() => {
      const now = performance.now();
      const diff = Math.min(totalDurationMs, now - start);
      setElapsedMs(diff);
      if (diff >= totalDurationMs && !completed) {
        completed = true;
        window.clearInterval(interval);
        onTakeOff();
      }
    }, 40);
    return () => window.clearInterval(interval);
  }, [totalDurationMs, onTakeOff]);

  const progressRatio = Math.min(1, elapsedMs / totalDurationMs);
  const activeLineIndex = Math.min(3, Math.floor(progressRatio * 4));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 md:p-12 select-none safe-top safe-bottom"
      style={{
        background: `radial-gradient(circle at 50% 38%, ${COLOUR_TOKENS.fieldInner} 0%, ${COLOUR_TOKENS.canvas} 65%, ${COLOUR_TOKENS.fieldOuter} 100%)`,
      }}
    >
      {/* Top spacer */}
      <div className="w-full max-w-2xl" />

      {/* Center Brand Lockup + 4 Status Lines */}
      <div className="w-full max-w-xl flex flex-col items-center gap-7 my-auto">
        <BrandLockup mode="loader" />

        {/* Progress Bar */}
        <div className="w-full flex flex-col gap-2">
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#142632] border border-white/25">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${Math.round(progressRatio * 100)}%`,
                backgroundColor: COLOUR_TOKENS.cobaltAccent,
              }}
            />
          </div>
        </div>

        {/* Four Status Lines */}
        <div
          className="w-full rounded-xl p-5 flex flex-col gap-2.5 border"
          style={{
            backgroundColor: COLOUR_TOKENS.glassRgba,
            borderColor: COLOUR_TOKENS.outlineControl,
          }}
        >
          {STATUS_LINES.map((line, idx) => {
            const isReached = idx <= activeLineIndex || progressRatio >= 1;
            const isCurrent = idx === activeLineIndex && progressRatio < 1;
            return (
              <div
                key={line}
                className={`text-xs flex items-center justify-between transition-opacity duration-200 ${
                  isReached ? 'opacity-100 text-[#F2F6F8]' : 'opacity-40 text-[#BDCBD3]'
                }`}
              >
                <span className="truncate pr-3">
                  0{idx + 1}. {line}
                </span>
                <span
                  className="text-[11px] shrink-0 font-mono"
                  style={{
                    color:
                      progressRatio >= 1 || idx < activeLineIndex
                        ? COLOUR_TOKENS.stationFiles
                        : isCurrent
                        ? COLOUR_TOKENS.cobaltAccent
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

        {/* Take off button */}
        <button
          type="button"
          data-testid="boot-take-off"
          onClick={onTakeOff}
          className="min-h-[46px] min-w-[140px] px-8 py-2.5 rounded-xl font-display font-semibold text-sm tracking-wider uppercase transition-transform active:scale-95 cursor-pointer border"
          style={{
            backgroundColor: COLOUR_TOKENS.cobaltAccent,
            color: COLOUR_TOKENS.cobaltLabel,
            borderColor: COLOUR_TOKENS.outlineControl,
          }}
        >
          Take off
        </button>
      </div>

      {/* Bottom Arabic greeting preview (never addresses owner as "39" in Arabic) */}
      <div className="w-full max-w-2xl flex items-center justify-end text-xs text-[#BDCBD3]">
        <span dir="rtl" lang="ar" className="font-arabic text-[15px] text-[#F2F6F8]">
          أهلاً بيك يا فندم · Cerebro معاك
        </span>
      </div>
    </div>
  );
};
