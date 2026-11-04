import { CRO_CDE_GOOGLE_TOOLS_SCHEMA } from '../voice/cerebroAgentManifest';

/** One registry and one executor for both providers. Preserve all 27 signatures. */
export function buildOpenAiRealtimeTools() {
  return CRO_CDE_GOOGLE_TOOLS_SCHEMA.map(({ name, description, parameters }) => ({
    type: 'function' as const,
    name,
    description,
    parameters,
  }));
}

/** Validate function arguments before the existing typed action dispatcher sees them. */
export function parseRealtimeToolArguments(name: string, raw: string): Record<string, unknown> {
  const tool = CRO_CDE_GOOGLE_TOOLS_SCHEMA.find(tool => tool.name === name);
  if (!tool) throw new Error(`Unknown Cerebro tool: ${name}`);
  const value: unknown = JSON.parse(raw || '{}');
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Tool arguments must be an object.');
  }
  const parameters = value as Record<string, unknown>;
  const schema = tool.parameters as {
    required?: readonly string[];
    properties: Record<string, { type: string; enum?: readonly unknown[] }>;
  };
  for (const key of schema.required || []) {
    if (!(key in parameters)) throw new Error(`Missing required parameter: ${key}`);
  }
  for (const [key, value] of Object.entries(parameters)) {
    const rule = schema.properties[key];
    if (!rule) throw new Error(`Unknown parameter: ${key}`);
    if (value === null || typeof value !== rule.type || Array.isArray(value)) {
      throw new Error(`Invalid parameter type: ${key}`);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Invalid parameter value: ${key}`);
    if (rule.enum && !rule.enum.includes(value)) throw new Error(`Invalid parameter value: ${key}`);
  }
  return parameters;
}
