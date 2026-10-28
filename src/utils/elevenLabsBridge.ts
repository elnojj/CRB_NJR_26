import { DEFAULT_INTERNAL_AGENT_ID } from '../data/croCdeGoogleAgentManifest';

/**
 * ElevenLabs Conversational AI (ConvAI) Real-Time WebSocket & Audio Bridge
 * Grounded in 01_CEREBRO_KB_HANDOFF_2026-10-21_206f5667 (agent_7201m53ed3kred6ba17rvzmyv9q4).
 *
 * - Keeps ONE stable connection across navigation, panel changes, minimization, typing, and sphere switches.
 * - Uses dynamic callback updates (`updateCallbacks`) so React re-renders never tear down the active session.
 * - Resolves signed URLs via `/api/elevenlabs/signed-url` when an API key is configured, with seamless fallback to public `agent_id` WebSocket.
 * - Captures microphone at native hardware sample rate (48kHz / 44.1kHz) and downsamples to negotiated PCM16 rate (16kHz) so `createMediaStreamSource` never throws a sample-rate mismatch error.
 * - Includes automatic Browser Web Speech API (`SpeechRecognition` + `speechSynthesis`) fallback if the remote WebSocket is unreachable or rejected.
 */

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

export interface ElevenLabsBridgeCallbacks {
  onStatusChange: (state: VoiceBridgeState, detail?: string) => void;
  onTranscript: (role: 'user' | 'agent', text: string) => void;
  onClientToolCall: (
    toolName: string,
    params: Record<string, unknown>,
    toolCallId?: string
  ) => Promise<string | Record<string, unknown>> | string | Record<string, unknown>;
  onAudioLevel?: (rms: number) => void;
  onWordAlignment?: (word: string, scheduledAudioTimeSec: number) => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function downsampleFloat32ToInt16(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
): { pcm16: Int16Array; rms: number } {
  let sumSq = 0;
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    sumSq += s * s;
  }
  const rms = input.length > 0 ? Math.sqrt(sumSq / input.length) : 0;

  if (targetSampleRate >= inputSampleRate || inputSampleRate <= 0) {
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return { pcm16, rms };
  }

  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const pcm16 = new Int16Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < pcm16.length) {
    const nextOffsetBuffer = Math.min(
      input.length,
      Math.round((offsetResult + 1) * ratio)
    );
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer; i++) {
      accum += input[i];
      count += 1;
    }
    const avg = count > 0 ? accum / count : input[Math.min(offsetBuffer, input.length - 1)] || 0;
    const clamped = Math.max(-1, Math.min(1, avg));
    pcm16[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return { pcm16, rms };
}

export class ElevenLabsConvaiBridge {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silentGainNode: GainNode | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private speechRec: SpeechRecognitionInstance | null = null;
  private usingBrowserSpeechFallback = false;
  private callbacks: ElevenLabsBridgeCallbacks;
  private nextPlayTime = 0;
  private activePlaybackCount = 0;
  private isMuted = false;
  private currentState: VoiceBridgeState = 'Ready';
  private negotiatedOutputSampleRate = 16000;
  private negotiatedInputSampleRate = 16000;
  private activeAgentId: string = DEFAULT_INTERNAL_AGENT_ID;
  private intentionalDisconnect = false;
  private hasReceivedWsTraffic = false;
  private connectTimeoutId: number | null = null;

  constructor(callbacks: ElevenLabsBridgeCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: ElevenLabsBridgeCallbacks): void {
    this.callbacks = callbacks;
  }

