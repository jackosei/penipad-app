/**
 * Ink-latency profiling benchmark.
 *
 * Reports the engine's per-frame render cost across stroke lengths so we can
 * watch the curve over time. The hard pass/fail gate lives in
 * `src/engine/ink-latency.gate.test.ts`; this file is for trend visibility and
 * local profiling (`npm run bench`). See that gate for what is and isn't
 * measured (GPU rasterization is excluded).
 */
import { bench, describe } from 'vitest';
import { InkEngine } from '@/engine/ink';
import { renderStroke } from '@/engine/renderer';
import type { Stroke } from '@/types/ink';
import { RecordingTarget } from '@/test/render-target';
import { REFERENCE_PAGE_SIZE, REFERENCE_VIEWPORT, syntheticSweep } from '@/test/ink-fixtures';

function liveStrokeOf(points: number): Stroke {
  const engine = new InkEngine();
  const samples = syntheticSweep(points);
  const [first, ...rest] = samples;
  if (!first) throw new Error('fixture produced no samples');
  engine.beginStroke(first, REFERENCE_VIEWPORT);
  engine.appendSamples(rest, REFERENCE_VIEWPORT);
  const stroke = engine.getCurrentStroke();
  if (!stroke) throw new Error('no in-progress stroke');
  return stroke;
}

describe('per-frame render cost', () => {
  for (const points of [64, 256, 1024]) {
    const stroke = liveStrokeOf(points);
    const ctx = new RecordingTarget();
    bench(`render ${points}-point in-progress stroke`, () => {
      renderStroke(ctx, stroke, REFERENCE_PAGE_SIZE);
    });
  }
});
