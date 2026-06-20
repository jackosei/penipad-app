/**
 * The single IndexedDB call boundary. Every read and write in the app goes
 * through these functions; no raw Dexie calls exist anywhere else.
 *
 * Multi-step writes are wrapped in Dexie transactions so a crash mid-write
 * can never leave half a change behind (the zero-loss guarantee is built on
 * these transactions plus the append-only stroke_batches contract; see
 * schema.ts).
 */
import Dexie from 'dexie';
import { newId } from '@/utils/new-id';
import { db } from './schema';
import type { ActivityRow, DocumentRow, PageRow, StoredImage } from './schema';
import type { PageMark, StrokeBatch } from '@/types/ink';
import { STROKE_BATCH_VERSION } from '@/engine';

// --- documents -----------------------------------------------------------------

export type NewDocumentInput = {
  name: string;
  bytes: ArrayBuffer;
  pageCount: number;
  thumbnail: StoredImage | null;
};

/** Store an imported PDF (metadata + bytes) atomically. Returns the new row. */
export function addDocument(input: NewDocumentInput): Promise<DocumentRow> {
  return db.transaction('rw', [db.documents, db.document_files], async () => {
    const row: DocumentRow = {
      id: newId(),
      name: input.name,
      page_count: input.pageCount,
      thumbnail: input.thumbnail,
      imported_at: Date.now(),
      last_opened_at: null,
    };
    await db.documents.add(row);
    await db.document_files.add({ document_id: row.id, bytes: input.bytes });
    return row;
  });
}

/** Shelf listing, newest import first. Never loads document bytes. */
export function listDocuments(): Promise<DocumentRow[]> {
  return db.documents.orderBy('imported_at').reverse().toArray();
}

export function getDocument(id: string): Promise<DocumentRow | undefined> {
  return db.documents.get(id);
}

/** The PDF bytes for a document, or undefined if the document is gone. */
export async function getDocumentBytes(documentId: string): Promise<ArrayBuffer | undefined> {
  const file = await db.document_files.get(documentId);
  return file?.bytes;
}

export function touchDocumentOpened(id: string): Promise<number> {
  return db.documents.update(id, { last_opened_at: Date.now() });
}

/**
 * Delete a document and everything that hangs off it (file bytes, activities,
 * pages, ink). Destroys child drawings by design; the caller must be behind
 * the parental gate. [DATA SAFETY]
 */
export function deleteDocumentCascade(documentId: string): Promise<void> {
  return db.transaction(
    'rw',
    [db.documents, db.document_files, db.activities, db.pages, db.stroke_batches],
    async () => {
      const activityIds = await db.activities.where('document_id').equals(documentId).primaryKeys();
      for (const activityId of activityIds) {
        await db.stroke_batches.where('activity_id').equals(activityId).delete();
        await db.pages.where('activity_id').equals(activityId).delete();
      }
      await db.activities.bulkDelete(activityIds);
      await db.document_files.delete(documentId);
      await db.documents.delete(documentId);
    },
  );
}

// --- activities ------------------------------------------------------------------

/** Phase 1: one activity per document, created on first open. Idempotent. */
export function getOrCreateActivity(documentId: string): Promise<ActivityRow> {
  return db.transaction('rw', db.activities, async () => {
    const existing = await db.activities.where('document_id').equals(documentId).first();
    if (existing) return existing;
    const now = Date.now();
    const row: ActivityRow = {
      id: newId(),
      document_id: documentId,
      last_page: 1,
      created_at: now,
      updated_at: now,
    };
    await db.activities.add(row);
    return row;
  });
}

export function getActivity(id: string): Promise<ActivityRow | undefined> {
  return db.activities.get(id);
}

export function updateActivityLastPage(activityId: string, pageNumber: number): Promise<number> {
  return db.activities.update(activityId, { last_page: pageNumber, updated_at: Date.now() });
}

/** Stamp the activity as completed (the child tapped "Done"; F1.12). */
export function markActivityCompleted(activityId: string): Promise<number> {
  return db.activities.update(activityId, { completed_at: Date.now(), updated_at: Date.now() });
}

/** Document ids whose activity has been marked completed (for the shelf ribbon). */
export async function listCompletedDocumentIds(): Promise<Set<string>> {
  const activities = await db.activities.toArray();
  const ids = new Set<string>();
  for (const activity of activities) {
    if (activity.completed_at != null) ids.add(activity.document_id);
  }
  return ids;
}

/** Page numbers in this activity that have (or had) ink, ascending. */
export async function listInkedPageNumbers(activityId: string): Promise<number[]> {
  const rows = await db.pages.where('activity_id').equals(activityId).toArray();
  return rows.map((row) => row.page_number).sort((a, b) => a - b);
}

