import { buildLocalCerebroReply } from '../../utils/cerebroLocalChat';

export type ChatTurn = {
  role: 'user' | 'model';
  text: string;
  model?: string;
  timestamp?: string;
};

export type GeminiChatModelId =
  | 'gemini-3.8-flash'
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash'
  | string;

export type LyriaMusicModelId = 'lyria-3-clip-preview' | 'lyria-2' | string;

export async function sendGeminiChatTurn(args: {
  message: string;
  model: GeminiChatModelId;
  history: ChatTurn[];
}): Promise<{
  reply: string;
  model: string;
  toolCalls: Array<{ toolName: string; parameters: Record<string, unknown> }>;
}> {
  try {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      // Static hosts without serverless previously returned Vercel NOT_FOUND HTML.
      return {
        reply: buildLocalCerebroReply(
          args.message,
          args.history.map((h) => ({ role: h.role, text: h.text }))
        ),
        model: 'cerebro-local-fallback',
        toolCalls: [],
      };
    }
    const data = (await res.json()) as {
      reply?: string;
      model?: string;
      toolCalls?: Array<{ toolName: string; parameters: Record<string, unknown> }>;
    };
    return {
      reply:
        data.reply ||
        buildLocalCerebroReply(
          args.message,
          args.history.map((h) => ({ role: h.role, text: h.text }))
        ),
      model: data.model || String(args.model),
      toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
    };
  } catch {
    return {
      reply: buildLocalCerebroReply(
        args.message,
        args.history.map((h) => ({ role: h.role, text: h.text }))
      ),
      model: 'cerebro-local-fallback',
      toolCalls: [],
    };
  }
}

export async function transcribeAudioBlob(
  blob: Blob,
  mimeType?: string
): Promise<{ text: string }> {
  const form = new FormData();
  form.append('audio', blob, `voice.${(mimeType || blob.type || 'audio/webm').split('/')[1] || 'webm'}`);
  if (mimeType) form.append('mimeType', mimeType);
  const res = await fetch('/api/gemini/transcribe', { method: 'POST', body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Transcription failed (${res.status})`);
  }
  const data = (await res.json()) as { text?: string };
  return { text: data.text || '' };
}

export async function generateLyriaMusic(args: {
  prompt: string;
  model: LyriaMusicModelId;
}): Promise<{ audioDataUrl: string; lyrics: string }> {
  const res = await fetch('/api/lyria/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Lyria generate failed (${res.status})`);
  }
  const data = (await res.json()) as { audioDataUrl?: string; lyrics?: string };
  return {
    audioDataUrl: data.audioDataUrl || '',
    lyrics: data.lyrics || '',
  };
}
