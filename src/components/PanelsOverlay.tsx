import React, { useState, useEffect, useRef } from 'react';
import { COLOUR_TOKENS, COLOUR_TABLE, CdeDimensionId } from '../tokens/colours';
import {
  CEREBRO_STATIONS,
  PROJECTS_DATA,
  REGISTER_RECORDS,
  PEOPLE_DATA,
  RACI_MATRIX,
  FILES_DATA,
  MEDIA_ITEMS,
  SHOWREEL_ITEMS,
  CDE_DIMENSIONS,
  STORY_CHAPTERS,
  SOURCE_MAP,
  MISSING_ITEMS,
  TEAM_CHECKPOINTS,
  INITIAL_TEAM_ROOM_MESSAGES,
  TIMELINE_MILESTONES,
  BUILD_TRACKER_TIERS,
  ProjectSummary,
  ProjectHealth,
  MediaAssetItem,
  TeamCheckpointItem,
  TeamRoomChannelId,
  TeamRoomMessage,
} from '../data/sourceData';
import { WireframesV11PanelContent } from './WireframesV11Panels';
import { ScreenElementAmendment } from '../utils/geminiScreenOrchestrator';
import {
  ComputedGuiLayout,
  PanelSlotAssignment,
  PhoneSheetExpansion,
  computeGuiLayout,
} from '../gui/layoutEngine';
import { GUI_GLASS_TOKENS, GUI_Z_LAYERS } from '../gui/guiTokens';

export interface StatefulCheckpointItem extends TeamCheckpointItem {
  status?: 'Pending 39 Sign-off' | 'Approved' | 'Revision Requested' | 'Rejected';
  decisionReceiptId?: string;
  decidedAt?: string;
  feedbackNote?: string;
}

export type AudienceLevel = 'Owner only' | 'Partner or assistant present' | 'Public';
export type ProjectWorkspaceTab =
  | 'overview'
  | 'tasks'
  | 'decisions'
  | 'minutes'
  | 'files'
  | 'team';

export interface MinimisedChip {
  panelId: string;
  label: string;
  projectId?: string;
  subTab?: ProjectWorkspaceTab;
  scrollTop?: number;
  unsentDraft?: string;
  activeChannel?: TeamRoomChannelId;
}

export interface CustomTaskItem {
  id: string;
  title: string;
  projectCode: string;
  owner: string;
  createdAt: string;
  attachmentName?: string;
}

export interface MediaPlaybackState {
  playing: boolean;
  muted: boolean;
  currentTimeSec: number;
  durationSec: number;
}

interface PanelsOverlayProps {
  openPanels: string[];
  minimisedChips?: MinimisedChip[];
  dashboardCollapsed?: boolean;
  activeShowreelIndex?: number;
  selectedProjectId: string;
  activeProjectTab?: ProjectWorkspaceTab;
  peopleSubTab: 'HQ' | 'Team and Contracts' | 'RACI';
  selectedPersonId?: string | null;
  raciFilterProject: string | null;
  selectedDimensionId: CdeDimensionId;
  selectedSubdomainId: string | null;
  activeChapterIndex: number;
  fileSearchQuery: string;
  fullscreenMedia: MediaAssetItem | null;
  mediaPlayback?: MediaPlaybackState;
  audienceLevel: AudienceLevel;
  customTasks: CustomTaskItem[];
  pageStateSnapshot: Record<string, unknown>;
  reducedMotion?: boolean;
  soundMuted?: boolean;
  languageRtl?: 'en' | 'ar';
  urgentFilterOnly?: boolean;
  panelScrollById?: Record<string, number>;
  panelDraftsById?: Record<string, string>;
  activeTeamChannel?: TeamRoomChannelId;
  onClosePanel: (panelId: string) => void;
  onMinimisePanel?: (
    panelId: string,
    label: string,
    scrollTop?: number,
    unsentDraft?: string
  ) => void;
  onRestoreChip?: (chip: MinimisedChip) => void;
  onOpenPanel?: (panelId: string) => void;
  onToggleUrgentFilter?: (urgentOnly: boolean) => void;
  onPanelScrollChange?: (panelId: string, scrollTop: number) => void;
  onPanelDraftChange?: (panelId: string, draft: string) => void;
  onChangeTeamChannel?: (channel: TeamRoomChannelId) => void;
  onExpandStationFromDashboard?: (stationId: string) => void;
  onChangeShowreelIndex?: (idx: number) => void;
  onMediaControl?: (
    action:
      | 'play'
      | 'pause'
      | 'toggle_play'
      | 'seek'
      | 'mute'
      | 'unmute'
      | 'toggle_mute'
      | 'fullscreen_enter'
      | 'fullscreen_exit',
    seekSeconds?: number
  ) => void;
  onSelectProject: (projectId: string) => void;
  onChangeProjectTab?: (projectId: string, tab: ProjectWorkspaceTab) => void;
  onChangePeopleSubTab: (tab: 'HQ' | 'Team and Contracts' | 'RACI') => void;
  onSelectPerson?: (personId: string | null) => void;
  onSelectDimension: (dimId: CdeDimensionId) => void;
  onSelectSubdomain: (subId: string) => void;
  onSelectChapter: (chapterIdx: number) => void;
  onFileSearchChange: (q: string) => void;
  onOpenFullscreenMedia: (item: MediaAssetItem | null) => void;
  onChangeAudience?: (level: AudienceLevel) => void;
  onToggleReducedMotion?: () => void;
  onToggleSoundMuted?: () => void;
  onToggleLanguageRtl?: (lang: 'en' | 'ar') => void;
  onSimulateCommand?: (cmd: string) => void;
  handsActive?: boolean;
  screenAmendments?: ScreenElementAmendment[];
  onToggleHands?: () => void;
  guiLayout?: ComputedGuiLayout;
  phoneSheetState?: PhoneSheetExpansion;
  onChangePhoneSheetState?: (state: PhoneSheetExpansion) => void;
  isCameraInFlight?: boolean;
}

const KNOWN_RECIPIENT_ALIASES: Record<string, string> = {
  '39': 'me@nojara.com',
  me: 'me@nojara.com',
  self: 'me@nojara.com',
  tarek: 'me@nojara.com',
  'tarek nojara': 'me@nojara.com',
  'me@nojara.com': 'me@nojara.com',
  shweekar: 'shweekar@nojara.com',
  khalid: 'khalid@nojara.com',
  loay: 'loay@nojara.com',
  farida: 'farida@nojara.com',
};

export function validateRecipientInput(raw: string): {
  valid: boolean;
  resolved: string | null;
  error?: string;
} {
  const clean = raw.trim().toLowerCase();
  if (!clean) {
    return { valid: false, resolved: null, error: 'Enter a recipient alias or email address.' };
  }
  if (KNOWN_RECIPIENT_ALIASES[clean]) {
    return { valid: true, resolved: KNOWN_RECIPIENT_ALIASES[clean] };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())) {
    return { valid: true, resolved: raw.trim() };
  }
  return {
    valid: false,
    resolved: null,
    error: `Unknown recipient alias "${raw.trim()}". Use a full email address or known alias (39, me, shweekar, khalid).`,
  };
}

function formatTimecode(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

// Health badge helper: uses station/UI colours + distinct shape icon (NEVER red #FF5666)
export const HealthIndicator: React.FC<{ health: ProjectHealth }> = ({ health }) => {
  const colour =
    health === 'On track'
      ? COLOUR_TOKENS.healthOnTrack
      : health === 'At risk'
      ? COLOUR_TOKENS.healthAtRisk
      : COLOUR_TOKENS.healthBlocked;

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium"
      style={{ color: colour }}
    >
      {health === 'On track' && (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill={colour} />
        </svg>
      )}
      {health === 'At risk' && (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <polygon points="5,1 9,9 1,9" fill={colour} />
        </svg>
      )}
      {health === 'Blocked' && (
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="1.5" y="1.5" width="7" height="7" stroke={colour} strokeWidth="1.8" fill="none" />
          <line x1="2" y1="8" x2="8" y2="2" stroke={colour} strokeWidth="1.5" />
        </svg>
      )}
      <span>{health}</span>
    </span>
  );
};