// --- stroke batches (the never-lose-a-drawing path) -------------------------------

function pageRange(activityId: string, pageNumber: number): [unknown[], unknown[]] {
  return [
    [activityId, pageNumber, Dexie.minKey],
    [activityId, pageNumber, Dexie.maxKey],
  ];
}

/**
 * Append committed strokes as the next batch for a page. The monotonic seq is
 * assigned inside the transaction, so concurrent appends cannot collide or
 * reorder. Also freshens the page row and the activity's resume point.
 */
export function appendStrokeBatch(
  activityId: string,
  pageNumber: number,
  marks: PageMark[],
): Promise<string> {
  return db.transaction('rw', [db.stroke_batches, db.pages, db.activities], async () => {
    const [lower, upper] = pageRange(activityId, pageNumber);
    const last = await db.stroke_batches
      .where('[activity_id+page_number+seq]')
      .between(lower, upper)
      .last();
    const now = Date.now();
    const id = newId();
    await db.stroke_batches.add({
      id,
      activity_id: activityId,
      page_number: pageNumber,
      seq: (last?.seq ?? 0) + 1,
      version: STROKE_BATCH_VERSION,
      strokes: marks,
      created_at: now,
    });
    await upsertPage(activityId, pageNumber, now);
    await db.activities.update(activityId, { last_page: pageNumber, updated_at: now });
    return id;
  });
}

/**
 * Persist an undo: remove the highest-seq batch for the page. Returns false
 * if the page had no ink. This is the only delete the drawing flow performs,
 * and it mirrors an explicit child action.
 */
export function deleteLatestStrokeBatch(activityId: string, pageNumber: number): Promise<boolean> {
  return db.transaction('rw', db.stroke_batches, async () => {
    const [lower, upper] = pageRange(activityId, pageNumber);
    const last = await db.stroke_batches
      .where('[activity_id+page_number+seq]')
      .between(lower, upper)
      .last();
    if (!last) return false;
    await db.stroke_batches.delete(last.id);
    return true;
  });
}

/** Persist a clear-page: remove every batch for the page. */
export function clearPageStrokes(activityId: string, pageNumber: number): Promise<void> {
  return db.transaction('rw', [db.stroke_batches, db.pages], async () => {
    const [lower, upper] = pageRange(activityId, pageNumber);
    await db.stroke_batches.where('[activity_id+page_number+seq]').between(lower, upper).delete();
    await upsertPage(activityId, pageNumber, Date.now());
  });
}

/**
 * Load a page's ink as ordered StrokeBatch values, ready for
 * `InkEngine.loadPage`. Ordered by seq via the compound index.
 */
export async function loadPageStrokeBatches(
  activityId: string,
  pageNumber: number,
): Promise<StrokeBatch[]> {
  const [lower, upper] = pageRange(activityId, pageNumber);
  const rows = await db.stroke_batches
    .where('[activity_id+page_number+seq]')
    .between(lower, upper)
    .toArray();
  return rows.map((row) => ({
    version: row.version,
    pageNumber: row.page_number,
    strokes: row.strokes,
  }));
}

// --- maintenance (parent zone) ----------------------------------------------------

/** How many documents are on the shelf. */
export function countDocuments(): Promise<number> {
  return db.documents.count();
}

/**
 * Delete every document and all its work. Parent-gated and destructive; the
 * caller must confirm. Clears all tables in one transaction so the shelf can
 * never end up half-wiped. [DATA SAFETY]
 */
export function deleteEverything(): Promise<void> {
  return db.transaction(
    'rw',
    [db.documents, db.document_files, db.activities, db.pages, db.stroke_batches],
    async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    },
  );
}

/**
 * Best-effort estimate of how much storage the app is using, in bytes. Returns
 * null where the browser does not expose StorageManager (older WebViews), so
 * the UI can omit the figure rather than show a wrong one.
 */
export async function estimateStorageBytes(): Promise<number | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const { usage } = await navigator.storage.estimate();
  return typeof usage === 'number' ? usage : null;
}

// --- internals --------------------------------------------------------------------

async function upsertPage(activityId: string, pageNumber: number, now: number): Promise<void> {
  const existing = await db.pages
    .where('[activity_id+page_number]')
    .equals([activityId, pageNumber])
    .first();
  if (existing) {
    await db.pages.update(existing.id, { updated_at: now });
  } else {
    const row: PageRow = {
      id: newId(),
      activity_id: activityId,
      page_number: pageNumber,
      updated_at: now,
    };
    await db.pages.add(row);
  }
}
