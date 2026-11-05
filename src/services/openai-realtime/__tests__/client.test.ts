import { parseRealtimeToolArguments } from '../tools';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { OpenAiRealtimeVoiceBridge, type RealtimeBridgeDependencies } from '../OpenAiRealtimeVoiceBridge';
import { buildOpenAiRealtimeSession, buildOpenAiRealtimeTools } from '../sessionConfig';
import { CRO_CDE_GOOGLE_TOOLS_SCHEMA } from '../../voice/cerebroAgentManifest';
import { auditToolRegistry } from '../../../utils/actionDispatcher';
import type { VoiceBridgeState } from '../../voice/types';
import { requestUserMedia } from '../../media/mediaDeviceManager';
import { describeOpenAiFailure, type OpenAiFailure } from '../../openai-errors';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const bridges: OpenAiRealtimeVoiceBridge[] = [];
afterEach(() => bridges.splice(0).forEach(bridge => bridge.disconnect()));

function track() {
  return Object.assign(new EventTarget(), {
    enabled: true, muted: false, stopped: false, readyState: 'live',
    stop() { this.stopped = true; this.readyState = 'ended'; },
    clone() { return track(); },
  });
}
function stream(tracks = [track()]) {
  return { getTracks: () => tracks, getAudioTracks: () => tracks } as unknown as MediaStream;
}

function harness() {
  const states: Array<{ state: VoiceBridgeState; detail?: string; failure?: OpenAiFailure }> = [];
  const transcripts: Array<{ role: string; text: string }> = [];
  const calls: Array<{ name: string; parameters: Record<string, unknown> }> = [];
  const sent: Array<Record<string, any>> = [];
  const pcs: Array<any> = [];
  const shared = stream();
  let releases = 0;
  let acquires = 0;
  let requests = 0;
  const callbacks = {
    onStatusChange: (state: VoiceBridgeState, detail?: string, failure?: OpenAiFailure) => { states.push({ state, detail, ...(failure ? { failure } : {}) }); },
    onTranscript: (role: 'user' | 'agent', text: string) => { transcripts.push({ role, text }); },
    onClientToolCall: async (name: string, parameters: Record<string, unknown>) => {
      calls.push({ name, parameters });
      return JSON.stringify({ ok: true, action: name, resultingState: parameters });
    },
  };
  const deps = {
    isOwnerUnlocked: async () => true,
    acquireMicrophone: async () => { acquires++; return shared; },
    releaseMicrophone: () => { releases++; },
    createPeerConnection: () => {
      const dc = {
        readyState: 'open',
        onmessage: null as any, onclose: null as any, onerror: null as any,
        send: (json: string) => sent.push(JSON.parse(json)),
        close() { this.readyState = 'closed'; },
      };
      const pc = {
        dc, closed: false, localDescription: null as any, remoteDescription: null as any,
        connectionState: 'new', tracks: [] as any[],
        ontrack: null as any, onconnectionstatechange: null as any,
        createDataChannel: () => dc,
        addTrack(t: MediaStreamTrack) { this.tracks.push(t); },
        createOffer: async () => ({ type: 'offer' as const, sdp: 'v=0\r\no=offer' }),
        async setLocalDescription(value: any) { this.localDescription = value; },
        async setRemoteDescription(value: any) { this.remoteDescription = value; },
        close() { this.closed = true; },
      };
      pcs.push(pc);
      return pc as unknown as RTCPeerConnection;
    },
    createAudio: () => ({
      muted: false, srcObject: null, play: async () => {}, pause() {}, remove() {},
    }) as unknown as HTMLAudioElement,
    createStream: (tracks: MediaStreamTrack[]) => stream(tracks as any),
    fetch: (async (_url: unknown, options: RequestInit) => {
      requests++;
      assert.equal((options.headers as Record<string, string>).Authorization, undefined);
      assert.equal(options.credentials, 'same-origin');
      assert.ok(JSON.parse(String(options.body)).sdp.startsWith('v=0'));
      return new Response('v=0\r\no=answer');
    }) as typeof fetch,
    connectionTimeoutMs: 2000,
  };
  function make(overrides: Partial<RealtimeBridgeDependencies> = {}) {
    const bridge = new OpenAiRealtimeVoiceBridge(callbacks, { ...deps, ...overrides });
    bridges.push(bridge);
    return bridge;
  }
  const emit = (event: object, pc = pcs.at(-1)) => pc.dc.onmessage?.({ data: JSON.stringify(event) });
  return { make, emit, states, transcripts, calls, sent, pcs, shared, callbacks,
    counts: () => ({ releases, acquires, requests }) };
}

