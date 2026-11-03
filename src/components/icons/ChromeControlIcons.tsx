import React from 'react';

/** Compact vector icons for voice dock / Hands chrome — no text labels. */

type IconProps = {
  className?: string;
  title?: string;
  active?: boolean;
};

export function PhoneCallIcon({ className, title = 'Call' }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6.6 3.8c.5-.5 1.3-.6 1.9-.2l2.1 1.4c.55.36.74 1.08.45 1.66l-.9 1.8a1.2 1.2 0 0 0 .2 1.35l2.5 2.5c.38.38.97.48 1.45.24l1.85-.92c.58-.29 1.28-.1 1.64.44l1.35 2.05c.42.64.3 1.5-.28 1.98l-1.55 1.28c-.5.42-1.18.55-1.8.35-1.7-.55-3.55-1.85-5.35-3.65S5.8 9.9 5.25 8.2c-.2-.62-.07-1.3.35-1.8L6.6 3.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MuteMicIcon({ className, title = 'Mute', muted = false }: IconProps & { muted?: boolean }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 3.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 11.5a4.5 4.5 0 0 0 9 0M12 16v3.5M9.5 19.5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {muted ? (
        <path
          d="M4.5 5.5 19.5 18.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}

/**
 * Compact glove mark derived from HandsOverlay landmark silhouette —
 * filled glass glove, not skeleton dots.
 */
export function HandsGloveIcon({ className, title = 'Hands', active }: IconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 64 72"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="gloveChromeFill" x1="20%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor={active ? '#FFF4D0' : '#B4DDFF'} stopOpacity="0.95" />
          <stop offset="55%" stopColor={active ? '#D4AF37' : '#36E88D'} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0C121C" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Palm shell */}
      <path
        d="M18 34c-1.5-8 3-16 10-18 4-1 8 1 10 4 2-5 8-8 13-6 4 1.5 7 6 7 11v18c0 10-7 18-17 18H30c-8 0-14-6-14-14V34Z"
        fill="url(#gloveChromeFill)"
        stroke={active ? '#D4AF37' : '#B4DDFF'}
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Fingers */}
      <path
        d="M22 30c0-9 2.5-16 5.5-16S33 21 33 30"
        stroke={active ? '#FFF4D0' : '#E8FBFF'}
        strokeWidth="5.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M30 26c0-12 2.8-20 5.8-20S42 14 42 26"
        stroke={active ? '#FFF4D0' : '#E8FBFF'}
        strokeWidth="5.8"
        strokeLinecap="round"
        opacity="0.92"
      />
      <path
        d="M38 28c0-10 2.5-17 5.2-17S49 18 49 28"
        stroke={active ? '#FFF4D0' : '#E8FBFF'}
        strokeWidth="5.2"
        strokeLinecap="round"
        opacity="0.88"
      />
      <path
        d="M45 32c0-8 2-13 4.4-13S54 24 54 32"
        stroke={active ? '#FFF4D0' : '#E8FBFF'}
        strokeWidth="4.6"
        strokeLinecap="round"
        opacity="0.82"
      />
      {/* Thumb */}
      <path
        d="M18 38c-6-2-10-1-12 3s0 9 5 11"
        stroke={active ? '#FFF4D0' : '#E8FBFF'}
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
