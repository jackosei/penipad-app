/**
 * The drawing session lifecycle for one document: load bytes, open the PDF
 * (dynamic import keeps pdf.js out of the initial bundle), resolve the
 * activity, restore ink for the resume page, and run autosave for the whole
 * session. All business logic delegates to db/pdf/engine modules.
 */
import { useEffect, useRef, useState } from 'react';
import { InkEngine } from '@/engine';
import type { PdfDocumentHandle } from '@/pdf/loader';
import {
  getDocumentBytes,
  getOrCreateActivity,
  loadPageStrokeBatches,
  touchDocumentOpened,
  updateActivityLastPage,
} from '@/db/queries';
import { startAutosave, type AutosaveHandle } from '@/db/autosave';
import { useUiStore } from '@/store/ui';

export type ActivitySession =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      engine: InkEngine;
      pdf: PdfDocumentHandle;
      activityId: string;
      pageCount: number;
      currentPage: number;
      goToPage: (pageNumber: number) => Promise<void>;
    };

export function useActivitySession(documentId: string): ActivitySession {
  const [session, setSession] = useState<ActivitySession>({ status: 'loading' });
  const setParentNotice = useUiStore((s) => s.setParentNotice);

  // One engine per mounted session; never recreated across renders.
  const engineRef = useRef<InkEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new InkEngine();

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let cancelled = false;
    let pdf: PdfDocumentHandle | null = null;
    let autosave: AutosaveHandle | null = null;

    async function open(): Promise<void> {
      if (!engine) return;
      const bytes = await getDocumentBytes(documentId);
      if (!bytes) {
        if (!cancelled) setSession({ status: 'missing' });
        return;
      }

      const { openPdfDocument } = await import('@/pdf/loader');
      pdf = await openPdfDocument(bytes);

      const activity = await getOrCreateActivity(documentId);
      const startPage = Math.min(Math.max(activity.last_page, 1), pdf.pageCount);

      engine.setActivePage(startPage);
      engine.loadPage(startPage, await loadPageStrokeBatches(activity.id, startPage));

      autosave = startAutosave({
        engine,
        activityId: activity.id,
        onError: () => {
          // Parent-zone wording; the child surface never shows text.
          setParentNotice('Saving is having trouble. Free up space on this device.');
        },
      });
      void touchDocumentOpened(documentId);

      const goToPage = async (pageNumber: number): Promise<void> => {
        if (!pdf || !engine) return;
        const target = Math.min(Math.max(pageNumber, 1), pdf.pageCount);
        engine.setActivePage(target);
        engine.loadPage(target, await loadPageStrokeBatches(activity.id, target));
        await updateActivityLastPage(activity.id, target);
        setSession((previous) =>
          previous.status === 'ready' ? { ...previous, currentPage: target } : previous,
        );
      };

      if (!cancelled) {
        setSession({
          status: 'ready',
          engine,
          pdf,
          activityId: activity.id,
          pageCount: pdf.pageCount,
          currentPage: startPage,
          goToPage,
        });
      }
    }

    open().catch((error: unknown) => {
      if (!cancelled) {
        const message =
          error instanceof Error ? error.message : 'This worksheet could not be opened.';
        setSession({ status: 'error', message });
      }
    });

    return () => {
      cancelled = true;
      // Flush pending saves before the PDF handle goes away. [DATA SAFETY]
      const teardown = async (): Promise<void> => {
        await autosave?.dispose();
        await pdf?.destroy();
      };
      void teardown();
    };
  }, [documentId, setParentNotice]);

  return session;
}
