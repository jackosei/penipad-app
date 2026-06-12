/**
 * pdf.js wrapper: local worker configuration, document opening, page
 * virtualization, and render-to-canvas with cancellation.
 *
 * Offline contract (CLAUDE.md "PDF worker"): the worker script and every
 * auxiliary asset (CMaps, standard fonts, wasm codecs, ICC profiles) are
 * bundled and served from our own origin. Nothing is fetched from a CDN at
 * runtime; the app works with the network cable cut.
 */
// The LEGACY build, deliberately: the modern build assumes a browser from the
// last year or two (e.g. Promise.withResolvers needs Chrome 119+ / Safari
// 17.4+) and dies with a generic error on older tablets. Our primary market is
// exactly those tablets (Ama's Android, PRD personas), so the wider-support
// build wins over the smaller one.
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { PDF } from '@/constants';

/** Same-origin base for pdf.js's lazily fetched assets (see vite.config.ts). */
const ASSET_BASE = `${import.meta.env.BASE_URL}pdf-assets/`;

let workerConfigured = false;

/** Point pdf.js at the locally bundled worker. Idempotent; called on open. */
export function configurePdfWorker(): void {
  if (workerConfigured) return;
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  workerConfigured = true;
}

// --- error classification ----------------------------------------------------

/** Why a PDF failed to open, in terms the parent zone can message on. */
export type PdfOpenFailure = 'password' | 'corrupt' | 'unknown';

/** Thrown by `openPdfDocument` with a classified, UI-mappable reason. */
export class PdfOpenError extends Error {
  readonly reason: PdfOpenFailure;

  constructor(reason: PdfOpenFailure, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'PdfOpenError';
    this.reason = reason;
  }
}

/** Map a raw pdf.js exception onto a `PdfOpenFailure`. */
export function classifyPdfError(error: unknown): PdfOpenFailure {
  const name =
    typeof error === 'object' && error !== null && 'name' in error ? error.name : undefined;
  if (name === 'PasswordException') return 'password';
  if (name === 'InvalidPDFException' || name === 'FormatError') return 'corrupt';
  return 'unknown';
}

// --- pure helpers (exported for tests) ----------------------------------------

/**
 * Copy input bytes before handing them to pdf.js. getDocument transfers its
 * buffer to the worker (detaching it); without this copy, a caller that also
 * persists the original bytes to IndexedDB would silently persist an empty
 * buffer. [DATA SAFETY] Do not remove.
 */
export function copyPdfBytes(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array
    ? new Uint8Array(bytes.slice().buffer)
    : new Uint8Array(bytes.slice(0));
}

/**
 * Compute the pdf.js viewport scale for a target CSS width and device pixel
 * ratio, clamped so the rasterized canvas never exceeds `maxPixels` (iOS
 * canvas ceiling / low-end Android memory budget).
 */
export function computeRenderScale(args: {
  baseWidth: number;
  baseHeight: number;
  cssWidth: number;
  devicePixelRatio: number;
  maxPixels?: number;
}): number {
  const { baseWidth, baseHeight, cssWidth } = args;
  const maxPixels = args.maxPixels ?? PDF.MAX_RENDER_PIXELS;
  if (baseWidth <= 0 || baseHeight <= 0 || cssWidth <= 0) return 1;
  const dpr = args.devicePixelRatio > 0 ? args.devicePixelRatio : 1;

  let scale = (cssWidth * dpr) / baseWidth;
  const pixels = baseWidth * scale * (baseHeight * scale);
  if (pixels > maxPixels) {
    scale *= Math.sqrt(maxPixels / pixels);
  }
  return scale;
}

/** The cleanup contract `PageCache` needs; PDFPageProxy satisfies it. */
type Cleanable = { cleanup(): unknown };

/**
 * Bounded LRU of live page objects. Keeps recently used pages warm so flipping
 * back is instant, and releases pdf.js internal resources for evicted ones so
 * a 300-page document cannot exhaust memory (page virtualization).
 */
