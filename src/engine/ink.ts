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
import type { PageMark, Sticker, Stroke, StrokeBatch, StrokePoint, ToolId } from '@/types/ink';
import { isToolId } from './tools';
import { isSticker, isStickerId, isStroke } from './stickers';
import type { Viewport } from './geometry';

/** Version stamped onto serialized batches. Bump when the shape changes. */
export const STROKE_BATCH_VERSION = 1 as const;

/** A raw pointer sample in the same coordinate space as the active Viewport. */
export type PointerSample = { x: number; y: number; pressure: number };

/**
 * Committed-state change notifications. Each event carries enough payload for
 * a persistence layer to mirror the change without re-reading engine state
 * (a commit carries the committed mark). The in-progress stroke never emits:
 * the hot path stays quiet.
 */
export type InkEvent =
  | { type: 'commit'; pageNumber: number; mark: PageMark }
  | { type: 'undo'; pageNumber: number }
  | { type: 'redo'; pageNumber: number; mark: PageMark }
  | { type: 'clear'; pageNumber: number }
  | { type: 'load'; pageNumber: number };

export type InkEventListener = (event: InkEvent) => void;

const DEFAULT_TOOL: ToolId = 'crayon';
const DEFAULT_COLOR = '#2b2b2b';
const DEFAULT_SIZE = 0.012;
const MIN_SIZE = 0.001;
const MAX_SIZE = 0.2;
const FIRST_PAGE = 1;

const EMPTY_MARKS: readonly PageMark[] = Object.freeze([]);

/** Clamp pressure into [0, 1]; absent or NaN pressure becomes a neutral 0.5. */
function normalizePressure(pressure: number): number {
  if (Number.isNaN(pressure) || pressure <= 0) return 0.5;
  return pressure > 1 ? 1 : pressure;
}

/** Deep-copy a mark so stored and serialized marks never alias. */
function cloneMark(mark: PageMark): PageMark {
  if (isSticker(mark)) {
    return { ...mark };
  }
  return {
    ...(mark.kind ? { kind: mark.kind } : {}),
    tool: mark.tool,
    color: mark.color,
    size: mark.size,
    points: mark.points.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure })),
  };
}

/** Reconstruct a stroke from untrusted data, or null if unusable. */
function sanitizeStroke(record: Record<string, unknown>): Stroke | null {
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

/** Reconstruct a sticker from untrusted data, or null if unusable. */
function sanitizeSticker(record: Record<string, unknown>): Sticker | null {
  if (!isStickerId(record.sticker)) return null;
  if (typeof record.x !== 'number' || typeof record.y !== 'number') return null;
  const size = typeof record.size === 'number' && record.size > 0 ? record.size : 0.16;
  const rotation = typeof record.rotation === 'number' ? record.rotation : 0;
  return { kind: 'sticker', sticker: record.sticker, x: record.x, y: record.y, size, rotation };
}

/**
 * Defensively reconstruct a mark from untrusted data (e.g. a corrupt record
 * read from IndexedDB). Returns null rather than throwing, so one bad mark can
 * never take down a whole page load. Protects the never-lose-a-drawing
 * guarantee on the read path.
 */
function sanitizeMark(value: unknown): PageMark | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  return record.kind === 'sticker' ? sanitizeSticker(record) : sanitizeStroke(record);
}

/**
 * The framework-agnostic ink engine. One instance backs the whole drawing
 * surface; the active page selects which mark list input and undo target.
 */
