import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VoiceRecovery } from './VoiceRecovery.tsx';
import { describeOpenAiFailure } from '../services/openai-errors.ts';

test('provider errors show account/retry actions, while only microphone errors show Reset microphone', () => {
  const render = (detail: string, failure?: ReturnType<typeof describeOpenAiFailure>) => renderToStaticMarkup(React.createElement(VoiceRecovery, {
    detail, failure, onRetry() {}, onReset() {}, onClose() {},
  }));
  const billing = describeOpenAiFailure(429, { code: 'credit_balance_exhausted' });
  const billingView = render(billing.error, billing);
  assert.match(billingView, /Open OpenAI dashboard/);
  assert.match(billingView, /Recheck connection/);
  assert.doesNotMatch(billingView, /Reset microphone/);
  const rate = describeOpenAiFailure(429, { code: 'slow_down' });
  assert.match(render(rate.error, rate), /Retry call/);
  assert.doesNotMatch(render(rate.error, rate), /Reset microphone/);
  assert.match(render('Microphone unavailable or busy. Check your input device.'), /Reset microphone/);
  assert.doesNotMatch(render('OpenAI Voice connection timed out.'), /Reset microphone/);
});
