/**
 * Trailer-style Cerebro explainer — cascading supers + NOJARA media cutdowns.
 * Skip or end-of-film both advance to the Owner Gate (access code), not the workspace.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PUBLIC_BRAND_MEDIA } from '../data/publicBrandMedia';
import { BrandLockup } from '../components/BrandLockup';
import './explainerFilm.css';

export type ExplainerFilmProps = {
  onComplete: () => void;
  reducedMotion?: boolean;
};

type TrailerBeat = {
  id: string;
  /** Seconds this beat holds on screen */
  holdSec: number;
  /** Cascading lines (appear one after another) */
  lines: string[];
  /** Optional Arabic line under the cascade */
  lineAr?: string;
  /** B-roll source */
  videoUrl: string;
  posterUrl?: string;
  /** Transition out style */
  transition: 'whip' | 'fade-black' | 'iris' | 'cut';
};

const BEATS: TrailerBeat[] = [
  {
    id: 'cold-open',
    holdSec: 4.2,
    lines: ['NOJARA STUDIOS', 'PRESENTS'],
    lineAr: 'نُچارة',
    videoUrl: PUBLIC_BRAND_MEDIA.showreel2023.url,
    posterUrl: PUBLIC_BRAND_MEDIA.showreel2023.posterUrl,
    transition: 'fade-black',
  },
  {
    id: 'what-cerebro',
    holdSec: 5.4,
    lines: ['CEREBRO', 'A dual-sphere spatial workspace', 'HQ · CDE · Campaign · About'],
    lineAr: 'سيريبو — فضاء عمل بصري',
    videoUrl: PUBLIC_BRAND_MEDIA.laligaFilm.url,
    posterUrl: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
    transition: 'whip',
  },
  {
    id: 'what-nojara',
    holdSec: 5.2,
    lines: ['NOJARA', 'Culture · Design · Entertainment', 'Films, campaigns, and live worlds'],
    lineAr: 'نُچارة — ثقافة · تصميم · ترفيه',
    videoUrl: PUBLIC_BRAND_MEDIA.elBatron.url,
    posterUrl: PUBLIC_BRAND_MEDIA.elBatron.posterUrl,
    transition: 'iris',
  },
  {
    id: 'media',
    holdSec: 5.0,
    lines: ['MEDIA', 'Showreels · registers · live voice', 'One glass chrome · one spatial map'],
    videoUrl: PUBLIC_BRAND_MEDIA.showreel2023.url,
    posterUrl: PUBLIC_BRAND_MEDIA.showreel2023.posterUrl,
    transition: 'fade-black',
  },
  {
    id: 'title-card',
    holdSec: 3.6,
    lines: ['ENTER CEREBRO'],
    lineAr: 'ادخل سيريبو',
    videoUrl: PUBLIC_BRAND_MEDIA.laligaFilm.url,
    posterUrl: PUBLIC_BRAND_MEDIA.laligaFilm.posterUrl,
    transition: 'cut',
  },
];

export const ExplainerFilm: React.FC<ExplainerFilmProps> = ({
  onComplete,
  reducedMotion = false,
}) => {
  const [beatIndex, setBeatIndex] = useState(0);
  const [lineVisible, setLineVisible] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionKind, setTransitionKind] = useState<TrailerBeat['transition']>('fade-black');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Autoplay trailer bed on mount (no click required; browsers may mute until gesture).
  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    audioCtxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.07;
    master.connect(ctx.destination);

    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 55;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.55;
    hum.connect(humGain);
    humGain.connect(master);

    const shimmer = ctx.createOscillator();
    shimmer.type = 'triangle';
    shimmer.frequency.value = 220;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.12;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(master);

    try {
      hum.start();
      shimmer.start();
      void ctx.resume();
    } catch {
      /* ignore autoplay blocks */
    }

    return () => {
      try {
        hum.stop();
        shimmer.stop();
        void ctx.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    };
  }, [reducedMotion]);

  const beat = BEATS[Math.min(beatIndex, BEATS.length - 1)];
  const totalSec = useMemo(
    () => BEATS.reduce((s, b) => s + (reducedMotion ? Math.min(1.2, b.holdSec) : b.holdSec), 0),
    [reducedMotion]
  );

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  // Cascading line reveal within a beat
  useEffect(() => {
    setLineVisible(0);
    if (reducedMotion) {
      setLineVisible(beat.lines.length);
      return;
    }
    const timers: number[] = [];
    beat.lines.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setLineVisible(i + 1), 280 + i * 420)
      );
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [beat, reducedMotion]);

  // Advance beats with trailer transitions
  useEffect(() => {
    const hold = reducedMotion ? Math.min(1.2, beat.holdSec) : beat.holdSec;
    const advanceAt = window.setTimeout(() => {
      if (beatIndex >= BEATS.length - 1) {
        finish();
        return;
      }
      setTransitionKind(beat.transition);
      setTransitioning(true);
      const wipeMs = reducedMotion ? 120 : beat.transition === 'cut' ? 80 : 520;
      window.setTimeout(() => {
        setBeatIndex((i) => i + 1);
        setTransitioning(false);
      }, wipeMs);
    }, hold * 1000);
    return () => window.clearTimeout(advanceAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finish is stable via ref
  }, [beatIndex, beat, reducedMotion]);

  // Keep B-roll playing (muted autoplay for trailer underlay)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.load();
    const play = el.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  }, [beat.videoUrl]);

  return (
    <div
      className="explainer-film"
      data-testid="explainer-film"
      data-beat={beat.id}
      data-transitioning={transitioning ? '1' : '0'}
      role="dialog"
      aria-label="Cerebro explainer film"
    >
      <video
        ref={videoRef}
        className="explainer-film__video"
        src={beat.videoUrl}
        poster={beat.posterUrl}
        muted
        playsInline
        autoPlay
        loop
        preload="auto"
      />
      <div className="explainer-film__grade" aria-hidden="true" />
      <div className="explainer-film__vignette" aria-hidden="true" />

      <header className="explainer-film__brand">
        <BrandLockup mode="loader" />
      </header>

      <div className="explainer-film__supers" key={beat.id}>
        {beat.lines.map((line, i) => (
          <p
            key={`${beat.id}-${i}`}
            className={`explainer-film__line explainer-film__line--${i === 0 ? 'hero' : 'support'} ${
              i < lineVisible ? 'is-in' : ''
            }`}
            style={{ transitionDelay: `${i * 40}ms` }}
          >
            {line}
          </p>
        ))}
        {beat.lineAr && lineVisible >= beat.lines.length && (
          <p className="explainer-film__line explainer-film__line--ar is-in" dir="rtl" lang="ar">
            {beat.lineAr}
          </p>
        )}
      </div>

      <div
        className={`explainer-film__wipe explainer-film__wipe--${transitionKind} ${
          transitioning ? 'is-active' : ''
        }`}
        aria-hidden="true"
      />

      <footer className="explainer-film__bar">
        <button
          type="button"
          data-testid="explainer-skip"
          data-cta-id="explainer.skip"
          className="explainer-film__skip"
          onClick={finish}
        >
          Skip
        </button>
        <span className="explainer-film__meta">
          Trailer · ~{Math.round(totalSec)}s · then access code
        </span>
      </footer>
    </div>
  );
};

export default ExplainerFilm;
