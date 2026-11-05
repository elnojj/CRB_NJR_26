import { createOwnerAccessVerifier, createOwnerAccessHandler } from '../server/ownerAccess';
import { getOwnerAccessToken, unlockOwnerAccess, lockOwnerAccess } from '../../voice/ownerAccess';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import type { Request, Response as ExpressResponse } from 'express';
import { createOpenAiRealtimeHandler } from '../server/sessionHandler';

function request(overrides: Record<string, unknown> = {}): Request {
  return {
    method: 'POST', headers: { authorization: 'Bearer owner-access-code-for-tests-1234567890' },
    body: { sdp: 'v=0\r\no=offer' }, ...overrides,
  } as Request;
}
function response() {
  const result = { status: 0, body: undefined as unknown, headers: {} as Record<string, unknown> };
  const res = {
    setHeader(key: string, value: unknown) { result.headers[key] = value; return res; },
    status(code: number) { result.status = code; return res; },
    json(body: unknown) { result.body = body; return res; },
    send(body: unknown) { result.body = body; return res; },
  };
  return { result, res: res as unknown as ExpressResponse };
}
const env = { OPENAI_API_KEY: 'server-only-test-key', CEREBRO_OWNER_ACCESS_CODE: 'owner-access-code-for-tests-1234567890' };

test('authenticated session configures gpt-realtime and all tools; only SDP returns to client', async () => {
  let upstreamCalls = 0;
  const handler = createOpenAiRealtimeHandler({
    env,
    fetch: (async (url, options) => {
      upstreamCalls++;
      assert.equal(url, 'https://api.openai.com/v1/realtime/calls');
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers.Authorization, 'Bearer server-only-test-key');
      assert.equal(headers['OpenAI-Safety-Identifier'].length, 64);
      assert.ok(!headers['OpenAI-Safety-Identifier'].includes(env.CEREBRO_OWNER_ACCESS_CODE));
      const form = options?.body as FormData;
      assert.equal(form.get('sdp'), 'v=0\r\no=offer');
      const session = JSON.parse(String(form.get('session')));
      assert.equal(session.type, 'realtime');
      assert.equal(session.model, 'gpt-realtime');
      assert.equal(session.tools.length, 27);
      assert.ok(session.tools.every((tool: { type: string }) => tool.type === 'function'));
      return new Response('v=0\r\no=answer');
    }) as typeof fetch,
  });
  const { result, res } = response();
  await handler(request({ body: { sdp: 'v=0\r\no=offer', model: 'ignored-client-model' } }), res);
  assert.equal(upstreamCalls, 1);
  assert.equal(result.status, 200);
  assert.equal(result.body, 'v=0\r\no=answer');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.headers['Content-Type'], 'application/sdp');
  assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
});

test('method, owner code, configuration, SDP and cross-site failures never call OpenAI', async () => {
  const cases = [
    { req: request({ method: 'GET' }), env, expected: 405 },
    { req: request({ headers: { 'x-cerebro-audience': 'Owner only' } }), env, expected: 401 },
    { req: request({ headers: { authorization: 'Bearer wrong-owner-code' } }), env, expected: 401 },
    { req: request(), env: { CEREBRO_OWNER_ACCESS_CODE: env.CEREBRO_OWNER_ACCESS_CODE }, expected: 503 },
    { req: request(), env: { OPENAI_API_KEY: 'test-key' }, expected: 503 },
    { req: request({ body: { sdp: 'not SDP' } }), env, expected: 400 },
    { req: request({ body: { sdp: `v=0${'x'.repeat(65536)}` } }), env, expected: 400 },
    { req: request({ headers: { authorization: `Bearer ${env.CEREBRO_OWNER_ACCESS_CODE}`, 'sec-fetch-site': 'cross-site' } }), env, expected: 403 },
  ];
  for (const entry of cases) {
    const handler = createOpenAiRealtimeHandler({
      env: entry.env,
      fetch: async () => { throw new Error('OpenAI must not be called'); },
    });
    const { result, res } = response();
    await handler(entry.req, res);
    assert.equal(result.status, entry.expected);
  }
});

