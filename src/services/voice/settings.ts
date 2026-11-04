export type CerebroVoiceProvider = 'openai-realtime' | 'google-ai-studio';

export function resolveVoiceSettings(settings: { provider?: string; label?: string } = {}) {
  const provider: CerebroVoiceProvider = settings.provider === 'google-ai-studio'
    ? 'google-ai-studio' : 'openai-realtime';
  return Object.freeze({
    provider,
    label: settings.label?.trim() || (provider === 'openai-realtime' ? 'OpenAI Voice' : 'Google Voice'),
  });
}

/** Build-time public settings; never put provider API keys in VITE_ variables. */
const settings = resolveVoiceSettings({
  provider: import.meta.env?.VITE_CEREBRO_VOICE_PROVIDER,
  label: import.meta.env?.VITE_CEREBRO_VOICE_LABEL,
});

export const CEREBRO_VOICE_PROVIDER = settings.provider;
export const CEREBRO_VOICE_LABEL = settings.label;

export function formatVoiceStatus(detail: string, state: string, label = CEREBRO_VOICE_LABEL): string {
  return detail
    ? detail.replace(/OpenAI Voice|Google Voice/g, () => label)
    : `${label} · ${state.toLowerCase()}`;
}
