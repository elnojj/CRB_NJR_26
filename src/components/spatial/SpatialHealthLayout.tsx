import React from 'react';

export type SpatialHealthMode = 'dashboard' | 'project';
export type SpatialHealthFilter = 'onTrack' | 'attention' | 'open';

export interface SpatialHealthLayoutProps {
  mode: SpatialHealthMode;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCloseProject: () => void;
  onCloseCalendar: () => void;
  onOpenFilteredProjects: (filter: SpatialHealthFilter, projectId?: string) => void;
  onOpenPerson: (personId: string) => void;
  onOpenRegisterRecord: (recordId: string) => void;
}

export const SpatialHealthLayout: React.FC<SpatialHealthLayoutProps> = ({
  mode,
  selectedProjectId,
  onSelectProject,
  onCloseProject,
  onCloseCalendar,
  onOpenFilteredProjects,
}) => (
  <div
    className="pointer-events-auto fixed inset-x-4 top-24 z-[35] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-black/55 p-4 backdrop-blur-xl"
    data-testid="spatial-health-layout"
    data-mode={mode}
  >
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-mono text-xs uppercase tracking-wider text-[#F2F6F8]">
        Spatial Health · {mode === 'project' ? selectedProjectId : 'Dashboard'}
      </h2>
      <div className="flex gap-1">
        <button
          type="button"
          className="min-h-[36px] rounded-lg border border-white/15 px-2 text-[11px]"
          onClick={() => onOpenFilteredProjects('onTrack')}
        >
          On track
        </button>
        <button
          type="button"
          className="min-h-[36px] rounded-lg border border-white/15 px-2 text-[11px]"
          onClick={() => onOpenFilteredProjects('attention')}
        >
          Attention
        </button>
        <button
          type="button"
          className="min-h-[36px] rounded-lg border border-white/15 px-2 text-[11px]"
          onClick={mode === 'project' ? onCloseProject : onCloseCalendar}
        >
          Close
        </button>
      </div>
    </div>
    <button
      type="button"
      className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-2 font-mono text-xs text-[#FFF4D0]"
      onClick={() => onSelectProject(selectedProjectId)}
    >
      Focus {selectedProjectId}
    </button>
  </div>
);
