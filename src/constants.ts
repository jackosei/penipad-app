/**
 * App-wide constants: performance budgets, palette, and sizing.
 * Single source of truth for the numbers in CLAUDE.md "QUICK REFERENCE".
 * Anything that the engine, UI, or tests assert against lives here, not inline.
 */

/** Performance budgets. These are asserted in CI; do not loosen without a PRD update. */
export const PERF_BUDGETS = {
  /** Max ink latency added over platform touch latency, in milliseconds (PRD principle 2). */
  INK_LATENCY_MS: 16,
  /** Time to first stroke for a brand-new user, in milliseconds. */
  TTFS_NEW_USER_MS: 30_000,
  /** Time to first stroke for a returning user, in milliseconds. */
  TTFS_RETURNING_USER_MS: 10_000,
  /** First PDF page interactive after import, in milliseconds. */
  FIRST_PAGE_INTERACTIVE_MS: 2_000,
} as const;

/** Sizing constraints for the child zone (icon-only, pre-reader friendly). */
export const CHILD_ZONE = {
  /** Minimum touch target edge, in CSS pixels (PRD principle 3). */
  MIN_TOUCH_TARGET_PX: 56,
} as const;

/** Ink storage invariants. Coordinates are always normalized to the page. */
export const INK = {
  /** Normalized coordinate bounds. All stored points are clamped to this range. */
  NORM_MIN: 0,
  NORM_MAX: 1,
  /** Minimum strokes the undo history must retain. */
  UNDO_HISTORY_MIN: 50,
} as const;

/**
 * The 8-color child palette (F1.4). High-saturation, names irrelevant: the
 * child picks by sight. Order matches the tray layout left to right.
 */
export const INK_PALETTE = [
  '#E5484D', // red
  '#F76B15', // orange
  '#FFC53D', // yellow
  '#46A758', // green
  '#0090FF', // blue
  '#8E4EC6', // purple
  '#8D6E63', // brown
  '#1B1B1F', // near-black
] as const;

/** Three brush sizes (F1.4), normalized to page width like Stroke.size. */
export const BRUSH_SIZES = [0.008, 0.014, 0.024] as const;

/** Parental gate (Phase 1, UI-only barrier): hold duration in milliseconds. */
export const PARENT_GATE_HOLD_MS = 3000;

/** Local persistence guardrails. */
export const STORAGE = {
  /** Warn the parent once estimated usage crosses this, in bytes. */
  WARNING_THRESHOLD_BYTES: 200 * 1024 * 1024,
} as const;

/** PDF rendering guardrails. */
export const PDF = {
  /**
   * Max rasterized pixels per page canvas. 4096x4096 is the iOS Safari canvas
   * ceiling and a sane memory cap for low-end Android (one page at this size
   * is ~64 MB RGBA). Render scale is clamped to stay under it.
   */
  MAX_RENDER_PIXELS: 4096 * 4096,
  /** How many PDFPageProxy objects stay warm in the virtualization cache. */
  PAGE_CACHE_SIZE: 5,
  /** Longest edge of a shelf cover thumbnail, in pixels. */
  THUMBNAIL_MAX_EDGE: 320,
  /** Lossy encode quality for thumbnails (WebP; PNG fallback ignores it). */
  THUMBNAIL_QUALITY: 0.8,
} as const;