test('all 27 signatures match the shared registry and existing typed dispatcher', () => {
  const tools = buildOpenAiRealtimeTools();
  assert.equal(tools.length, 27);
  assert.equal(new Set(tools.map(tool => tool.name)).size, 27);
  tools.forEach((tool, index) => {
    assert.equal(tool.type, 'function');
    assert.equal(tool.name, CRO_CDE_GOOGLE_TOOLS_SCHEMA[index].name);
    assert.deepEqual(tool.parameters, CRO_CDE_GOOGLE_TOOLS_SCHEMA[index].parameters);
  });
  assert.ok(auditToolRegistry().every(entry => entry.handlerImplemented));
  const session = buildOpenAiRealtimeSession();
  assert.equal(session.model, 'gpt-realtime');
  assert.equal(session.audio.input.turn_detection.interrupt_response, true);
});

test('WebRTC connects, reports truthful statuses and preserves transcript separation', async () => {
  const h = harness();
  const bridge = h.make();
  await bridge.connect();
  assert.equal(bridge.isLiveWebSocketOpen(), false);
  assert.equal(h.states.at(-1)?.state, 'Connecting');
  h.emit({ type: 'session.created' });
  assert.equal(bridge.isLiveWebSocketOpen(), true);
  assert.match(h.states.at(-1)?.detail || '', /OpenAI Voice · 27 Cerebro tools/);
  h.emit({ type: 'output_audio_buffer.started' });
  assert.equal(h.states.at(-1)?.state, 'Speaking');
  h.emit({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'u1', transcript: 'Open projects' });
  h.emit({ type: 'response.output_audio_transcript.done', item_id: 'a1', transcript: 'Opening projects.' });
  h.emit({ type: 'response.output_audio_transcript.done', item_id: 'a1', transcript: 'Opening projects.' });
  assert.equal(h.transcripts.length, 2);
  assert.equal(h.calls.length, 0, 'Raw user transcripts never execute tools');
  h.emit({ type: 'input_audio_buffer.speech_started' });
  assert.equal(h.states.at(-1)?.state, 'Listening');
  h.emit({ type: 'output_audio_buffer.stopped' });
  assert.equal(h.states.at(-1)?.state, 'Listening');
});

test('all 27 functions execute with named parameters; receipts precede one batch continuation', async () => {
  const h = harness();
  const bridge = h.make();
  await bridge.connect();
  h.emit({ type: 'session.created' });
  h.sent.length = 0;
  const output = CRO_CDE_GOOGLE_TOOLS_SCHEMA.map((tool, index) => {
    const schema = tool.parameters as { required?: readonly string[]; properties: Record<string, any> };
    const parameters = Object.fromEntries((schema.required || []).map(key => {
      const rule = schema.properties[key];
      return [key, rule.enum?.[0] ?? (rule.type === 'number' ? 1 : rule.type === 'object' ? {} : 'test')];
    }));
    return { type: 'function_call', call_id: `call-${index}`, name: tool.name, arguments: JSON.stringify(parameters) };
  });
  h.emit({ type: 'response.done', response: { status: 'completed', output } });
  await flush();
  assert.deepEqual(h.calls.map(call => call.name), CRO_CDE_GOOGLE_TOOLS_SCHEMA.map(tool => tool.name));
  assert.equal(h.sent.filter(event => event.item?.type === 'function_call_output').length, 27);
  assert.equal(h.sent.at(-1)?.type, 'response.create');
  assert.equal(h.sent.filter(event => event.type === 'response.create').length, 1);
  h.emit({ type: 'response.done', response: { status: 'completed', output } });
  await flush();
  assert.equal(h.calls.length, 27, 'Duplicate call IDs cannot repeat UI effects');
});

test('tool failures and malformed arguments return errors, not success receipts', async () => {
  assert.throws(() => parseRealtimeToolArguments('open_station', '{'), SyntaxError);
  assert.throws(() => parseRealtimeToolArguments('open_station', '{}'), /Missing required/);
  assert.throws(() => parseRealtimeToolArguments('open_station', '{"station":"invalid"}'), /Invalid parameter value/);
  assert.throws(() => parseRealtimeToolArguments('open_station', '[]'), /must be an object/);
  const h = harness();
  const bridge = h.make();
  await bridge.connect();
  h.emit({ type: 'session.created' });
  bridge.updateCallbacks({ ...h.callbacks, onClientToolCall: () => { throw new Error('UI unavailable'); } });
  h.emit({ type: 'response.done', response: { status: 'completed', output: [
    { type: 'function_call', call_id: 'bad1', name: 'delete_everything', arguments: '{}' },
    { type: 'function_call', call_id: 'bad2', name: 'get_page_state', arguments: '{}' },
  ] } });
  await flush();
  const receipts = h.sent.filter(event => event.item?.type === 'function_call_output');
  assert.equal(receipts.length, 2);
  assert.ok(receipts.every(event => JSON.parse(event.item.output).ok === false));
});

