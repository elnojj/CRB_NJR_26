import React, { useEffect, useRef, useState } from 'react';
import { HandTracker, type HandDelegate, type HandTrackerStatus } from '../three/handTracker';
import type { HandDetectionMode } from '../three/handStateRef';

interface HandsCameraPreviewProps {
  active: boolean;
  handMode: HandDetectionMode;
  onCloseHands: () => void;
  onTrackingLost?: () => void;
  onTrackingAcquired?: () => void;
  /** Pixels from viewport bottom reserved for Voice capsule + utility bar. */
  dockClearancePx?: number;
}

function statusText(status: HandTrackerStatus, detail: string, delegate: HandDelegate | null, mode: HandDetectionMode): string {
  switch (status) {
    case 'camera':
      return 'Requesting camera…';
    case 'model':
      return 'Loading hand model…';
    case 'searching':
      return mode === 'one-hand' ? 'Show one hand to the camera' : 'Show both hands to the camera';
    case 'tracking':
      return delegate ? `Hand tracking live · ${delegate}` : 'Hand tracking live';
    case 'error':
      return detail;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Owns the tracker lifecycle and a small mirrored camera preview. The hands themselves are drawn
 * by the 3D glove inside the WebGL canvas; this component only re-renders when the tracker status changes.
 */
export const HandsCameraPreview: React.FC<HandsCameraPreviewProps> = ({
  active,
  handMode,
  onCloseHands,
  onTrackingLost,
  onTrackingAcquired,
  dockClearancePx = 148,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const [status, setStatus] = useState<HandTrackerStatus>('camera');
  const [detail, setDetail] = useState('');
  const [delegate, setDelegate] = useState<HandDelegate | null>(null);
  const modeRef = useRef(handMode);
  modeRef.current = handMode;
  const closeRef = useRef(onCloseHands);
  const lostRef = useRef(onTrackingLost);
  const acquiredRef = useRef(onTrackingAcquired);
  closeRef.current = onCloseHands;
  lostRef.current = onTrackingLost;
  acquiredRef.current = onTrackingAcquired;

  useEffect(() => {
    if (!active || !videoRef.current) return;
    const phone = window.matchMedia('(max-width: 767px)').matches;
    const tracker = new HandTracker({
      onStatus: (next, nextDetail, nextDelegate) => {
        setStatus(next);
        setDetail(nextDetail);
        setDelegate(nextDelegate);
      },
      onTrackingLost: () => lostRef.current?.(),
      onTrackingAcquired: () => acquiredRef.current?.(),
      onCameraDenied: () => closeRef.current(),
    });
    trackerRef.current = tracker;
    void tracker.start(videoRef.current, modeRef.current, phone);
    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    trackerRef.current?.setMode(handMode);
  }, [handMode]);

  if (!active) return null;
  return (
    <div
      className="fixed z-[15] pointer-events-none select-none"
      style={{ left: 12, bottom: dockClearancePx + 8, opacity: 0 }}
      data-testid="hands-gesture-hud"
    >
      <div aria-hidden="true" className="overflow-hidden" style={{ width: 112, height: 84 }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          controls={false}
          disablePictureInPicture
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {statusText(status, detail, delegate, handMode)}
      </p>
    </div>
  );
};
