import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VoiceBridgeCallbacks } from './types';
import { forwardVoiceCallbacks } from './liveCallbacks';
import { describeOpenAiFailure } from '../openai-errors';

test('a callback refresh preserves provider diagnostics and sends events only to the current handlers', async () => {
  const events: Array<{ owner: string; args: unknown[] }> = [];
  const callbacks = (owner: string): VoiceBridgeCallbacks => ({
    onStatusChange: (...args) => { events.push({ owner, args }); },
    onTranscript: (...args) => { events.push({ owner, args }); },
    onClientToolCall: async (...args) => { events.push({ owner, args }); return owner; },
    onAudioLevel: (...args) => { events.push({ owner, args }); },
  });
  const source = { current: callbacks('initial') };
  const live = forwardVoiceCallbacks(source);
  const quota = describeOpenAiFailure(429, { code: 'credit_balance_exhausted' });
  live.onStatusChange('Error', quota.error, quota);
  assert.deepEqual(events.pop(), { owner: 'initial', args: ['Error', quota.error, quota] });
  source.current = callbacks('after navigation');
  const rate = describeOpenAiFailure(429, { code: 'slow_down' }, 31);
  live.onStatusChange('Error', rate.error, rate);
  assert.deepEqual(events.pop(), { owner: 'after navigation', args: ['Error', rate.error, rate] });
  live.onTranscript('agent', 'Actual transcript');
  assert.deepEqual(events.pop(), { owner: 'after navigation', args: ['agent', 'Actual transcript'] });
  assert.equal(await live.onClientToolCall('get_page_state', {}), 'after navigation');
  assert.deepEqual(events.pop(), { owner: 'after navigation', args: ['get_page_state', {}] });
  live.onAudioLevel?.(0.3);
  assert.deepEqual(events.pop(), { owner: 'after navigation', args: [0.3] });
  delete source.current.onAudioLevel;
  assert.doesNotThrow(() => live.onAudioLevel?.(0.2));
});
