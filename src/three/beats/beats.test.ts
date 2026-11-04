import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import gsap from 'gsap';
import * as THREE from 'three';
import { MediaPlaybackManager } from '../mediaPlayback.ts';
import { BeatsTimelineContainer } from './BeatsTimelineContainer.ts';
import { buildBeatKeyframes, computeBeatPlacements, layoutWords, wordReveal } from './beatLayout.ts';
import {
  buildJourneyCurves,
  buildJourneyStops,
  buildJourneyTimeline,
  journeyDurationSec,
  type JourneyProxy,
} from './beatJourney.ts';
import { BEAT_COUNT, type BeatSlot, type BeatSlotFactories } from './beatTypes.ts';
import { disposeObject3D, isolateScene, markCoreRig } from './disposal.ts';
import { resolveEnvironmentMode } from './environmentMode.ts';
import { beatToJourneyBeat } from './journeyBridge.ts';

gsap.ticker.lagSmoothing(0);

describe('beat layout', () => {
  const placements = computeBeatPlacements();

  it('places exactly 25 beats, all inside the shell', () => {
    assert.equal(placements.length, BEAT_COUNT);
    for (const p of placements) {
      assert.ok(Math.hypot(...p.anchor) < 6.2 * 0.95);
      assert.ok(Math.hypot(p.cameraPosition[0], p.cameraPosition[2]) < Math.hypot(p.anchor[0], p.anchor[2]));
    }
  });

  it('climbs bottom to top and never repeats a spot', () => {
    for (let i = 1; i < placements.length; i += 1) {
      assert.ok(placements[i].anchor[1] > placements[i - 1].anchor[1]);
    }
  });

  it('turns each beat to face its own camera stop', () => {
    for (const p of placements) {
      const facing = new THREE.Vector3(Math.sin(p.yawRad), 0, Math.cos(p.yawRad));
      const toCamera = new THREE.Vector3(...p.cameraPosition).sub(new THREE.Vector3(...p.anchor)).setY(0).normalize();
      assert.ok(facing.dot(toCamera) > 0.999);
    }
  });

  it('lets the content provider override a beat camera and its speed ramp', () => {
    const contents = Array.from({ length: BEAT_COUNT }, () => null) as Array<null | { camera: { focalMm: number; ramp: { travelSec: number } } }>;
    contents[3] = { camera: { focalMm: 50, ramp: { travelSec: 9 } } };
    const kf = buildBeatKeyframes(placements, contents);
    assert.equal(kf[3].focalMm, 50);
    assert.equal(kf[3].ramp.travelSec, 9);
    assert.equal(kf[3].ramp.holdSec, kf[4].ramp.holdSec);
    assert.equal(kf[4].focalMm, 26);
  });
});

describe('kinetic text math', () => {
  it('wraps words into centred lines', () => {
    const slots = layoutWords([{ width: 1 }, { width: 1 }, { width: 1 }], { maxWidth: 2.3, gap: 0.2, lineHeight: 0.5 });
    assert.deepEqual(slots.map((s) => s.line), [0, 0, 1]);
    assert.ok(Math.abs(slots[0].x + 1.1) < 1e-9);
    assert.equal(slots[2].x, -0.5);
    assert.equal(slots[2].y, -0.5);
  });

  it('reveals words one after another and finishes together', () => {
    assert.equal(wordReveal(0, 0, 6), 0);
    assert.equal(wordReveal(1, 5, 6), 1);
    assert.ok(wordReveal(0.4, 0, 6) > wordReveal(0.4, 3, 6));
  });
});