test('upstream quota, invalid model and network failures return safe retryable errors', async () => {
  for (const code of [401, 403, 429, 500]) {
    const handler = createOpenAiRealtimeHandler({
      env,
      fetch: async () => new Response('private error with server-only-test-key', { status: code }),
    });
    const { result, res } = response();
    await handler(request(), res);
    assert.equal(result.status, code === 429 ? 429 : 502);
    assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
  }
  const timeout = createOpenAiRealtimeHandler({ env, fetch: async () => {
    throw new DOMException('private detail', 'TimeoutError');
  } });
  const { result, res } = response();
  await timeout(request(), res);
  assert.equal(result.status, 504);
});

test('owner verification rejects missing/weak configuration and throttles repeated failures', () => {
  const valid = request();
  assert.equal(createOwnerAccessVerifier(env)(valid).ok, true);
  assert.equal(createOwnerAccessVerifier({ CEREBRO_OWNER_ACCESS_CODE: '3939' })(valid).ok, false);
  let time = 1000;
  const verify = createOwnerAccessVerifier(env, () => time);
  const wrong = request({ headers: { authorization: 'Bearer invalid' } });
  for (let n = 0; n < 8; n++) assert.equal((verify(wrong) as { status: number }).status, 401);
  assert.equal((verify(wrong) as { status: number }).status, 429);
  time += 60001;
  assert.equal(verify(valid).ok, true);
});

test('owner unlock endpoint never returns the owner code or the OpenAI key', () => {
  const handler = createOwnerAccessHandler(env);
  const { result, res } = response();
  handler(request(), res);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { unlocked: true });
  assert.ok(!JSON.stringify(result).includes(env.CEREBRO_OWNER_ACCESS_CODE));
  assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
});

test('the client unlocks only after server verification and clears access on locking or rejection', async () => {
  lockOwnerAccess();
  await assert.rejects(unlockOwnerAccess(env.CEREBRO_OWNER_ACCESS_CODE, async () => new Response('{}', { status: 401 })), /not accepted/);
  assert.equal(await getOwnerAccessToken(), null);
  await unlockOwnerAccess(env.CEREBRO_OWNER_ACCESS_CODE, async () => new Response(JSON.stringify({ unlocked: true })));
  assert.equal(await getOwnerAccessToken(), env.CEREBRO_OWNER_ACCESS_CODE);
  lockOwnerAccess();
  assert.equal(await getOwnerAccessToken(), null);
});

test('locking during a pending unlock cannot be undone by its late server response', async () => {
  let finish!: (response: globalThis.Response) => void;
  const pending = unlockOwnerAccess(env.CEREBRO_OWNER_ACCESS_CODE, () => new Promise(resolve => { finish = resolve; }));
  lockOwnerAccess();
  finish(new Response(JSON.stringify({ unlocked: true })));
  await assert.rejects(pending, /cancelled/);
  assert.equal(await getOwnerAccessToken(), null);
});

test('disconnecting the HTTP client aborts upstream signaling and removes lifecycle listeners', async () => {
  const req = Object.assign(new EventEmitter(), request()) as unknown as Request;
  const { result, res } = response();
  const connection = Object.assign(new EventEmitter(), res) as unknown as ExpressResponse;
  let signal: AbortSignal | undefined;
  const handler = createOpenAiRealtimeHandler({ env, fetch: async (_url, options) => {
    signal = options?.signal as AbortSignal;
    return new Promise<Response>((_resolve, reject) => signal!.addEventListener('abort', () => {
      reject(new DOMException('Cancelled', 'AbortError'));
    }));
  } });
  const pending = handler(req, connection);
  await new Promise<void>(resolve => setImmediate(resolve));
  connection.emit('close');
  await pending;
  assert.equal(signal?.aborted, true);
  assert.equal(result.status, 0, 'No error body is sent to the disconnected client');
  assert.equal(connection.listenerCount('close'), 0);
  assert.equal(req.listenerCount('aborted'), 0);
});
