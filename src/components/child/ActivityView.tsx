/**
 * The drawing screen: PDF page with the layered ink canvas stack, the child
 * tray below, page arrows at the sides, and an icon-only back button. The
 * worksheet is the hero; chrome stays at the edges.
 */
import type { JSX } from 'react';
import { useActivitySession } from '@/hooks/use-activity-session';
import { useDrawingSurface } from '@/hooks/use-drawing-surface';
import { useUiStore } from '@/store/ui';
import type { InkEngine } from '@/engine';
import type { PdfDocumentHandle } from '@/pdf/loader';
import { Toolbar } from './Toolbar';
import { PageNav } from './PageNav';
import { DoneButton } from './DoneButton';
import { StickerLayer } from './StickerLayer';
import { BackIcon } from '@/components/shared/icons';

export type ActivityViewProps = {
  documentId: string;
};

export function ActivityView({ documentId }: ActivityViewProps): JSX.Element {
  const session = useActivitySession(documentId);
  const openShelf = useUiStore((s) => s.openShelf);

  if (session.status === 'loading') {
    return (
      <main className="activity activity--pending">
        <div className="spinner" aria-label="loading" />
      </main>
    );
  }

  if (session.status === 'missing' || session.status === 'error') {
    return (
      <main className="activity activity--pending">
        {/* Parent-facing copy: this state only appears when something broke. */}
        <p className="activity__error">
          {session.status === 'missing'
            ? 'This worksheet is no longer on the device.'
            : session.message}
        </p>
        <button type="button" className="page-nav" aria-label="back" onClick={openShelf}>
          <BackIcon />
        </button>
      </main>
    );
  }

  return (
    <DrawingScreen
      engine={session.engine}
      pdf={session.pdf}
      currentPage={session.currentPage}
      pageCount={session.pageCount}
      onNavigate={(page) => void session.goToPage(page)}
      onBack={openShelf}
    />
  );
}

type DrawingScreenProps = {
  engine: InkEngine;
  pdf: PdfDocumentHandle;
  currentPage: number;
  pageCount: number;
  onNavigate: (pageNumber: number) => void;
  onBack: () => void;
};

function DrawingScreen({
  engine,
  pdf,
  currentPage,
  pageCount,
  onNavigate,
  onBack,
}: DrawingScreenProps): JSX.Element {
  const { containerRef, pdfCanvasRef, committedCanvasRef, liveCanvasRef, cssSize } =
    useDrawingSurface(engine, pdf, currentPage);

  const stackStyle = cssSize ? { width: cssSize.width, height: cssSize.height } : undefined;

  return (
    <main className="activity">
      <button type="button" className="activity__back" aria-label="back to shelf" onClick={onBack}>
        <BackIcon />
      </button>
      <DoneButton engine={engine} />

      <div className="activity__page-area" ref={containerRef}>
        <div className="canvas-stack" style={stackStyle}>
          <canvas ref={pdfCanvasRef} className="canvas-stack__layer" />
          <canvas ref={committedCanvasRef} className="canvas-stack__layer" />
          <canvas ref={liveCanvasRef} className="canvas-stack__layer canvas-stack__layer--input" />
          <StickerLayer engine={engine} page={currentPage} />
        </div>
        <PageNav currentPage={currentPage} pageCount={pageCount} onNavigate={onNavigate} />
      </div>

      <Toolbar engine={engine} />
    </main>
  );
}
