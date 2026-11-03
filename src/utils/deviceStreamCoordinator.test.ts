/**
 * Lightweight node-side checks for the hardware stream coordinator refcounts.
 * DOM getUserMedia is stubbed — validates acquire/release bookkeeping only.
 */

import {
  __resetDeviceStreamCoordinatorForTests,
  getDeviceStreamCoordinatorDebugState,
  getSharedMicrophoneStream,
  releaseSharedMicrophoneStream,
  getSharedWebcamStream,
  releaseSharedWebcamStream,
} from './deviceStreamCoordinator';
import { assertIntroBridgeClean, spawnIntroBackgroundMedia } from '../intro/bridge';

function makeFakeStream(kind: 'audio' | 'video'): MediaStream {
  const track = {
    kind,
    stop: () => {
      (track as { stopped?: boolean }).stopped = true;
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

  assertIntroBridgeClean();
  check('intro bridge spawns zero media', spawnIntroBackgroundMedia().length === 0);

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
