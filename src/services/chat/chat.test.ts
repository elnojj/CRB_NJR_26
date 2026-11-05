import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response as ExpressResponse } from 'express';
import { createOwnerAccessHandler, createOwnerAccessVerifier, OWNER_SESSION_COOKIE } from '../openai-realtime/server/ownerAccess';
import { createCerebroChatHandler } from './server/chatHandler';
import { createOpenAiRealtimeHandler } from '../openai-realtime/server/sessionHandler';
import { sendCerebroChatTurn, ChatServiceError } from './chatClient';
import { hasOwnerAccessSession, restoreOwnerAccess, invalidateOwnerAccess } from '../voice/ownerAccess';

const env = { OPENAI_API_KEY: 'test-openai-private-key', CEREBRO_OWNER_ACCESS_CODE: 'test-owner-private-code-123456789' };
const req = (overrides = {}) => ({ method: 'POST', headers: { authorization: `Bearer ${env.CEREBRO_OWNER_ACCESS_CODE}` }, body: { message: 'Hello' }, ...overrides } as Request);
function response() {
  const result = { status: 0, body: undefined as any, headers: {} as Record<string, string> };
  const res = { setHeader(key: string, value: string) { result.headers[key] = value; }, status(status: number) { result.status = status; return res; }, json(body: unknown) { result.body = body; return res; } };
  return { result, res: res as unknown as ExpressResponse };
}
function login(remember = true, time = Date.now()) {
  const { result, res } = response();
  createOwnerAccessHandler(env, () => time)(req({ body: { remember } }), res);
  assert.equal(result.status, 200);
  return { ...result, cookie: result.headers['Set-Cookie'].split(';')[0] };
}

test('remembered access uses a host-only HttpOnly cookie and survives a fresh client session', async () => {
  const signed = login();
  assert.match(signed.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Strict; Max-Age=2592000/);
  assert.ok(signed.cookie.startsWith(`${OWNER_SESSION_COOKIE}=`));
  assert.ok(!signed.headers['Set-Cookie'].includes(env.CEREBRO_OWNER_ACCESS_CODE));
  assert.ok(!signed.headers['Set-Cookie'].includes('Domain='));
  assert.deepEqual(signed.body, { unlocked: true });
  invalidateOwnerAccess();
  assert.equal(await hasOwnerAccessSession(), false);
  await restoreOwnerAccess(async (_url, options) => {
    assert.equal(options?.credentials, 'same-origin');
    const { result, res } = response();
    createOwnerAccessHandler(env)(req({ method: 'GET', headers: { cookie: signed.cookie } }), res);
    return new Response(JSON.stringify(result.body), { status: result.status });
  });
  assert.equal(await hasOwnerAccessSession(), true);
  invalidateOwnerAccess();
});

test('expired, tampered, rotated and cross-site sessions fail; logout clears the cookie', () => {
  const time = Date.now(), signed = login(true, time);
  const request = req({ headers: { cookie: signed.cookie } });
  assert.equal(createOwnerAccessVerifier(env, () => time)(request).ok, true);
  assert.equal(createOwnerAccessVerifier(env, () => time + 31 * 86400000)(request).ok, false);
  assert.equal(createOwnerAccessVerifier({ ...env, CEREBRO_OWNER_ACCESS_CODE: 'replacement-owner-code-123456789' })(request).ok, false);
  assert.equal(createOwnerAccessVerifier(env)(req({ headers: { cookie: `${signed.cookie.slice(0, -3)}AAA` } })).ok, false);
  assert.equal(createOwnerAccessVerifier(env)(req({ headers: { cookie: signed.cookie, 'sec-fetch-site': 'cross-site' } })).ok, false);
  assert.equal(createOwnerAccessVerifier(env)(req({ headers: { cookie: signed.cookie, host: 'cerebro.example', origin: 'https://other.example' } })).ok, false);
  const { result, res } = response();
  createOwnerAccessHandler(env)(req({ method: 'DELETE', headers: { cookie: signed.cookie } }), res);
  assert.match(result.headers['Set-Cookie'], /Max-Age=0/);
  assert.deepEqual(result.body, { unlocked: false });
  assert.doesNotMatch(login(false).headers['Set-Cookie'], /Max-Age/);
});

test('a late restore cannot unlock a locally locked client', async () => {
  let finish!: (value: Response) => void;
  const pending = restoreOwnerAccess(() => new Promise(resolve => { finish = resolve; }));
  invalidateOwnerAccess();
  finish(new Response(JSON.stringify({ unlocked: true })));
  assert.equal(await pending, false);
});

test('chat and voice share the cookie; chat uses the configured OpenAI key and truthful live text', async () => {
  const signed = login();
  let calls = 0;
  const handler = createCerebroChatHandler({ env, fetch: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal((options?.headers as Record<string, string>).Authorization, `Bearer ${env.OPENAI_API_KEY}`);
    const body = JSON.parse(String(options?.body));
    assert.equal(body.model, 'gpt-5.4-mini');
    assert.equal(body.store, false);
    assert.equal(body.input.at(-1).content, 'Return exactly KR-CHAT-OK');
    assert.ok(!JSON.stringify(body).includes(env.CEREBRO_OWNER_ACCESS_CODE));
    return new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'KR-CHAT-OK' }] }] }));
  } });
  const { result, res } = response();
  await handler(req({ headers: { cookie: signed.cookie }, body: { message: '[project:SEVEN] Return exactly KR-CHAT-OK', model: 'client-model-must-be-ignored' } }), res);
  assert.equal(calls, 1);
  assert.equal(result.body.mode, 'live');
  assert.equal(result.body.reply, 'KR-CHAT-OK');
  assert.equal(createOwnerAccessVerifier(env)(req({ headers: { cookie: signed.cookie } })).ok, true);
  let voiceCalls = 0;
  const voice = createOpenAiRealtimeHandler({ env, fetch: async () => { voiceCalls++; return new Response('v=0\r\no=answer'); } });
  const voiceResponse = response();
  (voiceResponse.res as any).send = (body: unknown) => { voiceResponse.result.body = body; return voiceResponse.res; };
  await voice(req({ headers: { cookie: signed.cookie }, body: { sdp: 'v=0\r\no=offer' } }), voiceResponse.res);
  assert.equal(voiceResponse.result.status, 200);
  assert.equal(voiceCalls, 1);
});

test('locked chat never calls OpenAI, and quota errors stay distinct from owner authentication', async () => {
  let calls = 0;
  const handler = createCerebroChatHandler({ env, fetch: async () => { calls++; return new Response('private-provider-detail', { status: 429 }); } });
  const locked = response();
  await handler(req({ headers: {} }), locked.res);
  assert.equal(locked.result.status, 401);
  assert.equal(calls, 0);
  const quota = response();
  await handler(req(), quota.res);
  assert.equal(quota.result.status, 429);
  assert.equal(quota.result.body.reply, undefined);
  assert.equal(quota.result.body.code, 'usage_limit_unknown');
  assert.equal(quota.result.body.retryable, false);
  assert.ok(!JSON.stringify(quota.result).includes('private-provider-detail'));
  await assert.rejects(sendCerebroChatTurn({ message: 'Retry', history: [] }, async () => new Response(JSON.stringify(quota.result.body), { status: 429 })), error => error instanceof ChatServiceError && error.status === 429);
});
