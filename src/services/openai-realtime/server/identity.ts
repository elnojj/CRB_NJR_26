import { readServerFirebaseApiKey } from '../../../config/firebaseConfig';

export type VoiceIdentity = { uid: string };

/** Validate the existing Firebase sign-in; audience headers/access codes are not identity. */
export async function verifyVoiceIdentity(
  token: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<VoiceIdentity | null> {
  const apiKey = readServerFirebaseApiKey(process.env);
  if (!apiKey) return null;
  const response = await fetcher(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    }
  );
  if (!response.ok) return null;
  const data = await response.json() as { users?: Array<{ localId?: string; disabled?: boolean }> };
  const user = data.users?.[0];
  return user?.localId && !user.disabled ? { uid: user.localId } : null;
}
