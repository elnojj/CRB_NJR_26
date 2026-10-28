import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  CRO_CDE_GOOGLE_AGENT_MANIFEST,
  CRO_CDE_GOOGLE_TOOLS_SCHEMA,
  DEFAULT_INTERNAL_AGENT_ID,
  buildElevenLabsAgentPayload,
} from './src/data/croCdeGoogleAgentManifest.ts';

const PORT = Number(process.env.PORT) || 3000;
const BUILD_VERSION = '1.28.0';
const BASELINE_CHECKPOINT_VERSION = '1.25.0';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const CHECKPOINT_PATH = path.join(DATA_DIR, 'checkpoint_v1_25_0.json');
const memoryUploadBuffers = new Map<string, Buffer>();

export interface PersistedMessage {
  id: string;
  opId: string;
  sender: string;
  authorId: string;
  projectId: string | null;
  channel: string;
  text: string;
  body: string;
  attachments: string[];
  status: 'SAVED_LOCALLY';
  timestamp: string;
  createdAt: string;
  isTest?: boolean;
}

export interface PersistedNote {
  id: string;
  opId: string;
  title: string;
  text: string;
  body: string;
  projectId: string | null;
  projectCode?: string;
  authorId: string;
  attachments: string[];
  createdAt: string;
  isTest?: boolean;
}

export interface PersistedTask {
  id: string;
  opId: string;
  title: string;
  projectCode: string;
  owner: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  attachmentName?: string;
  createdAt: string;
  isTest?: boolean;
}

export interface PersistedDecision {
  id: string;
  opId: string;
  checkpointId: string;
  projectId: string;
  action: 'Approve' | 'Reject' | 'Request Revision';
  actor: string;
  note?: string;
  timestamp: string;
  isTest?: boolean;
}

export interface PersistedMinutesDraft {
  id: string;
  opId: string;
  projectId: string;
  recipientInput: string;
  recipientResolved: string;
  subject: string;
  summary: string;
  status: 'DRAFT_READY_EMAIL_NOT_CONNECTED';
  deliveryStatus: 'DRAFT_READY_EMAIL_NOT_CONNECTED';
  deliveryNote: string;
  timestamp: string;
  isTest?: boolean;
}

export interface PersistedAttachment {
  id: string;
  filename: string;
  fileName?: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storedPath: string;
  createdAt: string;
  isTest?: boolean;
}

export interface DualSphereDomainState {
  checkpointId: string;
  activeSphere: 'hq' | 'cde';
  panelAvoidanceClear: boolean;
  spheres: {
    hq: {
      id: 'hq';
      label: string;
      position: [number, number, number];
      radius: number;
      materialPreset: string;
      coreColor: string;
      rimColor: string;
      projectSunsCount: number;
    };
    cde: {
      id: 'cde';
      label: string;
      position: [number, number, number];
      radius: number;
      materialPreset: string;
      coreColor: string;
      rimColor: string;
      dimensionsCount: number;
    };
  };
  cardiacBridge: {
    curveType: string;
    dofParticles: number;
    zoomRange: [number, number];
  };
  customDomains: Array<Record<string, unknown>>;
  screenAmendments: Array<Record<string, unknown>>;
}

interface DataStore {
  version: string;
  baselineCheckpoint: string;
  checkpointId: string;
  dualSphereState: DualSphereDomainState;
  projects: Array<Record<string, unknown>>;
  crewRoster: Array<Record<string, unknown>>;
  insightsSignals: Array<Record<string, unknown>>;
  messages: PersistedMessage[];
  notes: PersistedNote[];
  tasks: PersistedTask[];
  decisions: Record<string, PersistedDecision>;
  minutesDrafts: PersistedMinutesDraft[];
  attachments: Record<string, PersistedAttachment>;
  idempotency: Record<string, unknown>;
}

function createInitialStore(): DataStore {
  return {
    version: BUILD_VERSION,
    baselineCheckpoint: BASELINE_CHECKPOINT_VERSION,
    checkpointId: 'CP-04',
    dualSphereState: {
      checkpointId: 'CP-04',
      activeSphere: 'hq',
      panelAvoidanceClear: true,
      spheres: {
        hq: {
          id: 'hq',
          label: 'Sphere 01: CEREBRO HQ',
          position: [0, 0, 0],
          radius: 6.2,
          materialPreset: 'cobalt_glass',
          coreColor: '#4C8DFF',
          rimColor: '#B4DDFF',
          projectSunsCount: 6,
        },
        cde: {
          id: 'cde',
          label: 'Sphere 02: CDE Universe',
          position: [38, 4, -22],
          radius: 6.2,
          materialPreset: 'amber_caustic',
          coreColor: '#F2B66D',
          rimColor: '#FFF1D4',
          dimensionsCount: 4,
        },
      },
      cardiacBridge: {
        curveType: 'CatmullRomCurve3',
        dofParticles: 6400,
        zoomRange: [9.2, 42],
      },
      customDomains: [],
      screenAmendments: [],
    },
    projects: [],
    crewRoster: [],
    insightsSignals: [],
    messages: [
      {
        id: 'MSG-INIT-01',
        opId: 'OP-INIT-01',
        sender: 'Cerebro',
        authorId: 'p-cerebro',
        projectId: 'SEVEN',
        channel: 'General',
        text: 'HQ and CDE spheres synced with 52 read-only register records from 23 Oct 2026.',
        body: 'HQ and CDE spheres synced with 52 read-only register records from 23 Oct 2026.',
        attachments: [],
        status: 'SAVED_LOCALLY',
        timestamp: '2026-10-23T22:00:00.000Z',
        createdAt: '2026-10-23T22:00:00.000Z',
      },
    ],
    notes: [
      {
        id: 'NOTE-INIT-01',
        opId: 'OP-NOTE-01',
        title: 'NOJARA_HQ_26 Snapshot Readiness',
        text: 'Workspace operating on tracked canonical persistence (src/data/store.json). External Cursor webhooks remain disabled until configured.',
        body: 'Workspace operating on tracked canonical persistence (src/data/store.json). External Cursor webhooks remain disabled until configured.',
        projectId: 'SEVEN',
        projectCode: 'SEVEN',
        authorId: '39',
        attachments: [],
        createdAt: '2026-10-23T21:30:00.000Z',
      },
    ],
    tasks: [],
    decisions: {},
    minutesDrafts: [],
    attachments: {},
    idempotency: {},
  };
}

