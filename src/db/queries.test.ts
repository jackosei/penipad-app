/**
 * Integration tests for the single Dexie call boundary, run against an
 * in-memory IndexedDB (fake-indexeddb). These tests assert the zero-loss
 * guarantee mechanics: append-only batches, ordered reduction, undo as a
 * single-row delete, and cascade deletion staying inside its transaction.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import {
  addDocument,
  appendStrokeBatch,
  clearPageStrokes,
  deleteDocumentCascade,
  deleteLatestStrokeBatch,
  getDocument,
  getDocumentBytes,
  getOrCreateActivity,
  listDocuments,
  listInkedPageNumbers,
  loadPageStrokeBatches,
  touchDocumentOpened,
  updateActivityLastPage,
  getActivity,
} from './queries';
import { InkEngine } from '@/engine';
import type { Stroke } from '@/types/ink';

function stroke(seed = 1): Stroke {
  return {
    tool: 'crayon',
    color: '#112233',
    size: 0.02,
    points: [
      { x: 0.1 * seed, y: 0.1, pressure: 0.5 },
      { x: 0.1 * seed + 0.05, y: 0.2, pressure: 0.6 },
    ],
  };
}

function pdfBytes(content = 'fake-pdf-bytes'): ArrayBuffer {
  return new TextEncoder().encode(content).buffer;
}

function decode(bytes: ArrayBuffer | undefined): string {
  return bytes ? new TextDecoder().decode(bytes) : '';
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('documents', () => {
  it('stores and retrieves a document with its bytes', async () => {
    const doc = await addDocument({
      name: 'counting-worksheet.pdf',
      bytes: pdfBytes('content-a'),
      pageCount: 4,
      thumbnail: null,
    });

    const fetched = await getDocument(doc.id);
    expect(fetched).toEqual(doc);

    const bytes = await getDocumentBytes(doc.id);
    expect(bytes).toBeDefined();
    expect(decode(bytes)).toBe('content-a');
  });

  it('lists documents newest first without loading bytes', async () => {
    const first = await addDocument({
      name: 'first.pdf',
      bytes: pdfBytes(),
      pageCount: 1,
      thumbnail: null,
    });
    // Ensure a later imported_at even on a fast machine.
    await db.documents.update(first.id, { imported_at: first.imported_at - 1000 });
    const second = await addDocument({
      name: 'second.pdf',
      bytes: pdfBytes(),
      pageCount: 2,
      thumbnail: null,
    });

    const listed = await listDocuments();
    expect(listed.map((d) => d.id)).toEqual([second.id, first.id]);
    for (const row of listed) {
      expect(row).not.toHaveProperty('bytes');
    }
  });

  it('records when a document was last opened', async () => {
    const doc = await addDocument({
      name: 'a.pdf',
      bytes: pdfBytes(),
      pageCount: 1,
      thumbnail: null,
    });
    expect(doc.last_opened_at).toBeNull();

    await touchDocumentOpened(doc.id);
    const fetched = await getDocument(doc.id);
    expect(fetched?.last_opened_at).toBeTypeOf('number');
  });

  it('cascade delete removes the document, bytes, activity, pages, and ink', async () => {
    const doc = await addDocument({
      name: 'a.pdf',
      bytes: pdfBytes(),
      pageCount: 3,
      thumbnail: null,
    });
    const activity = await getOrCreateActivity(doc.id);
    await appendStrokeBatch(activity.id, 1, [stroke(1)]);
    await appendStrokeBatch(activity.id, 2, [stroke(2)]);

    await deleteDocumentCascade(doc.id);

    expect(await getDocument(doc.id)).toBeUndefined();
    expect(await getDocumentBytes(doc.id)).toBeUndefined();
    expect(await getActivity(activity.id)).toBeUndefined();
    expect(await listInkedPageNumbers(activity.id)).toEqual([]);
    expect(await loadPageStrokeBatches(activity.id, 1)).toEqual([]);
  });
});

describe('activities', () => {
  it('creates one activity per document and is idempotent', async () => {
    const doc = await addDocument({
      name: 'a.pdf',
      bytes: pdfBytes(),
      pageCount: 1,
      thumbnail: null,
    });

    const a = await getOrCreateActivity(doc.id);
    const b = await getOrCreateActivity(doc.id);
    expect(b.id).toBe(a.id);
    expect(a.last_page).toBe(1);
  });

  it('tracks the resume page explicitly and on every stroke append', async () => {
    const doc = await addDocument({
      name: 'a.pdf',
      bytes: pdfBytes(),
      pageCount: 5,
      thumbnail: null,
    });
    const activity = await getOrCreateActivity(doc.id);

    await updateActivityLastPage(activity.id, 3);
    expect((await getActivity(activity.id))?.last_page).toBe(3);

    await appendStrokeBatch(activity.id, 4, [stroke()]);
    expect((await getActivity(activity.id))?.last_page).toBe(4);
  });
});

describe('stroke batches', () => {
  let activityId: string;

  beforeEach(async () => {
    const doc = await addDocument({
      name: 'a.pdf',
      bytes: pdfBytes(),
      pageCount: 9,
      thumbnail: null,
    });
    activityId = (await getOrCreateActivity(doc.id)).id;
  });

  it('assigns a monotonic seq per page, isolated between pages', async () => {
    await appendStrokeBatch(activityId, 1, [stroke(1)]);
    await appendStrokeBatch(activityId, 1, [stroke(2)]);
    await appendStrokeBatch(activityId, 2, [stroke(3)]);

    const page1 = await db.stroke_batches.where('activity_id').equals(activityId).toArray();
    const seqsByPage = new Map<number, number[]>();
    for (const row of page1) {
      seqsByPage.set(row.page_number, [...(seqsByPage.get(row.page_number) ?? []), row.seq]);
    }
    expect(seqsByPage.get(1)?.sort()).toEqual([1, 2]);
    expect(seqsByPage.get(2)).toEqual([1]);
  });

  it('loads batches in seq order, shaped for InkEngine.loadPage', async () => {
    await appendStrokeBatch(activityId, 1, [stroke(1)]);
    await appendStrokeBatch(activityId, 1, [stroke(2)]);

    const batches = await loadPageStrokeBatches(activityId, 1);
    expect(batches).toHaveLength(2);
    expect(batches[0]?.pageNumber).toBe(1);
    expect(batches[0]?.version).toBe(1);
    expect(batches[0]?.strokes[0]?.points[0]?.x).toBeCloseTo(0.1);
    expect(batches[1]?.strokes[0]?.points[0]?.x).toBeCloseTo(0.2);
  });

  it('round-trips a page through the engine with zero loss', async () => {
    const source = new InkEngine();
    source.setActivePage(2);
    const view = { originX: 0, originY: 0, width: 1000, height: 1000 };
    for (let i = 0; i < 5; i++) {
      source.beginStroke({ x: 100 + i * 50, y: 200, pressure: 0.5 }, view);
      source.appendSamples([{ x: 120 + i * 50, y: 240, pressure: 0.6 }], view);
      const committed = source.endStroke();
      if (!committed) throw new Error('stroke did not commit');
      await appendStrokeBatch(activityId, 2, [committed]);
    }

    const restored = new InkEngine();
    restored.loadPage(2, await loadPageStrokeBatches(activityId, 2));

    expect(restored.getPageStrokes(2)).toEqual(source.getPageStrokes(2));
  });

  it('undo deletes only the newest batch', async () => {
    await appendStrokeBatch(activityId, 1, [stroke(1)]);
    await appendStrokeBatch(activityId, 1, [stroke(2)]);

    expect(await deleteLatestStrokeBatch(activityId, 1)).toBe(true);

    const remaining = await loadPageStrokeBatches(activityId, 1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.strokes[0]?.points[0]?.x).toBeCloseTo(0.1);
  });

  it('undo on an empty page reports false and changes nothing', async () => {
    expect(await deleteLatestStrokeBatch(activityId, 1)).toBe(false);
  });

  it('clear removes only the targeted page', async () => {
    await appendStrokeBatch(activityId, 1, [stroke(1)]);
    await appendStrokeBatch(activityId, 2, [stroke(2)]);

    await clearPageStrokes(activityId, 1);

    expect(await loadPageStrokeBatches(activityId, 1)).toEqual([]);
    expect(await loadPageStrokeBatches(activityId, 2)).toHaveLength(1);
  });

  it('tracks which pages have ink', async () => {
    await appendStrokeBatch(activityId, 3, [stroke()]);
    await appendStrokeBatch(activityId, 1, [stroke()]);
    await appendStrokeBatch(activityId, 1, [stroke()]);

    expect(await listInkedPageNumbers(activityId)).toEqual([1, 3]);
  });
});
