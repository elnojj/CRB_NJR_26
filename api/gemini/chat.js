/**
 * Vercel serverless — POST /api/gemini/chat
 * Never 404: returns Gemini reply when GEMINI_API_KEY is set, else local Cerebro copy.
 */

function buildLocalCerebroReply(message, history) {
  const text = String(message || '').replace(/^\[project:[^\]]*\]\s*/, '').trim();
  const lower = text.toLowerCase();
  const turn = (Array.isArray(history) ? history : []).filter((h) => h.role === 'user').length + 1;

  if (!text) {
    return 'I am listening — type a message, attach a file, or tap Call for voice.';
  }
  if (/^(hi|hello|hey|salam|مرحبا|اهلا)\b/i.test(text)) {
    return 'Cerebro is in offline assistance mode. Browse Projects and Nodes for the available workspace.';
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
    return 'Browse Projects or Nodes to inspect the available portfolio snapshot. Live project sync is not established.';
  }
  if (lower.includes('help') || lower.includes('what can')) {
    return 'Use Projects and Nodes to browse the workspace. Call checks voice access; live AI is currently unavailable.';
  }
  const preview = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  return `Live AI is unavailable, so I cannot answer “${preview}” yet. You can still browse Projects and Nodes. This reply has not saved a note or changed any records.`;
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

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}; }
  catch { return res.status(400).json({ error: 'Valid JSON is required.' }); }
  const message = String(body.message || '').replace(/^\[project:[^\]]*\]\s*/, '').trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const model = process.env.GEMINI_CHAT_MODEL?.trim() || 'gemini-3.8-flash';

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const previous = history.at(-1);
      const turns = previous?.role === 'user' && previous?.text === message ? history.slice(0, -1) : history;
      const contents = [
        ...turns.slice(-12).map((turn) => ({
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
      const providerReply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n').trim();
      return res.status(200).json({
        reply: providerReply || buildLocalCerebroReply(message, history),
        model: providerReply ? model : 'cerebro-local-fallback',
        mode: providerReply ? 'live' : 'offline', toolCalls: [],
      });
    } catch (err) {
      return res.status(200).json({
        reply: buildLocalCerebroReply(message, history),
        model: 'cerebro-local-fallback',
        mode: 'offline',
        toolCalls: [],
        warning: 'Live AI is temporarily unavailable.',
      });
    }
  }

  return res.status(200).json({
    reply: buildLocalCerebroReply(message, history),
    model: 'cerebro-local-fallback',
    mode: 'offline',
    toolCalls: [],
  });
}
