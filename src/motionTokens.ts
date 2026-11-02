/**
 * Shared Motion Tokens for Cerebro HQ & Build Observation Portal (Blueprint v0.2)
 * Uses motion/react exclusively per standing hold feat/ds-v1-1.
 *
 * C07 voice rings: scale 1.00–1.04, attack 80ms, release 240ms.
 */
export const motionTokens = {
  duration: {
    feedback: 0.12,
    status: 0.18,
    panel: 0.24,
    emphasis: 0.32,
    /** Orientation / layout reflow settle (job 4). */
    orientationReflow: 0.18,
  },
  spring: {
    interface: {
      type: 'spring' as const,
      stiffness: 380,
      damping: 34,
      mass: 0.8,
    },
    progress: {
      stiffness: 160,
      damping: 28,
    },
  },
  voice: {
    /** C07 audio-reactive ring envelope */
    ringScaleMin: 1.0,
    ringScaleMax: 1.04,
    attackMs: 80,
    releaseMs: 240,
    /** Teal wins — mirrors --c-voice / --token-listening-ring */
    ringColor: '#9AFFE0',
    ringColorMid: '#78D3B2',
  },
} as const;

export type MotionTokens = typeof motionTokens;
