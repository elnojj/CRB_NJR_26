/**
 * Google AI Studio / Gemini voice bridge for Cerebro.
 * Primary path: Chrome SpeechRecognition (Google) → Gemini function-calling turn
 * → speechSynthesis TTS + client tool execution in the Cerebro UI.
 * ElevenLabs ConvAI is not used on this bridge.
 */
import {
  CRO_CDE_GOOGLE_AGENT_NAME,
  CRO_CDE_GOOGLE_FIRST_MESSAGE,
  CRO_CDE_GOOGLE_SYSTEM_PROMPT,
  CRO_CDE_GOOGLE_TOOLS_SCHEMA,
} from '../data/croCdeGoogleAgentManifest';

export type VoiceBridgeState =
  | 'Ready'
  | 'Connecting'
  | 'Listening'
  | 'Thinking'
  | 'Speaking'
  | 'Muted'
  | 'Reconnecting'
  | 'Disconnected'
  | 'Error';

export interface GoogleAiStudioVoiceBridgeCallbacks {
  onStatusChange: (status: VoiceBridgeState, detail?: string) => void;
  onTranscript: (role: 'user' | 'agent', text: string) => void;
  onClientToolCall: (
    toolName: string,
    parameters: Record<string, unknown>
  ) => Promise<string> | string;
  onAudioLevel?: (rms: number) => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type ChatTurn = {
  role: 'user' | 'model';
  text: string;
  model?: string;
  timestamp?: string;
};

export type GeminiChatModelId =
  | 'gemini-3.8-flash'
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash'
  | string;

export type LyriaMusicModelId = 'lyria-3-clip-preview' | 'lyria-2' | string;

export async function sendGeminiChatTurn(args: {
  message: string;
  model: GeminiChatModelId;
  history: ChatTurn[];
}): Promise<{
  reply: string;
  model: string;
  toolCalls: Array<{ toolName: string; parameters: Record<string, unknown> }>;
}> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Gemini chat failed (${res.status})`);
  }
  const data = (await res.json()) as {
    reply?: string;
    model?: string;
    toolCalls?: Array<{ toolName: string; parameters: Record<string, unknown> }>;
  };
  return {
    reply: data.reply || '',
    model: data.model || String(args.model),
    toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
  };
}

export async function transcribeAudioBlob(
  blob: Blob,
  mimeType?: string
): Promise<{ text: string }> {
  const form = new FormData();
  form.append('audio', blob, `voice.${(mimeType || blob.type || 'audio/webm').split('/')[1] || 'webm'}`);
  if (mimeType) form.append('mimeType', mimeType);
  const res = await fetch('/api/gemini/transcribe', { method: 'POST', body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Transcription failed (${res.status})`);
  }
  const data = (await res.json()) as { text?: string };
  return { text: data.text || '' };
}

export async function generateLyriaMusic(args: {
  prompt: string;
  model: LyriaMusicModelId;
}): Promise<{ audioDataUrl: string; lyrics: string }> {
  const res = await fetch('/api/lyria/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Lyria generate failed (${res.status})`);
  }
  const data = (await res.json()) as { audioDataUrl?: string; lyrics?: string };
  return {
    audioDataUrl: data.audioDataUrl || '',
    lyrics: data.lyrics || '',
  };
}

export class GoogleAiStudioVoiceBridge {
  private callbacks: GoogleAiStudioVoiceBridgeCallbacks;
  private speechRec: SpeechRecognitionInstance | null = null;
  private intentionalDisconnect = false;
  private isMuted = false;
  private busy = false;
  private history: ChatTurn[] = [];
  private contextualJson: string | null = null;
  private live = false;
  private rmsTimer: number | null = null;

  constructor(callbacks: GoogleAiStudioVoiceBridgeCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: GoogleAiStudioVoiceBridgeCallbacks): void {
    this.callbacks = callbacks;
  }

  public isLiveWebSocketOpen(): boolean {
    // Gemini turns are request/response; treat active Google voice session as live.
    return this.live;
  }

  public sendContextualUpdate(json: string): void {
    this.contextualJson = json;
  }

