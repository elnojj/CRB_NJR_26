import React from 'react';

export type ConnectionAxis =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export type InputAxis = 'mic-off' | 'listening' | 'tentative' | 'final';

export type OutputAxis = 'silent' | 'speaking' | 'interrupted';

export type ExecutionAxis =
  | 'idle'
  | 'validating'
  | 'waiting'
  | 'running'
  | 'failed';

export type PersistenceAxis =
  | 'draft'
  | 'submitting'
  | 'applied'
  | 'conflict'
  | 'not-applicable';

interface PersistentCerebroWidgetProps {
  connection: ConnectionAxis;
  inputState: InputAxis;
  outputState: OutputAxis;
  execution: ExecutionAxis;
  persistence: PersistenceAxis;
  actionLine: string;
  transcriptPreview: string;
  transcriptProvisional?: boolean;
  readinessLabel?: string;
  onMicToggle: () => void;
  onStop: () => void;
  onFullTranscript: () => void;
}

/**
 * Screen-stable center overlay — Blueprint V2.0 five-axis contract.
 * State must remain readable without sound, color, or animation.
 */
export const PersistentCerebroWidget: React.FC<PersistentCerebroWidgetProps> = ({
  connection,
  inputState,
  outputState,
  execution,
  persistence,
  actionLine,
  transcriptPreview,
  transcriptProvisional = true,
  readinessLabel = 'Ready',
  onMicToggle,
  onStop,
  onFullTranscript,
}) => (
  <section className="persistent-widget" aria-label="Cerebro assistant state">
    <div className="widget-head">
      <span className="widget-title">
        CEREBRO / {connection === 'connected' ? 'Connected' : 'Offline'}
      </span>
      <span className="widget-connection">
        connection: {connection} · readiness: {readinessLabel}
      </span>
      <span className="widget-action-line">
        {actionLine || 'No active operation'}
      </span>
    </div>

    <div className="widget-controls">
      <button
        type="button"
        className="widget-btn"
        aria-pressed={inputState === 'listening'}
        onClick={onMicToggle}
      >
        Mic · {inputState}
      </button>
      <button type="button" className="widget-btn" onClick={onStop}>
        Stop action
      </button>
      <button type="button" className="widget-btn" onClick={onFullTranscript}>
        Full transcript
      </button>
    </div>

    {transcriptPreview ? (
      <div
        className="widget-transcript"
        aria-live="polite"
        data-provisional={transcriptProvisional}
      >
        LIVE TRANSCRIPT · {transcriptPreview}
        {transcriptProvisional ? ' (provisional)' : ''}
      </div>
    ) : null}

    <div className="widget-state-grid" aria-label="Widget state axes">
      <span>connection: {connection}</span>
      <span>input: {inputState}</span>
      <span>output: {outputState}</span>
      <span>execution: {execution}</span>
      <span>persistence: {persistence}</span>
    </div>
  </section>
);