describe('one-shot journey', () => {
  const home = { position: [0, 4, 17] as const, target: [0, 0, 0] as const, focalMm: 28, rollDeg: 0 };
  const keyframes = buildBeatKeyframes(computeBeatPlacements());
  const stops = buildJourneyStops(home, keyframes);

  it('starts and ends at home with a stop for every beat in between', () => {
    assert.equal(stops.length, BEAT_COUNT + 2);
    assert.equal(stops[0].beatIndex, null);
    assert.equal(stops[stops.length - 1].beatIndex, null);
    assert.deepEqual(stops.slice(1, -1).map((s) => s.beatIndex), Array.from({ length: BEAT_COUNT }, (_, i) => i));
  });

  it('one curve passes through every beat camera stop', () => {
    const { position } = buildJourneyCurves(stops);
    const last = stops.length - 1;
    stops.forEach((stop, i) => {
      const p = position.getPoint(i / last);
      assert.ok(p.distanceTo(new THREE.Vector3(...stop.position)) < 1e-6, `stop ${i}`);
    });
  });

  it('plays every beat once, in order, and lasts the sum of travel and hold', () => {
    const proxy: JourneyProxy = { u: 0, focalMm: 28, rollDeg: 0 };
    const entered: number[] = [];
    let completed = false;
    const tl = buildJourneyTimeline(
      stops,
      proxy,
      { onEnter: (i) => entered.push(i), onComplete: () => (completed = true) },
      { reducedMotion: false, paused: true }
    );
    assert.ok(Math.abs(tl.duration() - journeyDurationSec(stops)) < 1e-6);
    tl.progress(1);
    assert.deepEqual(entered, Array.from({ length: BEAT_COUNT }, (_, i) => i));
    assert.equal(proxy.u, 1);
    assert.ok(completed);
    tl.kill();
  });

  it('honours a per-beat speed ramp', () => {
    const slow = buildBeatKeyframes(computeBeatPlacements(), [{ camera: { ramp: { travelSec: 10, holdSec: 0 } } }]);
    const slowStops = buildJourneyStops(home, slow);
    assert.equal(slowStops[1].ramp.travelSec, 10);
    assert.equal(slowStops[1].ramp.holdSec, 0);
    assert.equal(slowStops[2].ramp.travelSec, 3.4);
    assert.equal(stops[1].ramp.travelSec, 4.6);
  });

  it('cuts instead of flying under reduced motion and still announces every beat', () => {
    const proxy: JourneyProxy = { u: 0, focalMm: 28, rollDeg: 0 };
    const entered: number[] = [];
    const tl = buildJourneyTimeline(stops, proxy, { onEnter: (i) => entered.push(i), onComplete: () => undefined }, { reducedMotion: true, paused: true });
    tl.progress(1);
    assert.equal(entered.length, BEAT_COUNT);
    assert.ok(tl.duration() < journeyDurationSec(stops));
    tl.kill();
  });
});

describe('scene teardown', () => {
  function counted<T extends THREE.EventDispatcher<{ dispose: object }>>(target: T, counter: { n: number }): T {
    target.addEventListener('dispose', () => {
      counter.n += 1;
    });
    return target;
  }

  it('disposes every geometry, material and texture under a subtree exactly once, and detaches it', () => {
    const geometry = { n: 0 };
    const material = { n: 0 };
    const texture = { n: 0 };
    const sharedGeometry = counted(new THREE.BoxGeometry(), geometry);
    const sharedMaterial = counted(new THREE.MeshBasicMaterial({ map: counted(new THREE.Texture(), texture) }), material);
    const root = new THREE.Group();
    const inner = new THREE.Group();
    inner.add(new THREE.Mesh(sharedGeometry, sharedMaterial), new THREE.Mesh(sharedGeometry, sharedMaterial));
    inner.add(new THREE.Line(counted(new THREE.BufferGeometry(), geometry), counted(new THREE.LineBasicMaterial(), material)));
    root.add(inner);
    const scene = new THREE.Scene();
    scene.add(root);

    const report = disposeObject3D(root);
    assert.equal(geometry.n, 2);
    assert.equal(material.n, 2);
    assert.equal(texture.n, 1);
    assert.deepEqual([report.geometries, report.materials, report.textures], [2, 2, 1]);
    assert.equal(scene.children.length, 0);
    assert.equal(root.children.length, 0);
  });

  it('isolates a scene down to the core rig and disposes the rest', () => {
    const disposed = { n: 0 };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const light = new THREE.DirectionalLight();
    const flagged = markCoreRig(new THREE.Group());
    flagged.name = 'KeepMe';
    const secondSphere = new THREE.Mesh(
      counted(new THREE.SphereGeometry(), disposed),
      counted(new THREE.MeshBasicMaterial(), disposed)
    );
    secondSphere.name = 'Sphere2_CDE';
    const ribbon = new THREE.Line(counted(new THREE.BufferGeometry(), disposed), new THREE.LineBasicMaterial());
    ribbon.name = 'SplineRibbon';
    scene.add(camera, light, flagged, secondSphere, ribbon);

    const report = isolateScene(scene);
    assert.deepEqual(report.removed.sort(), ['Sphere2_CDE', 'SplineRibbon']);
    assert.equal(report.retained.length, 3);
    assert.equal(scene.children.length, 3);
    assert.ok(scene.children.includes(camera) && scene.children.includes(light) && scene.children.includes(flagged));
    assert.equal(disposed.n, 3);
  });
});

