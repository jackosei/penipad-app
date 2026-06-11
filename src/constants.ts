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

/** Local persistence guardrails. */
export const STORAGE = {
  /** Warn the parent once estimated usage crosses this, in bytes. */
  WARNING_THRESHOLD_BYTES: 200 * 1024 * 1024,
} as const;
