/**
 * Core ink store and pointer-input handling.
 *
 * This is the hot path. It holds the committed strokes per page and the single
 * in-progress stroke, and converts raw pointer samples into normalized stroke
 * points. It NEVER touches React, Zustand, or the DOM: rendering is done by the
 * caller via the renderer, and change notification is a plain observer so the
 * UI layer can subscribe without putting itself in the critical path.
 *
 * Persistence model: a page's ink is the ordered reduction of append-only
 * `StrokeBatch` records. `serializePage` produces a compacted snapshot batch;
 * `loadPage` reduces many batches back into strokes. Reconciling undo with
 * append-only storage (tombstones vs. rewrite) is a Step 4 concern.
 */
import type { Stroke, StrokeBatch, StrokePoint, ToolId } from '@/types/ink';
import { isToolId } from './tools';
import type { Viewport } from './geometry';

/** Version stamped onto serialized batches. Bump when the shape changes. */
export const STROKE_BATCH_VERSION = 1 as const;

/** A raw pointer sample in the same coordinate space as the active Viewport. */
export type PointerSample = { x: number; y: number; pressure: number };

/** Reasons the committed state changed. The in-progress stroke does not emit. */
export type InkChange = 'commit' | 'undo' | 'clear' | 'load';

export type InkChangeListener = (change: InkChange) => void;

const DEFAULT_TOOL: ToolId = 'crayon';
const DEFAULT_COLOR = '#2b2b2b';
const DEFAULT_SIZE = 0.012;
const MIN_SIZE = 0.001;
const MAX_SIZE = 0.2;
const FIRST_PAGE = 1;

const EMPTY_STROKES: readonly Stroke[] = Object.freeze([]);

/** Clamp pressure into [0, 1]; absent or NaN pressure becomes a neutral 0.5. */
function normalizePressure(pressure: number): number {
  if (Number.isNaN(pressure) || pressure <= 0) return 0.5;
  return pressure > 1 ? 1 : pressure;
}

/** Deep-copy a stroke so stored and serialized strokes never alias. */
function cloneStroke(stroke: Stroke): Stroke {
  return {
    tool: stroke.tool,
    color: stroke.color,
    size: stroke.size,
    points: stroke.points.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure })),
  };
}

/**
 * Defensively reconstruct a stroke from untrusted data (e.g. a corrupt record
 * read from IndexedDB). Returns null rather than throwing, so one bad stroke
 * can never take down a whole page load. This protects the never-lose-a-drawing
 * guarantee on the read path.
 */
function sanitizeStroke(value: unknown): Stroke | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!isToolId(record.tool)) return null;
  if (!Array.isArray(record.points)) return null;

  const points: StrokePoint[] = [];
  for (const raw of record.points) {
    if (typeof raw !== 'object' || raw === null) continue;
    const p = raw as Record<string, unknown>;
    if (typeof p.x !== 'number' || typeof p.y !== 'number') continue;
    const pressure = typeof p.pressure === 'number' ? p.pressure : 0.5;
    points.push({ x: p.x, y: p.y, pressure });
  }
  if (points.length === 0) return null;

  const color = typeof record.color === 'string' ? record.color : DEFAULT_COLOR;
  const size = typeof record.size === 'number' && record.size > 0 ? record.size : DEFAULT_SIZE;
  return { tool: record.tool, color, size, points };
}

/**
 * The framework-agnostic ink engine. One instance backs the whole drawing
 * surface; the active page selects which stroke list input and undo target.
 */
export class InkEngine {
  private readonly pages = new Map<number, Stroke[]>();
  private readonly listeners = new Set<InkChangeListener>();

  private activePage = FIRST_PAGE;
  private tool: ToolId = DEFAULT_TOOL;
  private color = DEFAULT_COLOR;
  private size = DEFAULT_SIZE;
  private current: Stroke | null = null;

  // --- tool / page configuration -------------------------------------------

  setActivePage(pageNumber: number): void {
    this.activePage = pageNumber;
  }

  getActivePage(): number {
    return this.activePage;
  }

  setTool(tool: ToolId): void {
    this.tool = tool;
  }

  getTool(): ToolId {
    return this.tool;
  }

  setColor(color: string): void {
    this.color = color;
  }

  getColor(): string {
    return this.color;
  }

  /** Set the normalized brush size, clamped to a sane range. */
  setSize(size: number): void {
    this.size = size < MIN_SIZE ? MIN_SIZE : size > MAX_SIZE ? MAX_SIZE : size;
  }