  public getState(): VoiceBridgeState {
    return this.currentState;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getActiveAgentId(): string {
    return this.activeAgentId;
  }

  public isConnected(): boolean {
    return (
      (this.ws !== null && this.ws.readyState === WebSocket.OPEN) ||
      this.usingBrowserSpeechFallback
    );
  }

  public isLiveWebSocketOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getNegotiatedSampleRates(): { inputHz: number; outputHz: number } {
    return {
      inputHz: this.negotiatedInputSampleRate,
      outputHz: this.negotiatedOutputSampleRate,
    };
  }

  private setState(state: VoiceBridgeState, detail?: string): void {
    this.currentState = state;
    this.callbacks.onStatusChange(state, detail);
  }

  public setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (this.mediaStream) {
      for (const track of this.mediaStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
    if (this.usingBrowserSpeechFallback && this.speechRec) {
      try {
        if (muted) {
          this.speechRec.stop();
          this.setState('Muted', 'Microphone muted');
        } else {
          this.speechRec.start();
          this.setState('Listening', 'Listening (Browser Voice Fallback)');
        }
      } catch {
        // ignore
      }
      return this.isMuted;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (muted) {
        this.setState('Muted', 'Microphone muted');
      } else if (this.activePlaybackCount > 0) {
        this.setState('Speaking', 'Cerebro speaking');
      } else {
        this.setState('Listening', 'Listening for voice');
      }
    }
    return this.isMuted;
  }

  public toggleMute(): boolean {
    return this.setMuted(!this.isMuted);
  }

  public stopOutputAudioImmediately(): void {
    for (const src of this.activeSources) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources.clear();
    this.activePlaybackCount = 0;
    this.nextPlayTime = this.audioCtx ? this.audioCtx.currentTime : 0;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    if ((this.ws && this.ws.readyState === WebSocket.OPEN) || this.usingBrowserSpeechFallback) {
      this.setState(this.isMuted ? 'Muted' : 'Listening', 'Playback stopped');
    } else {
      this.setState('Ready', 'Playback stopped');
    }
  }

  public sendUserMessage(text: string): boolean {
    const clean = text.trim();
    if (!clean) return false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'user_message',
            text: clean,
          })
        );
        this.setState('Thinking', 'Processing message...');
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public sendContextualUpdate(contextText: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: 'contextual_update',
            text: contextText,
          })
        );
      } catch {
        // ignore
      }
    }
  }

  public speakWithBrowserSynthesis(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const hasArabic = /[\u0600-\u06FF]/.test(text);
      utter.lang = hasArabic ? 'ar-EG' : 'en-GB';
      utter.rate = 1.02;
      utter.onstart = () => {
        this.setState('Speaking', 'Cerebro speaking');
      };
      utter.onend = () => {
        if (this.usingBrowserSpeechFallback) {
          this.setState(this.isMuted ? 'Muted' : 'Listening', 'Listening (Voice Active)');
        } else if (this.ws?.readyState === WebSocket.OPEN) {
          this.setState(this.isMuted ? 'Muted' : 'Listening', 'Connected to CRO-CDE-GOOGLE');
        } else {
          this.setState('Ready', 'Ready');
        }
      };
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore synthesis errors
    }
  }

  private startBrowserSpeechFallback(reasonDetail: string): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      return false;
    }

    try {
      this.usingBrowserSpeechFallback = true;
      const rec = new SpeechRecCtor();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        this.setState(
          this.isMuted ? 'Muted' : 'Listening',
          `Live Voice Active (${reasonDetail})`
        );
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = String(event.results[i][0]?.transcript || '').trim();
            if (transcript) {
              this.setState('Thinking', `Heard: "${transcript}"`);
              this.callbacks.onTranscript('user', transcript);
              window.setTimeout(() => {
                if (this.usingBrowserSpeechFallback && this.currentState === 'Thinking') {
                  this.setState(this.isMuted ? 'Muted' : 'Listening', 'Listening for voice');
                }
              }, 900);
            }
          }
        }
      };

      rec.onerror = () => {
        // Keep session ready if transient no-speech occurs
      };

      rec.onend = () => {
        if (this.usingBrowserSpeechFallback && !this.intentionalDisconnect && !this.isMuted) {
          try {
            rec.start();
          } catch {
            // ignore
          }
        }
      };

      this.speechRec = rec;
      if (!this.isMuted) {
        rec.start();
      }
      this.setState(
        this.isMuted ? 'Muted' : 'Listening',
        `Live Voice Active (${reasonDetail})`
      );
      return true;
    } catch {
      this.usingBrowserSpeechFallback = false;
      return false;
    }
  }

  async connect(agentId?: string, apiKey?: string): Promise<void> {
    const cleanId = (agentId || DEFAULT_INTERNAL_AGENT_ID).trim();
    if (!cleanId) {
      this.setState('Error', 'Missing ElevenLabs agent_id');
      return;
    }

    // If already connected to the same agent, do not tear down or reconnect
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) &&
      this.activeAgentId === cleanId
    ) {
      return;
    }

    this.disconnect(true);
    this.intentionalDisconnect = false;
    this.hasReceivedWsTraffic = false;
    this.activeAgentId = cleanId;
    this.setState('Connecting', `Connecting to ${cleanId}...`);

    // 1. Request microphone stream (if denied or unavailable, continue in text + audio output mode)
    let micAvailable = false;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
        micAvailable = true;
      } catch {
        this.mediaStream = null;
        micAvailable = false;
      }
    }

    // 2. Resolve WebSocket URL via server `/api/elevenlabs/signed-url` (supports ELEVENLABS_API_KEY if present)
    let wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(cleanId)}`;
    try {
      const signedRes = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: cleanId, apiKey: apiKey?.trim() || undefined }),
      });
      if (signedRes.ok) {
        const signedData = (await signedRes.json()) as {
          signedUrl?: string;
          wsUrl?: string;
        };
        if (signedData.signedUrl) {
          wsUrl = signedData.signedUrl;
        } else if (signedData.wsUrl) {
          wsUrl = signedData.wsUrl;
        }
      }
    } catch {
      // Fallback to direct public wsUrl
    }

    try {
      this.ws = new WebSocket(wsUrl);

      if (typeof window !== 'undefined') {
        if (this.connectTimeoutId !== null) {
          window.clearTimeout(this.connectTimeoutId);
        }
        this.connectTimeoutId = window.setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.setState('Reconnecting', '8s handshake timeout — switching to fallback');
            try {
              this.ws.close();
            } catch {
              // ignore
            }
            const started = this.startBrowserSpeechFallback(
              '8s Reconnect Timeout Fallback'
            );
            if (started) {
              this.callbacks.onTranscript(
                'agent',
                'Welcome back, sir. Anyone with you?'
              );
            }
          }
        }, 8000);
      }

      this.ws.onopen = () => {
        if (typeof window !== 'undefined' && this.connectTimeoutId !== null) {
          window.clearTimeout(this.connectTimeoutId);
          this.connectTimeoutId = null;
        }
        // Send clean initiation payload WITHOUT conversation_config_override so agents
        // without override permissions enabled in ElevenLabs Security never reject with code 1008.
        try {
          this.ws?.send(
            JSON.stringify({
              type: 'conversation_initiation_client_data',
            })
          );
        } catch {
          // ignore
        }

        if (micAvailable && this.mediaStream) {
          this.startMicCapture();
          this.setState(
            this.isMuted ? 'Muted' : 'Listening',
            `Connected to ${cleanId}`
          );
        } else {
          this.isMuted = true;
          this.setState(
            'Listening',
            `Connected to ${cleanId} (Audio output + text commands active)`
          );
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.hasReceivedWsTraffic = true;

          if (msg.type === 'conversation_initiation_metadata') {
            const meta = msg.conversation_initiation_metadata_event || msg;
            if (meta?.agent_output_audio_format) {
              const match = String(meta.agent_output_audio_format).match(/(\d+)/);
              if (match) {
                this.negotiatedOutputSampleRate = parseInt(match[1], 10) || 16000;
              }
            }
            if (meta?.user_input_audio_format) {
              const match = String(meta.user_input_audio_format).match(/(\d+)/);
              if (match) {
                this.negotiatedInputSampleRate = parseInt(match[1], 10) || 16000;
              }
            }
          } else if (msg.type === 'ping') {
            const eventId = msg.ping_event?.event_id ?? msg.event_id;
            this.ws?.send(
              JSON.stringify({
                type: 'pong',
                event_id: eventId,
              })
            );
          } else if (msg.type === 'user_transcript') {
            const text =
              msg.user_transcription_event?.user_transcript ?? msg.user_transcript;
            if (text) {
              this.setState('Thinking', 'Processing request...');
              this.callbacks.onTranscript('user', String(text));
            }
          } else if (msg.type === 'agent_response') {
            const text =
              msg.agent_response_event?.agent_response ?? msg.agent_response;
            if (text) {
              // Ensure owner is never addressed as "39" in Arabic responses
              const sanitized = String(text)
                .replace(/يا\s*39/g, 'يا فندم')
                .replace(/أهلاً\s*39/g, 'أهلاً يا طارق');
              this.callbacks.onTranscript('agent', sanitized);
              if (this.activePlaybackCount === 0) {
                this.setState(this.isMuted && micAvailable ? 'Muted' : 'Listening');
              }
            }
          } else if (msg.type === 'agent_response_correction') {
            const corrected =
              msg.agent_response_correction_event?.corrected_agent_response ??
              msg.corrected_agent_response;
            if (corrected) {
              const sanitized = String(corrected)
                .replace(/يا\s*39/g, 'يا فندم')
                .replace(/أهلاً\s*39/g, 'أهلاً يا طارق');
              this.callbacks.onTranscript('agent', sanitized);
            }
          } else if (msg.type === 'audio') {
            const b64 = msg.audio_event?.audio_base_64 ?? msg.audio_base_64;
            if (b64) {
              this.playPcm16Base64(b64, this.negotiatedOutputSampleRate);
            }
            const align = msg.audio_event?.alignment || msg.alignment;
            if (align && Array.isArray(align.chars) && Array.isArray(align.char_start_times_ms)) {
              const baseTime = this.audioCtx?.currentTime ?? 0;
              const word = align.chars.join('').trim();
              if (word) {
                const startMs = Number(align.char_start_times_ms[0] || 0);
                this.callbacks.onWordAlignment?.(word, baseTime + startMs / 1000);
              }
            }
          } else if (msg.type === 'audio_alignment' || msg.type === 'alignment') {
            const align = msg.audio_alignment_event || msg.alignment || msg;
            if (align && Array.isArray(align.chars)) {
              const baseTime = this.audioCtx?.currentTime ?? 0;
              const word = align.chars.join('').trim();
              const startMs = Array.isArray(align.char_start_times_ms)
                ? Number(align.char_start_times_ms[0] || 0)
                : 0;
              if (word) {
                this.callbacks.onWordAlignment?.(word, baseTime + startMs / 1000);
              }
            }
          } else if (msg.type === 'interruption') {
            this.stopOutputAudioImmediately();
          } else if (msg.type === 'client_tool_call') {
            const call = msg.client_tool_call || msg.client_tool_call_event || msg;
            const toolName = call?.tool_name;
            const toolCallId = call?.tool_call_id;
            const toolParams = call?.parameters || {};

            if (toolName) {
              this.setState('Thinking', `Running ${toolName}...`);
              try {
                const rawResult = await this.callbacks.onClientToolCall(
                  toolName,
                  toolParams,
                  toolCallId
                );
                const serializedResult =
                  typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
                if (toolCallId && this.ws?.readyState === WebSocket.OPEN) {
                  this.ws.send(
                    JSON.stringify({
                      type: 'client_tool_result',
                      tool_call_id: toolCallId,
                      result: serializedResult,
                      is_error: false,
                    })
                  );
                }
              } catch (toolErr: unknown) {
                const errStr = toolErr instanceof Error ? toolErr.message : String(toolErr);
                if (toolCallId && this.ws?.readyState === WebSocket.OPEN) {
                  this.ws.send(
                    JSON.stringify({
                      type: 'client_tool_result',
                      tool_call_id: toolCallId,
                      result: JSON.stringify({ ok: false, error: errStr }),
                      is_error: true,
                    })
                  );
                }
              }
              if (this.activePlaybackCount === 0) {
                this.setState(this.isMuted && micAvailable ? 'Muted' : 'Listening');
              }
            }
          }
        } catch {
          // Ignore malformed non-JSON frames
        }
      };

      this.ws.onerror = () => {
        if (!this.hasReceivedWsTraffic) {
          const startedFallback = this.startBrowserSpeechFallback(
            'Web Speech Fallback · ElevenLabs WS unreachable'
          );
          if (!startedFallback) {
            this.setState(
              'Error',
              'ElevenLabs WebSocket unreachable. Check agent ID or API key in Voice Settings.'
            );
          }
        }
      };

      this.ws.onclose = (ev) => {
        this.stopMicCapture();
        if (this.intentionalDisconnect) {
          this.setState('Ready', 'Voice ready');
          return;
        }
        const reason = ev.reason ? ` (${ev.reason})` : ev.code ? ` (code ${ev.code})` : '';
        if (!this.hasReceivedWsTraffic) {
          const startedFallback = this.startBrowserSpeechFallback(
            `Browser Voice Active · ElevenLabs closed${reason}`
          );
          if (startedFallback) return;
        }
        this.setState('Disconnected', `Voice session closed${reason}`);
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const startedFallback = this.startBrowserSpeechFallback('Browser Voice Fallback');
      if (!startedFallback) {
        this.setState('Error', msg);
      }
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // Create at native hardware sample rate so createMediaStreamSource never throws NotSupportedError
      this.audioCtx = new AudioContextCtor();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private startMicCapture(): void {
    try {
      if (!this.mediaStream) return;
      const ctx = this.ensureAudioContext();
      if (!ctx) return;

      const nativeSampleRate = ctx.sampleRate || 48000;
      this.sourceNode = ctx.createMediaStreamSource(this.mediaStream);
      this.processor = ctx.createScriptProcessor(4096, 1, 1);
      // Route through a zero-gain node so mic input is never echoed to speakers
      this.silentGainNode = ctx.createGain();
      this.silentGainNode.gain.value = 0;

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          this.callbacks.onAudioLevel?.(0);
          return;
        }
        const input = e.inputBuffer.getChannelData(0);
        const { pcm16, rms } = downsampleFloat32ToInt16(
          input,
          nativeSampleRate,
          this.negotiatedInputSampleRate
        );
        this.callbacks.onAudioLevel?.(rms);

        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.byteLength; i += chunkSize) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + chunkSize))
          );
        }
        const b64 = btoa(binary);
        this.ws.send(JSON.stringify({ user_audio_chunk: b64 }));
      };

      this.sourceNode.connect(this.processor);
      this.processor.connect(this.silentGainNode);
      this.silentGainNode.connect(ctx.destination);
    } catch {
      // Audio capture fallback
    }
  }

  private playPcm16Base64(b64: string, sampleRate: number): void {
    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) return;

      const binary = atob(b64);
      const byteLen = binary.length - (binary.length % 2);
      if (byteLen <= 0) return;

      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      let sumSq = 0;
      for (let i = 0; i < pcm16.length; i++) {
        const s = pcm16[i] / 32768;
        float32[i] = s;
        sumSq += s * s;
      }
      const chunkRms = pcm16.length > 0 ? Math.sqrt(sumSq / pcm16.length) : 0;
      this.callbacks.onAudioLevel?.(Math.min(1, chunkRms * 2.2));

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startAt = Math.max(now, this.nextPlayTime);
      this.activePlaybackCount += 1;
      this.activeSources.add(source);
      this.setState('Speaking', 'Cerebro speaking');

      source.onended = () => {
        this.activeSources.delete(source);
        this.activePlaybackCount = Math.max(0, this.activePlaybackCount - 1);
        if (this.activePlaybackCount === 0) {
          this.callbacks.onAudioLevel?.(0);
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.setState(this.isMuted ? 'Muted' : 'Listening', 'Listening');
          }
        }
      };

      source.start(startAt);
      this.nextPlayTime = startAt + audioBuffer.duration;
    } catch {
      // Ignore audio decode anomalies
    }
  }

  private stopMicCapture(): void {
    try {
      this.sourceNode?.disconnect();
    } catch {
      // ignore
    }
    this.sourceNode = null;

    try {
      this.processor?.disconnect();
    } catch {
      // ignore
    }
    this.processor = null;

    try {
      this.silentGainNode?.disconnect();
    } catch {
      // ignore
    }
    this.silentGainNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    for (const src of this.activeSources) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources.clear();
    this.nextPlayTime = 0;
    this.activePlaybackCount = 0;
  }

  disconnect(silent = false): void {
    this.intentionalDisconnect = true;
    this.usingBrowserSpeechFallback = false;
    if (typeof window !== 'undefined' && this.connectTimeoutId !== null) {
      window.clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    if (this.speechRec) {
      try {
        this.speechRec.onend = null;
        this.speechRec.stop();
      } catch {
        // ignore
      }
      this.speechRec = null;
    }
    this.stopMicCapture();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
    }
    this.audioCtx = null;
    if (!silent) {
      this.setState('Disconnected', 'Voice session disconnected');
    }
  }
}