export const PanelsOverlay: React.FC<PanelsOverlayProps> = ({
  openPanels = [],
  minimisedChips = [],
  dashboardCollapsed = false,
  activeShowreelIndex = 0,
  selectedProjectId,
  activeProjectTab = 'tasks',
  peopleSubTab,
  selectedPersonId = null,
  raciFilterProject,
  selectedDimensionId,
  selectedSubdomainId,
  activeChapterIndex,
  fileSearchQuery,
  fullscreenMedia,
  mediaPlayback = { playing: false, muted: false, currentTimeSec: 0, durationSec: 102 },
  audienceLevel,
  customTasks = [],
  pageStateSnapshot,
  reducedMotion = false,
  soundMuted = false,
  languageRtl = 'en',
  urgentFilterOnly = false,
  panelScrollById = {},
  panelDraftsById = {},
  activeTeamChannel = 'General',
  onClosePanel,
  onMinimisePanel,
  onRestoreChip,
  onOpenPanel,
  onToggleUrgentFilter,
  onPanelScrollChange,
  onPanelDraftChange,
  onChangeTeamChannel,
  onExpandStationFromDashboard,
  onChangeShowreelIndex,
  onMediaControl,
  onSelectProject,
  onChangeProjectTab,
  onChangePeopleSubTab,
  onSelectPerson,
  onSelectDimension,
  onSelectSubdomain,
  onSelectChapter,
  onFileSearchChange,
  onOpenFullscreenMedia,
  onChangeAudience,
  onToggleReducedMotion,
  onToggleSoundMuted,
  onToggleLanguageRtl,
  onSimulateCommand,
  handsActive = false,
  screenAmendments = [],
  onToggleHands,
  guiLayout,
  phoneSheetState: externalPhoneSheetState,
  onChangePhoneSheetState,
  isCameraInFlight = false,
}) => {
  const [localProjectTab, setLocalProjectTab] = useState<ProjectWorkspaceTab>('tasks');
  const [phoneSheetSnap92, setPhoneSheetSnap92] = useState<boolean>(false);
  const [activeSlotTabs, setActiveSlotTabs] = useState<
    Partial<Record<'bottom-sheet' | 'left-inspector' | 'right-inspector', string>>
  >({});
  const effectivePhoneSheetState: PhoneSheetExpansion =
    externalPhoneSheetState ?? (phoneSheetSnap92 ? 'expanded' : 'default');
  const effectiveGuiLayout: ComputedGuiLayout =
    guiLayout ??
    computeGuiLayout({
      width: typeof window !== 'undefined' ? window.innerWidth : 1440,
      height: typeof window !== 'undefined' ? window.innerHeight : 900,
      openPanels,
      activeSlotTabs,
      phoneSheetState: effectivePhoneSheetState,
    });
  const effectiveProjectTab = activeProjectTab || localProjectTab;
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [checkpointFeedbackById, setCheckpointFeedbackById] = useState<Record<string, string>>({});

  const handleSetProjectTab = (tab: ProjectWorkspaceTab) => {
    setLocalProjectTab(tab);
    onChangeProjectTab?.(selectedProjectId, tab);
  };

  const [auditTab, setAuditTab] = useState<'source-map' | 'colours' | 'missing' | 'page-state'>(
    'source-map'
  );
  const [customEmbeds, setCustomEmbeds] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('cerebro_showreel_embeds_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Reviews / Checkpoints State (Persisted in localStorage + POST /api/decisions)
  const [checkpoints, setCheckpoints] = useState<StatefulCheckpointItem[]>(() => {
    try {
      const saved = localStorage.getItem('cerebro_h02_checkpoints_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return TEAM_CHECKPOINTS;
  });

  // Team Channel State
  const [localChannel, setLocalChannel] = useState<TeamRoomChannelId>('General');
  const activeChannel = activeTeamChannel || localChannel;
  const [teamMessages, setTeamMessages] = useState<TeamRoomMessage[]>(INITIAL_TEAM_ROOM_MESSAGES);
  const [teamDraft, setTeamDraft] = useState<string>(() => panelDraftsById['team-room'] || '');
  const [channelSumUp, setChannelSumUp] = useState<string | null>(null);

  useEffect(() => {
    if (panelDraftsById['team-room'] !== undefined && panelDraftsById['team-room'] !== teamDraft) {
      setTeamDraft(panelDraftsById['team-room']);
    }
  }, [panelDraftsById]);

  const updateTeamDraft = (val: string) => {
    setTeamDraft(val);
    onPanelDraftChange?.('team-room', val);
  };

  // Meeting Notes & Email Two-Tap Confirmation State
  const [minutesRecipientInput, setMinutesRecipientInput] = useState('39');
  const [minutesSubjectInput, setMinutesSubjectInput] = useState(
    'SEVEN & NOJARA HQ — Parsed Meeting Notes & Action Rollup'
  );
  const [minutesSummaryInput, setMinutesSummaryInput] = useState<string>(
    () =>
      panelDraftsById['minutes'] ||
      '1. SEVEN Tabuk 4K Concept Renders verified.\n2. RACI matrix locked with 39 accountable.\n3. Next milestone: 04 Nov 2026 Master Interactive Narrative Deck.'
  );

  useEffect(() => {
    if (panelDraftsById['minutes'] !== undefined && panelDraftsById['minutes'] !== minutesSummaryInput) {
      setMinutesSummaryInput(panelDraftsById['minutes']);
    }
  }, [panelDraftsById]);

  const updateMinutesSummary = (val: string) => {
    setMinutesSummaryInput(val);
    onPanelDraftChange?.('minutes', val);
  };

  const [minutesTwoTapArmed, setMinutesTwoTapArmed] = useState(false);
  const [minutesError, setMinutesError] = useState<string | null>(null);
  const [minutesReceipt, setMinutesReceipt] = useState<{
    id: string;
    recipientResolved: string;
    timestamp: string;
    deliveryStatus: string;
    statusMessage: string;
  } | null>(null);

  // Overview Timeout Guard State
  const [insightsStatus, setInsightsStatus] = useState<'READY' | 'LOADING' | 'TIMEOUT'>('READY');

  const isOwnerOnly = audienceLevel === 'Owner only';

  const handleDecisionAction = async (
    chk: StatefulCheckpointItem,
    action: 'Approve' | 'Reject' | 'Request Revision'
  ) => {
    const nowIso = new Date().toISOString();
    const nextStatus: StatefulCheckpointItem['status'] =
      action === 'Approve'
        ? 'Approved'
        : action === 'Reject'
        ? 'Rejected'
        : 'Revision Requested';

    const noteText = (checkpointFeedbackById[chk.id] || '').trim() || undefined;

    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cerebro-Audience': audienceLevel,
          'Idempotency-Key': `${chk.id}-${action}-${nowIso.slice(0, 16)}`,
        },
        body: JSON.stringify({
          checkpointId: chk.id,
          projectId: chk.projectId,
          action,
          note: noteText,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.receipt?.id) {
        const synced = checkpoints.map((item) =>
          item.id === chk.id
            ? {
                ...item,
                status: nextStatus,
                decisionReceiptId: data.receipt.id,
                decidedAt: data.receipt.decidedAt || nowIso,
                feedbackNote: noteText ?? item.feedbackNote,
              }
            : item
        );
        setCheckpoints(synced);
        try {
          localStorage.setItem('cerebro_h02_checkpoints_v1', JSON.stringify(synced));
        } catch {}
      }
    } catch {
      // Network error
    }
  };

  const handleSendTeamMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamDraft.trim()) return;
    const text = teamDraft.trim();
    const optimisticId = `tr-local-${Date.now()}`;

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cerebro-Audience': audienceLevel,
          'Idempotency-Key': optimisticId,
        },
        body: JSON.stringify({
          sender: '39 (Tarek Nojara)',
          text,
          channel: activeChannel,
          projectCode: selectedProjectId,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.receipt?.id) {
        updateTeamDraft('');
        const newMsg: TeamRoomMessage = {
          id: data.receipt.id,
          channel: activeChannel,
          sender: '39 (Tarek Nojara)',
          role: 'Founder and Culture and Design Engineer',
          text,
          timestamp: new Date().toTimeString().slice(0, 5),
        };
        setTeamMessages((prev) => [...prev, newMsg]);
      }
    } catch {
      // Preserve draft on failure
    }
  };

  const handleConfirmSendMinutes = async () => {
    setMinutesError(null);
    const validation = validateRecipientInput(minutesRecipientInput);
    if (!validation.valid || !validation.resolved) {
      setMinutesError(validation.error || 'Invalid recipient');
      setMinutesTwoTapArmed(false);
      return;
    }

    const idem = `min-${selectedProjectId}-${Date.now()}`;
    try {
      const res = await fetch('/api/minutes/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cerebro-Audience': audienceLevel,
          'Idempotency-Key': idem,
        },
        body: JSON.stringify({
          to: minutesRecipientInput,
          subject: minutesSubjectInput,
          summary: minutesSummaryInput,
          projectId: selectedProjectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMinutesError(data?.message || 'Failed to prepare meeting notes');
        setMinutesTwoTapArmed(false);
        return;
      }
      setMinutesReceipt({
        id: data?.receipt?.id || idem,
        recipientResolved: data?.receipt?.recipientResolved || validation.resolved,
        timestamp: data?.receipt?.timestamp || new Date().toISOString(),
        deliveryStatus: data?.receipt?.deliveryStatus || 'DRAFT_READY_EMAIL_NOT_CONNECTED',
        statusMessage: data?.statusMessage || 'Draft ready — email not connected',
      });
    } catch (err) {
      setMinutesError(err instanceof Error ? err.message : 'Network error preparing draft');
    }
    setMinutesTwoTapArmed(false);
  };

  const safeShowreelIdx =
    ((activeShowreelIndex % SHOWREEL_ITEMS.length) + SHOWREEL_ITEMS.length) %
    SHOWREEL_ITEMS.length;
  const activeReel = SHOWREEL_ITEMS[safeShowreelIdx];

  // Full-Screen Media View — preserves playback position & context on enter and exit
  if (fullscreenMedia) {
    const pct =
      mediaPlayback.durationSec > 0
        ? Math.min(100, Math.round((mediaPlayback.currentTimeSec / mediaPlayback.durationSec) * 100))
        : 0;

    return (
      <div
        data-testid="fullscreen-media-modal"
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="fixed inset-0 flex flex-col justify-between p-5 md:p-8 neural-reveal"
        style={{ backgroundColor: '#05090E', zIndex: GUI_Z_LAYERS.modalContent }}
      >
        <div className="flex items-center justify-between gap-4 z-10 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="fullscreen-media-exit"
              onClick={() => {
                onMediaControl?.('fullscreen_exit');
                onOpenFullscreenMedia(null);
              }}
              className="min-h-[44px] px-5 rounded-xl font-sans text-sm font-medium text-[#F2F6F8] bg-[#142632] border border-white/40 hover:border-[#F2B66D] cursor-pointer"
            >
              Exit Fullscreen (Esc)
            </button>
            <span
              className="px-3 py-1.5 rounded-xl font-mono text-xs border"
              style={{
                backgroundColor: '#142632',
                borderColor: COLOUR_TOKENS.stationMedia,
                color: COLOUR_TOKENS.stationMedia,
              }}
            >
              {fullscreenMedia.isSample
                ? 'Source file not attached in 09 Media — interactive preview active'
                : 'Verified attached render (06)'}
            </span>
          </div>
          <div className="text-right">
            <h2 className="font-display text-base md:text-lg font-semibold text-[#F2F6F8]">
              {fullscreenMedia.title}
            </h2>
            <p className="font-mono text-xs text-[#BDCBD3]">{fullscreenMedia.subtitle}</p>
          </div>
        </div>

        <div className="relative flex-1 my-4 rounded-2xl overflow-hidden border border-white/25 bg-[#101D27] flex items-center justify-center">
          {fullscreenMedia.url ? (
            <img
              src={fullscreenMedia.url}
              alt={fullscreenMedia.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="max-w-lg text-center p-8 flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-2xl border flex items-center justify-center font-mono text-sm"
                style={{
                  borderColor: COLOUR_TOKENS.stationMedia,
                  color: COLOUR_TOKENS.stationMedia,
                  backgroundColor: '#142632',
                }}
              >
                {mediaPlayback.playing ? '▶ LIVE' : '⏸ PAUSED'}
              </div>
              <h3 className="font-display text-lg font-semibold text-[#F2F6F8]">
                {fullscreenMedia.title}
              </h3>
              <p className="font-sans text-sm text-[#BDCBD3]">
                {fullscreenMedia.material ||
                  'Master video file not attached in 09 Media — interactive timeline & timecode simulation active'}
              </p>
              {fullscreenMedia.companionSticker && (
                <p className="font-mono text-xs text-[#F2B66D]">
                  Companion Signal: "{fullscreenMedia.companionSticker}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Fullscreen Media Controls Bar */}
        <div
          className="w-full rounded-2xl px-5 py-3.5 border flex flex-wrap items-center justify-between gap-4"
          style={{
            backgroundColor: COLOUR_TOKENS.glassRgba,
            borderColor: COLOUR_TOKENS.outlineControl,
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="media-fullscreen-play-toggle"
              onClick={() => onMediaControl?.('toggle_play')}
              className="min-h-[44px] px-4 rounded-xl font-mono text-xs font-semibold bg-[#F2B66D] text-[#101D27] cursor-pointer"
            >
              {mediaPlayback.playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              data-testid="media-fullscreen-mute-toggle"
              onClick={() => onMediaControl?.('toggle_mute')}
              className="min-h-[44px] px-3.5 rounded-xl font-mono text-xs bg-[#142632] border border-white/30 text-[#F2F6F8] cursor-pointer"
            >
              {mediaPlayback.muted ? 'Unmute' : 'Mute'}
            </button>
          </div>

          <div className="flex-1 flex items-center gap-3 min-w-[200px]">
            <span className="font-mono text-xs text-[#F2B66D]" data-testid="media-timecode">
              {formatTimecode(mediaPlayback.currentTimeSec)} /{' '}
              {formatTimecode(mediaPlayback.durationSec)}
            </span>
            <input
              type="range"
              min={0}
              max={mediaPlayback.durationSec}
              value={mediaPlayback.currentTimeSec}
              onChange={(e) => onMediaControl?.('seek', Number(e.target.value))}
              aria-label="Seek media timeline"
              className="flex-1 accent-[#F2B66D] cursor-pointer"
            />
            <span className="font-mono text-xs text-[#BDCBD3]">{pct}%</span>
          </div>

          <span className="font-mono text-xs text-[#BDCBD3]">
            {fullscreenMedia.aspect} · {fullscreenMedia.type}
          </span>
        </div>
      </div>
    );
  }

  // Overview Mode ("Overview" / dashboardCollapsed) — All 5 HQ Stations rendered as compact Optical HUD cards
  if (dashboardCollapsed) {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col md:flex-row items-start justify-between p-4 pt-20 pb-28 gap-3">
        <div className="pointer-events-none self-start flex flex-col gap-2.5 w-full md:w-[330px]">
          {CEREBRO_STATIONS.slice(0, 3).map((st) => (
            <div
              key={st.id}
              data-panel-id={`pocket-${st.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              className="pointer-events-auto rounded-xl px-4 py-3 border neural-reveal flex items-center justify-between gap-3"
              style={{
                backgroundColor: 'rgba(16, 29, 39, 0.84)',
                backdropFilter: 'blur(12px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
                borderColor: 'rgba(255, 255, 255, 0.14)',
                boxShadow:
                  'inset 0 1px 0 rgba(180, 221, 255, 0.18), 0 20px 50px rgba(0, 0, 0, 0.55)',
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono tabular-nums text-[10px] text-[#BDCBD3]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: st.colour }}
                  />
                  <span style={{ color: st.colour }}>{st.code}</span>
                  <span>·</span>
                  <span>{st.badgeCount}</span>
                </div>
                <div className="font-display text-xs font-semibold tracking-[0.08em] uppercase text-[#F2F6F8] truncate mt-0.5">
                  {st.label} ({st.labelAr})
                </div>
                <div className="font-sans text-[11px] text-[#BDCBD3] truncate">
                  {st.summary}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onExpandStationFromDashboard?.(st.id)}
                className="min-h-[38px] px-3.5 rounded-lg font-mono text-[11px] font-semibold bg-[#142632] border border-[rgba(180,221,255,0.16)] text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer shrink-0"
              >
                Open
              </button>
            </div>
          ))}
        </div>

        <div className="pointer-events-none self-start flex flex-col gap-2.5 w-full md:w-[330px]">
          {CEREBRO_STATIONS.slice(3).map((st) => (
            <div
              key={st.id}
              data-panel-id={`pocket-${st.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              className="pointer-events-auto rounded-xl px-4 py-3 border neural-reveal flex items-center justify-between gap-3"
              style={{
                backgroundColor: 'rgba(16, 29, 39, 0.84)',
                backdropFilter: 'blur(12px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
                borderColor: 'rgba(255, 255, 255, 0.14)',
                boxShadow:
                  'inset 0 1px 0 rgba(180, 221, 255, 0.18), 0 20px 50px rgba(0, 0, 0, 0.55)',
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono tabular-nums text-[10px] text-[#BDCBD3]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: st.colour }}
                  />
                  <span style={{ color: st.colour }}>{st.code}</span>
                  <span>·</span>
                  <span>{st.badgeCount}</span>
                </div>
                <div className="font-display text-xs font-semibold tracking-[0.08em] uppercase text-[#F2F6F8] truncate mt-0.5">
                  {st.label} ({st.labelAr})
                </div>
                <div className="font-sans text-[11px] text-[#BDCBD3] truncate">
                  {st.summary}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onExpandStationFromDashboard?.(st.id)}
                className="min-h-[38px] px-3.5 rounded-lg font-mono text-[11px] font-semibold bg-[#142632] border border-[rgba(180,221,255,0.16)] text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer shrink-0"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeProject: ProjectSummary =
    PROJECTS_DATA.find((p) => p.id === selectedProjectId) || PROJECTS_DATA[0];
  const projectRecords = REGISTER_RECORDS.filter((r) => r.projectId === activeProject.id);

  const onTrackCount = PROJECTS_DATA.filter((p) => p.health === 'On track').length;
  const atRiskCount = PROJECTS_DATA.filter((p) => p.health === 'At risk').length;
  const blockedCount = PROJECTS_DATA.filter((p) => p.health === 'Blocked').length;
  const pendingDecisionCount = checkpoints.filter(
    (c) => (c.status || c.defaultStatus) === 'Pending 39 Sign-off'
  ).length;

  const getCurrentDraftForPanel = (panelId: string): string | undefined => {
    if (panelId === 'team-room') return teamDraft;
    if (panelId === 'minutes') return minutesSummaryInput;
    return panelDraftsById[panelId];
  };

  const resolvePanelNumberAndHonesty = (
    panelId: string,
    kicker: string
  ): { panelNum: string; honestyBadge: 'SNAPSHOT' | 'LIVE' | 'PROPOSED' | 'DRAFT ONLY' } => {
    const match = kicker.match(/PANEL\s*#(\d+)/i);
    const numMap: Record<string, string> = {
      portfolio: '#02',
      projects: '#02',
      'project-workspace': '#03',
      tasks: '#04',
      insights: '#05',
      decisions: '#05',
      briefing: '#06',
      gmail: '#07',
      workspace: '#07',
      calendar: '#08',
      files: '#09',
      'file-viewer': '#11',
      media: '#12',
      crew: '#13',
      'team-room': '#13',
      baghira: '#14',
      timeline: '#14',
      kinzo: '#15',
      people: '#15',
      settings: '#16',
      tracker: '#16',
      cde: '#03',
      minutes: '#06',
    };
    const panelNum = match ? `#${match[1].padStart(2, '0')}` : numMap[panelId] || '#01';

    let honestyBadge: 'SNAPSHOT' | 'LIVE' | 'PROPOSED' | 'DRAFT ONLY' = 'SNAPSHOT';
    if (
      panelId === 'crew' ||
      panelId === 'team-room' ||
      kicker.toUpperCase().includes('DRAFT ONLY')
    ) {
      honestyBadge = 'DRAFT ONLY';
    } else if (panelId === 'kinzo' || kicker.toUpperCase().includes('PROPOSED')) {
      honestyBadge = 'PROPOSED';
    } else if (
      panelId === 'gmail' ||
      panelId === 'workspace' ||
      panelId === 'calendar' ||
      panelId === 'settings' ||
      panelId === 'briefing'
    ) {
      honestyBadge = 'LIVE';
    }
    return { panelNum, honestyBadge };
  };

  // Standardized Optical HUD Panel Frame Across All 17 Panels (cerebro.stellar.gui.amend/3.0)
  const renderPanelFrame = (
    panelId: string,
    title: string,
    kicker: string,
    topEdgeColour: string,
    slot: PanelSlotAssignment,
    children: React.ReactNode
  ) => {
    const { panelNum, honestyBadge } = resolvePanelNumberAndHonesty(panelId, kicker);
    const { rect, tabPanelIds, slotId } = slot;
    return (
      <section
        key={`${slotId}-${panelId}`}
        data-panel-id={panelId}
        data-slot-id={slotId}
        aria-label={title}
        dir={languageRtl === 'ar' ? 'rtl' : 'ltr'}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="fixed pointer-events-auto flex flex-col overflow-hidden neural-reveal cerebro-stellar-glass transition-opacity duration-200"
        style={{
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${rect.w}px`,
          maxHeight: `${rect.h}px`,
          backgroundColor: GUI_GLASS_TOKENS.background,
          backdropFilter: GUI_GLASS_TOKENS.backdropFilter,
          WebkitBackdropFilter: GUI_GLASS_TOKENS.backdropFilter,
          border: GUI_GLASS_TOKENS.border,
          borderRadius: `${GUI_GLASS_TOKENS.radiusPx}px`,
          boxShadow: GUI_GLASS_TOKENS.shadow,
          opacity: isCameraInFlight ? 0.62 : 1,
          zIndex: GUI_Z_LAYERS.panels,
        }}
      >
        {/* Multi-Panel Slot Tab Bar (when 2+ open panels share this single layout slot) */}
        {tabPanelIds.length > 1 && (
          <div
            className="px-3 pt-2 pb-1.5 border-b flex items-center gap-1.5 overflow-x-auto shrink-0"
            style={{ borderColor: 'rgba(232, 251, 255, 0.16)' }}
            role="tablist"
            aria-label={`${slotId} panel tabs`}
          >
            {tabPanelIds.map((tid) => {
              const isTabActive = tid === panelId;
              return (
                <button
                  key={tid}
                  type="button"
                  role="tab"
                  aria-selected={isTabActive}
                  data-testid={`slot-tab-${tid}`}
                  onClick={() =>
                    setActiveSlotTabs((prev) => ({
                      ...prev,
                      [slotId]: tid,
                    }))
                  }
                  className={`min-h-[36px] px-2.5 py-1 rounded-lg font-mono text-[11px] uppercase tracking-wider shrink-0 transition-colors cursor-pointer ${
                    isTabActive
                      ? 'bg-[#65ACFF]/25 border border-[#65ACFF] text-[#F2F6F8] font-semibold'
                      : 'bg-[#101D27]/65 border border-[rgba(232,251,255,0.16)] text-[#A9BAC6] hover:text-[#F2F6F8]'
                  }`}
                >
                  {tid}
                </button>
              );
            })}
          </div>
        )}

        {/* Standardized Panel Header Bar (52px min height, >=17px title capability, >=44px touch targets) */}
        <div
          className="px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0"
          style={{
            minHeight: `${GUI_GLASS_TOKENS.headerH}px`,
            borderColor: 'rgba(232, 251, 255, 0.24)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: topEdgeColour }}
              />
              <h2 className="font-display font-semibold text-[15px] md:text-[17px] tracking-[0.04em] uppercase text-[#F2F6F8] truncate">
                {panelNum} · {title}
              </h2>
            </div>
            <div className="font-mono tabular-nums text-[12px] text-[#A9BAC6] truncate mt-0.5 pl-4">
              {kicker}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="font-mono tabular-nums text-[11px] px-2 py-0.5 rounded border"
              style={{
                backgroundColor: '#142632',
                borderColor: 'rgba(232, 251, 255, 0.24)',
                color:
                  honestyBadge === 'LIVE'
                    ? '#5CE0A0'
                    : honestyBadge === 'DRAFT ONLY'
                    ? '#F2B66D'
                    : honestyBadge === 'PROPOSED'
                    ? '#5CC8D7'
                    : '#B4DDFF',
              }}
            >
              {honestyBadge}
            </span>
            {onMinimisePanel && (
              <button
                type="button"
                data-testid={`minimise-${panelId}`}
                onClick={() => {
                  const currentScroll = scrollContainerRefs.current[panelId]?.scrollTop || 0;
                  const currentDraft = getCurrentDraftForPanel(panelId);
                  onMinimisePanel(panelId, title, currentScroll, currentDraft);
                }}
                aria-label={`Minimise ${title} panel`}
                title="Minimise to dock (preserves project, tab, scroll & unsent draft)"
                className="min-w-[44px] min-h-[44px] rounded-xl border border-[rgba(232,251,255,0.24)] bg-[#142632] text-[#A9BAC6] hover:text-[#F2F6F8] hover:border-[#65ACFF] flex items-center justify-center font-mono text-sm cursor-pointer"
              >
                –
              </button>
            )}
            <button
              type="button"
              data-testid={`close-${panelId}`}
              onClick={() => onClosePanel(panelId)}
              aria-label={`Close ${title} panel`}
              className="min-w-[44px] min-h-[44px] rounded-xl border border-[rgba(232,251,255,0.24)] bg-[#142632] text-[#A9BAC6] hover:text-[#F2F6F8] hover:border-[#65ACFF] flex items-center justify-center font-mono text-sm cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Independent Scrollable Glass Body (16px padding, >=14px body text) */}
        <div
          ref={(el) => {
            scrollContainerRefs.current[panelId] = el;
            if (
              el &&
              panelScrollById[panelId] !== undefined &&
              el.scrollTop === 0 &&
              panelScrollById[panelId] > 0
            ) {
              el.scrollTop = panelScrollById[panelId];
            }
          }}
          onScroll={(e) => onPanelScrollChange?.(panelId, e.currentTarget.scrollTop)}
          className="p-4 overflow-y-auto overscroll-contain flex-1 space-y-3 text-[14px]"
        >
          {children}
        </div>
      </section>
    );
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: GUI_Z_LAYERS.panels }}
    >
      {/* Central Unobstructed Sphere Safe Frame Guard (Pointer-Events-None Spatial Clear Zone) */}
      <div
        data-testid="panel-avoidance-ring"
        aria-hidden="true"
        className="fixed rounded-full pointer-events-none"
        style={{
          left: `${effectiveGuiLayout.centerSafeRect.x}px`,
          top: `${effectiveGuiLayout.centerSafeRect.y}px`,
          width: `${effectiveGuiLayout.centerSafeRect.w}px`,
          height: `${effectiveGuiLayout.centerSafeRect.h}px`,
          zIndex: GUI_Z_LAYERS.ambientHUD,
        }}
      />

      {/* Persistent Project Health Strip (Top-Center Below Header) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-25 pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border"
        style={{
          backgroundColor: 'rgba(16, 29, 39, 0.84)',
          backdropFilter: 'blur(12px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
          borderColor: 'rgba(255, 255, 255, 0.14)',
          boxShadow:
            'inset 0 1px 0 rgba(180, 221, 255, 0.18), 0 20px 50px rgba(0, 0, 0, 0.55)',
        }}
      >
        <span className="font-mono text-[10px] text-[#BDCBD3] uppercase tracking-wider">
          Overview:
        </span>
        <span className="font-mono tabular-nums text-[10px] text-[#36E88D]">
          ● {onTrackCount} On track
        </span>
        <span className="font-mono tabular-nums text-[10px] text-[#F2B66D]">
          ▲ {atRiskCount} At risk
        </span>
        <span className="font-mono tabular-nums text-[10px] text-[#FF5666]">
          ⧠ {blockedCount} Blocked
        </span>
        <span className="text-white/20">|</span>
        <button
          type="button"
          data-testid="chip-whats-urgent"
          onClick={() => {
            onToggleUrgentFilter?.(true);
            onOpenPanel?.('tasks');
          }}
          className="px-2.5 py-1 rounded-lg font-mono tabular-nums text-[10px] bg-[#142632] border border-[#F2B66D]/50 text-[#F2B66D] hover:bg-[#F2B66D]/15 cursor-pointer"
        >
          Urgent ({atRiskCount})
        </button>
        <button
          type="button"
          data-testid="chip-approve-pending"
          onClick={() => onOpenPanel?.('decisions')}
          className="px-2.5 py-1 rounded-lg font-mono tabular-nums text-[10px] bg-[#142632] border border-[#7CE0B8]/50 text-[#7CE0B8] hover:bg-[#7CE0B8]/15 cursor-pointer"
        >
          Reviews ({pendingDecisionCount})
        </button>
        <button
          type="button"
          data-testid="chip-unblock-this"
          onClick={() => {
            onSelectProject('BSOCIAL');
            onChangeProjectTab?.('BSOCIAL', 'decisions');
            onOpenPanel?.('decisions');
          }}
          className="px-2.5 py-1 rounded-lg font-mono tabular-nums text-[10px] bg-[#142632] border border-[#FF5666]/50 text-[#FF5666] hover:bg-[#FF5666]/15 cursor-pointer"
        >
          Blocked ({blockedCount})
        </button>
      </div>

      {/* Minimised Panel Chips Dock (Restores Exact Project, Active Tab, Scroll & Unsent Draft) */}
      {minimisedChips.length > 0 && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-24 left-4 z-30 pointer-events-auto flex flex-wrap items-center gap-1.5 max-w-md"
        >
          {minimisedChips.map((chip) => (
            <button
              key={chip.panelId}
              type="button"
              data-testid={`restore-chip-${chip.panelId}`}
              onClick={() => onRestoreChip?.(chip)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg font-mono text-[11px] bg-[#142632] border border-[#65ACFF] text-[#F2F6F8] flex items-center gap-2 hover:bg-[#4C8DFF] hover:text-[#101D27] transition-colors cursor-pointer"
            >
              <span>▢ {chip.label}</span>
              {chip.subTab && (
                <span className="text-[9px] opacity-80">[{chip.subTab.toUpperCase()}]</span>
              )}
              {chip.unsentDraft && (
                <span className="text-[9px] text-[#F2B66D]">[DRAFT SAVED]</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Phone Top Minimised Station Chips + Wireframes v1.1 Quick Dock */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed top-14 left-3 right-3 z-25 pointer-events-auto flex md:hidden items-center gap-1.5 overflow-x-auto py-1"
      >
        {[
          { id: 'portfolio', label: '#2 Portfolio (17)' },
          { id: 'tasks', label: '#4 Tasks' },
          { id: 'insights', label: '#5 Signals (6)' },
          { id: 'briefing', label: '#6 Briefing' },
          { id: 'gmail', label: '#7 Gmail' },
          { id: 'calendar', label: '#8 Calendar' },
          { id: 'files', label: '#9 Drive' },
          { id: 'crew', label: '#13 Crew SSE' },
        ].map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => onOpenPanel?.(st.id)}
            className="min-h-[34px] px-2.5 py-1 rounded-lg font-mono text-[10px] bg-[#142632] border border-[rgba(180,221,255,0.16)] text-[#F2F6F8] shrink-0 cursor-pointer"
          >
            {st.label}
          </button>
        ))}
        {openPanels.length > 0 && (
          <button
            type="button"
            data-testid="phone-sheet-snap-toggle"
            onClick={() => {
              const nextSnap = !phoneSheetSnap92;
              setPhoneSheetSnap92(nextSnap);
              onChangePhoneSheetState?.(nextSnap ? 'expanded' : 'default');
            }}
            className="min-h-[44px] px-3 py-1 rounded-lg font-mono tabular-nums text-[11px] bg-[#4C8DFF] text-[#101D27] font-semibold shrink-0 cursor-pointer"
          >
            Sheet {effectivePhoneSheetState === 'expanded' ? 'Expanded' : 'Default'}
          </button>
        )}
      </div>

      {/* Single-Owner Responsive Layout Slots (Phone: 1 bottom sheet; Tablet: 1 left inspector; Desktop/Wide: max 2 left/right inspectors with tabs) */}
      {effectiveGuiLayout.panelSlots.map((slot) => {
        const panelId = slot.activePanelId;
        const posClass = slot;

        const sharedV11Props = {
          panelId,
          selectedProjectId,
          activeShowreelIndex,
          mediaPlayback,
          fileSearchQuery,
          reducedMotion,
          soundMuted,
          languageRtl,
          handsActive,
          screenAmendments,
          onSelectProject,
          onOpenPanel: (pid: string) => onOpenPanel?.(pid),
          onClosePanel,
          onChangeShowreelIndex: (idx: number) => onChangeShowreelIndex?.(idx),
          onMediaControl: (
            act:
              | 'play'
              | 'pause'
              | 'toggle_play'
              | 'seek'
              | 'mute'
              | 'unmute'
              | 'toggle_mute'
              | 'fullscreen_enter'
              | 'fullscreen_exit',
            sec?: number
          ) => onMediaControl?.(act, sec),
          onOpenFullscreenMedia,
          onFileSearchChange,
          onToggleReducedMotion: () => onToggleReducedMotion?.(),
          onToggleSoundMuted: () => onToggleSoundMuted?.(),
          onToggleLanguageRtl: (l: 'en' | 'ar') => onToggleLanguageRtl?.(l),
          onToggleHands: () => onToggleHands?.(),
          onOpenProjectMediaTube: () => onSimulateCommand?.('project.open_tube'),
        };

        // Dedicated Wireframes v1.1 Panels (#2 Portfolio, #6 Morning Briefing, #7 Gmail, #8 Calendar, #11 FileViewer, #13 Crew SSE, #14 Baghira, #15 Kinzo)
        if (
          panelId === 'portfolio' ||
          panelId === 'briefing' ||
          panelId === 'gmail' ||
          panelId === 'workspace' ||
          panelId === 'calendar' ||
          panelId === 'file-viewer' ||
          panelId === 'crew' ||
          panelId === 'baghira' ||
          panelId === 'kinzo'
        ) {
          const panelMeta: Record<string, { title: string; kicker: string; color: string }> = {
            portfolio: {
              title: 'Portfolio (17 Projects Uncapped)',
              kicker: 'PANEL #2 · ALL · ACTIVE · WAITING ON 39 · BLOCKED',
              color: COLOUR_TOKENS.stationProjects,
            },
            briefing: {
              title: 'Morning Briefing (Africa/Cairo)',
              kicker: 'PANEL #6 · 06:00–10:30 AUTO-WINDOW · TODAY · MEETINGS · APPROVALS',
              color: COLOUR_TOKENS.stationTasks,
            },
            gmail: {
              title: 'Gmail · me@nojara.com',
              kicker: 'PANEL #7 · SPLIT THREAD/COMPOSER · TWO-TAP 4000ms/5000ms',
              color: COLOUR_TOKENS.cobaltAccent,
            },
            workspace: {
              title: 'Google Workspace · Gmail & Drive',
              kicker: 'PANEL #7 · OAUTH CONNECTED · TWO-TAP SAFETY',
              color: COLOUR_TOKENS.cobaltAccent,
            },
            calendar: {
              title: 'Google Calendar & Meet',
              kicker: 'PANEL #8 · MON–SUN 09:00–19:00 WEEK GRID · TWO-TAP CREATE',
              color: COLOUR_TOKENS.stationTasks,
            },
            'file-viewer': {
              title: 'File Viewer · PDF / Doc / Sheet',
              kicker: 'PANEL #11 · ‹ PAGE 2 / 14 › · ZOOM −/+ & IPAD PINCH',
              color: COLOUR_TOKENS.stationFiles,
            },
            crew: {
              title: 'Crew 2×2 Live SSE Streaming Grid',
              kicker: 'PANEL #13 · DRAFT ONLY · NEEDS YOUR APPROVAL',
              color: COLOUR_TOKENS.stationPeople,
            },
            baghira: {
              title: 'Baghira [BG] · Plan + Timeline',
              kicker: 'PANEL #14 · GANTT BARS & DEPENDENCY GATES',
              color: COLOUR_TOKENS.stationTasks,
            },
            kinzo: {
              title: 'Kinzo [KZ] · Crew-Bot Roster',
              kicker: 'PANEL #15 · PROPOSED SPECIALIST BOTS',
              color: COLOUR_TOKENS.stationPeople,
            },
          };
          const meta = panelMeta[panelId] || panelMeta.portfolio;
          return renderPanelFrame(
            panelId,
            meta.title,
            meta.kicker,
            meta.color,
            posClass,
            <WireframesV11PanelContent {...sharedV11Props} />
          );
        }

        // 1. PROJECTS STATION PANEL (Includes Wireframes v1.1 17-Project Uncapped Filter View + Register Snapshot)
        if (panelId === 'projects') {
          return renderPanelFrame(
            'projects',
            'Projects · 17 Portfolio Workstreams',
            'PANEL #2 · ALL · ACTIVE · WAITING ON 39 · BLOCKED',
            COLOUR_TOKENS.stationProjects,
            posClass,
            <>
              <WireframesV11PanelContent {...sharedV11Props} panelId="portfolio" />
              <div className="flex items-center justify-between font-mono text-[11px] text-[#BDCBD3] px-1 pt-2 border-t border-white/15">
                <span>4 REGISTER WORKSTREAMS · 4 SAMPLE</span>
                <span>SELECT PROJECT TO INSPECT</span>
              </div>
              <div className="space-y-2.5">
                {PROJECTS_DATA.map((proj) => {
                  const isSelected = proj.id === selectedProjectId;
                  return (
                    <div
                      key={proj.id}
                      data-testid={`project-card-${proj.id}`}
                      onClick={() => onSelectProject(proj.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectProject(proj.id)}
                      className="rounded-lg p-3 border transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(20, 38, 50, 0.92)'
                          : 'rgba(20, 38, 50, 0.72)',
                        borderColor: isSelected
                          ? COLOUR_TOKENS.focusRing
                          : 'rgba(180, 221, 255, 0.16)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {proj.thumbnailAsset ? (
                            <img
                              src={proj.thumbnailAsset}
                              alt={proj.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover border border-white/25 shrink-0"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg border flex items-center justify-center font-mono text-xs font-semibold shrink-0"
                              style={{
                                borderColor: COLOUR_TOKENS.stationProjects,
                                color: COLOUR_TOKENS.textPrimary,
                                backgroundColor: '#142632',
                              }}
                            >
                              {proj.code}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-display text-xs md:text-sm font-semibold text-[#F2F6F8] truncate">
                                {proj.name}
                              </h3>
                              {proj.isSample && (
                                <span className="font-mono text-[10px] text-[#F2B66D]">
                                  · SAMPLE
                                </span>
                              )}
                            </div>
                            <p className="font-sans text-[11px] text-[#BDCBD3] truncate">
                              {proj.subtitle}
                            </p>
                          </div>
                        </div>
                        <HealthIndicator health={proj.health} />
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#BDCBD3] mb-1">
                          <span>Progress: {proj.progressLabel}</span>
                          <span>Open Tasks: {proj.openTaskCount}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#101D27] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${proj.progress}%`,
                              backgroundColor: COLOUR_TOKENS.stationProjects,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-1.5 font-mono text-[10px] text-[#BDCBD3]">
                        <span className="truncate">Owner: {proj.owner}</span>
                        <span className="truncate text-right">Due: {proj.nextDeadline}</span>
                        <span className="col-span-2 truncate text-[#D0DCE3]">
                          Last activity: {proj.lastActivity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        }

        // 2. PROJECT DETAIL WORKSPACE PANEL (9 Wireframes v1.1 Tabs + 3 KPI Cards + 6 Register Workspace Tabs)
        if (panelId === 'project-detail') {
          return renderPanelFrame(
            'project-detail',
            `${activeProject.name} — Workspace`,
            `PANEL #3 · 9 TABS & 3 KPI CARDS · ${activeProject.code}`,
            COLOUR_TOKENS.stationProjectDetail,
            posClass,
            <>
              <WireframesV11PanelContent {...sharedV11Props} panelId="project-detail" />
              <div
                className="rounded-xl p-3 border space-y-2"
                style={{
                  backgroundColor: COLOUR_TOKENS.glassPocketRgba,
                  borderColor: 'rgba(255,255,255,0.22)',
                }}
              >
                {activeProject.thumbnailAsset ? (
                  <div className="relative h-28 rounded-lg overflow-hidden border border-white/20">
                    <img
                      src={activeProject.thumbnailAsset}
                      alt={activeProject.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onOpenFullscreenMedia(MEDIA_ITEMS[0])}
                      className="absolute bottom-2 right-2 min-h-[36px] px-3 py-1 rounded-lg font-mono text-[10px] bg-[#101D27]/90 text-[#F2F6F8] border border-white/40 cursor-pointer"
                    >
                      Open Fullscreen
                    </button>
                  </div>
                ) : (
                  <div className="h-16 rounded-lg border border-dashed border-white/25 flex flex-col items-center justify-center text-center p-2">
                    <span className="font-mono text-[11px] text-[#BDCBD3]">
                      Project cover not attached in source archive (Sample entry)
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <HealthIndicator health={activeProject.health} />
                  <span className="font-mono text-[11px] text-[#BDCBD3]">
                    {activeProject.lastActivity}
                  </span>
                </div>
                <p className="font-sans text-xs text-[#F2F6F8] leading-relaxed">
                  {activeProject.description}
                </p>
              </div>

              {/* 6 Workspace Tabs: Overview / Tasks / Reviews / Meeting notes / Files / Team */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#101D27] border border-white/20">
                {(
                  [
                    { id: 'overview', label: 'Overview' },
                    { id: 'tasks', label: 'Tasks' },
                    { id: 'decisions', label: 'Reviews' },
                    { id: 'minutes', label: 'Meeting notes' },
                    { id: 'files', label: 'Files' },
                    { id: 'team', label: 'Team' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`project-tab-${t.id}`}
                    onClick={() => handleSetProjectTab(t.id)}
                    className={`min-h-[38px] py-1.5 px-2 rounded-lg font-mono text-[10px] transition-colors cursor-pointer whitespace-nowrap ${
                      effectiveProjectTab === t.id
                        ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                        : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {!isOwnerOnly && activeProject.id === 'BSOCIAL' ? (
                <div className="rounded-xl p-4 border border-white/30 bg-[#101D27] text-center space-y-1">
                  <div className="font-mono text-xs text-[#F2F6F8]">Owner only</div>
                  <p className="font-sans text-xs text-[#BDCBD3]">
                    Restricted operational access records withheld for audience level "{audienceLevel}".
                  </p>
                </div>
              ) : effectiveProjectTab === 'overview' ? (
                <div className="rounded-xl p-3 border border-white/20 bg-[#101D27]/85 space-y-2 font-mono text-xs">
                  <div className="text-[#4C8DFF] font-semibold">
                    {activeProject.code} · {activeProject.subdomain}
                  </div>
                  <div className="text-[#F2F6F8]">Status Note: {activeProject.healthNote}</div>
                  <div className="text-[#BDCBD3]">Owner: {activeProject.owner}</div>
                  <div className="text-[#BDCBD3]">Next Deadline: {activeProject.nextDeadline}</div>
                </div>
              ) : effectiveProjectTab === 'team' ? (
                <div className="space-y-2">
                  {RACI_MATRIX.filter((r) => r.projectId === activeProject.id).map((row) => (
                    <div
                      key={row.projectId}
                      className="rounded-xl p-3 border border-white/20 bg-[#101D27]/90 font-mono text-xs space-y-1"
                    >
                      <div className="text-[#E6A2B4] font-semibold">{row.deliverable}</div>
                      <div>R: {row.responsible}</div>
                      <div>A: {row.accountable}</div>
                      <div>C: {row.consulted}</div>
                      <div>I: {row.informed}</div>
                    </div>
                  ))}
                </div>
              ) : effectiveProjectTab === 'files' ? (
                <div className="space-y-2">
                  {FILES_DATA.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="rounded-xl p-2.5 border border-white/20 bg-[#101D27]/85 space-y-1"
                    >
                      <div className="font-mono text-xs text-[#3DDC97]">{file.name}</div>
                      <div className="font-mono text-[10px] text-[#BDCBD3]">
                        {file.folder} · {file.pagesOrSize}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {projectRecords.length === 0 ? (
                    <div className="rounded-xl p-3 border border-dashed border-white/25 font-mono text-xs text-[#BDCBD3]">
                      Sample project — no register rows in the 23 Oct 2025 snapshot for{' '}
                      {activeProject.code}.
                    </div>
                  ) : (
                    projectRecords
                      .filter((r) => {
                        if (effectiveProjectTab === 'tasks')
                          return r.recordType === 'Action' || r.recordType === 'Question';
                        if (effectiveProjectTab === 'decisions')
                          return r.recordType === 'Decision' || r.recordType === 'Question';
                        if (effectiveProjectTab === 'minutes') return r.recordType === 'Update';
                        return true;
                      })
                      .map((rec) => (
                        <div
                          key={rec.id}
                          className="rounded-xl p-2.5 border border-white/20 bg-[#101D27]/85 space-y-1"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] text-[#4C8DFF]">
                            <span>
                              {rec.recordType.toUpperCase()} · {rec.workstream}
                            </span>
                            <span className="text-[#BDCBD3]">{rec.reviewStatus}</span>
                          </div>
                          <div className="font-sans text-xs font-medium text-[#F2F6F8]">
                            {rec.summary}
                          </div>
                          <p className="font-sans text-[11px] text-[#BDCBD3] leading-snug">
                            {rec.detail}
                          </p>
                          <div className="font-mono text-[10px] text-[#D0DCE3] pt-1 border-t border-white/10 truncate">
                            Source: {rec.evidenceLocator}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </>
          );
        }

        // 3. PEOPLE STATION PANEL (With Person Inspection -> Linked Work & Review Checkpoints)
        if (panelId === 'people') {
          const selectedPersonObj = selectedPersonId
            ? PEOPLE_DATA.find((p) => p.id === selectedPersonId) || null
            : null;

          const getPersonWorkAndCheckpoints = (personName: string) => {
            const firstToken = personName.split(/[\s(]/)[0].toLowerCase();
            const isOwner = personName.includes('39') || firstToken === 'tarek';
            const records = REGISTER_RECORDS.filter((r) => {
              const ownerLow = r.owner.toLowerCase();
              if (isOwner) return ownerLow.includes('39') || ownerLow.includes('tarek');
              return firstToken.length > 2 && ownerLow.includes(firstToken);
            });
            const personCheckpoints = checkpoints.filter((c) => {
              const leadLow = c.agentOrPerson.toLowerCase();
              if (isOwner) return true;
              return firstToken.length > 2 && leadLow.includes(firstToken);
            });
            return { records, personCheckpoints };
          };

          return renderPanelFrame(
            'people',
            'People & Responsibilities (12 Crew & AI)',
            'PANEL #12 · 39, GD, BL, RS, MU, KT, FK, NQ, WS, ZB, BG, KZ · 3939 LOCK',
            COLOUR_TOKENS.stationPeople,
            posClass,
            <>
              <WireframesV11PanelContent {...sharedV11Props} panelId="people" />
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#101D27] border border-white/25">
                {(['HQ', 'Team and Contracts', 'RACI'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onChangePeopleSubTab(tab)}
                    className={`min-h-[40px] flex-1 py-1.5 px-2 rounded-lg font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                      peopleSubTab === tab
                        ? 'bg-[#E6A2B4] text-[#101D27] font-semibold'
                        : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Selected Person Detail Drawer */}
              {selectedPersonObj && (
                <div
                  data-testid={`person-detail-${selectedPersonObj.id}`}
                  className="rounded-xl p-3 border border-[#E6A2B4] bg-[#142632]/95 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[10px] text-[#E6A2B4]">
                        SELECTED PERSON · {selectedPersonObj.subGroup.toUpperCase()}
                      </div>
                      <h3 className="font-display text-sm font-semibold text-[#F2F6F8]">
                        {selectedPersonObj.name}
                      </h3>
                      <div className="font-mono text-[11px] text-[#4C8DFF]">
                        {selectedPersonObj.title}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectPerson?.(null)}
                      className="px-2.5 py-1 rounded-lg font-mono text-[10px] bg-[#101D27] border border-white/25 text-[#BDCBD3] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="font-sans text-xs text-[#BDCBD3]">{selectedPersonObj.notes}</p>

                  {(() => {
                    const { records, personCheckpoints } = getPersonWorkAndCheckpoints(
                      selectedPersonObj.name
                    );
                    return (
                      <div className="space-y-2 pt-1 border-t border-white/15">
                        <div className="font-mono text-[10px] text-[#9AFFE0]">
                          ASSIGNED WORK ({records.length} items) & REVIEWS ({personCheckpoints.length})
                        </div>
                        {personCheckpoints.slice(0, 2).map((chk) => (
                          <div
                            key={chk.id}
                            className="rounded-lg p-2 bg-[#101D27] border border-white/15 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-[10px] text-[#F2B66D]">
                                [{chk.projectId}] {chk.status || chk.defaultStatus}
                              </div>
                              <div className="font-sans text-xs text-[#F2F6F8] truncate">
                                {chk.title}
                              </div>
                            </div>
                            <button
                              type="button"
                              data-testid={`person-open-review-${chk.id}`}
                              onClick={() => onOpenPanel?.('decisions')}
                              className="px-2.5 py-1 rounded bg-[#4C8DFF] text-[#101D27] font-mono text-[10px] font-semibold shrink-0 cursor-pointer"
                            >
                              Review
                            </button>
                          </div>
                        ))}
                        {records.slice(0, 3).map((rec) => (
                          <div
                            key={rec.id}
                            onClick={() => onSelectProject(rec.projectId)}
                            className="rounded-lg p-2 bg-[#101D27] border border-white/15 hover:border-[#4C8DFF] cursor-pointer"
                          >
                            <div className="font-mono text-[10px] text-[#4C8DFF]">
                              [{rec.projectId}] {rec.recordType} · {rec.reviewStatus}
                            </div>
                            <div className="font-sans text-xs text-[#F2F6F8] truncate">
                              {rec.summary}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {peopleSubTab === 'RACI' ? (
                <div className="space-y-2.5">
                  <div className="font-mono text-[11px] text-[#BDCBD3]">
                    Ask by voice: "Who is accountable on SEVEN?" or "Who is responsible on MHE?"
                  </div>
                  {RACI_MATRIX.filter(
                    (row) => !raciFilterProject || row.projectId === raciFilterProject
                  ).map((row) => (
                    <div
                      key={row.projectId}
                      className="rounded-xl p-3 border bg-[#101D27]/90 space-y-1.5"
                      style={{
                        borderColor:
                          raciFilterProject === row.projectId
                            ? COLOUR_TOKENS.stationPeople
                            : 'rgba(255,255,255,0.22)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-semibold text-[#F2F6F8]">
                          {row.projectName}
                        </span>
                        <span className="font-mono text-[10px] text-[#E6A2B4]">RACI MATRIX</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#BDCBD3]">{row.deliverable}</p>
                      <div className="grid grid-cols-1 gap-1 pt-1 border-t border-white/10 font-mono text-[11px]">
                        <div>
                          <span className="text-[#4C8DFF]">R (Responsible): </span>
                          <span className="text-[#F2F6F8]">{row.responsible}</span>
                        </div>
                        <div>
                          <span className="text-[#E6A2B4]">A (Accountable): </span>
                          <span className="text-[#F2F6F8] font-semibold">{row.accountable}</span>
                        </div>
                        <div>
                          <span className="text-[#F2B66D]">C (Consulted): </span>
                          <span className="text-[#BDCBD3]">{row.consulted}</span>
                        </div>
                        <div>
                          <span className="text-[#3DDC97]">I (Informed): </span>
                          <span className="text-[#BDCBD3]">{row.informed}</span>
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-[#BDCBD3] pt-1">
                        Source: {row.sourceStatus}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {PEOPLE_DATA.filter((p) => p.group === peopleSubTab).map((person) => {
                    const isSelected = selectedPersonId === person.id;
                    return (
                      <div
                        key={person.id}
                        data-testid={`person-card-${person.id}`}
                        onClick={() => onSelectPerson?.(person.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectPerson?.(person.id)}
                        className="rounded-xl p-3 border bg-[#101D27]/85 flex items-start gap-3 cursor-pointer transition-colors"
                        style={{
                          borderColor: isSelected
                            ? COLOUR_TOKENS.stationPeople
                            : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg border flex items-center justify-center font-mono text-xs font-semibold shrink-0"
                          style={{
                            borderColor: COLOUR_TOKENS.stationPeople,
                            color: COLOUR_TOKENS.stationPeople,
                            backgroundColor: '#142632',
                          }}
                        >
                          {person.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display text-xs font-semibold text-[#F2F6F8] truncate">
                              {person.name}
                            </h3>
                            <span className="font-mono text-[10px] text-[#E6A2B4] shrink-0">
                              {person.subGroup}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-[#4C8DFF] mt-0.5">
                            {person.title}
                          </div>
                          <p className="font-sans text-[11px] text-[#BDCBD3] mt-1 leading-snug">
                            {person.notes}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        }

        // 4. TASKS STATION PANEL
        if (panelId === 'tasks') {
          const displayedRecords = urgentFilterOnly
            ? REGISTER_RECORDS.filter(
                (r) =>
                  r.recordType === 'Action' ||
                  r.recordType === 'Question' ||
                  r.summary.toLowerCase().includes('550') ||
                  r.summary.toLowerCase().includes('eea') ||
                  r.summary.toLowerCase().includes('nov 1')
              )
            : REGISTER_RECORDS;

          return renderPanelFrame(
            'tasks',
            'TaskBoard · 4 Columns & Action Rollups',
            'PANEL #4 · TO DO · DOING · WAITING · DONE + DETAIL SHEET',
            COLOUR_TOKENS.stationTasks,
            posClass,
            <>
              <WireframesV11PanelContent {...sharedV11Props} panelId="tasks" />
              <div className="font-mono text-[11px] text-[#BDCBD3] flex items-center justify-between gap-2 pt-2 border-t border-white/15">
                <span>
                  {urgentFilterOnly
                    ? 'URGENT ITEMS FILTER ACTIVE'
                    : 'SNAPSHOT FROM 23 OCT 2025 REGISTER'}
                </span>
                <div className="flex items-center gap-1.5">
                  {urgentFilterOnly && (
                    <button
                      type="button"
                      onClick={() => onToggleUrgentFilter?.(false)}
                      className="px-2 py-0.5 rounded bg-[#142632] border border-[#F2B66D] text-[#F2B66D] text-[10px] cursor-pointer"
                    >
                      Show All ({REGISTER_RECORDS.length})
                    </button>
                  )}
                  <span>{displayedRecords.length + customTasks.length} ITEMS</span>
                </div>
              </div>

              {customTasks.map((ct) => (
                <div
                  key={ct.id}
                  className="rounded-xl p-3 border bg-[#101D27] space-y-1"
                  style={{ borderColor: COLOUR_TOKENS.stationTasks }}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#B8F04A]">
                    <span>SAVED TASK · {ct.projectCode}</span>
                    <span>{ct.createdAt}</span>
                  </div>
                  <div className="font-sans text-xs font-semibold text-[#F2F6F8]">{ct.title}</div>
                  {ct.attachmentName && (
                    <div className="font-mono text-[10px] text-[#BDCBD3]">
                      Attached file: {ct.attachmentName}
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-2">
                {displayedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => onSelectProject(rec.projectId)}
                    className="rounded-xl p-2.5 border border-white/20 bg-[#101D27]/85 hover:border-[#B8F04A] transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span style={{ color: COLOUR_TOKENS.stationTasks }}>
                        [{rec.projectId}] {rec.recordType.toUpperCase()}
                      </span>
                      <span className="text-[#BDCBD3]">{rec.workstream}</span>
                    </div>
                    <div className="font-sans text-xs font-medium text-[#F2F6F8]">
                      {rec.summary}
                    </div>
                    <p className="font-sans text-[11px] text-[#BDCBD3] line-clamp-2">
                      {rec.detail}
                    </p>
                    <div className="font-mono text-[10px] text-[#9AFFE0] truncate">
                      Source: {rec.evidenceLocator}
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#D0DCE3] pt-1 border-t border-white/10">
                      <span className="truncate">Owner: {rec.owner}</span>
                      <span className="shrink-0">{rec.updatedAt.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        }

        // 5. FILES STATION PANEL (Includes Wireframes v1.1 #9 Drive Files + Google Docs & Sheets)
        if (panelId === 'files') {
          const q = fileSearchQuery.trim().toLowerCase();
          const filteredFiles = FILES_DATA.filter(
            (f) =>
              !q ||
              f.name.toLowerCase().includes(q) ||
              f.folder.toLowerCase().includes(q) ||
              f.type.toLowerCase().includes(q)
          );

          return renderPanelFrame(
            'files',
            'Drive Files · Docs & Sheets',
            'PANEL #9 · LIVE BADGE AFTER loadDrive() · BREADCRUMB SEARCH',
            COLOUR_TOKENS.stationFiles,
            posClass,
            <>
              <WireframesV11PanelContent {...sharedV11Props} panelId="files" />
              <div className="space-y-1.5 pt-2 border-t border-white/15">
                <input
                  type="text"
                  value={fileSearchQuery}
                  onChange={(e) => onFileSearchChange(e.target.value)}
                  placeholder="Search files (e.g. 'blueprint', 'seven', 'register', 'bio')..."
                  className="w-full min-h-[44px] px-3 py-1.5 rounded-xl bg-[#05090E] border border-white/30 font-sans text-xs text-[#F2F6F8] placeholder-[#BDCBD3]/60 focus:outline-none focus:border-[#65ACFF]"
                />
                <div className="font-mono text-[10px] text-[#BDCBD3] flex justify-between">
                  <span>MATCHES: {filteredFiles.length}</span>
                  <span>AUDIENCE: {audienceLevel.toUpperCase()}</span>
                </div>
              </div>

              <div className="space-y-2">
                {filteredFiles.map((file) => {
                  const withheld = file.restricted && !isOwnerOnly;
                  return (
                    <div
                      key={file.id}
                      className="rounded-xl p-2.5 border border-white/20 bg-[#101D27]/85 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span style={{ color: COLOUR_TOKENS.stationFiles }}>{file.type}</span>
                        <span className="text-[#BDCBD3]">Last saved: {file.lastSaved}</span>
                      </div>
                      <div className="font-mono text-xs font-medium text-[#F2F6F8] break-all">
                        {withheld ? 'Owner only — Restricted PMO File' : file.name}
                      </div>
                      <div className="font-sans text-[11px] text-[#BDCBD3]">
                        Location: {file.folder}
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] text-[#D0DCE3] pt-1 border-t border-white/10">
                        <span>{file.pagesOrSize}</span>
                        <span>{file.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        }

        // 6. MEDIA & SHOWREEL PANEL (With Interactive Playback, Seek, Mute & Fullscreen Controls)
        if (panelId === 'media') {
          const customUrl = customEmbeds[activeReel.id] || activeReel.embedUrl || '';

          return renderPanelFrame(
            'media',
            'Media & Showreel',
            'HQ · 5 SHOWREELS & TABUK 4K RENDERS',
            COLOUR_TOKENS.stationMedia,
            posClass,
            <>
              <div
                className="rounded-xl p-3 border border-[#F2B66D]/50 bg-[#101D27]/95 space-y-2.5"
                style={{ perspective: '1100px' }}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-token-amber font-semibold">
                    SHOWREEL 0{safeShowreelIdx + 1}/0{SHOWREEL_ITEMS.length}
                  </span>
                  <span className="text-[#BDCBD3]" data-testid="panel-media-timecode">
                    {formatTimecode(mediaPlayback.currentTimeSec)} /{' '}
                    {formatTimecode(mediaPlayback.durationSec)}
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-white/25 bg-[#05090E]">
                  {customUrl ? (
                    <iframe
                      src={customUrl}
                      title={activeReel.title}
                      className="w-full h-36 border-0"
                      allow="autoplay; fullscreen; picture-in-picture"
                    />
                  ) : activeReel.posterUrl ? (
                    <div
                      onClick={() => {
                        onMediaControl?.('fullscreen_enter');
                        onOpenFullscreenMedia({
                          id: activeReel.id,
                          title: activeReel.title,
                          subtitle: activeReel.subtitle,
                          type: 'Render JPG',
                          url: activeReel.posterUrl,
                          aspect: '16:9',
                          companionSticker: activeReel.companionSticker,
                          isSample: false,
                        });
                      }}
                      className="relative h-36 cursor-pointer group"
                    >
                      <img
                        src={activeReel.posterUrl}
                        alt={activeReel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[#05090E]/45 flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-lg font-mono text-[11px] bg-[#101D27]/90 border border-[#F2B66D] text-[#F2B66D]">
                          {mediaPlayback.playing ? '▶ Playing · Fullscreen' : '▶ Open Fullscreen'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        onMediaControl?.('fullscreen_enter');
                        onOpenFullscreenMedia({
                          id: activeReel.id,
                          title: activeReel.title,
                          subtitle: activeReel.subtitle,
                          type: 'Showreel Video [SAMPLE]',
                          aspect: '16:9',
                          material: `Source file not attached in 09 Media (${activeReel.drivePath})`,
                          companionSticker: activeReel.companionSticker,
                          isSample: true,
                        });
                      }}
                      className="h-32 p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#142632]/50 transition-colors"
                    >
                      <span className="font-mono text-[10px] text-token-amber">
                        Source file not attached in 09 Media — interactive preview
                      </span>
                      <span className="font-display text-xs font-semibold text-[#F2F6F8] mt-1">
                        {activeReel.title}
                      </span>
                      <span className="font-mono text-[10px] text-[#BDCBD3] mt-1">
                        "{activeReel.companionSticker}" · Tap for Fullscreen
                      </span>
                    </div>
                  )}
                </div>

                {/* Interactive Media Player Controls: Play/Pause, Seek Scrubber, Mute/Unmute, Fullscreen */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="media-play-toggle"
                      onClick={() => onMediaControl?.('toggle_play')}
                      className="min-h-[38px] px-3 rounded-lg font-mono text-[11px] font-semibold bg-[#F2B66D] text-[#101D27] cursor-pointer"
                    >
                      {mediaPlayback.playing ? 'Pause' : 'Play'}
                    </button>
                    <input
                      type="range"
                      data-testid="media-seek-slider"
                      min={0}
                      max={mediaPlayback.durationSec}
                      value={mediaPlayback.currentTimeSec}
                      onChange={(e) => onMediaControl?.('seek', Number(e.target.value))}
                      aria-label="Seek showreel timeline"
                      className="flex-1 accent-[#F2B66D] cursor-pointer"
                    />
                    <button
                      type="button"
                      data-testid="media-mute-toggle"
                      onClick={() => onMediaControl?.('toggle_mute')}
                      className="min-h-[38px] px-2.5 rounded-lg font-mono text-[10px] bg-[#142632] border border-white/25 text-[#F2F6F8] cursor-pointer"
                    >
                      {mediaPlayback.muted ? 'Muted' : 'Audio'}
                    </button>
                    <button
                      type="button"
                      data-testid="media-fullscreen-enter"
                      onClick={() => {
                        onMediaControl?.('fullscreen_enter');
                        onOpenFullscreenMedia({
                          id: activeReel.id,
                          title: activeReel.title,
                          subtitle: activeReel.subtitle,
                          type: activeReel.posterUrl ? 'Render JPG' : 'Showreel Video [SAMPLE]',
                          url: activeReel.posterUrl,
                          aspect: '16:9',
                          companionSticker: activeReel.companionSticker,
                          isSample: !activeReel.posterUrl,
                        });
                      }}
                      className="min-h-[38px] px-2.5 rounded-lg font-mono text-[10px] bg-[#142632] border border-[#F2B66D]/60 text-[#F2B66D] cursor-pointer"
                    >
                      Fullscreen
                    </button>
                  </div>

                  <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                    {activeReel.title}
                  </div>
                  <div className="font-mono text-[10px] text-[#BDCBD3] truncate">
                    Path: {activeReel.drivePath}
                  </div>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = { ...customEmbeds, [activeReel.id]: val };
                      setCustomEmbeds(next);
                      try {
                        localStorage.setItem('cerebro_showreel_embeds_v1', JSON.stringify(next));
                      } catch {}
                    }}
                    placeholder="Optional: Paste live Vimeo / Drive embed URL..."
                    className="w-full min-h-[38px] px-2.5 py-1 rounded-lg bg-[#05090E] border border-white/25 font-mono text-[10px] text-[#F2F6F8] placeholder-[#BDCBD3]/50 focus:outline-none focus:border-[#F2B66D]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    data-testid="media-prev-reel"
                    onClick={() =>
                      onChangeShowreelIndex?.(
                        (safeShowreelIdx - 1 + SHOWREEL_ITEMS.length) % SHOWREEL_ITEMS.length
                      )
                    }
                    className="min-h-[40px] px-3 py-1 rounded-lg font-mono text-[11px] bg-[#142632] border border-white/30 text-[#F2F6F8] hover:border-[#F2B66D] cursor-pointer"
                  >
                    ‹ Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {SHOWREEL_ITEMS.map((r, rIdx) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onChangeShowreelIndex?.(rIdx)}
                        className="h-2.5 rounded-full transition-all cursor-pointer"
                        style={{
                          width: rIdx === safeShowreelIdx ? '18px' : '8px',
                          backgroundColor:
                            rIdx === safeShowreelIdx
                              ? COLOUR_TOKENS.stationMedia
                              : 'rgba(255,255,255,0.28)',
                        }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    data-testid="media-next-reel"
                    onClick={() =>
                      onChangeShowreelIndex?.((safeShowreelIdx + 1) % SHOWREEL_ITEMS.length)
                    }
                    className="min-h-[40px] px-3 py-1 rounded-lg font-mono text-[11px] bg-[#F2B66D] text-[#101D27] font-semibold cursor-pointer"
                  >
                    Next ›
                  </button>
                </div>
              </div>

              <div className="font-mono text-[11px] text-[#F2B66D] pt-1">
                SEVEN Tabuk Concept Renders (Attached in 06) + Sculptural Specs
              </div>
              <div className="space-y-2.5">
                {MEDIA_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onMediaControl?.('fullscreen_enter');
                      onOpenFullscreenMedia(item);
                    }}
                    className="rounded-xl p-2.5 border border-white/25 bg-[#101D27]/90 hover:border-[#F2B66D] transition-colors cursor-pointer flex items-center gap-3"
                  >
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-16 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                      />
                    ) : (
                      <div
                        className="w-16 h-12 rounded-lg border flex items-center justify-center font-mono text-[10px] text-center shrink-0"
                        style={{
                          borderColor: COLOUR_TOKENS.stationMedia,
                          color: COLOUR_TOKENS.stationMedia,
                          backgroundColor: '#142632',
                        }}
                      >
                        {item.isSample ? 'UNATTACHED' : '3D SPEC'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xs font-semibold text-[#F2F6F8] truncate">
                        {item.title}
                      </div>
                      <div className="font-sans text-[11px] text-[#BDCBD3] truncate">
                        {item.subtitle}
                      </div>
                      <div className="font-mono text-[10px] text-[#F2B66D] mt-0.5">
                        {item.isSample
                          ? 'Source file not attached in 09 Media'
                          : 'Verified attached render — Open fullscreen →'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        }

        // 7. CDE EXPLORER PANEL
        if (panelId === 'cde-explorer') {
          const activeDim =
            CDE_DIMENSIONS.find((d) => d.id === selectedDimensionId) || CDE_DIMENSIONS[0];
          return renderPanelFrame(
            'cde-explorer',
            'CDE Explorer',
            'CDE · DIMENSION → SUBDOMAIN → PROJECT',
            activeDim.colour,
            posClass,
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {CDE_DIMENSIONS.map((dim) => {
                  const isSel = dim.id === activeDim.id;
                  return (
                    <button
                      key={dim.id}
                      type="button"
                      data-cta-id={`cde-dim-${dim.id}`}
                      onClick={() => onSelectDimension(dim.id)}
                      className="min-h-[44px] p-2 rounded-xl border text-left transition-colors cursor-pointer"
                      style={{
                        backgroundColor: isSel ? 'rgba(20, 38, 50, 0.98)' : '#101D27',
                        borderColor: isSel ? dim.colour : 'rgba(255,255,255,0.22)',
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: dim.colour }}
                        />
                        <span className="font-display text-xs font-semibold text-[#F2F6F8] truncate">
                          {dim.label}
                        </span>
                      </div>
                      <div
                        dir="rtl"
                        lang="ar"
                        className="font-arabic text-[12px] text-[#BDCBD3] truncate mt-0.5"
                      >
                        {dim.labelAr}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="font-sans text-xs text-[#BDCBD3] leading-relaxed">
                {activeDim.description}
              </p>

              <div className="space-y-2.5">
                {activeDim.subdomains.map((sub) => {
                  const isSubSel = sub.id === selectedSubdomainId;
                  return (
                    <div
                      key={sub.id}
                      data-cta-id={`cde-sub-${sub.id}`}
                      onClick={() => onSelectSubdomain(sub.id)}
                      className="rounded-xl p-3 border bg-[#101D27]/90 cursor-pointer space-y-2"
                      style={{
                        borderColor: isSubSel ? activeDim.colour : 'rgba(255,255,255,0.22)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-semibold text-[#F2F6F8]">
                          {sub.name}
                        </span>
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: activeDim.colour }}
                        >
                          SUBDOMAIN
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.projectIds.map((pid) => {
                          const pObj = PROJECTS_DATA.find((p) => p.id === pid);
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectProject(pid);
                              }}
                              className="min-h-[36px] px-2.5 py-1 rounded-lg font-mono text-[11px] bg-[#142632] border border-white/30 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
                            >
                              {pObj ? pObj.name : pid} →
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        }

        // 8. NOJARA STUDIOS & 39 INTERACTIVE STORY JOURNEY (8 Chapters)
        if (panelId === 'story-journey') {
          const ch =
            STORY_CHAPTERS.find((c) => c.index === activeChapterIndex) || STORY_CHAPTERS[0];
          return renderPanelFrame(
            'story-journey',
            'NOJARA Studios & 39 — Story Journey',
            `CDE · CHAPTER 0${ch.index} OF 08`,
            ch.colour,
            posClass,
            <>
              <div className="flex items-center justify-between gap-2 px-1 py-1">
                <div className="flex items-center gap-1.5">
                  {STORY_CHAPTERS.map((step) => {
                    const active = step.index === ch.index;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        data-cta-id={`cde-ch-0${step.index}`}
                        onClick={() => onSelectChapter(step.index)}
                        aria-label={`Go to chapter ${step.index}`}
                        className="h-2.5 rounded-full transition-all cursor-pointer"
                        style={{
                          width: active ? '22px' : '9px',
                          backgroundColor: active ? ch.colour : 'rgba(255,255,255,0.28)',
                        }}
                      />
                    );
                  })}
                </div>
                <span className="font-mono text-xs text-[#F2F6F8]">0{ch.index} / 08</span>
              </div>

              <div
                className="rounded-xl p-3.5 border bg-[#101D27]/90 space-y-2.5"
                style={{ borderColor: ch.colour }}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#BDCBD3]">
                  {ch.kicker}
                </div>
                <h3 className="font-display text-sm md:text-base font-semibold text-[#F2F6F8]">
                  {ch.title}
                </h3>
                <p className="font-sans text-xs text-[#F2F6F8] leading-relaxed">
                  {ch.verifiedBody}
                </p>

                <div className="rounded-lg p-2.5 bg-[#142632] border border-white/20 space-y-1">
                  <div className="font-mono text-[10px] text-[#F2B66D]">
                    SCULPTURAL ARTIFACT · {ch.sculpturalAssetName}
                  </div>
                  <div className="font-sans text-xs italic text-[#F2F6F8]">
                    "{ch.companionSticker}"
                  </div>
                </div>

                {ch.sampleNote && (
                  <div className="font-mono text-[10px] text-[#BDCBD3] pt-1 border-t border-white/10">
                    Note: {ch.sampleNote}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectChapter(ch.index > 1 ? ch.index - 1 : 8)}
                  className="min-h-[44px] px-4 rounded-xl font-mono text-xs bg-[#101D27] border border-white/35 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
                >
                  ‹ Prev Chapter
                </button>
                <button
                  type="button"
                  onClick={() => onSelectChapter(ch.index < 8 ? ch.index + 1 : 1)}
                  className="min-h-[44px] px-4 rounded-xl font-mono text-xs bg-[#4C8DFF] text-[#101D27] font-semibold border border-white/40 cursor-pointer"
                >
                  Next Chapter ›
                </button>
              </div>
            </>
          );
        }

        // 9. REVIEWS PANEL (Clean label: "Reviews" instead of "H02 Checkpoints")
        if (panelId === 'decisions') {
          return renderPanelFrame(
            'decisions',
            'Reviews',
            'CHECKPOINT SIGN-OFF · APPROVE / REJECT / REQUEST REVISION',
            COLOUR_TOKENS.stationFiles,
            posClass,
            <>
              <div className="font-mono text-[11px] text-[#BDCBD3]">
                Decisions by 39 (Founder and Culture and Design Engineer) are saved to local server storage.
              </div>
              <div className="space-y-2.5">
                {checkpoints.map((chk) => {
                  const currentStatus = chk.status || chk.defaultStatus;
                  return (
                    <div
                      key={chk.id}
                      className="rounded-xl p-3 border border-white/20 bg-[#101D27]/90 space-y-2"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-[#4C8DFF] font-semibold">
                          [{chk.projectId}] {chk.id.toUpperCase()}
                        </span>
                        <span
                          style={{
                            color:
                              currentStatus === 'Approved'
                                ? COLOUR_TOKENS.healthOnTrack
                                : currentStatus === 'Rejected'
                                ? COLOUR_TOKENS.healthAtRisk
                                : COLOUR_TOKENS.textPrimary,
                          }}
                        >
                          {currentStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                        {chk.title}
                      </div>
                      <p className="font-sans text-[11px] text-[#BDCBD3]">{chk.summary}</p>
                      <div className="font-mono text-[10px] text-[#BDCBD3]">
                        Lead: {chk.agentOrPerson} ({chk.role}) · Ref: {chk.evidenceLocator}
                      </div>
                      <input
                        type="text"
                        value={checkpointFeedbackById[chk.id] ?? chk.feedbackNote ?? ''}
                        onChange={(e) =>
                          setCheckpointFeedbackById((prev) => ({
                            ...prev,
                            [chk.id]: e.target.value,
                          }))
                        }
                        placeholder={`Feedback note for ${chk.agentOrPerson}...`}
                        className="w-full min-h-[38px] px-2.5 py-1 rounded-lg bg-[#05090E] border border-white/20 font-sans text-[11px] text-[#F2F6F8] placeholder-[#BDCBD3]/50"
                      />
                      {chk.decisionReceiptId && (
                        <div className="font-mono text-[10px] text-[#9AFFE0] bg-[#142632] px-2 py-1 rounded border border-[#9AFFE0]/30">
                          Saved review: {chk.decisionReceiptId} · {chk.decidedAt?.slice(0, 19)}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          data-testid={`approve-${chk.id}`}
                          onClick={() => handleDecisionAction(chk, 'Approve')}
                          className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-[10px] bg-[#3DDC97] text-[#101D27] font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecisionAction(chk, 'Request Revision')}
                          className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-[10px] bg-[#F2B66D] text-[#101D27] font-semibold cursor-pointer"
                        >
                          Request Revision
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecisionAction(chk, 'Reject')}
                          className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-[10px] bg-[#142632] border border-white/30 text-[#F2F6F8] cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        }

        // 10. TEAM PANEL (Clean label: "Team" instead of "C2 Team Room")
        if (panelId === 'team-room') {
          const channels: TeamRoomChannelId[] = [
            'General',
            'Approvals',
            'Daily brief',
            'Cerebro build',
            'Media',
          ];
          const filteredMsgs = teamMessages.filter((m) => m.channel === activeChannel);

          return renderPanelFrame(
            'team-room',
            'Team',
            'TEAM CHANNELS & DISCUSSION',
            COLOUR_TOKENS.stationPeople,
            posClass,
            <>
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#101D27] border border-white/20">
                {channels.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setLocalChannel(ch);
                      onChangeTeamChannel?.(ch);
                      setChannelSumUp(null);
                    }}
                    className={`min-h-[36px] px-2.5 py-1 rounded-lg font-mono text-[10px] cursor-pointer ${
                      activeChannel === ch
                        ? 'bg-[#E6A2B4] text-[#101D27] font-semibold'
                        : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
                    }`}
                  >
                    #{ch}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#BDCBD3]">
                  CHANNEL: #{activeChannel.toUpperCase()} ({filteredMsgs.length} messages)
                </span>
                <button
                  type="button"
                  data-testid="team-room-sum-up"
                  onClick={() => {
                    const draftSummary = `[Summary · #${activeChannel}] ${filteredMsgs.length} updates reviewed. Active focus: ${selectedProjectId} deliverables & 39 review checkpoints.`;
                    setChannelSumUp(draftSummary);
                    updateTeamDraft(draftSummary);
                  }}
                  className="min-h-[36px] px-3 py-1 rounded-lg font-mono text-[10px] bg-[#4C8DFF] text-[#101D27] font-semibold cursor-pointer"
                >
                  Summarise channel
                </button>
              </div>

              {channelSumUp && (
                <div className="rounded-xl p-2.5 border border-[#9AFFE0]/50 bg-[#142632] font-sans text-xs text-[#9AFFE0]">
                  {channelSumUp}
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredMsgs.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl p-2.5 border border-white/15 bg-[#101D27]/90 space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-[#E6A2B4] font-semibold">{m.sender}</span>
                      <span className="text-[#BDCBD3]">{m.timestamp}</span>
                    </div>
                    <p className="font-sans text-xs text-[#F2F6F8]">{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendTeamMessage} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  data-testid="team-room-draft-input"
                  value={teamDraft}
                  onChange={(e) => updateTeamDraft(e.target.value)}
                  placeholder={`Message #${activeChannel}...`}
                  className="flex-1 min-h-[44px] px-3 py-1 rounded-xl bg-[#05090E] border border-white/25 font-sans text-xs text-[#F2F6F8]"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl font-mono text-xs bg-[#E6A2B4] text-[#101D27] font-semibold cursor-pointer"
                >
                  Post
                </button>
              </form>
            </>
          );
        }

        // 11. MEETING NOTES PANEL (Clean label: "Meeting notes" instead of "G4 Minutes")
        if (panelId === 'minutes') {
          const recipientCheck = validateRecipientInput(minutesRecipientInput);

          return renderPanelFrame(
            'minutes',
            'Meeting notes',
            'MEETING NOTES & EMAIL DRAFT PREPARATION',
            COLOUR_TOKENS.stationTasks,
            posClass,
            <>
              <div className="space-y-2">
                <label className="block font-mono text-[10px] text-[#BDCBD3]">
                  RECIPIENT ("39", "me", "self" resolve to me@nojara.com; unknown aliases are rejected):
                </label>
                <input
                  type="text"
                  data-testid="minutes-recipient-input"
                  value={minutesRecipientInput}
                  onChange={(e) => {
                    setMinutesRecipientInput(e.target.value);
                    setMinutesTwoTapArmed(false);
                    setMinutesError(null);
                  }}
                  className="w-full min-h-[44px] px-3 py-1 rounded-xl bg-[#05090E] border border-white/30 font-mono text-xs text-[#F2F6F8]"
                />
                {recipientCheck.valid ? (
                  <div className="font-mono text-[11px] text-[#3DDC97]">
                    Resolved Recipient: <strong>{recipientCheck.resolved}</strong>
                  </div>
                ) : (
                  <div
                    data-testid="minutes-recipient-error"
                    className="font-mono text-[11px]"
                    style={{ color: COLOUR_TOKENS.systemErrorRed }}
                  >
                    {recipientCheck.error}
                  </div>
                )}

                <label className="block font-mono text-[10px] text-[#BDCBD3] pt-1">SUBJECT:</label>
                <input
                  type="text"
                  value={minutesSubjectInput}
                  onChange={(e) => setMinutesSubjectInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-1 rounded-xl bg-[#05090E] border border-white/30 font-sans text-xs text-[#F2F6F8]"
                />

                <label className="block font-mono text-[10px] text-[#BDCBD3] pt-1">
                  MEETING NOTES SUMMARY:
                </label>
                <textarea
                  rows={3}
                  data-testid="minutes-summary-textarea"
                  value={minutesSummaryInput}
                  onChange={(e) => updateMinutesSummary(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#05090E] border border-white/30 font-sans text-xs text-[#F2F6F8]"
                />
              </div>

              {minutesError && (
                <div
                  className="rounded-xl p-2.5 border font-mono text-xs"
                  style={{
                    borderColor: COLOUR_TOKENS.systemErrorRed,
                    color: COLOUR_TOKENS.systemErrorRed,
                    backgroundColor: '#101D27',
                  }}
                >
                  {minutesError}
                </div>
              )}

              {!minutesTwoTapArmed ? (
                <button
                  type="button"
                  data-testid="minutes-step-1"
                  disabled={!recipientCheck.valid}
                  onClick={() => setMinutesTwoTapArmed(true)}
                  className="w-full min-h-[44px] rounded-xl font-mono text-xs font-semibold bg-[#B8F04A] text-[#101D27] cursor-pointer disabled:opacity-40"
                >
                  Prepare Draft for {recipientCheck.resolved || 'valid recipient'}
                </button>
              ) : (
                <div className="rounded-xl p-3 border border-[#B8F04A] bg-[#142632] space-y-2">
                  <div className="font-mono text-[11px] text-[#B8F04A]">
                    CONFIRM RECIPIENT · SAVE DRAFT FOR {recipientCheck.resolved?.toUpperCase()}?
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="minutes-step-2-confirm"
                      onClick={handleConfirmSendMinutes}
                      className="min-h-[44px] flex-1 py-2 rounded-lg font-mono text-xs font-semibold bg-[#3DDC97] text-[#101D27] cursor-pointer"
                    >
                      Confirm Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setMinutesTwoTapArmed(false)}
                      className="min-h-[44px] px-3 py-2 rounded-lg font-mono text-xs bg-[#101D27] border border-white/30 text-[#BDCBD3] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {minutesReceipt && (
                <div
                  data-testid="minutes-receipt"
                  className="rounded-xl p-3 border border-[#F2B66D] bg-[#101D27] font-mono text-[11px] text-[#F2F6F8] space-y-1"
                >
                  <div className="text-[#F2B66D] font-semibold">{minutesReceipt.statusMessage}</div>
                  <div>Recipient: {minutesReceipt.recipientResolved}</div>
                  <div className="text-[#BDCBD3]">
                    Saved locally ({minutesReceipt.id}) · {minutesReceipt.timestamp.slice(0, 19)}
                  </div>
                </div>
              )}
            </>
          );
        }

        // 12. TIMELINE PANEL (Clean label: "Timeline" instead of "H04 Timeline")
        if (panelId === 'timeline') {
          return renderPanelFrame(
            'timeline',
            'Timeline',
            'PROJECT MILESTONES & SCHEDULE',
            COLOUR_TOKENS.cobaltAccent,
            posClass,
            <div className="space-y-2.5">
              {TIMELINE_MILESTONES.map((ms) => {
                const barCol =
                  ms.health === 'On track'
                    ? COLOUR_TOKENS.healthOnTrack
                    : ms.health === 'At risk'
                    ? COLOUR_TOKENS.healthAtRisk
                    : COLOUR_TOKENS.healthBlocked;
                return (
                  <div
                    key={ms.id}
                    onClick={() => onSelectProject(ms.projectId)}
                    className="rounded-xl p-3 border border-white/20 bg-[#101D27]/90 cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-[#4C8DFF] font-semibold">
                        [{ms.projectId}] {ms.dateLabel}
                      </span>
                      <HealthIndicator health={ms.health} />
                    </div>
                    <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                      {ms.title}
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#05090E] overflow-hidden relative border border-white/15">
                      <div
                        className="h-full rounded-full"
                        style={{
                          marginLeft: `${ms.startPct}%`,
                          width: `${ms.widthPct}%`,
                          backgroundColor: barCol,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#BDCBD3]">
                      <span>Owner: {ms.owner}</span>
                      <span className="truncate max-w-[160px]">{ms.sourceRef}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // 13. INSIGHTS PANEL (Panel #5: "What needs you · 6 signals" with #FF5666 Blocked error red + Inspect Drawers)
        if (panelId === 'insights') {
          return renderPanelFrame(
            'insights',
            'What needs you · 6 signals',
            'PANEL #5 · INSIGHTS & BLOCKED SIGNALS (#FF5666)',
            COLOUR_TOKENS.stationFiles,
            posClass,
            <>
              <WireframesV11PanelContent {...sharedV11Props} panelId="insights" />
              {insightsStatus === 'TIMEOUT' ? (
                <div className="rounded-xl p-4 border border-[#F2B66D] bg-[#101D27] space-y-2 text-center">
                  <div className="font-mono text-xs text-[#F2B66D]">
                    OVERVIEW REFRESH TIMED OUT
                  </div>
                  <p className="font-sans text-xs text-[#BDCBD3]">
                    Cached snapshot active. Click Retry to reload portfolio metrics.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInsightsStatus('READY')}
                    className="min-h-[40px] px-4 py-1.5 rounded-lg font-mono text-xs bg-[#3DDC97] text-[#101D27] font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2 border-t border-white/15">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-3 border border-white/20 bg-[#101D27]">
                      <div className="font-mono text-[10px] text-[#BDCBD3]">REGISTER RECORDS</div>
                      <div className="font-display text-lg font-semibold text-[#3DDC97]">52</div>
                    </div>
                    <div className="rounded-xl p-3 border border-white/20 bg-[#101D27]">
                      <div className="font-mono text-[10px] text-[#BDCBD3]">PENDING REVIEWS</div>
                      <div className="font-display text-lg font-semibold text-[#F2B66D]">
                        {pendingDecisionCount}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 border border-white/20 bg-[#101D27] space-y-1.5 font-mono text-xs">
                    <div className="text-[#4C8DFF]">PORTFOLIO HEALTH BREAKDOWN</div>
                    <div className="text-[#3DDC97]">● On track: {onTrackCount} projects</div>
                    <div className="text-[#F2B66D]">▲ At risk: {atRiskCount} projects (YAH, MHE)</div>
                    <div className="text-[#FF5666]">⧠ Blocked: {blockedCount} project (BSOCIAL)</div>
                  </div>
                </div>
              )}
            </>
          );
        }

        // 14. SETTINGS PANEL (Panel #16: General · Camera · Hands)
        if (panelId === 'settings') {
          return renderPanelFrame(
            'settings',
            'Settings · General · Camera · Hands',
            'PANEL #16 · MOTION · SOUND · CAMERA SPLINE · 21-LANDMARK HAND RIG',
            COLOUR_TOKENS.cobaltAccent,
            posClass,
            <div className="space-y-3 font-mono text-xs">
              <WireframesV11PanelContent {...sharedV11Props} panelId="settings" />
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#101D27] border border-white/20">
                <span>Reduced Motion (Instant Camera Jumps)</span>
                <button
                  type="button"
                  onClick={onToggleReducedMotion}
                  className="min-h-[40px] px-3 py-1 rounded-lg bg-[#142632] border border-white/30 text-[#F2F6F8] cursor-pointer"
                >
                  {reducedMotion ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#101D27] border border-white/20">
                <span>Voice & Audio Output</span>
                <button
                  type="button"
                  onClick={onToggleSoundMuted}
                  className="min-h-[40px] px-3 py-1 rounded-lg bg-[#142632] border border-white/30 text-[#F2F6F8] cursor-pointer"
                >
                  {soundMuted ? 'MUTED' : 'ACTIVE'}
                </button>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#101D27] border border-white/20">
                <span>Interface Direction (EN / AR RTL)</span>
                <div className="flex items-center gap-1">
                  {(['en', 'ar'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => onToggleLanguageRtl?.(lang)}
                      className={`min-h-[40px] px-3 py-1 rounded-lg cursor-pointer ${
                        languageRtl === lang
                          ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                          : 'bg-[#142632] text-[#BDCBD3]'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101D27] border border-white/20 space-y-1.5">
                <div>Audience Privacy ("Anyone with you?")</div>
                <div className="flex flex-wrap gap-1">
                  {(['Owner only', 'Partner or assistant present', 'Public'] as const).map(
                    (lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => onChangeAudience?.(lvl)}
                        className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[10px] cursor-pointer ${
                          audienceLevel === lvl
                            ? 'bg-[#3DDC97] text-[#101D27] font-semibold'
                            : 'bg-[#142632] text-[#BDCBD3]'
                        }`}
                      >
                        {lvl}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        }

        // 15. DEVELOPMENT PANEL (Clean label: "Development" instead of "/build")
        if (panelId === 'build') {
          return renderPanelFrame(
            'build',
            'Development',
            'BUILD STATUS · VERIFIED vs LOCAL vs EXTERNAL',
            COLOUR_TOKENS.stationTasks,
            posClass,
            <div className="space-y-2.5">
              <div className="rounded-xl p-2.5 border border-white/15 bg-[#101D27] font-mono text-[10px] text-[#BDCBD3]">
                Cursor / external coding webhook: <strong className="text-[#F2B66D]">Not configured</strong> (development tasks are saved to the local workspace queue).
              </div>
              {BUILD_TRACKER_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  className="rounded-xl p-3 border border-white/20 bg-[#101D27]/90 space-y-1.5"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-[#B8F04A] font-semibold">{tier.tier}</span>
                    <span className="text-[#3DDC97]">{tier.status}</span>
                  </div>
                  <div className="font-display text-xs font-semibold text-[#F2F6F8]">
                    {tier.title}
                  </div>
                  <ul className="space-y-1 font-sans text-[11px] text-[#BDCBD3] list-disc pl-4">
                    {tier.items.map((it) => (
                      <li key={it.code}>
                        <span className="font-mono text-[#9AFFE0]">[{it.code}]</span> {it.name} —{' '}
                        <span
                          className="font-mono"
                          style={{
                            color:
                              it.status === 'VERIFIED'
                                ? COLOUR_TOKENS.healthOnTrack
                                : COLOUR_TOKENS.stationMedia,
                          }}
                        >
                          {it.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          );
        }

        // 16. DEVELOPER SOURCE & COLOUR AUDIT PANEL (Accessible from Developer View)
        if (panelId === 'phase0-audit') {
          return renderPanelFrame(
            'phase0-audit',
            'Source Map & Colour Audit',
            'DEVELOPER DIAGNOSTICS · BUILD 1.26.0',
            COLOUR_TOKENS.cobaltAccent,
            posClass,
            <>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#101D27] border border-white/25">
                {(
                  [
                    { id: 'source-map', label: 'Source Map' },
                    { id: 'colours', label: 'Colours' },
                    { id: 'missing', label: 'Missing' },
                    { id: 'page-state', label: 'Page State' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAuditTab(t.id)}
                    className={`min-h-[38px] flex-1 py-1.5 px-1.5 rounded-lg font-mono text-[10px] transition-colors cursor-pointer whitespace-nowrap ${
                      auditTab === t.id
                        ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                        : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {auditTab === 'source-map' && (
                <div className="space-y-2">
                  {SOURCE_MAP.map((s) => (
                    <div
                      key={s.code}
                      className="rounded-xl p-2.5 border border-white/20 bg-[#101D27]/90 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-[#4C8DFF] font-semibold">
                          [{s.code}] {s.fileName}
                        </span>
                        <span
                          style={{
                            color:
                              s.status === 'ATTACHED'
                                ? COLOUR_TOKENS.stationFiles
                                : COLOUR_TOKENS.stationMedia,
                          }}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="font-sans text-[11px] text-[#BDCBD3] leading-snug">
                        {s.usageInApp}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {auditTab === 'colours' && (
                <div className="space-y-1.5">
                  {COLOUR_TABLE.map((row) => (
                    <div
                      key={row.token}
                      className="rounded-lg p-2 border border-white/15 bg-[#101D27]/90 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-4 h-4 rounded border border-white/40 shrink-0"
                          style={{ backgroundColor: row.hex }}
                        />
                        <div className="min-w-0">
                          <div className="font-sans text-xs text-[#F2F6F8] truncate">
                            {row.entity}
                          </div>
                          <div className="font-mono text-[10px] text-[#BDCBD3] truncate">
                            {row.sourceFile}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[#F2F6F8] shrink-0">{row.hex}</span>
                    </div>
                  ))}
                </div>
              )}

              {auditTab === 'missing' && (
                <div className="space-y-2">
                  {MISSING_ITEMS.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl p-2.5 border border-[#F2B66D]/40 bg-[#101D27]/90 space-y-1"
                    >
                      <div className="font-mono text-[10px] text-[#F2B66D]">
                        {m.id} · UNATTACHED SOURCE ITEM
                      </div>
                      <div className="font-sans text-xs font-semibold text-[#F2F6F8]">
                        {m.item}
                      </div>
                      <p className="font-sans text-[11px] text-[#BDCBD3]">
                        Status: {m.currentFallbackInPhase0}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {auditTab === 'page-state' && (
                <pre className="rounded-xl p-3 bg-[#05090E] border border-white/20 font-mono text-[10px] text-[#9AFFE0] overflow-x-auto leading-relaxed">
                  {JSON.stringify(pageStateSnapshot, null, 2)}
                </pre>
              )}
            </>
          );
        }

        return null;
      })}
    </div>
  );
};
