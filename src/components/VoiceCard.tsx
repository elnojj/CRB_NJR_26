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
  sendGeminiChatTurn,
  transcribeAudioBlob,
  generateLyriaMusic,
  type ChatTurn,
  type GeminiChatModelId,
  type LyriaMusicModelId,
  type VoiceBridgeState,
} from '../utils/googleAiStudioVoiceBridge';
import {
  getSharedMicrophoneStream,
  releaseSharedMicrophoneStream,
} from '../utils/deviceStreamCoordinator';
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

/** C07: scale = 1 + 0.04 * level; attack 80ms / release 240ms */
function voiceRingScale(level: number, _rising: boolean): number {
  const clamped = Math.max(0, Math.min(1, level));
  return 1 + 0.04 * clamped;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voiceState,
  handsActive,
  ambienceMuted = true,
  browserFullscreen = false,
  tourState,
  transcripts,
  liveCaption,
  openAgentModalTrigger,
  onToggleHands,
  onToggleAmbience,
  onOpenTeamChat,
  onOpenOptics,
  onToggleFullscreen,
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
  const [sheetTab, setSheetTab] = useState<'voice' | 'chat' | 'music'>('voice');

  // Multi-turn Gemini Chatbot state
  const [chatModel, setChatModel] = useState<GeminiChatModelId>('gemini-3.8-flash');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Audio Transcription (gemini-3.5-transcribe) state
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [transcribeBusy, setTranscribeBusy] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Lyria Music Generation (lyria-3-clip-preview / lyria-3-pro-preview) state
  const [musicModel, setMusicModel] = useState<LyriaMusicModelId>('lyria-3-clip-preview');
  const [musicPrompt, setMusicPrompt] = useState(
    '30-second atmospheric spatial ambient score for NOJARA Studios with warm analog synths'
  );
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicAudioUrl, setMusicAudioUrl] = useState<string | null>(null);
  const [musicLyrics, setMusicLyrics] = useState<string>('');
  const [musicError, setMusicError] = useState<string | null>(null);

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

  const handleSendChat = async (overrideMessage?: string) => {
    const msg = (overrideMessage ?? chatInput).trim();
    if (!msg || chatBusy) return;
    setChatInput('');
    setChatError(null);
    const nextHistory: ChatTurn[] = [
      ...chatHistory,
      { role: 'user', text: msg, model: chatModel, timestamp: new Date().toLocaleTimeString() },
    ];
    setChatHistory(nextHistory);
    setChatBusy(true);
    try {
      const res = await sendGeminiChatTurn({
        message: msg,
        model: chatModel,
        history: nextHistory,
      });
      for (const call of res.toolCalls) {
        if (call?.toolName && onExecuteToolCall) {
          await onExecuteToolCall(call.toolName, call.parameters || {});
        }
      }
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'model',
          text: res.reply,
          model: res.model,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      onSimulateCommand(`__agent_reply__:${res.reply}`);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : String(err));
    } finally {
      setChatBusy(false);
    }
  };

  const handleToggleMicTranscribe = async () => {
    if (isRecordingMic) {
      mediaRecorderRef.current?.stop();
      setIsRecordingMic(false);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setTranscribedText('Microphone access unavailable in this browser.');
      return;
    }
    try {
      const stream = await getSharedMicrophoneStream({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };
      recorder.onstop = async () => {
        releaseSharedMicrophoneStream();
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size === 0) return;
        setTranscribeBusy(true);
        try {
          const result = await transcribeAudioBlob(blob, recorder.mimeType || 'audio/webm');
          const clean = result.text.trim();
          setTranscribedText(clean || '(No speech detected)');
          if (clean) {
            setChatInput(clean);
            onSimulateCommand(`__user_voice__:${clean}`);
          }
        } catch (err) {
          setTranscribedText(
            `Transcription error: ${err instanceof Error ? err.message : String(err)}`
          );
        } finally {
          setTranscribeBusy(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingMic(true);
    } catch (err) {
      releaseSharedMicrophoneStream();
      setTranscribedText(
        `Mic permission error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleGenerateMusic = async () => {
    const prompt = musicPrompt.trim();
    if (!prompt || musicBusy) return;
    setMusicBusy(true);
    setMusicError(null);
    try {
      const res = await generateLyriaMusic({
        prompt,
        model: musicModel,
      });
      setMusicAudioUrl(res.audioDataUrl);
      setMusicLyrics(res.lyrics);
    } catch (err) {
      setMusicError(err instanceof Error ? err.message : String(err));
    } finally {
      setMusicBusy(false);
    }
  };

  const live =
    bridgeStatus === 'Listening' ||
    bridgeStatus === 'Speaking' ||
    bridgeStatus === 'Connecting' ||
    voiceState === 'Listening' ||
    voiceState === 'Speaking' ||
    voiceState === 'Connecting';

  const statusLabel = offline
    ? 'Voice offline'
    : muted
      ? 'Mic muted'
      : bridgeStatus === 'Listening' || voiceState === 'Listening'
        ? 'Voice listening'
        : bridgeStatus === 'Speaking' || voiceState === 'Speaking'
          ? 'Cerebro speaking'
          : bridgeStatus === 'Connecting' || voiceState === 'Connecting'
            ? 'Starting voice…'
            : bridgeStatus === 'Error'
              ? 'Voice error'
              : bridgeStatus === 'Disconnected'
                ? 'Voice ended'
                : 'Voice ready';

  const ringScale = voiceRingScale(ringLevel, true);
  const showRings =
    !muted &&
    (bridgeStatus === 'Listening' ||
      bridgeStatus === 'Speaking' ||
      voiceState === 'Listening' ||
      voiceState === 'Speaking');

  const layoutRect = guiLayout?.voiceRect;
  // When gesture HUD is open, park the voice capsule lower so Hands chrome stacks cleanly above.
  const capsuleStyle: React.CSSProperties = layoutRect
    ? {
        position: 'fixed',
        left: handsActive
          ? Math.max(12, layoutRect.x - Math.round(layoutRect.w * 0.15))
          : layoutRect.x,
        top: handsActive
          ? Math.min(
              layoutRect.y + 8,
              (guiLayout?.viewportH ?? window.innerHeight) - layoutRect.h - 56
            )
          : layoutRect.y,
        width: Math.min(340, Math.max(260, layoutRect.w + 48)),
        height: Math.min(56, Math.max(48, layoutRect.h)),
        zIndex: 100,
        opacity: 1,
      }
    : {
        position: 'fixed',
        left: '50%',
        bottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
        transform: 'translateX(-50%)',
        width: 'min(340px, max(260px, 72vw))',
        height: 52,
        zIndex: 100,
        opacity: 1,
      };

  const lastLine = transcripts[transcripts.length - 1];

  return (
    <>
      <div
        role="region"
        aria-label="Cerebro voice capsule. Start voice, mute mic, open text, or camera."
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
          aria-label={live ? 'Voice session active' : 'Start live voice with Cerebro'}
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

        <div className="cerebro-voice-actions" role="group" aria-label="Voice, text, and camera">
          {!live ? (
            <button
              type="button"
              className="cerebro-voice-action"
              data-testid="voice-connect"
              aria-label="Start live voice with Cerebro"
              disabled={offline}
              onClick={() => void handleConnect()}
            >
              Start voice
            </button>
          ) : (
            <>
              <button
                type="button"
                className="cerebro-voice-action"
                data-testid="voice-mute"
                aria-pressed={muted}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                onClick={handleMuteToggle}
              >
                {muted ? 'Unmute mic' : 'Mute mic'}
              </button>
              <button
                type="button"
                className="cerebro-voice-action cerebro-voice-action-stop"
                data-testid="voice-stop"
                aria-label="End voice session"
                onClick={handleInstantStop}
              >
                End voice
              </button>
            </>
          )}
          <button
            type="button"
            className="cerebro-voice-action"
            data-testid="enable-one-hand-gesture"
            data-cta-id="gesture-toggle"
            data-chrome-state={handsActive ? 'active' : 'cold'}
            aria-pressed={handsActive}
            aria-label={
              handsActive ? 'Turn off hand camera tracking' : 'Turn on hand camera tracking'
            }
            onClick={onToggleHands}
          >
            {handsActive ? 'Camera on' : 'Camera'}
          </button>
          <button
            ref={expandTriggerRef}
            type="button"
            className="cerebro-voice-action"
            data-testid="voice-expand"
            aria-expanded={sheetOpen}
            aria-controls="cerebro-voice-sheet"
            aria-label={sheetOpen ? 'Close text and session sheet' : 'Open text chat and session'}
            onClick={() => (sheetOpen ? closeSheet() : setSheetOpen(true))}
          >
            {sheetOpen ? 'Close' : 'Text'}
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
            <strong>Text chat & session</strong>
            <button
              type="button"
              className="cerebro-voice-action"
              data-testid="voice-sheet-close"
              aria-label="Close text chat and session sheet"
              onClick={closeSheet}
            >
              Close sheet
            </button>
          </header>
          <div
            className="flex flex-wrap items-center gap-1.5 my-2"
            role="group"
            aria-label="Session controls"
            data-testid="voice-session-controls"
          >
            <button
              type="button"
              className="cerebro-voice-action text-[11px] px-2.5 py-1"
              data-testid="enable-one-hand-gesture"
              aria-pressed={handsActive}
              onClick={onToggleHands}
            >
              {handsActive ? 'Turn off hand camera' : 'Turn on hand camera'}
            </button>
            {onToggleAmbience && (
              <button
                type="button"
                className="cerebro-voice-action text-[11px] px-2.5 py-1"
                data-testid="ambience-mute-toggle"
                aria-pressed={!ambienceMuted}
                onClick={onToggleAmbience}
              >
                {ambienceMuted ? 'Turn ambience on' : 'Turn ambience off'}
              </button>
            )}
            {onOpenTeamChat && (
              <button
                type="button"
                className="cerebro-voice-action text-[11px] px-2.5 py-1"
                data-testid="team-chat-open"
                onClick={() => {
                  onOpenTeamChat();
                  closeSheet();
                }}
              >
                Open team chat
              </button>
            )}
            {onOpenOptics && (
              <button
                type="button"
                className="cerebro-voice-action text-[11px] px-2.5 py-1"
                data-testid="camera-control-toggle"
                onClick={() => {
                  onOpenOptics();
                  closeSheet();
                }}
              >
                Open lens optics
              </button>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                className="cerebro-voice-action text-[11px] px-2.5 py-1"
                data-testid="browser-fullscreen-utility"
                aria-pressed={browserFullscreen}
                onClick={onToggleFullscreen}
              >
                {browserFullscreen ? 'Exit browser fullscreen' : 'Enter browser fullscreen'}
              </button>
            )}
          </div>
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
          <div
            className="flex items-center gap-1.5 my-2"
            role="tablist"
            aria-label="Gemini Studio modes"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sheetTab === 'voice'}
              data-testid="voice-tab-live"
              className="cerebro-voice-action text-[11px] px-2.5 py-1"
              onClick={() => setSheetTab('voice')}
            >
              Live 3.8 & Transcribe
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sheetTab === 'chat'}
              data-testid="voice-tab-chat"
              className="cerebro-voice-action text-[11px] px-2.5 py-1"
              onClick={() => setSheetTab('chat')}
            >
              Gemini Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sheetTab === 'music'}
              data-testid="voice-tab-music"
              className="cerebro-voice-action text-[11px] px-2.5 py-1"
              onClick={() => setSheetTab('music')}
            >
              Lyria Music
            </button>
          </div>

          {sheetTab === 'voice' && (
            <>
              <div className="flex items-center justify-between gap-2 my-1.5">
                <button
                  type="button"
                  data-testid="voice-transcribe-mic"
                  disabled={offline || transcribeBusy}
                  onClick={() => void handleToggleMicTranscribe()}
                  className="cerebro-voice-action text-[11px] px-2.5 py-1"
                >
                  {isRecordingMic
                    ? 'Stop & Transcribe (gemini-3.5-transcribe)'
                    : transcribeBusy
                      ? 'Transcribing…'
                      : 'Record & Transcribe (gemini-3.5-transcribe)'}
                </button>
                {transcribedText && (
                  <span
                    data-testid="voice-transcribe-output"
                    className="text-[11px] text-[#9AFFE0] truncate max-w-[200px]"
                    title={transcribedText}
                  >
                    {transcribedText}
                  </span>
                )}
              </div>
              <ol className="cerebro-voice-sheet__transcript" aria-label="Transcript history">
                {transcripts.length === 0 ? (
                  <li className="cerebro-voice-sheet__empty">
                    No transcript yet. Tap Start voice to begin.
                  </li>
                ) : (
                  transcripts.slice(-12).map((line) => (
                    <li key={line.id}>
                      <span>{line.speaker}</span>
                      <span>{line.text}</span>
                    </li>
                  ))
                )}
              </ol>
            </>
          )}

          {sheetTab === 'chat' && (
            <div className="flex flex-col gap-2 my-1" data-testid="gemini-chat-panel">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-[#C5CCD6]">Model:</span>
                {(
                  [
                    { id: 'gemini-4-argon', label: 'Argon 4 (Complex)' },
                    { id: 'gemini-3.8-flash', label: 'Flash 3.8 (General)' },
                    { id: 'gemini-3.1-flash-lite', label: 'Flash-Lite 3.1 (Fast)' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`chat-model-${m.id}`}
                    aria-pressed={chatModel === m.id}
                    onClick={() => setChatModel(m.id)}
                    className={`cerebro-voice-action text-[10px] px-2 py-0.5 ${
                      chatModel === m.id ? 'border-[#9AFFE0] text-[#9AFFE0]' : ''
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div
                className="max-h-36 overflow-y-auto rounded border border-white/10 bg-[#0D1620]/70 p-2 text-xs space-y-1.5"
                data-testid="gemini-chat-thread"
              >
                {chatHistory.length === 0 ? (
                  <p className="text-[#8FA1B3] text-[11px]">
                    Multi-turn Gemini chat ready ({chatModel}). Ask about any project, sphere, or RACI gate.
                  </p>
                ) : (
                  chatHistory.map((turn, idx) => (
                    <div key={idx} className="leading-snug">
                      <strong className="text-[#9AFFE0] mr-1.5">
                        {turn.role === 'user' ? '39:' : 'Cerebro:'}
                      </strong>
                      <span className="text-[#F5F7FA]">{turn.text}</span>
                    </div>
                  ))
                )}
              </div>

              {chatError && (
                <p className="text-[11px] text-[#FF7A7A]" role="alert">
                  {chatError}
                </p>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSendChat();
                    }
                  }}
                  placeholder={`Message ${chatModel}…`}
                  data-testid="gemini-chat-input"
                  className="flex-1 rounded border border-white/15 bg-[#0D1620]/90 px-2.5 py-1.5 text-xs text-white placeholder-[#8FA1B3]"
                />
                <button
                  type="button"
                  disabled={chatBusy || !chatInput.trim()}
                  onClick={() => void handleSendChat()}
                  data-testid="gemini-chat-send"
                  className="cerebro-voice-action text-xs px-3 py-1.5"
                >
                  {chatBusy ? '…' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {sheetTab === 'music' && (
            <div className="flex flex-col gap-2 my-1" data-testid="lyria-music-panel">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-[#C5CCD6]">Lyria:</span>
                {(
                  [
                    { id: 'lyria-3-clip-preview', label: 'Lyria 3 Clip (30s)' },
                    { id: 'lyria-3-pro-preview', label: 'Lyria 3 Pro (Full Track)' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={`music-model-${m.id}`}
                    aria-pressed={musicModel === m.id}
                    onClick={() => setMusicModel(m.id)}
                    className={`cerebro-voice-action text-[10px] px-2 py-0.5 ${
                      musicModel === m.id ? 'border-[#9AFFE0] text-[#9AFFE0]' : ''
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  placeholder="Describe the soundtrack or cue…"
                  data-testid="lyria-music-prompt"
                  className="flex-1 rounded border border-white/15 bg-[#0D1620]/90 px-2.5 py-1.5 text-xs text-white placeholder-[#8FA1B3]"
                />
                <button
                  type="button"
                  disabled={musicBusy || !musicPrompt.trim()}
                  onClick={() => void handleGenerateMusic()}
                  data-testid="lyria-music-generate"
                  className="cerebro-voice-action text-xs px-3 py-1.5"
                >
                  {musicBusy ? 'Scoring…' : 'Generate'}
                </button>
              </div>

              {musicError && (
                <p className="text-[11px] text-[#FF7A7A]" role="alert">
                  {musicError}
                </p>
              )}

              {musicAudioUrl && (
                <div className="space-y-1">
                  <audio
                    controls
                    src={musicAudioUrl}
                    data-testid="lyria-music-audio"
                    className="w-full h-8"
                  />
                  {musicLyrics && (
                    <p className="text-[11px] text-[#C5CCD6] max-h-20 overflow-y-auto whitespace-pre-wrap">
                      {musicLyrics}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

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
