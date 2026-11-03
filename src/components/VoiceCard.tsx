import React, { useEffect, useRef, useState } from 'react';
import { COLOUR_TOKENS } from '../tokens/colours';
import { AudienceLevel } from './PanelsOverlay';
import { ComputedGuiLayout } from '../gui/layoutEngine';
import { GUI_GLASS_TOKENS, GUI_Z_LAYERS } from '../gui/guiTokens';

export type VoiceState =
  | 'Ready'
  | 'Connecting'
  | 'Listening'
  | 'Thinking'
  | 'Speaking'
  | 'Muted'
  | 'Reconnecting'
  | 'Disconnected'
  | 'Error'
  | 'Idle';

/** Hands tracking + text Chat only — conversational voice / Call pocket removed. */
export type VoicePocket = 'hands' | 'compose';
export type WidgetSnapEdge = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-right';

export interface TranscriptLine {
  id: string;
  speaker: '39' | 'Cerebro';
  text: string;
  timestamp: string;
  toolResult?: string;
}

export interface PendingComposeTask {
  summary: string;
  projectCode: string;
  attachmentName?: string;
}

export interface LiveFeedReceiptItem {
  id: string;
  sender: string;
  text: string;
  channel: string;
  timestamp: string;
  status: 'SAVED' | 'FAILED';
}

export interface UploadedAttachmentInfo {
  id: string;
  fileName: string;
  sizeBytes: number;
  sha256: string;
}

interface VoiceCardProps {
  voiceState: VoiceState;
  activePocket: VoicePocket;
  handsActive: boolean;
  tourState: {
    active: boolean;
    paused: boolean;
    step: number;
    total: number;
    secondsLeft: number;
    autoAdvance?: boolean;
  };
  audienceLevel: AudienceLevel;
  selectedProjectId?: string;
  transcripts: TranscriptLine[];
  liveCaption: string | null;
  pendingTaskProposal: PendingComposeTask | null;
  externalSnapEdge?: WidgetSnapEdge;
  openAgentModalTrigger?: number;
  onChangePocket: (pocket: VoicePocket) => void;
  onToggleHands: () => void;
  onSimulateCommand: (rawInput: string) => void;
  onExecuteToolCall?: (
    toolName: string,
    parameters: Record<string, unknown>
  ) => Promise<string> | string;
  onSendCompose: (text: string, attachmentName?: string, receiptId?: string) => void;
  onCreateDirectTask?: (title: string, projectCode: string, attachmentName?: string) => void;
  onConfirmMakeTask: (confirm: boolean) => void;
  onChangeAudience: (level: AudienceLevel) => void;
  onOpenFullDownloadModal?: () => void;
  onNextTourStop?: () => void;
  onPrevTourStop?: () => void;
  onStopTour?: () => void;
  onAudioLevel?: (rms: number) => void;
  guiLayout?: ComputedGuiLayout;
  onVoiceDragDeltaChange?: (delta: { x: number; y: number }) => void;
  onVoiceExpandedChange?: (expanded: boolean) => void;
  contextualUpdateJson?: string;
}

const STORAGE_KEY_POS = 'cerebro_voice_card_pos_v2';
const STORAGE_KEY_SIZE = 'cerebro_voice_card_size_v2';

