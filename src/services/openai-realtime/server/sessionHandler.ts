import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { verifyVoiceIdentity, type VoiceIdentity } from './identity';
import { readOpenAiRealtimeServerSettings } from './settings';
import { buildOpenAiRealtimeSession } from '../sessionConfig';

type Options = {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  verifyIdentity?: (token: string) => Promise<VoiceIdentity | null>;
};

/** Shared by Express and the Vercel function. Only SDP crosses back to the browser. */
export function createOpenAiRealtimeHandler(options: Options = {}) {
  const settings = readOpenAiRealtimeServerSettings(options.env ?? process.env);
  const fetcher = options.fetch ?? fetch;

  return async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Use POST to start an OpenAI Voice session.' });
      return;
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      res.status(403).json({ error: 'Start voice from the Cerebro workspace.' });
      return;
    }
    const token = /^Bearer (\S+)$/i.exec(String(req.headers.authorization || ''))?.[1];
    if (!token) {
      res.status(401).json({ error: 'Sign in to Cerebro before starting OpenAI Voice.' });
      return;
    }
    const cancelled = new AbortController();
    const cancel = () => cancelled.abort();
    const onClose = () => { if (!res.writableEnded) cancel(); };
    req.once?.('aborted', cancel);
    res.once?.('close', onClose);
    try {
      const identity = options.verifyIdentity
        ? await options.verifyIdentity(token)
        : await verifyVoiceIdentity(token, fetcher, cancelled.signal);
      if (cancelled.signal.aborted) return;
      if (!identity) {
        res.status(401).json({ error: 'Your Cerebro sign-in expired. Sign in again.' });
        return;
      }
      const allowed = settings.allowedUids;
      if (allowed.length && !allowed.includes(identity.uid)) {
        res.status(403).json({ error: 'This account does not have voice access.' });
        return;
      }
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
          'OpenAI-Safety-Identifier': createHash('sha256').update(identity.uid).digest('hex'),
        },
        body: form,
        signal: AbortSignal.any([cancelled.signal, AbortSignal.timeout(settings.requestTimeoutMs)]),
      });
      if (cancelled.signal.aborted) return;
      if (!upstream.ok) {
        // Never relay provider error bodies, tokens or server configuration to the client.
        res.status(upstream.status === 429 ? 429 : 502).json({
          error: upstream.status === 429
            ? 'OpenAI Voice is busy or its quota is exhausted. Try again shortly.'
            : 'OpenAI Voice could not start. Check the server key and Realtime model access.',
        });
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
