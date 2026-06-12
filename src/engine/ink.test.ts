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
    expect(engine.getMarkCount()).toBe(0);
  });

  it('does not commit an empty stroke', () => {
    engine.cancelStroke();
    expect(engine.endStroke()).toBeNull();
    expect(engine.getMarkCount()).toBe(0);
  });

  it('cancel discards the in-progress stroke without committing', () => {
    engine.beginStroke(sample(10, 10), view);
    engine.cancelStroke();
    expect(engine.getCurrentStroke()).toBeNull();
    expect(engine.endStroke()).toBeNull();
    expect(engine.getMarkCount()).toBe(0);
  });
});

describe('InkEngine undo', () => {
  it('pops the last stroke and reduces to the correct state', () => {
    const engine = new InkEngine();
    for (let i = 0; i < 3; i++) {
      engine.beginStroke(sample(i * 10, i * 10), view);
      engine.endStroke();
    }
    expect(engine.getMarkCount()).toBe(3);

    expect(engine.undo()).toBe(true);
    expect(engine.getMarkCount()).toBe(2);
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
    expect(engine.getMarkCount()).toBe(10);
  });
});

describe('InkEngine redo', () => {
  function drawAt(engine: InkEngine, x: number): void {
    engine.beginStroke(sample(x, x), view);
    engine.endStroke();
  }

  it('redoes an undone mark, restoring the exact state', () => {
    const engine = new InkEngine();
    drawAt(engine, 10);
    drawAt(engine, 20);

    expect(engine.canUndo()).toBe(true);
    expect(engine.canRedo()).toBe(false);

    engine.undo();
    expect(engine.getMarkCount()).toBe(1);
    expect(engine.canRedo()).toBe(true);

    expect(engine.redo()).toBe(true);
    expect(engine.getMarkCount()).toBe(2);
    expect(engine.canRedo()).toBe(false);
  });

  it('redo reverses several undos in the correct order', () => {
    const engine = new InkEngine();
    drawAt(engine, 10);
    drawAt(engine, 20);
    drawAt(engine, 30);

    engine.undo();
    engine.undo();
    engine.redo();
    engine.redo();

    expect(engine.getMarkCount()).toBe(3);
    const xs = engine.getPageStrokes().map((s) => s.points[0]?.x);
    expect(xs).toEqual([0.01, 0.02, 0.03]);
  });

  it('a new mark clears the redo stack (redo history is invalidated)', () => {
    const engine = new InkEngine();
    drawAt(engine, 10);
    engine.undo();
    expect(engine.canRedo()).toBe(true);

    drawAt(engine, 99); // new action
    expect(engine.canRedo()).toBe(false);
    expect(engine.redo()).toBe(false);
  });

  it('placing a sticker also clears the redo stack', () => {
    const engine = new InkEngine();
    drawAt(engine, 10);
    engine.undo();
    engine.placeSticker({
      kind: 'sticker',
      sticker: 'star',
      x: 0.9,
      y: 0.1,
      size: 0.16,
      rotation: 0,
    });
    expect(engine.canRedo()).toBe(false);
  });

  it('returns false and emits nothing when there is nothing to redo', () => {
    const engine = new InkEngine();
    const listener = vi.fn();
    engine.onChange(listener);
    expect(engine.redo()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('emits a redo event carrying the restored mark', () => {
    const engine = new InkEngine();
    drawAt(engine, 10);
    const listener = vi.fn();
    engine.onChange(listener);
    engine.undo();
    engine.redo();
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'redo', pageNumber: 1 }),
    );
  });

  it('keeps redo stacks isolated per page', () => {
    const engine = new InkEngine();
    engine.setActivePage(1);
    drawAt(engine, 10);
    engine.undo();

    engine.setActivePage(2);
    expect(engine.canRedo()).toBe(false); // page 2 has no redo history
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

    expect(engine.getMarkCount(1)).toBe(1);
    expect(engine.getMarkCount(2)).toBe(2);

    engine.undo(); // active page is 2
    expect(engine.getMarkCount(2)).toBe(1);
    expect(engine.getMarkCount(1)).toBe(1);
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
    expect(engine.getMarkCount(1)).toBe(0);
    expect(engine.getMarkCount(2)).toBe(1);
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
    expect(engine.getMarkCount(1)).toBe(0);
  });

  it('serialized strokes do not alias the live store (snapshot is a deep copy)', () => {
    const engine = new InkEngine();
    engine.beginStroke(sample(100, 100), view);
    engine.endStroke();

    const batch = engine.serializePage();
    const firstMark = batch.strokes[0];
    if (firstMark && 'points' in firstMark) {
      const firstPoint = firstMark.points[0];
      if (firstPoint) firstPoint.x = -999;
    }

    expect(engine.getPageStrokes()[0]?.points[0]?.x).not.toBe(-999);
  });
});

