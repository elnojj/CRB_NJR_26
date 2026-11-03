/**
 * Hardware Stream Coordinator — single shared webcam / microphone / AudioContext.
 * Prevents orphaned mic tracks and duplicate getUserMedia calls across Hands + Voice.
 */

type WebcamConstraints = MediaTrackConstraints | boolean;
type MicConstraints = MediaTrackConstraints | boolean;

let webcamStream: MediaStream | null = null;
let webcamRefCount = 0;
let webcamInflight: Promise<MediaStream> | null = null;

let microphoneStream: MediaStream | null = null;
let microphoneRefCount = 0;
let microphoneInflight: Promise<MediaStream> | null = null;

let sharedAudioContext: AudioContext | null = null;

const DEFAULT_WEBCAM: MediaTrackConstraints = {
  width: 960,
  height: 540,
  facingMode: 'user',
};

const DEFAULT_MIC: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

function stopStreamTracks(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // ignore
    }
  }
}

export async function getSharedWebcamStream(
  constraints: WebcamConstraints = DEFAULT_WEBCAM
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia unavailable');
  }

  webcamRefCount += 1;

  if (webcamStream) {
    return webcamStream;
  }

  if (!webcamInflight) {
    const video = typeof constraints === 'boolean' ? constraints : { ...DEFAULT_WEBCAM, ...constraints };
    webcamInflight = navigator.mediaDevices
      .getUserMedia({ video, audio: false })
      .then((stream) => {
        webcamStream = stream;
        webcamInflight = null;
        return stream;
      })
      .catch((err) => {
        webcamInflight = null;
        webcamRefCount = Math.max(0, webcamRefCount - 1);
        throw err;
      });
  }

  try {
    return await webcamInflight;
  } catch (err) {
    throw err;
  }
}

export function releaseSharedWebcamStream(): void {
  webcamRefCount = Math.max(0, webcamRefCount - 1);
  if (webcamRefCount > 0) return;
  stopStreamTracks(webcamStream);
  webcamStream = null;
}

export async function getSharedMicrophoneStream(
  constraints: MicConstraints = DEFAULT_MIC
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia unavailable');
  }

  microphoneRefCount += 1;

  if (microphoneStream) {
    return microphoneStream;
  }

  if (!microphoneInflight) {
    const audio = typeof constraints === 'boolean' ? constraints : { ...DEFAULT_MIC, ...constraints };
    microphoneInflight = navigator.mediaDevices
      .getUserMedia({ audio, video: false })
      .then((stream) => {
        microphoneStream = stream;
        microphoneInflight = null;
        return stream;
      })
      .catch((err) => {
        microphoneInflight = null;
        microphoneRefCount = Math.max(0, microphoneRefCount - 1);
        throw err;
      });
  }

  return microphoneInflight;
}

export function releaseSharedMicrophoneStream(): void {
  microphoneRefCount = Math.max(0, microphoneRefCount - 1);
  if (microphoneRefCount > 0) return;
  stopStreamTracks(microphoneStream);
  microphoneStream = null;
}

export function getSharedAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext unavailable');
  }
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new Ctor();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/** Test / diagnostics helpers — not for production UI. */
export function getDeviceStreamCoordinatorDebugState(): {
  webcamRefCount: number;
  microphoneRefCount: number;
  hasWebcam: boolean;
  hasMicrophone: boolean;
  hasAudioContext: boolean;
} {
  return {
    webcamRefCount,
    microphoneRefCount,
    hasWebcam: Boolean(webcamStream),
    hasMicrophone: Boolean(microphoneStream),
    hasAudioContext: Boolean(sharedAudioContext && sharedAudioContext.state !== 'closed'),
  };
}

export function __resetDeviceStreamCoordinatorForTests(): void {
  stopStreamTracks(webcamStream);
  stopStreamTracks(microphoneStream);
  webcamStream = null;
  microphoneStream = null;
  webcamRefCount = 0;
  microphoneRefCount = 0;
  webcamInflight = null;
  microphoneInflight = null;
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    sharedAudioContext.close().catch(() => {});
  }
  sharedAudioContext = null;
}
