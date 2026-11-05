/**
 * Error / empty / offline status surfaces for Cerebro workspace.
 * Extends BootLoader health telemetry with live runtime banners + retries.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CEREBRO_VOICE_LABEL, CEREBRO_VOICE_PROVIDER } from '../services/voice/settings';

export type SystemStatusKind =
  | 'offline'
  | 'webgl'
  | 'drive-404'
  | 'voice-auth'
  | 'empty-projects'
  | null;

export interface SystemStatusLayerProps {
  webglUnavailable?: boolean;
  webglReason?: string;
  /** Active voice provider auth or key failure */
  voiceAuthFailed?: boolean;
  /** @deprecated Use voiceAuthFailed */
  elevenLabsAuthFailed?: boolean;
  projectCount?: number;
  onRetryWebgl?: () => void;
  onRetryVoice?: () => void;
  onRetryDrive?: () => void;
  /** Compact live telemetry strip (FPS / draw calls / heap). */
  showTelemetry?: boolean;
}

export const SystemStatusLayer: React.FC<SystemStatusLayerProps> = ({
  webglUnavailable = false,
  webglReason,
  voiceAuthFailed = false,
  elevenLabsAuthFailed = false,
  projectCount = 1,
  onRetryWebgl,
  onRetryVoice,
  onRetryDrive,
  showTelemetry = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('telemetry'),
}) => {
  const voiceFailed = voiceAuthFailed || elevenLabsAuthFailed;
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [drive404, setDrive404] = useState<string | null>(null);
  const [webglEvent, setWebglEvent] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [drawCalls, setDrawCalls] = useState(0);
  const [heapMb, setHeapMb] = useState<number | null>(null);

  useEffect(() => {
    const onOff = () => setOffline(true);
    const onOn = () => setOffline(false);
    window.addEventListener('offline', onOff);
    window.addEventListener('online', onOn);
    return () => {
      window.removeEventListener('offline', onOff);
      window.removeEventListener('online', onOn);
    };
  }, []);

  useEffect(() => {
    if (!showTelemetry || typeof window === 'undefined') return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
        const perf = performance as Performance & {
          memory?: { usedJSHeapSize: number };
        };
        if (perf.memory?.usedJSHeapSize) {
          setHeapMb(Math.round(perf.memory.usedJSHeapSize / 1048576));
        }
        const detail = (
          window as unknown as {
            __cerebroRenderStats?: { drawCalls?: number };
          }
        ).__cerebroRenderStats;
        setDrawCalls((prev) => detail?.drawCalls ?? Math.max(12, prev || 24));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showTelemetry]);

  useEffect(() => {
    const onMedia = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sphere?: string; reason?: string };
      setDrive404(
        `Media unavailable for ${detail.sphere || 'sphere'} — ice plate active. ${detail.reason || ''}`.trim()
      );
    };
    const onWebgl = (e: Event) => {
      const detail = (e as CustomEvent).detail as { status?: string };
      if (detail.status === 'CONTEXT_LOST' || detail.status === 'SOFTWARE_GL') {
        setWebglEvent(
          detail.status === 'SOFTWARE_GL'
            ? 'Software WebGL detected — translucent glass fallback engaged.'
            : 'WebGL context lost — reduced-graphics map active.'
        );
      } else if (detail.status === 'REBUILDING') {
        setWebglEvent('WebGL context restored — rebuilding liquid-glass scene.');
      } else if (detail.status === 'ACTIVE') {
        setWebglEvent(null);
      }
    };
    const onVoiceAuth = (e: Event) => {
      const detail = (e as CustomEvent).detail as { code?: string };
      if (detail.code === 'auth' || detail.code === '401' || detail.code === '403') {
        /* handled via prop; event kept for bridge emitters */
      }
    };
    window.addEventListener('cerebro:media-404', onMedia);
    window.addEventListener('cerebro:webgl-status', onWebgl);
    window.addEventListener('cerebro:voice-auth-failed', onVoiceAuth);
    return () => {
      window.removeEventListener('cerebro:media-404', onMedia);
      window.removeEventListener('cerebro:webgl-status', onWebgl);
      window.removeEventListener('cerebro:voice-auth-failed', onVoiceAuth);
    };
  }, []);

  const clearDrive = useCallback(() => setDrive404(null), []);

  const banners: Array<{
    id: string;
    tone: 'warn' | 'error' | 'info';
    title: string;
    body: string;
    actionLabel?: string;
    onAction?: () => void;
  }> = [];

  if (offline) {
    banners.push({
      id: 'offline',
      tone: 'warn',
      title: 'You are offline',
      body: 'Cached workspace stays available. Voice, Drive sync, and live media resume when the network returns.',
    });
  }

  if (webglUnavailable || webglEvent) {
    banners.push({
      id: 'webgl',
      tone: 'error',
      title: 'WebGL unavailable',
      body:
        webglReason ||
        webglEvent ||
        'Spatial glass scene cannot run. Use the reduced-graphics map or retry.',
      actionLabel: 'Retry WebGL',
      onAction: onRetryWebgl || (() => window.location.reload()),
    });
  }

  if (voiceFailed) {
    banners.push({
      id: 'voice-auth',
      tone: 'error',
      title: `${CEREBRO_VOICE_LABEL} bridge failed`,
      body: CEREBRO_VOICE_PROVIDER === 'openai-realtime'
        ? 'Sign in to Cerebro and check the server OPENAI_API_KEY, then reconnect the capsule.'
        : 'Google AI Studio / Gemini rejected the session. Check GEMINI_API_KEY, then reconnect the capsule.',
      actionLabel: 'Retry voice',
      onAction: onRetryVoice,
    });
  }

  if (drive404) {
    banners.push({
      id: 'drive',
      tone: 'warn',
      title: 'Drive media missing',
      body: drive404,
      actionLabel: 'Dismiss',
      onAction: () => {
        clearDrive();
        onRetryDrive?.();
      },
    });
  }

  if (projectCount <= 0) {
    banners.push({
      id: 'empty-projects',
      tone: 'info',
      title: 'No projects in register',
      body: 'The project list is empty. Import a NOJARA snapshot or spawn a domain to continue.',
    });
  }

  if (banners.length === 0 && !showTelemetry) return null;

  return (
    <div
      className="cerebro-system-status"
      data-testid="system-status-layer"
      role="region"
      aria-label="System status"
    >
      {showTelemetry && (
        <div
          className="pointer-events-none fixed bottom-3 left-3 z-(--z-system-status) rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 font-mono text-[10px] text-[#BDCBD3] backdrop-blur-md"
          data-testid="system-telemetry-strip"
        >
          {fps} FPS · {drawCalls} draws
          {heapMb != null ? ` · ${heapMb} MB` : ''} · {navigator.onLine ? 'Live' : 'Offline'}
        </div>
      )}
      {banners.map((b) => (
        <div
          key={b.id}
          className={`cerebro-status-banner cerebro-status-banner--${b.tone}`}
          role="status"
          aria-live="polite"
          data-testid={`status-${b.id}`}
        >
          <div className="cerebro-status-banner__copy">
            <strong>{b.title}</strong>
            <span>{b.body}</span>
          </div>
          {b.actionLabel && b.onAction && (
            <button
              type="button"
              className="cerebro-status-banner__action"
              onClick={b.onAction}
            >
              {b.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
