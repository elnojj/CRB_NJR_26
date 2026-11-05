import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpenAiRealtimeHandler } from './openai-realtime/server/sessionHandler.ts';
import { createCerebroChatHandler } from './chat/server/chatHandler.ts';
import { describeOpenAiFailure, readOpenAiFailure, readRetryAfter, openAiRetryBlock } from './openai-errors.ts';
import type { Request, Response as ExpressResponse } from 'express';

test('every documented billing/usage code stays distinct from temporary rate limiting', () => {
  for (const code of ['credit_balance_exhausted', 'project_spend_limit_exceeded', 'organization_spend_limit_exceeded', 'organization_usage_limit_exceeded', 'insufficient_quota']) {
    const failure = describeOpenAiFailure(429, { code, type: 'insufficient_quota' });
    assert.equal(failure.code, code);
    assert.equal(failure.kind, 'billing');
    assert.equal(failure.retryable, false);
    assert.doesNotMatch(failure.error, /try again shortly|busy/i);
  }
  for (const code of ['rate_limit_exceeded', 'slow_down']) {
    const failure = describeOpenAiFailure(429, { code, type: 'rate_limit_error' }, 23);
    assert.equal(failure.kind, 'rate-limit');
    assert.equal(failure.retryable, true);
    assert.equal(failure.retryAfterSeconds, 23);
    assert.match(failure.error, /23 seconds/);
  }
});

test('opaque 429 responses remain unknown rather than inventing a billing diagnosis', async () => {
  const failure = await readOpenAiFailure(new Response('private-provider-detail', { status: 429 }));
  assert.equal(failure.code, 'usage_limit_unknown');
  assert.equal(failure.retryable, false);
  assert.ok(!JSON.stringify(failure).includes('private-provider-detail'));
});

test('Retry-After supports delay and HTTP dates; voice retries respect the deadline and require an explicit account recheck', () => {
  const now = Date.parse('2026-11-05T09:00:00Z');
  assert.equal(readRetryAfter('12.2', now), 13);
  assert.equal(readRetryAfter('Thu, 05 Nov 2026 09:00:45 GMT', now), 45);
  assert.equal(readRetryAfter('invalid', now), undefined);
  assert.equal(readRetryAfter('-10', now), undefined);
  const rate = describeOpenAiFailure(429, { code: 'slow_down' }, 20);
  assert.match(openAiRetryBlock(rate, now + 20000, now, true) || '', /20 seconds/);
  assert.equal(openAiRetryBlock(rate, now + 20000, now + 20000), null);
  const billing = describeOpenAiFailure(429, { code: 'credit_balance_exhausted' });
  assert.equal(openAiRetryBlock(billing, 0, now), billing.error);
  assert.equal(openAiRetryBlock(billing, 0, now, true), null);
});

test('Chat and Voice return only safe categories, preserve Retry-After, and keep upstream auth separate from owner access', async () => {
  const env = { OPENAI_API_KEY: 'private-test-key', CEREBRO_OWNER_ACCESS_CODE: 'owner-code-for-tests-1234567890' };
  for (const handlerFactory of [createCerebroChatHandler, createOpenAiRealtimeHandler]) {
    for (const [status, code] of [[429, 'credit_balance_exhausted'], [429, 'rate_limit_exceeded'], [401, 'invalid_api_key']] as const) {
      const handler = handlerFactory({ env, fetch: async () => new Response(JSON.stringify({ error: {
        code, message: 'private-test-key and private request detail', organization: 'private-id',
      } }), { status, headers: { 'Retry-After': '25' } }) });
      const result = { status: 0, body: {} as any, headers: {} as Record<string, unknown> };
      const res = {
        setHeader(key: string, value: unknown) { result.headers[key] = value; return this; },
        status(value: number) { result.status = value; return this; },
        json(value: unknown) { result.body = value; return this; },
      } as unknown as ExpressResponse;
      await handler({ method: 'POST', headers: { authorization: `Bearer ${env.CEREBRO_OWNER_ACCESS_CODE}` }, body: { message: 'Hello', sdp: 'v=0\r\no=offer' } } as Request, res);
      assert.equal(result.status, status === 429 ? 429 : 502);
      assert.equal(result.headers['Retry-After'], '25');
      assert.equal(result.body.kind, status === 401 ? 'configuration' : code === 'credit_balance_exhausted' ? 'billing' : 'rate-limit');
      assert.ok(!JSON.stringify(result).includes('private-test-key'));
      assert.ok(!JSON.stringify(result).includes('private-id'));
      assert.ok(!JSON.stringify(result).includes('private request detail'));
    }
  }
});
