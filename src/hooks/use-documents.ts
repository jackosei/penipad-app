/**
 * Shelf data: the document list with refresh. Thin wrapper over db queries.
 */
import { useCallback, useEffect, useState } from 'react';
import type { DocumentRow } from '@/db/schema';
import { listDocuments } from '@/db/queries';

export type DocumentsState = {
  documents: DocumentRow[];
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useDocuments(): DocumentsState {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setDocuments(await listDocuments());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { documents, loading, refresh };
}
