/**
 * Mobile one-hand gesture controller.
 * Full landmark tracking for the workspace is owned by HandsOverlay /
 * HandsWireframeRig (@mediapipe/tasks-vision). This module owns the
 * one-hand affordance, shared webcam latch, and pinch/select callbacks
 * used by the Enable One-Hand Gesture control.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  getSharedWebcamStream,
  releaseSharedWebcamStream,
  hasActiveWebcamStream,
} from '../utils/deviceStreamCoordinator';

export interface MobileSingleHandControllerProps {
  onZoomGesture?: (delta: number) => void;
  onSelectNode?: () => void;
  active?: boolean;
  onToggleActive?: () => void;
}

export function MobileSingleHandController({
  onZoomGesture,
  onSelectNode,
  active,
  onToggleActive,
}: MobileSingleHandControllerProps) {
  const [internalActive, setInternalActive] = useState(false);
  const isCameraActive = active !== undefined ? active : internalActive;
  const videoRef = useRef<HTMLVideoElement>(null);
  const pinchRef = useRef<{ y: number | null }>({ y: null });

  const stopCamera = () => {
    if (onToggleActive) {
      if (isCameraActive) onToggleActive();
    } else {
      releaseSharedWebcamStream();
      setInternalActive(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startHandCamera = async () => {
    if (onToggleActive) {
      if (!isCameraActive) onToggleActive();
      return;
    }
    try {
      const stream = await getSharedWebcamStream({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setInternalActive(true);
    } catch (err) {
      console.error('Camera permission blocked or unavailable', err);
    }
  };

  useEffect(() => {
    return () => {
      if (active === undefined && internalActive) {
        releaseSharedWebcamStream();
      }
    };
  }, [active, internalActive]);

  useEffect(() => {
    if (!isCameraActive || !videoRef.current) return;
    if (hasActiveWebcamStream() && !videoRef.current.srcObject) {
      getSharedWebcamStream()
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [isCameraActive]);

  return (
    <div
      data-testid="mobile-single-hand-controller"
      className="relative flex items-center pointer-events-auto shrink-0"
    >
      <button
        type="button"
        data-cta-id="gesture-toggle"
        data-testid="enable-one-hand-gesture"
        onClick={() => {
          if (isCameraActive) stopCamera();
          else void startHandCamera();
        }}
        className="cj-glass-card min-h-[40px] px-2.5 rounded-full font-mono text-[12px] text-[#C5CCD6]"
        title="Enable one-hand gesture — MediaPipe landmarks via shared HandsOverlay stream"
      >
        {isCameraActive ? 'Gesture On' : 'Enable One-Hand Gesture'}
      </button>
      {isCameraActive && (
        <>
          <button
            type="button"
            className="min-h-[40px] min-w-[40px] rounded-full border border-white/15 font-mono text-xs"
            onClick={() => onZoomGesture?.(1)}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="min-h-[40px] min-w-[40px] rounded-full border border-white/15 font-mono text-xs"
            onClick={() => onZoomGesture?.(-1)}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="min-h-[40px] px-2 rounded-full border border-white/15 font-mono text-xs"
            onClick={onSelectNode}
          >
            Select
          </button>
          <div
            data-testid="single-hand-tracking-overlay"
            onClick={() => onSelectNode?.()}
            onPointerDown={(e) => {
              pinchRef.current.y = e.clientY;
            }}
            onPointerMove={(e) => {
              if (pinchRef.current.y == null) return;
              const dy = pinchRef.current.y - e.clientY;
              if (Math.abs(dy) > 28) {
                onZoomGesture?.(dy > 0 ? 1 : -1);
                pinchRef.current.y = e.clientY;
              }
            }}
            onPointerUp={() => {
              pinchRef.current.y = null;
            }}
            className="cj-glass-card absolute bottom-full right-0 mb-2.5 w-36 h-48 rounded-2xl overflow-hidden cursor-pointer z-50"
            title="Drag vertically to zoom · tap to select (MediaPipe via HandsOverlay)"
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              width={640}
              height={480}
              controls={false}
              disablePictureInPicture
              style={{ width: 640, height: 480, maxWidth: '100%', maxHeight: '100%' }}
              className="absolute inset-0 object-cover opacity-35 pointer-events-none"
            />
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
              viewBox="0 0 100 133"
            >
              <circle
                cx="50"
                cy="66"
                r="18"
                fill="none"
                stroke="#FFF4D0"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx="45" cy="55" r="3" fill="#FFF4D0" />
              <circle cx="60" cy="60" r="3" fill="#FFF4D0" />
              <path
                d="M45 55 Q 52 45 60 60"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="1"
              />
            </svg>
            <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-[#FFF4D0]/90 font-mono tracking-tight pointer-events-none select-none">
              Pinch/Drag: Zoom · Tap: Select
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export interface HandsTrackerProps {
  onGestureDetected?: (gesture: string) => void;
  onClose?: () => void;
  className?: string;
}

export const HandsTracker: React.FC<HandsTrackerProps> = ({
  onGestureDetected,
}) => {
  return (
    <MobileSingleHandController
      onZoomGesture={(delta) => onGestureDetected?.(`zoom_${delta > 0 ? 'in' : 'out'}`)}
      onSelectNode={() => onGestureDetected?.('node_selected')}
    />
  );
};

export default MobileSingleHandController;
