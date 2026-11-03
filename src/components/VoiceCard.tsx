/**
 * Cerebro chat widget — simple text chat with liquid-motion replies + attachments.
 * Keeps App wiring props; UI is intentionally minimal (no overlapping chrome).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudienceLevel } from './PanelsOverlay';
import {
  sendGeminiChatTurn,
  type ChatTurn,
  type GeminiChatModelId,
} from '../utils/googleAiStudioVoiceBridge';
import { ComputedGuiLayout } from '../gui/layoutEngine';
import './cerebroChat.css';

export type VoiceState =
  | 'Ready'
  | 'Connecting'
  | 'Listening'
  | 'Thinking'
  | 'Speaking'
  | 'Muted'
  | 'Reconnecting'
  | 'Disconnected'
  | 'Error'
  | 'Idle';

export type VoicePocket = 'tap-to-talk' | 'hands' | 'compose';
export type WidgetSnapEdge = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-right';

export interface TranscriptLine {
  id: string;
  speaker: '39' | 'Cerebro';
  text: string;
  timestamp: string;
  toolResult?: string;
}

export interface PendingComposeTask {
  summary: string;
  projectCode: string;
  attachmentName?: string;
}

export interface LiveFeedReceiptItem {
  id: string;
  sender: string;
  text: string;
  channel: string;
  timestamp: string;
  status: 'SAVED' | 'FAILED';
}

export interface UploadedAttachmentInfo {
  id: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
}

interface VoiceCardProps {
  voiceState: VoiceState;
  activePocket: VoicePocket;
  handsActive: boolean;
  ambienceMuted?: boolean;
  browserFullscreen?: boolean;
  tourState: {
    active: boolean;
    paused: boolean;
    step: number;
    total: number;
    secondsLeft: number;
    autoAdvance?: boolean;
  };
  audienceLevel: AudienceLevel;
  selectedProjectId?: string;
  transcripts: TranscriptLine[];
  liveCaption: string | null;
  pendingTaskProposal: PendingComposeTask | null;
  externalSnapEdge?: WidgetSnapEdge;
  openAgentModalTrigger?: number;
  onChangePocket: (pocket: VoicePocket) => void;
  onToggleHands: () => void;
  onToggleAmbience?: () => void;
  onOpenTeamChat?: () => void;
  onOpenOptics?: () => void;
  onToggleFullscreen?: () => void;
  onSimulateCommand: (rawInput: string) => void;
  onExecuteToolCall?: (
    toolName: string,
    parameters: Record<string, unknown>
  ) => Promise<string> | string;
  onSendCompose: (text: string, attachmentName?: string, receiptId?: string) => void;
  onCreateDirectTask?: (title: string, projectCode: string, attachmentName?: string) => void;
  onConfirmMakeTask: (confirm: boolean) => void;
  onChangeAudience: (level: AudienceLevel) => void;
  onOpenFullDownloadModal?: () => void;
  onNextTourStop?: () => void;
  onPrevTourStop?: () => void;
  onStopTour?: () => void;
  onAudioLevel?: (rms: number) => void;
  guiLayout?: ComputedGuiLayout;
  onVoiceDragDeltaChange?: (delta: { x: number; y: number }) => void;
  onVoiceExpandedChange?: (expanded: boolean) => void;
  onVoiceSheetExpandedChange?: (expanded: boolean) => void;
  contextualUpdateJson?: string;
}

type ChatBubble = {
  id: string;
  role: 'user' | 'cerebro';
  text: string;
  liquid?: boolean;
  attachmentName?: string;
};

function LiquidReply({ text }: { text: string }) {
  return (
    <p className="cerebro-chat__liquid" aria-live="polite">
      {text.split('').map((ch, i) => (
        <span key={`${i}-${ch}`} style={{ animationDelay: `${Math.min(i, 48) * 18}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </p>
  );
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  transcripts,
  liveCaption,
  selectedProjectId,
  onSimulateCommand,
  onSendCompose,
  onVoiceExpandedChange,
  onVoiceDragDeltaChange,
  onVoiceSheetExpandedChange,
  guiLayout,
}) => {
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [localTurns, setLocalTurns] = useState<ChatBubble[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);

  // Report collapsed chrome to layout — no floating sheet / drag delta.
  useEffect(() => {
    onVoiceExpandedChange?.(false);
    onVoiceDragDeltaChange?.({ x: 0, y: 0 });
    onVoiceSheetExpandedChange?.(false);
  }, [onVoiceExpandedChange, onVoiceDragDeltaChange, onVoiceSheetExpandedChange]);

  // Seed from existing transcripts once.
  useEffect(() => {
    if (localTurns.length > 0 || transcripts.length === 0) return;
    setLocalTurns(
      transcripts.slice(-8).map((t) => ({
        id: t.id,
        role: t.speaker === 'Cerebro' ? 'cerebro' : 'user',
        text: t.text,
        liquid: t.speaker === 'Cerebro',
      }))
    );
  }, [transcripts, localTurns.length]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [localTurns, busy, liveCaption]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if ((!text && !attachment) || busy) return;
    const attachmentName = attachment?.name;
    const userLine = attachmentName
      ? `${text || 'Attachment'}${text ? '' : ''} · ${attachmentName}`
      : text;
    const userBubble: ChatBubble = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: userLine,
      attachmentName,
    };
    setLocalTurns((prev) => [...prev, userBubble]);
    setDraft('');
    setAttachment(null);
    setBusy(true);
    setError(null);
    onSendCompose(text || attachmentName || '', attachmentName);
    onSimulateCommand(`__user_chat__:${text || attachmentName || ''}`);

    historyRef.current = [
      ...historyRef.current,
      { role: 'user' as const, text: userLine },
    ].slice(-12);

    try {
      const result = await sendGeminiChatTurn({
        model: 'gemini-3.8-flash' as GeminiChatModelId,
        history: historyRef.current,
        message: selectedProjectId
          ? `[project:${selectedProjectId}] ${userLine}`
          : userLine,
      });
      const clean =
        (result.reply || '').trim() || 'I heard you — how can I help next?';
      historyRef.current = [
        ...historyRef.current,
        { role: 'model' as const, text: clean },
      ].slice(-12);
      setLocalTurns((prev) => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          role: 'cerebro',
          text: clean,
          liquid: true,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chat reply failed';
      setError(msg);
      setLocalTurns((prev) => [
        ...prev,
        {
          id: `c-err-${Date.now()}`,
          role: 'cerebro',
          text: 'I could not reach the live model just now. Your message is saved — try again in a moment.',
          liquid: true,
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [attachment, busy, draft, onSendCompose, onSimulateCommand, selectedProjectId]);

  const layoutRect = guiLayout?.voiceRect;
  const shellStyle: React.CSSProperties = layoutRect
    ? {
        left: Math.max(12, layoutRect.x - 40),
        bottom: Math.max(
          16,
          (guiLayout?.viewportH ?? window.innerHeight) - layoutRect.y - layoutRect.h - 8
        ),
        width: Math.min(420, Math.max(300, layoutRect.w + 120)),
      }
    : {
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
        width: 'min(420px, calc(100vw - 24px))',
      };

  return (
    <section
      className="cerebro-chat"
      data-testid="voice-card"
      data-voice-capsule="c06"
      aria-label="Chat with Cerebro"
      style={shellStyle}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="cerebro-chat__head">
        <span className="cerebro-chat__orb" aria-hidden="true" />
        <div className="cerebro-chat__titles">
          <strong>Cerebro</strong>
          <span>{busy ? 'Writing…' : 'Chat'}</span>
        </div>
      </header>

      <div className="cerebro-chat__thread" ref={listRef} data-testid="cerebro-chat-thread">
        {localTurns.length === 0 && (
          <div className="cerebro-chat__empty">
            Message Cerebro below. Attach a file anytime.
          </div>
        )}
        {localTurns.map((turn) => (
          <div
            key={turn.id}
            className={`cerebro-chat__bubble cerebro-chat__bubble--${turn.role}`}
            data-testid={turn.role === 'cerebro' ? 'cerebro-chat-reply' : 'cerebro-chat-user'}
          >
            <span className="cerebro-chat__who">
              {turn.role === 'cerebro' ? 'Cerebro' : 'You'}
            </span>
            {turn.role === 'cerebro' && turn.liquid ? (
              <LiquidReply text={turn.text} />
            ) : (
              <p>{turn.text}</p>
            )}
            {turn.attachmentName && (
              <span className="cerebro-chat__attach-chip">Attached · {turn.attachmentName}</span>
            )}
          </div>
        ))}
        {busy && (
          <div className="cerebro-chat__bubble cerebro-chat__bubble--cerebro">
            <span className="cerebro-chat__who">Cerebro</span>
            <p className="cerebro-chat__liquid cerebro-chat__liquid--pulse">Thinking…</p>
          </div>
        )}
      </div>

      {error && (
        <p className="cerebro-chat__error" role="alert">
          {error}
        </p>
      )}

      <form
        className="cerebro-chat__composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          data-testid="cerebro-chat-file"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setAttachment(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="cerebro-chat__icon-btn"
          data-testid="cerebro-chat-attach"
          aria-label="Attach a file to Cerebro"
          onClick={() => fileRef.current?.click()}
        >
          Attach
        </button>
        <textarea
          ref={inputRef}
          className="cerebro-chat__input"
          data-testid="cerebro-chat-input"
          rows={1}
          enterKeyHint="send"
          placeholder="Message Cerebro…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="submit"
          className="cerebro-chat__send"
          data-testid="cerebro-chat-send"
          disabled={busy || (!draft.trim() && !attachment)}
          aria-label="Send message to Cerebro"
        >
          Send
        </button>
      </form>

      {attachment && (
        <div className="cerebro-chat__pending-attach">
          <span>{attachment.name}</span>
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => setAttachment(null)}
          >
            Remove
          </button>
        </div>
      )}
    </section>
  );
};

export default VoiceCard;