let persistenceMode: 'disk' | 'memory-fallback' = 'disk';

function loadStore(): DataStore {
  const initial = createInitialStore();
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DataStore>;
      return {
        version: BUILD_VERSION,
        baselineCheckpoint: BASELINE_CHECKPOINT_VERSION,
        checkpointId: parsed.checkpointId || initial.checkpointId,
        dualSphereState: parsed.dualSphereState || initial.dualSphereState,
        projects: Array.isArray(parsed.projects) ? parsed.projects : initial.projects,
        crewRoster: Array.isArray(parsed.crewRoster) ? parsed.crewRoster : initial.crewRoster,
        insightsSignals: Array.isArray(parsed.insightsSignals)
          ? parsed.insightsSignals
          : initial.insightsSignals,
        messages: Array.isArray(parsed.messages) ? parsed.messages : initial.messages,
        notes: Array.isArray(parsed.notes) ? parsed.notes : initial.notes,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : initial.tasks,
        decisions: parsed.decisions && typeof parsed.decisions === 'object' ? parsed.decisions : {},
        minutesDrafts: Array.isArray(parsed.minutesDrafts) ? parsed.minutesDrafts : [],
        attachments: parsed.attachments && typeof parsed.attachments === 'object' ? parsed.attachments : {},
        idempotency: parsed.idempotency && typeof parsed.idempotency === 'object' ? parsed.idempotency : {},
      };
    }
  } catch (err) {
    console.warn('[CEREBRO STORE] Failed to read src/data/store.json, falling back to in-memory seed:', err);
    persistenceMode = 'memory-fallback';
  }
  return initial;
}

function saveStore(nextStore: DataStore): void {
  store = nextStore;
  try {
    if (fs.existsSync(DATA_DIR)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify(nextStore, null, 2), 'utf-8');
      persistenceMode = 'disk';
    } else {
      persistenceMode = 'memory-fallback';
    }
  } catch {
    // Ephemeral / read-only filesystem: keep authoritative state in memory
    persistenceMode = 'memory-fallback';
  }
}

let store: DataStore = loadStore();

// Known recipient aliases for Meeting Notes
const KNOWN_RECIPIENT_ALIASES: Record<string, string> = {
  '39': 'me@nojara.com',
  me: 'me@nojara.com',
  self: 'me@nojara.com',
  tarek: 'me@nojara.com',
  'tarek nojara': 'me@nojara.com',
  owner: 'me@nojara.com',
  shweekar: 'shweekar@nojara.com',
  khalid: 'khalid@nojara.com',
  'khalid al-shaalan': 'khalid@nojara.com',
  kr: 'kr@nojara.com',
};

export function resolveRecipientEmail(rawInput: string): {
  ok: boolean;
  email: string | null;
  error?: string;
} {
  const cleaned = String(rawInput || '').trim();
  if (!cleaned) {
    return { ok: false, email: null, error: 'Recipient is required.' };
  }
  const lower = cleaned.toLowerCase();
  if (KNOWN_RECIPIENT_ALIASES[lower]) {
    return { ok: true, email: KNOWN_RECIPIENT_ALIASES[lower] };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(cleaned)) {
    return { ok: true, email: cleaned };
  }
  return {
    ok: false,
    email: null,
    error: `Unknown recipient "${cleaned}". Enter a valid email address or known alias (39, me, shweekar, khalid).`,
  };
}

function getRequestAudience(
  req: express.Request
): 'Owner only' | 'Partner or assistant present' | 'Public' {
  const headerVal = String(req.headers['x-cerebro-audience'] || req.query.audience || 'Owner only').trim();
  if (headerVal === 'Public') return 'Public';
  if (headerVal === 'Partner or assistant present') return 'Partner or assistant present';
  return 'Owner only';
}

