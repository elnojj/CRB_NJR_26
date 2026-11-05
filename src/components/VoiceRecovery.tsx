import React from 'react';
import type { OpenAiFailure } from '../services/openai-errors';

export function VoiceRecovery({ detail, failure, onRetry, onReset, onClose }: {
  detail: string; failure?: OpenAiFailure | null;
  onRetry: () => void; onReset: () => void; onClose: () => void;
}) {
  const account = failure?.kind === 'billing' || failure?.kind === 'limit';
  const configuration = failure?.kind === 'configuration';
  const microphone = !failure && /microphone|input device/i.test(detail);
  return <section className="cerebro-voice-access" aria-label="Voice recovery">
    <strong>{account ? 'OpenAI account access' : failure?.kind === 'rate-limit' ? 'OpenAI request limit' : 'Voice connection'}</strong>
    <p role="status">{detail}</p>
    {account && <a href="https://platform.openai.com/" target="_blank" rel="noreferrer">Open OpenAI dashboard</a>}
    {configuration && <a href="https://vercel.com/tarek-nojara/cerebro-core" target="_blank" rel="noreferrer">Open project settings</a>}
    {microphone && <button type="button" onClick={onReset}>Reset microphone</button>}
    <button type="button" onClick={onRetry}>{failure && !failure.retryable ? 'Recheck connection' : 'Retry call'}</button>
    <button type="button" onClick={onClose}>Close</button>
  </section>;
}
