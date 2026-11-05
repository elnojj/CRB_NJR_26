/**
 * Central media session manager — serializes all getUserMedia calls so Voice
 * (mic) and Hands (camera) cannot deadlock the browser permission / device lock.
 *
 * deviceStreamCoordinator remains the ref-counted stream cache; this module
 * owns the exclusive acquire gate and optional combined A/V session.
 */

export type MediaSessionKind = 'audio' | 'video' | 'audiovideo';

export type MediaSessionErrorCode =
  | 'unsupported'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'timeout'
  | 'unknown';

export class MediaSessionError extends Error {
  code: MediaSessionErrorCode;
  constructor(code: MediaSessionErrorCode, message: string) {
    super(message);
    this.name = 'MediaSessionError';
    this.code = code;
  }
}

type QueueJob<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
};

let chain: Promise<unknown> = Promise.resolve();
let busy = false;

/** Run exclusive work on the media device lock (FIFO). */
export function withMediaDeviceLock<T>(run: () => Promise<T>): Promise<T> {
  const job = new Promise<T>((resolve, reject) => {
    chain = chain
      .then(async () => {
        busy = true;
        try {
          resolve(await run());
        } catch (err) {
          reject(err);
        } finally {
          busy = false;
        }
      })
      .catch(() => {
        /* keep queue alive after rejection */
      });
  });
  return job;
}

export function isMediaDeviceLockBusy(): boolean {
  return busy;
}

function mapDomError(err: unknown): MediaSessionError {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as DOMException).name) : '';
  const message = err instanceof Error ? err.message : String(err);
  if (name === 'NotAllowedError' || /denied|permission/i.test(message)) {
    return new MediaSessionError('denied', message || 'Media permission denied');
  }
  if (name === 'NotFoundError' || /not found|no device/i.test(message)) {
    return new MediaSessionError('not-found', message || 'No media device found');
  }
  if (name === 'NotReadableError' || /in use|track start/i.test(message)) {
    return new MediaSessionError('in-use', message || 'Media device already in use');
  }
  if (name === 'AbortError' || /timeout/i.test(message)) {
    return new MediaSessionError('timeout', message || 'Media request timed out');
  }
  return new MediaSessionError('unknown', message || 'Media request failed');
}

/** Actionable mic errors without exposing browser internals or guessing which app owns it. */
export function microphoneErrorMessage(error: unknown): string {
  const code = error instanceof MediaSessionError ? error.code : mapDomError(error).code;
  switch (code) {
    case 'denied': return 'Microphone permission denied. Allow microphone access for this site in your browser and system settings, then tap Call.';
    case 'in-use': return 'Microphone unavailable or busy. Stop other recordings, check the selected input device, then tap Call.';
    case 'not-found': return 'No microphone found. Connect or select an input device, then tap Call.';
    case 'timeout': return 'Microphone permission request timed out. Dismiss any old permission prompt, then tap Call and allow microphone access.';
    case 'unsupported': return 'Microphone capture is unavailable. Open Cerebro in a browser with microphone support over HTTPS.';
    default: return 'Microphone could not start. Check your input device and browser permissions, then tap Call.';
  }
}

async function withTimeout<T>(
  promise: Promise<T>, ms: number, label: string, onLateResolve?: (value: T) => void
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expired = false;
  try {
    return await Promise.race([
      promise.then(value => {
        if (expired) onLateResolve?.(value);
        return value;
      }),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new MediaSessionError('timeout', `${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Exclusive getUserMedia — every Hands / Voice acquire must go through here.
 */
export function requestUserMedia(
  constraints: MediaStreamConstraints,
  opts?: { timeoutMs?: number; label?: string }
): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return Promise.reject(
      new MediaSessionError('unsupported', 'getUserMedia unavailable in this environment')
    );
  }
  const timeoutMs = opts?.timeoutMs ?? 12000;
  const label = opts?.label ?? 'getUserMedia';
  return withMediaDeviceLock(() =>
    withTimeout(
      navigator.mediaDevices.getUserMedia(constraints), timeoutMs, label,
      stream => stream.getTracks().forEach(track => track.stop())
    ).catch((err) => {
      throw mapDomError(err);
    })
  );
}

/**
 * Prefer a single combined A/V request when both are needed; falls back to
 * sequenced video-then-audio (or audio-then-video) under the same lock.
 */
export async function requestCoordinatedAv(opts?: {
  video?: MediaTrackConstraints | boolean;
  audio?: MediaTrackConstraints | boolean;
  preferCombined?: boolean;
  timeoutMs?: number;
}): Promise<{ stream: MediaStream; mode: 'combined' | 'sequenced' }> {
  const video = opts?.video ?? true;
  const audio = opts?.audio ?? true;
  const preferCombined = opts?.preferCombined !== false;

  if (preferCombined) {
    try {
      const stream = await requestUserMedia(
        { video, audio },
        { timeoutMs: opts?.timeoutMs, label: 'combined-av' }
      );
      return { stream, mode: 'combined' };
    } catch {
      /* fall through to sequenced */
    }
  }

  // Sequence under one lock so the second call cannot race the first.
  return withMediaDeviceLock(async () => {
    const timeoutMs = opts?.timeoutMs ?? 12000;
    try {
      const videoStream = await withTimeout(
        navigator.mediaDevices.getUserMedia({ video, audio: false }),
        timeoutMs,
        'video-first'
      );
      try {
        const audioStream = await withTimeout(
          navigator.mediaDevices.getUserMedia({ audio, video: false }),
          timeoutMs,
          'audio-second'
        );
        for (const track of audioStream.getAudioTracks()) {
          videoStream.addTrack(track);
        }
        return { stream: videoStream, mode: 'sequenced' as const };
      } catch (err) {
        videoStream.getTracks().forEach((t) => t.stop());
        throw mapDomError(err);
      }
    } catch (err) {
      throw mapDomError(err);
    }
  });
}
