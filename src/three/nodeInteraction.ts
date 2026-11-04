import * as THREE from 'three';
import { type HandSlot } from './handStateRef';

/**
 * Single-hand node interaction in camera-local space. There are no 3D rails or buttons: the glove is
 * the only tracking feedback and nodes are the only targets. One hand does exactly three things:
 *
 *   point  the index fingertip positions the pointer in the scene
 *   hover  fingertip inside the enter radius lights the node (kept until it leaves the larger exit radius)
 *   poke   pointing finger pushed toward the lens; fires once at POKE_FIRE and re-arms below POKE_REARM
 *
 * It never moves the camera. When both hands are tracked the layer stands down completely, because
 * two hands together are the only camera authority (see TwoHandGestureTracker).
 * Every action needs tracking confidence and a short stable dwell, so a flickering landmark never fires.
 * While a poke is engaged the camera must not move (reported as `locked`).
 */

export const NODE_HOVER_ENTER_RADIUS = 0.08;
export const NODE_HOVER_EXIT_RADIUS = 0.11;
export const NODE_MIN_CONFIDENCE = 0.6;
export const NODE_HOVER_DWELL_MS = 80;
export const POKE_FIRE = 0.6;
export const POKE_REARM = 0.25;
const POKE_ENGAGE = 0.05;
const POKE_MIN_REACH = 0.012;
const POKE_FULL_REACH = 0.06;

export interface NodeInteractionActions {
  /**
   * Id of the active environment's node nearest a camera-local point within `radius`, or null.
   * When `preferId` is within `radius` it wins, which is what keeps hover from flickering at the edge.
   */
  probeNode: (point: THREE.Vector3, radius: number, preferId: string | null) => string | null;
  /** Poke committed on a node. */
  onNodeSelect: (nodeId: string) => void;
  /** Hover glow on or off. Called only when the hovered node changes. */
  onHover: (nodeId: string | null) => void;
}

export interface UiInteractResult {
  /** The camera must not move: a poke is engaged (pointing at a node with the finger pushed forward). */
  locked: boolean;
  /** Node under the pointing fingertip, or null. */
  hoverId: string | null;
}

type HandRuntime = {
  hoverId: string | null;
  hoverSinceMs: number;
  pokeArmed: boolean;
};

const _tip = new THREE.Vector3();
const _palm = new THREE.Vector3();

function reachRatio(L: Float32Array, tipIdx: number, palmSize: number): number {
  return Math.hypot(L[tipIdx * 3] - L[0], L[tipIdx * 3 + 1] - L[1], L[tipIdx * 3 + 2] - L[2]) / palmSize;
}

/** Index finger extended while middle and ring are curled. Works for either slot. */
export function isPointingPose(L: Float32Array): boolean {
  const palmSize = Math.max(1e-4, Math.hypot(L[27] - L[0], L[28] - L[1], L[29] - L[2]));
  return reachRatio(L, 8, palmSize) > 1.7 && reachRatio(L, 12, palmSize) < 1.5 && reachRatio(L, 16, palmSize) < 1.5;
}

function freshRuntime(): HandRuntime {
  return { hoverId: null, hoverSinceMs: 0, pokeArmed: true };
}

export class NodeInteractionLayer {
  private readonly runtimes: HandRuntime[] = [freshRuntime(), freshRuntime()];
  private reportedHover: string | null = null;
  private readonly usable: boolean[] = [false, false];

  constructor(private readonly actions: NodeInteractionActions) {}

  hoveredNodeId(): string | null {
    return this.reportedHover;
  }

  private publishHover(id: string | null): void {
    if (id === this.reportedHover) return;
    this.reportedHover = id;
    this.actions.onHover(id);
  }

  update(nowMs: number, hands: readonly HandSlot[], handsFresh: boolean): UiInteractResult {
    let usableCount = 0;
    for (let hi = 0; hi < this.runtimes.length; hi += 1) {
      const h = hands[hi];
      const ok = !!h && h.present && handsFresh && h.confidence >= NODE_MIN_CONFIDENCE;
      this.usable[hi] = ok;
      if (ok) usableCount += 1;
    }
    const usable = this.usable;
    if (usableCount !== 1) {
      this.reset();
      return { locked: false, hoverId: null };
    }

    let engaged = false;
    let hover: string | null = null;

    for (let hi = 0; hi < this.runtimes.length; hi += 1) {
      const rt = this.runtimes[hi];
      const hand = hands[hi];
      if (!usable[hi]) {
        this.runtimes[hi] = freshRuntime();
        continue;
      }
      const L = hand.landmarks;
      _tip.set(L[24], L[25], L[26]);
      _palm.set((L[0] + L[15] + L[27] + L[39] + L[51]) / 5, (L[1] + L[16] + L[28] + L[40] + L[52]) / 5, (L[2] + L[17] + L[29] + L[41] + L[53]) / 5);

      let next: string | null = rt.hoverId;
      if (rt.hoverId) {
        const kept = this.actions.probeNode(_tip, NODE_HOVER_EXIT_RADIUS, rt.hoverId);
        if (kept !== rt.hoverId) next = this.actions.probeNode(_tip, NODE_HOVER_ENTER_RADIUS, null);
      } else {
        next = this.actions.probeNode(_tip, NODE_HOVER_ENTER_RADIUS, null);
      }
      if (next !== rt.hoverId) {
        rt.hoverId = next;
        rt.hoverSinceMs = nowMs;
        rt.pokeArmed = true;
      }
      if (!rt.hoverId) continue;
      hover = hover ?? rt.hoverId;

      const stable = nowMs - rt.hoverSinceMs >= NODE_HOVER_DWELL_MS;
      const pointing = isPointingPose(L);
      const reach = THREE.MathUtils.clamp((_tip.z - _palm.z - POKE_MIN_REACH) / (POKE_FULL_REACH - POKE_MIN_REACH), 0, 1);
      if (pointing && reach > POKE_ENGAGE) engaged = true;
      if (pointing && stable && rt.pokeArmed && reach >= POKE_FIRE) {
        rt.pokeArmed = false;
        this.actions.onNodeSelect(rt.hoverId);
      } else if (!rt.pokeArmed && (reach <= POKE_REARM || !pointing)) {
        rt.pokeArmed = true;
      }
    }

    this.publishHover(hover);
    return { locked: engaged, hoverId: hover };
  }

  reset(): void {
    this.runtimes[0] = freshRuntime();
    this.runtimes[1] = freshRuntime();
    this.publishHover(null);
  }
}
