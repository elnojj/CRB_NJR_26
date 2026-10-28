import React from 'react';

interface BrandLockupProps {
  mode: 'loader' | 'header';
  activeSphere?: 'hq' | 'cde';
  onSwitchSphere?: (sphere: 'hq' | 'cde') => void;
}

/**
 * Approved Brand Lockup:
 * White Arabic Bismillah vector asset positioned above the white CEREBRO logo asset.
 * Appears during entry, moves into its reserved header slot, and preserves aspect ratio & spacing.
 */
export const BrandLockup: React.FC<BrandLockupProps> = ({
  mode,
  activeSphere = 'hq',
  onSwitchSphere,
}) => {
  const isLoader = mode === 'loader';

  return (
    <div
      className={`select-none pointer-events-auto flex ${
        isLoader ? 'flex-col items-center gap-3' : 'items-center gap-3'
      }`}
      aria-label="Cerebro Brand Lockup"
    >
      <div
        className={`flex flex-col ${
          isLoader ? 'items-center gap-2.5' : 'items-start gap-1'
        } lockup-shimmer shrink-0`}
        style={{
          minWidth: isLoader ? '220px' : '148px',
        }}
      >
        <span
          dir="rtl"
          lang="ar"
          aria-label="بسم الله الرحمن الرحيم"
          className={`font-arabic text-[#F2F6F8] font-medium tracking-normal leading-none shrink-0 ${
            isLoader ? 'text-lg' : 'text-xs'
          }`}
        >
          بسم الله الرحمن الرحيم
        </span>
        <img
          src="/assets/cerebro-wordmark.svg"
          alt="CEREBRO"
          width={isLoader ? 164 : 112}
          height={isLoader ? 22 : 15}
          className={`${isLoader ? 'w-[164px] h-[22px]' : 'w-[112px] h-[15px]'} object-contain shrink-0`}
        />
      </div>

      {!isLoader && onSwitchSphere && (
        <div
          role="group"
          aria-label="Sphere Switch"
          className="inline-flex items-center p-0.5 rounded-xl bg-[#05090E]/85 border border-white/30 shrink-0"
        >
          <button
            type="button"
            data-testid="switch-sphere-hq"
            onClick={() => onSwitchSphere('hq')}
            className={`min-h-[38px] min-w-[44px] px-2.5 py-1 rounded-lg font-sans text-xs font-medium transition-colors cursor-pointer ${
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
            className={`min-h-[38px] min-w-[44px] px-2.5 py-1 rounded-lg font-sans text-xs font-medium transition-colors cursor-pointer ${
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
