import React, { useEffect, useMemo, useRef } from 'react';
import {
  AGENT_ACTION_IDS,
  NASA_ROSTER,
  agentCardView,
  type AgentActionId,
  type AgentCardView,
} from '../data/environmentRegistry';

interface NasaAgentCardsProps {
  /** Node id of the agent card to scroll to and ring, or null when the whole roster was requested. */
  highlightNodeId: string | null;
  onClose: () => void;
}

const ACTION_LABEL: Record<AgentActionId, string> = { talk: 'Talk', assign: 'Assign', run: 'Run' };

const STATE_TONE = {
  documented: '#7FD3A8',
  proposed: '#E3B567',
  disconnected: '#E08A8A',
  bound: '#7FD3A8',
  unassigned: '#9AA7BD',
} as const;

function StateRow({ testId, label, value, tone, muted }: { testId: string; label: string; value: string; tone: string; muted?: boolean }) {
  return (
    <div data-testid={testId} className="grid grid-cols-[104px_1fr] gap-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-[#7E8AA3]">{label}</dt>
      <dd className="flex items-start gap-1.5 text-[12.5px] leading-snug" style={{ color: muted ? '#8793AB' : '#DCE4F2' }}>
        <span aria-hidden className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} />
        <span>{value}</span>
      </dd>
    </div>
  );
}

function AgentCard({ view, highlighted }: { view: AgentCardView; highlighted: boolean }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlighted]);

  const proposed = view.label === 'PROPOSED';
  return (
    <article
      ref={ref}
      data-testid={`nasa-card-${view.nodeId}`}
      data-highlighted={highlighted ? 'true' : undefined}
      aria-label={`${view.name}, ${view.label.toLowerCase()} agent`}
      className="pointer-events-auto rounded-xl p-3"
      style={{
        background: 'rgba(10,13,20,0.82)',
        border: `1px solid ${highlighted ? '#1E5EFF' : proposed ? '#4A3F28' : '#2C3A52'}`,
        boxShadow: highlighted ? '0 0 0 2px rgba(30,94,255,0.35)' : undefined,
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold tracking-wide text-[#E8EEF8]">{view.name}</h3>
        <span
          data-testid={`nasa-card-${view.nodeId}-label`}
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em]"
          style={{
            color: proposed ? STATE_TONE.proposed : STATE_TONE.documented,
            border: `1px ${proposed ? 'dashed' : 'solid'} ${proposed ? STATE_TONE.proposed : STATE_TONE.documented}`,
          }}
        >
          {view.label}
        </span>
      </header>

      <dl className="mt-1 divide-y divide-[#1B2433]">
        <StateRow
          testId={`nasa-card-${view.nodeId}-documented`}
          label="Documented profile"
          value={view.documentedProfile.textEn}
          tone={view.documentedProfile.present ? STATE_TONE.documented : '#4C566A'}
          muted={!view.documentedProfile.present}
        />
        <StateRow
          testId={`nasa-card-${view.nodeId}-proposed`}
          label="Proposed role"
          value={view.proposedRole.textEn}
          tone={view.proposedRole.present ? STATE_TONE.proposed : '#4C566A'}
          muted={!view.proposedRole.present}
        />
        <StateRow
          testId={`nasa-card-${view.nodeId}-runtime`}
          label="Runtime connection"
          value={view.runtimeConnection.textEn}
          tone={STATE_TONE[view.runtimeConnection.state]}
        />
        <StateRow
          testId={`nasa-card-${view.nodeId}-task`}
          label="Task state"
          value={view.taskState.textEn}
          tone={STATE_TONE.unassigned}
        />
      </dl>

      <div className="mt-2 flex gap-2" role="group" aria-label={`${view.name} actions`}>
        {AGENT_ACTION_IDS.map((action) => {
          const enabled = view.actions[action];
          return (
            <button
              key={action}
              type="button"
              disabled={!enabled}
              aria-disabled={!enabled}
              data-testid={`nasa-card-${view.nodeId}-${action}`}
              data-enabled={enabled ? 'true' : 'false'}
              title={enabled ? undefined : view.actionsDisabledReasonEn ?? undefined}
              className="flex-1 rounded-lg px-2 py-2 text-[12px] font-medium tracking-wide"
              style={
                enabled
                  ? { background: '#1E5EFF', color: '#fff', border: '1px solid #1E5EFF', cursor: 'pointer' }
                  : {
                      background:
                        'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 6px, rgba(255,255,255,0.07) 6px 12px)',
                      color: '#5E6A82',
                      border: '1px dashed #3A4458',
                      cursor: 'not-allowed',
                      textDecoration: 'line-through',
                      textDecorationColor: '#3A4458',
                    }
              }
            >
              {ACTION_LABEL[action]}
            </button>
          );
        })}
      </div>
      {view.actionsDisabledReasonEn ? (
        <p data-testid={`nasa-card-${view.nodeId}-reason`} className="mt-1.5 text-[10.5px] leading-snug text-[#7E8AA3]">
          {view.actionsDisabledReasonEn}
        </p>
      ) : null}
    </article>
  );
}

/**
 * NASA roster for CEREBRO HQ. The outer frames are pointer-transparent so orbit and node poking keep
 * working around the cards; only the header and the cards themselves take pointer events.
 */
export function NasaAgentCards({ highlightNodeId, onClose }: NasaAgentCardsProps) {
  const views = useMemo(() => NASA_ROSTER.map((agent) => agentCardView(agent, 'env_hq')), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const documented = views.filter((v) => v.label === 'DOCUMENTED').length;
  const proposed = views.length - documented;

  return (
    <section
      data-testid="nasa-roster"
      role="region"
      aria-label="NASA agent roster"
      className="pointer-events-none fixed right-3 z-[57] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2 overflow-y-auto overscroll-contain"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 64px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 176px)',
      }}
    >
      <div
        data-testid="nasa-roster-header"
        className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl p-3"
        style={{ background: 'rgba(10,13,20,0.9)', border: '1px solid #2C3A52' }}
      >
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#E8EEF8]">NASA · CEREBRO HQ</h2>
          <p className="mt-1 text-[11.5px] leading-snug text-[#9AA7BD]">
            {documented} documented, {proposed} proposed. The source lists {views.length} names, not 12 agents. No agent has a
            verified runtime connection.
          </p>
        </div>
        <button
          type="button"
          data-testid="nasa-roster-close"
          aria-label="Close NASA roster"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] text-[#DCE4F2]"
          style={{ border: '1px solid #2C3A52', background: 'rgba(255,255,255,0.04)' }}
        >
          Close
        </button>
      </div>
      {views.map((view) => (
        <AgentCard key={view.associationId} view={view} highlighted={view.nodeId === highlightNodeId} />
      ))}
    </section>
  );
}
