import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  __resetDeviceStreamCoordinatorForTests, forceStopSharedMicrophoneStream,
  getSharedMicrophoneStream, releaseSharedMicrophoneStream,
  getSharedWebcamStream, getDeviceStreamCoordinatorDebugState,
} from './deviceStreamCoordinator';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function stream(kind: 'audio' | 'video' = 'audio') {
  const track = { readyState: 'live', stop() { this.readyState = 'ended'; } };
  return { getTracks: () => [track], getAudioTracks: () => kind === 'audio' ? [track] : [], getVideoTracks: () => kind === 'video' ? [track] : [] } as unknown as MediaStream;
}

test('reset during a pending permission grant cannot revive the old mic or consume the new call lease', async () => {
  const previous = navigator.mediaDevices;
  const pending: Array<(stream: MediaStream) => void> = [];
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: () => new Promise<MediaStream>(resolve => pending.push(resolve)),
  } });
  __resetDeviceStreamCoordinatorForTests();
  try {
    const old = getSharedMicrophoneStream();
    const oldResult = assert.rejects(old, /cancelled/);
    await flush();
    forceStopSharedMicrophoneStream();
    const fresh = getSharedMicrophoneStream();
    const late = stream();
    pending[0](late);
    await oldResult;
    await flush();
    assert.equal(late.getAudioTracks()[0].readyState, 'ended');
    assert.equal(getDeviceStreamCoordinatorDebugState().microphoneRefCount, 1);
    const live = stream();
    pending[1](live);
    assert.equal(await fresh, live);
    assert.equal(getDeviceStreamCoordinatorDebugState().hasMicrophone, true);
    releaseSharedMicrophoneStream();
    assert.equal(live.getAudioTracks()[0].readyState, 'ended');
  } finally {
    __resetDeviceStreamCoordinatorForTests();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: previous });
  }
});

test('mic reset stops all tab microphone tracks and preserves the camera', async () => {
  const previous = navigator.mediaDevices;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: async (constraints: MediaStreamConstraints) => stream(constraints.audio ? 'audio' : 'video'),
  } });
  __resetDeviceStreamCoordinatorForTests();
  try {
    const mic = await getSharedMicrophoneStream();
    const camera = await getSharedWebcamStream();
    forceStopSharedMicrophoneStream();
    assert.equal(mic.getAudioTracks()[0].readyState, 'ended');
    assert.equal(camera.getVideoTracks()[0].readyState, 'live');
    assert.equal(getDeviceStreamCoordinatorDebugState().microphoneRefCount, 0);
    const replacement = await getSharedMicrophoneStream();
    assert.notEqual(replacement, mic);
    assert.equal(replacement.getAudioTracks()[0].readyState, 'live');
    releaseSharedMicrophoneStream(mic);
    assert.equal(getDeviceStreamCoordinatorDebugState().microphoneRefCount, 1, 'A late release from the old call cannot consume the replacement lease');
    assert.equal(replacement.getAudioTracks()[0].readyState, 'live');
    releaseSharedMicrophoneStream(replacement);
    assert.equal(replacement.getAudioTracks()[0].readyState, 'ended');
  } finally {
    __resetDeviceStreamCoordinatorForTests();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: previous });
  }
});