test('mute, interruption, disconnect and repeated calls release only owned mic tracks', async () => {
  const h = harness();
  const bridge = h.make();
  for (let i = 0; i < 3; i++) {
    await bridge.connect();
    h.emit({ type: 'session.created' });
    const pc = h.pcs.at(-1);
    h.emit({ type: 'response.created' });
    bridge.setMuted(true);
    assert.equal(pc.tracks[0].enabled, false);
    assert.equal(h.shared.getAudioTracks()[0].enabled, true, 'Other mic consumers remain enabled');
    assert.equal(h.states.at(-1)?.state, 'Muted');
    assert.ok(h.sent.some(event => event.type === 'response.cancel'));
    assert.ok(h.sent.some(event => event.type === 'output_audio_buffer.clear'));
    bridge.setMuted(false);
    assert.equal(pc.tracks[0].enabled, true);
    bridge.disconnect();
    assert.equal(pc.tracks[0].stopped, true);
    assert.equal(pc.closed, true);
  }
  assert.deepEqual(h.counts(), { acquires: 3, releases: 3, requests: 3 });
});

test('disconnect during mic permission cannot revive a stale call or leak its mic lease', async () => {
  const h = harness();
  let finish!: (stream: MediaStream) => void;
  const bridge = h.make({ acquireMicrophone: () => new Promise(resolve => { finish = resolve; }) });
  const pending = bridge.connect();
  await flush();
  bridge.disconnect();
  finish(h.shared);
  await pending;
  assert.equal(h.counts().releases, 1);
  assert.equal(h.counts().requests, 0);
  assert.equal(h.states.at(-1)?.state, 'Disconnected');
  assert.equal(bridge.isLiveWebSocketOpen(), false);
});

test('permission denial, locked owner access and provider errors are visible and retryable', async () => {
  const h = harness();
  let denied = true;
  const bridge = h.make({ acquireMicrophone: async () => {
    if (denied) throw new DOMException('Microphone permission denied', 'NotAllowedError');
    return h.shared;
  } });
  await bridge.connect();
  assert.equal(h.states.at(-1)?.state, 'Error');
  assert.match(h.states.at(-1)?.detail || '', /permission denied/);
  denied = false;
  await bridge.connect();
  h.emit({ type: 'session.created' });
  assert.equal(bridge.isLiveWebSocketOpen(), true);
  h.emit({ type: 'error', error: { code: 'authentication_error' } });
  assert.equal(h.states.at(-1)?.state, 'Error');
  assert.equal(h.counts().releases, 1);
  const signedOut = h.make({ isOwnerUnlocked: async () => false });
  await signedOut.connect();
  assert.match(h.states.at(-1)?.detail || '', /Unlock owner access/);
});

test('microphone interruption is visible, revoked input closes the call, and a fresh mic can reconnect', async () => {
  const h = harness();
  let input = track();
  const bridge = h.make({ acquireMicrophone: async () => stream([input]) });
  await bridge.connect();
  h.emit({ type: 'session.created' });
  input.muted = true;
  input.dispatchEvent(new Event('mute'));
  assert.equal(h.states.at(-1)?.state, 'Muted');
  assert.match(h.states.at(-1)?.detail || '', /Microphone unavailable/);
  h.emit({ type: 'output_audio_buffer.started' });
  assert.equal(h.states.at(-1)?.state, 'Muted', 'Provider events cannot hide an unavailable microphone');
  h.emit({ type: 'output_audio_buffer.stopped' });
  input.muted = false;
  input.dispatchEvent(new Event('unmute'));
  assert.equal(h.states.at(-1)?.state, 'Listening');
  input.stop();
  input.dispatchEvent(new Event('ended'));
  assert.equal(h.states.at(-1)?.state, 'Error');
  assert.match(h.states.at(-1)?.detail || '', /Microphone disconnected/);
  assert.equal(h.counts().releases, 1);
  assert.equal(h.pcs[0].closed, true);
  input = track();
  await bridge.retry();
  h.emit({ type: 'session.created' });
  assert.equal(bridge.isLiveWebSocketOpen(), true);
});

