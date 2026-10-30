import React from 'react';

interface BrandLockupProps {
  mode: 'loader' | 'header';
  activeSphere?: 'hq' | 'cde';
  onSwitchSphere?: (sphere: 'hq' | 'cde') => void;
}

/**
 * CEREBRO & NOJARA MASTER SPEC (v1.24) Brand Lockup:
 * Prominent Nojara logo title (clamp(28px, 3.5vw, 48px)),
 * Floating Arabic subtitle (ديجيتال الاستوديو),
 * Cerebro angel emblem watermark,
 * and White Arabic Bismillah vector asset.
 */
export const BrandLockup: React.FC<BrandLockupProps> = ({
  mode,
  activeSphere = 'hq',
  onSwitchSphere,
}) => {
  const isLoader = mode === 'loader';

  return (
    <div
      className={`select-none pointer-events-auto nojara-brand-container ${
        isLoader ? 'flex-col items-center gap-3 p-4' : 'items-center gap-3'
      }`}
      aria-label="Cerebro & Nojara Brand Lockup"
    >
      {/* Cerebro Angel Watermark Emblem Motif */}
      <div className="cerebro-angel-emblem shrink-0 flex items-center justify-center" title="NOJARA Angel Motif">
        <svg width={isLoader ? 36 : 24} height={isLoader ? 36 : 24} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 4L28.5 16.5L42 18L31.5 27L34.5 40.5L24 33.5L13.5 40.5L16.5 27L6 18L19.5 16.5L24 4Z" fill="url(#angelGrad)" fillOpacity="0.85" />
          <path d="M24 10C24 10 14 18 10 28C6 38 14 42 14 42C14 42 16 32 24 28C32 32 34 42 34 42C34 42 42 38 38 28C34 18 24 10 24 10Z" stroke="#9AFFE0" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="24" cy="22" r="3.5" fill="#B4DDFF" />
          <defs>
            <linearGradient id="angelGrad" x1="6" y1="4" x2="42" y2="40.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9AFFE0" />
              <stop offset="0.5" stopColor="#78D3B2" />
              <stop offset="1" stopColor="#B4DDFF" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div
        className={`flex flex-col ${
          isLoader ? 'items-center gap-1.5' : 'items-start gap-0.5'
        } lockup-shimmer shrink-0`}
        style={{
          minWidth: isLoader ? '220px' : '150px',
        }}
      >
        <span
          dir="rtl"
          lang="ar"
          aria-label="بسم الله الرحمن الرحيم"
          className={`font-arabic text-[#F2F6F8] font-medium tracking-normal leading-none shrink-0 ${
            isLoader ? 'text-base mb-1' : 'text-[11px]'
          }`}
        >
          بسم الله الرحمن الرحيم
        </span>

        <div className="flex items-baseline gap-2">
          <span className="nojara-logo-title leading-tight">
            NOJARA
          </span>
          <span className="font-mono text-[10px] tracking-wider text-[#78D3B2] uppercase hidden sm:inline-block">
            CEREBRO
          </span>
        </div>

        <span
          dir="rtl"
          lang="ar"
          className="nojara-arabic-subtitle leading-tight"
        >
          ديجيتال الاستوديو
        </span>
      </div>

      {!isLoader && onSwitchSphere && (
        <div
          role="group"
          aria-label="Sphere Switch"
          className="inline-flex items-center p-0.5 rounded-xl bg-[#05090E]/85 border border-white/30 shrink-0 ml-1"
        >
          <button
            type="button"
            data-testid="switch-sphere-hq"
            onClick={() => onSwitchSphere('hq')}
            className={`min-h-[34px] min-w-[40px] px-2.5 py-0.5 rounded-lg font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeSphere === 'hq'
                ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
            }`}
          >
            HQ
          </button>
          <button
            type="button"
            data-testid="switch-sphere-cde"
            onClick={() => onSwitchSphere('cde')}
            className={`min-h-[34px] min-w-[40px] px-2.5 py-0.5 rounded-lg font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeSphere === 'cde'
                ? 'bg-[#F2B66D] text-[#101D27] font-semibold'
                : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
            }`}
          >
            CDE
          </button>
        </div>
      )}
    </div>
  );
};
