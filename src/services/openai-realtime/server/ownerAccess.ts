import { createHash, timingSafeEqual } from 'node:crypto';
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

/** Constant-time owner-code check; failed-attempt throttling is per running function instance. */
export function createOwnerAccessVerifier(env: NodeJS.ProcessEnv = process.env, now = Date.now) {
  const expected = readOwnerAccessCode(env);
  const configurationIssue = ownerConfigurationIssue(env);
  const failures = new Map<string, { count: number; until: number }>();
  return (req: Pick<Request, 'headers'>): AccessResult => {
    if (req.headers['sec-fetch-site'] === 'cross-site') return { ok: false, status: 403, error: 'Start from the Cerebro workspace.' };
    const supplied = /^Bearer (\S+)$/i.exec(String(req.headers.authorization || ''))?.[1];
    if (!supplied) return { ok: false, status: 401, error: 'Unlock owner access before starting voice.' };
    if (!expected) return { ok: false, status: 503, error: configurationIssue!.message };
    const time = now();
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

export function createOwnerAccessHandler(env: NodeJS.ProcessEnv = process.env) {
  const verify = createOwnerAccessVerifier(env);
  return (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST to unlock owner access.' }); }
    const access = verify(req);
    if (access.ok === false) return res.status(access.status).json({ error: access.error });
    return res.status(200).json({ unlocked: true });
  };
}
