/**
 * Cerebro floating entry widget — three distinct controls:
 * Call = voice · Hands = camera · Chat = liquid-motion text chat.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudienceLevel } from './PanelsOverlay';
import {
  GoogleAiStudioVoiceBridge,
  sendGeminiChatTurn,
  type ChatTurn,
  type GeminiChatModelId,
  type VoiceBridgeState,
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

function IconCall({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 3.8c.4-.4 1-.5 1.5-.3l2.2.9c.5.2.8.7.7 1.2l-.4 2.3a1.2 1.2 0 0 1-.7.9l-1.3.5a9.5 9.5 0 0 0 4.7 4.7l.5-1.3c.2-.4.5-.6.9-.7l2.3-.4c.5-.1 1 .2 1.2.7l.9 2.2c.2.5.1 1.1-.3 1.5l-1.4 1.4c-.4.4-1 .5-1.5.4C11.3 17.2 6.8 12.7 5.2 7.2c-.1-.5 0-1.1.4-1.5L7.5 3.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.22 : 0}
      />
    </svg>
  );
}

function IconHands({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.2 11.2V6.4a1.2 1.2 0 0 1 2.4 0v4.2M10.6 10.2V5.2a1.2 1.2 0 0 1 2.4 0v5.4M13 10.5V6.8a1.2 1.2 0 1 1 2.4 0v5.1M15.4 12V8.6a1.2 1.2 0 1 1 2.4 0v5.8c0 3.1-2.2 5.4-5.4 5.4h-.6c-2.4 0-4.2-1.1-5.3-2.9L5.2 13.4a1.35 1.35 0 0 1 2.2-1.6l.8 1.1"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.92}
      />
    </svg>
  );
}

function IconChat({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.5 6.5h13a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H11l-3.5 2.6V16.5H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.18 : 0}
      />
      <path
        d="M8 10.2h8M8 13h5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voiceState,
  handsActive,
  selectedProjectId,
  openAgentModalTrigger,
  onToggleHands,
  onSimulateCommand,
  onExecuteToolCall,
  onSendCompose,
  onStopTour,
  onAudioLevel,
  guiLayout,
  onVoiceExpandedChange,
  onVoiceDragDeltaChange,
  onVoiceSheetExpandedChange,
  contextualUpdateJson,
  tourState,
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [localTurns, setLocalTurns] = useState<ChatBubble[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<VoiceBridgeState>('Ready');
  const [bridgeDetail, setBridgeDetail] = useState('Ready');

  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);
  const bridgeRef = useRef<GoogleAiStudioVoiceBridge | null>(null);
  const onAudioLevelRef = useRef(onAudioLevel);
  const bridgeRmsRef = useRef(0);

  useEffect(() => {
    onAudioLevelRef.current = onAudioLevel;
  }, [onAudioLevel]);

  useEffect(() => {
    onVoiceExpandedChange?.(false);
    onVoiceDragDeltaChange?.({ x: 0, y: 0 });
  }, [onVoiceExpandedChange, onVoiceDragDeltaChange]);

  useEffect(() => {
    onVoiceSheetExpandedChange?.(chatOpen);
  }, [chatOpen, onVoiceSheetExpandedChange]);

  useEffect(() => {
    const bridge = new GoogleAiStudioVoiceBridge({
      onStatusChange: (status, detail) => {
        setBridgeStatus(status);
        if (detail) setBridgeDetail(detail);
      },
      onTranscript: (role, text) => {
        if (role === 'user') {
          const isLive = bridgeRef.current?.isLiveWebSocketOpen?.() ?? false;
          onSimulateCommand(isLive ? `__user_voice_live__:${text}` : `__user_voice__:${text}`);
        } else {
          onSimulateCommand(`__agent_reply__:${text}`);
        }
      },
      onClientToolCall: async (toolName, parameters) => {
        if (onExecuteToolCall) {
          return await onExecuteToolCall(toolName, parameters || {});
        }
        onSimulateCommand(toolName);
        return `Executed ${toolName}`;
      },
      onAudioLevel: (rms) => {
        bridgeRmsRef.current = rms;
        onAudioLevelRef.current?.(rms);
      },
    });
    bridgeRef.current = bridge;
    return () => {
      bridge.disconnect();
      bridgeRef.current = null;
    };
  }, []);

  useEffect(() => {
    bridgeRef.current?.updateCallbacks({
      onStatusChange: (status, detail) => {
        setBridgeStatus(status);
        if (detail) setBridgeDetail(detail);
      },
      onTranscript: (role, text) => {
        if (role === 'user') {
          const isLive = bridgeRef.current?.isLiveWebSocketOpen?.() ?? false;
          onSimulateCommand(isLive ? `__user_voice_live__:${text}` : `__user_voice__:${text}`);
        } else {
          onSimulateCommand(`__agent_reply__:${text}`);
        }
      },
      onClientToolCall: async (toolName, parameters) => {
        if (onExecuteToolCall) {
          return await onExecuteToolCall(toolName, parameters || {});
        }
        onSimulateCommand(toolName);
        return `Executed ${toolName}`;
      },
      onAudioLevel: (rms) => {
        bridgeRmsRef.current = rms;
        onAudioLevelRef.current?.(rms);
      },
    });
  }, [onSimulateCommand, onExecuteToolCall]);

  useEffect(() => {
    if (contextualUpdateJson && bridgeRef.current?.isLiveWebSocketOpen?.()) {
      bridgeRef.current.sendContextualUpdate(contextualUpdateJson);
    }
  }, [contextualUpdateJson]);

  const voiceLive =
    bridgeStatus === 'Listening' ||
    bridgeStatus === 'Speaking' ||
    bridgeStatus === 'Thinking' ||
    bridgeStatus === 'Connecting' ||
    bridgeStatus === 'Muted' ||
    voiceState === 'Listening' ||
    voiceState === 'Speaking';

  const handleCall = useCallback(async () => {
    if (voiceLive) {
      bridgeRef.current?.stopOutputAudioImmediately();
      bridgeRef.current?.disconnect();
      if (tourState.active) {
        onStopTour?.();
        onSimulateCommand('stop tour');
      }
      return;
    }
    await bridgeRef.current?.connect();
  }, [voiceLive, tourState.active, onStopTour, onSimulateCommand]);

  useEffect(() => {
    if (openAgentModalTrigger && openAgentModalTrigger > 0) {
      void handleCall();
    }
  }, [openAgentModalTrigger, handleCall]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [localTurns, busy, chatOpen]);

  useEffect(() => {
    if (chatOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [chatOpen]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if ((!text && !attachment) || busy) return;
    const attachmentName = attachment?.name;
    const userLine = attachmentName
      ? `${text || 'Attachment'} · ${attachmentName}`
      : text;
    setLocalTurns((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        text: userLine,
        attachmentName,
      },
    ]);
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
      setError(null);
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
      const raw = err instanceof Error ? err.message : 'Chat reply failed';
      const msg =
        /NOT_FOUND|could not be found/i.test(raw)
          ? 'Chat service is reconnecting — try Send again.'
          : raw.slice(0, 160);
      setError(msg);
      setLocalTurns((prev) => [
        ...prev,
        {
          id: `c-err-${Date.now()}`,
          role: 'cerebro',
          text: 'I saved your message. Try Send again in a moment.',
          liquid: true,
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [attachment, busy, draft, onSendCompose, onSimulateCommand, selectedProjectId]);

  // Always pin to bottom-center so Call / Hands / Chat stay on one screen
  // (guiLayout voiceRect previously floated the sheet mid-viewport like a second page).
  void guiLayout;
  const dockStyle: React.CSSProperties = {
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
    width: 'min(360px, calc(100vw - 24px))',
  };

  const callLabel = voiceLive ? 'End call' : 'Call';
  const handsLabel = handsActive ? 'Hands on' : 'Hands';
  const chatLabel = chatOpen ? 'Close chat' : 'Chat';
  const statusLine = voiceLive
    ? bridgeDetail || bridgeStatus
    : handsActive
      ? 'Hands on · camera live · tap again to stop'
      : chatOpen
        ? 'Chat with Cerebro'
        : 'Call · Hands · Chat';

  return (
    <div
      className="cerebro-dock"
      data-testid="voice-card"
      data-voice-capsule="c06"
      style={dockStyle}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {chatOpen && (
        <section className="cerebro-chat cerebro-chat--docked" aria-label="Chat with Cerebro">
          <header className="cerebro-chat__head">
            <span className="cerebro-chat__orb" aria-hidden="true" />
            <div className="cerebro-chat__titles">
              <strong>Cerebro</strong>
              <span>{busy ? 'Writing…' : 'Chat'}</span>
            </div>
            <button
              type="button"
              className="cerebro-chat__icon-btn"
              aria-label="Close chat"
              data-testid="cerebro-chat-close"
              onClick={() => setChatOpen(false)}
            >
              Close
            </button>
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
                data-testid={
                  turn.role === 'cerebro' ? 'cerebro-chat-reply' : 'cerebro-chat-user'
                }
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
                  <span className="cerebro-chat__attach-chip">
                    Attached · {turn.attachmentName}
                  </span>
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
      )}

      <div
        className="cerebro-dock__capsule"
        role="toolbar"
        aria-label="Cerebro controls: Call, Hands, Chat"
      >
        <p className="cerebro-dock__status" aria-live="polite">
          {statusLine}
        </p>
        <div className="cerebro-dock__actions">
          <button
            type="button"
            className="cerebro-dock__btn"
            data-testid="cerebro-btn-call"
            data-active={voiceLive ? 'true' : 'false'}
            aria-pressed={voiceLive}
            aria-label={callLabel}
            onClick={() => void handleCall()}
          >
            <IconCall active={voiceLive} />
            <span>{callLabel}</span>
          </button>
          <button
            type="button"
            className="cerebro-dock__btn"
            data-testid="cerebro-btn-hands"
            data-active={handsActive ? 'true' : 'false'}
            aria-pressed={handsActive}
            aria-label={handsActive ? 'Turn off hand camera' : 'Turn on hand camera'}
            onClick={onToggleHands}
          >
            <IconHands active={handsActive} />
            <span>{handsLabel}</span>
          </button>
          <button
            type="button"
            className="cerebro-dock__btn"
            data-testid="cerebro-btn-chat"
            data-active={chatOpen ? 'true' : 'false'}
            aria-pressed={chatOpen}
            aria-label={chatLabel}
            onClick={() => setChatOpen((v) => !v)}
          >
            <IconChat active={chatOpen} />
            <span>{chatLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCard;
