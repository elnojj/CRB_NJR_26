type Point = { x: number; y: number };

export type OrbitPointerDelta = Point & {
  mode: 'orbit' | 'pan-pinch';
  dx: number;
  dy: number;
  pinchDelta: number;
  started: boolean;
};

/** Own only pointers that began on the canvas. Rebase whenever the finger count changes. */
export class OrbitPointerTracker {
  private readonly pointers = new Map<number, Point>();
  private down: Point = { x: 0, y: 0 };
  private previous: Point = { x: 0, y: 0 };
  private previousDistance = 0;
  private moved = false;

  get size(): number { return this.pointers.size; }

  begin(id: number, x: number, y: number): void {
    if (this.pointers.size === 0) this.moved = false;
    else this.moved = true;
    this.pointers.set(id, { x, y });
    this.rebase();
  }

  move(id: number, x: number, y: number): OrbitPointerDelta | null {
    if (!this.pointers.has(id)) return null;
    this.pointers.set(id, { x, y });
    const current = this.measure();
    const started = !this.moved;
    if (this.pointers.size === 1 && !this.moved && Math.hypot(x - this.down.x, y - this.down.y) <= 7) return null;
    this.moved = true;
    const delta: OrbitPointerDelta = {
      ...current, mode: this.pointers.size > 1 ? 'pan-pinch' : 'orbit',
      dx: current.x - this.previous.x, dy: current.y - this.previous.y,
      pinchDelta: this.pointers.size > 1 ? current.distance - this.previousDistance : 0,
      started,
    };
    this.previous = current;
    this.previousDistance = current.distance;
    return delta;
  }

  end(id: number, cancelled = false): boolean {
    if (!this.pointers.has(id)) return false;
    const tap = !cancelled && this.pointers.size === 1 && !this.moved;
    this.pointers.delete(id);
    if (this.pointers.size > 0) this.moved = true;
    this.rebase();
    return tap;
  }

  reset(): void {
    this.pointers.clear();
    this.moved = false;
  }

  private measure(): Point & { distance: number } {
    const [a, b] = this.pointers.values();
    if (!a) return { x: 0, y: 0, distance: 0 };
    if (!b) return { ...a, distance: 0 };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  private rebase(): void {
    const current = this.measure();
    this.down = this.previous = current;
    this.previousDistance = current.distance;
  }
}
