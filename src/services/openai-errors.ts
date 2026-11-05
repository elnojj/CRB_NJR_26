export type OpenAiFailure = {
  kind: 'billing' | 'rate-limit' | 'limit' | 'configuration' | 'service';
  code: string;
  retryable: boolean;
  error: string;
  retryAfterSeconds?: number;
};

/** Read only allowlisted categories; never relay a provider's message, key, IDs or request body. */
export function describeOpenAiFailure(status: number, error?: { code?: unknown; type?: unknown }, retryAfterSeconds?: number): OpenAiFailure {
  const code = typeof error?.code === 'string' ? error.code : '';
  const billing: Record<string, string> = {
    credit_balance_exhausted: 'OpenAI API credits are depleted. Check Billing in the OpenAI project used by this app before reconnecting.',
    project_spend_limit_exceeded: 'The OpenAI project reached its spend limit. Review that project’s Limits before reconnecting.',
    organization_spend_limit_exceeded: 'The OpenAI organization reached its spend limit. Review the organization’s Limits before reconnecting.',
    organization_usage_limit_exceeded: 'The OpenAI organization reached its approved API usage limit. Review Limits or contact OpenAI support before reconnecting.',
    insufficient_quota: 'OpenAI reports insufficient API quota. Check API credits and the project’s spend and usage limits before reconnecting.',
  };
  // Specific codes take precedence over the broader insufficient_quota type.
  if (Object.hasOwn(billing, code)) return { kind: 'billing', code, retryable: false, error: billing[code] };
  if (error?.type === 'insufficient_quota') return { kind: 'billing', code: 'insufficient_quota', retryable: false, error: billing.insufficient_quota };
  if (code === 'rate_limit_exceeded' || code === 'slow_down' || error?.type === 'rate_limit_error') {
    return { kind: 'rate-limit', code: code === 'slow_down' ? code : 'rate_limit_exceeded', retryable: true,
      error: `OpenAI temporarily rate-limited this request. ${retryAfterSeconds ? `Wait at least ${retryAfterSeconds} seconds, then retry.` : 'Wait briefly, then retry.'}`,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
  }
  if (status === 429) return { kind: 'limit', code: 'usage_limit_unknown', retryable: false,
    error: 'OpenAI reported an unspecified usage limit. Check API credits and Limits before reconnecting.' };
  if (status === 401) return { kind: 'configuration', code: 'api_key_rejected', retryable: false,
    error: 'OpenAI rejected the server API key. Check OPENAI_API_KEY in Vercel; your owner access remains unlocked.' };
  if ([400, 403, 404].includes(status)) return { kind: 'configuration', code: 'model_or_permission_rejected', retryable: false,
    error: 'OpenAI rejected the model, permissions or session settings. Check the app’s OpenAI project and model access.' };
  return { kind: 'service', code: 'provider_unavailable', retryable: true,
    error: 'OpenAI could not complete this request. Wait briefly, then retry.',
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
}

export function readRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 31536000 ? Math.ceil(seconds) : undefined;
}

export async function readOpenAiFailure(response: Response): Promise<OpenAiFailure> {
  const body = await response.json().catch(() => null) as { error?: { code?: unknown; type?: unknown } } | null;
  const retryAfterSeconds = readRetryAfter(response.headers.get('Retry-After'));
  return { ...describeOpenAiFailure(response.status, body?.error, retryAfterSeconds),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
}

export function openAiRetryBlock(failure: OpenAiFailure | null, retryAt: number, now: number, afterAccountUpdate = false): string | null {
  if (retryAt > now) return `OpenAI asked us to wait. Retry in ${Math.ceil((retryAt - now) / 1000)} seconds.`;
  if (failure && !failure.retryable && !afterAccountUpdate) return failure.error;
  return null;
}

/** The browser trusts only the stable categories supplied by our same-origin handler. */
export function parseOpenAiFailure(body: unknown): OpenAiFailure | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const value = body as OpenAiFailure;
  if (!['billing', 'rate-limit', 'limit', 'configuration', 'service'].includes(value.kind) ||
      typeof value.code !== 'string' || typeof value.error !== 'string' || typeof value.retryable !== 'boolean') return undefined;
  return { kind: value.kind, code: value.code, error: value.error, retryable: value.retryable,
    ...(typeof value.retryAfterSeconds === 'number' && Number.isFinite(value.retryAfterSeconds) && value.retryAfterSeconds > 0
      ? { retryAfterSeconds: value.retryAfterSeconds } : {}) };
}