describe('beats container', () => {
  function fakeSlot<C>(log: string[], name: string): BeatSlot<C> {
    return {
      object: new THREE.Group(),
      apply: (content) => log.push(`${name}:${content ? 'filled' : 'empty'}`),
      setReveal: () => undefined,
      dispose: () => log.push(`${name}:disposed`),
    };
  }

  it('builds 25 isolated beat nodes with injectable slot factories and content', () => {
    const log: string[] = [];
    const factories: BeatSlotFactories = {
      createText: () => fakeSlot(log, 'text'),
      createMedia: () => fakeSlot(log, 'media'),
      createMetric: () => fakeSlot(log, 'metric'),
      createMarker: () => ({ object: new THREE.Group(), setActivity: () => undefined, dispose: () => log.push('marker:disposed') }),
    };
    const playback = new MediaPlaybackManager({ maxVideos: 1, reducedMotion: () => false });
    const container = new BeatsTimelineContainer({
      playback,
      factories,
      content: (i) => (i === 7 ? { title: 'Beat eight', text: { words: ['Hello', 'world'] } } : null),
    });
    assert.equal(container.group.name, 'BeatsTimelineContainer');
    assert.equal(container.count, BEAT_COUNT);
    assert.equal(container.group.children.length, BEAT_COUNT);
    assert.equal(container.getContent(7)?.title, 'Beat eight');
    assert.equal(container.getContent(8), null);
    assert.equal(log.filter((l) => l === 'text:filled').length, 1);
    assert.equal(container.getKeyframes().length, BEAT_COUNT);

    container.dispose();
    playback.dispose();
    assert.equal(log.filter((l) => l.endsWith(':disposed')).length, BEAT_COUNT * 4);
    assert.equal(container.group.children.length, 0);
  });
});

describe('environment mode and caption bridge', () => {
  it('mounts Sphere 1 unless the network is asked for by name', () => {
    assert.equal(resolveEnvironmentMode(''), 'sphere1-beats');
    assert.equal(resolveEnvironmentMode('?env=other'), 'sphere1-beats');
    assert.equal(resolveEnvironmentMode('?env=network'), 'network');
  });

  it('says plainly when a beat has no content yet', () => {
    const empty = beatToJourneyBeat(0, null);
    assert.equal(empty.jId, 'B01');
    assert.equal(empty.order, 1);
    assert.equal(empty.nodeId, null);
    assert.ok(empty.honestNoteEn);
    const filled = beatToJourneyBeat(24, { title: 'Done', text: { words: ['The', 'end'] } });
    assert.equal(filled.order, 25);
    assert.equal(filled.narrationEn, 'The end');
    assert.equal(filled.honestNoteEn, undefined);
  });
});
