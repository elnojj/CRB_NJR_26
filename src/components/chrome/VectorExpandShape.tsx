import React from 'react';
import './vectorExpand.css';

export type VectorExpandTone = 'gold' | 'ice' | 'alert' | 'neutral';

type Props = {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  tone?: VectorExpandTone;
  metric?: string;
  testId?: string;
  className?: string;
  title?: string;
};

/**
 * Minimal vector "ship" affordance — collapsed panel docking mark.
 * Tap expands the associated panel; tap again (or panel close) collapses.
 */
export function VectorExpandShape({
  label,
  expanded,
  onToggle,
  tone = 'gold',
  metric,
  testId,
  className = '',
  title,
}: Props) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-cta-id={testId}
      aria-expanded={expanded}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      title={title || (expanded ? `Collapse ${label}` : `Expand ${label}`)}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`vector-expand-shape is-${tone}${expanded ? ' is-expanded' : ''} ${className}`.trim()}
    >
      <svg
        className="vector-expand-glyph"
        viewBox="0 0 40 40"
        width="28"
        height="28"
        aria-hidden="true"
        focusable="false"
      >
        {/* Geometric ship / craft — pointed prow, twin thrusters */}
        <path
          className="vector-expand-hull"
          d="M20 4 L32 18 L26 18 L26 28 L14 28 L14 18 L8 18 Z"
        />
        <path className="vector-expand-fin" d="M14 28 L10 34 L16 30 Z" />
        <path className="vector-expand-fin" d="M26 28 L30 34 L24 30 Z" />
        <circle className="vector-expand-core" cx="20" cy="16" r="2.4" />
      </svg>
      <span className="vector-expand-label">{label}</span>
      {metric ? <span className="vector-expand-metric">{metric}</span> : null}
      <span className="vector-expand-chevron" aria-hidden="true">
        {expanded ? '▾' : '▸'}
      </span>
    </button>
  );
}
