/**
 * Procedural identity tokens for anything that has no approved media. A token is drawn from the node's
 * own name, type and accent colour, so every node and every empty tube slot is visible and recognisable
 * without inventing a picture. Tokens are never presented as photos or footage: media slots say
 * "awaiting media" on the face, nodes show initials and a type glyph.
 */

export type TokenNodeType = 'core' | 'station' | 'dimension' | 'subdomain' | 'project';
export type TokenMediaKind = 'image' | 'video' | 'pdf';
export type TokenGlyph = 'core' | 'hexagon' | 'diamond' | 'triad' | 'frame' | 'play' | 'page';

const MONO = '600 {px}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export function tokenGlyphForNode(nodeType: TokenNodeType): TokenGlyph {
  switch (nodeType) {
    case 'core':
      return 'core';
    case 'station':
      return 'hexagon';
    case 'dimension':
      return 'diamond';
    case 'subdomain':
      return 'triad';
    case 'project':
      return 'frame';
    default: {
      const unreachable: never = nodeType;
      return unreachable;
    }
  }
}

export function tokenGlyphForMedia(kind: TokenMediaKind): TokenGlyph {
  switch (kind) {
    case 'video':
      return 'play';
    case 'pdf':
      return 'page';
    case 'image':
      return 'frame';
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

/** Up to two capital letters taken from the first words of a label; digits survive ("Station 18" -> "S1"). */
export function tokenInitials(label: string): string {
  const words = label
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  if (words.length === 0) return '·';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function glyphPath(ctx: CanvasRenderingContext2D, glyph: TokenGlyph, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  switch (glyph) {
    case 'core':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.moveTo(cx + r * 0.45, cy);
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i += 1) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      break;
    case 'triad':
      for (let i = 0; i < 3; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'frame':
      ctx.rect(cx - r, cy - r * 0.72, r * 2, r * 1.44);
      ctx.moveTo(cx - r * 0.7, cy + r * 0.4);
      ctx.lineTo(cx - r * 0.2, cy - r * 0.1);
      ctx.lineTo(cx + r * 0.15, cy + r * 0.25);
      ctx.lineTo(cx + r * 0.4, cy);
      ctx.lineTo(cx + r * 0.7, cy + r * 0.4);
      break;
    case 'play':
      ctx.moveTo(cx - r * 0.55, cy - r * 0.8);
      ctx.lineTo(cx + r * 0.85, cy);
      ctx.lineTo(cx - r * 0.55, cy + r * 0.8);
      ctx.closePath();
      break;
    case 'page':
      ctx.moveTo(cx - r * 0.65, cy - r);
      ctx.lineTo(cx + r * 0.25, cy - r);
      ctx.lineTo(cx + r * 0.65, cy - r * 0.55);
      ctx.lineTo(cx + r * 0.65, cy + r);
      ctx.lineTo(cx - r * 0.65, cy + r);
      ctx.closePath();
      ctx.moveTo(cx - r * 0.3, cy);
      ctx.lineTo(cx + r * 0.3, cy);
      ctx.moveTo(cx - r * 0.3, cy + r * 0.4);
      ctx.lineTo(cx + r * 0.3, cy + r * 0.4);
      break;
    default: {
      const unreachable: never = glyph;
      throw new Error(`Unhandled glyph ${String(unreachable)}`);
    }
  }
}

export function drawTokenGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: TokenGlyph,
  cx: number,
  cy: number,
  r: number,
  color: string,
  lineWidth: number
): void {
  glyphPath(ctx, glyph, cx, cy, r);
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
  if (glyph === 'play') {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export interface NodeTokenSpec {
  accentCss: string;
  nodeType: TokenNodeType;
  label: string;
}

/**
 * Circular glass-disc token for a node without a still image. Transparent outside the disc so it can
 * drive a sprite's alpha test, like the photo medallions it stands in for.
 */
export function paintNodeToken(ctx: CanvasRenderingContext2D, size: number, spec: NodeTokenSpec): void {
  const half = size / 2;
  const radius = half - 10;
  ctx.clearRect(0, 0, size, size);

  const body = ctx.createRadialGradient(half * 0.78, half * 0.66, size * 0.03, half, half, half);
  body.addColorStop(0, '#f4f9ff');
  body.addColorStop(0.28, spec.accentCss);
  body.addColorStop(0.78, '#0d1d3a');
  body.addColorStop(1, '#050b18');
  ctx.beginPath();
  ctx.arc(half, half, radius, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(half, half, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(half + i * size * 0.12 - size, size);
    ctx.lineTo(half + i * size * 0.12 + size, -size * 0.2);
    ctx.stroke();
  }
  ctx.restore();

  drawTokenGlyph(ctx, tokenGlyphForNode(spec.nodeType), half, size * 0.3, size * 0.075, 'rgba(255,255,255,0.88)', size * 0.012);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = MONO.replace('{px}', String(Math.round(size * 0.27)));
  ctx.shadowColor = 'rgba(2,8,20,0.7)';
  ctx.shadowBlur = size * 0.03;
  ctx.fillText(tokenInitials(spec.label), half, half + size * 0.07);
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(half, half, radius, 0, Math.PI * 2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = spec.accentCss;
  ctx.stroke();
}

export interface MediaSlotTokenSpec {
  kind: TokenMediaKind;
  accentHex: string;
  /** 1-based slot number shown on the face. */
  slot: number;
}

/** Face of the token that marks a tube slot with no approved media. */
export function paintMediaSlotToken(ctx: CanvasRenderingContext2D, size: number, spec: MediaSlotTokenSpec): void {
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);

  const body = ctx.createRadialGradient(half, half * 0.8, size * 0.04, half, half, half);
  body.addColorStop(0, 'rgba(34,60,98,0.92)');
  body.addColorStop(0.7, 'rgba(10,22,44,0.94)');
  body.addColorStop(1, 'rgba(5,11,24,0.96)');
  ctx.beginPath();
  ctx.arc(half, half, half - 6, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.lineWidth = size * 0.02;
  ctx.strokeStyle = spec.accentHex;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(half, half, half - 6 - size * 0.01, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawTokenGlyph(ctx, tokenGlyphForMedia(spec.kind), half, half - size * 0.05, size * 0.15, '#f2f6f8', size * 0.026);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(214,230,250,0.95)';
  ctx.font = MONO.replace('{px}', String(Math.round(size * 0.07)));
  ctx.fillText(`SLOT ${String(spec.slot).padStart(2, '0')}`, half, half + size * 0.19);
  ctx.fillStyle = 'rgba(160,190,226,0.8)';
  ctx.font = MONO.replace('{px}', String(Math.round(size * 0.052)));
  ctx.fillText('AWAITING MEDIA', half, half + size * 0.29);
}

/** Thin tick ring that turns slowly around a slot token. Shared by every slot. */
export function paintTokenRing(ctx: CanvasRenderingContext2D, size: number, accentHex: string): void {
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);
  const ticks = 48;
  for (let i = 0; i < ticks; i += 1) {
    const a = (i / ticks) * Math.PI * 2;
    const major = i % 6 === 0;
    const r0 = half - 6 - (major ? size * 0.045 : size * 0.022);
    const r1 = half - 6;
    ctx.beginPath();
    ctx.moveTo(half + Math.cos(a) * r0, half + Math.sin(a) * r0);
    ctx.lineTo(half + Math.cos(a) * r1, half + Math.sin(a) * r1);
    ctx.lineWidth = major ? size * 0.012 : size * 0.007;
    ctx.strokeStyle = accentHex;
    ctx.globalAlpha = major ? 0.95 : 0.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const tokenUrlCache = new Map<string, string>();

/** PNG data URL of a node token for DOM lists. Browser only; memoised per label, type and accent. */
export function nodeTokenDataUrl(spec: NodeTokenSpec, size = 128): string {
  const key = `${spec.nodeType}|${spec.accentCss}|${spec.label}|${size}`;
  const cached = tokenUrlCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  paintNodeToken(ctx, size, spec);
  const url = canvas.toDataURL('image/png');
  tokenUrlCache.set(key, url);
  return url;
}
