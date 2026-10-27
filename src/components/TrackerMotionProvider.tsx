import React from 'react';
import { MotionConfig, LayoutGroup } from 'motion/react';
import { motionTokens } from '../motionTokens';

interface TrackerMotionProviderProps {
  projectId: string;
  children: React.ReactNode;
}

/**
 * Wraps the Tracker-First Portal UI in <MotionConfig reducedMotion="user">
 * and <LayoutGroup id={`tracker-${projectId}`}> per Blueprint v0.2.
 */
export const TrackerMotionProvider: React.FC<TrackerMotionProviderProps> = ({
  projectId,
  children,
}) => {
  return (
    <MotionConfig reducedMotion="user" transition={motionTokens.spring.interface}>
      <LayoutGroup id={`tracker-${projectId}`}>{children}</LayoutGroup>
    </MotionConfig>
  );
};
