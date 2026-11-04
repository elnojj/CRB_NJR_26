import React, { useEffect, useState } from 'react';

export interface SubtitleLine {
  id: number;
  speaker: 'you' | 'cerebro';
  text: string;
}

interface LiveSubtitlesProps {
  line: SubtitleLine | null;
  /** Milliseconds a finished line stays on screen. */
  holdMs?: number;
}

/**
 * Speech-to-text and agent reply subtitles. Pass-through for pointer events and kept inside the
 * safe area under the header so it never covers the dock, the journey caption or the node field.
 */
export function LiveSubtitles({ line, holdMs = 5200 }: LiveSubtitlesProps) {
  const [visibleId, setVisibleId] = useState<number | null>(null);

  useEffect(() => {
    if (!line) {
      setVisibleId(null);
      return undefined;
    }
    setVisibleId(line.id);
    const timer = window.setTimeout(() => setVisibleId(null), holdMs);
    return () => window.clearTimeout(timer);
  }, [line, holdMs]);

  if (!line || visibleId !== line.id) return null;
  return (
    <div
      data-testid="live-subtitles"
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 z-[58] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 text-center"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 76px)' }}
    >
      <span className="sr-only">{line.speaker === 'you' ? 'You said: ' : 'Cerebro: '}</span>
      <p
        className="inline-block max-w-full rounded-lg px-3 py-2 text-[15px] leading-snug text-[#E8EEF8]"
        style={{
          background: 'rgba(10,13,20,0.72)',
          border: `1px solid ${line.speaker === 'you' ? '#1E5EFF' : '#2C3A52'}`,
        }}
      >
        {line.text}
      </p>
    </div>
  );
}
