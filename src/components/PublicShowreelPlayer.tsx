import React, { useRef, useEffect, useState } from 'react';

export interface PublicShowreelPlayerProps {
  id: string;
  title: string;
  src: string;
  poster: string;
  autoPlay?: boolean;
  initialTimeSec?: number;
  isMuted?: boolean;
  onVideoReady?: (video: HTMLVideoElement | null) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onMuteStateChange?: (muted: boolean) => void;
  className?: string;
}

export const PublicShowreelPlayer: React.FC<PublicShowreelPlayerProps> = ({
  id,
  title,
  src,
  poster,
  autoPlay = false,
  initialTimeSec = 0,
  isMuted = false,
  onVideoReady,
  onTimeUpdate,
  onPlayStateChange,
  onMuteStateChange,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      onVideoReady?.(el);
      if (initialTimeSec > 0 && Number.isFinite(initialTimeSec)) {
        try {
          el.currentTime = initialTimeSec;
        } catch {}
      }
    }
    return () => {
      onVideoReady?.(null);
    };
  }, [src, onVideoReady, initialTimeSec]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-[#1D1D1B] overflow-hidden ${className}`}>
      {isLoading && !loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1D1D1B]/70 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142632] border border-white/20 text-xs font-mono text-[#F2F6F8]">
            <span className="w-2 h-2 rounded-full bg-[#F2B66D] animate-ping" />
            Loading showreel...
          </div>
        </div>
      )}

      {loadError ? (
        <div className="p-4 text-center max-w-sm flex flex-col items-center gap-2">
          <div className="font-mono text-xs text-red-400">Failed to load video stream</div>
          <div className="font-display text-sm font-semibold text-[#F2F6F8]">{title}</div>
          <p className="font-mono text-[10px] text-[#BDCBD3]">
            {loadError} · Direct source: {src}
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 px-3 py-1.5 rounded-lg bg-[#142632] border border-white/30 text-xs font-mono text-[#F2B66D] hover:border-[#F2B66D]"
          >
            Open MP4 in new tab ↗
          </a>
        </div>
      ) : (
        <video
          ref={videoRef}
          data-testid={`public-video-${id}`}
          className="public-showreel-video"
          controls
          playsInline
          preload="metadata"
          poster={poster}
          autoPlay={autoPlay}
          muted={isMuted}
          aria-label={title}
          onLoadedMetadata={(e) => {
            setIsLoading(false);
            const v = e.currentTarget;
            onTimeUpdate?.(v.currentTime, v.duration || 0);
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            onTimeUpdate?.(v.currentTime, v.duration || 0);
          }}
          onPlay={() => onPlayStateChange?.(true)}
          onPause={() => onPlayStateChange?.(false)}
          onEnded={() => onPlayStateChange?.(false)}
          onVolumeChange={(e) => onMuteStateChange?.(e.currentTarget.muted)}
          onError={(event) => {
            const errCode = event.currentTarget.error?.code;
            console.error('Public media playback failed for', id, 'error code:', errCode);
            setIsLoading(false);
            setLoadError(`Playback error (code ${errCode || 'network'})`);
          }}
        >
          <source src={src} type="video/mp4" />
          Your browser cannot play this MP4.
        </video>
      )}
    </div>
  );
};
