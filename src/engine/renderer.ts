/**
 * Canvas rendering pipeline.
 *
 * Renders strokes (committed or in-progress) onto any 2D-context-shaped
 * surface. `RenderTarget` is structurally a subset of CanvasRenderingContext2D,
 * so the same code drives a real `<canvas>`, an OffscreenCanvas worker context,
 * or a headless stub in tests and benchmarks. No React, no DOM lookups.
 */
import type { Stroke } from '@/types/ink';
import { buildOutline, traceOutline, type PageSize } from './geometry';
import { TOOL_CONFIGS } from './tools';

/** The slice of a 2D canvas context the renderer touches. */
export type RenderTarget = Pick<
  CanvasRenderingContext2D,
  | 'save'
  | 'restore'
  | 'beginPath'
  | 'moveTo'
  | 'quadraticCurveTo'
  | 'closePath'
  | 'fill'
  | 'globalCompositeOperation'
  | 'globalAlpha'
  | 'fillStyle'
>;

const ERASER_FILL = '#000000';

/**
 * Render one stroke onto the target. Each tool pass sets its own compositing
 * so the call is self-contained; the caller does not need to reset state.
 */
export function renderStroke(ctx: RenderTarget, stroke: Stroke, size: PageSize): void {
  const config = TOOL_CONFIGS[stroke.tool];
  const brushSize = stroke.size * config.sizeScale;
  const outline = buildOutline(stroke.points, size, brushSize, config.strokeOptions);
  if (outline.length < 2) return;

  const fillStyle = config.usesColor ? stroke.color : ERASER_FILL;

  for (const pass of config.passes) {
    ctx.save();
    ctx.globalCompositeOperation = pass.composite;
    ctx.globalAlpha = pass.alpha;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    traceOutline(ctx, outline);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Replay an ordered list of strokes onto the target. Order matters: an eraser
 * stroke only removes ink committed before it. Callers clear the target first
 * when doing a full repaint (e.g. after undo or page load).
 */
export function renderStrokes(ctx: RenderTarget, strokes: readonly Stroke[], size: PageSize): void {
  for (const stroke of strokes) {
    renderStroke(ctx, stroke, size);
  }
}