export class PageCache<T extends Cleanable> {
  private readonly entries = new Map<number, T>();

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`PageCache capacity must be a positive integer, got ${capacity}`);
    }
  }

  get(key: number): T | undefined {
    const value = this.entries.get(key);
    if (value !== undefined) {
      // Refresh recency: Map iteration order is insertion order.
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  set(key: number, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.evict(oldest);
    }
  }

  clear(): void {
    for (const key of [...this.entries.keys()]) {
      this.evict(key);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  private evict(key: number): void {
    const value = this.entries.get(key);
    this.entries.delete(key);
    try {
      value?.cleanup();
    } catch {
      // cleanup() can refuse while a render is in flight; eviction must not throw.
    }
  }
}

// --- document handle -----------------------------------------------------------

export type RenderPageOptions = {
  /** CSS width the page will be displayed at, in px. */
  cssWidth: number;
  /** Defaults to 1. Pass window.devicePixelRatio for crisp output. */
  devicePixelRatio?: number;
};

export type RenderPageResult =
  | {
      status: 'rendered';
      /** Backing-store size the canvas was set to. */
      pixelWidth: number;
      pixelHeight: number;
      /** Display size; cssHeight follows the page aspect ratio. */
      cssWidth: number;
      cssHeight: number;
      scale: number;
    }
  | { status: 'cancelled' };

/**
 * A loaded PDF document: page access through an LRU (virtualization), cancel-
 * safe rendering, and explicit teardown. One handle owns one PDFDocumentProxy.
 */
export class PdfDocumentHandle {
  private readonly pageCache = new PageCache<PDFPageProxy>(PDF.PAGE_CACHE_SIZE);
  private readonly inFlight = new Map<HTMLCanvasElement, RenderTask>();
  private destroyed = false;

  constructor(
    private readonly doc: PDFDocumentProxy,
    /** Owns the worker; teardown in pdf.js v6 happens via the loading task. */
    private readonly loadingTask: PDFDocumentLoadingTask,
  ) {}

  get pageCount(): number {
    return this.doc.numPages;
  }

  /** Fetch a page through the LRU. Throws RangeError for an out-of-range number. */
  async getPage(pageNumber: number): Promise<PDFPageProxy> {
    this.assertAlive();
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > this.pageCount) {
      throw new RangeError(`Page ${pageNumber} out of range 1..${this.pageCount}`);
    }
    const cached = this.pageCache.get(pageNumber);
    if (cached) return cached;
    const page = await this.doc.getPage(pageNumber);
    this.pageCache.set(pageNumber, page);
    return page;
  }

  /**
   * Width/height ratio of a page (rotation-aware). Lets the UI size the canvas
   * stack, and the ink layer accept strokes, before rasterization finishes.
   */
  async getPageAspectRatio(pageNumber: number): Promise<number> {
    const page = await this.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    return viewport.width / viewport.height;
  }

  /**
   * Rasterize a page into the given canvas. A new render on the same canvas
   * cancels the in-flight one (fast page flips), resolving the older call with
   * `{ status: 'cancelled' }` instead of rejecting.
   */
  async renderPage(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    options: RenderPageOptions,
  ): Promise<RenderPageResult> {
    this.assertAlive();
    const page = await this.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = computeRenderScale({
      baseWidth: base.width,
      baseHeight: base.height,
      cssWidth: options.cssWidth,
      devicePixelRatio: options.devicePixelRatio ?? 1,
    });
    const viewport = page.getViewport({ scale });

    this.inFlight.get(canvas)?.cancel();

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    // PDF pages are opaque; an alpha-less backing store composites faster.
    // Acquiring the context first pins these attributes: pdf.js's own
    // getContext call returns this same context (first-call-wins per spec).
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not acquire a 2D context for PDF rendering');
    }

    const task = page.render({ canvas, viewport });
    this.inFlight.set(canvas, task);
    try {
      await task.promise;
      return {
        status: 'rendered',
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
        cssWidth: options.cssWidth,
        cssHeight: options.cssWidth * (base.height / base.width),
        scale,
      };
    } catch (error) {
      if (classifyCancellation(error)) return { status: 'cancelled' };
      throw error;
    } finally {
      if (this.inFlight.get(canvas) === task) {
        this.inFlight.delete(canvas);
      }
    }
  }

  /** Cancel every in-flight render (e.g. when the activity closes). */
  cancelAll(): void {
    for (const task of this.inFlight.values()) {
      task.cancel();
    }
    this.inFlight.clear();
  }

  /** Tear down the document and free worker resources. Safe to call twice. */
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelAll();
    this.pageCache.clear();
    await this.loadingTask.destroy();
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('PdfDocumentHandle used after destroy()');
    }
  }
}

function classifyCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'RenderingCancelledException'
  );
}

// --- opening -------------------------------------------------------------------

const OPEN_ERROR_MESSAGES: Record<PdfOpenFailure, string> = {
  password: 'This PDF is password protected.',
  corrupt: 'This file is damaged or is not a valid PDF.',
  unknown: 'This PDF could not be opened.',
};

/**
 * Open a PDF from bytes (File picker, drag-and-drop, share_target, or Dexie).
 * The input is copied before being transferred to the worker, so callers can
 * safely persist the original bytes afterwards. Throws `PdfOpenError`.
 */
export async function openPdfDocument(bytes: ArrayBuffer | Uint8Array): Promise<PdfDocumentHandle> {
  configurePdfWorker();
  const task = getDocument({
    data: copyPdfBytes(bytes),
    cMapUrl: `${ASSET_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${ASSET_BASE}standard_fonts/`,
    wasmUrl: `${ASSET_BASE}wasm/`,
    iccUrl: `${ASSET_BASE}iccs/`,
  });
  try {
    const doc = await task.promise;
    return new PdfDocumentHandle(doc, task);
  } catch (error) {
    const reason = classifyPdfError(error);
    throw new PdfOpenError(reason, OPEN_ERROR_MESSAGES[reason], error);
  }
}
