/**
 * Blueprint v2.0 — dedicated views for screens that lacked first-class panels.
 * Uses real register/source data or explicit unavailable states. Never fabricates.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  PROJECTS_DATA,
  REGISTER_RECORDS,
  TIMELINE_MILESTONES,
  MISSING_ITEMS,
  MEDIA_ITEMS,
  PEOPLE_DATA,
} from '../data/sourceData';
import { COLOUR_TOKENS } from '../tokens/colours';
import {
  BLUEPRINT_SCREEN_BY_ID,
  type BlueprintScreenId,
} from './screenRegistry';
import { mediaRegistry } from '../media';

export interface BlueprintViewsProps {
  panelId: string;
  selectedProjectId?: string;
  onOpenPanel?: (panelId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="font-mono text-[11px] uppercase tracking-[0.14em] mb-2"
      style={{ color: COLOUR_TOKENS.textSecondary }}
    >
      {children}
    </h3>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        background: 'rgba(20, 38, 50, 0.72)',
        borderColor: 'rgba(180, 221, 255, 0.16)',
      }}
      role="status"
    >
      <div className="text-[15px] font-medium" style={{ color: COLOUR_TOKENS.textPrimary }}>
        {title}
      </div>
      <p className="text-[13px] mt-1" style={{ color: COLOUR_TOKENS.textSecondary }}>
        {detail}
      </p>
    </div>
  );
}

function Unavailable({ capability }: { capability: string }) {
  return (
    <EmptyState
      title="Source unavailable"
      detail={`${capability} is not connected or not authorized in this session. No sample data is shown as live.`}
    />
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[12.5px] py-1 border-b border-white/10">
      <span style={{ color: COLOUR_TOKENS.textSecondary }}>{label}</span>
      <span className="text-right font-mono" style={{ color: COLOUR_TOKENS.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

function TodayView() {
  const today = new Date();
  const cairoLabel = today.toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const deadlines = PROJECTS_DATA.filter((p) => p.health === 'Blocked' || p.health === 'At risk').slice(
    0,
    8
  );
  return (
    <div className="space-y-4">
      <SectionTitle>H03 · Today · Africa/Cairo</SectionTitle>
      <MetaRow label="Session date" value={cairoLabel} />
      <SectionTitle>Needs attention (register health)</SectionTitle>
      {deadlines.length === 0 ? (
        <EmptyState title="No flagged projects" detail="No At Risk / Blocked rows in local register." />
      ) : (
        <ul className="space-y-2">
          {deadlines.map((p) => (
            <li
              key={p.id}
              className="rounded-xl px-3 py-2 border min-h-[44px] flex items-center justify-between gap-2"
              style={{
                background: 'rgba(20, 38, 50, 0.72)',
                borderColor: 'rgba(180, 221, 255, 0.16)',
              }}
            >
              <span style={{ color: COLOUR_TOKENS.textPrimary }}>{p.name}</span>
              <span className="font-mono text-[11px]" style={{ color: COLOUR_TOKENS.stationMedia }}>
                {p.health}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Unavailable capability="Live Google Calendar agenda for Today" />
    </div>
  );
}

function BlockersView() {
  const blocked = PROJECTS_DATA.filter((p) => p.health === 'Blocked');
  const missing = MISSING_ITEMS.slice(0, 12);
  return (
    <div className="space-y-4">
      <SectionTitle>H05 · Blockers and risks</SectionTitle>
      <MetaRow label="Blocked projects" value={`${blocked.length}/${PROJECTS_DATA.length}`} />
      {blocked.map((p) => (
        <div
          key={p.id}
          className="rounded-xl p-3 border"
          style={{ background: 'rgba(20, 38, 50, 0.72)', borderColor: COLOUR_TOKENS.systemErrorRed }}
        >
          <div style={{ color: COLOUR_TOKENS.textPrimary }}>{p.name}</div>
          <div className="font-mono text-[11px] mt-1" style={{ color: COLOUR_TOKENS.textSecondary }}>
            id={p.id} · health=Blocked · source=PROJECTS_DATA
          </div>
        </div>
      ))}
      <SectionTitle>Known missing / unverified items</SectionTitle>
      {missing.length === 0 ? (
        <EmptyState title="No missing-item rows" detail="MISSING_ITEMS is empty." />
      ) : (
        <ul className="space-y-1">
          {missing.map((m) => (
            <li key={m.id} className="text-[13px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
              · {m.id}: {m.item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityView() {
  const rows = TIMELINE_MILESTONES.slice(0, 16);
  return (
    <div className="space-y-4">
      <SectionTitle>H07 · Activity</SectionTitle>
      <p className="text-[13px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
        Showing authentic timeline milestones only. No fabricated teammate presence or read receipts.
      </p>
      {rows.length === 0 ? (
        <EmptyState title="No activity rows" detail="TIMELINE_MILESTONES has no entries." />
      ) : (
        <ol className="space-y-2">
          {rows.map((m) => (
            <li
              key={m.id}
              className="rounded-xl px-3 py-2 border"
              style={{
                background: 'rgba(20, 38, 50, 0.72)',
                borderColor: 'rgba(180, 221, 255, 0.16)',
              }}
            >
              <div style={{ color: COLOUR_TOKENS.textPrimary }}>{m.title}</div>
              <div className="font-mono text-[11px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
                {m.dateLabel || 'date unknown'} · {m.projectId || 'unscoped'}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ProjectEditView({ selectedProjectId }: { selectedProjectId?: string }) {
  const project = PROJECTS_DATA.find((p) => p.id === selectedProjectId) || PROJECTS_DATA[0];
  const [title, setTitle] = useState(project?.name || '');
  const [receipt, setReceipt] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <SectionTitle>L5 · Create and edit</SectionTitle>
      <p className="text-[13px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
        Local draft only. Remote Project Register writes are not authorized from this surface.
      </p>
      <label className="block text-[13px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
        Title
        <input
          className="mt-1 w-full min-h-[44px] rounded-xl px-3 border bg-transparent"
          style={{
            color: COLOUR_TOKENS.textPrimary,
            borderColor: 'rgba(180, 221, 255, 0.24)',
            background: COLOUR_TOKENS.glassSolid,
          }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="min-h-[44px] px-4 rounded-xl font-medium"
        style={{ background: COLOUR_TOKENS.cobaltAccent, color: COLOUR_TOKENS.canvas }}
        onClick={() =>
          setReceipt(
            `draft-saved:${project?.id || 'new'}:${Date.now()} (local only — not written to Drive/Supabase)`
          )
        }
      >
        Save local draft
      </button>
      {receipt && (
        <div className="font-mono text-[11px]" style={{ color: COLOUR_TOKENS.trackingValid }}>
          Receipt · {receipt}
        </div>
      )}
    </div>
  );
}

function ArchiveView() {
  const archived = REGISTER_RECORDS.filter((r) =>
    /archive|inactive|hold|closed/i.test(`${r.reviewStatus} ${r.workStatus} ${r.summary}`)
  );
  return (
    <div className="space-y-4">
      <SectionTitle>L6 · Archive and restore</SectionTitle>
      {archived.length === 0 ? (
        <EmptyState
          title="No archived rows in local register snapshot"
          detail="Restore/archive remote actions are unavailable without authorized write channels."
        />
      ) : (
        archived.map((r, i) => (
          <div key={i} className="rounded-xl p-3 border" style={{ borderColor: 'rgba(180,221,255,0.16)' }}>
            <pre className="text-[11px] whitespace-pre-wrap" style={{ color: COLOUR_TOKENS.textSecondary }}>
              {JSON.stringify(r, null, 2)}
            </pre>
          </div>
        ))
      )}
      <Unavailable capability="Archive / restore mutation API" />
    </div>
  );
}

function VoiceResultView() {
  return (
    <div className="space-y-4">
      <SectionTitle>V3 / PM3 · Visible action & evidence</SectionTitle>
      <EmptyState
        title="No action receipt in this session yet"
        detail="When a validated tool run finishes, the receipt (target, operation, result, evidence) appears here. Stopping speech does not cancel a remote write."
      />
      <MetaRow label="Action state machine" value="requested → validating → awaiting_input → running → applied|failed|cancelled|outcome_unknown" />
    </div>
  );
}

function YoutubeView() {
  const [playing, setPlaying] = useState(false);
  // No invented video IDs — explicit unavailable unless a register item supplies one.
  const yt = MEDIA_ITEMS.find((m) => /youtube|youtu\.be/i.test(`${m.url || ''} ${m.title}`));
  if (!yt?.url) {
    return (
      <div className="space-y-4">
        <SectionTitle>G3 · YouTube</SectionTitle>
        <Unavailable capability="Project-linked YouTube source URL in MEDIA_ITEMS" />
      </div>
    );
  }
  const embed = yt.url.includes('embed')
    ? yt.url
    : yt.url.replace('watch?v=', 'embed/');
  return (
    <div className="space-y-3">
      <SectionTitle>G3 · YouTube</SectionTitle>
      <MetaRow label="Source" value={yt.url} />
      <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/15">
        {playing ? (
          <iframe
            title={yt.title}
            src={`${embed}?autoplay=0`}
            className="w-full h-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="w-full h-full min-h-[180px] flex items-center justify-center"
            style={{ background: COLOUR_TOKENS.glassSolid, color: COLOUR_TOKENS.textPrimary }}
            onClick={() => setPlaying(true)}
          >
            Play (sound not guaranteed)
          </button>
        )}
      </div>
    </div>
  );
}

function StatusWordsView() {
  const words = [
    ['Planned', COLOUR_TOKENS.stationFiles],
    ['Running', COLOUR_TOKENS.focusRing],
    ['Implemented', COLOUR_TOKENS.cobaltAccent],
    ['Verified', COLOUR_TOKENS.trackingValid],
    ['Awaiting', COLOUR_TOKENS.stationMedia],
    ['Blocked', COLOUR_TOKENS.systemErrorRed],
    ['Held', COLOUR_TOKENS.stationTasks],
    ['Unknown', COLOUR_TOKENS.textSecondary],
  ] as const;
  return (
    <div className="space-y-4">
      <SectionTitle>S2 · Status words</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {words.map(([label, color]) => (
          <div
            key={label}
            className="rounded-xl px-3 py-3 min-h-[44px] border flex items-center gap-2"
            style={{ borderColor: 'rgba(180,221,255,0.16)', background: 'rgba(20,38,50,0.72)' }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span style={{ color: COLOUR_TOKENS.textPrimary }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WidgetsView({ catalogue }: { catalogue?: boolean }) {
  const widgets = [
    { id: 'health', title: 'Project health', available: true },
    { id: 'today', title: 'Today', available: true },
    { id: 'voice-receipt', title: 'Action receipt', available: true },
    { id: 'mail', title: 'Mail unread', available: false },
  ];
  return (
    <div className="space-y-4">
      <SectionTitle>{catalogue ? 'W2 · Widget catalogue' : 'W1 · Widget grid'}</SectionTitle>
      <ul className="space-y-2">
        {widgets.map((w) => (
          <li
            key={w.id}
            className="rounded-xl px-3 py-3 border flex justify-between min-h-[44px] items-center"
            style={{ borderColor: 'rgba(180,221,255,0.16)', background: 'rgba(20,38,50,0.72)' }}
          >
            <span style={{ color: COLOUR_TOKENS.textPrimary }}>{w.title}</span>
            <span className="font-mono text-[11px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
              {w.available ? 'available' : 'unavailable'}
            </span>
          </li>
        ))}
      </ul>
      {!catalogue && (
        <EmptyState
          title="Editing not persisted remotely"
          detail="Grid layout changes stay local until an authorized preference store exists."
        />
      )}
    </div>
  );
}

function PlanningView() {
  return (
    <div className="space-y-4">
      <SectionTitle>X3 · Planning workspace</SectionTitle>
      <MetaRow label="Milestones in source" value={String(TIMELINE_MILESTONES.length)} />
      <MetaRow label="Register records" value={String(REGISTER_RECORDS.length)} />
      <Unavailable capability="Collaborative planning write-back" />
    </div>
  );
}

function CrewRuntimeView() {
  return (
    <div className="space-y-4">
      <SectionTitle>X4 · Crew runtime</SectionTitle>
      <EmptyState
        title="Runtime evidence only"
        detail="Agent online/typing states are not fabricated. Connect a verified runtime feed to populate this panel."
      />
      <MetaRow label="People rows (local)" value={String(PEOPLE_DATA.length)} />
    </div>
  );
}

function PdfViewerView() {
  return (
    <div className="space-y-4">
      <SectionTitle>X5 · PDF viewer</SectionTitle>
      <EmptyState
        title="Select a PDF from Files"
        detail="Open Files → choose a PDF with a verified source URI. Drive /view links are not treated as streams."
      />
    </div>
  );
}

function ImageViewerView() {
  const cached = mediaRegistry.getHotspot26Assets('image').filter((a) => a.localCacheUrl).slice(0, 6);
  return (
    <div className="space-y-4">
      <SectionTitle>X6 · Image viewer</SectionTitle>
      {cached.length === 0 ? (
        <EmptyState title="No local image cache" detail="Hotspot_26 local textures not present." />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {cached.map((a) => (
            <figure key={a.id} className="rounded-xl overflow-hidden border border-white/15">
              <img
                src={a.localCacheUrl || undefined}
                alt={a.title}
                className="w-full h-28 object-cover"
              />
              <figcaption className="p-2 text-[11px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
                {a.title}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function AudioPlayerView() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);
  const src = MEDIA_ITEMS.find((m) => /audio|\.mp3|\.wav/i.test(`${m.type} ${m.title} ${m.url || ''}`))
    ?.url;
  return (
    <div className="space-y-4">
      <SectionTitle>X7 · Audio player</SectionTitle>
      {!src ? (
        <Unavailable capability="Audio source URI in MEDIA_ITEMS" />
      ) : (
        <>
          <audio
            ref={audioRef}
            controls
            src={src}
            className="w-full"
            onError={() => setError('Playback blocked or source unreachable')}
          />
          {error && <p style={{ color: COLOUR_TOKENS.systemErrorRed }}>{error}</p>}
        </>
      )}
    </div>
  );
}

function CalledInView() {
  return (
    <div className="space-y-4">
      <SectionTitle>J2 · Called-in card stack</SectionTitle>
      <EmptyState
        title="Stack empty"
        detail="Called-in cards appear when Cerebro or a validated tool surfaces an interrupt requiring Owner 39 attention."
      />
    </div>
  );
}

function BackgroundChooserView() {
  const [tier, setTier] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  return (
    <div className="space-y-4">
      <SectionTitle>J4 · Background chooser</SectionTitle>
      <p className="text-[13px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
        Quality tiers only — does not invent HDR plates.
      </p>
      {(['mobile', 'tablet', 'desktop'] as const).map((t) => (
        <button
          key={t}
          type="button"
          className="w-full min-h-[44px] rounded-xl border px-3 text-left"
          style={{
            borderColor: tier === t ? COLOUR_TOKENS.focusRing : 'rgba(180,221,255,0.16)',
            background: 'rgba(20,38,50,0.72)',
            color: COLOUR_TOKENS.textPrimary,
          }}
          onClick={() => setTier(t)}
        >
          {t} particle / mesh tier
        </button>
      ))}
    </div>
  );
}

function UploadView() {
  return (
    <div className="space-y-4">
      <SectionTitle>J5 · Upload and classification</SectionTitle>
      <Unavailable capability="Authorized Drive upload / classify write channel" />
      <p className="text-[13px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
        Hotspot_26 remains a read-only test fixture. No invented Drive URLs.
      </p>
    </div>
  );
}

function ChartsView() {
  const total = PROJECTS_DATA.length || 1;
  const counts = {
    OnTrack: PROJECTS_DATA.filter((p) => p.health === 'On track').length,
    AtRisk: PROJECTS_DATA.filter((p) => p.health === 'At risk').length,
    Blocked: PROJECTS_DATA.filter((p) => p.health === 'Blocked').length,
  };
  return (
    <div className="space-y-4">
      <SectionTitle>S3 · Charts and numbers</SectionTitle>
      <MetaRow label="Portfolio n" value={String(PROJECTS_DATA.length)} />
      {(
        [
          ['On Track', counts.OnTrack, COLOUR_TOKENS.trackingValid],
          ['At Risk', counts.AtRisk, COLOUR_TOKENS.stationMedia],
          ['Blocked', counts.Blocked, COLOUR_TOKENS.systemErrorRed],
        ] as const
      ).map(([label, n, color]) => (
        <div key={label}>
          <div className="flex justify-between text-[12px] mb-1">
            <span style={{ color: COLOUR_TOKENS.textSecondary }}>{label}</span>
            <span className="font-mono" style={{ color: COLOUR_TOKENS.textPrimary }}>
              {n}/{PROJECTS_DATA.length}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full"
              style={{ width: `${(n / total) * 100}%`, background: color }}
              role="img"
              aria-label={`${label} ${n} of ${PROJECTS_DATA.length}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskDetailBridge({ onOpenPanel }: { onOpenPanel?: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>L4 · Task detail</SectionTitle>
      <p className="text-[13px]" style={{ color: COLOUR_TOKENS.textSecondary }}>
        Task Inspector remains the detailed editor. Open Tasks board to select a row.
      </p>
      <button
        type="button"
        className="min-h-[44px] px-4 rounded-xl"
        style={{ background: COLOUR_TOKENS.cobaltAccent, color: COLOUR_TOKENS.canvas }}
        onClick={() => onOpenPanel?.('tasks')}
      >
        Open task board
      </button>
    </div>
  );
}

function CrewWorkspacesView({ onOpenPanel }: { onOpenPanel?: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <SectionTitle>X2 · Crew workspaces</SectionTitle>
      <button type="button" className="w-full min-h-[44px] rounded-xl border px-3 text-left" style={{ borderColor: 'rgba(180,221,255,0.16)', color: COLOUR_TOKENS.textPrimary }} onClick={() => onOpenPanel?.('baghira')}>Baghira planning surface</button>
      <button type="button" className="w-full min-h-[44px] rounded-xl border px-3 text-left" style={{ borderColor: 'rgba(180,221,255,0.16)', color: COLOUR_TOKENS.textPrimary }} onClick={() => onOpenPanel?.('kinzo')}>Kinzo roster surface</button>
      <p className="text-[12px]" style={{ color: COLOUR_TOKENS.textSecondary }}>Supporting members are text-only. Cerebro remains the sole speaking assistant.</p>
    </div>
  );
}

const PANEL_TO_SCREEN: Record<string, BlueprintScreenId> = {
  today: 'H03',
  blockers: 'H05',
  activity: 'H07',
  'project-edit': 'L5',
  archive: 'L6',
  'voice-result': 'V3',
  youtube: 'G3',
  'status-words': 'S2',
  charts: 'S3',
  widgets: 'W1',
  'widget-catalogue': 'W2',
  planning: 'X3',
  'crew-runtime': 'X4',
  'pdf-viewer': 'X5',
  'image-viewer': 'X6',
  'audio-player': 'X7',
  'called-in': 'J2',
  background: 'J4',
  upload: 'J5',
  'task-detail': 'L4',
  'crew-workspaces': 'X2',
};

export function isBlueprintOwnedPanel(panelId: string): boolean {
  return panelId in PANEL_TO_SCREEN;
}

export function BlueprintViews({ panelId, selectedProjectId, onOpenPanel }: BlueprintViewsProps) {
  const screenId = PANEL_TO_SCREEN[panelId];
  const spec = screenId ? BLUEPRINT_SCREEN_BY_ID[screenId] : null;
  const body = useMemo(() => {
    switch (panelId) {
      case 'today':
        return <TodayView />;
      case 'blockers':
        return <BlockersView />;
      case 'activity':
        return <ActivityView />;
      case 'project-edit':
        return <ProjectEditView selectedProjectId={selectedProjectId} />;
      case 'archive':
        return <ArchiveView />;
      case 'voice-result':
        return <VoiceResultView />;
      case 'youtube':
        return <YoutubeView />;
      case 'status-words':
        return <StatusWordsView />;
      case 'charts':
        return <ChartsView />;
      case 'widgets':
        return <WidgetsView />;
      case 'widget-catalogue':
        return <WidgetsView catalogue />;
      case 'planning':
        return <PlanningView />;
      case 'crew-runtime':
        return <CrewRuntimeView />;
      case 'pdf-viewer':
        return <PdfViewerView />;
      case 'image-viewer':
        return <ImageViewerView />;
      case 'audio-player':
        return <AudioPlayerView />;
      case 'called-in':
        return <CalledInView />;
      case 'background':
        return <BackgroundChooserView />;
      case 'upload':
        return <UploadView />;
      case 'task-detail':
        return <TaskDetailBridge onOpenPanel={onOpenPanel} />;
      case 'crew-workspaces':
        return <CrewWorkspacesView onOpenPanel={onOpenPanel} />;
      default:
        return (
          <EmptyState
            title="Unknown blueprint panel"
            detail={`No view registered for panelId=${panelId}`}
          />
        );
    }
  }, [panelId, selectedProjectId, onOpenPanel]);

  return (
    <div data-blueprint-screen={screenId || 'unknown'} className="space-y-3">
      {spec && (
        <div
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
          style={{ color: COLOUR_TOKENS.sphereWireframe }}
        >
          Blueprint {spec.id} · {spec.status} · core:{spec.coreState}
        </div>
      )}
      {body}
    </div>
  );
}
