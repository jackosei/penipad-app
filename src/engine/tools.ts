/**
 * Tool definitions: the closed set of tools, their perfect-freehand geometry
 * options, and their canvas render passes (composite + alpha).
 *
 * Render treatment per CLAUDE.md "Ink engine":
 *  - crayon: dual-pass, waxy edge (two source-over fills build up density).
 *  - marker: single alpha pass, wide and uniform.
 *  - pencil: single near-opaque pass, fine line, strong pressure taper.
 *  - eraser: destination-out composite (cuts the ink layer, never the PDF).
 *
 * Texture grain for the crayon (a noise-pattern pass) is a visual-polish
 * follow-up best tuned on real hardware; the dual-pass structure it needs is
 * already here.
 */
import type { StrokeOptions } from 'perfect-freehand';
import type { ToolId } from '@/types/ink';

/** Runtime list of every tool id. Source of truth for iteration and validation. */
export const TOOL_IDS = [
  'crayon',
  'marker',
  'pencil',
  'eraser',
] as const satisfies readonly ToolId[];

/** Type guard for untrusted input (e.g. a value read back from IndexedDB). */
export function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && (TOOL_IDS as readonly string[]).includes(value);
}

/** A single canvas fill pass for a tool. */
export type ToolPass = {
  composite: GlobalCompositeOperation;
  alpha: number;
};

/** Everything the engine needs to render a tool, independent of color/size. */
export type ToolConfig = {
  id: ToolId;
  /** False for tools that ignore stroke color (the eraser). */
  usesColor: boolean;
  /**
   * Tool-intrinsic width multiplier applied to the stroke's normalized size.
   * Lets a pencil read as a fine line and a marker as broad without changing
   * the user's chosen brush size. 1.0 is neutral.
   */
  sizeScale: number;
  /** perfect-freehand options; `size` is injected per-render from the stroke. */
  strokeOptions: StrokeOptions;
  /** Ordered fill passes. Crayon has two; the others have one. */
  passes: readonly ToolPass[];
};

export const TOOL_CONFIGS: Record<ToolId, ToolConfig> = {
  crayon: {
    id: 'crayon',
    usesColor: true,
    sizeScale: 1,
    strokeOptions: {
      thinning: 0.55,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
    },
    passes: [
      { composite: 'source-over', alpha: 0.9 },
      { composite: 'source-over', alpha: 0.35 },
    ],
  },
  marker: {
    id: 'marker',
    usesColor: true,
    sizeScale: 1,
    strokeOptions: {
      thinning: 0.15,
      smoothing: 0.6,
      streamline: 0.6,
      simulatePressure: false,
    },
    passes: [{ composite: 'source-over', alpha: 0.85 }],
  },
  pencil: {
    id: 'pencil',
    usesColor: true,
    // Fine line: a pencil at the same brush size reads much thinner than a crayon.
    sizeScale: 0.45,
    strokeOptions: {
      thinning: 0.7,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
    },
    passes: [{ composite: 'source-over', alpha: 0.95 }],
  },
  eraser: {
    id: 'eraser',
    usesColor: false,
    sizeScale: 1,
    strokeOptions: {
      thinning: 0,
      smoothing: 0.5,
      streamline: 0.4,
      simulatePressure: false,
    },
    passes: [{ composite: 'destination-out', alpha: 1 }],
  },
};
