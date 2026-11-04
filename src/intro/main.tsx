import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BootLoader } from '../components/BootLoader';
import { selectLatestSnapshotTimestamp } from '../data/projectPlanModel';
import { soundEngine } from '../utils/soundEngine';
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

type IntroPhase = 'openSequence' | 'loader' | 'ready';

/**
 * Public open path on the shared ExperienceCanvas:
 * lands directly in the live scene → continuous WebGL camera journey → BootLoader → workspace.
 * There is no gate: the journey starts on frame 0 and the master mix joins on the first tap or key press.
 */
export const CerebroIntro: React.FC<CerebroIntroProps> = ({
  embedCanvas = false,
  onEnterWorkspace,
  snapshotIso,
  reducedMotion = false,
}) => {
  const [configReady, setConfigReady] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>('openSequence');
  const [soundChosen, setSoundChosen] = useState(false);
  const exitedRef = useRef(false);

  useEffect(
    () =>
      introSoundtrack.subscribe((state) => {
        if (state === 'playing') setSoundChosen(true);
      }),
    []
  );
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

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200]"
      data-cerebro-intro="overlay"
      data-embed-canvas="false"
      data-config-ready={configReady ? '1' : '0'}
      data-phase={phase}
      style={phase === 'openSequence' ? { pointerEvents: 'none' } : undefined}
    >
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
