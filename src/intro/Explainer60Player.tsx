/**
 * Optional 60-second cinematic explainer edition (R06).
 * Does not mutate the 180-second intro timeline or 18-screen tour.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CosmographCanvas } from '../components/CosmographCanvas';
import { introBridge } from './bridge';
import {
  loadExplainer60,
  sampleExplainer60Pose,
  type Explainer60Config,
} from './explainer60';
import { createIstanbaMouldProof, type IstanbaProofHandle } from '../three/istanbaMouldProof';
import './styles.css';

type Props = {
  onEnterWorkspace?: () => void;
  lang?: 'en' | 'ar';
};

class ExplainerPlayer {
  playing = false;
  position = 0;
  started = 0;
  duration = 60;
  audio = new Audio('/assets/audio/intro-music-sfx.m4a');
  audioReady = false;
  audioError = '';
  constructor() {
    this.audio.preload = 'auto';
    this.audio.addEventListener('canplay', () => {
      this.audioReady = true;
    });
    this.audio.addEventListener('error', () => {
      this.audioError = 'Music file unavailable; visuals remain available.';
    });
  }
  time = () =>
    this.playing
      ? Math.min(
          this.duration,
          this.audioReady && !this.audio.paused
            ? this.audio.currentTime
            : this.position + (performance.now() - this.started) / 1000
        )
      : this.position;
  async play() {
    if (this.time() >= this.duration - 0.02) this.seek(0);
    this.position = this.time();
    this.started = performance.now();
    this.playing = true;
    if (this.audio.readyState >= 1) this.audio.currentTime = this.position;
    try {
      await this.audio.play();
    } catch {
      this.audioError = 'Sound playback was blocked; tap ENTER WITH SOUND again.';
    }
  }
  pause() {
    this.position = this.time();
    this.playing = false;
    this.audio.pause();
  }
  seek(t: number) {
    this.position = Math.max(0, Math.min(this.duration, t));
    this.started = performance.now();
    if (this.audio.readyState >= 1) this.audio.currentTime = this.position;
  }
}

const stubConfig = {
  scene: { randomSeed: 60 },
  audio: { rmsByFrame: [], voiceEnabled: false, captions: [] },
  assets: {},
  chapters: [],
  brand: { logo: 'assets/brand/nojara-logo-white.png' },
};

export function Explainer60Player({ onEnterWorkspace }: Props) {
  const playerRef = useRef(new ExplainerPlayer());
  const configRef = useRef<Explainer60Config | null>(null);
  const istanbaRef = useRef<IstanbaProofHandle | null>(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [copy, setCopy] = useState({ en: '', ar: '', focus: '' });
  const [frame, setFrame] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const player = playerRef.current;
    introBridge.enabled = true;
    introBridge.configure(stubConfig, () => player.time(), () => player.playing);

    loadExplainer60()
      .then((cfg) => {
        if (cancelled) return;
        configRef.current = cfg;
        introBridge.hostPoseSampler = (t: number) => {
          const p = sampleExplainer60Pose(cfg, t);
          return { position: p.position, target: p.target, focalMm: p.focalMm };
        };
        setReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'explainer60 unavailable');
      });

    const tick = () => {
      const cfg = configRef.current;
      const t = player.time();
      if (cfg) {
        const sampled = sampleExplainer60Pose(cfg, t);
          setFrame(sampled.frame);
        if (sampled.beat) {
          setBeatIndex(Math.max(0, cfg.beats.indexOf(sampled.beat)));
          const elapsed = Math.max(0, sampled.frame - sampled.beat.frames[0]);
          const progress = Math.min(1, elapsed / Math.max(1, sampled.beat.frames[1] - sampled.beat.frames[0]));
          const activeText = sampled.beat.copyEn;
          setWordCount(Math.max(1, Math.ceil(activeText.trim().split(/\s+/).length * Math.min(1, progress * 1.8))));
          setCopy({
            en: sampled.beat.copyEn,
            ar: sampled.beat.copyAr,
            focus: sampled.beat.focus,
          });
          const proposed =
            sampled.beat.assetGate === 'PROPOSED' ||
            sampled.beat.focus.includes('إصطمبة') ||
            sampled.beat.focus.toLowerCase().includes('industry');
          if (istanbaRef.current) {
            if (proposed) {
              istanbaRef.current.setState(
                sampled.beat.focus.includes('إصطمبة') ? 'project_world' : 'threshold_flight',
                1
              );
            } else {
              istanbaRef.current.setState('parent_sphere', 0);
            }
          }
        }
      }
      if (t >= 59.98 && player.playing) {
        player.pause();
        setPlaying(false);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      introBridge.hostPoseSampler = null;
      istanbaRef.current?.dispose();
      istanbaRef.current = null;
    };
  }, []);

  const startWithSound = async () => {
    const player = playerRef.current;
    await player.play();
    setStarted(true);
    setPlaying(true);
    if (player.audioError) setError(player.audioError);
  };

  const enter = () => {
    playerRef.current.pause();
    setPlaying(false);
    introBridge.enabled = false;
    introBridge.hostPoseSampler = null;
    onEnterWorkspace?.();
  };

  const dir = 'ltr';
  const activeCopy = copy.en;
  const visibleWords = activeCopy.trim().split(/\s+/).slice(0, wordCount).join(' ');

  return (
    <main className="intro-shell chrome-visible" data-edition="explainer-60" data-testid="explainer-60">
      <div id="cerebro-stage" className={`stage ${!started && ready ? 'is-prestart' : ''}`}>
        <CosmographCanvas
          activeSphere="hq"
          focusedNodeId={null}
          tourHighlightId={null}
          captionBubble={null}
          reducedMotion={false}
          cameraCommand={null}
          onSelectNode={() => {}}
          onUserTouchPauseTour={() => {
            playerRef.current.pause();
            setPlaying(false);
          }}
          onTelemetryChange={() => {}}
          onSceneReady={(scene) => {
            if (!istanbaRef.current) {
              istanbaRef.current = createIstanbaMouldProof(scene);
            }
          }}
        />
        <header className="identity" aria-label="NOJARA Studios">
          <img
            src={new URL(stubConfig.brand.logo, document.baseURI).href}
            alt="NOJARA Studios"
          />
          <span>60S EXPLAINER{ready ? '' : ' · LOADING'}</span>
        </header>
        <div className="intro-skip-rail" role="group" aria-label="Explainer shortcuts">
          <button type="button" className="intro-skip" data-testid="explainer60-skip" onClick={enter}>
            Skip
          </button>
          <button type="button" className="intro-enter-quiet" data-testid="explainer60-enter" onClick={enter}>
            Enter Cerebro <span aria-hidden="true">↗</span>
          </button>
        </div>
        {!started && ready && (
          <div className="explainer-start" role="dialog" aria-label="Start the 60-second explainer">
            <p>60-SECOND MEDIA INTRO</p>
            <h1>THE CONTENT BUSINESS HAS CHANGED.</h1>
            <button type="button" onClick={() => void startWithSound()}>
              ENTER WITH SOUND
            </button>
            <small>{error || 'Music and sound effects start after your interaction. Narration: unavailable.'}</small>
          </div>
        )}
        <section className={`editorial editorial-live beat-${beatIndex}`} dir={dir} lang="en">
          <div className="eyebrow">{copy.focus}</div>
          <h1>{visibleWords}</h1>
        </section>
        <p className="captions" dir={dir}>{visibleWords}</p>
        <div className="chrome-layer is-visible">
          <footer className="transport" aria-label="Explainer playback">
            <button
              type="button"
              onClick={() => {
                const player = playerRef.current;
                if (player.playing) {
                  player.pause();
                  setPlaying(false);
                } else {
                  player.play();
                  setPlaying(true);
                }
              }}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <span className="language-label">ENGLISH · 60S</span>
            <input
              type="range"
              min="0"
              max="60"
              step="0.016"
              value={playerRef.current.time()}
              aria-label="Explainer timeline position"
              onChange={(event) => playerRef.current.seek(Number(event.target.value))}
            />
            <span data-testid="explainer60-frame">
              f{frame} / 3600 · {Math.floor(playerRef.current.time())}s
            </span>
            <span className="audio-status" role="status">{playerRef.current.audioError || 'Narration unavailable · visual timing is unverified'}</span>
            {error ? <span role="alert">{error}</span> : null}
          </footer>
        </div>
      </div>
    </main>
  );
}
