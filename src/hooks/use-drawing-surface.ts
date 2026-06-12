/**
 * Wires the canvas stack to the engine for one ready session: PDF page
 * rasterization, ink surface sizing, pointer input attachment, and
 * fit-to-container layout with resize handling. Pure glue; the hot path
 * lives in engine/input.ts and engine/surface.ts, not in React.
 */
import { useEffect, useRef, useState } from 'react';
import { attachInkInput, InkSurface, type InkEngine, type Viewport } from '@/engine';
import type { PdfDocumentHandle } from '@/pdf/loader';

/** Breathing room above and below the page, in CSS px. */
const PAGE_INSET_Y = 14;

export type DrawingSurfaceRefs = {
  containerRef: React.RefObject<HTMLDivElement>;
  pdfCanvasRef: React.RefObject<HTMLCanvasElement>;
  committedCanvasRef: React.RefObject<HTMLCanvasElement>;
  liveCanvasRef: React.RefObject<HTMLCanvasElement>;
  /** CSS size of the page stack, for layout. Null until first render. */
  cssSize: { width: number; height: number } | null;
};

export function useDrawingSurface(
  engine: InkEngine,
  pdf: PdfDocumentHandle,
  currentPage: number,
): DrawingSurfaceRefs {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const committedCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cssSize, setCssSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const pdfCanvas = pdfCanvasRef.current;
    const committedCanvas = committedCanvasRef.current;
    const liveCanvas = liveCanvasRef.current;
    if (!container || !pdfCanvas || !committedCanvas || !liveCanvas) return;

    const surface = new InkSurface({ engine, committedCanvas, liveCanvas });

    // Viewport cache: recomputed after layout/render, read per pointer event.
    const viewport: Viewport = { originX: 0, originY: 0, width: 1, height: 1 };
    const refreshViewport = (): void => {
      const rect = liveCanvas.getBoundingClientRect();
      viewport.originX = rect.left;
      viewport.originY = rect.top;
      viewport.width = rect.width;
      viewport.height = rect.height;
    };

    const detachInput = attachInkInput({
      engine,
      target: liveCanvas,
      getViewport: () => viewport,
      onFrame: () => surface.scheduleLiveFrame(),
    });

    let renderEpoch = 0;
    const layoutAndRender = async (): Promise<void> => {
      const epoch = ++renderEpoch;
      const aspect = await pdf.getPageAspectRatio(currentPage);
      if (epoch !== renderEpoch) return;

      // Fit the page inside the container, width- or height-bound. A vertical
      // inset keeps the page off the top edge and the tray without padding the
      // container (padding would inflate getBoundingClientRect and the page
      // would overhang). Side margins fall out of centering a portrait page.
      const bounds = container.getBoundingClientRect();
      const availWidth = bounds.width;
      const availHeight = bounds.height - PAGE_INSET_Y * 2;
      if (availWidth <= 0 || availHeight <= 0) return;
      const cssWidth = Math.min(availWidth, availHeight * aspect);
      const cssHeight = cssWidth / aspect;

      const result = await pdf.renderPage(currentPage, pdfCanvas, {
        cssWidth,
        devicePixelRatio: window.devicePixelRatio || 1,
      });
      if (epoch !== renderEpoch || result.status !== 'rendered') return;

      surface.setPageSize(result.pixelWidth, result.pixelHeight);
      setCssSize({ width: cssWidth, height: cssHeight });
      // Viewport must be read after the new size is laid out.
      requestAnimationFrame(refreshViewport);
    };

    void layoutAndRender();

    const resizeObserver = new ResizeObserver(() => {
      void layoutAndRender();
    });
    resizeObserver.observe(container);
    window.addEventListener('scroll', refreshViewport, true);

    return () => {
      renderEpoch += 1;
      resizeObserver.disconnect();
      window.removeEventListener('scroll', refreshViewport, true);
      detachInput();
      surface.dispose();
    };
  }, [engine, pdf, currentPage]);

  return { containerRef, pdfCanvasRef, committedCanvasRef, liveCanvasRef, cssSize };
}
