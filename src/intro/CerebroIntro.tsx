import React from 'react';
import { BootLoader } from '../components/BootLoader';
import { assertIntroBridgeClean, spawnIntroBackgroundMedia } from './bridge';

export interface CerebroIntroProps {
  /** When false (default), reuse the app's shared ExperienceCanvas — never create a second WebGL root. */
  embedCanvas?: boolean;
  reducedMotion: boolean;
  initialPhase?: 'keypad' | 'loader';
  onComplete: () => void;
}

/**
 * Intro shell as a transparent overlay on the continuous 3D canvas.
 * Text / gate / skip controls only — no duplicate WebGL context.
 */
export const CerebroIntro: React.FC<CerebroIntroProps> = ({
  embedCanvas = false,
  reducedMotion,
  initialPhase,
  onComplete,
}) => {
  assertIntroBridgeClean();
  spawnIntroBackgroundMedia();

  if (embedCanvas) {
    // Shared-canvas architecture forbids a nested WebGL intro.
    console.warn('[CerebroIntro] embedCanvas=true ignored — using overlay-only mode');
  }

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[200]"
      data-cerebro-intro="overlay"
      data-embed-canvas="false"
    >
      <BootLoader
        reducedMotion={reducedMotion}
        initialPhase={initialPhase}
        onTakeOff={onComplete}
      />
    </div>
  );
};
