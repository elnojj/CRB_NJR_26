import type express from 'express';
import { CRO_CDE_GOOGLE_AGENT_MANIFEST, DEFAULT_INTERNAL_AGENT_ID, buildElevenLabsAgentPayload } from '../../voice/cerebroAgentManifest';

/** Retained legacy routes; the active OpenAI call path does not use these handlers. */
export function createLegacyElevenLabsHandlers(env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch) {
  // 3. ElevenLabs Agent Status & Provisioning
  let cachedAgentId: string = env.ELEVENLABS_AGENT_ID || DEFAULT_INTERNAL_AGENT_ID;

  const handleAgentStatus = (_req: express.Request, res: express.Response) => {
    res.json({
      ok: true,
      agentId: cachedAgentId || DEFAULT_INTERNAL_AGENT_ID,
      defaultAgentId: DEFAULT_INTERNAL_AGENT_ID,
      hasApiKey: Boolean(env.ELEVENLABS_API_KEY),
      manifestName: CRO_CDE_GOOGLE_AGENT_MANIFEST.name,
    });
  };

  const handleSignedUrl = async (req: express.Request, res: express.Response) => {
    const agentId = String(req.body?.agentId || cachedAgentId || DEFAULT_INTERNAL_AGENT_ID).trim();
    const apiKey = String(req.body?.apiKey || env.ELEVENLABS_API_KEY || '').trim();
    if (!apiKey) {
      return res.json({
        ok: true,
        agentId,
        wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`,
      });
    }
    try {
      const r = await fetcher(
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
  };

  const handleCreateOrProvisionAgent = async (req: express.Request, res: express.Response) => {
    const apiKey = String(req.body?.apiKey || env.ELEVENLABS_API_KEY || '').trim();
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
      const createRes = await fetcher('https://api.elevenlabs.io/v1/convai/agents/create', {
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

  return { handleAgentStatus, handleSignedUrl, handleCreateOrProvisionAgent };
}
