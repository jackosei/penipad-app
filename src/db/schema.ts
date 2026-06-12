/**
 * Dexie table definitions: the local system of record.
 *
 * Naming follows the future Supabase schema (snake_case tables and fields) so
 * Phase 2 sync is a mapping, not a migration. Timestamps are epoch
 * milliseconds (indexable, timezone-free). Primary keys are UUID strings so
 * rows keep their identity when they eventually sync to Postgres.
 *
 * Persistence contract (CLAUDE.md "Never lose a drawing"):
 * `stroke_batches` is append-only during drawing; one row per committed
 * stroke, ordered by a per-(activity, page) monotonic `seq`. A page's ink is
 * the ordered reduction of its rows. The only deletes are the user's own
 * explicit intents: undo (highest-seq row), clear page, and parent-gated
 * document deletion. No code path may rewrite or compact rows outside a
 * transaction that preserves the reduction result.
 */
import Dexie, { type Table } from 'dexie';
import type { PageMark } from '@/types/ink';
import type { STROKE_BATCH_VERSION } from '@/engine';

/**
 * Encoded image bytes plus their mime type. Stored as ArrayBuffer rather than
 * Blob: ArrayBuffer structured-clones identically in every IndexedDB
 * implementation (Blob storage has a history of Safari bugs and is not
 * supported by the in-memory test database), which keeps the zero-loss
 * guarantee verifiable in CI. UI code wraps it back into a Blob for display.
 */
export type StoredImage = {
  bytes: ArrayBuffer;
  type: string;
};

/** An imported PDF (metadata only; bytes live in `document_files`). */
export type DocumentRow = {
  id: string;
  /** Display name, from the imported file name. Parent-visible only. */
  name: string;
  page_count: number;
  /** Shelf cover thumbnail (WebP or PNG). Null until generated. */
  thumbnail: StoredImage | null;
  imported_at: number;
  last_opened_at: number | null;
};

/**
 * Document bytes, split from metadata so listing the shelf never loads
 * multi-megabyte PDFs into memory. Mirrors the Phase 2 split between a
 * Postgres row and a Storage object. ArrayBuffer for the same reliability
 * reasons as StoredImage.
 */
export type DocumentFileRow = {
  document_id: string;
  bytes: ArrayBuffer;
};

/** A drawing session over a document. Phase 1: exactly one per document. */
export type ActivityRow = {
  id: string;
  document_id: string;
  /** Last page the child was on; the resume target. */
  last_page: number;
  created_at: number;
  updated_at: number;
};

/** Per-page bookkeeping within an activity (which pages have ink, freshness). */
export type PageRow = {
  id: string;
  activity_id: string;
  page_number: number;
  updated_at: number;
};

/** One batch of committed marks (strokes or stickers). Append-only. */
export type StrokeBatchRow = {
  id: string;
  activity_id: string;
  page_number: number;
  /** Monotonic per (activity_id, page_number); reduction order. */
  seq: number;
  version: typeof STROKE_BATCH_VERSION;
  strokes: PageMark[];
  created_at: number;
};

export class PeniPadDb extends Dexie {
  documents!: Table<DocumentRow, string>;
  document_files!: Table<DocumentFileRow, string>;
  activities!: Table<ActivityRow, string>;
  pages!: Table<PageRow, string>;
  stroke_batches!: Table<StrokeBatchRow, string>;

  constructor() {
    super('penipad');
    this.version(1).stores({
      documents: 'id, imported_at, last_opened_at',
      document_files: 'document_id',
      activities: 'id, document_id, updated_at',
      pages: 'id, [activity_id+page_number], activity_id',
      stroke_batches: 'id, [activity_id+page_number+seq], activity_id',
    });
  }
}

/** The app-wide database instance. Only `src/db/queries.ts` may touch it. */
export const db = new PeniPadDb();