describe('InkEngine stickers (F1.12)', () => {
  const sticker = {
    kind: 'sticker' as const,
    sticker: 'star' as const,
    x: 0.88,
    y: 0.12,
    size: 0.16,
    rotation: 8,
  };

  it('places a sticker as a mark and reports it separately from strokes', () => {
    const engine = new InkEngine();
    engine.beginStroke(sample(100, 100), view);
    engine.endStroke();

    engine.placeSticker(sticker);

    expect(engine.getMarkCount()).toBe(2);
    expect(engine.getPageStrokes()).toHaveLength(1);
    expect(engine.getPageStickers()).toHaveLength(1);
    expect(engine.getPageStickers()[0]).toMatchObject({ sticker: 'star', x: 0.88 });
  });

  it('emits a commit carrying the sticker mark', () => {
    const engine = new InkEngine();
    const listener = vi.fn();
    engine.onChange(listener);
    engine.placeSticker(sticker);
    expect(listener).toHaveBeenCalledWith({
      type: 'commit',
      pageNumber: 1,
      mark: expect.objectContaining({ kind: 'sticker', sticker: 'star' }),
    });
  });

  it('undo pops a sticker or a stroke in true draw order', () => {
    const engine = new InkEngine();
    engine.beginStroke(sample(100, 100), view);
    engine.endStroke();
    engine.placeSticker(sticker); // most recent

    engine.undo();
    expect(engine.getPageStickers()).toHaveLength(0);
    expect(engine.getPageStrokes()).toHaveLength(1);
  });

  it('round-trips stickers through serialize -> load', () => {
    const source = new InkEngine();
    source.placeSticker(sticker);
    source.beginStroke(sample(200, 200), view);
    source.endStroke();

    const restored = new InkEngine();
    restored.loadPage(1, [source.serializePage(1)]);

    expect(restored.getPageStickers()).toEqual(source.getPageStickers());
    expect(restored.getPageStrokes()).toEqual(source.getPageStrokes());
  });

  it('does not alias the live store on serialize', () => {
    const engine = new InkEngine();
    engine.placeSticker(sticker);
    const batch = engine.serializePage();
    const mark = batch.strokes[0];
    if (mark && mark.kind === 'sticker') mark.x = -1;
    expect(engine.getPageStickers()[0]?.x).toBe(0.88);
  });
});

describe('InkEngine load-path data safety', () => {
  it('skips malformed strokes rather than throwing or losing the whole page', () => {
    const dirty = {
      version: STROKE_BATCH_VERSION,
      pageNumber: 1,
      strokes: [
        { tool: 'crayon', color: '#111', size: 0.02, points: [{ x: 0.1, y: 0.1, pressure: 0.5 }] },
        { tool: 'glitter', points: [{ x: 0, y: 0 }] }, // invalid tool
        { tool: 'marker', points: 'not-an-array' }, // invalid points
        null,
        { tool: 'marker', color: '#222', size: 0.03, points: [{ x: 0.4, y: 0.4, pressure: 0.6 }] },
      ],
    } as unknown as StrokeBatch;

    const engine = new InkEngine();
    expect(() => engine.loadPage(1, [dirty])).not.toThrow();
    // The two well-formed strokes survive.
    expect(engine.getMarkCount(1)).toBe(2);
  });

  it('skips malformed stickers but keeps valid ones', () => {
    const dirty = {
      version: STROKE_BATCH_VERSION,
      pageNumber: 1,
      strokes: [
        { kind: 'sticker', sticker: 'star', x: 0.5, y: 0.5, size: 0.16, rotation: 0 },
        { kind: 'sticker', sticker: 'unicorn', x: 0.1, y: 0.1 }, // invalid id
        { kind: 'sticker', sticker: 'heart', x: 'nope', y: 0.2 }, // invalid coords
      ],
    } as unknown as StrokeBatch;

    const engine = new InkEngine();
    engine.loadPage(1, [dirty]);
    expect(engine.getPageStickers()).toHaveLength(1);
    expect(engine.getPageStickers()[0]?.sticker).toBe('star');
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

    const committed = engine.endStroke();
    expect(listener).toHaveBeenLastCalledWith({
      type: 'commit',
      pageNumber: 1,
      mark: committed,
    });

    engine.undo();
    expect(listener).toHaveBeenLastCalledWith({ type: 'undo', pageNumber: 1 });

    engine.clearPage();
    expect(listener).toHaveBeenLastCalledWith({ type: 'clear', pageNumber: 1 });

    engine.loadPage(1, []);
    expect(listener).toHaveBeenLastCalledWith({ type: 'load', pageNumber: 1 });
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
    expect(engine.getMarkCount()).toBe(1);
  });
});
