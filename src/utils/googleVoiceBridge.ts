/**
 * Google voice path — mic acquisition only via the shared hardware coordinator.
 * Keeps parity with ElevenLabs so no orphaned microphone tracks remain.
 */

import {
  getSharedAudioContext,
  getSharedMicrophoneStream,
  releaseSharedMicrophoneStream,
} from './deviceStreamCoordinator';

export interface GoogleVoiceMicSession {
  stream: MediaStream;
  audioContext: AudioContext;
  release: () => void;
}

export async function acquireGoogleVoiceMicrophone(): Promise<GoogleVoiceMicSession> {
  const stream = await getSharedMicrophoneStream({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  });
  const audioContext = getSharedAudioContext();
  return {
    stream,
    audioContext,
    release: () => {
      releaseSharedMicrophoneStream();
    },
  };
}

export { getSharedAudioContext, getSharedMicrophoneStream, releaseSharedMicrophoneStream };
