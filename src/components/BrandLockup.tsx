import React, { useState } from 'react';
import { PUBLIC_BRAND_MEDIA } from '../data/publicBrandMedia';

type Props = {
  mode: 'loader' | 'header';
  activeSphere?: 'hq' | 'cde' | 'campaign-os' | 'about-us';
  onSwitchSphere?: (sphere: 'hq' | 'cde' | 'campaign-os' | 'about-us') => void;
};

const LOGO_CANDIDATES = [
  PUBLIC_BRAND_MEDIA.logoWhite.url,
  PUBLIC_BRAND_MEDIA.logoWhite.sourceUrl,
  '/assets/brand/nojara-logo-mark.svg',
] as const;

/**
 * Centered NOJARA mark + CEREBRO wordmark for workspace chrome / boot.
 * Prefer the official white PNG; fall through to remote then vector mark.
 */
export const BrandLockup: React.FC<Props> = ({ mode }) => {
  const isLoader = mode === 'loader';
  const [logoIndex, setLogoIndex] = useState(0);
  const logoSrc = LOGO_CANDIDATES[Math.min(logoIndex, LOGO_CANDIDATES.length - 1)];
  const logoFailed = logoIndex >= LOGO_CANDIDATES.length;

  return (
    <div
      data-testid={isLoader ? 'brand-lockup-loader' : 'brand-lockup-region'}
      data-layout-id="cerebro-brand-lockup"
      className={
        'nojara-brand-container ' +
        (isLoader ? 'nojara-brand-loader' : 'nojara-brand-header is-centered-stack')
      }
      aria-label="NOJARA Studios"
    >
      {!logoFailed ? (
        <img
          data-testid="nojara-public-logo"
          className="nojara-logo-image"
          src={logoSrc}
          width={PUBLIC_BRAND_MEDIA.logoWhite.width}
          height={PUBLIC_BRAND_MEDIA.logoWhite.height}
          alt="NOJARA Studios"
          decoding="async"
          fetchPriority={isLoader ? 'high' : 'auto'}
          onError={() => setLogoIndex((i) => i + 1)}
        />
      ) : (
        <img
          data-testid="nojara-logo-fallback-svg"
          className="nojara-logo-image"
          src="/assets/brand/nojara-logo-mark.svg"
          width={320}
          height={80}
          alt="NOJARA Studios"
        />
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
