import React, { type ReactNode } from 'react';

export type FloatingToggleItem = {
  id: string;
  label: string;
  visible?: boolean;
  active?: boolean;
  testId?: string;
  onClick?: () => void;
};

export interface FloatingIconTogglesProps {
  moreOpen?: boolean;
  toggles: FloatingToggleItem[];
  onToggleMore?: () => void;
  moreMenu?: ReactNode;
}

export const FloatingIconToggles: React.FC<FloatingIconTogglesProps> = ({
  moreOpen = false,
  toggles,
  onToggleMore,
  moreMenu,
}) => {
  const visible = toggles.filter((t) => t.visible !== false);
  const primary = visible.slice(0, moreMenu ? visible.length : 4);
  const overflow = moreMenu ? [] : visible.slice(4);

  return (
    <div
      className="pointer-events-auto flex flex-col items-end gap-2"
      data-testid="floating-icon-toggles"
    >
      <div className="flex flex-wrap justify-end gap-1.5">
        {primary.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={t.testId}
            aria-label={t.label}
            data-active={t.active ? '1' : '0'}
            onClick={t.onClick}
            className={`min-h-[40px] min-w-[40px] rounded-full border px-2 font-mono text-[11px] backdrop-blur-md ${
              t.active
                ? 'border-[#D4AF37]/60 bg-[#D4AF37]/20 text-[#FFF4D0]'
                : 'border-white/15 bg-black/40 text-[#C5CCD6]'
            }`}
          >
            {t.label}
          </button>
        ))}
        {(overflow.length > 0 || moreMenu) && (
          <button
            type="button"
            className="min-h-[40px] min-w-[40px] rounded-full border border-white/15 bg-black/40 font-mono text-[11px] text-[#C5CCD6]"
            onClick={onToggleMore}
            aria-expanded={moreOpen}
          >
            More
          </button>
        )}
      </div>
      {moreOpen && moreMenu}
      {moreOpen && !moreMenu && overflow.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-white/15 bg-black/70 p-2 backdrop-blur-md">
          {overflow.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={t.testId}
              onClick={t.onClick}
              className="min-h-[36px] rounded-lg px-3 text-left font-mono text-[11px] text-[#F2F6F8] hover:bg-white/10"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