test('voice enables its own sender independently and rejects an empty or ended mic before signaling', async () => {
  const h = harness();
  const input = track();
  input.enabled = false;
  const bridge = h.make({ acquireMicrophone: async () => stream([input]) });
  await bridge.connect();
  assert.equal(h.pcs.at(-1).tracks[0].enabled, true);
  assert.equal(input.enabled, false);
  bridge.disconnect();
  for (const invalid of [stream([]), (() => { const ended = track(); ended.stop(); return stream([ended]); })()]) {
    const rejected = h.make({ acquireMicrophone: async () => invalid });
    const count = h.counts().requests;
    await rejected.connect();
    assert.equal(h.states.at(-1)?.state, 'Error');
    assert.match(h.states.at(-1)?.detail || '', /Microphone could not start/);
    assert.equal(h.counts().requests, count);
  }
});

test('busy microphone errors explain recovery and never call the voice provider', async () => {
  const h = harness();
  const bridge = h.make({ acquireMicrophone: async () => { throw new DOMException('Could not start audio source', 'NotReadableError'); } });
  await bridge.connect();
  assert.match(h.states.at(-1)?.detail || '', /Microphone unavailable or busy/);
  assert.equal(h.counts().requests, 0);
});

test('connection timeout closes resources and ignores stale data-channel callbacks', async () => {
  const h = harness();
  const bridge = h.make({ connectionTimeoutMs: 10 });
  await bridge.connect();
  const handler = h.pcs.at(-1).dc.onmessage;
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(h.states.at(-1)?.state, 'Error');
  assert.equal(h.counts().releases, 1);
  handler({ data: JSON.stringify({ type: 'session.created' }) });
  assert.equal(bridge.isLiveWebSocketOpen(), false);
});

test('context received before connection is refreshed without adding conversation messages', async () => {
  const h = harness();
  const bridge = h.make();
  bridge.sendContextualUpdate('{"screen":"S01"}');
  await bridge.connect();
  h.emit({ type: 'session.created' });
  bridge.sendContextualUpdate('{"screen":"S02"}');
  const updates = h.sent.filter(event => event.type === 'session.update');
  assert.equal(updates.length, 2);
  assert.match(updates.at(-1)?.session.instructions, /S02/);
  assert.ok(!h.sent.some(event => event.item?.type === 'message'));
});

test('a dropped connection can recover briefly; a persistent drop releases the mic and supports retry', async () => {
  const h = harness();
  const bridge = h.make({ reconnectTimeoutMs: 10 });
  await bridge.connect();
  h.emit({ type: 'session.created' });
  const pc = h.pcs.at(-1);
  pc.connectionState = 'disconnected';
  pc.onconnectionstatechange();
  assert.equal(h.states.at(-1)?.state, 'Reconnecting');
  pc.connectionState = 'connected';
  pc.onconnectionstatechange();
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(bridge.isLiveWebSocketOpen(), true);
  pc.connectionState = 'disconnected';
  pc.onconnectionstatechange();
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(h.states.at(-1)?.state, 'Error');
  assert.equal(h.counts().releases, 1);
  await bridge.retry();
  h.emit({ type: 'session.created' });
  assert.equal(bridge.isLiveWebSocketOpen(), true);
  assert.equal(h.pcs.length, 2);
});

test('audio teardown errors cannot strand sender tracks or the shared mic lease', async () => {
  const h = harness();
  const bridge = h.make({ createAudio: () => ({
    muted: false, srcObject: null, play: async () => {},
    pause() { throw new Error('DOM audio teardown failed'); },
    remove() { throw new Error('DOM removal failed'); },
  }) as unknown as HTMLAudioElement });
  await bridge.connect();
  assert.doesNotThrow(() => bridge.disconnect());
  assert.equal(h.counts().releases, 1);
  assert.equal(h.pcs.at(-1).tracks[0].stopped, true);
  assert.equal(h.pcs.at(-1).closed, true);
});

