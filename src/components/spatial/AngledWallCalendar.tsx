import { useMemo, useState } from 'react';
import './spatialHealth.css';
import { PROJECTS_DATA, TEAM_CHECKPOINTS } from '../../data/sourceData';
import { VectorExpandShape } from '../chrome/VectorExpandShape';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type CalEvent = {
  day: number;
  label: string;
  projectId?: string;
  owner: string;
  source: string;
};

export function AngledWallCalendar({
  onClose,
  onOpenProject,
}: {
  onClose?: () => void;
  onOpenProject?: (projectId: string) => void;
}) {
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [mode, setMode] = useState<'month' | 'agenda'>('agenda');
  // Agenda / calendar starts collapsed behind its vector ship.
  const [expanded, setExpanded] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleString('en-GB', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();

  const events = useMemo(() => {
    const list: CalEvent[] = [];
    for (const p of PROJECTS_DATA) {
      const m = p.nextDeadline.match(/(\d{1,2})\s*(Oct|Nov|Dec|Jan|Feb|Mar)/i);
      if (m) {
        const mon = m[2].toLowerCase();
        const monIdx = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(mon);
        if (monIdx === month) {
          list.push({
            day: Number(m[1]),
            label: `${p.code} · ${p.nextDeadline}`,
            projectId: p.id,
            owner: p.owner,
            source: `PROJECTS_DATA.nextDeadline · ${p.lastActivity}`,
          });
        }
      }
    }
    for (const c of TEAM_CHECKPOINTS.slice(0, 6)) {
      const day = Math.min(daysInMonth, Math.max(1, (Number(c.id.replace(/\D/g, '').slice(-2)) || now.getDate()) % daysInMonth || now.getDate()));
      list.push({
        day,
        label: c.title || c.id,
        owner: 'Checkpoint register',
        source: `TEAM_CHECKPOINTS · ${c.id}`,
      });
    }
    if (list.length === 0) {
      list.push({
        day: now.getDate(),
        label: 'No register deadlines parsed for this month',
        owner: '—',
        source: 'Empty truthful state',
      });
    }
    return list;
  }, [daysInMonth, month, now]);

  const eventDays = useMemo(() => new Set(events.map((e) => e.day)), [events]);
  const dayEvents = events.filter((e) => e.day === selectedDay);

  const cells: Array<number | null> = [
    ...Array.from({ length: startDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className={`wall-cal-stage${expanded ? ' is-expanded' : ' is-collapsed'}`}
      data-testid="angled-wall-calendar"
      aria-label="Angled wall calendar"
    >
      <VectorExpandShape
        label={monthLabel}
        metric={String(year).slice(2)}
        tone="ice"
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        testId="vector-expand-calendar"
        className="wall-cal-vector"
      />
      {expanded ? (
        <>
      <button
        type="button"
        className="wall-cal-done"
        onClick={() => {
          setExpanded(false);
          onClose?.();
        }}
      >
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
            <div className="wall-cal-mode">
              <button
                type="button"
                className={`wall-cal-mode-btn${mode === 'agenda' ? ' is-active' : ''}`}
                onClick={() => setMode('agenda')}
              >
                Agenda
              </button>
              <button
                type="button"
                className={`wall-cal-mode-btn${mode === 'month' ? ' is-active' : ''}`}
                onClick={() => setMode('month')}
              >
                Month
              </button>
            </div>
            <button
              type="button"
              className="wall-cal-nav-btn"
              aria-label="Next month"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>

          {mode === 'month' && (
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
                  <button
                    key={day}
                    type="button"
                    className={`wall-cal-day${day === now.getDate() && month === now.getMonth() && year === now.getFullYear() ? ' is-today' : ''}${eventDays.has(day) ? ' has-event' : ''}${selectedDay === day ? ' is-selected' : ''}`}
                    onClick={() => {
                      setSelectedDay(day);
                      setMode('agenda');
                    }}
                  >
                    {day}
                  </button>
                )
              )}
            </div>
          )}

          <div className="wall-cal-agenda" data-testid="wall-cal-agenda">
            <div className="wall-cal-agenda-head">
              {selectedDay ? `${monthLabel} ${selectedDay}` : 'Select a day'}
            </div>
            {dayEvents.length === 0 ? (
              <p className="wall-cal-empty">No milestones recorded for this date.</p>
            ) : (
              dayEvents.map((ev, idx) => (
                <button
                  key={`${ev.day}-${idx}-${ev.label}`}
                  type="button"
                  className="wall-cal-event"
                  onClick={() => ev.projectId && onOpenProject?.(ev.projectId)}
                  disabled={!ev.projectId}
                >
                  <div className="wall-cal-event-title" dir="auto">
                    {ev.label}
                  </div>
                  <div className="wall-cal-event-meta">{ev.owner}</div>
                  <div className="wall-cal-event-source">{ev.source}</div>
                </button>
              ))
            )}
          </div>

          <p className="wall-cal-footnote">
            Recessed wall portal · gold marks = register deadlines · {TEAM_CHECKPOINTS.length} checkpoints in view
          </p>
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}
