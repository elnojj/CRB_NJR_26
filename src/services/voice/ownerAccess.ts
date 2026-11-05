import { ownerCodeIssue } from './ownerCodeValidation';

/** Only an unlock flag lives in JS. The signed session is a Secure HttpOnly cookie. */
let unlocked = false;
let manuallyLocked = false;
let generation = 0;
let restoring: Promise<boolean> | null = null;
const listeners = new Set<(unlocked: boolean) => void>();
const endpoint = '/api/openai/realtime/access';

function publish(value: boolean): void { unlocked = value; listeners.forEach(listener => listener(value)); }
export async function hasOwnerAccessSession(): Promise<boolean> { return unlocked; }
export function observeOwnerAccess(listener: (unlocked: boolean) => void): () => void {
  listeners.add(listener); listener(unlocked);
  return () => { listeners.delete(listener); };
}
export function invalidateOwnerAccess(): void { generation++; publish(false); }

async function clearCookie(fetcher: typeof fetch = fetch): Promise<void> {
  await fetcher(endpoint, { method: 'DELETE', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000) });
}
export function lockOwnerAccess(): void {
  manuallyLocked = true;
  invalidateOwnerAccess();
  void clearCookie().catch(() => {});
}

export async function restoreOwnerAccess(fetcher: typeof fetch = fetch): Promise<boolean> {
  if (manuallyLocked) return false;
  if (restoring) return restoring;
  const requestGeneration = generation;
  const pending = (async () => {
    try {
      const response = await fetcher(endpoint, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Saved access could not be checked.');
      const result = await response.json() as { unlocked?: boolean };
      if (requestGeneration === generation) publish(result.unlocked === true);
    } catch {
      if (!unlocked && requestGeneration === generation) throw new Error('Saved access could not be checked. Check your connection and retry.');
    }
    return unlocked;
  })().finally(() => { if (restoring === pending) restoring = null; });
  restoring = pending;
  return pending;
}

export async function unlockOwnerAccess(code: string, fetcher: typeof fetch = fetch, remember = true): Promise<void> {
  const candidate = code.trim();
  const issue = ownerCodeIssue(candidate);
  if (issue) throw new Error(issue.message);
  const requestGeneration = ++generation;
  const response = await fetcher(endpoint, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${candidate}` },
    body: JSON.stringify({ remember }), signal: AbortSignal.timeout(8000),
  });
  if (requestGeneration !== generation) {
    if (response.ok) await clearCookie(fetcher).catch(() => {});
    throw new Error('Owner unlock was cancelled.');
  }
  if (!response.ok) {
    invalidateOwnerAccess();
    if (response.status === 503) {
      const result = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(typeof result?.error === 'string' ? result.error : 'Owner access needs server configuration.');
    }
    throw new Error(response.status === 429 ? 'Too many attempts. Wait a minute and try again.'
      : 'The owner access code was not accepted. Use Recover access below to retrieve or replace it.');
  }
  const result = await response.json() as { unlocked?: boolean };
  if (requestGeneration !== generation) {
    await clearCookie(fetcher).catch(() => {});
    throw new Error('Owner unlock was cancelled.');
  }
  if (result.unlocked !== true) { invalidateOwnerAccess(); throw new Error('Owner access could not be verified.'); }
  manuallyLocked = false;
  publish(true);
}
