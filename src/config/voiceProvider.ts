export type CerebroVoiceProvider = 'openai-realtime' | 'google-ai-studio';

/** Build-time switch; secrets belong to the server, never to a VITE_ variable. */
export const CEREBRO_VOICE_PROVIDER: CerebroVoiceProvider =
  import.meta.env?.VITE_CEREBRO_VOICE_PROVIDER === 'google-ai-studio'
    ? 'google-ai-studio'
    : 'openai-realtime';

export const CEREBRO_VOICE_LABEL =
  CEREBRO_VOICE_PROVIDER === 'openai-realtime' ? 'OpenAI Voice' : 'Google Voice';
