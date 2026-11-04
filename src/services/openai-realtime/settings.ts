/** Public defaults only. OPENAI_API_KEY is read exclusively in server/settings.ts. */
export const OPENAI_REALTIME_DEFAULTS = Object.freeze({
  model: 'gpt-realtime',
  voice: 'marin',
});

export const OPENAI_REALTIME_CLIENT_SETTINGS = Object.freeze({
  sessionEndpoint: '/api/openai/realtime/session',
  dataChannelName: 'oai-events',
  connectionTimeoutMs: 40000,
  reconnectTimeoutMs: 10000,
});
