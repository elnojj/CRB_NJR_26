/**
 * Team chat drawer — local-persisted messages with mock teammates.
 * Backs the Team chat chip / panel affordance without requiring a remote bus.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type TeamChatMessage = {
  id: string;
  authorId: string;
  author: string;
  channel: string;
  text: string;
  createdAt: string;
};

const STORAGE_KEY = 'cerebro.teamchat.v1';

const TEAMMATES = [
  { id: '39', name: '39 · Tarek' },
  { id: 'shweekar', name: 'Shweekar' },
  { id: 'khalid', name: 'Khalid' },
  { id: 'cerebro', name: 'Cerebro Agent' },
] as const;

const CHANNELS = ['General', 'SEVEN', 'Production', 'Decisions'] as const;

const SEED: TeamChatMessage[] = [
  {
    id: 'm1',
    authorId: 'cerebro',
    author: 'Cerebro Agent',
    channel: 'General',
    text: 'Team room online. Messages persist locally on this device.',
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'm2',
    authorId: 'khalid',
    author: 'Khalid',
    channel: 'General',
    text: 'BSocial access clarification still waiting on 39.',
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    id: 'm3',
    authorId: 'shweekar',
    author: 'Shweekar',
    channel: 'SEVEN',
    text: 'Pilot rights package queued for review.',
    createdAt: new Date(Date.now() - 900_000).toISOString(),
  },
];

function readStore(): TeamChatMessage[] {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as TeamChatMessage[];
    return Array.isArray(parsed) && parsed.length ? parsed : SEED;
  } catch {
    return SEED;
  }
}

function writeStore(messages: TeamChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)));
  } catch {
    /* quota */
  }
}

export interface TeamChatDrawerProps {
  open: boolean;
  onClose: () => void;
  unreadCount?: number;
  initialChannel?: string;
}

export const TeamChatDrawer: React.FC<TeamChatDrawerProps> = ({
  open,
  onClose,
  unreadCount = 3,
  initialChannel = 'General',
}) => {
  const [messages, setMessages] = useState<TeamChatMessage[]>(() => readStore());
  const [channel, setChannel] = useState<string>(initialChannel);
  const [draft, setDraft] = useState('');
  const [authorId, setAuthorId] = useState<string>('39');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeStore(messages);
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages, channel]);

  const visible = useMemo(
    () => messages.filter((m) => m.channel === channel),
    [messages, channel]
  );

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const mate = TEAMMATES.find((t) => t.id === authorId) || TEAMMATES[0];
    const next: TeamChatMessage = {
      id: `m-${Date.now()}`,
      authorId: mate.id,
      author: mate.name,
      channel,
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, next]);
    setDraft('');
  }, [authorId, channel, draft]);

  if (!open) return null;

  return (
    <aside
      data-chrome="glass"
      className="cerebro-chrome cj-glass-card fixed bottom-24 right-3 z-(--z-team-chat-drawer) flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden"
      data-testid="team-chat-drawer"
      role="dialog"
      aria-label="Team chat"
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-[#F2F6F8]">
            Team chat · {unreadCount}
          </h2>
          <p className="font-mono text-[10px] text-[#BDCBD3]">Local persistence · mock roster</p>
        </div>
        <button
          type="button"
          className="min-h-[40px] min-w-[40px] rounded-lg border border-white/15"
          onClick={onClose}
          aria-label="Close team chat"
        >
          ×
        </button>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setChannel(ch)}
            className={`min-h-[36px] shrink-0 rounded-full px-3 font-mono text-[11px] ${
              channel === ch
                ? 'bg-[#4C8DFF]/25 text-[#F2F6F8]'
                : 'border border-white/10 text-[#BDCBD3]'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {visible.length === 0 && (
          <p className="font-mono text-[11px] text-[#BDCBD3]">No messages in {channel} yet.</p>
        )}
        {visible.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-[#9AFFE0]">{m.author}</span>
              <time className="font-mono text-[10px] text-[#7A8894]">
                {new Date(m.createdAt).toLocaleTimeString()}
              </time>
            </div>
            <p className="font-mono text-xs text-[#F2F6F8]">{m.text}</p>
          </div>
        ))}
      </div>

      <footer className="space-y-2 border-t border-white/10 p-3">
        <select
          className="min-h-[40px] w-full rounded-lg border border-white/15 bg-[#142632] px-2 font-mono text-xs text-[#F2F6F8]"
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          aria-label="Post as"
        >
          {TEAMMATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            className="min-h-[44px] flex-1 rounded-lg border border-white/15 bg-[#142632] px-3 font-mono text-xs text-[#F2F6F8]"
            placeholder={`Message #${channel}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            type="button"
            className="min-h-[44px] rounded-lg bg-[#4C8DFF] px-4 font-mono text-xs font-semibold text-[#101D27]"
            onClick={send}
          >
            Send
          </button>
        </div>
      </footer>
    </aside>
  );
};

export default TeamChatDrawer;
