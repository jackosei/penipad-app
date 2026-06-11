import { describe, expect, it } from 'vitest';
import { buildOutline, clamp01, toNormPoint, toPixel, traceOutline } from './geometry';
import { TOOL_CONFIGS } from './tools';
import { REFERENCE_PAGE_SIZE, REFERENCE_VIEWPORT } from '@/test/ink-fixtures';
import type { StrokePoint } from '@/types/ink';

describe('clamp01', () => {
  it('clamps below 0 and above 1', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
  });

  it('passes through in-range values', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1)).toBe(1);
  });

  it('collapses NaN to 0 rather than propagating it', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('toNormPoint', () => {
  it('normalizes a pointer position against the viewport', () => {
    expect(toNormPoint(250, 750, REFERENCE_VIEWPORT)).toEqual({ x: 0.25, y: 0.75 });
  });

  it('accounts for a non-zero viewport origin', () => {
    const view = { originX: 100, originY: 200, width: 800, height: 400 };
    expect(toNormPoint(500, 400, view)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('clamps points outside the page to the [0,1] edge (palm rests, off-page drag)', () => {
    expect(toNormPoint(-40, 2000, REFERENCE_VIEWPORT)).toEqual({ x: 0, y: 1 });
  });

  it('never divides by zero on a degenerate viewport', () => {
    const norm = toNormPoint(10, 10, { originX: 0, originY: 0, width: 0, height: 0 });
    expect(Number.isFinite(norm.x)).toBe(true);
    expect(Number.isFinite(norm.y)).toBe(true);
  });
});

describe('toPixel', () => {
  it('is the inverse of normalization for a given page size', () => {
    const norm = toNormPoint(250, 750, REFERENCE_VIEWPORT);
    expect(toPixel(norm, REFERENCE_PAGE_SIZE)).toEqual({ x: 250, y: 750 });
  });
});

describe('buildOutline', () => {
  const points: StrokePoint[] = [
    { x: 0.1, y: 0.1, pressure: 0.5 },
    { x: 0.5, y: 0.5, pressure: 0.6 },
    { x: 0.9, y: 0.2, pressure: 0.4 },
  ];

  it('returns a closed polygon of [x,y] pairs in pixel space', () => {
    const outline = buildOutline(
      points,
      REFERENCE_PAGE_SIZE,
      0.02,
      TOOL_CONFIGS.crayon.strokeOptions,
    );
    expect(outline.length).toBeGreaterThan(2);
    for (const pt of outline) {
      expect(pt).toHaveLength(2);
      expect(Number.isFinite(pt[0])).toBe(true);
      expect(Number.isFinite(pt[1])).toBe(true);
    }
  });

  it('produces a dot outline for a single point so a tap leaves a mark', () => {
    const tap: StrokePoint[] = [{ x: 0.5, y: 0.5, pressure: 0.5 }];
    const outline = buildOutline(tap, REFERENCE_PAGE_SIZE, 0.02, TOOL_CONFIGS.crayon.strokeOptions);
    expect(outline.length).toBeGreaterThan(2);
  });

  it('returns nothing for an empty stroke', () => {
    expect(buildOutline([], REFERENCE_PAGE_SIZE, 0.02, TOOL_CONFIGS.crayon.strokeOptions)).toEqual(
      [],
    );
  });
});

describe('traceOutline', () => {
  it('emits a moveTo, a quadratic per edge, and a closePath', () => {
    const calls: string[] = [];
    const sink = {
      moveTo: () => calls.push('moveTo'),
      quadraticCurveTo: () => calls.push('quadraticCurveTo'),
      closePath: () => calls.push('closePath'),
    };
    const outline = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    traceOutline(sink, outline);
    expect(calls[0]).toBe('moveTo');
    expect(calls.at(-1)).toBe('closePath');
    expect(calls.filter((c) => c === 'quadraticCurveTo')).toHaveLength(outline.length);
  });

  it('draws nothing for a degenerate outline', () => {
    const calls: string[] = [];
    const sink = {
      moveTo: () => calls.push('moveTo'),
      quadraticCurveTo: () => calls.push('quadraticCurveTo'),
      closePath: () => calls.push('closePath'),
    };
    traceOutline(sink, [[0, 0]]);
    expect(calls).toHaveLength(0);
  });
});
