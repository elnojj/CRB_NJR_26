import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BootLoader } from '../components/BootLoader';
import { selectLatestSnapshotTimestamp } from '../data/projectPlanModel';
import { soundEngine } from '../utils/soundEngine';
import { EntryGate } from './EntryGate';
import { LiveSphereOpenSequence } from './LiveSphereOpenSequence';
import { introBridge } from './bridge';
import { introSoundtrack } from './introSoundtrack';

export interface CerebroIntroProps {
  embedCanvas?: boolean;
  onEnterWorkspace?: (context?: CerebroIntroExitContext) => void;
  renderWorkspace?: (context?: unknown) => React.ReactNode;
  /** Optional override; defaults to latest register/project snapshot. */
  snapshotIso?: string;
  reducedMotion?: boolean;
}

export type CerebroIntroExitContext = {
  snapshotIso: string;
  configReady: boolean;
  /** Visitor chose "Play with sound" and has not muted since. */
  soundOn: boolean;
  via: 'complete' | 'skip';
};

type IntroPhase = 'gate' | 'openSequence' | 'loader' | 'ready';

/**
 * Public open path on the shared ExperienceCanvas:
 * entry gate over the live wide composition → continuous WebGL camera journey → BootLoader → workspace.
 * The single entry action ("Play with sound") starts the master mix inside the user gesture.
 */
export const CerebroIntro: React.FC<CerebroIntroProps> = ({
  embedCanvas = false,
  onEnterWorkspace,
  snapshotIso,
  reducedMotion = false,
}) => {
  const [configReady, setConfigReady] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>('gate');
  const [soundChosen, setSoundChosen] = useState(false);
  const exitedRef = useRef(false);
  const asOf = useMemo(
    () => snapshotIso || selectLatestSnapshotTimestamp(),
    [snapshotIso]
  );

  useEffect(() => {
    if (embedCanvas) {
      console.warn('[CerebroIntro] embedCanvas=true ignored — overlay-only on shared canvas');
    }
    let cancelled = false;
    (async () => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${base}cerebro.intro.json`.replace(/\/{2,}/g, '/'));
        if (!res.ok) throw new Error(`intro json ${res.status}`);
        const config = await res.json();
        if (cancelled) return;
        introSoundtrack.setRemoteSource(config?.audio?.masterSrc);
        introBridge.enabled = true;
        introBridge.configure(
          config,
          () => 0,
          () => false
        );
        setConfigReady(true);
      } catch {
        if (!cancelled) {
          introBridge.enabled = true;
          setConfigReady(true);
        }
      } finally {
        if (!cancelled) introSoundtrack.preload();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [embedCanvas]);

  const enterWorkspace = useCallback(
    (via: CerebroIntroExitContext['via']) => {
      if (exitedRef.current) return;
      exitedRef.current = true;
      setPhase('ready');
      soundEngine.setVoiceOrMediaActive(false);
      onEnterWorkspace?.({
        snapshotIso: asOf,
        configReady,
        soundOn: soundChosen && !soundEngine.isMuted(),
        via,
      });
    },
    [asOf, configReady, onEnterWorkspace, soundChosen]
  );

  const startWithSound = () => {
    // play() must run synchronously inside this click for mobile Safari / Chrome.
    introSoundtrack.startFromGesture();
    soundEngine.unlock();
    soundEngine.setMuted(false);
    soundEngine.setVoiceOrMediaActive(true);
    setSoundChosen(true);
    setPhase('openSequence');
  };

  const startSilently = () => {
    soundEngine.unlock();
    setSoundChosen(false);
    setPhase('openSequence');
  };

  const skipIntro = () => {
    introSoundtrack.stop();
    introBridge.hostPoseSampler = null;
    enterWorkspace('skip');
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200]"
      data-cerebro-intro="overlay"
      data-embed-canvas="false"
      data-config-ready={configReady ? '1' : '0'}
      data-phase={phase}
      style={phase === 'openSequence' ? { pointerEvents: 'none' } : undefined}
    >
      {phase === 'gate' && (
        <div data-testid="cerebro-intro-wordmark" className="absolute inset-0">
          <EntryGate
            onPlayWithSound={startWithSound}
            onWatchSilently={startSilently}
            onSkip={skipIntro}
          />
        </div>
      )}

      {phase === 'openSequence' && (
        <LiveSphereOpenSequence
          reducedMotion={reducedMotion}
          soundChosen={soundChosen}
          onComplete={() => setPhase('loader')}
          onSkip={() => enterWorkspace('skip')}
        />
      )}

      {phase === 'loader' && (
        <BootLoader
          reducedMotion={reducedMotion}
          initialPhase="loader"
          onTakeOff={() => enterWorkspace('complete')}
        />
      )}
    </div>
  );
};

export default CerebroIntro;
