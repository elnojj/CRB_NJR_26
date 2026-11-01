import { DiskArHealthDashboard } from './DiskArHealthDashboard';
import { AngledWallCalendar } from './AngledWallCalendar';
import { ProjectNodeChipsChart } from './ProjectNodeChipsChart';
import './spatialHealth.css';

/**
 * Spatial Health shell:
 * - Desk AR floating cards = main portfolio health dashboard
 * - Angled recessed wall calendar on the right
 * - Node-chip relationship chart when a project is focused
 */
export function SpatialHealthLayout({
  mode,
  selectedProjectId,
  onSelectProject,
  onCloseProject,
  onCloseCalendar,
}: {
  mode: 'dashboard' | 'project';
  selectedProjectId: string;
  onSelectProject?: (projectId: string) => void;
  onCloseProject?: () => void;
  onCloseCalendar?: () => void;
}) {
  return (
    <div className="spatial-health-shell" data-testid="spatial-health-shell">
      {mode === 'dashboard' && (
        <>
          <DiskArHealthDashboard onSelectProject={onSelectProject} />
          <AngledWallCalendar onClose={onCloseCalendar} />
        </>
      )}
      {mode === 'project' && (
        <ProjectNodeChipsChart
          projectId={selectedProjectId}
          onClose={onCloseProject}
          onSelectRelated={onSelectProject}
        />
      )}
    </div>
  );
}
