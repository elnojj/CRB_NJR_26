import React, { useEffect, useMemo, useState } from 'react';
import { BootLoader } from '../components/BootLoader';
import { selectLatestSnapshotTimestamp } from '../data/projectPlanModel';
import { ExplainerFilm } from './ExplainerFilm';
import { introBridge } from './bridge';

export interface CerebroIntroProps {
  embedCanvas?: boolean;
  onEnterWorkspace?: (context?: unknown) => void;
  renderWorkspace?: (context?: unknown) => React.ReactNode;
  /** Optional override; defaults to latest register/project snapshot. */
  snapshotIso?: string;
  reducedMotion?: boolean;
}

type IntroPhase = 'title' | 'openSequence' | 'loader' | 'ready';

/**
 * Public open path on the shared ExperienceCanvas:
 * wordmark → control-free open sequence → BootLoader → workspace.
 */
export const CerebroIntro: React.FC<CerebroIntroProps> = ({
  embedCanvas = false,
  onEnterWorkspace,
  snapshotIso,
  reducedMotion = false,
}) => {
  const [configReady, setConfigReady] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>('title');
  const asOf = useMemo(
    () => snapshotIso || selectLatestSnapshotTimestamp(),
    [snapshotIso]
  );
  const asOfLabel = useMemo(() => {
    const t = Date.parse(asOf);
    if (Number.isNaN(t)) return asOf;
    return new Date(t).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [asOf]);

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
        introBridge.enabled = true;
        introBridge.configure(
          config,
          () => 0,
          () => false
        );
        setConfigReady(true);
      } catch {
        if (!cancelled) setConfigReady(true);
      }
    })();
    // Wordmark holds briefly, then auto-enters the open sequence (no CTA).
    const titleTimer = window.setTimeout(() => setPhase('openSequence'), 1600);
    return () => {
      cancelled = true;
      window.clearTimeout(titleTimer);
    };
  }, [embedCanvas]);

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200]"
      data-cerebro-intro="overlay"
      data-embed-canvas="false"
      data-config-ready={configReady ? '1' : '0'}
      data-phase={phase}
    >
      {phase === 'title' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#101D27]/92 px-6 text-center backdrop-blur-md"
          data-testid="cerebro-intro-wordmark"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#9AFFE0]">
            Cerebro · dual sphere
          </p>
          <h1 className="mt-3 max-w-xl font-display text-3xl text-[#F2F6F8] md:text-5xl">
            NOJARA Studios
          </h1>
          <p className="mt-3 max-w-md font-mono text-xs text-[#BDCBD3]">
            Spatial workspace boot · register snapshot {asOfLabel}
          </p>
        </div>
      )}

      {phase === 'openSequence' && (
        <ExplainerFilm
          reducedMotion={reducedMotion}
          startMuted
          hideControls
          onComplete={() => setPhase('loader')}
        />
      )}

      {phase === 'loader' && (
        <BootLoader
          reducedMotion={reducedMotion}
          initialPhase="loader"
          onTakeOff={() => {
            setPhase('ready');
            onEnterWorkspace?.({ snapshotIso: asOf, configReady });
          }}
        />
      )}
    </div>
  );
};

export default CerebroIntro;
