/**
 * Live WebGL open sequence — one continuous camera journey over the real Cerebro constellation.
 * Media opens on curved apertures inside the sphere shells (shared scene); the DOM layer
 * carries only the brand mark, one headline, one caption line and compact controls.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cinematicMediaById, CINEMATIC_BRAND } from './cinematicManifest';
import { introBridge } from './bridge';
import { introSoundtrack, type IntroSoundtrackState } from './introSoundtrack';
import {
  OPEN_SEQUENCE_PEOPLE_MEDIA,
  beatAtOpenSequenceTime,
  beatWindowSec,
  createOpenSequencePoseSampler,
  resolveOpenSequenceTiming,
  type OpenSequenceBeat,
  type OpenSequenceLang,
} from './openSequenceConfig';
import { SPHERE_NETWORK } from '../three/sphereNetwork';
import {
  createCurvedMediaAperture,
  type CurvedMediaAperture,
} from '../three/curvedMediaAperture';
import { soundEngine } from '../utils/soundEngine';
import './liveSphereOpenSequence.css';

export type LiveSphereOpenSequenceProps = {
  onComplete: () => void;
  onSkip: () => void;
  reducedMotion?: boolean;
  /** True when the visitor entered with "Play with sound". */
  soundChosen?: boolean;
};

/** Editorial reference clock for typography cues (spec: 30 fps, start-inclusive). */
const TYPE_FPS = 30;

type BeatMedia = {
  key: string;
  src: string;
  kind: 'video' | 'image';
  shape: 'portrait' | 'film';
  focalBiasY: number;
  startAtSec: number;
};

function resolveBeatMedia(beat: OpenSequenceBeat): BeatMedia | null {
  if (beat.person) {
    const person = OPEN_SEQUENCE_PEOPLE_MEDIA[beat.person];
    if (!person.poster) return null;
    return {
      key: `${beat.id}:${person.poster}`,
      src: person.poster,
      kind: 'image',
      shape: 'portrait',
      focalBiasY: 0.78,
      startAtSec: 0,
    };
  }
  if (beat.mediaId?.startsWith('med-')) {
    const media = cinematicMediaById(beat.mediaId);
    if (!media?.src || media.blocked) return null;
    return {
      key: `${beat.id}:${media.src}`,
      src: media.src,
      kind: 'video',
      shape: 'film',
      focalBiasY: 0.5,
      startAtSec: 4,
    };
  }
  return null;
}

function sphereForBeat(beat: OpenSequenceBeat) {
  if (!beat.lookSphere || beat.lookSphere === 'centroid') return null;
  return SPHERE_NETWORK.find((s) => s.id === beat.lookSphere) ?? null;
}

function splitGraphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Optical letter cascade: per-grapheme directional reveal for LTR; Arabic keeps shaped
 * connected text and reveals the whole line through one RTL mask.
 */
const CascadeHeadline: React.FC<{
  text: string;
  lang: OpenSequenceLang;
  reducedMotion: boolean;
  leaving: boolean;
}> = ({ text, lang, reducedMotion, leaving }) => {
  const cueDelayMs = (6 / TYPE_FPS) * 1000;
  const className = `live-open__headline${leaving ? ' is-leaving' : ''}${
    reducedMotion ? ' is-reduced' : ''
  }`;
  if (lang === 'ar' || reducedMotion) {
    return (
      <h2
        className={`${className} live-open__headline--mask`}
        style={{ animationDelay: `${cueDelayMs}ms` }}
      >
        {text}
      </h2>
    );
  }
  const glyphs = splitGraphemes(text);
  const visible = glyphs.filter((g) => g.trim()).length;
  const staggerFrames = Math.min(2, 18 / Math.max(1, visible - 1));
  let i = 0;
  return (
    <h2 className={className} aria-label={text}>
      {glyphs.map((g, idx) => {
        if (!g.trim()) {
          return (
            <span key={idx} className="live-open__glyph-space" aria-hidden>
              {' '}
            </span>
          );
        }
        const startFrame = 6 + i * staggerFrames;
        i += 1;
        return (
          <span
            key={idx}
            className="live-open__glyph"
            aria-hidden
            style={{
              animationDelay: `${(startFrame / TYPE_FPS) * 1000}ms, ${
                ((startFrame + 4) / TYPE_FPS) * 1000
              }ms`,
            }}
          >
            {g}
          </span>
        );
      })}
    </h2>
  );
};

