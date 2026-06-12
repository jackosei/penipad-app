/**
 * Parent-zone import: an add button plus drag-and-drop, both behind the
 * parental gate (hard constraint: every import is gated). The import
 * pipeline itself is dynamically imported so pdf.js stays out of the
 * initial bundle.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { Plus } from 'lucide-react';
import { useUiStore } from '@/store/ui';
import { HoldGate } from './HoldGate';

export type ImportControlProps = {
  onImported: () => void;
  /** 'fab' = corner button (shelf with content); 'hero' = labeled welcome CTA. */
  variant?: 'fab' | 'hero';
};

type GateRequest = { kind: 'picker' } | { kind: 'dropped'; files: File[] };

export function ImportControl({ onImported, variant = 'fab' }: ImportControlProps): JSX.Element {
  const [gateRequest, setGateRequest] = useState<GateRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setParentNotice = useUiStore((s) => s.setParentNotice);

  const runImport = useCallback(
    async (files: File[]): Promise<void> => {
      setBusy(true);
      try {
        const { importPdfFile, ImportError } = await import('@/pdf/import');
        for (const file of files) {
          try {
            await importPdfFile(file);
          } catch (error) {
            setParentNotice(
              error instanceof ImportError
                ? error.message
                : 'This PDF could not be imported. Try a different file.',
            );
          }
        }
        onImported();
      } finally {
        setBusy(false);
      }
    },
    [onImported, setParentNotice],
  );

  const onGateUnlock = useCallback((): void => {
    const request = gateRequest;
    setGateRequest(null);
    if (!request) return;
    if (request.kind === 'picker') {
      inputRef.current?.click();
    } else {
      void runImport(request.files);
    }
  }, [gateRequest, runImport]);

  const onFilesPicked = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = ''; // allow picking the same file again
      if (files.length > 0) void runImport(files);
    },
    [runImport],
  );

  // Drag-and-drop lands on the whole window so the drop zone is the shelf
  // itself; the gate still fronts the actual import.
  useEffect(() => {
    const onDragOver = (event: DragEvent): void => {
      event.preventDefault();
    };
    const onDrop = (event: DragEvent): void => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) setGateRequest({ kind: 'dropped', files });
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const requestPicker = (): void => setGateRequest({ kind: 'picker' });

  return (
    <>
      {variant === 'hero' ? (
        <button type="button" className="import-cta" disabled={busy} onClick={requestPicker}>
          {busy ? (
            <span className="spinner spinner--small" aria-hidden />
          ) : (
            <Plus size={24} aria-hidden />
          )}
          <span>Add a worksheet</span>
        </button>
      ) : (
        <button
          type="button"
          className="import-button"
          aria-label="add worksheet"
          disabled={busy}
          onClick={requestPicker}
        >
          {busy ? <span className="spinner spinner--small" aria-hidden /> : <Plus aria-hidden />}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={onFilesPicked}
      />

      {gateRequest !== null && (
        <HoldGate
          label="Add a worksheet to the shelf."
          onUnlock={onGateUnlock}
          onDismiss={() => setGateRequest(null)}
        />
      )}
    </>
  );
}
