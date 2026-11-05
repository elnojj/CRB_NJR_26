import { readServerFirebaseApiKey } from '../../../config/firebaseConfig';

/** Configuration only: never a claim that account quota, audio, or model access was tested. */
export function readVoiceReadiness(env: NodeJS.ProcessEnv = process.env) {
  const missing: string[] = [];
  if (!env.OPENAI_API_KEY?.trim()) missing.push('OPENAI_API_KEY');
  if (!readServerFirebaseApiKey(env)) missing.push('FIREBASE_API_KEY');
  if (!env.VITE_FIREBASE_API_KEY?.trim()) missing.push('VITE_FIREBASE_API_KEY');
  if (!env.VITE_FIREBASE_PROJECT_ID?.trim()) missing.push('VITE_FIREBASE_PROJECT_ID');
  return { provider: 'openai-realtime', configured: missing.length === 0, signInRequired: true, missing };
}
