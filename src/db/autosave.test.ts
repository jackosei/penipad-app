/**
 * Autosave integration tests against an in-memory IndexedDB: every committed
 * stroke persists, events apply in order, mid-stroke backgrounding commits,
 * and one failed write never blocks the next (zero-loss guarantee, F1.6).
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './schema';
import { startAutosave, type VisibilityTarget } from './autosave';
import { addDocument, getOrCreateActivity, loadPageStrokeBatches } from './queries';
import { InkEngine, isStroke } from '@/engine';
import type { Viewport } from '@/engine';
import type { StrokeBatch } from '@/types/ink';

const view: Viewport = { originX: 0, originY: 0, width: 1000, height: 1000 };

/** First stroke's first-point x in a batch (tests deal in stroke marks). */
function firstPointX(batch: StrokeBatch | undefined): number | undefined {
  const mark = batch?.strokes[0];
  return mark && isStroke(mark) ? mark.points[0]?.x : undefined;
}

/** A controllable stand-in for document visibility. */
function fakeVisibility(): VisibilityTarget & { hide: () => void } {
  const listeners = new Set<() => void>();
  let state: DocumentVisibilityState = 'visible';
  return {
    get visibilityState() {
      return state;
    },
    addEventListener: ((type: string, listener: () => void) => {
      if (type === 'visibilitychange') listeners.add(listener);
    }) as Document['addEventListener'],
    removeEventListener: ((type: string, listener: () => void) => {
      if (type === 'visibilitychange') listeners.delete(listener);
    }) as Document['removeEventListener'],
    hide() {
      state = 'hidden';
      for (const listener of [...listeners]) listener();
    },
  };
}

async function freshActivity(): Promise<string> {
  const doc = await addDocument({
    name: 'autosave-test.pdf',
    bytes: new TextEncoder().encode('x').buffer,
    pageCount: 3,
    thumbnail: null,
  });
  return (await getOrCreateActivity(doc.id)).id;
}

function drawStroke(engine: InkEngine, x = 100): void {
  engine.beginStroke({ x, y: 100, pressure: 0.5 }, view);
  engine.appendSamples([{ x: x + 40, y: 140, pressure: 0.6 }], view);
  engine.endStroke();
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('startAutosave', () => {
  it('persists every committed stroke', async () => {
    const activityId = await freshActivity();
    const engine = new InkEngine();
    const autosave = startAutosave({ engine, activityId, visibilityTarget: fakeVisibility() });

    drawStroke(engine, 100);
    drawStroke(engine, 300);
    await autosave.flush();

    const batches = await loadPageStrokeBatches(activityId, 1);
    expect(batches).toHaveLength(2);
    expect(firstPointX(batches[0])).toBeCloseTo(0.1);
    expect(firstPointX(batches[1])).toBeCloseTo(0.3);

    await autosave.dispose();
  });

  it('applies commit, undo, commit in event order', async () => {
    const activityId = await freshActivity();
    const engine = new InkEngine();
    const autosave = startAutosave({ engine, activityId, visibilityTarget: fakeVisibility() });

    drawStroke(engine, 100);
    engine.undo();
    drawStroke(engine, 500);
    await autosave.flush();

    const batches = await loadPageStrokeBatches(activityId, 1);
    expect(batches).toHaveLength(1);
    expect(firstPointX(batches[0])).toBeCloseTo(0.5);

    await autosave.dispose();
  });

  it('mirrors a page clear', async () => {
    const activityId = await freshActivity();
    const engine = new InkEngine();
    const autosave = startAutosave({ engine, activityId, visibilityTarget: fakeVisibility() });

    drawStroke(engine);
    engine.clearPage();
    await autosave.flush();

    expect(await loadPageStrokeBatches(activityId, 1)).toEqual([]);

    await autosave.dispose();
  });

  it('commits and persists an in-progress stroke when the app is backgrounded', async () => {
    const activityId = await freshActivity();
    const engine = new InkEngine();
    const visibility = fakeVisibility();
    const autosave = startAutosave({ engine, activityId, visibilityTarget: visibility });

    // Finger still down: stroke not yet committed.
    engine.beginStroke({ x: 100, y: 100, pressure: 0.5 }, view);
    engine.appendSamples([{ x: 200, y: 200, pressure: 0.6 }], view);
    expect(engine.getMarkCount()).toBe(0);

    visibility.hide();
    await autosave.flush();

    expect(engine.getMarkCount()).toBe(1);
    const batches = await loadPageStrokeBatches(activityId, 1);
    expect(batches).toHaveLength(1);

    await autosave.dispose();
  });

  it('reports a failed write through onError and keeps saving', async () => {
    const activityId = await freshActivity();
    const engine = new InkEngine();
    const onError = vi.fn();
    const autosave = startAutosave({
      engine,
      activityId,
      onError,
      visibilityTarget: fakeVisibility(),
    });

    // Poison one stroke with an uncloneable value (functions cannot pass the
    // structured clone into IndexedDB), through the public engine API.
    engine.beginStroke({ x: 100, y: 100, pressure: 0.5 }, view);
    const current = engine.getCurrentStroke();
    if (!current) throw new Error('no in-progress stroke');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally corrupting a stroke to force a write failure
    (current.points[0] as any).poison = () => undefined;
    engine.endStroke();

    drawStroke(engine, 700); // a clean stroke afterwards
    await autosave.flush();

    expect(onError).toHaveBeenCalledOnce();
    const batches = await loadPageStrokeBatches(activityId, 1);
    expect(batches).toHaveLength(1);
    expect(firstPointX(batches[0])).toBeCloseTo(0.7);

    await autosave.dispose();
  });

  it('stops mirroring after dispose', async () => {
    const activityId = await freshActivity();
    const engine = new InkEngine();
    const autosave = startAutosave({ engine, activityId, visibilityTarget: fakeVisibility() });

    await autosave.dispose();
    drawStroke(engine);
    await autosave.flush();

    expect(await loadPageStrokeBatches(activityId, 1)).toEqual([]);
  });
});
