import React, { useState } from 'react';
import { PUBLIC_BRAND_MEDIA } from '../data/publicBrandMedia';

type Props = {
  mode: 'loader' | 'header';
  activeSphere?: 'hq' | 'cde' | 'campaign-os' | 'about-us';
  onSwitchSphere?: (sphere: 'hq' | 'cde' | 'campaign-os' | 'about-us') => void;
};

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
          src={PUBLIC_BRAND_MEDIA.logoWhite.url}
          width={PUBLIC_BRAND_MEDIA.logoWhite.width}
          height={PUBLIC_BRAND_MEDIA.logoWhite.height}
          alt="NOJARA Studios"
          decoding="async"
          fetchPriority={isLoader ? 'high' : 'auto'}
          onError={(e) => {
            console.error('[NOJARA BRAND] Public logo failed to load:', e);
            setLogoFailed(true);
          }}
        />
      ) : (
        <span
          data-testid="nojara-logo-fallback-text"
          className="nojara-logo-fallback-text"
          title="Logo image asset failed to load"
        >
          NOJARA Studios
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
