import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import {
  getSharedWebcamStream,
  forceStopSharedWebcamStream,
  releaseSharedWebcamStream,
} from '../utils/deviceStreamCoordinator';
import { HandGestureEngine, type ScreenPoint } from '../components/handGestures';
import { OneEuroFilter } from './oneEuroFilter';
import {
  GLOVE_PLANE_Z,
  LANDMARK_COUNT,
  MAX_HANDS,
  PINCH_RELEASE,
  PINCH_THRESHOLD,
  handStateRef,
  resetHandState,
  type HandDetectionMode,
} from './handStateRef';

/**
 * Single MediaPipe lifecycle: camera stream, GPU-first HandLandmarker (CPU fallback),
 * 1-euro smoothing, and writes into the mutable `handStateRef`. No React state is touched per frame.
 */

export type HandTrackerStatus = 'camera' | 'model' | 'searching' | 'tracking' | 'error';
export type HandDelegate = 'GPU' | 'CPU';

export interface HandTrackerCallbacks {
  onStatus: (status: HandTrackerStatus, detail: string, delegate: HandDelegate | null) => void;
  onTrackingAcquired?: () => void;
  onTrackingLost?: () => void;
  /** Camera permission failure — the host should hide the hands UI. */
  onCameraDenied?: () => void;
}

/** The glove frustum is kept in sync by HandGlove3D every frame (half extents at the glove plane). */
export const gloveFrustum = { halfW: 0.68, halfH: 0.5 };

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const REAL_PALM_METRES = 0.09;
const REACH = 0.92;
const DEPTH_GAIN = 1.5;
const LOST_GRACE_MS = 150;
const MIN_INTERVAL_MS = 16;
const MAX_INTERVAL_MS = 100;
const PALM_IDS = [0, 5, 9, 13, 17] as const;

interface SlotRuntime {
  filters: OneEuroFilter[];
  prevPalm: [number, number, number] | null;
  prevAtMs: number;
}

