import React, { useState } from 'react';

type Props = {
  mode: 'loader' | 'header';
  activeSphere?: 'hq' | 'cde';
  onSwitchSphere?: (sphere: 'hq' | 'cde') => void;
};

/** Readable geometric wordmark — the V31 abstract PNG is too fragmented at header size. */
const NOJARA_WORDMARK = {
  url: '/assets/brand/nojara-wordmark.svg',
  width: 200,
  height: 36,
} as const;

export const BrandLockup: React.FC<Props> = ({ mode }) => {
  const isLoader = mode === 'loader';
  const [logoFailed, setLogoFailed] = useState<boolean>(false);

  return (
    <div
      data-testid={isLoader ? 'brand-lockup-loader' : 'brand-lockup-region'}
      data-layout-id="cerebro-brand-lockup"
      className={
        'nojara-brand-container ' + (isLoader ? 'nojara-brand-loader' : 'nojara-brand-header is-centered-stack')
      }
      aria-label="NOJARA Studios"
    >
      {!logoFailed ? (
        <img
          data-testid="nojara-public-logo"
          className="nojara-logo-image"
          src={NOJARA_WORDMARK.url}
          width={NOJARA_WORDMARK.width}
          height={NOJARA_WORDMARK.height}
          alt="NOJARA"
          decoding="async"
          fetchPriority={isLoader ? 'high' : 'auto'}
          onError={(e) => {
            console.error('[NOJARA BRAND] Wordmark failed to load:', e);
            setLogoFailed(true);
          }}
        />
      ) : (
        <span
          data-testid="nojara-logo-fallback-text"
          className="nojara-logo-fallback-text"
          title="Logo image asset failed to load"
        >
          NOJARA
        </span>
      )}
      {!isLoader && (
        <img
          className="cerebro-wordmark-image"
          src="/assets/cerebro-wordmark.svg"
          width="84"
          height="16"
          alt="Cerebro"
        />
      )}
    </div>
  );
};