test('a tool completing during barge-in cannot create an overlapping model response', async () => {
  const h = harness();
  const bridge = h.make();
  await bridge.connect();
  h.emit({ type: 'session.created' });
  let finish!: (value: string) => void;
  bridge.updateCallbacks({ ...h.callbacks, onClientToolCall: () => new Promise(resolve => { finish = resolve; }) });
  h.emit({ type: 'response.done', response: { status: 'completed', output: [
    { type: 'function_call', call_id: 'slow-ui', name: 'get_page_state', arguments: '{}' },
  ] } });
  await flush();
  h.emit({ type: 'input_audio_buffer.speech_started' });
  h.emit({ type: 'input_audio_buffer.speech_stopped' });
  h.emit({ type: 'response.created' });
  h.sent.length = 0;
  finish('{"ok":true}');
  await flush();
  assert.equal(h.sent.filter(event => event.type === 'response.create').length, 0);
  assert.equal(h.sent.filter(event => event.item?.type === 'function_call_output').length, 1);
  h.emit({ type: 'response.done', response: { status: 'completed', output: [] } });
  assert.equal(h.sent.filter(event => event.type === 'response.create').length, 1);
});

test('provider billing and rate metadata survive signaling errors and still release the microphone', async () => {
  for (const code of ['credit_balance_exhausted', 'slow_down']) {
    const h = harness();
    const failure = describeOpenAiFailure(429, { code }, 20);
    const bridge = h.make({ fetch: async () => new Response(JSON.stringify(failure), { status: 429 }) });
    await bridge.connect();
    assert.deepEqual(h.states.at(-1)?.failure, failure);
    assert.equal(h.states.at(-1)?.detail, failure.error);
    assert.equal(h.counts().releases, 1);
    assert.equal(h.pcs[0].closed, true);
  }
});

test('Realtime response failures retain the specific quota category without leaking raw messages', async () => {
  const h = harness(); const bridge = h.make(); await bridge.connect();
  h.emit({ type: 'response.done', response: { status: 'failed', status_details: { error: {
    code: 'project_spend_limit_exceeded', message: 'private-provider-detail', type: 'insufficient_quota',
  } } } });
  assert.equal(h.states.at(-1)?.failure?.code, 'project_spend_limit_exceeded');
  assert.equal(h.counts().releases, 1);
  assert.ok(!JSON.stringify(h.states).includes('private-provider-detail'));
});

test('double connect is idempotent; a failed session request releases mic and stays retryable', async () => {
  const h = harness();
  const bridge = h.make({ fetch: async () => new Response(JSON.stringify({ error: 'OpenAI Voice is not configured.' }), { status: 503 }) });
  await Promise.all([bridge.connect(), bridge.connect()]);
  assert.equal(h.pcs.length, 1);
  assert.equal(h.counts().releases, 1);
  assert.equal(h.states.at(-1)?.state, 'Error');
  assert.match(h.states.at(-1)?.detail || '', /not configured/);
  await bridge.connect();
  assert.equal(h.pcs.length, 2);
  assert.equal(h.counts().releases, 2);
});

test('disconnect aborts pending signaling and drops results from an in-flight tool', async () => {
  const h = harness();
  let signal: AbortSignal | undefined;
  const pending = h.make({ fetch: async (_url, options) => {
    signal = options?.signal as AbortSignal;
    return new Promise<Response>((_resolve, reject) => signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
  } });
  const connecting = pending.connect();
  await flush();
  pending.disconnect();
  await connecting;
  assert.equal(signal?.aborted, true);
  assert.equal(h.counts().releases, 1);

  const bridge = h.make();
  await bridge.connect();
  h.emit({ type: 'session.created' });
  let finish!: (result: string) => void;
  bridge.updateCallbacks({ ...h.callbacks, onClientToolCall: () => new Promise(resolve => { finish = resolve; }) });
  h.emit({ type: 'response.done', response: { status: 'completed', output: [
    { type: 'function_call', call_id: 'late', name: 'get_page_state', arguments: '{}' },
  ] } });
  await flush();
  bridge.disconnect();
  const count = h.sent.length;
  finish('{"ok":true}');
  await flush();
  assert.equal(h.sent.length, count, 'No tool receipt or model response after disconnect');
});

test('a late browser permission grant after timeout stops the orphaned hardware track', async () => {
  const previous = navigator.mediaDevices;
  let finish!: (value: MediaStream) => void;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: () => new Promise<MediaStream>(resolve => { finish = resolve; }),
  } });
  try {
    const pending = requestUserMedia({ audio: true }, { timeoutMs: 5 });
    await assert.rejects(pending, /timed out/);
    const late = stream();
    finish(late);
    await flush();
    assert.equal(late.getAudioTracks()[0].readyState, 'ended');
  } finally {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: previous });
  }
});
