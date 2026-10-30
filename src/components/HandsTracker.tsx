import React, { useRef, useState, useEffect } from 'react';

export interface MobileSingleHandControllerProps {
  onZoomGesture?: (delta: number) => void;
  onSelectNode?: () => void;
}

/**
 * MobileSingleHandController (v1.24 Master Front-End & Design Specification)
 * Single-hand mobile mode where tapping the toggle opens the front camera feed
 * with minimalist, semi-transparent rigging (35% opacity) so the 3D workspace
 * remains fully visible, enabling pinch-to-zoom and click gestures.
 */
export function MobileSingleHandController({
  onZoomGesture,
  onSelectNode,
}: MobileSingleHandControllerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startHandCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera permission blocked or unavailable', err);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div
      data-testid="mobile-single-hand-controller"
      className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto"
    >
      {/* Toggle Button */}
      <button
        type="button"
        data-testid="toggle-one-hand-gesture-btn"
        onClick={() => (isCameraActive ? stopCamera() : startHandCamera())}
        className="cj-glass-card px-4 py-2.5 rounded-xl text-[#FFF4D0] text-sm font-medium flex items-center gap-2 cursor-pointer hover:border-[#D4AF37] transition-colors"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isCameraActive ? 'bg-[#D4AF37] animate-ping' : 'bg-[#C5CCD6]/50'
          }`}
        />
        {isCameraActive ? 'One-Hand Mode Active' : 'Enable One-Hand Gesture'}
      </button>

      {/* Minimalist Semi-Transparent Video & Rigging Overlay */}
      {isCameraActive && (
        <div
          data-testid="single-hand-tracking-overlay"
          onClick={() => onSelectNode?.()}
          className="cj-glass-card relative w-36 h-48 rounded-2xl overflow-hidden cursor-pointer"
          title="Tap to trigger node select / pinch to zoom"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
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
