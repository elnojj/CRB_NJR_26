import React from 'react';

export interface ProjectHealthStripProps {
  progress: string | 'unknown';
  blockers: string | 'unknown';
  due: string | 'unknown';
  onExpand: () => void;
}

/**
 * Bottom-always-visible project health strip (Blueprint V2.0).
 * Text plus color — never invent progress when the source is missing.
 */
export const ProjectHealthStrip: React.FC<ProjectHealthStripProps> = ({
  progress,
  blockers,
  due,
  onExpand,
}) => (
  <footer className="health-strip" aria-label="Project health">
    <span className="health-strip-item health-progress">
      <span aria-hidden="true">●</span> Progress: {progress}
    </span>
    <span className="health-strip-item health-blockers">
      <span aria-hidden="true">▲</span> Blockers: {blockers}
    </span>
    <span className="health-strip-item health-due">
      <span aria-hidden="true">◇</span> Due: {due}
    </span>
    <button type="button" className="widget-btn" onClick={onExpand}>
      Project Health
    </button>
  </footer>
);
