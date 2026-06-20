/**
 * Shelf data: the document list plus which documents are completed, with
 * refresh. Thin wrapper over db queries.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DocumentRow } from '@/db/schema';
import { listCompletedDocumentIds, listDocuments } from '@/db/queries';

export type DocumentsState = {
  documents: DocumentRow[];
  /** Document ids whose activity has been marked done (F1.12). */
  completedIds: Set<string>;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useDocuments(): DocumentsState {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    const [docs, completed] = await Promise.all([listDocuments(), listCompletedDocumentIds()]);
    setDocuments(docs);
    setCompletedIds(completed);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { documents, completedIds, loading, refresh };
}
