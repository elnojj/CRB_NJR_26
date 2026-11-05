import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CameraCommandPayload, CameraTelemetry } from '../../components/CosmographCanvas';
import { AdaptiveResolution } from '../adaptiveResolution';
import { readDeviceFacts, resolveDeviceProfile } from '../deviceProfile';
import { MediaPlaybackManager } from '../mediaPlayback';
import { soundEngine } from '../../utils/soundEngine';
import { BeatsCameraRig, focalToVerticalFovDeg, type JourneyEndReason } from './BeatsCameraRig';
import { Sphere1Environment } from './Sphere1Environment';
import { isolateScene } from './disposal';
import { probeWebgl } from './webglProbe';
import { SCENE_VOID_HEX } from '../postFx';
import type { BeatContent, BeatContentProvider, BeatSlotFactories } from './beatTypes';

const TELEMETRY_INTERVAL_MS = 250;
const MAX_FRAME_SEC = 0.1;

export interface Sphere1Handle {
  startJourney(): void;
  stopJourney(): void;
  /** Show a beat's content without flying the camera, or hide all with null. */
  showBeat(index: number | null): void;
  getEnvironment(): Sphere1Environment | null;
}

export interface Sphere1CanvasProps {
  reducedMotion: boolean;
  audioRms?: number;
  idleOrbitAllowed?: boolean;
  forceWebglFallback?: boolean;
  cameraCommand?: CameraCommandPayload | null;
  /** Inject copy, media, metrics and camera overrides per beat. */
  content?: BeatContentProvider;
  /** Replace how any slot is drawn. */
  factories?: Partial<BeatSlotFactories>;
  onBeat?: (index: number | null, content: BeatContent | null) => void;
  onJourneyEnd?: (reason: JourneyEndReason) => void;
  onTelemetryChange?: (telemetry: CameraTelemetry) => void;
  onUserTouchPauseTour?: () => void;
  onSceneReady?: (scene: THREE.Scene) => void;
  onStatusChange?: (status: 'ACTIVE' | 'FALLBACK' | 'CONTEXT_LOST') => void;
}

/**
 * Host for the clean-slate Sphere 1 scene: one renderer, one camera rig, one environment. Everything the
 * old four-sphere network built (secondary spheres, spline ribbons, offset environments) is simply not
 * created here, and the scene is isolated to the core rig on mount and again on unmount.
 */
