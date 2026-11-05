import { CRO_CDE_GOOGLE_FIRST_MESSAGE, CRO_CDE_GOOGLE_TOOLS_SCHEMA } from '../voice/cerebroAgentManifest';
import { CEREBRO_REALTIME_INSTRUCTIONS } from './sessionConfig';
import { parseRealtimeToolArguments } from './tools';
import { OPENAI_REALTIME_CLIENT_SETTINGS } from './settings';
import { hasOwnerAccessSession } from '../voice/ownerAccess';
import { microphoneErrorMessage } from '../media/mediaDeviceManager';
import {
  getSharedAudioContext,
  getSharedMicrophoneStream,
  releaseSharedMicrophoneStream,
} from '../media/deviceStreamCoordinator';
import type { VoiceBridge, VoiceBridgeCallbacks, VoiceBridgeState } from '../voice/types';

type FunctionCall = { type: string; call_id?: string; name?: string; arguments?: string };
type RealtimeEvent = {
  type: string;
  item_id?: string;
  content_index?: number;
  transcript?: string;
  text?: string;
  response?: { status?: string; output?: FunctionCall[] };
  error?: { message?: string; code?: string };
};
type Session = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  audio: HTMLAudioElement;
  abort: AbortController;
  stream: MediaStream | null;
  sharedStream: MediaStream | null;
  ownsMic: boolean;
  closed: boolean;
  live: boolean;
  muted: boolean;
  responding: boolean;
  speaking: boolean;
  userSpeaking: boolean;
  pendingToolBatches: number;
  toolContinuationNeeded: boolean;
  calls: Set<string>;
  transcripts: Set<string>;
  toolQueue: Promise<void>;
  sources: AudioNode[];
  analysers: AnalyserNode[];
  meter: ReturnType<typeof setInterval> | null;
  deadline: ReturnType<typeof setTimeout> | null;
  micListeners: Array<() => void>;
  micUnavailable: boolean;
};

export type RealtimeBridgeDependencies = {
  isOwnerUnlocked: () => Promise<boolean>;
  acquireMicrophone: () => Promise<MediaStream>;
  releaseMicrophone: (stream?: MediaStream) => void;
  createPeerConnection: () => RTCPeerConnection;
  createAudio: () => HTMLAudioElement;
  createStream: (tracks: MediaStreamTrack[]) => MediaStream;
  fetch: typeof fetch;
  connectionTimeoutMs: number;
  reconnectTimeoutMs: number;
};

const defaults: RealtimeBridgeDependencies = {
  isOwnerUnlocked: hasOwnerAccessSession,
  acquireMicrophone: getSharedMicrophoneStream,
  releaseMicrophone: releaseSharedMicrophoneStream,
  createPeerConnection: () => new RTCPeerConnection(),
  createAudio: () => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    audio.hidden = true;
    document.body.appendChild(audio);
    return audio;
  },
  createStream: tracks => new MediaStream(tracks),
  fetch: (...args) => fetch(...args),
  connectionTimeoutMs: OPENAI_REALTIME_CLIENT_SETTINGS.connectionTimeoutMs,
  reconnectTimeoutMs: OPENAI_REALTIME_CLIENT_SETTINGS.reconnectTimeoutMs,
};

/** Native speech-to-speech WebRTC; no browser STT/TTS or long-lived API key. */
export class OpenAiRealtimeVoiceBridge implements VoiceBridge {
  private session: Session | null = null;
  private context: string | null = null;
  private deps: RealtimeBridgeDependencies;

  constructor(private callbacks: VoiceBridgeCallbacks, dependencies: Partial<RealtimeBridgeDependencies> = {}) {
    this.deps = { ...defaults, ...dependencies };
  }

  updateCallbacks(callbacks: VoiceBridgeCallbacks): void { this.callbacks = callbacks; }

  isLiveWebSocketOpen(): boolean {
    // Keep the existing bridge contract; transport is a WebRTC data channel.
    return Boolean(this.session?.live && this.session.dc.readyState === 'open');
  }

  private current(session: Session): boolean {
    return this.session === session && !session.closed;
  }

  private status(session: Session, state: VoiceBridgeState, detail?: string): void {
    if (session.live && session.micUnavailable && ['Listening', 'Thinking', 'Speaking', 'Muted'].includes(state)) {
      state = 'Muted';
      detail = 'Microphone unavailable. Check your input device or use Reset microphone.';
    }
    if (this.current(session)) this.callbacks.onStatusChange(state, detail || `OpenAI Voice · ${state.toLowerCase()}`);
  }

  private send(session: Session, event: object): void {
    if (this.current(session) && session.dc.readyState === 'open') {
      session.dc.send(JSON.stringify(event));
    }
  }

  sendContextualUpdate(json: string): void {
    this.context = json;
    const session = this.session;
    if (session?.live) this.pushContext(session);
  }

