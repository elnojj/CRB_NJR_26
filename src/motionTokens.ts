/**
 * Shared Motion Tokens for Cerebro HQ & Build Observation Portal (Blueprint v0.2)
 * Uses motion/react exclusively per standing hold feat/ds-v1-1.
 */
export const motionTokens = {
  duration: {
    feedback: 0.12,
    status: 0.18,
    panel: 0.24,
    emphasis: 0.32,
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
};
