/**
 * Cover thumbnail generation for the shelf UI.
 *
 * Renders a page at thumbnail size and encodes it to a Blob suitable for
 * storing in Dexie and displaying via object URL. WebP is requested; browsers
 * that cannot encode it fall back to PNG per the canvas.toBlob spec.
 */
import { PDF } from '@/constants';
import type { PdfDocumentHandle } from './loader';

/** Fit a width/height box inside a square of `maxEdge`, preserving aspect. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxEdge <= 0) {
    return { width: 0, height: 0 };
  }
  const ratio = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Thumbnail encoding produced no image'));
        }
      },
      type,
      quality,
    );
  });
}

/**
 * Render `pageNumber` (default: the cover) of a document into an encoded
 * thumbnail Blob whose longest edge is `maxEdge` pixels.
 */
export async function renderThumbnail(
  handle: PdfDocumentHandle,
  pageNumber = 1,
  maxEdge: number = PDF.THUMBNAIL_MAX_EDGE,
): Promise<Blob> {
  const aspect = await handle.getPageAspectRatio(pageNumber);
  // fitWithin scales proportionally, so the unit-height box (aspect x 1)
  // fitted into the maxEdge square yields the final thumbnail dimensions.
  const target = fitWithin(aspect, 1, maxEdge);

  const canvas = document.createElement('canvas');
  const result = await handle.renderPage(pageNumber, canvas, {
    cssWidth: target.width,
    devicePixelRatio: 1,
  });
  if (result.status !== 'rendered') {
    throw new Error('Thumbnail render was cancelled');
  }
  return canvasToBlob(canvas, 'image/webp', PDF.THUMBNAIL_QUALITY);
}
