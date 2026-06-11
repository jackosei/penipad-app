/**
 * Hard latency gate. Fails CI if the engine's per-frame CPU cost regresses past
 * the ink-latency budget (PRD principle 2, CLAUDE.md "Performance Budgets").
 *
 * What this measures: the JavaScript work the engine does between a pointer
 * event and handing a painted path to the canvas, for a worst-case in-progress
 * stroke that is re-traced every animation frame. It deliberately excludes GPU
 * rasterization (ctx.fill on real hardware), which is platform-bound and not
 * representative in a headless Node run. On-device pointer-to-paint profiling is
 * Step 9 (device matrix). This gate protects against algorithmic regressions in
 * our code, which is the part of the budget we own.
 */
import { describe, expect, it } from 'vitest';
import { InkEngine } from './ink';
import { renderStroke } from './renderer';
import { RecordingTarget } from '@/test/render-target';
import { REFERENCE_PAGE_SIZE, REFERENCE_VIEWPORT, syntheticSweep } from '@/test/ink-fixtures';
import { PERF_BUDGETS } from '@/constants';

/** A representative worst-case live stroke: a long, curvy scribble. */
const WORST_CASE_POINTS = 400;
const WARMUP = 25;
const SAMPLES = 120;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

describe('ink latency gate', () => {
  it(`renders a ${WORST_CASE_POINTS}-point frame well under the ${PERF_BUDGETS.INK_LATENCY_MS}ms budget`, () => {
    const engine = new InkEngine();
    const samples = syntheticSweep(WORST_CASE_POINTS);
    const [first, ...rest] = samples;
    if (!first) throw new Error('fixture produced no samples');
    engine.beginStroke(first, REFERENCE_VIEWPORT);
    engine.appendSamples(rest, REFERENCE_VIEWPORT);

    const stroke = engine.getCurrentStroke();
    if (!stroke) throw new Error('no in-progress stroke');
    const ctx = new RecordingTarget();

    for (let i = 0; i < WARMUP; i++) {
      renderStroke(ctx, stroke, REFERENCE_PAGE_SIZE);
    }
    // Confirm we are timing real work, not a no-op.
    expect(ctx.fills.length).toBeGreaterThan(0);

    const durations: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const start = performance.now();
      renderStroke(ctx, stroke, REFERENCE_PAGE_SIZE);
      durations.push(performance.now() - start);
    }

    const frameMs = median(durations);
    expect(frameMs).toBeLessThan(PERF_BUDGETS.INK_LATENCY_MS);
  });
});
