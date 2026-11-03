/**
 * Hardware Stream Coordinator — single shared webcam / microphone / AudioContext.
 * All getUserMedia calls go through mediaDeviceManager's exclusive lock so Voice
 * and Hands cannot jam each other.
 */

import { requestUserMedia, MediaSessionError } from './mediaDeviceManager';

type WebcamConstraints =
  | MediaTrackConstraints
  | MediaStreamConstraints
  | boolean;
type MicConstraints =
  | MediaTrackConstraints
  | MediaStreamConstraints
  | boolean;

function asVideoTrackConstraints(
  constraints: WebcamConstraints
): MediaTrackConstraints | boolean {
  if (typeof constraints === 'boolean') return constraints;
  if ('video' in constraints || 'audio' in constraints) {
    const video = (constraints as MediaStreamConstraints).video;
    if (typeof video === 'boolean') return video;
    if (video && typeof video === 'object') return video;
    return DEFAULT_WEBCAM;
  }
  return constraints as MediaTrackConstraints;
}

function asAudioTrackConstraints(
  constraints: MicConstraints
): MediaTrackConstraints | boolean {
  if (typeof constraints === 'boolean') return constraints;
  if ('video' in constraints || 'audio' in constraints) {
    const audio = (constraints as MediaStreamConstraints).audio;
    if (typeof audio === 'boolean') return audio;
    if (audio && typeof audio === 'object') return audio;
    return DEFAULT_MIC;
  }
  return constraints as MediaTrackConstraints;
}

export function hasActiveWebcamStream(): boolean {
  return Boolean(webcamStream && webcamStream.getVideoTracks().some((t) => t.readyState === 'live'));
}

export function hasActiveMicrophoneStream(): boolean {
  return Boolean(
    microphoneStream && microphoneStream.getAudioTracks().some((t) => t.readyState === 'live')
  );
}

let webcamStream: MediaStream | null = null;
let webcamRefCount = 0;
let webcamInflight: Promise<MediaStream> | null = null;
let webcamLastError: MediaSessionError | null = null;

let microphoneStream: MediaStream | null = null;
let microphoneRefCount = 0;
let microphoneInflight: Promise<MediaStream> | null = null;
let microphoneLastError: MediaSessionError | null = null;

let sharedAudioContext: AudioContext | null = null;

const DEFAULT_WEBCAM: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
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

export function getWebcamLastError(): MediaSessionError | null {
  return webcamLastError;
}

export function getMicrophoneLastError(): MediaSessionError | null {
  return microphoneLastError;
}

export async function getSharedWebcamStream(
  constraints: WebcamConstraints = DEFAULT_WEBCAM
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    const err = new MediaSessionError('unsupported', 'getUserMedia unavailable');
    webcamLastError = err;
    throw err;
  }

  webcamRefCount += 1;

  if (webcamStream) {
    webcamLastError = null;
    return webcamStream;
  }

  if (!webcamInflight) {
    const track = asVideoTrackConstraints(constraints);
    const video =
      typeof track === 'boolean' ? track : { ...DEFAULT_WEBCAM, ...track };
    webcamInflight = requestUserMedia(
      { video, audio: false },
      { timeoutMs: 12000, label: 'webcam' }
    )
      .then((stream) => {
        webcamStream = stream;
        webcamInflight = null;
        webcamLastError = null;
        return stream;
      })
      .catch((err) => {
        webcamInflight = null;
        webcamRefCount = Math.max(0, webcamRefCount - 1);
        webcamLastError =
          err instanceof MediaSessionError
            ? err
            : new MediaSessionError('unknown', err instanceof Error ? err.message : String(err));
        throw webcamLastError;
      });
  }

  return webcamInflight;
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
    const err = new MediaSessionError('unsupported', 'getUserMedia unavailable');
    microphoneLastError = err;
    throw err;
  }

  microphoneRefCount += 1;

  if (microphoneStream) {
    microphoneLastError = null;
    return microphoneStream;
  }

  if (!microphoneInflight) {
    const track = asAudioTrackConstraints(constraints);
    const audio =
      typeof track === 'boolean' ? track : { ...DEFAULT_MIC, ...track };
    microphoneInflight = requestUserMedia(
      { audio, video: false },
      { timeoutMs: 12000, label: 'microphone' }
    )
      .then((stream) => {
        microphoneStream = stream;
        microphoneInflight = null;
        microphoneLastError = null;
        return stream;
      })
      .catch((err) => {
        microphoneInflight = null;
        microphoneRefCount = Math.max(0, microphoneRefCount - 1);
        microphoneLastError =
          err instanceof MediaSessionError
            ? err
            : new MediaSessionError('unknown', err instanceof Error ? err.message : String(err));
        throw microphoneLastError;
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
  webcamError: string | null;
  microphoneError: string | null;
} {
  return {
    webcamRefCount,
    microphoneRefCount,
    hasWebcam: Boolean(webcamStream),
    hasMicrophone: Boolean(microphoneStream),
    hasAudioContext: Boolean(sharedAudioContext && sharedAudioContext.state !== 'closed'),
    webcamError: webcamLastError?.message ?? null,
    microphoneError: microphoneLastError?.message ?? null,
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
  webcamLastError = null;
  microphoneLastError = null;
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    sharedAudioContext.close().catch(() => {});
  }
  sharedAudioContext = null;
}
