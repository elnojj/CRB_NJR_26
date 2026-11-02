import { useEffect, useState } from 'react';
import { DiskArHealthDashboard } from './DiskArHealthDashboard';
import { AngledWallCalendar } from './AngledWallCalendar';
import { InteractiveProjectPlan } from './InteractiveProjectPlan';
import './spatialHealth.css';

type SpatialMode = 'dashboard' | 'project';

/**
 * Spatial Health shell:
 * - Desk AR floating cards = main portfolio health dashboard
 * - Angled recessed wall calendar on the right (agenda on phone)
 * - Interactive project plan when a project is focused
 * Modes enter/exit with a short cinematic veil so tools feel present, not bolted on.
 */
export function SpatialHealthLayout({
  mode,
  selectedProjectId,
  onSelectProject,
  onCloseProject,
  onCloseCalendar,
  onOpenFilteredProjects,
  onOpenPerson,
  onOpenRegisterRecord,
}: {
  mode: SpatialMode;
  selectedProjectId: string;
  onSelectProject?: (projectId: string) => void;
  onCloseProject?: () => void;
  onCloseCalendar?: () => void;
  onOpenFilteredProjects?: (filter: 'all' | 'onTrack' | 'attention', projectId?: string) => void;
  onOpenPerson?: (personId: string) => void;
  onOpenRegisterRecord?: (recordId: string) => void;
}) {
  const [mountedMode, setMountedMode] = useState<SpatialMode>(mode);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (mode === mountedMode) {
      setPhase('in');
      return;
    }
    setPhase('out');
    const t = window.setTimeout(() => {
      setMountedMode(mode);
      setPhase('in');
    }, 280);
    return () => window.clearTimeout(t);
  }, [mode, mountedMode]);

  return (
    <div
      className={`spatial-health-shell is-${phase}`}
      data-testid="spatial-health-shell"
      data-mode={mountedMode}
      data-phase={phase}
    >
      <div className="spatial-health-veil" aria-hidden="true" />
      {mountedMode === 'dashboard' && (
        <div className="spatial-health-layer is-dashboard" key="dashboard">
          <DiskArHealthDashboard
            onSelectProject={onSelectProject}
            onOpenFilteredProjects={onOpenFilteredProjects}
          />
          <AngledWallCalendar
            onClose={onCloseCalendar}
            onOpenProject={onSelectProject}
          />
          <button
            type="button"
            className="spatial-plan-launch"
            data-testid="spatial-plan-launch"
            onClick={() => onSelectProject?.(selectedProjectId)}
          >
            <span className="spatial-plan-launch-kicker">Project tools</span>
            <span className="spatial-plan-launch-title">Open plan</span>
          </button>
        </div>
      )}
      {mountedMode === 'project' && (
        <div className="spatial-health-layer is-project" key="project">
          <InteractiveProjectPlan
            projectId={selectedProjectId}
            onClose={onCloseProject}
            onSelectRelated={onSelectProject}
            onOpenPerson={onOpenPerson}
            onOpenTaskPanel={onOpenRegisterRecord}
          />
        </div>
      )}
    </div>
  );
}
