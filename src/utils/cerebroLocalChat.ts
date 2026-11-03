/**
 * Local Cerebro chat fallback when /api/gemini/chat is unavailable (e.g. static Vercel).
 */
export type LocalChatTurn = { role: 'user' | 'model'; text: string };

export function buildLocalCerebroReply(message: string, history: LocalChatTurn[] = []): string {
  const text = message.trim();
  const lower = text.toLowerCase();
  const turn = history.filter((h) => h.role === 'user').length + 1;

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
