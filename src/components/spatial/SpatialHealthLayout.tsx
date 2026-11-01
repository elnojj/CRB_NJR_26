import { DiskArHealthDashboard } from './DiskArHealthDashboard';
import { AngledWallCalendar } from './AngledWallCalendar';
import { InteractiveProjectPlan } from './InteractiveProjectPlan';
import './spatialHealth.css';

/**
 * Spatial Health shell:
 * - Desk AR floating cards = main portfolio health dashboard
 * - Angled recessed wall calendar on the right (agenda on phone)
 * - Interactive project plan when a project is focused
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
  mode: 'dashboard' | 'project';
  selectedProjectId: string;
  onSelectProject?: (projectId: string) => void;
  onCloseProject?: () => void;
  onCloseCalendar?: () => void;
  onOpenFilteredProjects?: (filter: 'all' | 'onTrack' | 'attention', projectId?: string) => void;
  onOpenPerson?: (personId: string) => void;
  onOpenRegisterRecord?: (recordId: string) => void;
}) {
  return (
    <div
      className="spatial-health-shell"
      data-testid="spatial-health-shell"
      data-mode={mode}
    >
      {mode === 'dashboard' && (
        <>
          <DiskArHealthDashboard
            onSelectProject={onSelectProject}
            onOpenFilteredProjects={onOpenFilteredProjects}
          />
          <AngledWallCalendar
            onClose={onCloseCalendar}
            onOpenProject={onSelectProject}
          />
        </>
      )}
      {mode === 'project' && (
        <InteractiveProjectPlan
          projectId={selectedProjectId}
          onClose={onCloseProject}
          onSelectRelated={onSelectProject}
          onOpenPerson={onOpenPerson}
          onOpenTaskPanel={onOpenRegisterRecord}
        />
      )}
    </div>
  );
}
