import { CRO_CDE_GOOGLE_TOOLS_SCHEMA } from '../data/croCdeGoogleAgentManifest';

export type DomainMaterialPreset =
  | 'cobalt-glass'
  | 'amber-crystal'
  | 'emerald-plasma'
  | 'wireframe-obsidian'
  | 'pearl-iridescent';

export interface CustomDomain3D {
  id: string;
  name: string;
  sphere: 'hq' | 'cde';
  colour: string;
  parentNodeId: string;
  position: [number, number, number];
  materialPreset: DomainMaterialPreset;
  createdAt: string;
}

export interface ScreenElementAmendment {
  elementId: string;
  operation: 'set_text' | 'set_filter' | 'highlight' | 'switch_view';
  value: string;
  timestamp: string;
}

export interface GeminiOrchestrationResponse {
  ok: boolean;
  replyText: string;
  toolCalls: {
    name: string;
    args: Record<string, unknown>;
  }[];
  error?: string;
}

/**
 * Deterministic position generator inside the 6.2u sphere radius so newly spawned
 * 3D domains (`create_domain`) never collide with the core or outer shell.
 */
export function computeNewDomainPosition(index: number, sphere: 'hq' | 'cde'): [number, number, number] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = goldenAngle * (index + 7);
  const y = 1 - ((index % 7) / 6) * 1.4 - 0.3;
  const radiusAtY = Math.sqrt(Math.max(0.2, 1 - y * y));
  const r = sphere === 'hq' ? 4.4 : 4.6;
  const x = Math.cos(theta) * radiusAtY * r;
  const z = Math.sin(theta) * radiusAtY * r;
  return [Number(x.toFixed(2)), Number((y * 3.6).toFixed(2)), Number(z.toFixed(2))];
}

/**
 * Maps a material preset to locked Neural Observatory v1.1 hex & rim colours
 * (Strictly zero purple/gold; #9AFFE0 reserved for Voice Orb; #FF5666 reserved for Blocked/Error).
 */
export function getDomainMaterialColors(preset: DomainMaterialPreset): {
  shellHex: string;
  rimHex: string;
  transmission: number;
  roughness: number;
  wireframeOnly: boolean;
} {
  switch (preset) {
    case 'cobalt-glass':
      return {
        shellHex: '#4C8DFF',
        rimHex: '#B4DDFF',
        transmission: 0.88,
        roughness: 0.06,
        wireframeOnly: false,
      };
    case 'amber-crystal':
      return {
        shellHex: '#F2B66D',
        rimHex: '#FFF1D4',
        transmission: 0.84,
        roughness: 0.08,
        wireframeOnly: false,
      };
    case 'emerald-plasma':
      return {
        shellHex: '#7CE0B8',
        rimHex: '#5CC8D7',
        transmission: 0.82,
        roughness: 0.12,
        wireframeOnly: false,
      };
    case 'wireframe-obsidian':
      return {
        shellHex: '#142632',
        rimHex: '#65ACFF',
        transmission: 0.35,
        roughness: 0.22,
        wireframeOnly: true,
      };
    case 'pearl-iridescent':
      return {
        shellHex: '#9DB8D6',
        rimHex: '#F2F6F8',
        transmission: 0.86,
        roughness: 0.09,
        wireframeOnly: false,
      };
  }
}

/**
 * Bridges ElevenLabs (`Cro-cde-google`) & natural-language spatial commands to the
 * server-side Gemini Live Screen Orchestrator (`/api/gemini/orchestrate`), returning
 * structured 22-tool invocations grounded in `get_page_state()`.
 */
export async function orchestrateScreenCommandWithGemini(
  commandText: string,
  pageState: Record<string, unknown>
): Promise<GeminiOrchestrationResponse> {
  try {
    const response = await fetch('/api/gemini/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: commandText,
        pageState,
        availableTools: CRO_CDE_GOOGLE_TOOLS_SCHEMA.map((t) => t.name),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        replyText: data?.error || 'Screen orchestrator unavailable.',
        toolCalls: [],
        error: data?.error,
      };
    }
    return {
      ok: true,
      replyText: data.replyText || 'Executed spatial screen update.',
      toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
    };
  } catch (err: unknown) {
    return {
      ok: false,
      replyText: err instanceof Error ? err.message : 'Network error calling Gemini orchestrator',
      toolCalls: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
