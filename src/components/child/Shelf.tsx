/**
 * The shelf: a grid of hand-placed worksheet cards (peni-pad-screens design).
 * Child-reachable; opening a worksheet is one tap on its card. Parent actions
 * (settings, import, per-card options) wear a small lock badge and live behind
 * the gate.
 */
import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import type { DocumentRow } from '@/db/schema';
import { useDocuments } from '@/hooks/use-documents';
import { useUiStore } from '@/store/ui';
import { EllipsisVertical, FileText, Settings as SettingsIcon, Star } from 'lucide-react';
import { ImportControl } from '@/components/parent/ImportControl';
import { DocumentActions } from '@/components/parent/DocumentActions';
import { Wordmark } from '@/components/shared/Wordmark';
import { Welcome } from './Welcome';

function SettingsButton(): JSX.Element {
  const openSettings = useUiStore((s) => s.openSettings);
  const requestGate = useUiStore((s) => s.requestGate);
  return (
    <button
      type="button"
      className="shelf-icon-btn"
      aria-label="settings"
      onClick={() => requestGate({ label: 'Open grown-up settings.', onPass: openSettings })}
    >
      <SettingsIcon size={22} aria-hidden />
    </button>
  );
}

export function Shelf(): JSX.Element {
  const { documents, completedIds, loading, refresh } = useDocuments();
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
      <header className="shelf-topbar">
        <Wordmark />
        <span className="shelf-topbar__spacer" />
        <SettingsButton />
      </header>

      <div className="shelf-body">
        <p className="shelf-section-label">Your activities</p>
        <div className="shelf-grid">
          {documents.map((doc) => (
            <ActivityCard
              key={doc.id}
              document={doc}
              completed={completedIds.has(doc.id)}
              onOpen={() => openActivity(doc.id)}
              onMore={() => setActionsFor(doc)}
            />
          ))}
        </div>
      </div>

      <ImportControl variant="fab" onImported={onImported} />

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

type ActivityCardProps = {
  document: DocumentRow;
  completed: boolean;
  onOpen: () => void;
  onMore: () => void;
};

function ActivityCard({ document, completed, onOpen, onMore }: ActivityCardProps): JSX.Element {
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

  const pageLabel = `${document.page_count} ${document.page_count === 1 ? 'page' : 'pages'}`;

  return (
    <div className="activity-card">
      <button
        type="button"
        className="activity-card__open"
        onClick={onOpen}
        aria-label={completed ? `${document.name}, finished` : document.name}
      >
        <span className="activity-card__thumb">
          {coverUrl ? (
            <img className="activity-card__image" src={coverUrl} alt="" />
          ) : (
            <span className="activity-card__placeholder">
              <FileText size={44} aria-hidden />
            </span>
          )}
          {completed && (
            <span className="activity-card__ribbon" aria-hidden>
              <Star size={12} fill="currentColor" />
              Done
            </span>
          )}
        </span>
        <span className="activity-card__info">
          <span className="activity-card__title">{document.name}</span>
          <span className="activity-card__pages">{pageLabel}</span>
        </span>
      </button>
      <button
        type="button"
        className="activity-card__more"
        aria-label={`options for ${document.name}`}
        onClick={onMore}
      >
        <EllipsisVertical size={18} aria-hidden />
      </button>
    </div>
  );
}
