/**
 * Frame-time governor for the pixel ratio. It watches a smoothed frame time and steps the ratio down when
 * the device cannot hold the budget, then back up slowly once there is headroom.
 *
 * requestAnimationFrame is pinned to the display refresh, so "headroom" cannot be judged against the
 * budget alone: a 60 Hz panel never reports less than ~16.7 ms. Headroom is therefore measured against the
 * fastest recent frame interval, which is the refresh interval when the GPU keeps up.
 */

export interface AdaptiveResolutionOptions {
  cap: number;
  floor: number;
  initial: number;
  budgetMs: number;
  step?: number;
  /** Minimum time between two down-steps, ms. Up-steps wait three times as long. */
  cooldownMs?: number;
}

const SMOOTHING = 0.08;
const DOWN_FACTOR = 1.12;
const UP_FACTOR = 1.15;
const REFRESH_DOWN_FACTOR = 1.25;
const MAX_SAMPLE_BUDGETS = 2.5;
const REFRESH_WINDOW = 120;
const MIN_REFRESH_MS = 5;
const MAX_REFRESH_MS = 16.8;
const UP_COOLDOWN_SCALE = 3;
const BACKOFF_WINDOW_MS = 20000;
const MAX_BACKOFF = 8;

export class AdaptiveResolution {
  private ratio: number;
  private smoothed: number;
  private lastChangeMs = 0;
  private lastUpMs = Number.NEGATIVE_INFINITY;
  private upBackoff = 1;
  private refreshMs: number;
  private windowMin = Number.POSITIVE_INFINITY;
  private windowCount = 0;
  private readonly step: number;
  private readonly cooldownMs: number;

  constructor(private readonly options: AdaptiveResolutionOptions) {
    this.ratio = clamp(options.initial, options.floor, options.cap);
    this.smoothed = options.budgetMs * 0.8;
    this.refreshMs = clamp(options.budgetMs, MIN_REFRESH_MS, MAX_REFRESH_MS);
    this.step = options.step ?? 0.25;
    this.cooldownMs = options.cooldownMs ?? 1200;
  }

  get pixelRatio(): number {
    return this.ratio;
  }

  /** Feed one frame. Returns the new ratio when it changed, otherwise null. */
  sample(frameMs: number, nowMs: number): number | null {
    if (!(frameMs > 0)) return null;
    this.trackRefresh(frameMs);
    // A hidden tab or a long task produces one huge sample; it says nothing about GPU load.
    const bounded = Math.min(frameMs, this.options.budgetMs * MAX_SAMPLE_BUDGETS);
    this.smoothed += (bounded - this.smoothed) * SMOOTHING;

    const { budgetMs, floor, cap } = this.options;
    const sinceChange = nowMs - this.lastChangeMs;
    const overBudget = this.smoothed > budgetMs * DOWN_FACTOR && this.smoothed > this.refreshMs * REFRESH_DOWN_FACTOR;
    const headroom = this.smoothed <= budgetMs * DOWN_FACTOR && this.smoothed <= this.refreshMs * UP_FACTOR;

    if (overBudget && this.ratio > floor && sinceChange >= this.cooldownMs) {
      // A down-step soon after an up-step means the last climb was too optimistic: wait longer next time.
      if (nowMs - this.lastUpMs < BACKOFF_WINDOW_MS) this.upBackoff = Math.min(MAX_BACKOFF, this.upBackoff * 2);
      return this.commit(Math.max(floor, this.ratio - this.step), nowMs);
    }
    if (headroom && this.ratio < cap && sinceChange >= this.cooldownMs * UP_COOLDOWN_SCALE * this.upBackoff) {
      this.lastUpMs = nowMs;
      return this.commit(Math.min(cap, this.ratio + this.step * 0.5), nowMs);
    }
    return null;
  }

  private commit(next: number, nowMs: number): number | null {
    if (next === this.ratio) return null;
    this.ratio = next;
    this.lastChangeMs = nowMs;
    return next;
  }

  private trackRefresh(frameMs: number): void {
    if (frameMs < MIN_REFRESH_MS) return;
    this.windowMin = Math.min(this.windowMin, frameMs);
    this.windowCount += 1;
    if (this.windowCount < REFRESH_WINDOW) return;
    this.refreshMs = clamp(this.windowMin, MIN_REFRESH_MS, MAX_REFRESH_MS);
    this.windowMin = Number.POSITIVE_INFINITY;
    this.windowCount = 0;
    if (this.smoothed <= this.refreshMs * UP_FACTOR) this.upBackoff = Math.max(1, this.upBackoff / 2);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
