/**
 * Export a child's work (F1.9): a flattened PNG of one page, or the whole
 * activity as a flattened PDF. "Flattened" means the worksheet and the ink are
 * burned into pixels, so the file looks exactly like the screen and needs no
 * special viewer.
 *
 * Loaded via dynamic import (pdf.js + pdf-lib stay out of the initial bundle).
 * Ink is rendered onto its own transparent layer and composited over the page,
 * so eraser strokes reveal the worksheet beneath rather than punching black,
 * exactly as the live layered canvas does.
 *
 * Phase 1 scope is F1.9 to the letter: worksheet + ink. Celebration stickers
 * (F1.12, a screen decoration) are not yet burned in; that is a follow-up.
 */
import { InkEngine, renderStrokes } from '@/engine';
import {
  getDocument,
  getDocumentBytes,
  getOrCreateActivity,
  loadPageStrokeBatches,
} from '@/db/queries';
import { openPdfDocument, type PdfDocumentHandle } from './loader';

/** Target width for an exported page, in pixels (~150 dpi for Letter/A4). */
const EXPORT_PAGE_WIDTH = 1240;

export type ExportResult = { blob: Blob; filename: string };

/** Turn a document name into a safe download filename stem. */
export function safeFilename(name: string): string {
  const cleaned = name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9\-_ ]+/gi, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'worksheet';
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding produced no image'))),
      'image/png',
    );
  });
}

/**
 * Render one page to an opaque canvas: the rasterized worksheet with the page's
 * ink composited on top.
 */
async function flattenPage(
  handle: PdfDocumentHandle,
  activityId: string,
  pageNumber: number,
): Promise<HTMLCanvasElement> {
  const pageCanvas = document.createElement('canvas');
  const result = await handle.renderPage(pageNumber, pageCanvas, {
    cssWidth: EXPORT_PAGE_WIDTH,
    devicePixelRatio: 1,
  });
  if (result.status !== 'rendered') {
    throw new Error('Page render was cancelled');
  }
  const width = pageCanvas.width;
  const height = pageCanvas.height;

  // Ink on its own transparent layer so the eraser reveals the worksheet.
  const inkCanvas = document.createElement('canvas');
  inkCanvas.width = width;
  inkCanvas.height = height;
  const inkCtx = inkCanvas.getContext('2d');
  if (!inkCtx) throw new Error('Could not acquire a 2D context for ink');

  const engine = new InkEngine();
  engine.loadPage(pageNumber, await loadPageStrokeBatches(activityId, pageNumber));
  renderStrokes(inkCtx, engine.getPageStrokes(pageNumber), { width, height });

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not acquire a 2D context for export');
  ctx.drawImage(pageCanvas, 0, 0);
  ctx.drawImage(inkCanvas, 0, 0);
  return out;
}

async function withDocument<T>(
  documentId: string,
  fn: (handle: PdfDocumentHandle, activityId: string, name: string) => Promise<T>,
): Promise<T> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error('Document not found');
  const bytes = await getDocumentBytes(documentId);
  if (!bytes) throw new Error('Document bytes missing');
  const handle = await openPdfDocument(bytes);
  try {
    const activityId = (await getOrCreateActivity(documentId)).id;
    return await fn(handle, activityId, doc.name);
  } finally {
    await handle.destroy();
  }
}

/** Export a single flattened page as a PNG. */
export function exportPagePng(documentId: string, pageNumber: number): Promise<ExportResult> {
  return withDocument(documentId, async (handle, activityId, name) => {
    const canvas = await flattenPage(handle, activityId, pageNumber);
    const blob = await canvasToPngBlob(canvas);
    return { blob, filename: `${safeFilename(name)}-page-${pageNumber}.png` };
  });
}

/** Export the whole activity as a flattened, multi-page PDF. */
export function exportActivityPdf(documentId: string): Promise<ExportResult> {
  return withDocument(documentId, async (handle, activityId, name) => {
    const { PDFDocument } = await import('pdf-lib');
    const out = await PDFDocument.create();
    for (let pageNumber = 1; pageNumber <= handle.pageCount; pageNumber++) {
      const canvas = await flattenPage(handle, activityId, pageNumber);
      const png = await canvasToPngBlob(canvas);
      const image = await out.embedPng(await png.arrayBuffer());
      const page = out.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    const pdfBytes = await out.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return { blob, filename: `${safeFilename(name)}.pdf` };
  });
}
