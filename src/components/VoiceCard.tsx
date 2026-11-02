/**
 * C06 Voice capsule + C07 listening rings — design-system component-registry.
 * Idle: centered ~.88H, 220–256 × 48–56, ≥44px targets.
 * Rings: #9AFFE0 / #78D3B2, level scale 1.00–1.04 (attack 80ms, release 240ms).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudienceLevel } from './PanelsOverlay';
import {
  CEREBRO_VOICE_PROVIDER,
  CRO_CDE_GOOGLE_AGENT_NAME,
} from '../data/croCdeGoogleAgentManifest';
import {
  GoogleAiStudioVoiceBridge,
  googleVoiceToolCount,
  type VoiceBridgeState,
} from '../utils/googleAiStudioVoiceBridge';
import { ComputedGuiLayout } from '../gui/layoutEngine';

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

/** C07: scale = 1 + 0.04 * level; attack 80ms / release 240ms */
function voiceRingScale(level: number, _rising: boolean): number {
  const clamped = Math.max(0, Math.min(1, level));
  return 1 + 0.04 * clamped;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voiceState,
  tourState,
  transcripts,
  liveCaption,
  openAgentModalTrigger,
  onSimulateCommand,
  onExecuteToolCall,
  onStopTour,
  onAudioLevel,
  guiLayout,
  onVoiceExpandedChange,
  onVoiceDragDeltaChange,
  onVoiceSheetExpandedChange,
  contextualUpdateJson,
}) => {
  const [ringLevel, setRingLevel] = useState(0);
  const bridgeRmsRef = useRef(0);
  const onAudioLevelRef = useRef(onAudioLevel);
  const ringLevelRef = useRef(0);
  const lastRingTs = useRef(performance.now());

  useEffect(() => {
    onAudioLevelRef.current = onAudioLevel;
  }, [onAudioLevel]);

  // Capsule is never an expanded card — report collapsed to layout.
  useEffect(() => {
    onVoiceExpandedChange?.(false);
    onVoiceDragDeltaChange?.({ x: 0, y: 0 });
  }, [onVoiceExpandedChange, onVoiceDragDeltaChange]);

  const [bridgeStatus, setBridgeStatus] = useState<VoiceBridgeState>('Ready');
  const [bridgeDetail, setBridgeDetail] = useState(
    `Ready · ${CRO_CDE_GOOGLE_AGENT_NAME} · ${CEREBRO_VOICE_PROVIDER}`
  );
  const [muted, setMuted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const expandTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bridgeRef = useRef<GoogleAiStudioVoiceBridge | null>(null);
  const offline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  useEffect(() => {
    onVoiceSheetExpandedChange?.(sheetOpen);
  }, [sheetOpen, onVoiceSheetExpandedChange]);

  useEffect(() => {
    // Primary voice path: Google AI Studio / Gemini. ElevenLabs ConvAI is not mounted.
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

  // RMS envelope + C07 ring level with attack/release
  useEffect(() => {
    const activeSpeech =
      bridgeStatus === 'Speaking' ||
      voiceState === 'Speaking' ||
      bridgeStatus === 'Listening' ||
      voiceState === 'Listening';
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.max(1, now - lastRingTs.current);
      lastRingTs.current = now;
      let target = 0;
      if (activeSpeech && !muted) {
        const t = now * 0.006;
        const isSpeakingNow = bridgeStatus === 'Speaking' || voiceState === 'Speaking';
        const synth = isSpeakingNow
          ? 0.28 + 0.24 * Math.abs(Math.sin(t * 2.3) * Math.cos(t * 1.1))
          : 0.06 + 0.05 * Math.abs(Math.sin(t * 1.4));
        target = Math.min(1, Math.max(bridgeRmsRef.current * 2.5, synth));
      }
      onAudioLevelRef.current?.(target);

      const tau = target > ringLevelRef.current ? 80 : 240;
      const alpha = 1 - Math.exp(-dt / tau);
      const next = ringLevelRef.current + (target - ringLevelRef.current) * alpha;
      ringLevelRef.current = next;
      setRingLevel(next);
    }, 32);
    return () => window.clearInterval(id);
  }, [bridgeStatus, voiceState, muted]);

  const handleConnect = useCallback(async () => {
    setMuted(false);
    await bridgeRef.current?.connect();
  }, []);

  useEffect(() => {
    if (openAgentModalTrigger && openAgentModalTrigger > 0) {
      void handleConnect();
    }
  }, [openAgentModalTrigger, handleConnect]);

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    bridgeRef.current?.setMuted(next);
    if (next) {
      bridgeRef.current?.stopOutputAudioImmediately();
    }
  };

  const handleInstantStop = () => {
    bridgeRef.current?.stopOutputAudioImmediately();
    bridgeRef.current?.disconnect();
    setMuted(false);
    if (tourState.active) {
      onStopTour?.();
      onSimulateCommand('stop tour');
    }
    onSimulateCommand('camera(stop)');
  };

  const closeSheet = () => {
    setSheetOpen(false);
    window.setTimeout(() => expandTriggerRef.current?.focus(), 0);
  };

  const live =
    bridgeStatus === 'Listening' ||
    bridgeStatus === 'Speaking' ||
    bridgeStatus === 'Connecting' ||
    voiceState === 'Listening' ||
    voiceState === 'Speaking' ||
    voiceState === 'Connecting';

  const statusLabel = offline
    ? 'Offline'
    : muted
      ? 'Muted'
      : bridgeStatus === 'Listening' || voiceState === 'Listening'
        ? 'Listening'
        : bridgeStatus === 'Speaking' || voiceState === 'Speaking'
          ? 'Speaking'
          : bridgeStatus === 'Connecting' || voiceState === 'Connecting'
            ? 'Connecting'
            : bridgeStatus === 'Error'
              ? 'Error'
              : bridgeStatus === 'Disconnected'
                ? 'Disconnected'
                : 'Talk to Cerebro';

  const ringScale = voiceRingScale(ringLevel, true);
  const showRings =
    !muted &&
    (bridgeStatus === 'Listening' ||
      bridgeStatus === 'Speaking' ||
      voiceState === 'Listening' ||
      voiceState === 'Speaking');

  const layoutRect = guiLayout?.voiceRect;
  const capsuleStyle: React.CSSProperties = layoutRect
    ? {
        position: 'fixed',
        left: layoutRect.x,
        top: layoutRect.y,
        width: Math.min(256, Math.max(220, layoutRect.w)),
        height: Math.min(56, Math.max(48, layoutRect.h)),
        zIndex: 100,
      }
    : {
        position: 'fixed',
        left: '50%',
        bottom: 'max(16px, calc((100% - 56px) * 0.12 + env(safe-area-inset-bottom, 0px)))',
        transform: 'translateX(-50%)',
        width: 'min(256px, max(220px, 56vw))',
        height: 52,
        zIndex: 100,
      };

  const lastLine = transcripts[transcripts.length - 1];

  return (
    <>
      <div
        role="region"
        aria-label="Cerebro voice capsule. Connect, mute, or stop."
        data-testid="voice-card"
        data-voice-capsule="c06"
        data-voice-live={live ? 'true' : 'false'}
        data-chrome-state={live ? 'active' : 'cold'}
        className="cj-voice-shell cerebro-voice-capsule cerebro-pill"
        style={capsuleStyle}
        tabIndex={-1}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cerebro-voice-orb-hit"
          aria-label={live ? 'Voice session active' : 'Connect live voice'}
          data-testid="voice-orb-button"
          onClick={() => {
            if (!live) void handleConnect();
          }}
        >
          <span
            className="cerebro-voice-rings"
            aria-hidden="true"
            data-visible={showRings ? 'true' : 'false'}
            style={{ transform: `scale(${ringScale})` }}
          >
            <img src="/04_Vector_Assets/listening-ring.svg" alt="" width={76} height={76} />
          </span>
          <span className="cerebro-voice-orb" data-live={live ? 'true' : 'false'}>
            <img src="/04_Vector_Assets/microphone.svg" alt="" width={24} height={24} />
          </span>
        </button>

        <div className="cerebro-voice-meta">
          <span className="cerebro-voice-status" aria-live="polite">
            {statusLabel}
          </span>
          {tourState.active && (
            <span className="cerebro-voice-tour">
              Tour {tourState.step}/{tourState.total}
            </span>
          )}
        </div>

        <div className="cerebro-voice-actions" role="group" aria-label="Voice controls">
          {!live ? (
            <button
              type="button"
              className="cerebro-voice-action"
              data-testid="voice-connect"
              aria-label="Connect live voice"
              disabled={offline}
              onClick={() => void handleConnect()}
            >
              Connect
            </button>
          ) : (
            <>
              <button
                type="button"
                className="cerebro-voice-action"
                data-testid="voice-mute"
                aria-pressed={muted}
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={handleMuteToggle}
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                type="button"
                className="cerebro-voice-action cerebro-voice-action-stop"
                data-testid="voice-stop"
                aria-label="Stop voice and camera"
                onClick={handleInstantStop}
              >
                Stop
              </button>
            </>
          )}
          <button
            ref={expandTriggerRef}
            type="button"
            className="cerebro-voice-action"
            data-testid="voice-expand"
            aria-expanded={sheetOpen}
            aria-controls="cerebro-voice-sheet"
            aria-label={sheetOpen ? 'Close voice sheet' : 'Open voice sheet'}
            onClick={() => (sheetOpen ? closeSheet() : setSheetOpen(true))}
          >
            {sheetOpen ? 'Close' : 'More'}
          </button>
        </div>
      </div>

      {sheetOpen && (
        <div
          id="cerebro-voice-sheet"
          className="cerebro-voice-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Voice transcript and settings"
          data-testid="voice-expanded-sheet"
          style={{
            bottom: layoutRect
              ? `calc(100% - ${layoutRect.y}px + 12px)`
              : 'max(80px, calc(12% + 64px + env(safe-area-inset-bottom, 0px)))',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <header className="cerebro-voice-sheet__head">
            <strong>Voice sheet</strong>
            <button
              type="button"
              className="cerebro-voice-action"
              data-testid="voice-sheet-close"
              aria-label="Close voice sheet"
              onClick={closeSheet}
            >
              Close
            </button>
          </header>
          <p className="cerebro-voice-sheet__meta" aria-live="polite">
            {offline
              ? 'Network offline — capsule stays usable; reconnect when online.'
              : bridgeStatus === 'Error'
                ? bridgeDetail || 'Voice authentication or network failed.'
                : `State: ${statusLabel}. ${CRO_CDE_GOOGLE_AGENT_NAME} · ${CEREBRO_VOICE_PROVIDER} · ${googleVoiceToolCount()} tools`}
          </p>
          {(bridgeStatus === 'Error' || offline) && (
            <button
              type="button"
              className="cerebro-voice-sheet__retry"
              data-testid="voice-retry"
              disabled={offline}
              onClick={() => void handleConnect()}
            >
              Retry voice
            </button>
          )}
          <ol className="cerebro-voice-sheet__transcript" aria-label="Transcript history">
            {transcripts.length === 0 ? (
              <li className="cerebro-voice-sheet__empty">No transcript yet. Connect to begin.</li>
            ) : (
              transcripts.slice(-12).map((line) => (
                <li key={line.id}>
                  <span>{line.speaker}</span>
                  <span>{line.text}</span>
                </li>
              ))
            )}
          </ol>
          <footer className="cerebro-voice-sheet__foot">
            Shortcuts: V focus · M mute · X stop · ? help. Privacy: local bridge only; no cloud transcript store.
          </footer>
        </div>
      )}

      {(() => {
        // Avoid duplicating the docked intro copy card when VoiceCard would echo the same greet.
        const introCopyActive =
          Boolean(liveCaption) &&
          /welcome back, sir/i.test(liveCaption || '');
        const captionText = offline
          ? 'Offline — voice bridge paused'
          : bridgeStatus === 'Error'
            ? bridgeDetail || 'Voice connection failed'
            : introCopyActive
              ? null
              : liveCaption || (lastLine ? `${lastLine.speaker}: ${lastLine.text}` : '');
        if (!captionText) return null;
        return (
          <div
            className="cerebro-voice-caption"
            role="status"
            aria-live="polite"
            data-testid="voice-live-caption"
          >
            {captionText}
          </div>
        );
      })()}
    </>
  );
};
