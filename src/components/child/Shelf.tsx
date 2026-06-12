/**
 * The shelf: a cover grid of imported worksheets. Child-reachable; opening a
 * worksheet is one tap on its cover. Importing and deleting are parent
 * actions and live behind the gate (see ImportControl).
 */
import { useEffect, useMemo, type JSX } from 'react';
import type { DocumentRow } from '@/db/schema';
import { useDocuments } from '@/hooks/use-documents';
import { useUiStore } from '@/store/ui';
import { ImportControl } from '@/components/parent/ImportControl';
import { PageIcon } from '@/components/shared/icons';

export function Shelf(): JSX.Element {
  const { documents, loading, refresh } = useDocuments();
  const openActivity = useUiStore((s) => s.openActivity);

  return (
    <main className="shelf">
      {!loading && documents.length === 0 && (
        <div className="shelf__empty">
          <PageIcon size={72} className="shelf__empty-icon" />
          {/* Empty shelf is setup mode: parent-facing copy is acceptable here. */}
          <p className="shelf__empty-text">Add a worksheet PDF to get started.</p>
        </div>
      )}

      <div className="shelf__grid">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} onOpen={() => openActivity(doc.id)} />
        ))}
      </div>

      <ImportControl onImported={() => void refresh()} />
    </main>
  );
}

type DocumentCardProps = {
  document: DocumentRow;
  onOpen: () => void;
};

function DocumentCard({ document, onOpen }: DocumentCardProps): JSX.Element {
  const coverUrl = useMemo(() => {
    if (!document.thumbnail) return null;
    const blob = new Blob([document.thumbnail.bytes], { type: document.thumbnail.type });
    return URL.createObjectURL(blob);
  }, [document.thumbnail]);

  useEffect(() => {
    return () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [coverUrl]);

  return (
    <button type="button" className="cover" onClick={onOpen} aria-label={document.name}>
      {coverUrl ? (
        <img className="cover__image" src={coverUrl} alt="" />
      ) : (
        <span className="cover__placeholder">
          <PageIcon size={48} />
        </span>
      )}
      <span className="cover__name">{document.name}</span>
    </button>
  );
}
