import React from 'react';
import type { ConnectedSphereId } from '../three/sphereNetwork';
import {
  VISUAL_AUTHORITY_SCOPES,
  type VisualAuthorityScopeId,
} from '../data/cerebro39MasterSystem';

export interface Cerebro39SystemModalProps {
  open: boolean;
  onClose: () => void;
  visualScope: VisualAuthorityScopeId;
  onChangeVisualScope: (scope: VisualAuthorityScopeId) => void;
  onSeekFilmFrame?: (
    frame: number,
    pos: [number, number, number],
    target: [number, number, number],
    fov: number,
    targetSphere: ConnectedSphereId
  ) => void;
}

export const Cerebro39SystemModal: React.FC<Cerebro39SystemModalProps> = ({
  open,
  onClose,
  visualScope,
  onChangeVisualScope,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="cj-glass-card w-full max-w-lg rounded-2xl border border-white/15 p-5"
        data-testid="cerebro39-system-modal"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-sm uppercase tracking-wider text-[#F2F6F8]">
            Cerebro 39 · Visual Authority
          </h2>
          <button type="button" className="min-h-[40px] min-w-[40px]" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {VISUAL_AUTHORITY_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => onChangeVisualScope(scope)}
              className={`rounded-lg border px-3 py-2 text-left font-mono text-xs ${
                visualScope === scope
                  ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#FFF4D0]'
                  : 'border-white/15 text-[#C5CCD6]'
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
