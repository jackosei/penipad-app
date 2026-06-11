import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InkEngine, STROKE_BATCH_VERSION } from './ink';
import { REFERENCE_VIEWPORT, sample, syntheticSweep } from '@/test/ink-fixtures';
import type { StrokeBatch } from '@/types/ink';

const view = REFERENCE_VIEWPORT;

describe('InkEngine stroke lifecycle', () => {
  let engine: InkEngine;

  beforeEach(() => {
    engine = new InkEngine();
  });

  it('normalizes pointer samples into 0..1 page coordinates', () => {
    engine.beginStroke(sample(250, 750, 0.5), view);
    engine.appendSamples([sample(500, 500, 0.5)], view);
    const committed = engine.endStroke();

    expect(committed?.points[0]).toMatchObject({ x: 0.25, y: 0.75 });
    expect(committed?.points[1]).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it('clamps off-page samples (palm rest beyond the page edge)', () => {
    engine.beginStroke(sample(-100, 5000, 0.5), view);
    const committed = engine.endStroke();
    expect(committed?.points[0]).toMatchObject({ x: 0, y: 1 });
  });

  it('captures the active tool, color, and size onto the stroke', () => {
    engine.setTool('marker');
    engine.setColor('#abcdef');
    engine.setSize(0.05);
    engine.beginStroke(sample(10, 10), view);
    const committed = engine.endStroke();

    expect(committed).toMatchObject({ tool: 'marker', color: '#abcdef', size: 0.05 });
  });

  it('clamps brush size into the allowed range', () => {
    engine.setSize(10);
    expect(engine.getSize()).toBeLessThanOrEqual(0.2);
    engine.setSize(-1);
    expect(engine.getSize()).toBeGreaterThan(0);
  });

  it('ignores appended samples when no stroke is active', () => {
    expect(engine.appendSamples([sample(1, 1)], view)).toBe(false);
    expect(engine.getStrokeCount()).toBe(0);
  });

  it('does not commit an empty stroke', () => {
    engine.cancelStroke();
    expect(engine.endStroke()).toBeNull();
    expect(engine.getStrokeCount()).toBe(0);
  });

  it('cancel discards the in-progress stroke without committing', () => {
    engine.beginStroke(sample(10, 10), view);
    engine.cancelStroke();
    expect(engine.getCurrentStroke()).toBeNull();
    expect(engine.endStroke()).toBeNull();
    expect(engine.getStrokeCount()).toBe(0);
  });
});

describe('InkEngine undo', () => {
  it('pops the last stroke and reduces to the correct state', () => {
    const engine = new InkEngine();
    for (let i = 0; i < 3; i++) {
      engine.beginStroke(sample(i * 10, i * 10), view);
      engine.endStroke();
    }
    expect(engine.getStrokeCount()).toBe(3);

    expect(engine.undo()).toBe(true);
    expect(engine.getStrokeCount()).toBe(2);
  });

  it('returns false when there is nothing to undo', () => {
    const engine = new InkEngine();
    expect(engine.undo()).toBe(false);
  });

  it('keeps at least 50 strokes of history (undo budget)', () => {
    const engine = new InkEngine();
    for (let i = 0; i < 60; i++) {
      engine.beginStroke(sample(i, i), view);
      engine.endStroke();
    }
    for (let i = 0; i < 50; i++) {
      expect(engine.undo()).toBe(true);
    }
    expect(engine.getStrokeCount()).toBe(10);
  });
});

describe('InkEngine page isolation', () => {
  it('keeps strokes and undo scoped to the active page', () => {
    const engine = new InkEngine();

    engine.setActivePage(1);
    engine.beginStroke(sample(10, 10), view);
    engine.endStroke();

    engine.setActivePage(2);
    engine.beginStroke(sample(20, 20), view);
    engine.endStroke();
    engine.beginStroke(sample(30, 30), view);
    engine.endStroke();

    expect(engine.getStrokeCount(1)).toBe(1);
    expect(engine.getStrokeCount(2)).toBe(2);

    engine.undo(); // active page is 2
    expect(engine.getStrokeCount(2)).toBe(1);
    expect(engine.getStrokeCount(1)).toBe(1);
  });

  it('clears only the targeted page', () => {
    const engine = new InkEngine();
    engine.setActivePage(1);
    engine.beginStroke(sample(10, 10), view);
    engine.endStroke();
    engine.setActivePage(2);
    engine.beginStroke(sample(20, 20), view);
    engine.endStroke();

    engine.clearPage(1);
    expect(engine.getStrokeCount(1)).toBe(0);
    expect(engine.getStrokeCount(2)).toBe(1);
  });
});

describe('InkEngine serialization', () => {
  it('round-trips a page through serialize -> load with no data loss', () => {
    const source = new InkEngine();
    source.setActivePage(3);
    source.setTool('marker');
    source.setColor('#0099ff');
    source.setSize(0.03);
    for (const s of [sample(100, 100, 0.7), sample(400, 200, 0.5), sample(700, 600, 0.3)]) {
      source.beginStroke(s, view);
      source.appendSamples([sample(s.x + 5, s.y + 5, 0.4)], view);
      source.endStroke();
    }

    const batch = source.serializePage(3);
    expect(batch.version).toBe(STROKE_BATCH_VERSION);
    expect(batch.pageNumber).toBe(3);

    const restored = new InkEngine();
    restored.loadPage(3, [batch]);

    expect(restored.getPageStrokes(3)).toEqual(source.getPageStrokes(3));
  });

  it('reduces multiple append-only batches in order', () => {
    const a: StrokeBatch = {
      version: STROKE_BATCH_VERSION,
      pageNumber: 1,
      strokes: [
        { tool: 'crayon', color: '#111', size: 0.02, points: [{ x: 0.1, y: 0.1, pressure: 0.5 }] },
      ],
    };
    const b: StrokeBatch = {
      version: STROKE_BATCH_VERSION,
      pageNumber: 1,
      strokes: [
        { tool: 'marker', color: '#222', size: 0.03, points: [{ x: 0.2, y: 0.2, pressure: 0.5 }] },
      ],
    };

    const engine = new InkEngine();
    engine.loadPage(1, [a, b]);

    const strokes = engine.getPageStrokes(1);
    expect(strokes).toHaveLength(2);
    expect(strokes[0]?.tool).toBe('crayon');
    expect(strokes[1]?.tool).toBe('marker');
  });

  it('ignores batches addressed to a different page', () => {
    const batch: StrokeBatch = {
      version: STROKE_BATCH_VERSION,
      pageNumber: 9,
      strokes: [
        { tool: 'crayon', color: '#111', size: 0.02, points: [{ x: 0.1, y: 0.1, pressure: 0.5 }] },
      ],
    };
    const engine = new InkEngine();
    engine.loadPage(1, [batch]);
    expect(engine.getStrokeCount(1)).toBe(0);
  });

  it('serialized strokes do not alias the live store (snapshot is a deep copy)', () => {
    const engine = new InkEngine();
    engine.beginStroke(sample(100, 100), view);
    engine.endStroke();

    const batch = engine.serializePage();
    const firstPoint = batch.strokes[0]?.points[0];
    if (firstPoint) firstPoint.x = -999;

    expect(engine.getPageStrokes()[0]?.points[0]?.x).not.toBe(-999);
  });
});

describe('InkEngine load-path data safety', () => {
  it('skips malformed strokes rather than throwing or losing the whole page', () => {
    const dirty = {
      version: STROKE_BATCH_VERSION,
      pageNumber: 1,
      strokes: [
        { tool: 'crayon', color: '#111', size: 0.02, points: [{ x: 0.1, y: 0.1, pressure: 0.5 }] },
        { tool: 'pencil', points: [{ x: 0, y: 0 }] }, // invalid tool
        { tool: 'marker', points: 'not-an-array' }, // invalid points
        null,
        { tool: 'marker', color: '#222', size: 0.03, points: [{ x: 0.4, y: 0.4, pressure: 0.6 }] },
      ],
    } as unknown as StrokeBatch;

    const engine = new InkEngine();
    expect(() => engine.loadPage(1, [dirty])).not.toThrow();
    // The two well-formed strokes survive.
    expect(engine.getStrokeCount(1)).toBe(2);
  });
});

describe('InkEngine change notification', () => {
  it('emits on commit, undo, clear, and load but not on append', () => {
    const engine = new InkEngine();
    const listener = vi.fn();
    engine.onChange(listener);

    engine.beginStroke(sample(10, 10), view);
    engine.appendSamples([sample(20, 20)], view);
    expect(listener).not.toHaveBeenCalled(); // hot path stays quiet

    engine.endStroke();
    expect(listener).toHaveBeenLastCalledWith('commit');

    engine.undo();
    expect(listener).toHaveBeenLastCalledWith('undo');

    engine.clearPage();
    expect(listener).toHaveBeenLastCalledWith('clear');

    engine.loadPage(1, []);
    expect(listener).toHaveBeenLastCalledWith('load');
  });

  it('stops notifying after unsubscribe', () => {
    const engine = new InkEngine();
    const listener = vi.fn();
    const unsubscribe = engine.onChange(listener);
    unsubscribe();

    engine.beginStroke(sample(10, 10), view);
    engine.endStroke();
    expect(listener).not.toHaveBeenCalled();
  });

  it('handles a realistic multi-point scribble end to end', () => {
    const engine = new InkEngine();
    const samples = syntheticSweep(64);
    const [first, ...rest] = samples;
    if (!first) throw new Error('fixture produced no samples');

    engine.beginStroke(first, view);
    engine.appendSamples(rest, view);
    const committed = engine.endStroke();

    expect(committed?.points).toHaveLength(64);
    expect(engine.getStrokeCount()).toBe(1);
  });
});