function requireInternalAccess(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const audience = getRequestAudience(req);
  if (audience === 'Public') {
    res.status(403).json({
      ok: false,
      error: 'Forbidden: Internal workspace actions and sensitive records are disabled in Public audience mode.',
      audience,
    });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Health & Version Checkpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'CEREBRO_CDE_WORKSPACE_SERVER',
      version: BUILD_VERSION,
      baselineCheckpoint: BASELINE_CHECKPOINT_VERSION,
      checkpointId: store.checkpointId || 'CP-04',
      defaultAgentId: DEFAULT_INTERNAL_AGENT_ID,
      persistenceFile: 'src/data/store.json',
      checkpointFile: 'src/data/checkpoint_v1_25_0.json',
      persistenceMode,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Persistent State Snapshot & Audience-Gated Internal Records
  app.get('/api/state', (req, res) => {
    const includeTest = req.query.includeTest === 'true';
    const audience = getRequestAudience(req);

    const filterTest = <T extends { isTest?: boolean }>(items: T[]) =>
      includeTest ? items : items.filter((item) => !item.isTest);

    const filteredDecisions: Record<string, PersistedDecision> = {};
    for (const [k, v] of Object.entries(store.decisions)) {
      if (includeTest || !v.isTest) {
        filteredDecisions[k] = v;
      }
    }

    const filteredAttachments: Record<string, PersistedAttachment> = {};
    for (const [k, v] of Object.entries(store.attachments)) {
      if (includeTest || !v.isTest) {
        filteredAttachments[k] = v;
      }
    }

    res.json({
      ok: true,
      version: BUILD_VERSION,
      baselineCheckpoint: BASELINE_CHECKPOINT_VERSION,
      checkpointId: store.checkpointId || 'CP-04',
      persistenceFile: 'src/data/store.json',
      persistenceMode,
      audience,
      dualSphereState: store.dualSphereState,
      projects: store.projects,
      crewRoster: audience === 'Public' ? [] : store.crewRoster,
      insightsSignals: audience === 'Public' ? [] : store.insightsSignals,
      messages: audience === 'Public' ? [] : filterTest(store.messages),
      notes: audience === 'Public' ? [] : filterTest(store.notes),
      tasks: audience === 'Public' ? [] : filterTest(store.tasks),
      decisions: audience === 'Public' ? {} : filteredDecisions,
      minutesDrafts: audience === 'Public' ? [] : filterTest(store.minutesDrafts),
      attachments: audience === 'Public' ? {} : filteredAttachments,
    });
  });

  app.get('/api/internal/records', (req, res) => {
    const audience = getRequestAudience(req);
    if (audience === 'Public') {
      res.status(403).json({
        ok: false,
        error: 'Forbidden: Internal commercial records, BSOCIAL history, and private emails require Owner or Partner audience.',
        audience,
      });
      return;
    }

    const records = [
      {
        id: 'REC-SEVEN-01',
        project: 'SEVEN',
        title: 'SEVEN KSA Destination Storytelling & Pilot',
        classification: 'PARTNER_VISIBLE',
        ownerEmail: audience === 'Owner only' ? 'me@nojara.com' : '[REDACTED_EMAIL]',
      },
      {
        id: 'REC-BSOCIAL-01',
        project: 'BSOCIAL',
        title: 'BSOCIAL × YAH Access Gate & Commercial Terms',
        classification: 'OWNER_ONLY',
        ownerEmail: 'me@nojara.com',
      },
    ].filter((r) => (audience === 'Owner only' ? true : r.classification !== 'OWNER_ONLY'));

    res.json({
      ok: true,
      audience,
      records,
    });
  });

  // 3. ElevenLabs Agent Status & Provisioning
  let cachedAgentId: string = process.env.ELEVENLABS_AGENT_ID || DEFAULT_INTERNAL_AGENT_ID;

  const handleAgentStatus = (_req: express.Request, res: express.Response) => {
    res.json({
      ok: true,
      agentId: cachedAgentId || DEFAULT_INTERNAL_AGENT_ID,
      defaultAgentId: DEFAULT_INTERNAL_AGENT_ID,
      hasApiKey: Boolean(process.env.ELEVENLABS_API_KEY),
      manifestName: CRO_CDE_GOOGLE_AGENT_MANIFEST.name,
    });
  };
  app.get('/api/elevenlabs/agent', handleAgentStatus);
  app.get('/api/elevenlabs/status', handleAgentStatus);

  app.post('/api/elevenlabs/signed-url', async (req, res) => {
    const agentId = String(req.body?.agentId || cachedAgentId || DEFAULT_INTERNAL_AGENT_ID).trim();
    const apiKey = String(req.body?.apiKey || process.env.ELEVENLABS_API_KEY || '').trim();
    if (!apiKey) {
      return res.json({
        ok: true,
        agentId,
        wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`,
      });
    }
    try {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
        { headers: { 'xi-api-key': apiKey } }
      );
      if (r.ok) {
        const d = (await r.json()) as { signed_url?: string };
        if (d.signed_url) {
          return res.json({ ok: true, agentId, signedUrl: d.signed_url });
        }
      }
    } catch {
      // fallback to public agent_id wsUrl
    }
    return res.json({
      ok: true,
      agentId,
      wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`,
    });
  });

  const handleCreateOrProvisionAgent = async (req: express.Request, res: express.Response) => {
    const apiKey = String(req.body?.apiKey || process.env.ELEVENLABS_API_KEY || '').trim();
    const requestedAgentId = req.body?.agentId?.trim();

    if (requestedAgentId) {
      cachedAgentId = requestedAgentId;
      return res.json({
        ok: true,
        status: 'CONFIGURED_EXISTING_AGENT',
        agentId: cachedAgentId,
      });
    }

    if (!apiKey) {
      return res.json({
        ok: true,
        status: 'DEFAULT_INTERNAL_AGENT_ACTIVE',
        agentId: cachedAgentId || DEFAULT_INTERNAL_AGENT_ID,
        message: 'Using documented internal agent ID. Set ELEVENLABS_API_KEY on server only if creating a new remote agent.',
      });
    }

    try {
      const voiceId = req.body?.voiceId ? String(req.body.voiceId).trim() : undefined;
      const payload = buildElevenLabsAgentPayload(voiceId);
      const createRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        return res.status(createRes.status).json({
          ok: false,
          status: 'ELEVENLABS_API_ERROR',
          error: errText,
        });
      }

      const data = (await createRes.json()) as { agent_id?: string };
      cachedAgentId = data.agent_id || cachedAgentId;

      return res.json({
        ok: true,
        status: 'PROVISIONED_LIVE',
        agentId: cachedAgentId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        ok: false,
        status: 'PROVISION_EXCEPTION',
        error: message,
      });
    }
  };
  app.post('/api/elevenlabs/provision', requireInternalAccess, handleCreateOrProvisionAgent);
  app.post('/api/elevenlabs/create-agent', requireInternalAccess, handleCreateOrProvisionAgent);

  // 4. Real Byte File Uploads (`POST /api/uploads`) — supports both { fileName, base64Data } and { filename, contentBase64 }
  app.post('/api/uploads', requireInternalAccess, (req, res) => {
    const {
      filename,
      fileName,
      mimeType,
      contentBase64,
      base64Data,
      isTest,
    } = req.body || {};
    const resolvedFilename = filename || fileName;
    const resolvedBase64 = contentBase64 || base64Data;

    if (!resolvedFilename || typeof resolvedBase64 !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'fileName and base64Data are required for file upload.',
      });
    }

    try {
      const cleanBase64 = resolvedBase64.includes(',')
        ? resolvedBase64.split(',')[1]
        : resolvedBase64;
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.byteLength === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Uploaded file contains 0 bytes.',
        });
      }

      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const id = `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const safeFilename = path.basename(String(resolvedFilename)).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storedPath = `memory://${id}/${safeFilename}`;

      memoryUploadBuffers.set(id, buffer);

      const attachment: PersistedAttachment = {
        id,
        filename: safeFilename,
        fileName: safeFilename,
        mimeType: String(mimeType || 'application/octet-stream'),
        sizeBytes: buffer.byteLength,
        sha256,
        storedPath,
        createdAt: new Date().toISOString(),
        isTest: Boolean(isTest),
      };

      store.attachments[id] = attachment;
      saveStore(store);

      return res.json({
        ok: true,
        attachment: {
          id: attachment.id,
          filename: attachment.filename,
          fileName: attachment.filename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          sha256: attachment.sha256,
          createdAt: attachment.createdAt,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        ok: false,
        error: `Upload failed: ${msg}`,
      });
    }
  });

  app.get('/api/uploads/:id', requireInternalAccess, (req, res) => {
    const att = store.attachments[req.params.id];
    const memBuf = memoryUploadBuffers.get(req.params.id);
    if (!att || (!memBuf && !fs.existsSync(att.storedPath))) {
      return res.status(404).json({ ok: false, error: 'Attachment not found' });
    }
    res.setHeader('Content-Type', att.mimeType);
    res.setHeader('Content-Length', String(att.sizeBytes));
    if (memBuf) {
      return res.end(memBuf);
    }
    return fs.createReadStream(att.storedPath).pipe(res);
  });

  // 5. Messages, Notes, Tasks & Checkpoint Decisions
  const handleGetMessages = (req: express.Request, res: express.Response) => {
    const audience = getRequestAudience(req);
    if (audience === 'Public') {
      return res.status(403).json({ ok: false, error: 'Forbidden in Public mode' });
    }
    const includeTest = req.query.includeTest === 'true';
    const messages = includeTest ? store.messages : store.messages.filter((m) => !m.isTest);
    return res.json({ ok: true, messages, feed: messages });
  };
  app.get('/api/messages', handleGetMessages);
  app.get('/api/messages/feed', handleGetMessages);

  const handlePostMessage = (req: express.Request, res: express.Response) => {
    const {
      opId,
      sender = '39 (Tarek Nojara)',
      authorId = 'p-39',
      projectId = 'SEVEN',
      projectCode,
      channel = 'General',
      text,
      body,
      attachmentName,
      attachments = [],
      isTest = false,
      simulateFailure = false,
    } = req.body || {};

    if (simulateFailure) {
      return res.status(503).json({
        ok: false,
        error: 'Simulated server error: Draft preserved in input.',
      });
    }

    const content = String(body || text || '').trim();
    if (!content) {
      return res.status(400).json({ ok: false, error: 'Message text is required' });
    }

    const headerIdem = req.headers['idempotency-key'];
    const resolvedOpId = String(opId || headerIdem || `OP-MSG-${Date.now()}`);
    if (store.idempotency[resolvedOpId]) {
      return res.json({
        ok: true,
        deduplicated: true,
        receipt: store.idempotency[resolvedOpId],
        messages: store.messages.filter((m) => (isTest ? true : !m.isTest)),
      });
    }

    const nowIso = new Date().toISOString();
    const attachList = Array.isArray(attachments)
      ? [...attachments]
      : attachmentName
      ? [String(attachmentName)]
      : [];

    const msg: PersistedMessage = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      opId: resolvedOpId,
      sender: String(sender),
      authorId: String(authorId),
      projectId: String(projectCode || projectId || 'SEVEN'),
      channel: String(channel),
      text: content,
      body: content,
      attachments: attachList,
      status: 'SAVED_LOCALLY',
      timestamp: nowIso,
      createdAt: nowIso,
      isTest: Boolean(isTest),
    };

    store.messages.push(msg);
    store.idempotency[resolvedOpId] = msg;
    saveStore(store);

    return res.json({
      ok: true,
      deduplicated: false,
      receipt: msg,
      messages: store.messages.filter((m) => (isTest ? true : !m.isTest)),
    });
  };
  app.post('/api/messages', requireInternalAccess, handlePostMessage);
  app.post('/api/messages/send', requireInternalAccess, handlePostMessage);

  app.get('/api/notes', (req, res) => {
    const audience = getRequestAudience(req);
    if (audience === 'Public') {
      return res.status(403).json({ ok: false, error: 'Forbidden in Public mode' });
    }
    const includeTest = req.query.includeTest === 'true';
    const notes = includeTest ? store.notes : store.notes.filter((n) => !n.isTest);
    return res.json({ ok: true, notes });
  });

  app.post('/api/notes', requireInternalAccess, (req, res) => {
    const {
      opId,
      title,
      body,
      text,
      projectId,
      projectCode,
      authorId = '39',
      attachmentId,
      attachmentName,
      attachments = [],
      isTest = false,
      simulateFailure = false,
    } = req.body || {};

    if (simulateFailure) {
      return res.status(503).json({
        ok: false,
        error: 'Simulated note save failure: Draft kept intact.',
        message: 'Simulated note save failure: Draft kept intact.',
      });
    }

    const rawBody = body ?? text;
    if (!rawBody || !String(rawBody).trim()) {
      return res.status(400).json({ ok: false, error: 'Note text/body is required' });
    }

    const headerIdem = req.headers['idempotency-key'];
    const resolvedOpId = String(opId || headerIdem || `OP-NOTE-${Date.now()}`);
    if (store.idempotency[resolvedOpId]) {
      return res.json({
        ok: true,
        deduplicated: true,
        note: store.idempotency[resolvedOpId],
        notes: store.notes.filter((n) => (isTest ? true : !n.isTest)),
      });
    }

    const cleanBody = String(rawBody).trim();
    const resolvedProj = String(projectId || projectCode || 'SEVEN');
    const attachList = Array.isArray(attachments) && attachments.length > 0
      ? attachments
      : attachmentName || attachmentId
      ? [String(attachmentName || attachmentId)]
      : [];

    const note: PersistedNote = {
      id: `NOTE-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      opId: resolvedOpId,
      title: title ? String(title).trim() : cleanBody.slice(0, 48),
      text: cleanBody,
      body: cleanBody,
      projectId: resolvedProj,
      projectCode: resolvedProj,
      authorId,
      attachments: attachList,
      createdAt: new Date().toISOString(),
      isTest: Boolean(isTest),
    };

    store.notes.unshift(note);
    store.idempotency[resolvedOpId] = note;
    saveStore(store);

    return res.json({
      ok: true,
      deduplicated: false,
      note,
      notes: store.notes.filter((n) => (isTest ? true : !n.isTest)),
    });
  });

  const handleGetTasks = (req: express.Request, res: express.Response) => {
    const audience = getRequestAudience(req);
    if (audience === 'Public') {
      return res.status(403).json({ ok: false, error: 'Forbidden in Public mode' });
    }
    const includeTest = req.query.includeTest === 'true';
    const tasks = includeTest ? store.tasks : store.tasks.filter((t) => !t.isTest);
    return res.json({ ok: true, tasks, persistenceMode });
  };
  app.get('/api/tasks', handleGetTasks);
  app.get('/api/pm/tasks', handleGetTasks);

  const handlePostTask = (req: express.Request, res: express.Response) => {
    const {
      opId,
      title,
      projectCode = 'SEVEN',
      projectId,
      owner = '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
      priority = 'HIGH',
      status = 'IN_PROGRESS',
      attachmentName,
      isTest = false,
      simulateFailure = false,
    } = req.body || {};

    if (simulateFailure) {
      return res.status(503).json({
        ok: false,
        error: 'Simulated task creation failure: Draft kept intact.',
      });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ ok: false, error: 'Task title is required' });
    }

    const headerIdem = req.headers['idempotency-key'];
    const resolvedOpId = String(opId || headerIdem || `OP-TASK-${Date.now()}`);
    if (store.idempotency[resolvedOpId]) {
      return res.json({
        ok: true,
        deduplicated: true,
        task: store.idempotency[resolvedOpId],
        tasks: store.tasks.filter((t) => (isTest ? true : !t.isTest)),
      });
    }

    const normalizedStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' =
      status === 'PENDING' || status === 'COMPLETED' ? status : 'IN_PROGRESS';

    const task: PersistedTask = {
      id: `TASK-LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      opId: resolvedOpId,
      title: String(title).trim(),
      projectCode: String(projectId || projectCode || 'SEVEN'),
      owner: String(owner),
      status: normalizedStatus,
      priority: priority === 'LOW' || priority === 'MEDIUM' ? priority : 'HIGH',
      attachmentName: attachmentName ? String(attachmentName) : undefined,
      createdAt: new Date().toISOString(),
      isTest: Boolean(isTest),
    };

    store.tasks.unshift(task);
    store.idempotency[resolvedOpId] = task;
    saveStore(store);

    return res.json({
      ok: true,
      deduplicated: false,
      task,
      tasks: store.tasks.filter((t) => (isTest ? true : !t.isTest)),
      persistenceMode,
    });
  };
  app.post('/api/tasks', requireInternalAccess, handlePostTask);
  app.post('/api/pm/tasks', requireInternalAccess, handlePostTask);

  app.get('/api/checkpoints', (_req, res) => {
    let checkpointData: Record<string, unknown> = {
      checkpointId: store.checkpointId || 'CP-04',
      checkpointVersion: BASELINE_CHECKPOINT_VERSION,
      upgradedToVersion: BUILD_VERSION,
      dualSphereDomainState: store.dualSphereState,
    };
    try {
      if (fs.existsSync(CHECKPOINT_PATH)) {
        checkpointData = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8')) as Record<string, unknown>;
      }
    } catch {
      // Fall back to in-memory checkpoint representation
    }
    return res.json({
      ok: true,
      checkpointFile: 'src/data/checkpoint_v1_25_0.json',
      checkpoint: checkpointData,
      decisions: store.decisions,
      dualSphereState: store.dualSphereState,
    });
  });

  const handleDecisionPost = (req: express.Request, res: express.Response) => {
    const {
      opId,
      checkpointId,
      projectId = 'SEVEN',
      action,
      decision,
      actor = '39 (Tarek Nojara)',
      note,
      comment,
      isTest = false,
    } = req.body || {};

    const act = action || decision;
    if (!checkpointId || !act) {
      return res.status(400).json({ ok: false, error: 'checkpointId and action are required' });
    }

    const headerIdem = req.headers['idempotency-key'];
    const resolvedOpId = String(opId || headerIdem || `OP-CHK-${checkpointId}-${act}`);
    if (store.idempotency[resolvedOpId]) {
      return res.json({
        ok: true,
        deduplicated: true,
        receipt: store.idempotency[resolvedOpId],
        decisions: store.decisions,
      });
    }

    const normalizedAct: 'Approve' | 'Reject' | 'Request Revision' = String(act)
      .toLowerCase()
      .includes('reject')
      ? 'Reject'
      : String(act).toLowerCase().includes('revision')
      ? 'Request Revision'
      : 'Approve';

    const record: PersistedDecision = {
      id: `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      opId: resolvedOpId,
      checkpointId: String(checkpointId),
      projectId: String(projectId),
      action: normalizedAct,
      actor: String(actor),
      note: note || comment ? String(note || comment) : undefined,
      timestamp: new Date().toISOString(),
      isTest: Boolean(isTest),
    };

    store.decisions[record.checkpointId] = record;
    store.idempotency[resolvedOpId] = record;
    saveStore(store);

    return res.json({
      ok: true,
      deduplicated: false,
      receipt: record,
      decisions: store.decisions,
    });
  };
  app.post('/api/decisions', requireInternalAccess, handleDecisionPost);
  app.post('/api/checkpoints/decide', requireInternalAccess, handleDecisionPost);
  app.post('/api/checkpoints', requireInternalAccess, handleDecisionPost);

  // 6. Meeting Notes Draft & Truthful Email Resolution (`/api/minutes/send`)
  app.post('/api/minutes/send', requireInternalAccess, (req, res) => {
    const {
      opId,
      projectId = 'SEVEN',
      to,
      recipient,
      subject,
      summary,
      body,
      isTest = false,
    } = req.body || {};

    const rawRecipient = String(recipient ?? to ?? '').trim();
    const rawBody = String(body ?? summary ?? '').trim();

    if (!rawBody) {
      return res.status(400).json({ ok: false, error: 'Meeting notes body is required.' });
    }

    const resolved = resolveRecipientEmail(rawRecipient);
    if (!resolved.ok || !resolved.email) {
      return res.status(400).json({
        ok: false,
        status: 'INVALID_RECIPIENT',
        error: resolved.error || 'Unrecognized recipient.',
      });
    }

    const headerIdem = req.headers['idempotency-key'];
    const resolvedOpId = String(opId || headerIdem || `OP-MIN-${Date.now()}`);
    if (store.idempotency[resolvedOpId]) {
      return res.json({
        ok: true,
        deduplicated: true,
        status: 'DRAFT_READY_EMAIL_NOT_CONNECTED',
        receipt: store.idempotency[resolvedOpId],
      });
    }

    const record: PersistedMinutesDraft = {
      id: `MIN-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      opId: resolvedOpId,
      projectId: String(projectId),
      recipientInput: rawRecipient,
      recipientResolved: resolved.email,
      subject: String(subject || `CEREBRO Meeting Notes — ${projectId}`),
      summary: rawBody,
      status: 'DRAFT_READY_EMAIL_NOT_CONNECTED',
      deliveryStatus: 'DRAFT_READY_EMAIL_NOT_CONNECTED',
      deliveryNote: 'Draft ready — email not connected. Saved to local Meeting Notes store.',
      timestamp: new Date().toISOString(),
      isTest: Boolean(isTest),
    };

    store.minutesDrafts.unshift(record);
    store.idempotency[resolvedOpId] = record;
    saveStore(store);

    return res.json({
      ok: true,
      deduplicated: false,
      status: 'DRAFT_READY_EMAIL_NOT_CONNECTED',
      message: 'Draft ready — email not connected',
      statusMessage: 'Draft ready — email not connected',
      receipt: record,
    });
  });

  // 7. Self-Test Cleanup Endpoint (`POST /api/test/reset`)
  app.post('/api/test/reset', requireInternalAccess, (_req, res) => {
    store.messages = store.messages.filter((m) => !m.isTest);
    store.notes = store.notes.filter((n) => !n.isTest);
    store.tasks = store.tasks.filter((t) => !t.isTest);
    store.minutesDrafts = store.minutesDrafts.filter((m) => !m.isTest);

    for (const [k, v] of Object.entries(store.decisions)) {
      if (v.isTest) delete store.decisions[k];
    }
    for (const [k, v] of Object.entries(store.attachments)) {
      if (v.isTest) {
        memoryUploadBuffers.delete(k);
        delete store.attachments[k];
      }
    }
    for (const [k, v] of Object.entries(store.idempotency)) {
      if (k.startsWith('TEST-') || (v && typeof v === 'object' && (v as { isTest?: boolean }).isTest)) {
        delete store.idempotency[k];
      }
    }

    saveStore(store);
    return res.json({ ok: true, status: 'TEST_ARTIFACTS_CLEANED' });
  });

  // 8. Source Files Map & ZIP Download (`/api/project/files` and `/api/download-source`)
  app.get('/api/project/files', requireInternalAccess, (_req, res) => {
    try {
      const rootDir = process.cwd();
      const files: Record<string, string> = {};
      const topFiles = [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'metadata.json',
        'server.ts',
      ];
      for (const f of topFiles) {
        const full = path.join(rootDir, f);
        if (fs.existsSync(full)) {
          files[f] = fs.readFileSync(full, 'utf-8');
        }
      }
      const walkSrc = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkSrc(full);
          } else if (/\.(ts|tsx|css|json|svg)$/.test(entry.name)) {
            const rel = path.relative(rootDir, full).replace(/\\/g, '/');
            files[rel] = fs.readFileSync(full, 'utf-8');
          }
        }
      };
      walkSrc(path.join(rootDir, 'src'));
      res.json({
        ok: true,
        version: BUILD_VERSION,
        fileCount: Object.keys(files).length,
        files,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  app.get('/api/download-source', requireInternalAccess, (_req, res) => {
    res.redirect('/api/project/files');
  });

  // 9. Gemini Live Screen & 3D Domain Orchestrator (`POST /api/gemini/orchestrate`)
  app.post('/api/gemini/orchestrate', async (req, res) => {
    const userCommand = String(req.body?.userCommand || '').trim();
    const pageState = (req.body?.pageState || {}) as Record<string, unknown>;

    if (!userCommand) {
      return res.status(400).json({ ok: false, error: 'userCommand is required' });
    }

    const lower = userCommand.toLowerCase();
    const fallbackToolCalls: Array<{ toolName: string; parameters: Record<string, unknown> }> = [];

    // Deterministic fast-path & fallback parser for 3D domain creation, shader material switch & screen mutation
    if (lower.includes('create domain') || lower.includes('spawn domain') || lower.includes('new domain')) {
      const nameMatch = userCommand.match(/(?:domain|node)\s+(?:called|named)?\s*["']?([A-Za-z0-9 _-]+)["']?/i);
      const label = nameMatch?.[1]?.trim() || 'RIYADH LAB';
      const parentSphere = lower.includes('cde') ? 'cde' : 'hq';
      const materialPreset = lower.includes('amber')
        ? 'amber_caustic'
        : lower.includes('emerald')
        ? 'emerald_verified'
        : lower.includes('crimson')
        ? 'crimson_alert'
        : 'cobalt_glass';
      fallbackToolCalls.push({
        toolName: 'create_domain',
        parameters: {
          id: `dom-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          label,
          parentSphere,
          materialPreset,
        },
      });
    } else if (lower.includes('material') || lower.includes('shader')) {
      const targetSphere = lower.includes('cde') ? 'cde' : 'hq';
      const materialPreset = lower.includes('amber')
        ? 'amber_caustic'
        : lower.includes('emerald')
        ? 'emerald_verified'
        : lower.includes('obsidian')
        ? 'obsidian_wireframe'
        : 'cobalt_glass';
      fallbackToolCalls.push({
        toolName: 'update_domain_material',
        parameters: { targetSphere, materialPreset },
      });
    } else if (lower.includes('amend') || lower.includes('filter') || lower.includes('highlight')) {
      fallbackToolCalls.push({
        toolName: 'amend_screen_element',
        parameters: {
          panelId: String(pageState.activePanel || 'portfolio'),
          elementTarget: 'filter',
          operation: 'filter',
          value: lower.includes('blocked')
            ? 'Blocked'
            : lower.includes('waiting')
            ? 'Waiting on 39'
            : 'Active',
        },
      });
    }

    const applyOrchestrationCallsToStore = (
      calls: Array<{ toolName: string; parameters: Record<string, unknown> }>
    ) => {
      if (!Array.isArray(calls) || calls.length === 0) return;
      let mutated = false;
      for (const call of calls) {
        if (call.toolName === 'create_domain') {
          store.dualSphereState.customDomains.push({
            ...call.parameters,
            createdAt: new Date().toISOString(),
          });
          mutated = true;
        } else if (call.toolName === 'update_domain_material') {
          const targetSphere = call.parameters.targetSphere === 'cde' ? 'cde' : 'hq';
          if (typeof call.parameters.materialPreset === 'string') {
            store.dualSphereState.spheres[targetSphere].materialPreset = call.parameters.materialPreset;
            mutated = true;
          }
        } else if (call.toolName === 'amend_screen_element') {
          store.dualSphereState.screenAmendments.push({
            ...call.parameters,
            updatedAt: new Date().toISOString(),
          });
          mutated = true;
        }
      }
      if (mutated) {
        saveStore(store);
      }
    };

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
        const prompt = `You are the CEREBRO + CDE Spatial OS Orchestrator for Owner 39 (Tarek Nojara — Founder and Culture and Design Engineer).
Current page state JSON: ${JSON.stringify(pageState)}
Available 22 tools: ${CRO_CDE_GOOGLE_TOOLS_SCHEMA.map((t) => t.name).join(', ')}.
User command: "${userCommand}"
Return a JSON object with keys:
- "spokenReply": concise response in English or Egyptian Arabic (never call owner "39" in Arabic)
- "toolCalls": array of { "toolName": string, "parameters": object }`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        const rawText = response.text || '';
        const parsed = JSON.parse(rawText) as {
          spokenReply?: string;
          toolCalls?: Array<{ toolName: string; parameters: Record<string, unknown> }>;
        };
        const resolvedCalls =
          Array.isArray(parsed.toolCalls) && parsed.toolCalls.length > 0
            ? parsed.toolCalls
            : fallbackToolCalls;
        applyOrchestrationCallsToStore(resolvedCalls);
        return res.json({
          ok: true,
          spokenReply: parsed.spokenReply || `Executed "${userCommand}".`,
          toolCalls: resolvedCalls,
          dualSphereState: store.dualSphereState,
          pageState,
        });
      } catch {
        // Fall through to deterministic orchestrator response
      }
    }

    applyOrchestrationCallsToStore(fallbackToolCalls);
    return res.json({
      ok: true,
      spokenReply:
        fallbackToolCalls.length > 0
          ? `Executed ${fallbackToolCalls.map((t) => t.toolName).join(', ')} on the live workspace.`
          : `Processed command "${userCommand}".`,
      toolCalls: fallbackToolCalls,
      dualSphereState: store.dualSphereState,
      pageState,
    });
  });

  // 10. Panel #13 — 2x2 Crew Live SSE Streaming Grid (`GET /api/crew/stream`)
  const CREW_STREAM_AGENTS = [
    {
      code: 'GD',
      name: 'Ghada (Executive Ops)',
      project: 'SEVEN',
      status: 'STREAMING',
      badge: 'Draft only · needs your approval',
      chunks: [
        ' Auditing SEVEN KSA milestone gates against 23 Oct 2025 register...',
        ' 14 open tasks verified; 3 owner checkpoints queued for 39 sign-off.',
        ' RACI lock confirmed: 39 Accountable (A), GD & RS Responsible (R).',
      ],
    },
    {
      code: 'BL',
      name: 'Belal (Spatial WebGL)',
      project: 'CEREBRO-HQ',
      status: 'STREAMING',
      badge: 'Draft only · needs your approval',
      chunks: [
        ' DualSphereCanvas WebGL shader telemetry locked at 60fps.',
        ' Sphere 01 HQ [0,0,0] Cobalt #4C8DFF <-> Sphere 02 CDE [38,4,-22] Amber #F2B66D.',
        ' CatmullRomCurve3 cardiac bridge & 6,400 DOF spiral galaxy particles verified.',
      ],
    },
    {
      code: 'RS',
      name: 'Rasma (Creative Direction)',
      project: 'YAH',
      status: 'STREAMING',
      badge: 'Draft only · needs your approval',
      chunks: [
        ' Preparing Young & Human brand identity & Tabuk 4K concept boards...',
        ' Locked 15-token Neural Observatory v1.1 palette (#101D27 canvas, #142632 glass).',
        ' Ready for 39 visual review in ProjectDetailPanel Approvals tab.',
      ],
    },
    {
      code: 'KT',
      name: 'Kaito (Voice & CV Rig)',
      project: 'CDE-ENGINE',
      status: 'STREAMING',
      badge: 'Draft only · needs your approval',
      chunks: [
        ' Cro-cde-google 22-tool schema & 8s reconnect timeout active.',
        ' 21-landmark MediaPipe hand rig running OneEuroFilter with 0.22/0.30 pinch hysteresis.',
        ' Pentatonic C4–A4 glass-marimba fingertip synth calibrated.',
      ],
    },
  ];

  app.get('/api/crew/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let tick = 0;
    const sendFrame = () => {
      const payload = CREW_STREAM_AGENTS.map((ag) => {
        const chunkIdx = tick % ag.chunks.length;
        return {
          code: ag.code,
          name: ag.name,
          project: ag.project,
          badge: ag.badge,
          status: 'LIVE_SSE',
          text: ag.chunks.slice(0, chunkIdx + 1).join(''),
          timestamp: new Date().toISOString().slice(11, 19),
        };
      });
      res.write(`data: ${JSON.stringify({ tick, agents: payload })}\n\n`);
      tick += 1;
    };

    sendFrame();
    const timer = setInterval(sendFrame, 2600);
    req.on('close', () => {
      clearInterval(timer);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CEREBRO + CDE] Server v${BUILD_VERSION} running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
