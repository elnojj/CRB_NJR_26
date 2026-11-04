import { CEREBRO_VOICE_PROVIDER, type CerebroVoiceProvider } from './settings';
import { GoogleAiStudioVoiceBridge } from '../google-ai-studio/GoogleAiStudioVoiceBridge';
import { OpenAiRealtimeVoiceBridge } from '../openai-realtime/OpenAiRealtimeVoiceBridge';
import type { VoiceBridge, VoiceBridgeCallbacks } from './types';

export function createVoiceBridge(
  callbacks: VoiceBridgeCallbacks,
  provider: CerebroVoiceProvider = CEREBRO_VOICE_PROVIDER
): VoiceBridge {
  return provider === 'google-ai-studio'
    ? new GoogleAiStudioVoiceBridge(callbacks)
    : new OpenAiRealtimeVoiceBridge(callbacks);
}
