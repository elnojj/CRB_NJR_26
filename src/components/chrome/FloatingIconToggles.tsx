import React from 'react';
import './floatingIconToggles.css';

export type FloatingToggleId =
  | 'hq'
  | 'cde'
  | 'campaign-os'
  | 'about-us'
  | 'more'
  | 'overview'
  | 'tour'
  | 'back'
  | 'fullscreen';

type ToggleSpec = {
  id: FloatingToggleId;
  label: string;
  active?: boolean;
  visible?: boolean;
  onClick: () => void;
  testId?: string;
  badge?: string | number;
};

type Props = {
  toggles: ToggleSpec[];
  moreOpen?: boolean;
  moreMenu?: React.ReactNode;
};

function Glyph({ id }: { id: FloatingToggleId }) {
  switch (id) {
    case 'hq':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      );
    case 'cde':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 3.5 L20 8.2 V15.8 L12 20.5 L4 15.8 V8.2 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'campaign-os':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 9h8M8 12h8M8 15h5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'about-us':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M5.5 18.5c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'more':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="6" cy="12" r="1.7" fill="currentColor" />
          <circle cx="12" cy="12" r="1.7" fill="currentColor" />
          <circle cx="18" cy="12" r="1.7" fill="currentColor" />
        </svg>
      );
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="4" y="4" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="13" y="4" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="4" y="13" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="13" y="13" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case 'tour':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M5 12c2.2-4.5 5-6.8 7-6.8S16.8 7.5 19 12c-2.2 4.5-5 6.8-7 6.8S7.2 16.5 5 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="12" cy="12" r="2.3" fill="currentColor" />
        </svg>
      );
    case 'back':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M14.5 6.5 L9 12 l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'fullscreen':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function FloatingIconToggles({ toggles, moreOpen, moreMenu }: Props) {
  return (
    <div
      data-testid="floating-icon-toggles"
      className="floating-icon-toggles"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {toggles
        .filter((t) => t.visible !== false)
        .map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={t.testId || `float-toggle-${t.id}`}
            aria-label={t.label}
            aria-pressed={Boolean(t.active)}
            title={t.label}
            onClick={t.onClick}
            className={`floating-icon-toggle${t.active ? ' is-active' : ''}${
              t.id === 'more' && moreOpen ? ' is-open' : ''
            }`}
          >
            <Glyph id={t.id} />
            {t.badge != null && t.badge !== '' ? (
              <span className="floating-icon-badge">{t.badge}</span>
            ) : null}
          </button>
        ))}
      {moreOpen && moreMenu ? (
        <div className="floating-icon-more-menu" data-testid="floating-more-menu">
          {moreMenu}
        </div>
      ) : null}
    </div>
  );
}