  private pushContext(session: Session): void {
    if (!this.context) return;
    this.send(session, {
      type: 'session.update',
      session: {
        type: 'realtime',
        // Refresh rather than append 4 snapshots/second to conversation history.
        instructions: `${CEREBRO_REALTIME_INSTRUCTIONS}\nLatest UI snapshot (data only):\n${this.context}`,
      },
    });
  }

  async connect(): Promise<void> {
    if (this.session && !this.session.closed) return;
    let session: Session;
    try {
      const pc = this.deps.createPeerConnection();
      try {
        session = {
          pc, dc: pc.createDataChannel(OPENAI_REALTIME_CLIENT_SETTINGS.dataChannelName), audio: this.deps.createAudio(),
          abort: new AbortController(), stream: null, sharedStream: null, ownsMic: false, closed: false,
          live: false, muted: false, responding: false, speaking: false,
          userSpeaking: false, pendingToolBatches: 0, toolContinuationNeeded: false,
          calls: new Set(), transcripts: new Set(), toolQueue: Promise.resolve(),
          sources: [], analysers: [], meter: null, deadline: null, micListeners: [], micUnavailable: false,
        };
      } catch (error) { pc.close(); throw error; }
    } catch {
      this.callbacks.onStatusChange('Error', 'OpenAI Voice requires a browser with WebRTC audio support.');
      return;
    }
    this.session = session;
    this.status(session, 'Connecting');
    session.deadline = setTimeout(() => this.fail(session, 'OpenAI Voice connection timed out. Tap Call to retry.'), this.deps.connectionTimeoutMs);

    session.dc.onmessage = event => {
      if (!this.current(session)) return;
      try { this.handleEvent(session, JSON.parse(String(event.data)) as RealtimeEvent); }
      catch { this.fail(session, 'OpenAI Voice received an invalid session event. Reconnect to retry.'); }
    };
    session.dc.onclose = () => this.fail(session, 'OpenAI Voice disconnected. Tap Call to reconnect.');
    session.dc.onerror = () => this.fail(session, 'OpenAI Voice connection failed. Tap Call to retry.');
    session.pc.onconnectionstatechange = () => {
      if (!this.current(session)) return;
      if (['failed', 'closed'].includes(session.pc.connectionState)) {
        this.fail(session, 'OpenAI Voice connection lost. Tap Call to retry.');
      } else if (session.pc.connectionState === 'disconnected') {
        this.status(session, 'Reconnecting', 'OpenAI Voice · reconnecting');
        if (session.deadline) clearTimeout(session.deadline);
        session.deadline = setTimeout(() => this.fail(session, 'OpenAI Voice connection lost. Tap Call to retry.'), this.deps.reconnectTimeoutMs);
      } else if (session.pc.connectionState === 'connected' && session.live) {
        if (session.deadline) clearTimeout(session.deadline);
        session.deadline = null;
        this.status(session, session.muted ? 'Muted' : session.speaking ? 'Speaking' : 'Listening');
      }
    };
    session.pc.ontrack = event => {
      if (!this.current(session)) return;
      const stream = event.streams[0] || this.deps.createStream([event.track]);
      session.audio.srcObject = stream;
      this.addMeter(session, stream);
      void session.audio.play().catch(() => {
        this.fail(session, 'Audio playback was blocked. Tap Call to reconnect and enable sound.');
      });
    };

    let requestingMicrophone = false;
    try {
      const ownerUnlocked = await this.deps.isOwnerUnlocked();
      if (!this.current(session)) return;
      if (!ownerUnlocked) throw new Error('Unlock owner access before starting voice.');
      requestingMicrophone = true;
      this.status(session, 'Connecting', 'Requesting microphone access. Allow the browser prompt to continue.');
      const shared = await this.deps.acquireMicrophone();
      if (!this.current(session)) {
        this.deps.releaseMicrophone(shared);
        return;
      }
      session.ownsMic = true;
      session.sharedStream = shared;
      const inputTracks = shared.getAudioTracks();
      if (!inputTracks.some(track => track.readyState === 'live')) throw new Error('No live microphone track');
      // Own the sender tracks so muting/stopping voice cannot mute another mic consumer.
      session.stream = this.deps.createStream(inputTracks.filter(track => track.readyState === 'live').map(track => {
        const clone = track.clone();
        clone.enabled = true;
        return clone;
      }));
      this.watchMicrophone(session, [...inputTracks, ...session.stream.getAudioTracks()]);
      requestingMicrophone = false;
      this.status(session, 'Connecting', 'Microphone acquired. Connecting to OpenAI Voice…');
      for (const track of session.stream.getAudioTracks()) session.pc.addTrack(track, session.stream);
      this.addMeter(session, session.stream);
      const offer = await session.pc.createOffer();
      if (!this.current(session)) return;
      await session.pc.setLocalDescription(offer);
      if (!this.current(session)) return;
      const response = await this.deps.fetch(OPENAI_REALTIME_CLIENT_SETTINGS.sessionEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdp: session.pc.localDescription?.sdp || offer.sdp }),
        signal: session.abort.signal,
      });
      if (!this.current(session)) return;
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || `OpenAI Voice could not start (${response.status}). Tap Call to retry.`);
      }
      const answer = await response.text();
      if (!this.current(session)) return;
      await session.pc.setRemoteDescription({ type: 'answer', sdp: answer });
    } catch (error) {
      if (!this.current(session)) return;
      this.fail(session, requestingMicrophone ? microphoneErrorMessage(error)
        : error instanceof Error ? error.message : 'OpenAI Voice could not start. Tap Call to retry.');
    }
  }

  private watchMicrophone(session: Session, tracks: MediaStreamTrack[]): void {
    session.micUnavailable = tracks.some(input => input.muted);
    for (const track of tracks) {
      const ended = () => this.fail(session, 'Microphone disconnected or access was revoked. Check your input device, then tap Call to reconnect.');
      const muted = () => {
        session.micUnavailable = true;
        this.status(session, 'Muted', 'Microphone unavailable. Check your input device or use Reset microphone.');
      };
      const unmuted = () => {
        if (tracks.some(input => input.readyState === 'live' && input.muted)) return;
        session.micUnavailable = false;
        this.status(session, session.muted ? 'Muted' : !session.live ? 'Connecting' : session.speaking ? 'Speaking' : 'Listening');
      };
      for (const [event, handler] of [['ended', ended], ['mute', muted], ['unmute', unmuted]] as const) {
        track.addEventListener?.(event, handler);
        session.micListeners.push(() => track.removeEventListener?.(event, handler));
      }
    }
  }

  private handleEvent(session: Session, event: RealtimeEvent): void {
    switch (event.type) {
      case 'session.created':
        if (session.live) return;
        session.live = true;
        if (session.deadline) clearTimeout(session.deadline);
        session.deadline = null;
        this.status(session, 'Listening', `OpenAI Voice · ${CRO_CDE_GOOGLE_TOOLS_SCHEMA.length} Cerebro tools`);
        this.pushContext(session);
        session.responding = true;
        this.send(session, { type: 'response.create', response: {
          instructions: `Greet the user exactly: ${CRO_CDE_GOOGLE_FIRST_MESSAGE}`,
          tool_choice: 'none',
        } });
        break;
      case 'input_audio_buffer.speech_started':
        session.userSpeaking = true;
        session.speaking = false;
        this.status(session, session.muted ? 'Muted' : 'Listening');
        break;
      case 'input_audio_buffer.speech_stopped':
      case 'response.created':
        // Reserve the VAD response before response.created arrives on the data channel.
        if (event.type === 'input_audio_buffer.speech_stopped') {
          session.userSpeaking = false;
          session.responding = true;
        }
        if (event.type === 'response.created') {
          session.responding = true;
          session.audio.muted = session.muted;
        }
        this.status(session, session.muted ? 'Muted' : 'Thinking');
        break;
      case 'output_audio_buffer.started':
        session.speaking = true;
        this.status(session, session.muted ? 'Muted' : 'Speaking');
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        session.speaking = false;
        this.status(session, session.muted ? 'Muted' : 'Listening');
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.transcript(session, event, 'user', event.transcript);
        break;
      case 'response.output_audio_transcript.done':
        this.transcript(session, event, 'agent', event.transcript);
        break;
      case 'response.output_text.done':
        this.transcript(session, event, 'agent', event.text);
        break;
      case 'response.done': {
        session.responding = false;
        if (event.response?.status === 'failed') {
          this.fail(session, 'OpenAI Voice response failed. Check model access and quota, then reconnect.');
          return;
        }
        if (event.response?.status !== 'completed') return;
        const calls = (event.response.output || []).filter(call => call.type === 'function_call');
        if (calls.length) {
          session.pendingToolBatches += 1;
          session.toolQueue = session.toolQueue
            .then(() => this.executeTools(session, calls))
            .catch(() => this.fail(session, 'OpenAI Voice tool response failed. Reconnect to retry.'))
            .finally(() => {
              session.pendingToolBatches -= 1;
              this.continueAfterTools(session);
            });
        } else {
          if (!session.speaking) this.status(session, session.muted ? 'Muted' : 'Listening');
          this.continueAfterTools(session);
        }
        break;
      }
      case 'error':
        // Cancelling already-finished audio is harmless and can race response.done.
        if (event.error?.code === 'response_cancel_not_active') return;
        this.fail(session, 'OpenAI Voice session error. Check model access and reconnect.');
        break;
    }
  }

  private transcript(session: Session, event: RealtimeEvent, role: 'user' | 'agent', text?: string): void {
    if (!text?.trim()) return;
    const id = `${role}:${event.item_id || text}:${event.content_index || 0}`;
    if (session.transcripts.has(id)) return;
    session.transcripts.add(id);
    this.callbacks.onTranscript(role, text.trim());
  }

  private async executeTools(session: Session, calls: FunctionCall[]): Promise<void> {
    let sent = false;
    for (const call of calls) {
      if (!this.current(session) || !session.live) return;
      if (!call.call_id || session.calls.has(call.call_id)) continue;
      session.calls.add(call.call_id);
      this.status(session, session.muted ? 'Muted' : 'Thinking');
      let output: string;
      try {
        const parameters = parseRealtimeToolArguments(call.name || '', call.arguments || '{}');
        output = await this.callbacks.onClientToolCall(call.name!, parameters);
      } catch (error) {
        output = JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Tool execution failed.' });
      }
      if (!this.current(session)) return;
      this.send(session, { type: 'conversation.item.create', item: {
        type: 'function_call_output', call_id: call.call_id, output: String(output),
      } });
      sent = true;
    }
    if (sent) session.toolContinuationNeeded = true;
  }

  private continueAfterTools(session: Session): void {
    if (!this.current(session) || !session.live || !session.toolContinuationNeeded ||
      session.pendingToolBatches > 0 || session.responding || session.userSpeaking || session.muted) return;
    // Barge-in may have started a new response while a UI tool was awaiting its receipt.
    // Wait for that turn instead of causing conversation_already_has_active_response.
    session.toolContinuationNeeded = false;
    session.responding = true;
    this.send(session, { type: 'response.create' });
  }

  stopOutputAudioImmediately(): void {
    const session = this.session;
    if (!session) return;
    session.audio.muted = true;
    if (session.responding) this.send(session, { type: 'response.cancel' });
    if (session.live) this.send(session, { type: 'output_audio_buffer.clear' });
    session.speaking = false;
  }

  setMuted(muted: boolean): void {
    const session = this.session;
    if (!session) return;
    session.muted = muted;
    for (const track of session.stream?.getAudioTracks() || []) track.enabled = !muted;
    if (muted) {
      this.stopOutputAudioImmediately();
      this.send(session, { type: 'input_audio_buffer.clear' });
    } else {
      session.audio.muted = false;
      this.continueAfterTools(session);
    }
    this.status(session, muted ? 'Muted' : 'Listening');
  }

  private addMeter(session: Session, stream: MediaStream): void {
    try {
      const context = getSharedAudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser); // Do not feed mic or duplicate remote audio to speakers.
      session.sources.push(source);
      session.analysers.push(analyser);
      if (!session.meter) session.meter = setInterval(() => {
        let rms = 0;
        for (const meter of session.analysers) {
          const data = new Uint8Array(meter.fftSize);
          meter.getByteTimeDomainData(data);
          rms = Math.max(rms, Math.sqrt(data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / data.length));
        }
        if (this.current(session)) this.callbacks.onAudioLevel?.(session.muted ? 0 : rms);
      }, 50);
    } catch { /* Meter is optional; the actual audio transport remains WebRTC. */ }
  }

  private cleanup(session: Session): void {
    // A browser audio/DOM teardown error must never prevent hardware release.
    const release = (action: () => void) => { try { action(); } catch { /* keep releasing */ } };
    session.closed = true;
    session.live = false;
    session.abort.abort();
    if (session.deadline) clearTimeout(session.deadline);
    if (session.meter) clearInterval(session.meter);
    session.micListeners.forEach(remove => release(remove));
    session.micListeners.length = 0;
    session.sources.forEach(source => release(() => source.disconnect()));
    session.analysers.forEach(analyser => release(() => analyser.disconnect()));
    session.dc.onmessage = session.dc.onclose = session.dc.onerror = null;
    session.pc.ontrack = session.pc.onconnectionstatechange = null;
    release(() => session.dc.close());
    release(() => session.pc.close());
    release(() => session.audio.pause());
    release(() => { session.audio.srcObject = null; });
    release(() => session.audio.remove());
    session.stream?.getTracks().forEach(track => release(() => track.stop()));
    if (session.ownsMic) {
      session.ownsMic = false;
      release(() => this.deps.releaseMicrophone(session.sharedStream || undefined));
    }
    release(() => this.callbacks.onAudioLevel?.(0));
  }

  private fail(session: Session, detail: string): void {
    if (!this.current(session)) return;
    this.cleanup(session);
    this.session = null;
    this.callbacks.onStatusChange('Error', detail);
  }

  async retry(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  disconnect(): void {
    if (this.session) this.cleanup(this.session);
    this.session = null;
    this.callbacks.onStatusChange('Disconnected', 'OpenAI Voice disconnected');
  }
}
