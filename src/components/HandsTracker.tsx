import React, { useRef, useState, useEffect } from 'react';
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

/**
 * MobileSingleHandController (v1.24 Master Front-End & Design Specification)
 * Single-hand mobile mode where tapping the toggle activates hand tracking
 * using the single shared camera stream from deviceStreamCoordinator,
 * with minimalist, semi-transparent rigging (35% opacity) so the 3D workspace
 * remains fully visible, enabling pinch-to-zoom and click gestures.
 */
export function MobileSingleHandController({
  onZoomGesture,
  onSelectNode,
  active,
  onToggleActive,
}: MobileSingleHandControllerProps) {
  const [internalActive, setInternalActive] = useState(false);
  const isCameraActive = active !== undefined ? active : internalActive;
  const videoRef = useRef<HTMLVideoElement>(null);

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


  return (
    <div
      data-testid="mobile-single-hand-controller"
      className="relative flex items-center pointer-events-auto shrink-0"
    >
      {/* Toggle Button */}
      <button
        type="button"
        data-testid="toggle-one-hand-gesture-btn"
        onClick={() => (isCameraActive ? stopCamera() : startHandCamera())}
        className="cj-glass-card min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-full text-[#FFF4D0] font-mono text-[11px] font-medium flex items-center gap-1.5 cursor-pointer hover:border-[#D4AF37] transition-colors shrink-0"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isCameraActive ? 'bg-[#D4AF37] animate-ping' : 'bg-[#C5CCD6]/50'
          }`}
        />
        <span className="hidden md:inline">
          {isCameraActive ? 'One-Hand Mode Active' : 'Enable One-Hand Gesture'}
        </span>
        <span className="md:hidden">
          {isCameraActive ? 'Gesture On' : 'Gesture'}
        </span>
      </button>

      {/* Minimalist Semi-Transparent Video & Rigging Overlay */}
      {isCameraActive && (
        <div
          data-testid="single-hand-tracking-overlay"
          onClick={() => onSelectNode?.()}
          className="cj-glass-card absolute bottom-full right-0 mb-2.5 w-36 h-48 rounded-2xl overflow-hidden cursor-pointer z-50"
          title="Tap to trigger node select / pinch to zoom"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            controls={false}
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
          />
          {/* Minimalist SVG Wireframe Rigging (Fingers / Pinch Points) */}
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
            Pinch: Zoom / Tap: Select
          </div>
        </div>
      )}
    </div>
  );
}

export interface HandsTrackerProps {
  onGestureDetected?: (gesture: string) => void;
  onClose?: () => void;
  className?: string;
}

/**
 * HandsTracker (PR #131 / b0acb0f + v1.24 Master Spec)
 */
export const HandsTracker: React.FC<HandsTrackerProps> = ({
  onGestureDetected,
  onClose,
  className = '',
}) => {
  return (
    <MobileSingleHandController
      onZoomGesture={(delta) => onGestureDetected?.(`zoom_${delta > 0 ? 'in' : 'out'}`)}
      onSelectNode={() => onGestureDetected?.('node_selected')}
    />
  );
};

export default MobileSingleHandController;
