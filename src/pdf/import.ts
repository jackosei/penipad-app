/**
 * Document import pipeline: a picked or dropped File becomes a stored
 * document (bytes + metadata + cover thumbnail) ready for the shelf.
 *
 * Loaded via dynamic import so pdf.js never weighs down the initial bundle
 * (time-to-first-stroke budget). The PDF is opened once here to validate it,
 * count pages, and render the cover; the bytes that get persisted are the
 * original file bytes, untouched.
 */
import type { DocumentRow } from '@/db/schema';
import { addDocument } from '@/db/queries';
import { openPdfDocument, PdfOpenError } from './loader';
import { renderThumbnail } from './thumbnailer';

export { PdfOpenError };

/** Parent-zone messages per failure reason (plain language, no jargon). */
export const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  password: 'This PDF has a password. Remove the password and try again.',
  corrupt: 'This file looks damaged or is not a real PDF.',
  'not-pdf': 'Only PDF files can be imported.',
  unknown: 'This PDF could not be imported. Try a different file.',
};

export class ImportError extends Error {
  readonly reason: keyof typeof IMPORT_ERROR_MESSAGES;

  constructor(reason: keyof typeof IMPORT_ERROR_MESSAGES, cause?: unknown) {
    super(IMPORT_ERROR_MESSAGES[reason] ?? IMPORT_ERROR_MESSAGES.unknown, { cause });
    this.name = 'ImportError';
    this.reason = reason;
  }
}

function looksLikePdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function displayName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').trim() || 'Worksheet';
}

/**
 * Import one PDF file: validate, thumbnail, persist. Returns the stored
 * document row. Throws `ImportError` with a UI-mappable reason.
 */
export async function importPdfFile(file: File): Promise<DocumentRow> {
  if (!looksLikePdf(file)) {
    throw new ImportError('not-pdf');
  }

  const bytes = await file.arrayBuffer();

  let handle;
  try {
    handle = await openPdfDocument(bytes);
  } catch (error) {
    if (error instanceof PdfOpenError) throw new ImportError(error.reason, error);
    throw new ImportError('unknown', error);
  }

  try {
    let thumbnail: { bytes: ArrayBuffer; type: string } | null = null;
    try {
      const blob = await renderThumbnail(handle, 1);
      thumbnail = { bytes: await blob.arrayBuffer(), type: blob.type };
    } catch {
      // A missing cover is cosmetic; never fail an import over it.
      thumbnail = null;
    }

    return await addDocument({
      name: displayName(file.name),
      bytes,
      pageCount: handle.pageCount,
      thumbnail,
    });
  } finally {
    await handle.destroy();
  }
}
