/**
 * Lightweight node-side checks for the hardware stream coordinator refcounts.
 * DOM getUserMedia is stubbed — validates acquire/release bookkeeping only.
 */

import {
  __resetDeviceStreamCoordinatorForTests,
  forceStopSharedWebcamStream,
  getDeviceStreamCoordinatorDebugState,
  getSharedMicrophoneStream,
  releaseSharedMicrophoneStream,
  getSharedWebcamStream,
  releaseSharedWebcamStream,
} from './deviceStreamCoordinator';

function makeFakeStream(kind: 'audio' | 'video'): MediaStream {
  const track = {
    kind,
    readyState: 'live' as MediaStreamTrackState,
    stop: () => {
      (track as { stopped?: boolean; readyState: MediaStreamTrackState }).stopped = true;
      track.readyState = 'ended';
    },
    enabled: true,
  };
  return {
    getTracks: () => [track as unknown as MediaStreamTrack],
    getAudioTracks: () => (kind === 'audio' ? [track as unknown as MediaStreamTrack] : []),
    getVideoTracks: () => (kind === 'video' ? [track as unknown as MediaStreamTrack] : []),
  } as unknown as MediaStream;
}

export async function runDeviceStreamCoordinatorSelfTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  details: string[];
}> {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;

  const check = (name: string, ok: boolean, detail = '') => {
    if (ok) {
      passed += 1;
      details.push(`PASS ${name}`);
    } else {
      failed += 1;
      details.push(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    }
  };

  __resetDeviceStreamCoordinatorForTests();

  let micCalls = 0;
  let camCalls = 0;
  const stubDevices = {
    getUserMedia: async (c: MediaStreamConstraints) => {
      if (c.audio) {
        micCalls += 1;
        return makeFakeStream('audio');
      }
      camCalls += 1;
      return makeFakeStream('video');
    },
  };

  const navTarget = globalThis as typeof globalThis & {
    navigator: Navigator;
  };
  const previousDevices = navTarget.navigator?.mediaDevices;
  Object.defineProperty(navTarget.navigator, 'mediaDevices', {
    configurable: true,
    writable: true,
    value: stubDevices,
  });

  try {
    await getSharedMicrophoneStream();
    await getSharedMicrophoneStream();
    check('mic getUserMedia called once for two acquires', micCalls === 1, `calls=${micCalls}`);
    check(
      'mic refcount is 2 after dual acquire',
      getDeviceStreamCoordinatorDebugState().microphoneRefCount === 2
    );
    releaseSharedMicrophoneStream();
    check(
      'mic still held after one release',
      getDeviceStreamCoordinatorDebugState().hasMicrophone === true
    );
    releaseSharedMicrophoneStream();
    check(
      'mic released at zero refcount',
      getDeviceStreamCoordinatorDebugState().hasMicrophone === false &&
        getDeviceStreamCoordinatorDebugState().microphoneRefCount === 0
    );

    await getSharedWebcamStream();
    await getSharedWebcamStream();
    check('webcam getUserMedia called once for two acquires', camCalls === 1, `calls=${camCalls}`);
    releaseSharedWebcamStream();
    releaseSharedWebcamStream();
    check(
      'webcam released at zero refcount',
      getDeviceStreamCoordinatorDebugState().hasWebcam === false
    );

    // Force-stop must invalidate in-flight acquires (toggle jam regression).
    camCalls = 0;
    let slowResolve: ((s: MediaStream) => void) | undefined;
    stubDevices.getUserMedia = () =>
      new Promise<MediaStream>((resolve) => {
        camCalls += 1;
        slowResolve = resolve;
      });
    const pending = getSharedWebcamStream();
    forceStopSharedWebcamStream();
    if (slowResolve) slowResolve(makeFakeStream('video'));
    let cancelled = false;
    try {
      await pending;
    } catch {
      cancelled = true;
    }
    check('force-stop cancels in-flight webcam acquire', cancelled, `camCalls=${camCalls}`);
    check(
      'force-stop leaves no live webcam',
      getDeviceStreamCoordinatorDebugState().hasWebcam === false &&
        getDeviceStreamCoordinatorDebugState().webcamRefCount === 0
    );
    // Restore stub for concurrent test below.
    stubDevices.getUserMedia = async (c: MediaStreamConstraints) => {
      if (c.audio) {
        micCalls += 1;
        return makeFakeStream('audio');
      }
      camCalls += 1;
      return makeFakeStream('video');
    };

    // Concurrent mic + cam must serialize through mediaDeviceManager (no parallel getUserMedia).
    let concurrent = 0;
    let maxConcurrent = 0;
    stubDevices.getUserMedia = async (c: MediaStreamConstraints) => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 20));
      concurrent -= 1;
      if (c.audio) return makeFakeStream('audio');
      return makeFakeStream('video');
    };
    await Promise.all([getSharedMicrophoneStream(), getSharedWebcamStream()]);
    check('mic+cam getUserMedia never concurrent', maxConcurrent === 1, `max=${maxConcurrent}`);
    releaseSharedMicrophoneStream();
    releaseSharedWebcamStream();

    stubDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
    const failedAcquires = await Promise.allSettled([getSharedMicrophoneStream(), getSharedMicrophoneStream()]);
    check('concurrent denied mic acquires both reject', failedAcquires.every(result => result.status === 'rejected'));
    check('denied mic acquires release every caller lease', getDeviceStreamCoordinatorDebugState().microphoneRefCount === 0);

    stubDevices.getUserMedia = async () => makeFakeStream('audio');
    const stoppedMic = await getSharedMicrophoneStream();
    stoppedMic.getTracks().forEach(track => track.stop());
    const replacementMic = await getSharedMicrophoneStream();
    check('ended cached mic stream is reacquired', replacementMic !== stoppedMic && replacementMic.getAudioTracks()[0].readyState === 'live');
    releaseSharedMicrophoneStream();
    releaseSharedMicrophoneStream();
  } finally {
    __resetDeviceStreamCoordinatorForTests();
    Object.defineProperty(navTarget.navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: previousDevices,
    });
  }

  return { total: passed + failed, passed, failed, details };
}