export const LiveSphereOpenSequence: React.FC<LiveSphereOpenSequenceProps> = ({
  onComplete,
  onSkip,
  reducedMotion = false,
  soundChosen = false,
}) => {
  const timing = useMemo(
    () =>
      resolveOpenSequenceTiming(
        typeof window !== 'undefined' ? window.location.search : '',
        reducedMotion
      ),
    [reducedMotion]
  );

  const [lang, setLang] = useState<OpenSequenceLang>('en');
  const [tSec, setTSec] = useState(0);
  const [soundState, setSoundState] = useState<IntroSoundtrackState>(() =>
    introSoundtrack.getState()
  );
  const playheadRef = useRef(0);
  const playingRef = useRef(true);
  const completedRef = useRef(false);
  const rafRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const apertureRef = useRef<{ key: string; aperture: CurvedMediaAperture; beatId: string } | null>(
    null
  );
  const retiringRef = useRef<CurvedMediaAperture[]>([]);
  const lastBeatIdRef = useRef<string>('');

  useEffect(() => introSoundtrack.subscribe(setSoundState), []);

  const teardownApertures = useCallback(() => {
    apertureRef.current?.aperture.dispose();
    apertureRef.current = null;
    for (const a of retiringRef.current) a.dispose();
    retiringRef.current = [];
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    playingRef.current = false;
    introBridge.hostPoseSampler = null;
    teardownApertures();
    void introSoundtrack.fadeOut(600);
    onComplete();
  }, [onComplete, teardownApertures]);

  const skip = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    playingRef.current = false;
    introBridge.hostPoseSampler = null;
    teardownApertures();
    introSoundtrack.stop();
    onSkip();
  }, [onSkip, teardownApertures]);

  // Mount, replace and retire the curved media aperture for the current beat.
  const syncAperture = useCallback(
    (beat: OpenSequenceBeat) => {
      const scene = introBridge.ctx?.scene;
      if (!scene) return;
      const media = resolveBeatMedia(beat);
      const sphere = sphereForBeat(beat);
      const current = apertureRef.current;
      if (current && (!media || current.key !== media.key)) {
        retiringRef.current.push(current.aperture);
        apertureRef.current = null;
      }
      if (!media || !sphere || apertureRef.current) return;
      const center = new THREE.Vector3(...sphere.center);
      const aperture = createCurvedMediaAperture({
        src: media.src,
        kind: media.kind,
        center,
        shellRadius: sphere.radius,
        shape: media.shape,
        focalBiasY: media.focalBiasY,
        onReady: () => {
          if (media.startAtSec && aperture.video) {
            try {
              aperture.video.currentTime = media.startAtSec;
            } catch {
              /* seek once metadata allows */
            }
          }
        },
        onError: () => {
          if (import.meta.env.DEV) {
            console.warn(`[open-sequence] media unavailable for ${beat.id}: ${media.src}`);
          }
        },
      });
      scene.add(aperture.object);
      apertureRef.current = { key: media.key, aperture, beatId: beat.id };
    },
    []
  );

  // Drive introBridge clock + camera on the shared Cosmograph canvas.
  useEffect(() => {
    let cancelled = false;
    const sampler = createOpenSequencePoseSampler(timing);

    (async () => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${base}cerebro.intro.json`.replace(/\/{2,}/g, '/'));
        const config = res.ok
          ? await res.json()
          : { scene: { randomSeed: 39 }, audio: {}, motion: { cameraKeys: [] }, chapters: [] };
        if (cancelled) return;
        introBridge.enabled = true;
        introBridge.configure(
          config,
          () => playheadRef.current,
          () => playingRef.current
        );
        introBridge.hostPoseSampler = (t: number) => sampler(t);
      } catch {
        if (!cancelled) {
          introBridge.enabled = true;
          introBridge.hostPoseSampler = (t: number) => sampler(t);
        }
      }
    })();

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      if (playingRef.current) {
        playheadRef.current = Math.min(timing.durationSec, playheadRef.current + dt);
        setTSec(playheadRef.current);
        const t = playheadRef.current;
        const beat = beatAtOpenSequenceTime(t, timing);
        if (beat.id !== lastBeatIdRef.current) {
          lastBeatIdRef.current = beat.id;
          if (beat.id !== 'wide-reveal') soundEngine.playPanelToggle(true, 0);
        }
        syncAperture(beat);

        const camPos = introBridge.ctx?.camera.position;
        const win = beatWindowSec(beat, timing);
        const current = apertureRef.current;
        if (current && camPos) {
          const local = t - win.start;
          const remain = win.end - t;
          const reveal = Math.min(1, Math.max(0, (local - 0.5) / 0.9), Math.max(0, remain / 0.6));
          current.aperture.face(camPos);
          current.aperture.setReveal(reveal);
        }
        retiringRef.current = retiringRef.current.filter((a) => {
          const op = (a.object.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
          const next = Math.max(0, op.opacity - dt * 2.2);
          op.opacity = next;
          if (next <= 0.001) {
            a.dispose();
            return false;
          }
          return true;
        });

        if (playheadRef.current >= timing.durationSec - 0.04) {
          finish();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      introBridge.hostPoseSampler = null;
      teardownApertures();
    };
  }, [finish, timing, syncAperture, teardownApertures]);

  const beat = beatAtOpenSequenceTime(tSec, timing);
  const win = beatWindowSec(beat, timing);
  const leaving = win.end - tSec < 12 / TYPE_FPS && beat.id !== 'action';
  const headline = lang === 'ar' ? beat.headlineAr : beat.headlineEn;
  const support = lang === 'ar' ? beat.supportAr : beat.supportEn;
  const caption = lang === 'ar' ? beat.narrationAr : beat.narrationEn;
  const media = resolveBeatMedia(beat);
  const credit = media ? (lang === 'ar' ? beat.creditAr || beat.creditEn : beat.creditEn) : undefined;
  const progress = Math.min(1, tSec / Math.max(0.001, timing.durationSec));

  const soundOn = soundState === 'playing' || soundState === 'loading';
  const soundLabel =
    soundState === 'blocked'
      ? 'Tap for sound'
      : soundState === 'error'
      ? 'Sound unavailable'
      : soundOn
      ? 'Sound on'
      : 'Muted';

  const onSoundChip = () => {
    if (soundState === 'blocked' || soundState === 'idle') {
      introSoundtrack.startFromGesture();
      soundEngine.unlock();
      soundEngine.setMuted(false);
      return;
    }
    const nextMuted = soundState === 'playing' || soundState === 'loading';
    introSoundtrack.setMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  return (
    <div
      className="live-open"
      data-testid="live-sphere-open-sequence"
      data-beat={beat.id}
      data-arc={beat.arc || ''}
      data-lang={lang}
      data-sound={soundState}
      data-sound-chosen={soundChosen ? '1' : '0'}
      data-media={media?.src || ''}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="live-open__vignette" aria-hidden />

      <header className="live-open__top">
        <img
          className="live-open__mark"
          src={CINEMATIC_BRAND.localUrl}
          alt="NOJARA"
          width={160}
          height={40}
        />
        <div className="live-open__top-actions">
          <button
            type="button"
            className="live-open__chip"
            data-testid="live-open-lang"
            aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            onClick={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
          >
            {lang === 'en' ? 'ع' : 'EN'}
          </button>
          <button
            type="button"
            className="live-open__chip"
            data-testid="live-open-sound"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute narration bed' : 'Unmute'}
            onClick={onSoundChip}
          >
            {soundLabel}
          </button>
          <button
            type="button"
            className="live-open__chip live-open__chip--skip"
            data-testid="live-open-skip"
            aria-label="Skip intro"
            onClick={skip}
          >
            Skip intro
          </button>
        </div>
      </header>

      <div className="live-open__stage">
        <div className="live-open__copy" key={`${beat.id}-${lang}`}>
          {support && <p className="live-open__kicker">{support}</p>}
          <CascadeHeadline
            text={headline}
            lang={lang}
            reducedMotion={reducedMotion}
            leaving={leaving}
          />
          {credit && <p className="live-open__credit">{credit}</p>}
        </div>
      </div>

      <footer className="live-open__bottom">
        <p className="live-open__caption" data-testid="live-open-caption" aria-live="polite">
          {caption}
        </p>
        <div className="live-open__meter">
          <div
            className="live-open__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Open sequence progress"
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="live-open__clock" data-testid="live-open-clock">
            {Math.floor(tSec / 60)}:{String(Math.floor(tSec % 60)).padStart(2, '0')} /{' '}
            {Math.floor(timing.durationSec / 60)}:
            {String(Math.floor(timing.durationSec % 60)).padStart(2, '0')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LiveSphereOpenSequence;
