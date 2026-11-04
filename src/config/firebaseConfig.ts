import type { FirebaseOptions } from 'firebase/app';

type EnvSource = Record<string, string | undefined>;

/** Browser build: values come from `VITE_FIREBASE_*` variables injected by Vite at build time. */
export function readClientFirebaseConfig(env: EnvSource): FirebaseOptions | null {
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    projectId,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    appId: env.VITE_FIREBASE_APP_ID?.trim(),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  };
}

/** Server runtime: the Identity Toolkit key used to validate Firebase ID tokens. */
export function readServerFirebaseApiKey(env: EnvSource): string | null {
  return env.FIREBASE_API_KEY?.trim() || env.VITE_FIREBASE_API_KEY?.trim() || null;
}