export function Sphere1Canvas({ ref, ...props }: Sphere1CanvasProps & { ref?: React.Ref<Sphere1Handle> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const handleRef = useRef<Sphere1Handle>({
    startJourney: () => undefined,
    stopJourney: () => undefined,
    showBeat: () => undefined,
    getEnvironment: () => null,
  });
  const [status, setStatus] = useState<'PROBING' | 'ACTIVE' | 'FALLBACK' | 'CONTEXT_LOST'>('PROBING');

  useImperativeHandle(ref, () => ({
    startJourney: () => handleRef.current.startJourney(),
    stopJourney: () => handleRef.current.stopJourney(),
    showBeat: (index) => handleRef.current.showBeat(index),
    getEnvironment: () => handleRef.current.getEnvironment(),
  }));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;
    const probe = probeWebgl();
    if (!probe.supported || propsRef.current.forceWebglFallback) {
      setStatus('FALLBACK');
      propsRef.current.onStatusChange?.('FALLBACK');
      return undefined;
    }

    const profile = resolveDeviceProfile(readDeviceFacts(probe.softwareGl));
    const governor = new AdaptiveResolution({
      cap: profile.pixelRatioCap,
      floor: profile.pixelRatioFloor,
      initial: profile.initialPixelRatio,
      budgetMs: profile.budgetFrameMs,
    });
    const playback = new MediaPlaybackManager({
      maxVideos: profile.maxVideoTextures,
      reducedMotion: () => propsRef.current.reducedMotion,
    });

    const renderer = new THREE.WebGLRenderer({
      antialias: !probe.softwareGl && profile.tier === 'desktop',
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: profile.preserveDrawingBuffer,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1 + profile.exposureLift;
    renderer.setClearColor(SCENE_VOID_HEX, 1);
    renderer.setPixelRatio(governor.pixelRatio);
    const dom = renderer.domElement;
    Object.assign(dom.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' });
    container.replaceChildren(dom);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_VOID_HEX);
    const camera = new THREE.PerspectiveCamera(focalToVerticalFovDeg(28), 1, 0.05, 220);
    scene.add(camera);

    const environment = new Sphere1Environment({
      softwareGl: probe.softwareGl,
      playback,
      content: propsRef.current.content,
      factories: propsRef.current.factories,
    });
    environment.mount(scene, camera, renderer);
    propsRef.current.onSceneReady?.(scene);

    const rig = new BeatsCameraRig(camera, dom, {
      homeRadius: 17,
      reducedMotion: () => propsRef.current.reducedMotion,
      idleOrbitAllowed: () => propsRef.current.idleOrbitAllowed !== false,
    });
    rig.setCallbacks({
      onBeat: (index) => {
        soundEngine.playNodeSelect(0);
        environment.beats.setActiveBeat(index, propsRef.current.reducedMotion);
        propsRef.current.onBeat?.(index, environment.beats.getContent(index));
      },
      onEnd: (reason) => {
        environment.beats.setActiveBeat(null, propsRef.current.reducedMotion);
        propsRef.current.onBeat?.(null, null);
        propsRef.current.onJourneyEnd?.(reason);
      },
    });

    handleRef.current = {
      startJourney: () => {
        environment.attachAudioListener(camera);
        rig.startJourney(environment.beats.getKeyframes());
        soundEngine.triggerFlightWhoosh(4600, 0);
      },
      stopJourney: () => rig.stopJourney('skipped'),
      showBeat: (index) => environment.beats.setActiveBeat(index, propsRef.current.reducedMotion),
      getEnvironment: () => environment,
    };

    const resize = (): void => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const onPointerDown = (): void => {
      environment.attachAudioListener(camera);
      if (rig.isJourneyActive()) propsRef.current.onUserTouchPauseTour?.();
    };
    dom.addEventListener('pointerdown', onPointerDown);

    let contextLost = false;
    const onContextLost = (event: Event): void => {
      event.preventDefault();
      contextLost = true;
      setStatus('CONTEXT_LOST');
      propsRef.current.onStatusChange?.('CONTEXT_LOST');
    };
    const onContextRestored = (): void => {
      contextLost = false;
      setStatus('ACTIVE');
      propsRef.current.onStatusChange?.('ACTIVE');
    };
    dom.addEventListener('webglcontextlost', onContextLost);
    dom.addEventListener('webglcontextrestored', onContextRestored);

    setStatus('ACTIVE');
    propsRef.current.onStatusChange?.('ACTIVE');

    let lastMs = performance.now();
    let lastTelemetryMs = 0;
    const timer = new THREE.Timer();
    timer.connect(document);

    const frame = (): void => {
      if (contextLost) return;
      const nowMs = performance.now();
      timer.update();
      const dt = Math.min(MAX_FRAME_SEC, Math.max(0, (nowMs - lastMs) / 1000));
      const frameMs = nowMs - lastMs;
      lastMs = nowMs;

      environment.update(dt, timer.getElapsed(), propsRef.current.audioRms ?? 0);
      soundEngine.updateBreathingModulation(timer.getElapsed(), propsRef.current.audioRms ?? 0);
      rig.update(dt);
      renderer.render(scene, camera);

      const nextRatio = governor.sample(frameMs, nowMs);
      if (nextRatio !== null) {
        renderer.setPixelRatio(nextRatio);
        resize();
      }
      if (nowMs - lastTelemetryMs > TELEMETRY_INTERVAL_MS) {
        lastTelemetryMs = nowMs;
        const orbit = rig.getOrbit();
        propsRef.current.onTelemetryChange?.({
          sphere: 'hq',
          focusedNodeId: null,
          distance: Number(orbit.radius.toFixed(1)),
          azimuthDeg: Math.round(THREE.MathUtils.radToDeg(orbit.yaw)),
          polarDeg: Math.round(THREE.MathUtils.radToDeg(orbit.pitch)),
          panOffset: [0, 0, 0],
          autoOrbit: !rig.isJourneyActive(),
          turnSeconds: 0,
          isMoving: rig.getMode() !== 'orbit',
          lastCommand: rig.isJourneyActive() ? 'journey_start' : 'orbit',
          webglActive: true,
          interiorDomeActive: orbit.radius < 8.2,
          focalLengthMm: Math.round(orbit.focalMm),
          vFovDeg: Number(camera.fov.toFixed(1)),
          rollDeg: Number(orbit.rollDeg.toFixed(1)),
        });
      }
    };
    renderer.setAnimationLoop(frame);

    return () => {
      renderer.setAnimationLoop(null);
      timer.dispose();
      observer.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('webglcontextlost', onContextLost);
      dom.removeEventListener('webglcontextrestored', onContextRestored);
      handleRef.current = {
        startJourney: () => undefined,
        stopJourney: () => undefined,
        showBeat: () => undefined,
        getEnvironment: () => null,
      };
      rig.dispose();
      environment.dispose();
      playback.dispose();
      isolateScene(scene, () => false);
      scene.environment?.dispose();
      scene.environment = null;
      scene.background = null;
      renderer.dispose();
      renderer.forceContextLoss();
      dom.remove();
    };
    // The scene is built once per mount; live inputs flow through propsRef.
  }, [props.forceWebglFallback]);

  const command = props.cameraCommand;
  const handledCommandId = useRef(0);
  useEffect(() => {
    if (!command || command.id === handledCommandId.current) return;
    handledCommandId.current = command.id;
    if (command.verb === 'journey_start') handleRef.current.startJourney();
    else if (command.verb === 'journey_stop') handleRef.current.stopJourney();
  }, [command]);

  return (
    <div className="fixed inset-0 z-(--z-scene-canvas) select-none" data-testid="sphere1-canvas-root" data-status={status}>
      <div
        ref={mountRef}
        data-testid="cosmograph-canvas"
        data-environment="sphere1-beats"
        role="img"
        tabIndex={0}
        aria-label="Sphere 1, the 25 Beats environment: a glass sphere with a camera journey through 25 beats."
        className={`w-full h-full touch-none ${status === 'FALLBACK' ? 'opacity-15 pointer-events-none' : ''}`}
      />
    </div>
  );
}
