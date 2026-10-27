import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { COLOUR_TOKENS } from '../tokens/colours';
import { soundEngine } from '../utils/soundEngine';

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
export type HandGestureType = 'pinch-orbit' | 'spread-zoom' | 'palm-stop' | 'point-select';

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  colour: string;
}

interface HandsOverlayProps {
  active: boolean;
  handMode: HandDetectionMode;
  activeGesture: HandGestureType;
  onChangeHandMode: (mode: HandDetectionMode) => void;
  onTriggerGesture: (gesture: HandGestureType) => void;
  onCloseHands: () => void;
}

const BASE_LEFT_LANDMARKS: [number, number][] = [
  [0, 0],
  [-50, -32], [-80, -65], [-98, -96], [-109, -124],
  [-40, -115], [-45, -165], [-49, -205], [-51, -244],
  [0, -126], [0, -182], [0, -228], [0, -267],
  [37, -112], [43, -165], [47, -206], [48, -240],
  [65, -89], [82, -130], [92, -162], [100, -186],
];

const BONE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [17, 0],
];

const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20]);

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
  activeGesture,
  onChangeHandMode,
  onTriggerGesture,
  onCloseHands,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const filterXRef = useRef(new OneEuroFilter(60, 1.4, 0.05));
  const filterYRef = useRef(new OneEuroFilter(60, 1.4, 0.05));
  const [offset, setOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [hasLiveCam, setHasLiveCam] = useState(false);
  const [cvStatusLabel, setCvStatusLabel] = useState<string>('Requesting camera...');
  const [pinchRatio, setPinchRatio] = useState<number>(0.19);
  const [pinchLocked, setPinchLocked] = useState<boolean>(true);
  const [zDepth, setZDepth] = useState<number>(-0.14);
  const [liveLandmarks, setLiveLandmarks] = useState<[number, number][][] | null>(null);
  const nextSparkleId = useRef(1);
  const pinchLockRef = useRef(true);

  // Request ONE shared camera MediaStream only when `active === true`, and stop all tracks on disable
  useEffect(() => {
    if (!active) {
      setHasLiveCam(false);
      setLiveLandmarks(null);
      return;
    }

    let cancelled = false;
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let rafId = 0;

    async function initSharedCameraAndMediaPipe() {
      setCvStatusLabel('Requesting camera permission...');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 540, facingMode: 'user' },
        });
      } catch {
        if (!cancelled) {
          setHasLiveCam(false);
          setCvStatusLabel('Camera permission denied — touch/mouse fallback active');
          setLiveLandmarks(null);
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.playsInline = true;
        videoEl.muted = true;
        await videoEl.play().catch(() => {});
        setHasLiveCam(true);
      }

      try {
        setCvStatusLabel('Loading MediaPipe HandLandmarker GPU...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        if (cancelled) return;
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
        if (cancelled) return;
        setCvStatusLabel('Tracking active (MediaPipe GPU · 1 shared stream)');

        const detectFrame = () => {
          if (cancelled || !landmarker || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState >= 2) {
            const now = performance.now();
            const res = landmarker.detectForVideo(v, now);
            if (res.landmarks && res.landmarks.length > 0) {
              const mappedHands: [number, number][][] = res.landmarks.map((hand) =>
                hand.map((lm) => [(1 - lm.x) * 1366, lm.y * 1024])
              );
              setLiveLandmarks(mappedHands);

              const h0 = res.landmarks[0];
              const palmLen = Math.max(
                0.05,
                Math.hypot(h0[9].x - h0[0].x, h0[9].y - h0[0].y, h0[9].z - h0[0].z)
              );
              const thumbIndexDist = Math.hypot(
                h0[4].x - h0[8].x,
                h0[4].y - h0[8].y,
                h0[4].z - h0[8].z
              );
              const ratio = Number((thumbIndexDist / palmLen).toFixed(2));
              setPinchRatio(ratio);
              setZDepth(Number((h0[8].z || -0.12).toFixed(2)));

              if (!pinchLockRef.current && ratio <= 0.22) {
                pinchLockRef.current = true;
                setPinchLocked(true);
                const panX = ((1 - h0[8].x) - 0.5) * 2;
                const played = soundEngine.playFingertipNote(1, panX);
                setActiveNote(`${played.name} (${played.freq}Hz)`);
                onTriggerGesture('pinch-orbit');
              } else if (pinchLockRef.current && ratio >= 0.3) {
                pinchLockRef.current = false;
                setPinchLocked(false);
              }
            } else {
              setLiveLandmarks(null);
            }
          }
          rafId = requestAnimationFrame(detectFrame);
        };
        rafId = requestAnimationFrame(detectFrame);
      } catch {
        if (!cancelled) {
          setCvStatusLabel('Camera active · Touch/mouse gesture fallback');
          setLiveLandmarks(null);
        }
      }
    }

    initSharedCameraAndMediaPipe();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
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
    };
  }, [active, onTriggerGesture]);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      setSparkles((prev) =>
        prev
          .map((s) => ({ ...s, opacity: s.opacity - 0.08, size: s.size * 0.96 }))
          .filter((s) => s.opacity > 0.05)
      );
    }, 45);
    return () => window.clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const spawnSparklesAt = (x: number, y: number, colour = '#9AFFE0') => {
    const idBase = nextSparkleId.current;
    nextSparkleId.current += 3;
    const added: SparkleParticle[] = [
      { id: idBase, x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14, size: 6, opacity: 0.95, colour },
      { id: idBase + 1, x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 24, size: 4, opacity: 0.85, colour: '#B4DDFF' },
      { id: idBase + 2, x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 18, size: 5, opacity: 0.9, colour: '#4C8DFF' },
    ];
    setSparkles((prev) => [...prev.slice(-36), ...added]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 160;
    const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 110;
    const now = performance.now();
    const fx = filterXRef.current.filter(normX, now);
    const fy = filterYRef.current.filter(normY, now);
    setOffset({ dx: fx, dy: fy });

    const simRatio = activeGesture === 'pinch-orbit' ? 0.18 : activeGesture === 'spread-zoom' ? 0.42 : 0.34;
    setPinchRatio(simRatio);
    setPinchLocked(simRatio <= 0.22);

    const svgX = ((e.clientX - rect.left) / rect.width) * 1366;
    const svgY = ((e.clientY - rect.top) / rect.height) * 1024;
    if (Math.random() > 0.35) {
      spawnSparklesAt(svgX, svgY, simRatio <= 0.22 ? COLOUR_TOKENS.stationMedia : '#9AFFE0');
    }
  };

  const getHandPoints = (side: 'left' | 'right'): [number, number][] => {
    if (liveLandmarks && liveLandmarks.length > 0) {
      if (side === 'left' && liveLandmarks[0]) return liveLandmarks[0];
      if (side === 'right' && liveLandmarks[1]) return liveLandmarks[1];
    }

    const baseWristX = side === 'left' ? 355 + offset.dx * 0.85 : 1010 - offset.dx * 0.85;
    const baseWristY = 895 + offset.dy * 0.75;
    const mirror = side === 'left' ? 1 : -1;
    const pinchScale = activeGesture === 'pinch-orbit' ? 0.72 : activeGesture === 'spread-zoom' ? 1.14 : 1.0;

    return BASE_LEFT_LANDMARKS.map(([lx, ly], idx) => {
      let modX = lx * mirror * pinchScale;
      let modY = ly * pinchScale;
      if (activeGesture === 'pinch-orbit' && (idx === 4 || idx === 8)) {
        modX = -32 * mirror;
        modY = -175;
      } else if (activeGesture === 'point-select' && idx > 8 && !FINGERTIP_INDICES.has(8)) {
        modY *= 0.65;
      }
      return [baseWristX + modX, baseWristY + modY];
    });
  };

  const leftPts = getHandPoints('left');
  const rightPts = getHandPoints('right');

  const gestureMeta: Record<HandGestureType, { title: string; subtitle: string }> = {
    'pinch-orbit': {
      title: 'Pinch and move to orbit',
      subtitle: handMode === 'two-hands' ? 'Two-hand spread controls zoom' : 'Single-hand pinch + drag orbits sphere',
    },
    'spread-zoom': {
      title: 'Two-hand spread to zoom',
      subtitle: 'Spread hands apart to zoom in · bring together to zoom out',
    },
    'palm-stop': {
      title: 'Open palm to stop',
      subtitle: 'Instant pose freeze · halts auto-orbit or tour',
    },
    'point-select': {
      title: 'Point to select station or node',
      subtitle: 'Fingertip trigger · selects 3D sphere nodes',
    },
  };

  const renderGlove = (pts: [number, number][], side: 'left' | 'right') => {
    const palmIndices = [0, 1, 5, 9, 13, 17];
    const palmPolygon = palmIndices.map((i) => `${pts[i][0]},${pts[i][1]}`).join(' ');
    const isPinchActive = pinchLocked || activeGesture === 'pinch-orbit';
    const gloveStroke = isPinchActive
      ? COLOUR_TOKENS.stationMedia
      : side === 'left'
      ? '#B4DDFF'
      : '#3FD0E0';
    const fingertipLabels = ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'];

    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs) - 24;
    const maxX = Math.max(...xs) + 24;
    const minY = Math.min(...ys) - 28;
    const maxY = Math.max(...ys) + 24;
    const bracketLen = 14;

    const thumbPt = pts[4];
    const indexPt = pts[8];
    const midX = (thumbPt[0] + indexPt[0]) * 0.5;
    const midY = (thumbPt[1] + indexPt[1]) * 0.5;

    return (
      <g key={side} className="cursor-pointer">
        <g stroke={gloveStroke} strokeWidth="2" fill="none" opacity="0.88">
          <path d={`M ${minX} ${minY + bracketLen} V ${minY} H ${minX + bracketLen}`} />
          <path d={`M ${maxX - bracketLen} ${minY} H ${maxX} V ${minY + bracketLen}`} />
          <path d={`M ${minX} ${maxY - bracketLen} V ${maxY} H ${minX + bracketLen}`} />
          <path d={`M ${maxX - bracketLen} ${maxY} H ${maxX} V ${maxY - bracketLen}`} />
        </g>

        <text
          x={minX}
          y={minY - 10}
          fill={gloveStroke}
          fontSize="11"
          fontFamily="JetBrains Mono, monospace"
        >
          {side === 'left' ? 'Left Hand' : 'Right Hand'} · Pinch {pinchRatio.toFixed(2)} · Depth {zDepth}
        </text>

        <line
          x1={thumbPt[0]}
          y1={thumbPt[1]}
          x2={indexPt[0]}
          y2={indexPt[1]}
          stroke={isPinchActive ? COLOUR_TOKENS.stationMedia : '#9AFFE0'}
          strokeWidth={isPinchActive ? 2.5 : 1.5}
          strokeDasharray={isPinchActive ? undefined : '4 4'}
        />
        <circle
          cx={midX}
          cy={midY}
          r={isPinchActive ? 8 : 5}
          fill={isPinchActive ? COLOUR_TOKENS.stationMedia : 'none'}
          fillOpacity={isPinchActive ? 0.35 : 0}
          stroke={isPinchActive ? COLOUR_TOKENS.stationMedia : '#9AFFE0'}
          strokeWidth="1.8"
        />

        <polygon
          points={palmPolygon}
          fill="#142632"
          fillOpacity="0.32"
          stroke={gloveStroke}
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />

        {BONE_CONNECTIONS.map(([a, b], idx) => (
          <line
            key={`${side}-bone-${idx}`}
            x1={pts[a][0]}
            y1={pts[a][1]}
            x2={pts[b][0]}
            y2={pts[b][1]}
            stroke={gloveStroke}
            strokeOpacity="0.82"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ))}

        {pts.map(([px, py], idx) => {
          const isFingertip = FINGERTIP_INDICES.has(idx);
          const tipOrder = [4, 8, 12, 16, 20].indexOf(idx);
          return (
            <g
              key={`${side}-lm-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                if (isFingertip) {
                  const panX = ((px / 1366) - 0.5) * 2;
                  const played = soundEngine.playFingertipNote(tipOrder >= 0 ? tipOrder : 0, panX);
                  const noteName = `${side.toUpperCase()} ${fingertipLabels[tipOrder]} · ${played.name} (${played.freq}Hz)`;
                  setActiveNote(noteName);
                  spawnSparklesAt(px, py, COLOUR_TOKENS.stationMedia);
                  onTriggerGesture(idx === 4 || idx === 8 ? 'pinch-orbit' : 'point-select');
                }
              }}
            >
              {isFingertip && (
                <circle
                  cx={px}
                  cy={py}
                  r={13}
                  fill="#142632"
                  fillOpacity="0.7"
                  stroke={isPinchActive && (idx === 4 || idx === 8) ? COLOUR_TOKENS.stationMedia : '#9AFFE0'}
                  strokeWidth="2.2"
                />
              )}
              <circle
                cx={px}
                cy={py}
                r={isFingertip ? 6.5 : idx === 0 ? 6 : 4.2}
                fill={
                  isFingertip
                    ? isPinchActive && (idx === 4 || idx === 8)
                      ? COLOUR_TOKENS.stationMedia
                      : '#9AFFE0'
                    : '#4C8DFF'
                }
                stroke="#F2F6F8"
                strokeWidth="1.4"
              />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <>
      {/* Single Shared Camera Backdrop Layer */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
            hasLiveCam ? 'opacity-40' : 'opacity-0'
          }`}
        />
        <svg
          className="w-full h-full object-cover opacity-60 scale-x-[-1]"
          viewBox="0 0 1366 1024"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="camFeedField" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#1B3444" stopOpacity="0.65" />
              <stop offset="65%" stopColor="#0B1720" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#05090E" stopOpacity="0.94" />
            </radialGradient>
            <pattern id="camSensorGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#B4DDFF" strokeWidth="0.4" strokeOpacity="0.12" />
            </pattern>
          </defs>
          <rect width="1366" height="1024" fill="url(#camFeedField)" />
          <rect width="1366" height="1024" fill="url(#camSensorGrid)" />
        </svg>
      </div>

      {/* Interactive Hand Rig & Control Bar */}
      <div className="fixed inset-0 z-[15] pointer-events-none select-none flex flex-col justify-between p-4 md:p-6">
        <svg
          className="fixed inset-0 w-full h-full pointer-events-auto"
          viewBox="0 0 1366 1024"
          preserveAspectRatio="xMidYMid slice"
          onPointerMove={handlePointerMove}
        >
          <path
            d="M 410 560 A 295 295 0 0 1 956 560"
            fill="none"
            stroke={pinchLocked ? COLOUR_TOKENS.stationMedia : '#3FD0E0'}
            strokeOpacity="0.65"
            strokeWidth="2.5"
            strokeDasharray="8 6"
          />

          {sparkles.map((sp) => (
            <g key={sp.id} opacity={sp.opacity}>
              <circle cx={sp.x} cy={sp.y} r={sp.size} fill={sp.colour} />
            </g>
          ))}

          {(handMode === 'two-hands' || handMode === 'left-only') && renderGlove(leftPts, 'left')}
          {(handMode === 'two-hands' || handMode === 'right-only') && renderGlove(rightPts, 'right')}
        </svg>

        <div className="mt-auto mx-auto w-full max-w-4xl pointer-events-auto z-20">
          <div
            className="rounded-2xl px-5 py-3.5 border flex flex-wrap items-center justify-between gap-4 shadow-2xl"
            style={{
              backgroundColor: COLOUR_TOKENS.glassRgba,
              borderColor: pinchLocked ? COLOUR_TOKENS.stationMedia : COLOUR_TOKENS.outlineControl,
            }}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: pinchLocked
                      ? COLOUR_TOKENS.stationMedia
                      : COLOUR_TOKENS.voiceOrbTeal,
                  }}
                />
                <span className="font-display font-semibold text-sm text-[#F2F6F8]">
                  {gestureMeta[activeGesture].title}
                </span>
                {activeNote && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#101D27] text-[#9AFFE0] border border-white/25">
                    {activeNote}
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-[#BDCBD3]">
                {gestureMeta[activeGesture].subtitle} · {cvStatusLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg p-0.5 bg-[#101D27] border border-white/30">
                {(
                  [
                    { id: 'two-hands', label: 'Two Hands' },
                    { id: 'left-only', label: 'Left Hand' },
                    { id: 'right-only', label: 'Right Hand' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeHandMode(m.id)}
                    className={`min-h-[38px] px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                      handMode === m.id
                        ? 'bg-[#4C8DFF] text-[#101D27] font-semibold'
                        : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'pinch-orbit', label: 'Pinch Orbit' },
                    { id: 'spread-zoom', label: 'Spread Zoom' },
                    { id: 'palm-stop', label: 'Palm Stop' },
                    { id: 'point-select', label: 'Point Select' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onTriggerGesture(g.id)}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-colors cursor-pointer ${
                      activeGesture === g.id
                        ? 'border-[#F2B66D] bg-[#F2B66D]/20 text-[#F2F6F8]'
                        : 'border-white/25 bg-[#101D27]/70 text-[#BDCBD3] hover:text-[#F2F6F8]'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onCloseHands}
                className="min-h-[38px] px-3 py-1 rounded-lg font-mono text-[11px] border border-white/35 text-[#F2F6F8] hover:border-[#4C8DFF] cursor-pointer"
              >
                Exit Hands
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
