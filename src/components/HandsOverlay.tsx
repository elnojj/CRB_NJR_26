import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { soundEngine } from '../utils/soundEngine';
import {
  getSharedWebcamStream,
  forceStopSharedWebcamStream,
  releaseSharedWebcamStream,
} from '../utils/deviceStreamCoordinator';
import { handControlBridge } from '../three/handControlBridge';
import {
  FINGERTIP_LANDMARKS,
  FINGER_MCP_LANDMARKS,
  HandGestureEngine,
  computeHandMetrics,
  type HandControlFrame,
  type HandPosture,
  type ScreenPoint,
} from './handGestures';

class LowPassFilter {
  y: number | null = null;
  s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null || this.s === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.s = alpha * value + (1 - alpha) * this.s;
    this.y = value;
    return this.s;
  }
}

export class OneEuroFilter {
  private freq: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(freq = 60, minCutoff = 1.35, beta = 0.045, dCutoff = 1.0) {
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number): number {
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestampMs: number): number {
    if (this.lastTime !== null && timestampMs > this.lastTime) {
      this.freq = 1000.0 / Math.max(1, timestampMs - this.lastTime);
    }
    this.lastTime = timestampMs;

    const prevX = this.xFilter.s;
    const dx = prevX === null ? 0 : (value - prevX) * this.freq;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(value, this.alpha(cutoff));
  }
}

export type HandDetectionMode = 'two-hands' | 'left-only' | 'right-only';
export type HandFlipDirection = -1 | 1;

interface HandsOverlayProps {
  active: boolean;
  handMode: HandDetectionMode;
  onCloseHands: () => void;
  /** Hand moved far enough (grab-and-twist, or a sideways throw) to switch to the neighbouring node. */
  onFlipNode?: (direction: HandFlipDirection) => void;
  /** Fired when landmarks disappear after a live track (R01 gesture-loss settle). */
  onTrackingLost?: () => void;
  /** Fired when landmarks reappear after a loss. */
  onTrackingAcquired?: () => void;
  /** Pixels from viewport bottom reserved for Voice capsule + utility bar. */
  dockClearancePx?: number;
}

type TrackerStatus = 'camera' | 'model' | 'searching' | 'tracking' | 'error';

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

interface HandView {
  /** One entry per detected hand: 21 points in viewport pixels. */
  hands: ScreenPoint[][];
  posture: HandPosture;
  throwAt: number;
  trail: TrailPoint[];
}

const BONES: number[][] = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20],
  [5, 9, 13, 17],
];
const PALM_JOINTS = [0, 1, 5, 9, 13, 17];
const TRAIL_MS = 520;
const THROW_FLASH_MS = 650;
const THROW_NODE_DELAY_MS = 240;
const DETECT_FLOOR_DESKTOP_MS = 33;
const DETECT_FLOOR_PHONE_MS = 40;
const DETECT_CEIL_MS = 120;
const LOST_GRACE_MS = 150;

const POSTURE_LABEL: Record<HandPosture, string> = {
  none: 'HAND',
  open: 'OPEN · pan',
  point: 'POINT · pan',
  claw: 'CLAW · zooming out',
  grab: 'GRAB · orbit',
};