function createRuntime(): SlotRuntime {
  return {
    filters: Array.from({ length: LANDMARK_COUNT * 3 }, () => new OneEuroFilter(30, 1.2, 0.08, 1.0)),
    prevPalm: null,
    prevAtMs: 0,
  };
}

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private video: VideoWithFrameCallback | null = null;
  private engine = new HandGestureEngine(640, 480);
  private runtimes: SlotRuntime[] = [createRuntime(), createRuntime()];
  private cancelled = false;
  private frameHandle = 0;
  private usingVfc = false;
  private lastSeenAt = 0;
  private hadTrack = false;
  private lastVideoTime = -1;
  private lastDetectAt = 0;
  private interval = MIN_INTERVAL_MS;
  private delegate: HandDelegate | null = null;
  private mode: HandDetectionMode = 'two-hands';

  constructor(private readonly callbacks: HandTrackerCallbacks) {}

  setMode(mode: HandDetectionMode): void {
    this.mode = mode;
  }

  async start(video: HTMLVideoElement, mode: HandDetectionMode, phone: boolean): Promise<void> {
    this.cancelled = false;
    this.video = video;
    this.mode = mode;
    this.callbacks.onStatus('camera', '', null);
    try {
      this.stream = await getSharedWebcamStream({
        video: phone
          ? { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' }
          : { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 60 }, facingMode: 'user' },
      });
    } catch (err) {
      if (this.cancelled) return;
      const detail = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : '';
      if (/cancelled/i.test(detail)) {
        this.callbacks.onStatus('error', 'Camera off', null);
        this.callbacks.onTrackingLost?.();
        return;
      }
      this.callbacks.onStatus('error', 'Camera blocked — touch orbit restored', null);
      this.callbacks.onTrackingLost?.();
      this.callbacks.onCameraDenied?.();
      return;
    }
    if (this.cancelled) {
      releaseSharedWebcamStream();
      return;
    }

    video.srcObject = this.stream;
    video.playsInline = true;
    video.muted = true;
    await video.play().catch(() => {});

    try {
      this.callbacks.onStatus('model', '', null);
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      if (this.cancelled) return;
      this.landmarker = await this.createLandmarker(vision);
      if (this.cancelled) {
        this.closeLandmarker();
        return;
      }
      handStateRef.current.active = true;
      this.callbacks.onStatus('searching', '', this.delegate);
      this.scheduleNext();
    } catch {
      if (this.cancelled) return;
      this.callbacks.onStatus('error', 'Hand model unavailable — touch orbit still works', null);
      this.callbacks.onTrackingLost?.();
    }
  }

  private async createLandmarker(vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>): Promise<HandLandmarker> {
    const build = (delegate: HandDelegate) =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: MAX_HANDS,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    try {
      const landmarker = await build('GPU');
      this.delegate = 'GPU';
      return landmarker;
    } catch {
      const landmarker = await build('CPU');
      this.delegate = 'CPU';
      return landmarker;
    }
  }

  private closeLandmarker(): void {
    if (!this.landmarker) return;
    try {
      this.landmarker.close();
    } catch {
      // ignore
    }
    this.landmarker = null;
  }

  private scheduleNext(): void {
    if (this.cancelled || !this.video) return;
    const v = this.video;
    if (typeof v.requestVideoFrameCallback === 'function') {
      this.usingVfc = true;
      this.frameHandle = v.requestVideoFrameCallback(() => this.detect());
    } else {
      this.usingVfc = false;
      this.frameHandle = requestAnimationFrame(() => this.detect());
    }
  }

  private async fallBackToCpu(): Promise<void> {
    if (this.delegate !== 'GPU' || this.cancelled) return;
    this.closeLandmarker();
    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
    if (this.cancelled) return;
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: MAX_HANDS,
    });
    this.delegate = 'CPU';
    this.callbacks.onStatus(this.hadTrack ? 'tracking' : 'searching', '', 'CPU');
  }

  private detect(): void {
    if (this.cancelled) return;
    const v = this.video;
    const landmarker = this.landmarker;
    if (!v || !landmarker) return;
    const now = performance.now();
    const ready =
      v.readyState >= 2 &&
      v.videoWidth > 0 &&
      now - this.lastDetectAt >= this.interval &&
      v.currentTime !== this.lastVideoTime;
    if (!ready) {
      this.scheduleNext();
      return;
    }
    this.lastVideoTime = v.currentTime;
    this.lastDetectAt = now;

    let result: ReturnType<HandLandmarker['detectForVideo']> | null = null;
    try {
      result = landmarker.detectForVideo(v, now);
    } catch {
      if (this.delegate === 'GPU') {
        void this.fallBackToCpu().finally(() => this.scheduleNext());
        return;
      }
    }
    const cost = performance.now() - now;
    this.interval = Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, cost * 1.2));

    if (result) this.ingest(result, v.videoWidth, v.videoHeight);
    this.scheduleNext();
  }

  private ingest(result: ReturnType<HandLandmarker['detectForVideo']>, vw: number, vh: number): void {
    const state = handStateRef.current;
    const t = performance.now();
    const detected = (result.landmarks ?? []).map((lm, i) => ({ lm, score: result.handedness?.[i]?.[0]?.score ?? 1 }));
    const wanted = this.mode === 'two-hands' ? 2 : 1;
    const picked = detected.slice(0, wanted);
    // Slot 0 is the hand on the left of the camera view so the pair keeps a stable order frame to frame.
    if (picked.length === 2) picked.sort((a, b) => b.lm[0].x - a.lm[0].x);
    const hands = picked.map((p) => p.lm);

    if (hands.length === 0) {
      if (this.lastSeenAt > 0 && t - this.lastSeenAt > LOST_GRACE_MS) {
        this.lastSeenAt = 0;
        this.markLost(t);
      }
      return;
    }
    this.lastSeenAt = t;

    const aspect = vw / vh;
    const { halfW, halfH } = gloveFrustum;
    this.engine.setViewport(vw, vh);

    for (let hi = 0; hi < MAX_HANDS; hi += 1) {
      const slot = state.hands[hi];
      const lm = hands[hi];
      if (!lm) {
        slot.present = false;
        slot.pinching = false;
        slot.confidence = 0;
        slot.control = null;
        this.runtimes[hi] = createRuntime();
        continue;
      }
      const rt = this.runtimes[hi];
      const fx = new Float32Array(LANDMARK_COUNT);
      const fy = new Float32Array(LANDMARK_COUNT);
      const fz = new Float32Array(LANDMARK_COUNT);
      for (let li = 0; li < LANDMARK_COUNT; li += 1) {
        fx[li] = rt.filters[li * 3].filter(lm[li].x, t);
        fy[li] = rt.filters[li * 3 + 1].filter(lm[li].y, t);
        fz[li] = rt.filters[li * 3 + 2].filter(lm[li].z, t);
      }

      const palmUnits = Math.max(0.02, Math.hypot((fx[9] - fx[0]) * aspect, fy[9] - fy[0]));
      const k = Math.min(1.8, Math.max(0.4, REAL_PALM_METRES / palmUnits));
      const wristX = (1 - 2 * fx[0]) * halfW * REACH;
      const wristY = (1 - 2 * fy[0]) * halfH * REACH;
      const out = slot.landmarks;
      for (let li = 0; li < LANDMARK_COUNT; li += 1) {
        out[li * 3] = wristX - (fx[li] - fx[0]) * aspect * k;
        out[li * 3 + 1] = wristY - (fy[li] - fy[0]) * k;
        out[li * 3 + 2] = GLOVE_PLANE_Z - (fz[li] - fz[0]) * aspect * k * DEPTH_GAIN;
      }

      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const id of PALM_IDS) {
        cx += out[id * 3];
        cy += out[id * 3 + 1];
        cz += out[id * 3 + 2];
      }
      const palm: [number, number, number] = [cx / PALM_IDS.length, cy / PALM_IDS.length, cz / PALM_IDS.length];
      if (rt.prevPalm && t > rt.prevAtMs) {
        const dt = (t - rt.prevAtMs) / 1000;
        for (let a = 0; a < 3; a += 1) {
          const raw = (palm[a] - rt.prevPalm[a]) / dt;
          slot.velocity[a] += (raw - slot.velocity[a]) * 0.5;
        }
      } else {
        slot.velocity = [0, 0, 0];
      }
      rt.prevPalm = palm;
      rt.prevAtMs = t;

      const ax = out[5 * 3] - out[0];
      const ay = out[5 * 3 + 1] - out[1];
      const az = out[5 * 3 + 2] - out[2];
      const bx = out[17 * 3] - out[0];
      const by = out[17 * 3 + 1] - out[1];
      const bz = out[17 * 3 + 2] - out[2];
      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      slot.palmNormal = [nx, ny, nz];
      slot.wristRoll = Math.atan2(out[9 * 3] - out[0], out[9 * 3 + 1] - out[1]);

      const pinch = Math.hypot(
        out[4 * 3] - out[8 * 3],
        out[4 * 3 + 1] - out[8 * 3 + 1],
        out[4 * 3 + 2] - out[8 * 3 + 2]
      );
      slot.pinchDistance = pinch;
      slot.pinching = pinch < PINCH_THRESHOLD ? true : pinch > PINCH_RELEASE ? false : slot.pinching;
      slot.present = true;
      slot.confidence = picked[hi].score;

      if (hi === 0) {
        const pts: ScreenPoint[] = [];
        for (let li = 0; li < LANDMARK_COUNT; li += 1) {
          pts.push({ x: (1 - fx[li]) * vw, y: fy[li] * vh });
        }
        slot.control = this.engine.update(pts, t);
      } else {
        slot.control = null;
      }
    }

    state.tracking = true;
    state.updatedAtMs = t;
    state.frameId += 1;
    if (!this.hadTrack) {
      this.hadTrack = true;
      this.callbacks.onTrackingAcquired?.();
      this.callbacks.onStatus('tracking', '', this.delegate);
    }
  }

  private markLost(t: number): void {
    this.engine.reset();
    const state = handStateRef.current;
    for (const slot of state.hands) {
      slot.present = false;
      slot.pinching = false;
      slot.velocity = [0, 0, 0];
      slot.control = null;
    }
    this.runtimes = [createRuntime(), createRuntime()];
    state.tracking = false;
    state.updatedAtMs = t;
    state.frameId += 1;
    this.callbacks.onStatus('searching', '', this.delegate);
    if (this.hadTrack) {
      this.hadTrack = false;
      this.callbacks.onTrackingLost?.();
    }
  }

  stop(): void {
    this.cancelled = true;
    const v = this.video;
    if (v) {
      if (this.usingVfc && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(this.frameHandle);
      else cancelAnimationFrame(this.frameHandle);
      v.srcObject = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    // Force-stop so iOS Safari clears the green camera indicator even if the refcount races.
    forceStopSharedWebcamStream();
    releaseSharedWebcamStream();
    this.stream = null;
    this.closeLandmarker();
    resetHandState();
    if (this.hadTrack) {
      this.hadTrack = false;
      this.callbacks.onTrackingLost?.();
    }
  }
}
