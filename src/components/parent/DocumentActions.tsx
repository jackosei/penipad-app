/**
 * Per-worksheet actions menu (parent zone): save as a picture, save as a PDF,
 * or delete. The menu is just a list; each consequential action is individually
 * behind the gate (CLAUDE.md: the gate wraps every export and delete). The
 * export pipeline is dynamically imported so pdf.js and pdf-lib stay out of the
 * initial bundle.
 */
import { type JSX } from 'react';
import { FileDown, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { DocumentRow } from '@/db/schema';
import { deleteDocumentCascade } from '@/db/queries';
import { useUiStore } from '@/store/ui';

export type DocumentActionsProps = {
  document: DocumentRow;
  onClose: () => void;
  onDeleted: () => void;
};

export function DocumentActions({
  document,
  onClose,
  onDeleted,
}: DocumentActionsProps): JSX.Element {
  const requestGate = useUiStore((s) => s.requestGate);
  const setParentNotice = useUiStore((s) => s.setParentNotice);
  const setBusy = useUiStore((s) => s.setBusy);

  /** Close the menu, then front the action with the gate. */
  const gated = (label: string, run: () => void): void => {
    onClose();
    requestGate({ label, onPass: run });
  };

  const save = async (kind: 'png' | 'pdf'): Promise<void> => {
    // Blocking message: export rasterizes every page and can take a few
    // seconds, and the overlay also stops a second tap kicking off a duplicate.
    setBusy(kind === 'pdf' ? 'Saving the PDF, this can take a moment.' : 'Saving the picture.');
    try {
      const { exportPagesPng, exportActivityPdf } = await import('@/pdf/export');
      const { downloadBlob } = await import('@/utils/download');
      const result =
        kind === 'png' ? await exportPagesPng(document.id) : await exportActivityPdf(document.id);
      downloadBlob(result.blob, result.filename);
    } catch {
      setParentNotice('Sorry, this worksheet could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (): Promise<void> => {
    await deleteDocumentCascade(document.id);
    onDeleted();
  };

  return (
    <div
      className="doc-actions"
      role="dialog"
      aria-modal="true"
      aria-label={`Options for ${document.name}`}
    >
      <div className="doc-actions__backdrop" aria-hidden onClick={onClose} />
      <div className="doc-actions__card">
        <p className="doc-actions__name">{document.name}</p>

        <button
          type="button"
          className="doc-actions__item"
          onClick={() => gated('Save this page as a picture.', () => void save('png'))}
        >
          <ImageIcon size={22} aria-hidden />
          <span>Save as a picture</span>
        </button>

        <button
          type="button"
          className="doc-actions__item"
          onClick={() => gated('Save the whole worksheet as a PDF.', () => void save('pdf'))}
        >
          <FileDown size={22} aria-hidden />
          <span>Save as a PDF</span>
        </button>

        <button
          type="button"
          className="doc-actions__item doc-actions__item--danger"
          onClick={() => gated('Delete this worksheet and its drawings.', () => void remove())}
        >
          <Trash2 size={22} aria-hidden />
          <span>Delete</span>
        </button>

        <button type="button" className="doc-actions__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
