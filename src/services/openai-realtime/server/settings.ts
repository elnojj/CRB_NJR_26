import { OPENAI_REALTIME_DEFAULTS } from '../settings';

/** Server entry only. Never export this module from a browser-facing barrel. */
export function readOpenAiRealtimeServerSettings(env: NodeJS.ProcessEnv) {
  return {
    apiKey: env.OPENAI_API_KEY?.trim(),
    model: env.OPENAI_REALTIME_MODEL?.trim() || OPENAI_REALTIME_DEFAULTS.model,
    voice: env.OPENAI_REALTIME_VOICE?.trim() || OPENAI_REALTIME_DEFAULTS.voice,
    requestTimeoutMs: 25000,
  };
}
