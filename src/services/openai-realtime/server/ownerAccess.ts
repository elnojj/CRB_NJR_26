import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { ownerCodeIssue } from '../../voice/ownerCodeValidation';

export function readOwnerAccessCode(env: NodeJS.ProcessEnv): string | null {
  const code = env.CEREBRO_OWNER_ACCESS_CODE?.trim() || '';
  return ownerCodeIssue(code) ? null : code;
}

export function ownerConfigurationIssue(env: NodeJS.ProcessEnv) {
  const issue = ownerCodeIssue(env.CEREBRO_OWNER_ACCESS_CODE);
  if (!issue) return null;
  return {
    variable: 'CEREBRO_OWNER_ACCESS_CODE', reason: issue.reason,
    message: issue.reason === 'missing'
      ? 'CEREBRO_OWNER_ACCESS_CODE is missing from this deployment. Save it in the server environment and redeploy.'
      : `CEREBRO_OWNER_ACCESS_CODE is invalid. ${issue.message} Update the server environment and redeploy.`,
  };
}

type AccessResult = { ok: true } | { ok: false; status: number; error: string };

export const OWNER_SESSION_COOKIE = '__Host-cerebro-owner';
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
const SESSION_SECONDS = 12 * 60 * 60;

function signSession(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`cerebro-owner-session/v1\n${payload}`).digest('base64url');
}

function sessionCookie(req: Pick<Request, 'headers'>): string | null {
  const item = String(req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${OWNER_SESSION_COOKIE}=`));
  return item?.slice(OWNER_SESSION_COOKIE.length + 1) || null;
}

function validSession(token: string | null, secret: string, time: number): boolean {
  if (!token || token.length > 200) return false;
  const match = /^v1\.(\d{10})\.(\d{10})\.([A-Za-z0-9_-]{32})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const issued = Number(match[1]), expires = Number(match[2]), seconds = Math.floor(time / 1000);
  if (issued > seconds + 30 || expires <= seconds || expires - issued > REMEMBER_SECONDS || expires <= issued) return false;
  const payload = token.slice(0, token.lastIndexOf('.'));
  return timingSafeEqual(Buffer.from(match[4], 'base64url'), Buffer.from(signSession(payload, secret), 'base64url'));
}

function cookieHeader(value: string, maxAge?: number): string {
  return `${OWNER_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict${maxAge === undefined ? '' : `; Max-Age=${maxAge}`}`;
}

/** Constant-time owner-code check; failed-attempt throttling is per running function instance. */
export function createOwnerAccessVerifier(env: NodeJS.ProcessEnv = process.env, now = Date.now) {
  const expected = readOwnerAccessCode(env);
  const configurationIssue = ownerConfigurationIssue(env);
  const failures = new Map<string, { count: number; until: number }>();
  return (req: Pick<Request, 'headers'>): AccessResult => {
    if (req.headers['sec-fetch-site'] === 'cross-site') return { ok: false, status: 403, error: 'Start from the Cerebro workspace.' };
    if (req.headers.origin) {
      try { if (new URL(String(req.headers.origin)).host !== req.headers.host) return { ok: false, status: 403, error: 'Start from the Cerebro workspace.' }; }
      catch { return { ok: false, status: 403, error: 'Start from the Cerebro workspace.' }; }
    }
    const supplied = /^Bearer (\S+)$/i.exec(String(req.headers.authorization || ''))?.[1];
    const cookie = sessionCookie(req);
    if (!supplied && !cookie) return { ok: false, status: 401, error: 'Unlock owner access to use Chat and Call.' };
    if (!expected) return { ok: false, status: 503, error: configurationIssue!.message };
    const time = now();
    if (validSession(cookie, expected, time)) return { ok: true };
    if (!supplied) return { ok: false, status: 401, error: 'Your owner session expired. Unlock access again.' };
    for (const [key, entry] of failures) if (entry.until <= time) failures.delete(key);
    const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].slice(0, 128);
    const key = createHash('sha256').update(ip).digest('hex');
    const entry = failures.get(key);
    if (entry && entry.count >= 8) return { ok: false, status: 429, error: 'Too many access attempts. Wait a minute and try again.' };
    const valid = supplied.length <= 256 && timingSafeEqual(
      createHash('sha256').update(supplied).digest(), createHash('sha256').update(expected).digest()
    );
    if (!valid) {
      if (failures.size >= 2048 && !failures.has(key)) return { ok: false, status: 429, error: 'Access checks are busy. Try again shortly.' };
      failures.set(key, { count: (entry?.count || 0) + 1, until: entry?.until || time + 60000 });
      return { ok: false, status: 401, error: 'The owner access code was not accepted.' };
    }
    failures.delete(key);
    return { ok: true };
  };
}

export function createOwnerAccessHandler(env: NodeJS.ProcessEnv = process.env, now = Date.now) {
  const verify = createOwnerAccessVerifier(env, now);
  return (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Cookie');
    if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({ error: 'Start from the Cerebro workspace.' });
    if (req.method === 'GET') return res.status(200).json({ unlocked: verify(req).ok });
    if (req.method === 'DELETE') {
      if (req.headers.origin) {
        try { if (new URL(String(req.headers.origin)).host !== req.headers.host) return res.status(403).json({ error: 'Start from the Cerebro workspace.' }); }
        catch { return res.status(403).json({ error: 'Start from the Cerebro workspace.' }); }
      }
      res.setHeader('Set-Cookie', cookieHeader('', 0));
      return res.status(200).json({ unlocked: false });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).json({ error: 'Use POST to unlock owner access.' }); }
    const access = verify({ headers: { ...req.headers, cookie: undefined } });
    if (access.ok === false) return res.status(access.status).json({ error: access.error });
    const seconds = Math.floor(now() / 1000);
    const remember = req.body?.remember !== false;
    const payload = `v1.${seconds}.${seconds + (remember ? REMEMBER_SECONDS : SESSION_SECONDS)}.${randomBytes(24).toString('base64url')}`;
    const token = `${payload}.${signSession(payload, readOwnerAccessCode(env)!)}`;
    res.setHeader('Set-Cookie', cookieHeader(token, remember ? REMEMBER_SECONDS : undefined));
    return res.status(200).json({ unlocked: true });
  };
}
