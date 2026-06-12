/**
 * The drawing screen. Three bands: a top bar (home, page nav, history, wipe,
 * done), the worksheet with its layered ink canvas stack, and the child tray
 * (tools, colors, sizes). The worksheet itself carries zero chrome; the page
 * is the hero.
 */
import type { JSX } from 'react';
import { useActivitySession } from '@/hooks/use-activity-session';
import { useDrawingSurface } from '@/hooks/use-drawing-surface';
import { useUiStore } from '@/store/ui';
import type { InkEngine } from '@/engine';
import type { PdfDocumentHandle } from '@/pdf/loader';
import { House } from 'lucide-react';
import { Toolbar } from './Toolbar';
import { PageNav } from './PageNav';
import { HistoryControls } from './HistoryControls';
import { WipeButton } from './WipeButton';
import { DoneButton } from './DoneButton';
import { StickerLayer } from './StickerLayer';

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
        <button type="button" className="pending-home" aria-label="home" onClick={openShelf}>
          <House aria-hidden />
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
      <div className="topbar">
        <button type="button" className="top-button" aria-label="home" onClick={onBack}>
          <House size={26} aria-hidden />
        </button>

        <span className="topbar__spacer" />
        <PageNav currentPage={currentPage} pageCount={pageCount} onNavigate={onNavigate} />
        <span className="topbar__spacer" />

        <div className="topbar__cluster">
          <HistoryControls engine={engine} page={currentPage} />
          <WipeButton engine={engine} />
          <DoneButton engine={engine} />
        </div>
      </div>

      <div className="activity__page-area" ref={containerRef}>
        <div className="activity__stage" style={stackStyle}>
          <div className="canvas-stack">
            <canvas ref={pdfCanvasRef} className="canvas-stack__layer" />
            <canvas ref={committedCanvasRef} className="canvas-stack__layer" />
            <canvas
              ref={liveCanvasRef}
              className="canvas-stack__layer canvas-stack__layer--input"
            />
            <StickerLayer engine={engine} page={currentPage} />
          </div>
        </div>
      </div>

      <Toolbar engine={engine} />
    </main>
  );
}
