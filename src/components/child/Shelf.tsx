/**
 * The shelf: a cover grid of imported worksheets. Child-reachable; opening a
 * worksheet is one tap on its cover. Importing and deleting are parent
 * actions and live behind the gate (see ImportControl).
 */
import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import type { DocumentRow } from '@/db/schema';
import { useDocuments } from '@/hooks/use-documents';
import { useUiStore } from '@/store/ui';
import { EllipsisVertical, FileText, Settings as SettingsIcon } from 'lucide-react';
import { ImportControl } from '@/components/parent/ImportControl';
import { DocumentActions } from '@/components/parent/DocumentActions';
import { Welcome } from './Welcome';

function SettingsButton(): JSX.Element {
  const openSettings = useUiStore((s) => s.openSettings);
  const requestGate = useUiStore((s) => s.requestGate);
  return (
    <button
      type="button"
      className="shelf__settings"
      aria-label="settings"
      onClick={() => requestGate({ label: 'Open grown-up settings.', onPass: openSettings })}
    >
      <SettingsIcon size={26} aria-hidden />
    </button>
  );
}

export function Shelf(): JSX.Element {
  const { documents, loading, refresh } = useDocuments();
  const openActivity = useUiStore((s) => s.openActivity);
  const onImported = useCallback(() => void refresh(), [refresh]);
  const [actionsFor, setActionsFor] = useState<DocumentRow | null>(null);

  if (loading) {
    return (
      <main className="shelf shelf--center">
        <div className="spinner" aria-label="loading" />
      </main>
    );
  }

  if (documents.length === 0) {
    return (
      <main className="shelf shelf--center">
        <Welcome>
          <ImportControl variant="hero" onImported={onImported} />
        </Welcome>
      </main>
    );
  }

  return (
    <main className="shelf">
      <header className="shelf__header">
        <SettingsButton />
        <h1 className="shelf__brand">Peni Pad</h1>
        <ImportControl variant="fab" onImported={onImported} />
      </header>
      <div className="shelf__scroll">
        <div className="shelf__grid">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onOpen={() => openActivity(doc.id)}
              onMore={() => setActionsFor(doc)}
            />
          ))}
        </div>
      </div>
      {actionsFor && (
        <DocumentActions
          document={actionsFor}
          onClose={() => setActionsFor(null)}
          onDeleted={() => {
            setActionsFor(null);
            void refresh();
          }}
        />
      )}
    </main>
  );
}

type DocumentCardProps = {
  document: DocumentRow;
  onOpen: () => void;
  onMore: () => void;
};

function DocumentCard({ document, onOpen, onMore }: DocumentCardProps): JSX.Element {
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
    <div className="cover">
      <button type="button" className="cover__open" onClick={onOpen} aria-label={document.name}>
        {coverUrl ? (
          <img className="cover__image" src={coverUrl} alt="" />
        ) : (
          <span className="cover__placeholder">
            <FileText size={48} aria-hidden />
          </span>
        )}
        <span className="cover__name">{document.name}</span>
      </button>
      <button
        type="button"
        className="cover__more"
        aria-label={`options for ${document.name}`}
        onClick={onMore}
      >
        <EllipsisVertical size={20} aria-hidden />
      </button>
    </div>
  );
}
