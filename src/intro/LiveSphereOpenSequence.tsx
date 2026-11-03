/**
 * Live WebGL open sequence — captions/narration over the real Cerebro constellation.
 * One continuous camera journey via introBridge.hostPoseSampler (no opaque film plate).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cinematicMediaById, CINEMATIC_BRAND } from './cinematicManifest';
import { introBridge } from './bridge';
import {
  OPEN_SEQUENCE_PEOPLE_MEDIA,
  beatAtOpenSequenceTime,
  createOpenSequencePoseSampler,
  resolveOpenSequenceTiming,
  type OpenSequenceLang,
} from './openSequenceConfig';
import './liveSphereOpenSequence.css';

export type LiveSphereOpenSequenceProps = {
  onComplete: () => void;
  reducedMotion?: boolean;
  /** Start muted (default public path). */
  startMuted?: boolean;
};

export const LiveSphereOpenSequence: React.FC<LiveSphereOpenSequenceProps> = ({
  onComplete,
  reducedMotion = false,
  startMuted = true,
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
  const [soundOn, setSoundOn] = useState(!startMuted);
  const [portraitOk, setPortraitOk] = useState(false);
  const playheadRef = useRef(0);
  const playingRef = useRef(true);
  const completedRef = useRef(false);
  const rafRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    playingRef.current = false;
    introBridge.hostPoseSampler = null;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    setSoundOn(!startMuted);
  }, [startMuted]);

  // Drive introBridge clock + camera on the shared Cosmograph canvas.
  useEffect(() => {
    let cancelled = false;
    const sampler = createOpenSequencePoseSampler(timing);

    (async () => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${base}cerebro.intro.json`.replace(/\/{2,}/g, '/'));
        const config = res.ok ? await res.json() : { scene: { randomSeed: 39 }, audio: {}, motion: { cameraKeys: [] }, chapters: [] };
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
    };
  }, [finish, timing]);

  const beat = beatAtOpenSequenceTime(tSec, timing);
  const person =
    beat.person && beat.person in OPEN_SEQUENCE_PEOPLE_MEDIA
      ? OPEN_SEQUENCE_PEOPLE_MEDIA[beat.person]
      : null;
  const brandMedia = beat.mediaId?.startsWith('med-')
    ? cinematicMediaById(beat.mediaId)
    : undefined;
  const mediaBlocked = Boolean(
    (person && person.blocked && !portraitOk) ||
      (brandMedia && (brandMedia.blocked || !brandMedia.src)) ||
      (beat.mediaId?.startsWith('person-') && !portraitOk)
  );

  useEffect(() => {
    if (!person?.poster) {
      setPortraitOk(false);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setPortraitOk(true);
    };
    img.onerror = () => {
      if (!cancelled) setPortraitOk(false);
    };
    img.src = person.poster;
    return () => {
      cancelled = true;
    };
  }, [person?.poster, beat.id]);

  // Sync attributable showreel into the inset shell player (cover, no letterbox).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!brandMedia?.src || brandMedia.blocked) {
      video.removeAttribute('src');
      video.load();
      return;
    }
    const inPoint = 4;
    if (video.dataset.mediaId !== brandMedia.id) {
      video.dataset.mediaId = brandMedia.id;
      video.src = brandMedia.src;
      video.load();
    }
    video.muted = !soundOn;
    const sync = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const local = (playheadRef.current % 18) + inPoint;
        if (Math.abs(video.currentTime - local) > 0.45) {
          video.currentTime = Math.min(video.duration - 0.05, local);
        }
      }
      if (playingRef.current && video.paused) void video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', sync);
    sync();
    return () => video.removeEventListener('loadedmetadata', sync);
  }, [brandMedia?.id, brandMedia?.src, brandMedia?.blocked, soundOn, beat.id]);

  const headline = lang === 'ar' ? beat.headlineAr : beat.headlineEn;
  const support = lang === 'ar' ? beat.supportAr : beat.supportEn;
  const narration = lang === 'ar' ? beat.narrationEn && beat.narrationAr : beat.narrationEn;
  const narrationText = lang === 'ar' ? beat.narrationAr : beat.narrationEn;
  const credit = lang === 'ar' ? beat.creditAr || beat.creditEn : beat.creditEn;
  const gap = lang === 'ar' ? beat.gapAr || beat.gapEn : beat.gapEn;
  const progress = Math.min(1, tSec / Math.max(0.001, timing.durationSec));

  void narration;

  return (
    <div
      className="live-open"
      data-testid="live-sphere-open-sequence"
      data-beat={beat.id}
      data-arc={beat.arc || ''}
      data-lang={lang}
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
            onClick={() => setSoundOn((s) => !s)}
          >
            {soundOn ? 'Sound on' : 'Muted'}
          </button>
        </div>
      </header>

      <div className="live-open__stage">
        {(person || brandMedia) && (
          <div
            className={`live-open__shell${mediaBlocked ? ' is-gap' : ''}`}
            data-testid="live-open-media-shell"
            data-person={beat.person || ''}
          >
            {person && portraitOk && person.poster ? (
              <img
                className="live-open__media"
                src={person.poster}
                alt={lang === 'ar' ? person.nameAr : person.nameEn}
              />
            ) : brandMedia?.src && !brandMedia.blocked ? (
              <video
                ref={videoRef}
                className="live-open__media"
                playsInline
                muted={!soundOn}
                loop
                poster={brandMedia.poster || undefined}
                aria-label={brandMedia.title}
              />
            ) : (
              <div className="live-open__gap" data-testid="live-open-media-gap" role="status">
                <p className="live-open__gap-title">
                  {person
                    ? lang === 'ar'
                      ? person.nameAr
                      : person.nameEn
                    : headline}
                </p>
                <p className="live-open__gap-body">
                  {gap || person?.gapEn || 'Approved media for this beat is not available yet.'}
                </p>
              </div>
            )}
            {person && (
              <p className="live-open__role">
                {lang === 'ar' ? person.roleAr : person.roleEn}
              </p>
            )}
          </div>
        )}

        <div className="live-open__copy">
          {support && <p className="live-open__kicker">{support}</p>}
          <h2 className="live-open__headline">{headline}</h2>
          <p className="live-open__narration">{narrationText}</p>
          {credit && !mediaBlocked && <p className="live-open__credit">{credit}</p>}
        </div>
      </div>

      <footer className="live-open__bottom">
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
      </footer>
    </div>
  );
};

export default LiveSphereOpenSequence;
