/**
 * Coordinate math and perfect-freehand integration.
 *
 * Zero React, zero DOM-mutation: this is hot-path geometry that must be
 * benchmarkable without a browser. The only platform types used are the
 * structural canvas surface (`RenderTarget`, declared in renderer.ts) which
 * is passed in, never imported from a framework.
 */
import { getStroke } from 'perfect-freehand';
import type { StrokeOptions } from 'perfect-freehand';
import type { NormPoint, StrokePoint } from '@/types/ink';

/** Pixel dimensions of the page surface a stroke is rendered onto. */
export type PageSize = { width: number; height: number };

/**
 * Where the page surface sits in pointer-event space, so raw client
 * coordinates can be normalized. `origin` is the top-left of the page in the
 * same space as the incoming pointer x/y.
 */
export type Viewport = { originX: number; originY: number; width: number; height: number };

/** Clamp a value into the normalized [0, 1] range. NaN collapses to 0. */
export function clamp01(n: number): number {
  if (Number.isNaN(n) || n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Normalize a raw pointer position against the page viewport. */
export function toNormPoint(clientX: number, clientY: number, view: Viewport): NormPoint {
  const w = view.width > 0 ? view.width : 1;
  const h = view.height > 0 ? view.height : 1;
  return {
    x: clamp01((clientX - view.originX) / w),
    y: clamp01((clientY - view.originY) / h),
  };
}

/** Denormalize a stored point back to pixel space for a given page size. */
export function toPixel(point: NormPoint, size: PageSize): NormPoint {
  return { x: point.x * size.width, y: point.y * size.height };
}

/**
 * Run perfect-freehand over a normalized stroke to produce a fill outline in
 * pixel space. `size` is normalized to page width, so brush thickness scales
 * with the rendered page. Returns the outline polygon as [x, y] pairs.
 */
export function buildOutline(
  points: readonly StrokePoint[],
  size: PageSize,
  brushSize: number,
  options: StrokeOptions,
): number[][] {
  if (points.length === 0) return [];
  const input: number[][] = points.map((p) => [p.x * size.width, p.y * size.height, p.pressure]);
  return getStroke(input, { ...options, size: brushSize * size.width });
}

/**
 * Trace a perfect-freehand outline onto a path using quadratic midpoint
 * smoothing (control point = vertex, anchor = midpoint of each edge). This is
 * the smoothing stage of the pipeline; the caller owns beginPath/fill so the
 * tool renderer can apply per-pass compositing.
 */
export function traceOutline(ctx: PathSink, outline: readonly number[][]): void {
  const len = outline.length;
  if (len < 2) return;

  const first = outline[0];
  if (!first) return;
  ctx.moveTo(first[0] ?? 0, first[1] ?? 0);

  for (let i = 0; i < len; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % len];
    if (!a || !b) continue;
    const ax = a[0] ?? 0;
    const ay = a[1] ?? 0;
    const mx = (ax + (b[0] ?? 0)) / 2;
    const my = (ay + (b[1] ?? 0)) / 2;
    ctx.quadraticCurveTo(ax, ay, mx, my);
  }
  ctx.closePath();
}

/** The path-building subset of a 2D context that `traceOutline` needs. */
export type PathSink = {
  moveTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  closePath(): void;
};