export class InkEngine {
  private readonly pages = new Map<number, PageMark[]>();
  /**
   * Per-page redo stack: marks removed by undo, in undo order, available to
   * redo until a new mark is committed. Session-only; not persisted (a reload
   * reflects the committed state, with no redo history).
   */
  private readonly redoStacks = new Map<number, PageMark[]>();
  private readonly listeners = new Set<InkEventListener>();

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
    this.marksFor(this.activePage).push(stroke);
    this.redoStacks.set(this.activePage, []); // a new mark invalidates redo
    this.emit({ type: 'commit', pageNumber: this.activePage, mark: stroke });
    return stroke;
  }

  /** Discard the in-progress stroke without committing (e.g. gesture cancel). */
  cancelStroke(): void {
    this.current = null;
  }

  getCurrentStroke(): Stroke | null {
    return this.current;
  }

  // --- stickers (F1.12) ----------------------------------------------------

  /**
   * Place a sticker on the active page as the next mark. Commits immediately
   * (there is no in-progress phase) and emits a commit so it persists and
   * renders. Returns the placed sticker.
   */
  placeSticker(sticker: Sticker): Sticker {
    const mark = cloneMark(sticker) as Sticker;
    this.marksFor(this.activePage).push(mark);
    this.redoStacks.set(this.activePage, []); // a new mark invalidates redo
    this.emit({ type: 'commit', pageNumber: this.activePage, mark });
    return mark;
  }

  // --- history -------------------------------------------------------------

  /** Pop the most recent mark (stroke or sticker) onto the redo stack. */
  undo(): boolean {
    const marks = this.pages.get(this.activePage);
    if (!marks || marks.length === 0) return false;
    const mark = marks.pop();
    if (mark) this.redoStackFor(this.activePage).push(mark);
    this.emit({ type: 'undo', pageNumber: this.activePage });
    return true;
  }

  /** Re-apply the most recently undone mark. Returns false if nothing to redo. */
  redo(): boolean {
    const stack = this.redoStacks.get(this.activePage);
    if (!stack || stack.length === 0) return false;
    const mark = stack.pop();
    if (!mark) return false;
    this.marksFor(this.activePage).push(mark);
    this.emit({ type: 'redo', pageNumber: this.activePage, mark });
    return true;
  }

  canUndo(pageNumber: number = this.activePage): boolean {
    return (this.pages.get(pageNumber)?.length ?? 0) > 0;
  }

  canRedo(pageNumber: number = this.activePage): boolean {
    return (this.redoStacks.get(pageNumber)?.length ?? 0) > 0;
  }

  /** Remove every mark from a page and drop its redo history. */
  clearPage(pageNumber: number = this.activePage): void {
    this.pages.set(pageNumber, []);
    this.redoStacks.set(pageNumber, []);
    this.emit({ type: 'clear', pageNumber });
  }

  // --- reads ---------------------------------------------------------------

  /** Every mark on a page in draw order (strokes and stickers). */
  getPageMarks(pageNumber: number = this.activePage): readonly PageMark[] {
    return this.pages.get(pageNumber) ?? EMPTY_MARKS;
  }

  /** Only the strokes on a page, for canvas rendering. */
  getPageStrokes(pageNumber: number = this.activePage): readonly Stroke[] {
    return (this.pages.get(pageNumber) ?? EMPTY_MARKS).filter(isStroke);
  }

  /** Only the stickers on a page, for the sticker overlay. */
  getPageStickers(pageNumber: number = this.activePage): readonly Sticker[] {
    return (this.pages.get(pageNumber) ?? EMPTY_MARKS).filter(isSticker);
  }

  /** Total marks on a page (strokes plus stickers). */
  getMarkCount(pageNumber: number = this.activePage): number {
    return this.pages.get(pageNumber)?.length ?? 0;
  }

  // --- serialization -------------------------------------------------------

  /** Snapshot a page's marks into a single compacted, versioned batch. */
  serializePage(pageNumber: number = this.activePage): StrokeBatch {
    const marks = this.pages.get(pageNumber) ?? [];
    return {
      version: STROKE_BATCH_VERSION,
      pageNumber,
      strokes: marks.map(cloneMark),
    };
  }

  /**
   * Replace a page's marks with the ordered reduction of the given batches.
   * Only batches matching `pageNumber` contribute; malformed marks are skipped
   * rather than throwing.
   */
  loadPage(pageNumber: number, batches: readonly StrokeBatch[]): void {
    const marks: PageMark[] = [];
    for (const batch of batches) {
      if (batch.pageNumber !== pageNumber || !Array.isArray(batch.strokes)) continue;
      for (const raw of batch.strokes) {
        const mark = sanitizeMark(raw);
        if (mark) marks.push(mark);
      }
    }
    this.pages.set(pageNumber, marks);
    this.redoStacks.set(pageNumber, []);
    this.emit({ type: 'load', pageNumber });
  }

  // --- change notification (NOT React) -------------------------------------

  onChange(listener: InkEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- internals -----------------------------------------------------------

  private marksFor(pageNumber: number): PageMark[] {
    let marks = this.pages.get(pageNumber);
    if (!marks) {
      marks = [];
      this.pages.set(pageNumber, marks);
    }
    return marks;
  }

  private redoStackFor(pageNumber: number): PageMark[] {
    let stack = this.redoStacks.get(pageNumber);
    if (!stack) {
      stack = [];
      this.redoStacks.set(pageNumber, stack);
    }
    return stack;
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

  private emit(event: InkEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
