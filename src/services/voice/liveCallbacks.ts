import type { VoiceBridgeCallbacks } from './types';

/** Keep one bridge alive while every event uses the latest React callbacks, including diagnostics. */
export function forwardVoiceCallbacks(source: { current: VoiceBridgeCallbacks }): VoiceBridgeCallbacks {
  return {
    onStatusChange: (...args) => source.current.onStatusChange(...args),
    onTranscript: (...args) => source.current.onTranscript(...args),
    onClientToolCall: (...args) => source.current.onClientToolCall(...args),
    onAudioLevel: (...args) => source.current.onAudioLevel?.(...args),
  };
}
