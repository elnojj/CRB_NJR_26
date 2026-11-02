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
  const landmarkFiltersRef = useRef<OneEuroFilter[][]>([]);
  const [offset, setOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [hasLiveCam, setHasLiveCam] = useState(false);
  const [cvStatusLabel, setCvStatusLabel] = useState<string>('Requesting camera...');
  const [pinchRatio, setPinchRatio] = useState<number>(0.19);
  const [pinchLocked, setPinchLocked] = useState<boolean>(true);
  const [liveLandmarks, setLiveLandmarks] = useState<[number, number][][] | null>(null);
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const nextSparkleId = useRef(1);
  const pinchLockRef = useRef(true);
  const lastGestureTimeRef = useRef(0);
  const frameSkipRef = useRef(0);
  const lastUiPushRef = useRef(0);
  const handModeRef = useRef(handMode);
  const wantedHands = handMode === 'two-hands' ? 2 : 1;

  useEffect(() => {
    handModeRef.current = handMode;
  }, [handMode]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Request ONE shared camera MediaStream only when `active === true`, and stop all tracks on disable
  useEffect(() => {
    if (!active) {
      setHasLiveCam(false);
      setLiveLandmarks(null);
      landmarkFiltersRef.current = [];
      return;
    }

    let cancelled = false;
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let rafId = 0;
    const phone =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

    async function initSharedCameraAndMediaPipe() {
      setCvStatusLabel('Requesting camera permission...');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: phone
            ? {
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { ideal: 24, max: 30 },
                facingMode: 'user',
              }
            : { width: { ideal: 720 }, height: { ideal: 405 }, facingMode: 'user' },
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
        setCvStatusLabel('Loading MediaPipe HandLandmarker…');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        if (cancelled) return;
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: phone ? 'CPU' : 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: wantedHands,
        });
        if (cancelled) return;
        setCvStatusLabel(
          wantedHands === 1
            ? 'Tracking · one hand'
            : 'Tracking · two hands'
        );

        const ensureFilters = (handCount: number) => {
          while (landmarkFiltersRef.current.length < handCount) {
            landmarkFiltersRef.current.push(
              Array.from({ length: 42 }, () => new OneEuroFilter(30, 1.1, 0.02, 1.0))
            );
          }
        };

        const detectFrame = () => {
          if (cancelled || !landmarker || !videoRef.current) return;
          const v = videoRef.current;
          const skipEvery = phone ? 2 : 1;
          frameSkipRef.current += 1;
          if (v.readyState >= 2 && frameSkipRef.current % (skipEvery + 1) === 0) {
            const now = performance.now();
            const res = landmarker.detectForVideo(v, now);
            if (res.landmarks && res.landmarks.length > 0) {
              const mode = handModeRef.current;
              const maxHands = mode === 'two-hands' ? 2 : 1;
              const hands = res.landmarks.slice(0, maxHands);
              ensureFilters(hands.length);
              const mappedHands: [number, number][][] = hands.map((hand, hi) => {
                const filters = landmarkFiltersRef.current[hi];
                return hand.map((lm, li) => {
                  const sx = (1 - lm.x) * 1366;
                  const sy = lm.y * 1024;
                  const fx = filters[li * 2].filter(sx, now);
                  const fy = filters[li * 2 + 1].filter(sy, now);
                  return [fx, fy] as [number, number];
                });
              });

              const h0 = hands[0];
              const palmLen = Math.max(
                0.05,
                Math.hypot(h0[9].x - h0[0].x, h0[9].y - h0[0].y, h0[9].z - h0[0].z)
              );
              const thumbIndexDist = Math.hypot(
                h0[4].x - h0[8].x,
                h0[4].y - h0[8].y,
                h0[4].z - h0[8].z
              );
              const thumbPinkyDist = Math.hypot(
                h0[4].x - h0[20].x,
                h0[4].y - h0[20].y,
                h0[4].z - h0[20].z
              );
              const ratio = Number((thumbIndexDist / palmLen).toFixed(2));

              const dWristIndex = Math.hypot(h0[8].x - h0[0].x, h0[8].y - h0[0].y);
              const dWristMiddle = Math.hypot(h0[12].x - h0[0].x, h0[12].y - h0[0].y);
              const dWristRing = Math.hypot(h0[16].x - h0[0].x, h0[16].y - h0[0].y);
              const dWristPinky = Math.hypot(h0[20].x - h0[0].x, h0[20].y - h0[0].y);

              const panX = ((1 - h0[8].x) - 0.5) * 2;
              const nowMs = performance.now();

              // Throttle React state on phone — landmark paint at ~18–20fps is enough.
              if (nowMs - lastUiPushRef.current > (phone ? 50 : 22)) {
                lastUiPushRef.current = nowMs;
                setLiveLandmarks(mappedHands);
                setPinchRatio(ratio);
              }

              // 1. Pinch Orbit
              if (!pinchLockRef.current && ratio <= 0.22) {
                pinchLockRef.current = true;
                setPinchLocked(true);
                const played = soundEngine.playFingertipNote(1, panX);
                setActiveNote(`${played.name} (${played.freq}Hz)`);
                onTriggerGesture('pinch-orbit');
              } else if (pinchLockRef.current && ratio >= 0.3) {
                pinchLockRef.current = false;
                setPinchLocked(false);
              }

              // 2. Palm Stop: Open flat palm facing camera with all fingers extended
              const allFingersExtended =
                dWristIndex > 1.35 * palmLen &&
                dWristMiddle > 1.35 * palmLen &&
                dWristRing > 1.35 * palmLen &&
                dWristPinky > 1.35 * palmLen;

              if (allFingersExtended && ratio > 0.45 && nowMs - lastGestureTimeRef.current > 650) {
                lastGestureTimeRef.current = nowMs;
                soundEngine.playPanelToggle(false, panX);
                setActiveNote('PALM-STOP · FREEZE');
                onTriggerGesture('palm-stop');
              }
              // 3. Point Select: Index finger extended, others curled
              else if (
                dWristIndex > 1.3 * palmLen &&
                dWristMiddle < 1.05 * palmLen &&
                dWristRing < 1.05 * palmLen &&
                dWristPinky < 1.05 * palmLen &&
                nowMs - lastGestureTimeRef.current > 600
              ) {
                lastGestureTimeRef.current = nowMs;
                soundEngine.playNodeSelect(panX);
                setActiveNote('POINT-SELECT · NODE');
                onTriggerGesture('point-select');
              }
              // 4. Spread Zoom: Thumb and pinky spread wide or dual-hand spread
              else if (
                (thumbPinkyDist > 1.45 * palmLen ||
                  (mode === 'two-hands' &&
                    hands.length >= 2 &&
                    Math.abs(hands[0][0].x - hands[1][0].x) > 0.4)) &&
                nowMs - lastGestureTimeRef.current > 700
              ) {
                lastGestureTimeRef.current = nowMs;
                soundEngine.playFlightWhoosh(550, panX);
                setActiveNote('SPREAD-ZOOM');
                onTriggerGesture('spread-zoom');
              }
            } else if (performance.now() - lastUiPushRef.current > 120) {
              lastUiPushRef.current = performance.now();
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
  }, [active, wantedHands, onTriggerGesture]);

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

  const spawnSparklesAt = (x: number, y: number, colour = '#36E88D') => {
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
    if (now - lastUiPushRef.current < (isPhone ? 48 : 16)) return;
    lastUiPushRef.current = now;
    setOffset({ dx: fx, dy: fy });

    const simRatio = activeGesture === 'pinch-orbit' ? 0.18 : activeGesture === 'spread-zoom' ? 0.42 : 0.34;
    setPinchRatio(simRatio);
    setPinchLocked(simRatio <= 0.22);

    if (isPhone) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * 1366;
    const svgY = ((e.clientY - rect.top) / rect.height) * 1024;
    if (Math.random() > 0.72) {
      spawnSparklesAt(svgX, svgY, simRatio <= 0.22 ? COLOUR_TOKENS.stationMedia : '#B4DDFF');
    }
  };

  const getHandPoints = (side: 'left' | 'right'): [number, number][] | null => {
    // Live track only — never invent a second ghost skeleton when only one hand is seen.
    if (liveLandmarks && liveLandmarks.length > 0) {
      if (handMode === 'two-hands') {
        if (side === 'left') return liveLandmarks[0] || null;
        return liveLandmarks[1] || null;
      }
      // Single-hand modes: always use the first detected hand for the active side.
      if (handMode === 'left-only' && side === 'left') return liveLandmarks[0];
      if (handMode === 'right-only' && side === 'right') return liveLandmarks[0];
      return null;
    }

    // Touch/mouse fallback: draw only the active single-hand (or both if 2× selected).
    if (handMode === 'left-only' && side !== 'left') return null;
    if (handMode === 'right-only' && side !== 'right') return null;

    const baseWristX = side === 'left' ? 355 + offset.dx * 0.85 : 1010 - offset.dx * 0.85;
    const baseWristY = isPhone ? 820 + offset.dy * 0.55 : 895 + offset.dy * 0.75;
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
      return [baseWristX + modX, baseWristY + modY] as [number, number];
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
    const isPinchActive = pinchLocked || activeGesture === 'pinch-orbit';
    // Soft glass glove — ice/gold, never neon skeleton green zigzags.
    const gloveAccent = isPinchActive ? COLOUR_TOKENS.stationMedia : '#B4DDFF';
    const iceEdge = '#B4DDFF';
    const sheen = '#FFF4D0';
    const uid = `${side}-glove`;
    const fingertipLabels = ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'];
    const phoneSoft = isPhone;

    const palmIdx = [0, 1, 5, 9, 13, 17];
    const palmPts = palmIdx.map((i) => pts[i]);
    const palmCx = palmPts.reduce((s, p) => s + p[0], 0) / palmPts.length;
    const palmCy = palmPts.reduce((s, p) => s + p[1], 0) / palmPts.length;
    const expandPalm = (scale: number) =>
      palmPts
        .map(([x, y]) => {
          const dx = x - palmCx;
          const dy = y - palmCy;
          return `${palmCx + dx * scale},${palmCy + dy * scale}`;
        })
        .join(' ');

    // Thin soft finger ribbons (phone) / glass tubes (desktop) — no bone dots.
    const fingerChains: { id: string; indices: number[]; width: number }[] = [
      { id: 'thumb', indices: [1, 2, 3, 4], width: phoneSoft ? 10 : 22 },
      { id: 'index', indices: [5, 6, 7, 8], width: phoneSoft ? 9 : 18 },
      { id: 'middle', indices: [9, 10, 11, 12], width: phoneSoft ? 9 : 20 },
      { id: 'ring', indices: [13, 14, 15, 16], width: phoneSoft ? 8 : 17 },
      { id: 'pinky', indices: [17, 18, 19, 20], width: phoneSoft ? 7 : 15 },
    ];

    const chainPath = (indices: number[]) =>
      indices
        .map((i, n) => `${n === 0 ? 'M' : 'L'} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`)
        .join(' ');

    const silhouette = [
      pts[0],
      pts[1],
      pts[2],
      pts[3],
      pts[4],
      pts[8],
      pts[12],
      pts[16],
      pts[20],
      pts[19],
      pts[18],
      pts[17],
      pts[0],
    ];
    const silhouetteD = silhouette
      .map((p, n) => `${n === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(' ');

    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs) - 28;
    const maxX = Math.max(...xs) + 28;
    const minY = Math.min(...ys) - 32;
    const maxY = Math.max(...ys) + 28;
    const bracketLen = 14;

    const thumbPt = pts[4];
    const indexPt = pts[8];
    const midX = (thumbPt[0] + indexPt[0]) * 0.5;
    const midY = (thumbPt[1] + indexPt[1]) * 0.5;

    return (
      <g key={side} className="cursor-pointer" opacity={phoneSoft ? 0.72 : 1}>
        <defs>
          <linearGradient id={`${uid}-shell`} x1="18%" y1="8%" x2="82%" y2="92%">
            <stop offset="0%" stopColor={isPinchActive ? sheen : iceEdge} stopOpacity={phoneSoft ? 0.16 : 0.28} />
            <stop offset="42%" stopColor={isPinchActive ? '#D4AF37' : iceEdge} stopOpacity={phoneSoft ? 0.08 : 0.12} />
            <stop offset="100%" stopColor="#03060c" stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id={`${uid}-palm`} cx="38%" cy="28%" r="78%">
            <stop offset="0%" stopColor={isPinchActive ? sheen : iceEdge} stopOpacity={phoneSoft ? 0.32 : 0.5} />
            <stop
              offset="45%"
              stopColor={isPinchActive ? 'rgba(212, 175, 55, 0.4)' : 'rgba(180, 221, 255, 0.28)'}
            />
            <stop offset="100%" stopColor="rgba(12, 18, 28, 0.45)" stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id={`${uid}-finger`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isPinchActive ? sheen : iceEdge} stopOpacity={phoneSoft ? 0.35 : 0.55} />
            <stop
              offset="55%"
              stopColor={isPinchActive ? 'rgba(212, 175, 55, 0.4)' : 'rgba(180, 221, 255, 0.32)'}
            />
            <stop offset="100%" stopColor="rgba(8, 14, 22, 0.28)" stopOpacity="0.4" />
          </linearGradient>
          {!phoneSoft && (
            <>
              <filter id={`${uid}-soft`} x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0"
                  result="soft"
                />
                <feMerge>
                  <feMergeNode in="soft" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.5" result="g" />
                <feMerge>
                  <feMergeNode in="g" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
        </defs>

        {!phoneSoft && (
          <g stroke={gloveAccent} strokeWidth="1.5" fill="none" opacity="0.45">
            <path d={`M ${minX} ${minY + bracketLen} V ${minY} H ${minX + bracketLen}`} />
            <path d={`M ${maxX - bracketLen} ${minY} H ${maxX} V ${minY + bracketLen}`} />
            <path d={`M ${minX} ${maxY - bracketLen} V ${maxY} H ${minX + bracketLen}`} />
            <path d={`M ${maxX - bracketLen} ${maxY} H ${maxX} V ${maxY - bracketLen}`} />
          </g>
        )}

        {!phoneSoft && (
          <text
            x={minX}
            y={minY - 10}
            fill={isPinchActive ? sheen : iceEdge}
            fillOpacity="0.72"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            {side === 'left' ? 'Left' : 'Right'}
            {handMode === 'two-hands' ? '' : ' · One hand'}
          </text>
        )}

        <path
          d={silhouetteD}
          fill={`url(#${uid}-shell)`}
          stroke={isPinchActive ? gloveAccent : iceEdge}
          strokeOpacity={phoneSoft ? 0.18 : 0.28}
          strokeWidth={phoneSoft ? 0.8 : 1.1}
          strokeLinejoin="round"
          filter={phoneSoft ? undefined : `url(#${uid}-soft)`}
        />

        <polygon
          points={expandPalm(phoneSoft ? 1.18 : 1.28)}
          fill={`url(#${uid}-palm)`}
          stroke={isPinchActive ? gloveAccent : iceEdge}
          strokeOpacity={phoneSoft ? 0.28 : 0.42}
          strokeWidth={phoneSoft ? 1 : 1.35}
          strokeLinejoin="round"
          filter={phoneSoft ? undefined : `url(#${uid}-glow)`}
        />
        {!phoneSoft && (
          <ellipse
            cx={palmCx - 8}
            cy={palmCy - 14}
            rx={28}
            ry={16}
            fill={isPinchActive ? sheen : iceEdge}
            fillOpacity="0.22"
            style={{ mixBlendMode: 'screen' }}
          />
        )}
        <polygon points={expandPalm(1.05)} fill="rgba(3, 6, 12, 0.14)" />

        {fingerChains.map((finger) => (
          <g key={`${side}-${finger.id}`}>
            <path
              d={chainPath(finger.indices)}
              fill="none"
              stroke={`url(#${uid}-finger)`}
              strokeWidth={finger.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={phoneSoft ? 0.55 : 0.88}
              filter={phoneSoft ? undefined : `url(#${uid}-soft)`}
            />
            {!phoneSoft && (
              <path
                d={chainPath(finger.indices)}
                fill="none"
                stroke={isPinchActive ? sheen : iceEdge}
                strokeWidth={finger.width * 0.14}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.35"
              />
            )}
          </g>
        ))}

        <line
          x1={thumbPt[0]}
          y1={thumbPt[1]}
          x2={indexPt[0]}
          y2={indexPt[1]}
          stroke={gloveAccent}
          strokeWidth={isPinchActive ? (phoneSoft ? 1.6 : 2.2) : 1.1}
          strokeOpacity={isPinchActive ? 0.75 : 0.28}
          strokeDasharray={isPinchActive ? undefined : '5 5'}
          filter={!phoneSoft && isPinchActive ? `url(#${uid}-glow)` : undefined}
        />
        <circle
          cx={midX}
          cy={midY}
          r={isPinchActive ? (phoneSoft ? 5 : 8) : 3.5}
          fill={isPinchActive ? `url(#${uid}-palm)` : 'none'}
          fillOpacity={isPinchActive ? 0.8 : 0}
          stroke={gloveAccent}
          strokeWidth="1.2"
          strokeOpacity="0.55"
        />

        {[4, 8, 12, 16, 20].map((idx, tipOrder) => {
          const [px, py] = pts[idx];
          return (
            <circle
              key={`${side}-tip-${idx}`}
              cx={px}
              cy={py}
              r={phoneSoft ? 12 : 16}
              fill="transparent"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const panX = px / 1366 - 0.5;
                const played = soundEngine.playFingertipNote(tipOrder, panX * 2);
                setActiveNote(
                  `${side.toUpperCase()} ${fingertipLabels[tipOrder]} · ${played.name} (${played.freq}Hz)`
                );
                spawnSparklesAt(px, py, COLOUR_TOKENS.stationMedia);
                onTriggerGesture(idx === 4 || idx === 8 ? 'pinch-orbit' : 'point-select');
              }}
            />
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
            hasLiveCam ? (isPhone ? 'opacity-[0.08]' : 'opacity-14') : 'opacity-0'
          }`}
        />
        {/* Light veil only — must not wash the workspace atmospheric field back to flat navy. */}
        <svg
          className={`w-full h-full object-cover scale-x-[-1] ${isPhone ? 'opacity-12' : 'opacity-28'}`}
          viewBox="0 0 1366 1024"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="camFeedField" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#243848" stopOpacity="0.22" />
              <stop offset="55%" stopColor="#0a1520" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#03060c" stopOpacity="0.28" />
            </radialGradient>
            <pattern id="camSensorGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#B4DDFF" strokeWidth="0.4" strokeOpacity="0.10" />
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
            stroke={pinchLocked ? COLOUR_TOKENS.stationMedia : '#B4DDFF'}
            strokeOpacity="0.42"
            strokeWidth="2"
            strokeDasharray="8 6"
          />

          {sparkles.map((sp) => (
            <g key={sp.id} opacity={sp.opacity}>
              <circle cx={sp.x} cy={sp.y} r={sp.size} fill={sp.colour} />
            </g>
          ))}

          {leftPts && (handMode === 'two-hands' || handMode === 'left-only') && renderGlove(leftPts, 'left')}
          {rightPts && (handMode === 'two-hands' || handMode === 'right-only') && renderGlove(rightPts, 'right')}
        </svg>

        <div
          className="mt-auto mx-auto w-full max-w-4xl pointer-events-auto z-20 px-1"
          style={{
            // Keep clear of voice dock + home indicator
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
            marginBottom: 'max(4.75rem, calc(env(safe-area-inset-bottom, 0px) + 4.25rem))',
          }}
        >
          <div
            className="rounded-[1.1rem] px-3 py-2.5 sm:px-5 sm:py-3.5 border flex flex-wrap items-center justify-between gap-2 sm:gap-4"
            style={{
              backgroundColor: 'rgba(16, 24, 36, 0.55)',
              backdropFilter: 'blur(18px) saturate(1.15)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.15)',
              borderColor: pinchLocked
                ? 'rgba(212, 175, 55, 0.45)'
                : 'rgba(180, 221, 255, 0.28)',
              boxShadow:
                '0 18px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(180, 221, 255, 0.14)',
            }}
          >
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: pinchLocked
                      ? COLOUR_TOKENS.stationMedia
                      : COLOUR_TOKENS.trackingValid,
                    boxShadow: pinchLocked
                      ? '0 0 10px rgba(212, 175, 55, 0.55)'
                      : '0 0 10px rgba(54, 232, 141, 0.45)',
                  }}
                />
                <span className="font-display font-semibold text-[10px] sm:text-xs tracking-[0.08em] uppercase text-[#F2F6F8] truncate">
                  #11 · {gestureMeta[activeGesture].title}
                </span>
                <span
                  className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-lg text-[#36E88D] border shrink-0"
                  style={{
                    backgroundColor: 'rgba(12, 18, 28, 0.72)',
                    borderColor: 'rgba(180, 221, 255, 0.22)',
                  }}
                >
                  LIVE
                </span>
              </div>
              <span className="hidden sm:block font-mono text-xs text-[#BDCBD3] truncate">
                {gestureMeta[activeGesture].subtitle} · {cvStatusLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div
                className="flex items-center rounded-xl p-0.5 border"
                style={{
                  backgroundColor: 'rgba(12, 18, 28, 0.72)',
                  borderColor: 'rgba(180, 221, 255, 0.22)',
                }}
              >
                {(
                  [
                    { id: 'right-only', label: '1×', full: 'One Hand' },
                    { id: 'two-hands', label: '2×', full: 'Two Hands' },
                    { id: 'left-only', label: 'L', full: 'Left Hand' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.full}
                    aria-label={m.full}
                    data-testid={`hand-mode-${m.id}`}
                    onClick={() => onChangeHandMode(m.id)}
                    className={`min-h-[40px] sm:min-h-[44px] min-w-[40px] px-2 sm:px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                      handMode === m.id
                        ? 'font-semibold text-[#03060c]'
                        : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
                    }`}
                    style={
                      handMode === m.id
                        ? {
                            background:
                              'linear-gradient(135deg, #FFF4D0 0%, #D4AF37 72%)',
                          }
                        : undefined
                    }
                  >
                    <span className="sm:hidden">{m.label}</span>
                    <span className="hidden sm:inline">{m.full}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5">
                {(
                  [
                    { id: 'pinch-orbit', label: 'Pinch', full: 'Pinch Orbit' },
                    { id: 'spread-zoom', label: 'Zoom', full: 'Spread Zoom' },
                    { id: 'palm-stop', label: 'Stop', full: 'Palm Stop' },
                    { id: 'point-select', label: 'Point', full: 'Point Select' },
                  ] as const
                ).map((g) => {
                  const active = activeGesture === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      title={g.full}
                      aria-label={g.full}
                      onClick={() => onTriggerGesture(g.id)}
                      className={`min-h-[40px] sm:min-h-[44px] px-2 sm:px-3 py-1.5 rounded-xl font-mono text-[10px] sm:text-xs border transition-colors cursor-pointer ${
                        active
                          ? 'text-[#F2F6F8] font-semibold'
                          : 'text-[#BDCBD3] hover:text-[#F2F6F8]'
                      }`}
                      style={{
                        borderColor: active
                          ? 'rgba(54, 232, 141, 0.55)'
                          : 'rgba(180, 221, 255, 0.22)',
                        backgroundColor: active
                          ? 'rgba(54, 232, 141, 0.16)'
                          : 'rgba(12, 18, 28, 0.72)',
                      }}
                    >
                      <span className="sm:hidden">{g.label}</span>
                      <span className="hidden sm:inline">{g.full}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onCloseHands}
                className="min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-1.5 rounded-xl font-mono text-xs border text-[#F2F6F8] cursor-pointer font-medium hover:border-[rgba(212,175,55,0.55)]"
                style={{
                  borderColor: 'rgba(180, 221, 255, 0.22)',
                  backgroundColor: 'rgba(12, 18, 28, 0.72)',
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
