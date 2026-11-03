/**
 * Single public entry gate — replaces legacy boot / calibration / Enter sequence screens.
 */
import React from 'react';
import { CINEMATIC_BRAND } from './cinematicManifest';
import './entryGate.css';

export type EntryGateProps = {
  onPlayWithSound: () => void;
  onWatchSilently: () => void;
  onSkip: () => void;
};

export const EntryGate: React.FC<EntryGateProps> = ({
  onPlayWithSound,
  onWatchSilently,
  onSkip,
}) => {
  return (
    <div className="entry-gate" data-testid="entry-gate" role="dialog" aria-label="Enter Cerebro">
      <img
        className="entry-gate__logo"
        src={CINEMATIC_BRAND.localUrl}
        alt="NOJARA Studios"
        width={220}
        height={55}
        draggable={false}
      />
      <h1 className="entry-gate__headline">Who makes it happen?</h1>
      <div className="entry-gate__actions">
        <button
          type="button"
          className="entry-gate__btn entry-gate__btn--primary"
          data-testid="entry-play-sound"
          onClick={onPlayWithSound}
        >
          Play with sound
        </button>
        <button
          type="button"
          className="entry-gate__btn"
          data-testid="entry-watch-silent"
          onClick={onWatchSilently}
        >
          Watch silently
        </button>
      </div>
      <button
        type="button"
        className="entry-gate__skip"
        data-testid="entry-skip"
        onClick={onSkip}
      >
        Skip intro
      </button>
    </div>
  );
};

export default EntryGate;
