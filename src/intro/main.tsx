import React, { useEffect, useState } from 'react';
import { BootLoader } from '../components/BootLoader';
import { introBridge } from './bridge';

export interface CerebroIntroProps {
  embedCanvas?: boolean;
  onEnterWorkspace?: (context?: unknown) => void;
  renderWorkspace?: (context?: unknown) => React.ReactNode;
}

/**
 * 180s intro overlay on the shared ExperienceCanvas (embedCanvas=false).
 * Does not create a second WebGL root — continuous canvas stays mounted underneath.
 */
export const CerebroIntro: React.FC<CerebroIntroProps> = ({
  embedCanvas = false,
  onEnterWorkspace,
}) => {
  const [configReady, setConfigReady] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, [embedCanvas]);

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200]"
      data-cerebro-intro="overlay"
      data-embed-canvas="false"
      data-config-ready={configReady ? '1' : '0'}
    >
      <BootLoader
        reducedMotion={false}
        initialPhase="loader"
        onTakeOff={() => onEnterWorkspace?.()}
      />
    </div>
  );
};

export default CerebroIntro;
