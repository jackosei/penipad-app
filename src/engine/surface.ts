/**
 * Canvas stack controller for one drawing surface. Zero React.
 *
 * Two layers above the PDF canvas:
 *  - committed: all committed strokes for the active page. Painted
 *    incrementally on commit (one stroke), fully replayed on undo/clear/load.
 *  - live: only the in-progress stroke, repainted at most once per animation
 *    frame. Cleared when the stroke commits or cancels.
 *
 * The committed layer is the "committed-layer snapshot model" from the
 * rendering pipeline decision: commits never re-render history, so the cost
 * of a stroke commit is one stroke, not N.
 */
import type { InkEngine, InkEvent } from './ink';
import { renderStroke, renderStrokes, type RenderTarget } from './renderer';
import { isSticker } from './stickers';
import type { PageSize } from './geometry';

type Scheduler = (callback: () => void) => void;

const defaultScheduler: Scheduler =
  typeof requestAnimationFrame === 'function'
    ? (cb) => requestAnimationFrame(() => cb())
    : (cb) => setTimeout(cb, 16);

/** What the surface needs from a 2D context: rendering plus clearing. */
export type SurfaceContext = RenderTarget & Pick<CanvasRenderingContext2D, 'clearRect'>;

/**
 * Structural canvas contract so the surface drives a real canvas in the app
 * and a recording fake in tests (jsdom has no 2D context).
 */
export type SurfaceCanvas = {
  width: number;
  height: number;
  getContext(contextId: '2d'): SurfaceContext | null;
};

export type InkSurfaceOptions = {
  engine: InkEngine;
  committedCanvas: SurfaceCanvas;
  liveCanvas: SurfaceCanvas;
  /** Frame scheduler; injectable for tests. Defaults to requestAnimationFrame. */
  scheduler?: Scheduler;
};

export class InkSurface {
  private readonly engine: InkEngine;
  private readonly committedCanvas: SurfaceCanvas;
  private readonly liveCanvas: SurfaceCanvas;
  private readonly scheduler: Scheduler;
  private readonly unsubscribe: () => void;

  private pageSize: PageSize = { width: 0, height: 0 };
  private frameQueued = false;
  private disposed = false;

  constructor(options: InkSurfaceOptions) {
    this.engine = options.engine;
    this.committedCanvas = options.committedCanvas;
    this.liveCanvas = options.liveCanvas;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.unsubscribe = this.engine.onChange(this.onInkEvent);
  }

  /**
   * Size both layers' backing stores (device pixels) for the displayed page.
   * Resizing clears canvases, so the committed layer is replayed; normalized
   * stroke storage makes this lossless (F1.5).
   */
  setPageSize(pixelWidth: number, pixelHeight: number): void {
    this.pageSize = { width: pixelWidth, height: pixelHeight };
    for (const canvas of [this.committedCanvas, this.liveCanvas]) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    this.replayCommitted();
  }

  /** Repaint the live layer on the next frame (collapses bursts to one paint). */
  scheduleLiveFrame(): void {
    if (this.frameQueued || this.disposed) return;
    this.frameQueued = true;
    this.scheduler(() => {
      this.frameQueued = false;
      if (!this.disposed) this.paintLive();
    });
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe();
  }

  // --- internals -------------------------------------------------------------

  private readonly onInkEvent = (event: InkEvent): void => {
    if (event.pageNumber !== this.engine.getActivePage()) return;
    switch (event.type) {
      case 'commit': {
        // Stickers render in the DOM overlay, not on the ink canvas.
        if (isSticker(event.mark)) break;
        // Incremental: paint just the new stroke onto the committed layer.
        const ctx = this.committedCanvas.getContext('2d');
        if (ctx) renderStroke(ctx, event.mark, this.pageSize);
        this.scheduleLiveFrame(); // clears the now-committed live stroke
        break;
      }
      case 'redo':
      case 'undo':
      case 'clear':
      case 'load':
        // A mark appeared or disappeared at the end of the list; full replay
        // keeps the committed layer correct (stickers update via their overlay).
        this.replayCommitted();
        break;
    }
  };

  private replayCommitted(): void {
    const ctx = this.committedCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.committedCanvas.width, this.committedCanvas.height);
    renderStrokes(ctx, this.engine.getPageStrokes(), this.pageSize);
    this.scheduleLiveFrame();
  }

  private paintLive(): void {
    const ctx = this.liveCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.liveCanvas.width, this.liveCanvas.height);
    const current = this.engine.getCurrentStroke();
    if (current) renderStroke(ctx, current, this.pageSize);
  }
}
