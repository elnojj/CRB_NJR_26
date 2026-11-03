import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { COLOUR_TOKENS } from '../tokens/colours';
import { soundEngine } from '../utils/soundEngine';
import {
  getSharedWebcamStream,
  forceStopSharedWebcamStream,
  releaseSharedWebcamStream,
} from '../utils/deviceStreamCoordinator';

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
  /** Fired when landmarks disappear after a live track (R01 gesture-loss settle). */
  onTrackingLost?: () => void;
  /** Fired when landmarks reappear after a loss. */
  onTrackingAcquired?: () => void;
  /** Pixels from viewport bottom reserved for Voice capsule + utility bar. */
  dockClearancePx?: number;
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
  onTrackingLost,
  onTrackingAcquired,
  dockClearancePx = 148,
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
  const lastDetectAtRef = useRef(0);
  const detectIntervalRef = useRef(50);
  const lastUiPushRef = useRef(0);
  const handModeRef = useRef(handMode);
  const hadLiveTrackRef = useRef(false);
  const wantedHands = handMode === 'two-hands' ? 2 : 1;

  // Parent passes inline callbacks; keep them out of the camera effect deps so an
  // App re-render never tears down and re-acquires the webcam.
  const onTriggerGestureRef = useRef(onTriggerGesture);
  const onCloseHandsRef = useRef(onCloseHands);
  const onTrackingLostRef = useRef(onTrackingLost);
  const onTrackingAcquiredRef = useRef(onTrackingAcquired);
  onTriggerGestureRef.current = onTriggerGesture;
  onCloseHandsRef.current = onCloseHands;
  onTrackingLostRef.current = onTrackingLost;
  onTrackingAcquiredRef.current = onTrackingAcquired;

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
        stream = await getSharedWebcamStream({
          video: phone
            ? {
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { ideal: 24, max: 30 },
                facingMode: 'user',
              }
            : { width: { ideal: 720 }, height: { ideal: 405 }, facingMode: 'user' },
        });
      } catch (err) {
        if (!cancelled) {
          setHasLiveCam(false);
          const detail =
            err && typeof err === 'object' && 'message' in err
              ? String((err as Error).message)
              : 'Camera permission denied';
          // In-flight cancel from a deliberate toggle-off is not a permission failure.
          if (/cancelled/i.test(detail)) {
            setCvStatusLabel('Camera off');
            setLiveLandmarks(null);
            onTrackingLostRef.current?.();
            return;
          }
          setCvStatusLabel(`${detail} — gesture disabled · orbit restored`);
          setLiveLandmarks(null);
          // Yield camera ownership so pointer orbit is not left blocked.
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
            // Always CPU/WASM — isolate MediaPipe from Three.js WebGL to avoid GPU stalls.
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: wantedHands,
        });
        if (cancelled) return;
        setCvStatusLabel(
          wantedHands === 1
            ? 'Tracking · one hand · WASM'
            : 'Tracking · two hands · WASM'
        );

        const ensureFilters = (handCount: number) => {
          while (landmarkFiltersRef.current.length < handCount) {
            landmarkFiltersRef.current.push(
              Array.from({ length: 42 }, () => new OneEuroFilter(30, 1.1, 0.02, 1.0))
            );
          }
        };

        /** Secondary EMA (α≈0.2) on normalized landmarks before screen mapping. */
        const emaState: Array<Array<{ x: number; y: number } | null>> = [];
        const emaAlpha = 0.2;
        const smoothNorm = (hi: number, li: number, x: number, y: number) => {
          while (emaState.length <= hi) emaState.push([]);
          while (emaState[hi].length <= li) emaState[hi].push(null);
          const prev = emaState[hi][li];
          if (!prev) {
            emaState[hi][li] = { x, y };
            return { x, y };
          }
          const next = {
            x: emaAlpha * x + (1 - emaAlpha) * prev.x,
            y: emaAlpha * y + (1 - emaAlpha) * prev.y,
          };
          emaState[hi][li] = next;
          return next;
        };

        const detectFrame = () => {
          if (cancelled || !landmarker || !videoRef.current) return;
          const v = videoRef.current;
          const now = performance.now();
          // Time-budgeted inference keeps WASM detection from starving the Three.js frame.
          if (
            v.readyState >= 2 &&
            v.videoWidth > 0 &&
            now - lastDetectAtRef.current >= detectIntervalRef.current
          ) {
            lastDetectAtRef.current = now;
            let res: ReturnType<HandLandmarker['detectForVideo']>;
            try {
              res = landmarker.detectForVideo(v, now);
            } catch {
              rafId = requestAnimationFrame(detectFrame);
              return;
            }
            const cost = performance.now() - now;
            const floor = phone ? 80 : 50;
            detectIntervalRef.current = Math.min(200, Math.max(floor, cost * 3));
            if (res.landmarks && res.landmarks.length > 0) {
              if (!hadLiveTrackRef.current) {
                hadLiveTrackRef.current = true;
                onTrackingAcquiredRef.current?.();
              }
              const mode = handModeRef.current;
              const maxHands = mode === 'two-hands' ? 2 : 1;
              const hands = res.landmarks.slice(0, maxHands);
              ensureFilters(hands.length);
              const mappedHands: [number, number][][] = hands.map((hand, hi) => {
                const filters = landmarkFiltersRef.current[hi];
                return hand.map((lm, li) => {
                  const norm = smoothNorm(hi, li, lm.x, lm.y);
                  const sx = (1 - norm.x) * 1366;
                  const sy = norm.y * 1024;
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
                onTriggerGestureRef.current('pinch-orbit');
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
                onTriggerGestureRef.current('palm-stop');
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
                onTriggerGestureRef.current('point-select');
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
                onTriggerGestureRef.current('spread-zoom');
              }
            } else if (performance.now() - lastUiPushRef.current > 120) {
              lastUiPushRef.current = performance.now();
              setLiveLandmarks(null);
              if (hadLiveTrackRef.current) {
                hadLiveTrackRef.current = false;
                onTrackingLostRef.current?.();
              }
            }
          }
          rafId = requestAnimationFrame(detectFrame);
        };
        rafId = requestAnimationFrame(detectFrame);
      } catch {
        if (!cancelled) {
          setCvStatusLabel('Camera active · Touch/mouse gesture fallback');
          setLiveLandmarks(null);
          if (hadLiveTrackRef.current) {
            hadLiveTrackRef.current = false;
            onTrackingLostRef.current?.();
          }
        }
      }
    }

    initSharedCameraAndMediaPipe();

    return () => {
      cancelled = true;
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
      if (hadLiveTrackRef.current) {
        hadLiveTrackRef.current = false;
        onTrackingLostRef.current?.();
      }
    };
  }, [active, wantedHands]);

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

  /** Cryo-glass tracking rig — hairline bones + tip dots. No filled gloves. */
  const renderTrackingRig = (pts: [number, number][], side: 'left' | 'right') => {
    const isPinchActive = pinchLocked || activeGesture === 'pinch-orbit';
    const bones: number[][] = [
      [0, 1, 2, 3, 4],
      [0, 5, 6, 7, 8],
      [0, 9, 10, 11, 12],
      [0, 13, 14, 15, 16],
      [0, 17, 18, 19, 20],
      [5, 9, 13, 17],
    ];
    const tipIdx = [4, 8, 12, 16, 20];
    const jointIdx = [0, 1, 5, 9, 13, 17];
    const tipLabels = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    const chainPath = (indices: number[]) =>
      indices
        .map((i, n) => `${n === 0 ? 'M' : 'L'} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`)
        .join(' ');
    const thumbPt = pts[4];
    const indexPt = pts[8];
    const midX = (thumbPt[0] + indexPt[0]) * 0.5;
    const midY = (thumbPt[1] + indexPt[1]) * 0.5;
    const strokeW = isPhone ? 1.1 : 1.35;

    return (
      <g key={side} className="cerebro-hands-track cursor-pointer" opacity={isPhone ? 0.78 : 0.92}>
        {bones.map((indices, bi) => (
          <path
            key={`${side}-bone-${bi}`}
            className="bone"
            d={chainPath(indices)}
            strokeWidth={strokeW}
          />
        ))}
        {jointIdx.map((idx) => (
          <circle
            key={`${side}-joint-${idx}`}
            className="joint"
            cx={pts[idx][0]}
            cy={pts[idx][1]}
            r={isPhone ? 2.2 : 2.8}
          />
        ))}
        {tipIdx.map((idx, tipOrder) => {
          const [px, py] = pts[idx];
          return (
            <g key={`${side}-tip-${idx}`}>
              <circle className="tip" cx={px} cy={py} r={isPhone ? 3.4 : 4.2} />
              <circle
                cx={px}
                cy={py}
                r={isPhone ? 14 : 16}
                fill="transparent"
                className="cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  const panX = px / 1366 - 0.5;
                  const played = soundEngine.playFingertipNote(tipOrder, panX * 2);
                  setActiveNote(`${tipLabels[tipOrder]} · ${played.name}`);
                  spawnSparklesAt(px, py, COLOUR_TOKENS.sphereWireframe);
                  onTriggerGesture(idx === 4 || idx === 8 ? 'pinch-orbit' : 'point-select');
                }}
              />
            </g>
          );
        })}
        <line
          className={isPinchActive ? 'pinch-chord' : 'bone'}
          x1={thumbPt[0]}
          y1={thumbPt[1]}
          x2={indexPt[0]}
          y2={indexPt[1]}
          strokeWidth={isPinchActive ? (isPhone ? 1.6 : 2) : 1}
          strokeDasharray={isPinchActive ? undefined : '4 6'}
        />
        {isPinchActive && (
          <circle
            cx={midX}
            cy={midY}
            r={isPhone ? 3.5 : 4.5}
            fill={COLOUR_TOKENS.trackingValid}
            fillOpacity={0.85}
          />
        )}
      </g>
    );
  };

  return (
    <>
      {/*
        Sampling video must stay in the DOM for MediaPipe, but NEVER paint full-bleed.
        A mirrored object-cover webcam of the monitor created a second ghosted "page"
        of the UI (vertical seam / duplicated spheres). Keep it 1×1 and invisible.
      */}
      <div
        className="pointer-events-none select-none"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          overflow: 'hidden',
          opacity: 0,
          zIndex: -1,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          width={640}
          height={480}
          controls={false}
          disablePictureInPicture
          style={{ width: 640, height: 480 }}
        />
      </div>

      {/* Interactive Hand Rig & Control Bar — no decorative sphere arc (WebGL owns spheres). */}
      <div className="fixed inset-0 z-[15] pointer-events-none select-none flex flex-col justify-between p-4 md:p-6">
        <svg
          className="fixed inset-0 w-full h-full pointer-events-auto"
          viewBox="0 0 1366 1024"
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={handlePointerMove}
        >
          {sparkles.map((sp) => (
            <g key={sp.id} opacity={sp.opacity * 0.65}>
              <circle
                cx={sp.x}
                cy={sp.y}
                r={Math.min(3.5, sp.size * 0.55)}
                fill={COLOUR_TOKENS.sphereWireframe}
              />
            </g>
          ))}

          {/* Tracking only — camera on/off lives solely on the Call · Hands · Chat dock. */}
          {leftPts && (handMode === 'two-hands' || handMode === 'left-only') &&
            renderTrackingRig(leftPts, 'left')}
          {rightPts && (handMode === 'two-hands' || handMode === 'right-only') &&
            renderTrackingRig(rightPts, 'right')}
        </svg>

        {/* No second camera HUD — Call · Hands · Chat dock is the only on/off control. */}
        <p className="sr-only" aria-live="polite" data-testid="hands-gesture-hud">
          {hasLiveCam
            ? `Hand camera tracking · ${gestureMeta[activeGesture].title}`
            : cvStatusLabel}
        </p>
      </div>
    </>
  );
};
