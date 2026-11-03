/**
 * Cerebro open-sequence film — single clock, attributable media, onboarding supers.
 * Default public path: autoplay with hideControls (no CTAs). Editorial: 24 fps / 1440 frames.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CINEMATIC_BRAND, cinematicMediaById } from './cinematicManifest';
import {
  CINEMATIC_DURATION_SEC,
  CINEMATIC_FPS,
  CINEMATIC_MOTION,
  CINEMATIC_TOTAL_FRAMES,
  beatAtFrame,
  frameFromSeconds,
  secondsFromFrame,
  type FilmLang,
} from './cinematicTimeline';
import './explainerFilm.css';

export type ExplainerFilmProps = {
  onComplete: () => void;
  reducedMotion?: boolean;
  /** When true, film starts muted (Watch silently / open-sequence autoplay). */
  startMuted?: boolean;
  /** Open sequence: autoplay only — no pause/sound/lang/skip chrome. */
  hideControls?: boolean;
};

type PlaybackDiag =
  | 'READY'
  | 'BUFFERING'
  | 'AUTOPLAY_REJECTED'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'UNSUPPORTED_SOURCE_OR_CODEC'
  | 'DECODE_ERROR'
  | 'GAP_BLOCKED';

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export const ExplainerFilm: React.FC<ExplainerFilmProps> = ({
  onComplete,
  reducedMotion = false,
  startMuted = true,
  hideControls = false,
}) => {
  const totalSec = reducedMotion ? Math.min(48, CINEMATIC_DURATION_SEC) : CINEMATIC_DURATION_SEC;
  const totalFrames = reducedMotion
    ? Math.round(totalSec * CINEMATIC_FPS)
    : CINEMATIC_TOTAL_FRAMES;

  const [lang, setLang] = useState<FilmLang>('en');
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [soundOn, setSoundOn] = useState(!startMuted);
  const [diag, setDiag] = useState<PlaybackDiag>('READY');
  const [completed, setCompleted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playheadRef = useRef(0);
  const playingRef = useRef(true);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const completedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setSoundOn(!startMuted);
  }, [startMuted]);

  // In reduced motion, map shortened playhead across full editorial beats proportionally.
  const editorialFrame = reducedMotion
    ? Math.min(
        CINEMATIC_TOTAL_FRAMES - 1,
        Math.floor((frame / Math.max(1, totalFrames)) * CINEMATIC_TOTAL_FRAMES)
      )
    : frame;
  const activeBeat = beatAtFrame(editorialFrame);
  const media = activeBeat.mediaId ? cinematicMediaById(activeBeat.mediaId) : undefined;
  const mediaBlocked = Boolean(media?.blocked || !media?.src);
  const posterStill = media?.poster || CINEMATIC_BRAND.localUrl;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    setPlaying(false);
    playingRef.current = false;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      if (playingRef.current) {
        playheadRef.current = Math.min(totalSec, playheadRef.current + dt);
        const nextFrame = Math.min(totalFrames - 1, frameFromSeconds(playheadRef.current));
        setFrame(nextFrame);
        if (playheadRef.current >= totalSec - 0.02) {
          finish();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [finish, totalFrames, totalSec]);

  // Sync video to film clock + media in-point
  useEffect(() => {
    const el = videoRef.current;
    if (!el || mediaBlocked || !media?.src) {
      setDiag(mediaBlocked ? 'GAP_BLOCKED' : 'READY');
      return;
    }
    const wantTime =
      activeBeat.mediaInSec +
      (secondsFromFrame(editorialFrame) - secondsFromFrame(activeBeat.startFrame));
    const apply = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      const t = Math.max(0, Math.min(el.duration - 0.05, wantTime));
      if (Math.abs(el.currentTime - t) > 0.35) {
        try {
          el.currentTime = t;
        } catch {
          setDiag('DECODE_ERROR');
        }
      }
    };

    if (el.src !== media.src && !el.src.endsWith(media.src.replace(/^\//, ''))) {
      el.src = media.src;
      el.load();
      setDiag('BUFFERING');
    }

    const onMeta = () => {
      apply();
      if (playingRef.current) {
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => setDiag('AUTOPLAY_REJECTED'));
        } else {
          setDiag('READY');
        }
      }
    };
    const onErr = () => setDiag('HTTP_ERROR');
    const onWait = () => setDiag('BUFFERING');
    const onPlay = () => setDiag('READY');

    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('error', onErr);
    el.addEventListener('waiting', onWait);
    el.addEventListener('playing', onPlay);
    el.muted = !soundOn;
    if (el.readyState >= 1) onMeta();
    else apply();

    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('error', onErr);
      el.removeEventListener('waiting', onWait);
      el.removeEventListener('playing', onPlay);
    };
  }, [activeBeat, editorialFrame, media, mediaBlocked, soundOn]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !soundOn;
    if (soundOn && playingRef.current) {
      void el.play().catch(() => setDiag('AUTOPLAY_REJECTED'));
    }
  }, [soundOn]);

  // Soft bed only after explicit unmute (never auto-start loud)
  useEffect(() => {
    if (!soundOn || reducedMotion || typeof window === 'undefined') return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    audioCtxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.04;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 48;
    osc.connect(gain);
    try {
      osc.start();
      void ctx.resume();
    } catch {
      /* ignore */
    }
    return () => {
      try {
        osc.stop();
        void ctx.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    };
  }, [soundOn, reducedMotion]);

  const headline = lang === 'ar' ? activeBeat.headlineAr : activeBeat.headlineEn;
  const support = lang === 'ar' ? activeBeat.supportAr : activeBeat.supportEn;
  const narration = lang === 'ar' ? activeBeat.narrationAr : activeBeat.narrationEn;
  const credit = lang === 'ar' ? activeBeat.creditAr : activeBeat.creditEn;
  const progress = Math.min(1, frame / Math.max(1, totalFrames - 1));
  const words = headline.split(/\s+/).filter(Boolean);
  const elapsedSec = secondsFromFrame(editorialFrame);

  return (
    <div
      className="explainer-film cinematic-60"
      data-testid="explainer-film"
      data-beat={activeBeat.id}
      data-diag={diag}
      data-lang={lang}
      role="dialog"
      aria-label="Cerebro cinematic introduction"
      style={
        {
          '--cinematic-ease': CINEMATIC_MOTION.cameraEase,
        } as React.CSSProperties
      }
    >
      {!mediaBlocked && media?.src ? (
        <video
          key={media.id}
          ref={videoRef}
          className="explainer-film__video"
          src={media.src}
          poster={media.poster || undefined}
          playsInline
          muted={!soundOn}
          preload="metadata"
          autoPlay={false}
          loop
        />
      ) : (
        <div
          className="explainer-film__gap"
          data-testid="cinematic-gap"
          style={
            posterStill
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(2,5,10,0.55), rgba(2,5,10,0.78)), url(${posterStill})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          <div className="explainer-film__gap-card">
            <p className="explainer-film__gap-title">
              {lang === 'ar' ? 'لقطة الاستوديو' : 'Studio still'}
            </p>
            <p className="explainer-film__gap-body">
              {lang === 'ar'
                ? 'الأصل السينمائي غير متوفر على هذا المضيف — نعرض صورة معتمدة.'
                : 'Cinematic source unavailable on this host — showing an approved studio still.'}
            </p>
          </div>
        </div>
      )}

      <div className="explainer-film__grade" aria-hidden="true" />
      <div className="explainer-film__vignette" aria-hidden="true" />

      <header className="explainer-film__brand cinematic-60__brand">
        <img
          src={CINEMATIC_BRAND.localUrl}
          alt="NOJARA"
          width={160}
          height={40}
          className="cinematic-60__logo"
          draggable={false}
        />
      </header>

      <div className="explainer-film__supers cinematic-60__supers" key={`${activeBeat.id}-${lang}`}>
        <h1 className="cinematic-60__headline" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
          {words.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="cinematic-60__word is-in"
              style={{
                animationDelay: `${Math.min(i, 8) * CINEMATIC_MOTION.wordStaggerMs}ms`,
                transitionDuration: `${CINEMATIC_MOTION.headlineRevealMs}ms`,
              }}
            >
              {w}
              {i < words.length - 1 ? '\u00A0' : ''}
            </span>
          ))}
        </h1>
        {support && (
          <p className="cinematic-60__support" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
            {support}
          </p>
        )}
        <p className="cinematic-60__narration" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
          {narration}
        </p>
        {credit && !mediaBlocked && <p className="cinematic-60__credit">{credit}</p>}
      </div>

      {!hideControls && (
        <footer className="explainer-film__bar cinematic-60__bar">
          <div className="cinematic-60__pill" role="toolbar" aria-label="Film controls">
            <button
              type="button"
              className="cinematic-60__ctrl"
              data-testid="cinematic-play-pause"
              aria-label={playing ? 'Pause film' : 'Play film'}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="cinematic-60__ctrl"
              data-testid="cinematic-sound"
              aria-label={soundOn ? 'Mute film' : 'Unmute film'}
              onClick={() => setSoundOn((s) => !s)}
            >
              {soundOn ? 'Sound on' : 'Sound off'}
            </button>
            <button
              type="button"
              className="cinematic-60__ctrl"
              data-testid="cinematic-lang"
              aria-label="Toggle English or Arabic"
              onClick={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
            >
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
            <button
              type="button"
              data-testid="explainer-skip"
              data-cta-id="explainer.skip"
              className="cinematic-60__ctrl cinematic-60__ctrl--skip"
              onClick={finish}
            >
              Skip
            </button>
          </div>
          <div className="cinematic-60__progress-row" aria-hidden={completed}>
            <span className="cinematic-60__clock">
              {formatClock(elapsedSec)} / {formatClock(totalSec)}
            </span>
            <div
              className="cinematic-60__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div style={{ width: `${Math.min(100, progress * 100)}%` }} />
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ExplainerFilm;
