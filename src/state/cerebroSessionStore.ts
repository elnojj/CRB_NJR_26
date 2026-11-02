/**
 * Canonical session ownership after reload.
 *
 * Source of truth after hydration:
 * 1. URL search params (viewport, force flags) — ephemeral overrides
 * 2. cerebro.session.v1 localStorage blob — panels, audience, pocket, snap
 * 3. App React state — live authority while mounted
 * 4. ElevenLabs bridge + tour timers — never persisted mid-flight; reset to Ready
 *
 * Race policy: voice tour and panels both hydrate, but tour always starts
 * inactive after reload. Panels restore first; voice capsule connects only
 * on explicit user action (or openAgentModalTrigger).
 */

export const SESSION_STORAGE_KEY = 'cerebro.session.v1' as const;

export const PERSISTENCE_KEYS = {
  session: SESSION_STORAGE_KEY,
  agentId: 'cro_cde_google_agent_id',
  /** Legacy — redirected / ignored after capsule rebuild */
  voiceCardPos: 'cerebro_voice_card_pos_v2',
  voiceCardSize: 'cerebro_voice_card_size_v2',
} as const;

export type SessionAudience = 'executive' | 'producer' | 'creative' | 'engineer' | string;

export interface CerebroSessionSnapshot {
  version: 1;
  activeSphere: 'hq' | 'cde' | 'campaign-os' | 'about-us';
  openPanels: string[];
  audienceLevel: SessionAudience;
  activePocket: 'tap-to-talk' | 'hands' | 'compose';
  voiceSnapEdge: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-right';
  selectedProjectId: string | null;
  /** Tour never resumes mid-step after reload */
  tourActive: false;
  updatedAt: string;
}

export const DEFAULT_SESSION: CerebroSessionSnapshot = {
  version: 1,
  activeSphere: 'hq',
  openPanels: [],
  audienceLevel: 'executive',
  activePocket: 'tap-to-talk',
  voiceSnapEdge: 'bottom-center',
  selectedProjectId: null,
  tourActive: false,
  updatedAt: new Date(0).toISOString(),
};

export function readSessionSnapshot(): CerebroSessionSnapshot {
  if (typeof window === 'undefined') return { ...DEFAULT_SESSION };
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SESSION };
    const parsed = JSON.parse(raw) as Partial<CerebroSessionSnapshot>;
    return {
      ...DEFAULT_SESSION,
      ...parsed,
      version: 1,
      tourActive: false,
      openPanels: Array.isArray(parsed.openPanels) ? parsed.openPanels.slice(0, 4) : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_SESSION };
  }
}

export function writeSessionSnapshot(
  patch: Partial<Omit<CerebroSessionSnapshot, 'version' | 'tourActive'>>
): CerebroSessionSnapshot {
  const next: CerebroSessionSnapshot = {
    ...readSessionSnapshot(),
    ...patch,
    version: 1,
    tourActive: false,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

export type HydrationPhase =
  | 'boot'
  | 'read-storage'
  | 'apply-panels'
  | 'apply-voice-idle'
  | 'ready';

/**
 * Ordered hydration sequence for App mount.
 * Voice tour is forced idle; panels restore before voice connect affordance.
 */
export function hydrationSequence(): HydrationPhase[] {
  return ['boot', 'read-storage', 'apply-panels', 'apply-voice-idle', 'ready'];
}
