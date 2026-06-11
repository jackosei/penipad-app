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
export type ToolId = 'crayon' | 'marker' | 'eraser';

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
 */
export type Stroke = {
  tool: ToolId;
  color: string;
  size: number;
  points: StrokePoint[];
};

/**
 * The append-only, versioned unit of persistence for one page.
 *
 * A page's ink state is the ordered reduction (concatenation) of its batches'
 * strokes. Batches are never mutated in place; new ink is a new batch. The
 * `version` field lets future readers migrate older serializations.
 */
export type StrokeBatch = {
  version: 1;
  pageNumber: number;
  strokes: Stroke[];
};
