/**
 * Vercel serverless — POST /api/gemini/chat
 * Never 404: returns Gemini reply when GEMINI_API_KEY is set, else local Cerebro copy.
 */

function buildLocalCerebroReply(message, history) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();
  const turn = (Array.isArray(history) ? history : []).filter((h) => h.role === 'user').length + 1;

  if (!text) {
    return 'I am listening — type a message, attach a file, or tap Call for voice.';
  }
  if (/^(hi|hello|hey|salam|مرحبا|اهلا)\b/i.test(text)) {
    return 'Hello — Cerebro online. Ask about HQ, CDE, projects, camera hands, or attach a brief.';
  }
  if (lower.includes('nojara')) {
    return 'NOJARA is the studio house. Cerebro is the owner OS — dual spheres HQ and CDE keep register, media, and crew in one spatial workspace.';
  }
  if (lower.includes('cerebro')) {
    return 'Cerebro is your spatial operating room: Call for voice, Hands for camera tracking, Chat for this liquid thread. What should we open?';
  }
  if (lower.includes('camera') || lower.includes('hand') || lower.includes('gesture')) {
    return 'Tap Hands on the dock to enable the camera and cryo-glass tracking. Pinch to orbit when LIVE.';
  }
  if (lower.includes('project') || lower.includes('seven') || lower.includes('bsocial')) {
    return 'Register workstreams are live on HQ — SEVEN, Young & Human, Abu Hamdan, and BSocial. Say a project name to focus it.';
  }
  if (lower.includes('help') || lower.includes('what can')) {
    return 'Use Call for voice, Hands for camera, Chat for text. Attach files here. I can steer spheres, tours, and register context.';
  }
  const preview = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  return `Noted (${turn}): “${preview}”. Live Gemini is offline on this host — your message is kept in-thread. Ask another question or attach a file.`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const message = String(body.message || '').trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const model = String(body.model || 'gemini-2.0-flash');

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const contents = [
        ...history.slice(-12).map((turn) => ({
          role: turn.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(turn.text || '') }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: 'You are Cerebro, the NOJARA Studios spatial OS assistant for Owner 39 (Tarek). Be concise and concrete about HQ, CDE, projects, media, and crew.',
              },
            ],
          },
          contents,
        }),
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        throw new Error(data?.error?.message || `Gemini HTTP ${upstream.status}`);
      }
      const reply =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n').trim() ||
        buildLocalCerebroReply(message, history);
      return res.status(200).json({ reply, model, toolCalls: [] });
    } catch (err) {
      return res.status(200).json({
        reply: buildLocalCerebroReply(message, history),
        model: 'cerebro-local-fallback',
        toolCalls: [],
        warning: err instanceof Error ? err.message : 'Gemini failed',
      });
    }
  }

  return res.status(200).json({
    reply: buildLocalCerebroReply(message, history),
    model: 'cerebro-local-fallback',
    toolCalls: [],
  });
}
