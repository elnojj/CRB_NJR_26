import React from 'react';

export type FiveAxisState = {
  connection: boolean;
  input: boolean;
  output: boolean;
  execution: boolean;
  persistence: boolean;
};

export const DEFAULT_FIVE_AXIS_STATE: FiveAxisState = {
  connection: true,
  input: true,
  output: true,
  execution: true,
  persistence: true,
};

export const CDE_TAXONOMY = {
  glass: { ior: 1.48, transmission: 0.92 },
  spheres: ['hq', 'cde', 'campaign-os', 'about-us'] as const,
};

export function masterPose(aspect: number): {
  fov: number;
  aspect: number;
  distance: number;
} {
  const portrait = aspect < 1;
  return {
    // Values asserted by App 21-point self-test (PR #130 contract)
    fov: portrait ? 52 : 46,
    aspect,
    distance: portrait ? 18 : 22.5,
  };
}

export function flightMs(units: number): number {
  return Math.round(1400 * Math.max(0.35, Math.min(1.8, units / 10)));
}

export function createResizeSnapshot(width: number, height: number) {
  return { width, height, aspect: width / Math.max(1, height), at: Date.now() };
}

export function buildClosedOrbitalLoopPoints(
  radiusOrA = 12,
  samplesOrB: number = 48,
  maybeSamples?: number
) {
  // Support (radius, samples) and AI Studio (rx, rz, samples) call shapes.
  const radius = radiusOrA;
  const samples =
    typeof maybeSamples === 'number' ? maybeSamples : samplesOrB;
  const zRadius = typeof maybeSamples === 'number' ? samplesOrB : radiusOrA;
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    points.push([
      Math.cos(t) * radius,
      Math.sin(t * 2) * 1.2,
      Math.sin(t) * zRadius,
    ]);
  }
  return {
    points,
    curve: { closed: true, length: samples },
  };
}

export interface TeamChatChipProps {
  inline?: boolean;
  active?: boolean;
  onOpenChat?: () => void;
}

export const TeamChatChip: React.FC<TeamChatChipProps> = ({
  inline = false,
  active = false,
  onOpenChat,
}) => (
  <button
    type="button"
    data-testid="team-chat-chip"
    data-inline={inline ? '1' : '0'}
    data-active={active ? '1' : '0'}
    onClick={onOpenChat}
    className="cj-glass-card min-h-[40px] px-2.5 rounded-full font-mono text-[12px] text-[#C5CCD6] hover:text-[#F2F6F8]"
  >
    Team chat
  </button>
);