const QUICK_WORKSPACE_COMMANDS = [
  { label: 'Overview', cmd: 'open_dashboard(collapsed)' },
  { label: 'Showreel', cmd: 'open_showreel()' },
  { label: 'Next Reel ›', cmd: 'carousel_control(next)' },
  { label: '‹ Prev Reel', cmd: 'carousel_control(prev)' },
  { label: 'Switch to CDE', cmd: 'switch_sphere(cde)' },
  { label: 'Switch to HQ', cmd: 'switch_sphere(hq)' },
  { label: 'Projects', cmd: 'open_station(projects)' },
  { label: 'Open SEVEN', cmd: 'focus_project(SEVEN)' },
  { label: 'Open El Batron Project', cmd: 'open El Batron project' },
  { label: 'SEVEN RACI', cmd: 'get_raci(SEVEN)' },
  { label: 'Reviews', cmd: 'open_panel(decisions)' },
  { label: 'Team', cmd: 'open_panel(team-room)' },
  { label: 'Meeting notes', cmd: 'open_panel(minutes)' },
  { label: 'Timeline', cmd: 'open_panel(timeline)' },
  { label: 'Settings', cmd: 'open_panel(settings)' },
  { label: 'Development', cmd: 'open_panel(build)' },
  { label: 'Search Tabuk Files', cmd: 'search_files(Tabuk)' },
  { label: 'Media', cmd: 'open_station(media)' },
  { label: 'Story Journey', cmd: 'open_chapter(1)' },
  { label: 'Take 18-Screen Tour', cmd: 'start_tour(full-18-screen)' },
  { label: 'Tour HQ Ops', cmd: 'tour HQ' },
  { label: 'Tour CDE Bio', cmd: 'tour CDE' },
  { label: 'Executive Tour', cmd: 'executive tour' },
  { label: 'Pan Right', cmd: 'camera(pan)' },
  { label: 'Stop Camera', cmd: 'camera(stop)' },
  { label: 'Center Camera', cmd: 'camera(center)' },
  { label: 'Briefing', cmd: 'get_briefing()' },
  { label: 'Spawn Domain', cmd: 'create_domain(Riyadh AI Lab)' },
  { label: '3D Media Tube', cmd: 'project.open_tube' },
  { label: 'Amber Shader', cmd: 'update_domain_material(hq, amber-crystal)' },
  { label: 'Gmail Sync', cmd: 'workspace_sync(gmail)' },
  { label: 'هات المشاريع', cmd: 'هات المشاريع' },
  { label: 'قفل البانل', cmd: 'قفل البانل' },
];

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voiceState,
  activePocket,
  handsActive,
  tourState,
  audienceLevel,
  selectedProjectId = 'SEVEN',
  transcripts,
  liveCaption,
  pendingTaskProposal,
  externalSnapEdge,
  openAgentModalTrigger,
  onChangePocket,
  onToggleHands,
  onSimulateCommand,
  onExecuteToolCall,
  onSendCompose,
  onCreateDirectTask,
  onConfirmMakeTask,
  onChangeAudience,
  onNextTourStop,
  onPrevTourStop,
  onStopTour,
  onAudioLevel,
  guiLayout,
  onVoiceDragDeltaChange,
  onVoiceExpandedChange,
  contextualUpdateJson,
}) => {
  void onAudioLevel;
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SIZE) === 'expanded';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    onVoiceExpandedChange?.(isExpanded);
  }, [isExpanded, onVoiceExpandedChange]);

  const [snapEdge, setSnapEdge] = useState<WidgetSnapEdge>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved === 'bottom-left' || saved === 'bottom-right' || saved === 'top-right') return saved;
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1220) {
      return 'bottom-right';
    }
    return 'bottom-center';
  });

  useEffect(() => {
    if (externalSnapEdge) {
      setSnapEdge(externalSnapEdge);
    }
  }, [externalSnapEdge]);

  const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [simInput, setSimInput] = useState('');
  const [composeText, setComposeText] = useState('');
  const [uploadedAttachment, setUploadedAttachment] = useState<UploadedAttachmentInfo | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [liveFeedReceipts, setLiveFeedReceipts] = useState<LiveFeedReceiptItem[]>(() => {
    try {
      const saved = localStorage.getItem('cerebro_live_feed_receipts_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [failedComposeNotice, setFailedComposeNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (liveFeedReceipts.length > 0) {
        localStorage.setItem(
          'cerebro_live_feed_receipts_v1',
          JSON.stringify(liveFeedReceipts.slice(-30))
        );
      }
    } catch {}
  }, [liveFeedReceipts]);

  // Conversational voice / Call / ElevenLabs mic loops removed — text Chat + Hands only.
  void openAgentModalTrigger;
  void contextualUpdateJson;
  void voiceState;

  useEffect(() => {
    fetch('/api/messages/feed')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.feed) && data.feed.length > 0) {
          setLiveFeedReceipts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            for (const f of data.feed) {
              if (!existingIds.has(f.id)) {
                merged.push({
                  id: f.id,
                  sender: f.sender,
                  text: f.text,
                  channel: f.channel || 'General',
                  timestamp: String(f.timestamp).slice(11, 19),
                  status: 'SAVED',
                });
              }
            }
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleInstantStop = () => {
    if (tourState.active) {
      onStopTour?.();
      onSimulateCommand('stop tour');
    }
    onSimulateCommand('camera(stop)');
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIZE, isExpanded ? 'expanded' : 'compact');
    } catch {}
  }, [isExpanded]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POS, snapEdge);
    } catch {}
  }, [snapEdge]);

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDraggingRef.current) return;
    const nextDelta = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };
    setDragDelta(nextDelta);
    onVoiceDragDeltaChange?.(nextDelta);
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rx = e.clientX;
    const ry = e.clientY;

    if (ry < vh * 0.35 && rx > vw * 0.5) {
      setSnapEdge('top-right');
    } else if (rx < vw * 0.33) {
      setSnapEdge('bottom-left');
    } else if (rx > vw * 0.67) {
      setSnapEdge('bottom-right');
    } else {
      setSnapEdge('bottom-center');
    }
    setDragDelta({ x: 0, y: 0 });
    onVoiceDragDeltaChange?.({ x: 0, y: 0 });
  };

  const snapClasses: Record<WidgetSnapEdge, string> = {
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-right': 'top-20 right-4',
  };

  // Real binary file upload via POST /api/uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultStr = String(reader.result || '');
        const res = await fetch('/api/uploads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Cerebro-Audience': audienceLevel,
          },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data: resultStr,
            projectCode: selectedProjectId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.attachment) {
          throw new Error(data?.message || data?.error || 'Upload failed');
        }
        setUploadedAttachment({
          id: data.attachment.id,
          fileName: data.attachment.fileName,
          sizeBytes: data.attachment.sizeBytes,
          sha256: data.attachment.sha256,
        });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'File upload failed');
      } finally {
        setUploadingFile(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Could not read selected file');
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  // Action 1: Save a note (POST /api/notes) — preserves draft on failure
  const handleSaveNote = async () => {
    const textVal = composeText.trim() || (uploadedAttachment ? `Attached ${uploadedAttachment.fileName}` : '');
    if (!textVal) return;
    setFailedComposeNotice(null);

    const idemKey = `note-${Date.now()}`;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cerebro-Audience': audienceLevel,
          'Idempotency-Key': idemKey,
        },
        body: JSON.stringify({
          text: textVal,
          projectCode: selectedProjectId,
          attachmentId: uploadedAttachment?.id,
          attachmentName: uploadedAttachment?.fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.note?.id) {
        throw new Error(data?.message || data?.error || 'Failed to save note');
      }
      const receiptId = data.note.id;
      const attachName = uploadedAttachment?.fileName;
      setComposeText('');
      setUploadedAttachment(null);
      setLiveFeedReceipts((prev) => [
        ...prev,
        {
          id: receiptId,
          sender: '39 (Tarek Nojara)',
          text: textVal,
          channel: 'Notes',
          timestamp: new Date().toTimeString().slice(0, 8),
          status: 'SAVED',
        },
      ]);
      onSendCompose(textVal, attachName, receiptId);
    } catch (err) {
      // Preserve unsent composeText in textarea!
      setFailedComposeNotice(
        err instanceof Error ? `${err.message} — draft preserved` : 'Save failed — draft preserved'
      );
    }
  };

  // Action 2: Create a task directly (POST /api/tasks) — preserves draft on failure
  const handleCreateTaskDirect = async () => {
    const textVal = composeText.trim() || (uploadedAttachment ? `Review ${uploadedAttachment.fileName}` : '');
    if (!textVal) return;
    setFailedComposeNotice(null);

    const idemKey = `task-${Date.now()}`;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cerebro-Audience': audienceLevel,
          'Idempotency-Key': idemKey,
        },
        body: JSON.stringify({
          title: textVal,
          projectCode: selectedProjectId,
          attachmentId: uploadedAttachment?.id,
          attachmentName: uploadedAttachment?.fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.task?.id) {
        throw new Error(data?.message || data?.error || 'Failed to create task');
      }
      const attachName = uploadedAttachment?.fileName;
      setComposeText('');
      setUploadedAttachment(null);
      onCreateDirectTask?.(textVal, selectedProjectId, attachName);
    } catch (err) {
      setFailedComposeNotice(
        err instanceof Error ? `${err.message} — draft preserved` : 'Task creation failed — draft preserved'
      );
    }
  };

  // Action 3: Chat with Cerebro
  const handleChatWithCerebro = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = composeText.trim();
    if (!raw) return;
    setComposeText('');
    onSimulateCommand(raw);
  };

  const handleSimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim()) return;
    const raw = simInput.trim();
    setSimInput('');
    onSimulateCommand(raw);
  };

  const displayedVoiceStatus = 'Chat';

  return (
    <>
      {/* Live Captions Overlay (180 ms fade) — rides under voice dock */}
      <div
        className={`fixed bottom-28 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-[180ms] max-w-lg w-[92vw] text-center ${
          liveCaption ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ zIndex: GUI_Z_LAYERS.executiveBar }}
      >
        {liveCaption && (
          <div
            className="px-4 py-2 rounded-xl border font-sans text-xs md:text-sm text-[#F2F6F8] inline-block"
            style={{
              backgroundColor: 'rgba(16, 29, 39, 0.92)',
              borderColor: 'rgba(255, 255, 255, 0.32)',
            }}
          >
            {liveCaption}
          </div>
        )}
      </div>

      {/* Draggable, Collision-Managed, Resizable Voice Dock (Panel #10 · z-40 voiceDock / z-70 Stop) */}
      <div
        data-testid="voice-card"
        data-snap-edge={snapEdge}
        data-tour-active={tourState.active ? 'true' : 'false'}
        data-compacted={guiLayout?.voiceCompactedForSheet ? 'true' : 'false'}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          left: guiLayout ? `${guiLayout.voiceRect.x}px` : undefined,
          top: guiLayout ? `${guiLayout.voiceRect.y}px` : undefined,
          width: guiLayout ? `${guiLayout.voiceRect.w}px` : undefined,
          minHeight: guiLayout?.voiceCompactedForSheet ? '52px' : undefined,
          transform:
            !guiLayout && (dragDelta.x !== 0 || dragDelta.y !== 0)
              ? `translate(${dragDelta.x}px, ${dragDelta.y}px)`
              : undefined,
          borderRadius: `${GUI_GLASS_TOKENS.radiusPx}px`,
          zIndex: GUI_Z_LAYERS.voiceDock,
        }}
        className={`lg-voice lg-role-agent fixed pointer-events-auto cerebro-stellar-glass transition-all duration-200 ${
          guiLayout
            ? ''
            : `${snapClasses[snapEdge]} ${
                isExpanded ? 'w-[94vw] max-w-[560px]' : 'w-[92vw] max-w-[470px]'
              }`
        }`}
      >
        {/* Drag Handle + Standardized Panel #10 Header Bar + Compact/Expanded Toggle */}
        <div
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
          className={`px-3.5 ${
            guiLayout?.voiceCompactedForSheet ? 'py-1 min-h-[52px]' : 'py-2 border-b'
          } border-[rgba(232,251,255,0.20)] flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-display text-xs font-semibold tracking-[0.08em] uppercase text-[#F2F6F8]">
                  #10 · Cerebro Chat
                </span>
                <span
                  data-testid="voice-status-badge"
                  className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded bg-[#142632] border border-white/15 text-[#B4DDFF]"
                >
                  {displayedVoiceStatus}
                </span>
              </div>

              {tourState.active && (
                <div className="flex items-center gap-1.5 font-mono tabular-nums text-[10px] text-[#FFF1D4] truncate mt-0.5">
                  <span>
                    Tour {tourState.step}/{tourState.total} ·{' '}
                    {tourState.paused ? 'Paused' : `${tourState.secondsLeft}s`}
                  </span>
                  {onPrevTourStop && (
                    <button
                      type="button"
                      data-testid="tour-prev-stop"
                      onClick={onPrevTourStop}
                      className="px-1.5 py-0.5 rounded bg-[#142632] border border-white/25 text-[#F2F6F8] cursor-pointer"
                    >
                      ‹ Back
                    </button>
                  )}
                  {onNextTourStop && (
                    <button
                      type="button"
                      data-testid="tour-next-stop"
                      onClick={onNextTourStop}
                      className="px-1.5 py-0.5 rounded bg-[#142632] border border-[#F2B66D] text-[#F2B66D] hover:bg-[#F2B66D] hover:text-[#101D27] cursor-pointer"
                    >
                      Next ›
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pockets: Hands · Chat (Call / voice removed) */}
          <div className="flex items-center gap-1 shrink-0">
            {(
              [
                { id: 'hands', label: 'Hands' },
                { id: 'compose', label: 'Chat' },
              ] as const
            ).map((p) => {
              const isAct = activePocket === p.id || (p.id === 'hands' && handsActive);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChangePocket(p.id);
                    if (p.id === 'hands') {
                      onToggleHands();
                    } else if (!isExpanded && p.id === 'compose') {
                      setIsExpanded(true);
                    }
                  }}
                  className={`min-h-[44px] px-2.5 py-1 rounded-xl font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap border ${
                    isAct
                      ? 'bg-[#4C8DFF] text-[#101D27] border-[#65ACFF] font-semibold'
                      : 'bg-[#142632] text-[#F2F6F8] border-[rgba(232,251,255,0.20)] hover:border-[#65ACFF]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            <button
              type="button"
              data-testid="voice-card-toggle-expand"
              onClick={() => setIsExpanded((v) => !v)}
              title={isExpanded ? 'Collapse Voice Card' : 'Expand Workspace Controls'}
              className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl font-mono text-[11px] bg-[#142632] border border-[rgba(232,251,255,0.24)] text-[#A9BAC6] hover:text-[#F2F6F8] cursor-pointer"
            >
              {isExpanded ? '▾' : '▴'}
            </button>
          </div>
        </div>

        {/* S06 Voice Active Default 2-Line Transcript Preview (when collapsed and not phone-sheet compacted) */}
        {!isExpanded && !guiLayout?.voiceCompactedForSheet && transcripts.length > 0 && (
          <div className="px-3.5 pt-1.5 pb-0.5 text-[13px] text-[#E8FBFF] line-clamp-2 font-sans leading-snug">
            <span className="font-mono text-[11px] text-[#9AFFE0] mr-1.5">
              {transcripts[transcripts.length - 1].speaker === '39' ? '39:' : 'CEREBRO:'}
            </span>
            {transcripts[transcripts.length - 1].text}
          </div>
        )}

        {/* Always-Visible Command Bar + Run & Stop Buttons (hidden when compacted to 52px on phone sheet expansion) */}
        {!guiLayout?.voiceCompactedForSheet && (
        <form onSubmit={handleSimSubmit} className="px-3.5 py-2 flex items-center gap-1.5">
          <input
            type="text"
            data-testid="voice-sim-input"
            value={simInput}
            onChange={(e) => setSimInput(e.target.value)}
            placeholder="Ask or command Cerebro (e.g. 'open El Batron project', 'take me to CDE')..."
            className="flex-1 min-h-[44px] px-3 py-1 rounded-xl bg-[#142632] border border-[rgba(232,251,255,0.24)] font-sans text-[14px] text-[#F2F6F8] placeholder-[#A9BAC6]/65 focus:outline-none focus:border-[#65ACFF]"
          />
          <button
            type="submit"
            data-testid="voice-sim-run"
            className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl font-mono text-xs font-semibold cursor-pointer border shrink-0"
            style={{
              backgroundColor: COLOUR_TOKENS.cobaltAccent,
              color: '#101D27',
              borderColor: COLOUR_TOKENS.focusRing,
            }}
          >
            Run
          </button>
          {/* Normal Stop button uses neutral/focus styling; #FF5666 is reserved for actual error/blocked/destructive states */}
          <button
            type="button"
            data-testid="voice-stop"
            data-cta-id="voice-stop"
            data-ui-id="voice-stop"
            onClick={handleInstantStop}
            title="Stop audio, halt tour auto-stepping, and freeze camera pose"
            style={{ zIndex: GUI_Z_LAYERS.emergencyStop }}
            className="relative min-h-[44px] min-w-[44px] px-3.5 rounded-xl font-mono text-xs font-semibold bg-[#142632] text-[#F2F6F8] border border-[#65ACFF] hover:bg-[#4C8DFF]/20 cursor-pointer shrink-0"
          >
            Stop
          </button>
        </form>
        )}

        {/* "Make this a task?" Prompt after saving a note */}
        {pendingTaskProposal && (
          <div className="mx-3.5 mb-2.5 p-2.5 rounded-lg border border-[#36E88D] bg-[#142632] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-[#36E88D]">
                NOTE SAVED · {pendingTaskProposal.projectCode}
              </div>
              <div className="font-sans text-xs text-[#F2F6F8] truncate">
                "{pendingTaskProposal.summary}" — Also create a task?
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="confirm-task-yes"
                onClick={() => onConfirmMakeTask(true)}
                className="min-h-[36px] px-3 py-1 rounded-lg font-mono text-[11px] bg-[#36E88D] text-[#101D27] font-semibold cursor-pointer"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => onConfirmMakeTask(false)}
                className="min-h-[36px] px-3 py-1 rounded-lg font-mono text-[11px] bg-[#101D27] text-[#BDCBD3] border border-white/20 cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        )}

        {/* Expanded Body */}
        {isExpanded && (
          <div className="px-3.5 pb-3.5 pt-1 border-t border-white/15 space-y-3 max-h-[42vh] overflow-y-auto">
            {/* Compose Pocket: Chat with Cerebro vs Save a note vs Create a task + Real Binary Upload */}
            {activePocket === 'compose' && (
              <form
                onSubmit={handleChatWithCerebro}
                className="p-2.5 rounded-lg bg-[#142632]/75 border border-[rgba(180,221,255,0.16)] space-y-2"
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-[#4C8DFF]">
                  <span>COMPOSE · PROJECT: {selectedProjectId}</span>
                  {uploadedAttachment && (
                    <span className="text-[#36E88D]" data-testid="uploaded-attachment-badge">
                      {uploadedAttachment.fileName} ({uploadedAttachment.sizeBytes}B · SHA256:{' '}
                      {uploadedAttachment.sha256.slice(0, 8)})
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  data-testid="compose-textarea"
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  placeholder="Write a message, note, or task..."
                  className="w-full p-2 rounded-lg bg-[#101D27] border border-white/20 font-sans text-xs text-[#F2F6F8] focus:outline-none focus:border-[#65ACFF]"
                />
                {(failedComposeNotice || uploadError) && (
                  <div
                    data-testid="compose-error-notice"
                    className="p-2 rounded-lg bg-[#142632] border font-mono text-[10px]"
                    style={{
                      borderColor: COLOUR_TOKENS.systemErrorRed,
                      color: COLOUR_TOKENS.systemErrorRed,
                    }}
                  >
                    {failedComposeNotice || uploadError}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.csv,.json,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[36px] px-2.5 rounded-lg font-mono text-[10px] bg-[#142632] border border-white/25 text-[#F2F6F8] hover:border-[#65ACFF] cursor-pointer"
                  >
                    {uploadingFile ? 'Uploading...' : '+ Attach File'}
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="submit"
                      data-testid="compose-chat-btn"
                      className="min-h-[36px] px-3 rounded-lg font-mono text-[10px] bg-[#142632] border border-[#65ACFF] text-[#F2F6F8] cursor-pointer"
                    >
                      Chat with Cerebro
                    </button>
                    <button
                      type="button"
                      data-testid="compose-save-note-btn"
                      onClick={handleSaveNote}
                      className="min-h-[36px] px-3 rounded-lg font-mono text-[10px] bg-[#4C8DFF] text-[#101D27] font-semibold cursor-pointer"
                    >
                      Save a note
                    </button>
                    <button
                      type="button"
                      data-testid="compose-create-task-btn"
                      onClick={handleCreateTaskDirect}
                      className="min-h-[36px] px-3 rounded-lg font-mono text-[10px] bg-[#5CC8D7] text-[#101D27] font-semibold cursor-pointer"
                    >
                      Create a task
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Audience Awareness Control & Position Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#142632]/75 border border-[rgba(180,221,255,0.16)]">
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-[#BDCBD3] mr-1">Privacy:</span>
                {(['Owner only', 'Partner or assistant present', 'Public'] as const).map((lvl) => {
                  const ctaId =
                    lvl === 'Owner only'
                      ? 'privacy-owner-only'
                      : lvl === 'Partner or assistant present'
                      ? 'privacy-partner'
                      : 'privacy-public';
                  return (
                    <button
                      key={lvl}
                      type="button"
                      data-cta-id={ctaId}
                      onClick={() => onChangeAudience(lvl)}
                      className={`min-h-[32px] px-2 py-1 rounded font-mono text-[10px] cursor-pointer border ${
                        audienceLevel === lvl
                          ? 'bg-[#F2F6F8] text-[#101D27] border-white font-semibold'
                          : 'bg-[#101D27] text-[#BDCBD3] border-white/15'
                      }`}
                    >
                      {lvl === 'Partner or assistant present' ? 'Partner' : lvl}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1">
                {(
                  ['bottom-center', 'bottom-left', 'bottom-right', 'top-right'] as WidgetSnapEdge[]
                ).map((edge) => (
                  <button
                    key={edge}
                    type="button"
                    onClick={() => setSnapEdge(edge)}
                    className={`min-h-[32px] px-1.5 py-1 rounded font-mono text-[9px] cursor-pointer border ${
                      snapEdge === edge
                        ? 'bg-[#F2F6F8] text-[#101D27] border-white font-semibold'
                        : 'bg-[#101D27] text-[#BDCBD3] border-white/15'
                    }`}
                  >
                    {edge.replace('bottom-', 'B-').replace('top-', 'T-')}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Workspace Shortcuts */}
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] text-[#BDCBD3]">
                QUICK VOICE & WORKSPACE ACTIONS:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_WORKSPACE_COMMANDS.map((item) => (
                  <button
                    key={item.cmd}
                    type="button"
                    onClick={() => onSimulateCommand(item.cmd)}
                    className="min-h-[32px] px-2.5 py-1 rounded-lg font-mono text-[10px] bg-[#142632] border border-[rgba(180,221,255,0.16)] text-[#F2F6F8] hover:border-[#65ACFF] hover:text-[#B4DDFF] transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation History */}
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] text-[#BDCBD3] flex justify-between">
                <span>Conversation</span>
                <span>{transcripts.length} messages</span>
              </div>
              <div className="rounded-lg p-2.5 bg-[#142632]/75 border border-[rgba(180,221,255,0.16)] space-y-2 max-h-32 overflow-y-auto">
                {transcripts
                  .slice(-10)
                  .reverse()
                  .map((line) => (
                    <div key={line.id} className="text-xs space-y-0.5">
                      <div className="flex items-center justify-between font-mono tabular-nums text-[10px]">
                        <span
                          style={{
                            color:
                              line.speaker === '39'
                                ? COLOUR_TOKENS.textPrimary
                                : '#B4DDFF',
                          }}
                        >
                          {line.speaker === '39' ? 'Tarek (39)' : 'Cerebro'}
                        </span>
                        <span className="text-[#BDCBD3]">{line.timestamp}</span>
                      </div>
                      <p className="font-sans text-xs text-[#F2F6F8] leading-snug">{line.text}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
