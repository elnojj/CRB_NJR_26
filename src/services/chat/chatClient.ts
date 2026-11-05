export class ChatServiceError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ChatServiceError'; }
}

export async function sendCerebroChatTurn(args: {
  message: string; history: Array<{ role: 'user' | 'model'; text: string }>; projectId?: string;
}, fetcher: typeof fetch = fetch): Promise<{ reply: string; model: string; mode: 'live'; toolCalls: [] }> {
  const response = await fetcher('/api/chat', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args), signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => null) as { error?: string; reply?: string; model?: string; mode?: string } | null;
  if (!response.ok) throw new ChatServiceError(result?.error || 'Chat could not connect. Please retry.', response.status);
  if (!result?.reply?.trim() || result.mode !== 'live') throw new ChatServiceError('Live chat did not return a reply. Please retry.', 502);
  return { reply: result.reply, model: result.model || 'openai', mode: 'live', toolCalls: [] };
}
