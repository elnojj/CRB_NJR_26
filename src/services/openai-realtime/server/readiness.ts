import { readOwnerAccessCode } from './ownerAccess';

/** Configuration only: never a claim that account quota, audio, or model access was tested. */
export function readVoiceReadiness(env: NodeJS.ProcessEnv = process.env) {
  const missing: string[] = [];
  if (!env.OPENAI_API_KEY?.trim()) missing.push('OPENAI_API_KEY');
  if (!readOwnerAccessCode(env)) missing.push('CEREBRO_OWNER_ACCESS_CODE');
  return { provider: 'openai-realtime', configured: missing.length === 0, signInRequired: false, ownerAccessRequired: true, missing };
}
