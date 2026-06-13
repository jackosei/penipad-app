/**
 * The shelf: a cover grid of imported worksheets. Child-reachable; opening a
 * worksheet is one tap on its cover. Importing and deleting are parent
 * actions and live behind the gate (see ImportControl).
 */
import { useCallback, useEffect, useMemo, type JSX } from 'react';
import type { DocumentRow } from '@/db/schema';
import { useDocuments } from '@/hooks/use-documents';
import { useUiStore } from '@/store/ui';
import { FileText, Settings as SettingsIcon } from 'lucide-react';
import { ImportControl } from '@/components/parent/ImportControl';
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
      <SettingsButton />
      <div className="shelf__grid">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} onOpen={() => openActivity(doc.id)} />
        ))}
      </div>
      <ImportControl variant="fab" onImported={onImported} />
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
          <FileText size={48} aria-hidden />
        </span>
      )}
      <span className="cover__name">{document.name}</span>
    </button>
  );
}
