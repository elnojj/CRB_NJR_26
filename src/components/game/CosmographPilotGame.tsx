/**
 * Cosmograph Pilot — dual-sphere 6DOF flight overlay between HQ and CDE.
 * Continuous ExperienceCanvas remains spatial authority; this is a focused
 * Station-18 training layer with collision bounds and checkpoint targets.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface CosmographPilotGameProps {
  open: boolean;
  onClose: () => void;
}

type Vec3 = { x: number; y: number; z: number };

const HQ: Vec3 = { x: 0, y: 0, z: 0 };
const CDE: Vec3 = { x: 38, y: 4, z: -22 };
const BOUND_RADIUS = 55;
const CHECKPOINTS: Array<{ id: string; label: string; pos: Vec3; radius: number }> = [
  { id: 'cp-hq', label: 'HQ Core', pos: HQ, radius: 4.2 },
  { id: 'cp-bridge', label: 'Bridge Corridor', pos: { x: 19, y: 2, z: -11 }, radius: 3.6 },
  { id: 'cp-cde', label: 'CDE Core', pos: CDE, radius: 4.2 },
];

function len(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function clampToBound(p: Vec3): Vec3 {
  const d = len(p);
  if (d <= BOUND_RADIUS) return p;
  return scale(p, BOUND_RADIUS / d);
}

export const CosmographPilotGame: React.FC<CosmographPilotGameProps> = ({
  open,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const poseRef = useRef({
    pos: { x: 0, y: 2.5, z: 18 } as Vec3,
    yaw: 0,
    pitch: -0.12,
    speed: 0,
  });
  const [score, setScore] = useState(0);
  const [hitIds, setHitIds] = useState<string[]>([]);
  const [hud, setHud] = useState('WASD · fly · Q/E roll climb · Shift boost · Esc exit');
  const rafRef = useRef(0);

  const reset = useCallback(() => {
    poseRef.current = {
      pos: { x: 0, y: 2.5, z: 18 },
      yaw: 0,
      pitch: -0.12,
      speed: 0,
    };
    setScore(0);
    setHitIds([]);
    setHud('Pilot armed · navigate HQ → Bridge → CDE');
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key.toLowerCase() === 'r') reset();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open, onClose, reset]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 960;
      const h = Math.max(360, Math.min(560, (parent?.clientHeight || 520) - 72));
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const keys = keysRef.current;
      const pose = poseRef.current;
      const turn = (Number(!!keys.d) - Number(!!keys.a)) * 1.6 * dt;
      const pitch = (Number(!!keys.s) - Number(!!keys.w)) * 1.1 * dt;
      pose.yaw += turn;
      pose.pitch = Math.max(-1.2, Math.min(1.2, pose.pitch + pitch));
      const boost = keys.shift ? 28 : 14;
      const climb = (Number(!!keys.e) - Number(!!keys.q)) * 10 * dt;
      const forward = {
        x: Math.sin(pose.yaw) * Math.cos(pose.pitch),
        y: Math.sin(pose.pitch),
        z: -Math.cos(pose.yaw) * Math.cos(pose.pitch),
      };
      const throttle = keys[' '] || keys.w || keys.s || keys.a || keys.d || keys.q || keys.e ? 1 : 0.15;
      pose.speed = boost * throttle;
      pose.pos = clampToBound(
        add(pose.pos, {
          x: forward.x * pose.speed * dt,
          y: forward.y * pose.speed * dt + climb,
          z: forward.z * pose.speed * dt,
        })
      );

      const newlyHit: string[] = [];
      for (const cp of CHECKPOINTS) {
        if (hitIds.includes(cp.id)) continue;
        if (len(sub(pose.pos, cp.pos)) <= cp.radius) newlyHit.push(cp.id);
      }
      if (newlyHit.length) {
        setHitIds((prev) => {
          const next = [...prev];
          for (const id of newlyHit) if (!next.includes(id)) next.push(id);
          return next;
        });
        setScore((s) => s + newlyHit.length * 100);
        setHud(
          newlyHit.includes('cp-cde')
            ? 'CDE locked · dual-sphere corridor complete'
            : `Checkpoint · ${newlyHit.map((id) => CHECKPOINTS.find((c) => c.id === id)?.label).join(', ')}`
        );
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const grd = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.5, w * 0.7);
      grd.addColorStop(0, '#142632');
      grd.addColorStop(1, '#0a1218');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      const project = (p: Vec3) => {
        const rel = sub(p, pose.pos);
        const cosY = Math.cos(-pose.yaw);
        const sinY = Math.sin(-pose.yaw);
        const cosP = Math.cos(-pose.pitch);
        const sinP = Math.sin(-pose.pitch);
        const x1 = rel.x * cosY - rel.z * sinY;
        const z1 = rel.x * sinY + rel.z * cosY;
        const y2 = rel.y * cosP - z1 * sinP;
        const z2 = rel.y * sinP + z1 * cosP;
        const depth = Math.max(0.35, z2);
        const f = (h * 0.72) / depth;
        return { x: w * 0.5 + x1 * f, y: h * 0.5 - y2 * f, depth, visible: z2 > 0.2 };
      };

      const drawSphere = (center: Vec3, radius: number, color: string, label: string) => {
        const c = project(center);
        if (!c.visible) return;
        const r = Math.max(6, (radius * (h * 0.72)) / c.depth);
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillStyle = '#F2F6F8';
        ctx.fillText(label, c.x - 14, c.y - r - 8);
      };

      drawSphere(HQ, 8, '#4C8DFF', 'HQ');
      drawSphere(CDE, 8, '#F2B66D', 'CDE');

      // Corridor ribbon
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const p = {
          x: HQ.x + (CDE.x - HQ.x) * t,
          y: HQ.y + (CDE.y - HQ.y) * t + Math.sin(t * Math.PI) * 1.5,
          z: HQ.z + (CDE.z - HQ.z) * t,
        };
        const pr = project(p);
        if (!pr.visible) continue;
        ctx.fillStyle = `rgba(154,255,224,${0.25 + t * 0.45})`;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const cp of CHECKPOINTS) {
        const pr = project(cp.pos);
        if (!pr.visible) continue;
        const cleared = hitIds.includes(cp.id) || newlyHit.includes(cp.id);
        ctx.strokeStyle = cleared ? '#36E88D' : '#FFF1D4';
        ctx.lineWidth = 2;
        const rr = Math.max(5, (cp.radius * (h * 0.55)) / pr.depth);
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = cleared ? '#36E88D' : '#BDCBD3';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(cp.label, pr.x + rr + 4, pr.y);
      }

      // Crosshair
      ctx.strokeStyle = 'rgba(242,246,248,0.55)';
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 10, h * 0.5);
      ctx.lineTo(w * 0.5 + 10, h * 0.5);
      ctx.moveTo(w * 0.5, h * 0.5 - 10);
      ctx.lineTo(w * 0.5, h * 0.5 + 10);
      ctx.stroke();

      // Bound ring warning
      const edge = len(pose.pos) / BOUND_RADIUS;
      if (edge > 0.82) {
        ctx.fillStyle = 'rgba(255,86,102,0.12)';
        ctx.fillRect(0, 0, w, h);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [open, hitIds]);

  if (!open) return null;

  const complete = hitIds.length >= CHECKPOINTS.length;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/90 p-3"
      data-testid="cosmograph-pilot-game"
      role="dialog"
      aria-modal="true"
      aria-label="Cosmograph Pilot"
    >
      <div className="cj-glass-card flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-wider text-[#F2F6F8]">
              Cosmograph Pilot · Dual Sphere
            </h2>
            <p className="font-mono text-[11px] text-[#BDCBD3]">{hud}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#9AFFE0]" data-testid="pilot-score">
              Score {score}
            </span>
            <span className="font-mono text-xs text-[#C5CCD6]">
              {hitIds.length}/{CHECKPOINTS.length} CP
            </span>
            <button
              type="button"
              className="min-h-[40px] rounded-lg border border-white/20 px-3 font-mono text-xs"
              onClick={reset}
            >
              Reset
            </button>
            <button
              type="button"
              className="min-h-[40px] min-w-[40px] rounded-lg border border-white/20 font-mono text-sm"
              onClick={onClose}
              aria-label="Close pilot"
            >
              ×
            </button>
          </div>
        </div>
        <div className="relative bg-[#0a1218]">
          <canvas ref={canvasRef} className="block w-full" />
          {complete && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <div className="rounded-full border border-[#36E88D]/40 bg-black/70 px-4 py-2 font-mono text-xs text-[#36E88D]">
                Corridor cleared · continuous canvas remains spatial authority
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-white/10 px-4 py-2 font-mono text-[11px] text-[#BDCBD3]">
          <span>Bound radius {BOUND_RADIUS}u</span>
          <span>Collision soft-clamp on outer shell</span>
          <span>R reset · Esc exit</span>
        </div>
      </div>
    </div>
  );
};

export default CosmographPilotGame;
