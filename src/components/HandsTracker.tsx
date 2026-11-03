import React from 'react';

export interface MobileSingleHandControllerProps {
  active: boolean;
  onToggleActive: () => void;
  onZoomGesture?: (delta: number) => void;
  onSelectNode?: () => void;
}

/** Mobile one-hand control — delegates activation to App's shared HandsWireframeRig. */
export const MobileSingleHandController: React.FC<MobileSingleHandControllerProps> = ({
  active,
  onToggleActive,
  onZoomGesture,
  onSelectNode,
}) => (
  <div className="flex items-center gap-1.5" data-testid="mobile-single-hand-controller">
    <button
      type="button"
      data-cta-id="gesture-toggle"
      onClick={onToggleActive}
      className="cj-glass-card min-h-[40px] px-2.5 rounded-full font-mono text-[12px] text-[#C5CCD6]"
      title="Enable one-hand gesture"
    >
      {active ? 'Gesture On' : 'Enable One-Hand Gesture'}
    </button>
    {active && (
      <>
        <button
          type="button"
          className="min-h-[40px] min-w-[40px] rounded-full border border-white/15 font-mono text-xs"
          onClick={() => onZoomGesture?.(1)}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="min-h-[40px] min-w-[40px] rounded-full border border-white/15 font-mono text-xs"
          onClick={() => onZoomGesture?.(-1)}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          className="min-h-[40px] px-2 rounded-full border border-white/15 font-mono text-xs"
          onClick={onSelectNode}
        >
          Select
        </button>
      </>
    )}
  </div>
);