  public stopOutputAudioImmediately(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  private setState(status: VoiceBridgeState, detail?: string) {
    this.callbacks.onStatusChange(status, detail);
  }

  private startRmsSim(kind: 'listen' | 'speak') {
    this.stopRmsSim();
    if (typeof window === 'undefined') return;
    const t0 = performance.now();
    this.rmsTimer = window.setInterval(() => {
      const t = (performance.now() - t0) * 0.006;
      const base = kind === 'speak' ? 0.22 : 0.08;
      const wave = Math.abs(Math.sin(t * 2.1) * Math.cos(t * 1.3));
      this.callbacks.onAudioLevel?.(base + wave * (kind === 'speak' ? 0.35 : 0.12));
    }, 50);
  }

  private stopRmsSim() {
    if (this.rmsTimer != null && typeof window !== 'undefined') {
      window.clearInterval(this.rmsTimer);
      this.rmsTimer = null;
    }
    this.callbacks.onAudioLevel?.(0);
  }

  private getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  private startListening(detail = 'Google Voice · listening') {
    if (this.isMuted || this.busy) {
      this.setState(this.isMuted ? 'Muted' : 'Thinking', detail);
      return;
    }
    const Ctor = this.getSpeechRecognitionCtor();
    if (!Ctor) {
      this.setState(
        'Error',
        'Google Voice speech recognition unavailable in this browser'
      );
      return;
    }
    try {
      this.speechRec?.abort();
    } catch {
      /* ignore */
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const raw = Array.from(event.results || [])
        .map((r) => r[0]?.transcript || '')
        .join(' ')
        .trim();
      if (!raw) return;
      void this.handleUserUtterance(raw);
    };
    rec.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        if (this.live && !this.intentionalDisconnect && !this.isMuted && !this.busy) {
          try {
            rec.start();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      this.setState('Error', `Google Voice error: ${event.error || 'unknown'}`);
    };
    rec.onend = () => {
      if (this.live && !this.intentionalDisconnect && !this.isMuted && !this.busy) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    this.speechRec = rec;
    try {
      rec.start();
      this.setState('Listening', detail);
      this.startRmsSim('listen');
    } catch (err) {
      this.setState('Error', `Could not start Google Voice: ${String(err)}`);
    }
  }

  private async speak(text: string): Promise<void> {
    if (!text.trim()) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.callbacks.onTranscript('agent', text);
      return;
    }
    this.stopOutputAudioImmediately();
    this.setState('Speaking', 'Google Voice · speaking');
    this.startRmsSim('speak');
    this.callbacks.onTranscript('agent', text);
    await new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.02;
      utter.pitch = 1;
      utter.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-EG' : 'en-US';
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
    this.stopRmsSim();
  }

  private async handleUserUtterance(text: string) {
    if (this.busy || this.isMuted) return;
    this.busy = true;
    try {
      this.speechRec?.stop();
    } catch {
      /* ignore */
    }
    this.setState('Thinking', 'Gemini · planning tools');
    this.stopRmsSim();
    this.callbacks.onTranscript('user', text);
    this.history.push({ role: 'user', text });

    try {
      const res = await fetch('/api/gemini/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: this.history.slice(-12),
          contextualUpdate: this.contextualJson,
          agentName: CRO_CDE_GOOGLE_AGENT_NAME,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        spokenReply?: string;
        toolCalls?: Array<{ toolName: string; parameters: Record<string, unknown> }>;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        if (res.status === 401 || res.status === 403) {
          window.dispatchEvent(
            new CustomEvent('cerebro:voice-auth-failed', {
              detail: { code: String(res.status), provider: 'google-ai-studio' },
            })
          );
        }
        throw new Error(data.error || `Voice turn failed (${res.status})`);
      }

      const toolCalls = Array.isArray(data.toolCalls) ? data.toolCalls : [];
      for (const call of toolCalls) {
        if (!call?.toolName) continue;
        await this.callbacks.onClientToolCall(call.toolName, call.parameters || {});
      }

      const reply =
        (data.spokenReply || '').trim() ||
        (toolCalls.length
          ? 'Done.'
          : 'I heard you. Ask me to open a station, project, or start the tour.');
      this.history.push({ role: 'model', text: reply });
      await this.speak(reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setState('Error', msg);
      await this.speak('Voice bridge hit an error. Check the Gemini key, then reconnect.');
    } finally {
      this.busy = false;
      if (this.live && !this.intentionalDisconnect && !this.isMuted) {
        this.startListening('Google Voice · listening');
      } else if (this.isMuted) {
        this.setState('Muted', 'Google Voice muted');
      }
    }
  }

  async connect(_agentId?: string): Promise<void> {
    this.intentionalDisconnect = false;
    this.live = true;
    this.isMuted = false;
    this.setState('Connecting', 'Connecting Google AI Studio voice…');

    const hasSpeech =
      typeof window !== 'undefined' &&
      Boolean(
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
      );
    const hasSynth =
      typeof window !== 'undefined' && Boolean(window.speechSynthesis);

    // Graceful interactive fallback when browser speech APIs or keys are absent.
    if (!hasSpeech || !hasSynth) {
      this.setState(
        'Listening',
        'Simulated voice mode · browser speech APIs unavailable; chat sheet remains live'
      );
      this.callbacks.onTranscript(
        'agent',
        `${CRO_CDE_GOOGLE_FIRST_MESSAGE} (simulated — set GEMINI_API_KEY for full Gemini turns)`
      );
      this.startRmsSim('listen');
      return;
    }

    // Greet once per connect using the locked Cerebro first message.
    await this.speak(CRO_CDE_GOOGLE_FIRST_MESSAGE);
    if (this.live && !this.isMuted) {
      this.startListening(
        `Google Voice · ${CRO_CDE_GOOGLE_TOOLS_SCHEMA.length} Cerebro tools`
      );
    }
  }

  disconnect(intentional = true): void {
    this.intentionalDisconnect = intentional;
    this.live = false;
    this.busy = false;
    this.stopOutputAudioImmediately();
    this.stopRmsSim();
    try {
      this.speechRec?.abort();
    } catch {
      /* ignore */
    }
    this.speechRec = null;
    this.setState('Disconnected', 'Google Voice disconnected');
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopOutputAudioImmediately();
      try {
        this.speechRec?.stop();
      } catch {
        /* ignore */
      }
      this.setState('Muted', 'Google Voice muted');
      this.stopRmsSim();
    } else if (this.live) {
      this.startListening('Google Voice · listening');
    }
  }
}

/** Re-export prompt length helper for UI badges. */
export function googleVoiceToolCount(): number {
  return CRO_CDE_GOOGLE_TOOLS_SCHEMA.length;
}

export function googleVoiceSystemPromptPreview(): string {
  return CRO_CDE_GOOGLE_SYSTEM_PROMPT.slice(0, 160);
}