  getSize(): number {
    return this.size;
  }

  // --- stroke lifecycle (hot path) -----------------------------------------

  /** Start a new stroke at the first sample using the current tool/color/size. */
  beginStroke(sample: PointerSample, view: Viewport): void {
    this.current = {
      tool: this.tool,
      color: this.color,
      size: this.size,
      points: [this.toStrokePoint(sample, view)],
    };
  }

  /**
   * Append coalesced pointer samples to the in-progress stroke. Returns false
   * if there is no active stroke (a move without a down), so callers can ignore
   * stray events. Does not notify: the live stroke is drawn by the caller.
   */
  appendSamples(samples: readonly PointerSample[], view: Viewport): boolean {
    const current = this.current;
    if (!current) return false;
    for (const sample of samples) {
      current.points.push(this.toStrokePoint(sample, view));
    }
    return true;
  }

  /**
   * Finalize the in-progress stroke, commit it to the active page, and return
   * it so the caller can persist it as a batch. Returns null for an empty or
   * absent stroke.
   */
  endStroke(): Stroke | null {
    const stroke = this.current;
    this.current = null;
    if (!stroke || stroke.points.length === 0) return null;
    this.strokesFor(this.activePage).push(stroke);
    this.emit('commit');
    return stroke;
  }

  /** Discard the in-progress stroke without committing (e.g. gesture cancel). */
  cancelStroke(): void {
    this.current = null;
  }

  getCurrentStroke(): Stroke | null {
    return this.current;
  }

  // --- history -------------------------------------------------------------

  /** Pop the most recent stroke from the active page. Returns false if empty. */
  undo(): boolean {
    const strokes = this.pages.get(this.activePage);
    if (!strokes || strokes.length === 0) return false;
    strokes.pop();
    this.emit('undo');
    return true;
  }

  /** Remove every stroke from a page. */
  clearPage(pageNumber: number = this.activePage): void {
    this.pages.set(pageNumber, []);
    this.emit('clear');
  }

  // --- reads ---------------------------------------------------------------

  getPageStrokes(pageNumber: number = this.activePage): readonly Stroke[] {
    return this.pages.get(pageNumber) ?? EMPTY_STROKES;
  }

  getStrokeCount(pageNumber: number = this.activePage): number {
    return this.pages.get(pageNumber)?.length ?? 0;
  }

  // --- serialization -------------------------------------------------------

  /** Snapshot a page's strokes into a single compacted, versioned batch. */
  serializePage(pageNumber: number = this.activePage): StrokeBatch {
    const strokes = this.pages.get(pageNumber) ?? [];
    return {
      version: STROKE_BATCH_VERSION,
      pageNumber,
      strokes: strokes.map(cloneStroke),
    };
  }

  /**
   * Replace a page's strokes with the ordered reduction of the given batches.
   * Only batches matching `pageNumber` contribute; malformed strokes are
   * skipped rather than throwing.
   */
  loadPage(pageNumber: number, batches: readonly StrokeBatch[]): void {
    const strokes: Stroke[] = [];
    for (const batch of batches) {
      if (batch.pageNumber !== pageNumber || !Array.isArray(batch.strokes)) continue;
      for (const raw of batch.strokes) {
        const stroke = sanitizeStroke(raw);
        if (stroke) strokes.push(stroke);
      }
    }
    this.pages.set(pageNumber, strokes);
    this.emit('load');
  }

  // --- change notification (NOT React) -------------------------------------

  onChange(listener: InkChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- internals -----------------------------------------------------------

  private strokesFor(pageNumber: number): Stroke[] {
    let strokes = this.pages.get(pageNumber);
    if (!strokes) {
      strokes = [];
      this.pages.set(pageNumber, strokes);
    }
    return strokes;
  }

  private toStrokePoint(sample: PointerSample, view: Viewport): StrokePoint {
    const w = view.width > 0 ? view.width : 1;
    const h = view.height > 0 ? view.height : 1;
    const nx = (sample.x - view.originX) / w;
    const ny = (sample.y - view.originY) / h;
    return {
      x: nx < 0 ? 0 : nx > 1 ? 1 : nx,
      y: ny < 0 ? 0 : ny > 1 ? 1 : ny,
      pressure: normalizePressure(sample.pressure),
    };
  }

  private emit(change: InkChange): void {
    for (const listener of this.listeners) {
      listener(change);
    }
  }
}
