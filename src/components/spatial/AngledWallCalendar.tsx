import { useMemo, useState } from 'react';
import './spatialHealth.css';
import { PROJECTS_DATA, TEAM_CHECKPOINTS } from '../../data/sourceData';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function AngledWallCalendar({
  onClose,
}: {
  onClose?: () => void;
}) {
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleString('en-GB', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();

  const eventDays = useMemo(() => {
    const set = new Set<number>();
    // Seed a few register-linked days from checkpoints / deadlines when parseable.
    for (const p of PROJECTS_DATA) {
      const m = p.nextDeadline.match(/(\d{1,2})\s*(Oct|Nov|Dec|Jan|Feb|Mar)/i);
      if (m && month === now.getMonth()) set.add(Number(m[1]));
    }
    for (const c of TEAM_CHECKPOINTS.slice(0, 6)) {
      const m = c.id.match(/(\d+)/);
      if (m) set.add(Math.min(daysInMonth, Math.max(1, Number(m[1]) % daysInMonth || now.getDate())));
    }
    if (set.size === 0) {
      set.add(now.getDate());
      set.add(Math.min(daysInMonth, now.getDate() + 3));
      set.add(Math.min(daysInMonth, now.getDate() + 7));
    }
    return set;
  }, [daysInMonth, month, now]);

  const cells: Array<number | null> = [
    ...Array.from({ length: startDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="wall-cal-stage" data-testid="angled-wall-calendar" aria-label="Angled wall calendar">
      <button type="button" className="wall-cal-done" onClick={onClose}>
        Done ✓
      </button>
      <div className="wall-cal-recess">
        <div className="wall-cal-bevel" aria-hidden="true" />
        <div className="wall-cal-face">
          <div className="wall-cal-header">
            <div className="wall-cal-month">{monthLabel}</div>
            <div className="wall-cal-year">{year}</div>
          </div>
          <div className="wall-cal-nav">
            <button
              type="button"
              className="wall-cal-nav-btn"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              ‹
            </button>
            <button
              type="button"
              className="wall-cal-nav-btn"
              aria-label="Next month"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>
          <div className="wall-cal-grid">
            {DOW.map((d, i) => (
              <div key={`${d}-${i}`} className="wall-cal-dow">
                {d}
              </div>
            ))}
            {cells.map((day, i) =>
              day === null ? (
                <div key={`e-${i}`} />
              ) : (
                <div
                  key={day}
                  className={`wall-cal-day${day === now.getDate() && month === now.getMonth() && year === now.getFullYear() ? ' is-today' : ''}${eventDays.has(day) ? ' has-event' : ''}`}
                >
                  {day}
                </div>
              )
            )}
          </div>
          <p className="wall-cal-footnote">
            Recessed wall portal · gold marks = register deadlines · {TEAM_CHECKPOINTS.length} checkpoints in view
          </p>
        </div>
      </div>
    </div>
  );
}
