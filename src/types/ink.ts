/**
 * Ink data model: the system of record.
 *
 * Strokes are stored as vectors in normalized page coordinates (0..1 on both
 * axes). This file holds types only (see CLAUDE.md "Code Organization"); the
 * runtime tool registry and guards live in `src/engine/tools.ts`.
 *
 * These shapes are persisted to IndexedDB (Phase 1) and will map to Postgres
 * columns (Phase 2), so they must stay serialization-friendly: plain JSON
 * values, string-literal unions over TS enums, no class instances.
 */

/** The drawing tools. A closed set, modeled as a union so it serializes as a plain string. */
export type ToolId = 'crayon' | 'marker' | 'pencil' | 'eraser';

/** A point in normalized page space. Both axes are 0..1. */
export type NormPoint = { x: number; y: number };

/**
 * A stored stroke sample: normalized position plus pressure (0..1).
 * Pressure is captured raw from the pointer device; whether it is honored at
 * render time is a per-tool decision (see `TOOL_CONFIGS`).
 */
export type StrokePoint = { x: number; y: number; pressure: number };

/**
 * A single continuous mark, from pointerdown to pointerup.
 *
 * `size` is normalized to the page's reference axis (width), so stroke
 * thickness is resolution- and zoom-independent: it renders the same on a
 * phone and a tablet. `color` is a CSS color string; the eraser ignores it.
 *
 * `kind` is the optional discriminant for the PageMark union. It is omitted on
 * strokes written before stickers existed, so absence means "stroke".
 */
export type Stroke = {
  kind?: 'stroke';
  tool: ToolId;
  color: string;
  size: number;
  points: StrokePoint[];
};

/** The celebration stickers (F1.12). Cosmetic only; nothing unlocks. */
export type StickerId = 'star' | 'heart' | 'smile' | 'thumb' | 'flower' | 'rainbow';

/**
 * A placed sticker: a page decoration earned by tapping "Done" (F1.12).
 * Position and size are normalized to the page (like strokes), so it lands in
 * the same spot at any zoom or screen size. Persisted as a mark alongside
 * strokes; Phase 2 adds a separate sticker-book collection without migrating
 * these page decorations.
 */
export type Sticker = {
  kind: 'sticker';
  sticker: StickerId;
  /** Normalized center, 0..1. */
  x: number;
  y: number;
  /** Normalized to page width, like Stroke.size. */
  size: number;
  /** Degrees, for a playful tilt. */
  rotation: number;
};

/** Anything that lives on a page in draw order: a stroke or a sticker. */
export type PageMark = Stroke | Sticker;

/**
 * The append-only, versioned unit of persistence for one page.
 *
 * A page's state is the ordered reduction (concatenation) of its batches'
 * marks. Batches are never mutated in place; new ink is a new batch. The
 * `version` field lets future readers migrate older serializations. The field
 * is named `strokes` for wire stability (it predates stickers); it holds marks.
 */
export type StrokeBatch = {
  version: 1;
  pageNumber: number;
  strokes: PageMark[];
};
