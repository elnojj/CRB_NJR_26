/** Owner access is held in this tab's memory only. Never persist it in browser storage. */
let accessCode: string | null = null;
let generation = 0;
const listeners = new Set<(unlocked: boolean) => void>();

export async function getOwnerAccessToken(): Promise<string | null> { return accessCode; }

export function observeOwnerAccess(listener: (unlocked: boolean) => void): () => void {
  listeners.add(listener);
  listener(accessCode !== null);
  return () => { listeners.delete(listener); };
}

export function lockOwnerAccess(): void {
  generation++;
  accessCode = null;
  listeners.forEach(listener => listener(false));
}

export async function unlockOwnerAccess(code: string, fetcher: typeof fetch = fetch): Promise<void> {
  const candidate = code.trim();
  if (!/^[A-Za-z0-9_-]{24,256}$/.test(candidate)) throw new Error('Enter the owner access code.');
  const requestGeneration = ++generation;
  const response = await fetcher('/api/openai/realtime/access', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { Authorization: `Bearer ${candidate}` }, signal: AbortSignal.timeout(8000),
  });
  if (requestGeneration !== generation) throw new Error('Owner unlock was cancelled.');
  if (!response.ok) {
    lockOwnerAccess();
    throw new Error(response.status === 429 ? 'Too many attempts. Wait a minute and try again.'
      : response.status === 503 ? 'Owner access needs server configuration.' : 'The owner access code was not accepted.');
  }
  const result = await response.json() as { unlocked?: boolean };
  if (requestGeneration !== generation) throw new Error('Owner unlock was cancelled.');
  if (result.unlocked !== true) { lockOwnerAccess(); throw new Error('Owner access could not be verified.'); }
  accessCode = candidate;
  listeners.forEach(listener => listener(true));
}
