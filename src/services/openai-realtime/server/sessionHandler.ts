import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { createOwnerAccessVerifier } from './ownerAccess';
import { readOpenAiRealtimeServerSettings } from './settings';
import { buildOpenAiRealtimeSession } from '../sessionConfig';
import { readOpenAiFailure } from '../../openai-errors';

type Options = {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
};

/** Shared by Express and the Vercel function. Only SDP crosses back to the browser. */
export function createOpenAiRealtimeHandler(options: Options = {}) {
  const settings = readOpenAiRealtimeServerSettings(options.env ?? process.env);
  const fetcher = options.fetch ?? fetch;
  const verifyAccess = createOwnerAccessVerifier(options.env ?? process.env);

  return async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Use POST to start an OpenAI Voice session.' });
      return;
    }
    const access = verifyAccess(req);
    if (access.ok === false) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const cancelled = new AbortController();
    const cancel = () => cancelled.abort();
    const onClose = () => { if (!res.writableEnded) cancel(); };
    req.once?.('aborted', cancel);
    res.once?.('close', onClose);
    try {
      if (!settings.apiKey) {
        res.status(503).json({ error: 'OpenAI Voice is not configured. Set OPENAI_API_KEY on the server.' });
        return;
      }
      const sdp = req.body?.sdp;
      if (typeof sdp !== 'string' || !sdp.startsWith('v=0') || sdp.length > 65536) {
        res.status(400).json({ error: 'A valid WebRTC SDP offer is required.' });
        return;
      }
      const form = new FormData();
      form.set('sdp', sdp);
      form.set('session', JSON.stringify(buildOpenAiRealtimeSession(
        settings.model,
        settings.voice
      )));
      const upstream = await fetcher('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'OpenAI-Safety-Identifier': createHash('sha256').update('cerebro-owner').digest('hex'),
        },
        body: form,
        signal: AbortSignal.any([cancelled.signal, AbortSignal.timeout(settings.requestTimeoutMs)]),
      });
      if (cancelled.signal.aborted) return;
      if (!upstream.ok) {
        const failure = await readOpenAiFailure(upstream);
        if (failure.retryAfterSeconds) res.setHeader('Retry-After', String(failure.retryAfterSeconds));
        res.status(upstream.status === 429 ? 429 : 502).json(failure);
        return;
      }
      const answer = await upstream.text();
      if (cancelled.signal.aborted) return;
      if (!answer.startsWith('v=0')) {
        res.status(502).json({ error: 'OpenAI Voice returned an invalid WebRTC answer.' });
        return;
      }
      // Vercel's Node response supports setHeader/status/send, but not Express's type() helper.
      res.setHeader('Content-Type', 'application/sdp');
      res.status(200).send(answer);
    } catch (error) {
      if (cancelled.signal.aborted) return;
      const timeout = error instanceof Error && /Timeout|Abort/.test(error.name);
      res.status(timeout ? 504 : 502).json({
        error: timeout ? 'OpenAI Voice timed out. Reconnect to retry.' : 'Voice service unavailable. Reconnect to retry.',
      });
    } finally {
      req.off?.('aborted', cancel);
      res.off?.('close', onClose);
    }
  };
}
