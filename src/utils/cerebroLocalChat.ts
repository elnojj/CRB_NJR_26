/**
 * Local Cerebro chat fallback when /api/gemini/chat is unavailable (e.g. static Vercel).
 */
export type LocalChatTurn = { role: 'user' | 'model'; text: string };

export function buildLocalCerebroReply(message: string, history: LocalChatTurn[] = []): string {
  const text = message.replace(/^\[project:[^\]]*\]\s*/, '').trim();
  const lower = text.toLowerCase();
  const turn = history.filter((h) => h.role === 'user').length + 1;

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
