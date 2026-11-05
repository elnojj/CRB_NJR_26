import React from 'react';

export interface TeamChatChipProps {
  onOpenChat?: () => void;
  unreadCount?: number;
  active?: boolean;
  inline?: boolean;
}

export function TeamChatChip({
  onOpenChat,
  unreadCount = 3,
  active = false,
  inline = true,
}: TeamChatChipProps) {
  return (
    <a
      href="/chat"
      aria-label="Open team chat"
      data-testid="sphere-open-chat"
      data-ui-id="sphere-open-chat"
      data-cta-id="sphere-open-chat"
      data-action-id="panel.open"
      onClick={(e) => {
        if (onOpenChat) {
          e.preventDefault();
          onOpenChat();
        }
      }}
      className={`cj-glass-card ${
        inline ? 'relative' : 'fixed right-4 bottom-4 z-(--z-team-chat-chip)'
      } min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-mono text-[11px] font-medium transition-colors hover:border-[#D4AF37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] shrink-0`}
      style={{
        background: active ? 'rgba(212, 175, 55, 0.22)' : 'rgba(27, 34, 48, 0.88)',
        color: '#F2F6F8',
        border: active
          ? '1px solid #D4AF37'
          : '1px solid rgba(197, 204, 214, 0.22)',
        textDecoration: 'none',
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: active ? '#FFF4D0' : '#D4AF37' }}
      />
      <span>Team chat</span>
      {unreadCount > 0 && (
        <span className="font-mono text-[10px] text-[#C5CCD6] opacity-85 hidden sm:inline">
          · {unreadCount}
        </span>
      )}
    </a>
  );
}
