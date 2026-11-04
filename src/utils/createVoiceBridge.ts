import { CEREBRO_VOICE_PROVIDER } from '../config/voiceProvider';
import { GoogleAiStudioVoiceBridge } from './googleAiStudioVoiceBridge';
import { OpenAiRealtimeVoiceBridge } from './openAiRealtimeVoiceBridge';
import type { VoiceBridge, VoiceBridgeCallbacks } from './voiceBridgeTypes';

export function createVoiceBridge(callbacks: VoiceBridgeCallbacks): VoiceBridge {
  return CEREBRO_VOICE_PROVIDER === 'google-ai-studio'
    ? new GoogleAiStudioVoiceBridge(callbacks)
    : new OpenAiRealtimeVoiceBridge(callbacks);
}
