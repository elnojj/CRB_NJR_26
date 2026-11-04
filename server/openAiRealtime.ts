import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import firebaseConfig from '../firebase-applet-config.json';
import { buildOpenAiRealtimeSession } from '../src/data/openAiRealtimeConfig';

type Identity = { uid: string };
type Options = {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  verifyIdentity?: (token: string) => Promise<Identity | null>;
};

/** Validate the existing Firebase sign-in; audience headers/access codes are not identity. */
export async function verifyVoiceIdentity(
  token: string,
  fetcher: typeof fetch = fetch
): Promise<Identity | null> {
  const response = await fetcher(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!response.ok) return null;
  const data = await response.json() as { users?: Array<{ localId?: string; disabled?: boolean }> };
  const user = data.users?.[0];
  return user?.localId && !user.disabled ? { uid: user.localId } : null;
}

/** Shared by Express and the Vercel function. Only SDP crosses back to the browser. */
export function createOpenAiRealtimeHandler(options: Options = {}) {
  const env = options.env ?? process.env;
  const fetcher = options.fetch ?? fetch;
  const verify = options.verifyIdentity ?? ((token: string) => verifyVoiceIdentity(token, fetcher));

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
    try {
      const identity = await verify(token);
      if (!identity) {
        res.status(401).json({ error: 'Your Cerebro sign-in expired. Sign in again.' });
        return;
      }
      const allowed = (env.CEREBRO_VOICE_ALLOWED_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
      if (allowed.length && !allowed.includes(identity.uid)) {
        res.status(403).json({ error: 'This account does not have voice access.' });
        return;
      }
      if (!env.OPENAI_API_KEY) {
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
        env.OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime',
        env.OPENAI_REALTIME_VOICE?.trim() || 'marin'
      )));
      const upstream = await fetcher('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'OpenAI-Safety-Identifier': createHash('sha256').update(identity.uid).digest('hex'),
        },
        body: form,
        signal: AbortSignal.timeout(25000),
      });
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
      if (!answer.startsWith('v=0')) {
        res.status(502).json({ error: 'OpenAI Voice returned an invalid WebRTC answer.' });
        return;
      }
      res.status(200).type('application/sdp').send(answer);
    } catch (error) {
      const timeout = error instanceof Error && /Timeout|Abort/.test(error.name);
      res.status(timeout ? 504 : 502).json({
        error: timeout ? 'OpenAI Voice timed out. Reconnect to retry.' : 'Voice service unavailable. Reconnect to retry.',
      });
    }
  };
}
