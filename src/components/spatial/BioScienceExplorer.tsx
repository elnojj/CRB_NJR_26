import React from 'react';

export interface BioScienceExplorerProps {
  open: boolean;
  onClose: () => void;
}

export const BioScienceExplorer: React.FC<BioScienceExplorerProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/75 p-4">
      <div className="cj-glass-card w-full max-w-md rounded-2xl p-5" data-testid="bio-science-explorer">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-sm text-[#F2F6F8]">BioScience Explorer</h2>
          <button type="button" className="min-h-[40px] min-w-[40px]" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="font-mono text-xs text-[#C5CCD6]">
          Molecular explorer overlay mounted on the shared spatial shell.
        </p>
      </div>
    </div>
  );
};
