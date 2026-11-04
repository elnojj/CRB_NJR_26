import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response as ExpressResponse } from 'express';
import { createOpenAiRealtimeHandler, verifyVoiceIdentity } from './openAiRealtime';

function request(overrides: Record<string, unknown> = {}): Request {
  return {
    method: 'POST', headers: { authorization: 'Bearer valid-firebase-id' },
    body: { sdp: 'v=0\r\no=offer' }, ...overrides,
  } as Request;
}
function response() {
  const result = { status: 0, body: undefined as unknown, headers: {} as Record<string, unknown> };
  const res = {
    setHeader(key: string, value: unknown) { result.headers[key] = value; return res; },
    status(code: number) { result.status = code; return res; },
    json(body: unknown) { result.body = body; return res; },
    type(type: string) { result.headers['Content-Type'] = type; return res; },
    send(body: unknown) { result.body = body; return res; },
  };
  return { result, res: res as unknown as ExpressResponse };
}
const env = { OPENAI_API_KEY: 'server-only-test-key' };
const identity = async () => ({ uid: 'signed-in-user' });

test('authenticated session configures gpt-realtime and all tools; only SDP returns to client', async () => {
  let upstreamCalls = 0;
  const handler = createOpenAiRealtimeHandler({
    env, verifyIdentity: identity,
    fetch: (async (url, options) => {
      upstreamCalls++;
      assert.equal(url, 'https://api.openai.com/v1/realtime/calls');
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers.Authorization, 'Bearer server-only-test-key');
      assert.equal(headers['OpenAI-Safety-Identifier'].length, 64);
      assert.ok(!headers['OpenAI-Safety-Identifier'].includes('signed-in-user'));
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

test('method, sign-in, revoked identity, allowlist, config, SDP and cross-site failures never call OpenAI', async () => {
  const cases = [
    { req: request({ method: 'GET' }), env, verifyIdentity: identity, expected: 405 },
    { req: request({ headers: { 'x-cerebro-audience': 'Owner only' } }), env, verifyIdentity: identity, expected: 401 },
    { req: request(), env, verifyIdentity: async () => null, expected: 401 },
    { req: request(), env: { ...env, CEREBRO_VOICE_ALLOWED_UIDS: 'another-user' }, verifyIdentity: identity, expected: 403 },
    { req: request(), env: {}, verifyIdentity: identity, expected: 503 },
    { req: request({ body: { sdp: 'not SDP' } }), env, verifyIdentity: identity, expected: 400 },
    { req: request({ body: { sdp: `v=0${'x'.repeat(65536)}` } }), env, verifyIdentity: identity, expected: 400 },
    { req: request({ headers: { authorization: 'Bearer valid', 'sec-fetch-site': 'cross-site' } }), env, verifyIdentity: identity, expected: 403 },
  ];
  for (const entry of cases) {
    const handler = createOpenAiRealtimeHandler({
      env: entry.env, verifyIdentity: entry.verifyIdentity,
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
      env, verifyIdentity: identity,
      fetch: async () => new Response('private error with server-only-test-key', { status: code }),
    });
    const { result, res } = response();
    await handler(request(), res);
    assert.equal(result.status, code === 429 ? 429 : 502);
    assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
  }
  const timeout = createOpenAiRealtimeHandler({ env, verifyIdentity: identity, fetch: async () => {
    throw new DOMException('private detail', 'TimeoutError');
  } });
  const { result, res } = response();
  await timeout(request(), res);
  assert.equal(result.status, 504);
});

test('Firebase account lookup validates the identity token and rejects disabled/invalid accounts', async () => {
  const seen: unknown[] = [];
  const fetcher = (async (_url, options) => {
    seen.push(JSON.parse(String(options?.body)));
    return new Response(JSON.stringify({ users: [{ localId: 'uid-123' }] }));
  }) as typeof fetch;
  assert.deepEqual(await verifyVoiceIdentity('firebase-token', fetcher), { uid: 'uid-123' });
  assert.deepEqual(seen, [{ idToken: 'firebase-token' }]);
  assert.equal(await verifyVoiceIdentity('invalid', async () => new Response('{}', { status: 400 })), null);
  assert.equal(await verifyVoiceIdentity('disabled', async () => new Response(JSON.stringify({
    users: [{ localId: 'uid-123', disabled: true }],
  }))), null);
});