function statusText(status: TrackerStatus, detail: string): string {
  switch (status) {
    case 'camera':
      return 'Requesting camera…';
    case 'model':
      return 'Loading hand model…';
    case 'searching':
      return 'Show your hand to the camera';
    case 'tracking':
      return 'Hand tracking live';
    case 'error':
      return detail;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * HandsCameraBackdrop is now a lightweight decorative layer;
 * the actual single shared camera MediaStream and mirrored <video> element live inside HandsWireframeRig
 * so getUserMedia is called at most ONCE when Hands is activated.
 */
export const HandsCameraBackdrop: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return null;
};

export const HandsWireframeRig: React.FC<HandsOverlayProps> = ({
  active,
  handMode,
  onCloseHands,
  onFlipNode,
  onTrackingLost,
  onTrackingAcquired,
  dockClearancePx = 148,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<TrackerStatus>('camera');
  const [statusDetail, setStatusDetail] = useState('');
  const [view, setView] = useState<HandView | null>(null);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1366,
    h: typeof window !== 'undefined' ? window.innerHeight : 1024,
  }));
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const wantedHands = handMode === 'two-hands' ? 2 : 1;

  // Parent passes inline callbacks; keep them out of the camera effect deps so an
  // App re-render never tears down and re-acquires the webcam.
  const onCloseHandsRef = useRef(onCloseHands);
  const onFlipNodeRef = useRef(onFlipNode);
  const onTrackingLostRef = useRef(onTrackingLost);
  const onTrackingAcquiredRef = useRef(onTrackingAcquired);
  onCloseHandsRef.current = onCloseHands;
  onFlipNodeRef.current = onFlipNode;
  onTrackingLostRef.current = onTrackingLost;
  onTrackingAcquiredRef.current = onTrackingAcquired;

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setView(null);
      handControlBridge.reset();
      return;
    }

    let cancelled = false;
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let hadLiveTrack = false;
    let throwTimer = 0;
    const phone = window.matchMedia('(max-width: 767px)').matches;

    const engine = new HandGestureEngine(640, 480);
    const filters: OneEuroFilter[][] = [];
    const trail: TrailPoint[] = [];
    let throwAt = 0;
    let lastSeenAt = 0;
    let lastVideoTime = -1;
    let lastDetectAt = 0;
    let detectInterval = phone ? DETECT_FLOOR_PHONE_MS : DETECT_FLOOR_DESKTOP_MS;

    const ensureFilters = (handCount: number) => {
      while (filters.length < handCount) {
        filters.push(Array.from({ length: 42 }, () => new OneEuroFilter(30, 1.8, 0.06, 1.0)));
      }
    };

    const markLost = () => {
      engine.reset();
      handControlBridge.push(engine.update(null, performance.now()), performance.now());
      filters.length = 0;
      trail.length = 0;
      setView(null);
      setStatus('searching');
      if (hadLiveTrack) {
        hadLiveTrack = false;
        onTrackingLostRef.current?.();
      }
    };

    const emitFlip = (frame: HandControlFrame) => {
      if (frame.flip !== 0) {
        soundEngine.playNodeSelect(0);
        onFlipNodeRef.current?.(frame.flip);
      }
      if (frame.throw) {
        const { vx, vy } = frame.throw;
        throwAt = frame.tMs;
        soundEngine.playFlightWhoosh(550, Math.max(-1, Math.min(1, vx)));
        if (Math.abs(vx) > Math.abs(vy)) {
          const dir: HandFlipDirection = vx > 0 ? 1 : -1;
          window.clearTimeout(throwTimer);
          throwTimer = window.setTimeout(() => {
            if (!cancelled) onFlipNodeRef.current?.(dir);
          }, THROW_NODE_DELAY_MS);
        }
      }
    };

    async function initSharedCameraAndMediaPipe() {
      setStatus('camera');
      try {
        stream = await getSharedWebcamStream({
          video: phone
            ? {
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { ideal: 30, max: 30 },
                facingMode: 'user',
              }
            : {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30, max: 60 },
                facingMode: 'user',
              },
        });
      } catch (err) {
        if (!cancelled) {
          const detail =
            err && typeof err === 'object' && 'message' in err
              ? String((err as Error).message)
              : 'Camera permission denied';
          // In-flight cancel from a deliberate toggle-off is not a permission failure.
          if (/cancelled/i.test(detail)) {
            setStatus('error');
            setStatusDetail('Camera off');
            onTrackingLostRef.current?.();
            return;
          }
          setStatus('error');
          setStatusDetail('Camera blocked — touch orbit restored');
          onTrackingLostRef.current?.();
          onCloseHandsRef.current();
        }
        return;
      }

      if (cancelled) {
        releaseSharedWebcamStream();
        return;
      }

      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.playsInline = true;
        videoEl.muted = true;
        await videoEl.play().catch(() => {});
      }

      try {
        setStatus('model');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
        );
        if (cancelled) return;
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            // Always CPU/WASM — isolate MediaPipe from Three.js WebGL to avoid GPU stalls.
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: wantedHands,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) return;
        setStatus('searching');

        const detectFrame = () => {
          if (cancelled || !landmarker) return;
          rafId = requestAnimationFrame(detectFrame);
          const v = videoRef.current;
          if (!v || v.readyState < 2 || v.videoWidth === 0) return;
          const now = performance.now();
          if (now - lastDetectAt < detectInterval) return;
          // Skip frames the camera has not refreshed yet — inference on a duplicate is wasted budget.
          if (v.currentTime === lastVideoTime) return;
          lastVideoTime = v.currentTime;
          lastDetectAt = now;

          let res: ReturnType<HandLandmarker['detectForVideo']>;
          try {
            res = landmarker.detectForVideo(v, now);
          } catch {
            return;
          }
          const cost = performance.now() - now;
          const floor = phone ? DETECT_FLOOR_PHONE_MS : DETECT_FLOOR_DESKTOP_MS;
          detectInterval = Math.min(DETECT_CEIL_MS, Math.max(floor, cost * 1.5));

          const t = performance.now();
          if (!res.landmarks || res.landmarks.length === 0) {
            if (lastSeenAt > 0 && t - lastSeenAt > LOST_GRACE_MS) {
              lastSeenAt = 0;
              markLost();
            }
            return;
          }

          lastSeenAt = t;
          const vw = v.videoWidth;
          const vh = v.videoHeight;
          engine.setViewport(vw, vh);
          const hands = res.landmarks.slice(0, wantedHands);
          ensureFilters(hands.length);
          const camHands: ScreenPoint[][] = hands.map((hand, hi) =>
            hand.map((lm, li) => ({
              x: filters[hi][li * 2].filter((1 - lm.x) * vw, t),
              y: filters[hi][li * 2 + 1].filter(lm.y * vh, t),
            }))
          );

          const frame = engine.update(camHands[0], t);
          handControlBridge.push(frame, t);
          emitFlip(frame);

          if (!hadLiveTrack) {
            hadLiveTrack = true;
            onTrackingAcquiredRef.current?.();
          }

          const vp = viewportRef.current;
          const scale = Math.max(vp.w / vw, vp.h / vh);
          const ox = (vp.w - vw * scale) / 2;
          const oy = (vp.h - vh * scale) / 2;
          const toScreen = (p: ScreenPoint): ScreenPoint => ({
            x: p.x * scale + ox,
            y: p.y * scale + oy,
          });
          const palm = toScreen(computeHandMetrics(camHands[0]).palm);
          trail.push({ x: palm.x, y: palm.y, t });
          while (trail.length > 0 && t - trail[0].t > TRAIL_MS) trail.shift();

          setStatus('tracking');
          setView({
            hands: camHands.map((h) => h.map(toScreen)),
            posture: frame.posture,
            throwAt,
            trail: trail.slice(),
          });
        };
        rafId = requestAnimationFrame(detectFrame);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setStatusDetail('Hand model unavailable — touch orbit still works');
          setView(null);
          onTrackingLostRef.current?.();
        }
      }
    }

    void initSharedCameraAndMediaPipe();

    return () => {
      cancelled = true;
      window.clearTimeout(throwTimer);
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
      // Force-stop so iOS Safari clears the green camera indicator even if refcount races.
      forceStopSharedWebcamStream();
      releaseSharedWebcamStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (landmarker) {
        try {
          landmarker.close();
        } catch {
          // ignore
        }
      }
      handControlBridge.reset();
      if (hadLiveTrack) {
        hadLiveTrack = false;
        onTrackingLostRef.current?.();
      }
    };
  }, [active, wantedHands]);

  if (!active) return null;

  const renderHand = (pts: ScreenPoint[], hi: number, posture: HandPosture, primary: boolean) => {
    const chain = (indices: number[]) =>
      indices
        .map((i, n) => `${n === 0 ? 'M' : 'L'} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`)
        .join(' ');
    const tips = FINGERTIP_LANDMARKS.map((i) => pts[i]);
    const hull = tips.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const converged = primary && (posture === 'claw' || posture === 'grab');
    const tipR = isPhone ? 6 : 7;
    return (
      <g key={`hand-${hi}`} className="cerebro-hands-track" opacity={primary ? 1 : 0.6}>
        {BONES.map((indices, bi) => (
          <path
            key={`bone-${bi}`}
            className="bone"
            d={chain(indices)}
            strokeWidth={isPhone ? 2 : 2.4}
            strokeOpacity={0.7}
          />
        ))}
        {converged &&
          FINGER_MCP_LANDMARKS.map((mcp, n) => (
            <line
              key={`base-${mcp}`}
              className="pinch-chord"
              x1={pts[mcp].x}
              y1={pts[mcp].y}
              x2={tips[n].x}
              y2={tips[n].y}
              strokeWidth={1.6}
            />
          ))}
        <polygon
          points={hull}
          fill={converged ? 'var(--token-tracking-valid)' : 'none'}
          fillOpacity={converged ? 0.16 : 0}
          stroke={converged ? 'var(--token-tracking-valid)' : 'var(--token-focus-glow)'}
          strokeOpacity={converged ? 0.95 : 0.45}
          strokeWidth={converged ? 2.4 : 1.4}
          strokeDasharray={converged ? undefined : '5 6'}
          strokeLinejoin="round"
        />
        {PALM_JOINTS.map((idx) => (
          <circle key={`joint-${idx}`} className="joint" cx={pts[idx].x} cy={pts[idx].y} r={isPhone ? 3.5 : 4} />
        ))}
        {FINGERTIP_LANDMARKS.map((idx) => (
          <g key={`tip-${idx}`}>
            <circle cx={pts[idx].x} cy={pts[idx].y} r={tipR + 5} fill="var(--token-focus-glow)" fillOpacity={0.18} />
            <circle className="tip" cx={pts[idx].x} cy={pts[idx].y} r={tipR} fillOpacity={1} />
          </g>
        ))}
      </g>
    );
  };

  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const trailPts = view ? view.trail.filter((p) => now - p.t <= TRAIL_MS) : [];
  const throwFlash = view !== null && now - view.throwAt <= THROW_FLASH_MS;
  const postureLabel = view ? (throwFlash ? 'THROW' : POSTURE_LABEL[view.posture]) : null;
  const palmAnchor = view ? view.hands[0][9] : null;
  const chipTone =
    status === 'tracking'
      ? 'var(--token-tracking-valid)'
      : status === 'error'
        ? '#FF8A8A'
        : 'var(--token-focus-glow)';

  return (
    <div className="fixed inset-0 z-[15] pointer-events-none select-none" data-testid="hands-gesture-hud">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${viewport.w} ${viewport.h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {trailPts.length > 1 && (
          <polyline
            points={trailPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke={throwFlash ? 'var(--token-tracking-valid)' : 'var(--token-focus-glow)'}
            strokeOpacity={throwFlash ? 0.9 : 0.4}
            strokeWidth={throwFlash ? 5 : 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {view && view.hands.map((pts, hi) => renderHand(pts, hi, view.posture, hi === 0))}
        {view && palmAnchor && postureLabel && (
          <g transform={`translate(${palmAnchor.x.toFixed(1)} ${(palmAnchor.y + 54).toFixed(1)})`}>
            <rect
              x={-(postureLabel.length * 4.6 + 12)}
              y={-13}
              width={postureLabel.length * 9.2 + 24}
              height={26}
              rx={13}
              fill="rgba(6, 12, 24, 0.72)"
              stroke="var(--token-focus-glow)"
              strokeOpacity={0.5}
            />
            <text
              textAnchor="middle"
              y={4}
              fontSize={12}
              letterSpacing="0.08em"
              fill="var(--token-focus-glow)"
              style={{ fontFamily: 'inherit' }}
            >
              {postureLabel}
            </text>
          </g>
        )}
      </svg>

      <div
        className="absolute flex items-end gap-2"
        style={{ left: 12, bottom: dockClearancePx + 8 }}
      >
        <div
          className="overflow-hidden rounded-lg"
          style={{
            width: isPhone ? 96 : 120,
            height: isPhone ? 72 : 90,
            border: `1px solid ${chipTone}`,
            background: 'rgba(6, 12, 24, 0.8)',
            opacity: 0.92,
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            controls={false}
            disablePictureInPicture
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        </div>
        <p
          className="rounded-full px-3 py-1 text-[11px] tracking-wide"
          style={{
            color: chipTone,
            background: 'rgba(6, 12, 24, 0.72)',
            border: `1px solid ${chipTone}`,
          }}
          aria-live="polite"
        >
          {statusText(status, statusDetail)}
        </p>
      </div>
    </div>
  );
};
