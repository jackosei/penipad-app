/**
 * Synthetic input builders for engine tests and the latency benchmark.
 * A reference 1000x1000 viewport keeps normalized math trivial to reason about:
 * a sample at (250, 750) lands at norm (0.25, 0.75).
 */
import type { PointerSample } from '@/engine/ink';
import type { Viewport, PageSize } from '@/engine/geometry';

export const REFERENCE_VIEWPORT: Viewport = {
  originX: 0,
  originY: 0,
  width: 1000,
  height: 1000,
};

export const REFERENCE_PAGE_SIZE: PageSize = { width: 1000, height: 1000 };

/** A pointer sample in viewport pixel space. */
export function sample(x: number, y: number, pressure = 0.5): PointerSample {
  return { x, y, pressure };
}

/**
 * A wiggling diagonal sweep of `count` samples, like a fast child scribble.
 * The sine term gives the path curvature so perfect-freehand does real work.
 */
export function syntheticSweep(
  count: number,
  view: Viewport = REFERENCE_VIEWPORT,
): PointerSample[] {
  const samples: PointerSample[] = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const x = t * view.width;
    const y = (0.5 + 0.3 * Math.sin(t * Math.PI * 6)) * view.height;
    const pressure = 0.4 + 0.4 * Math.sin(t * Math.PI * 3);
    samples.push({ x, y, pressure });
  }
  return samples;
}
