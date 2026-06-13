/**
 * Parent settings, reached from the shelf behind the gate. Plain language, no
 * jargon (parent-zone copy rules). Phase 1 scope: storage usage, a destructive
 * "delete everything" behind a second gate, and the privacy posture stated
 * plainly (privacy by architecture: nothing about the child leaves the device).
 */
import { useCallback, useEffect, useState, type JSX } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useUiStore } from '@/store/ui';
import { deleteEverything, estimateStorageBytes } from '@/db/queries';
import { STORAGE } from '@/constants';

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Settings(): JSX.Element {
  const openShelf = useUiStore((s) => s.openShelf);
  const requestGate = useUiStore((s) => s.requestGate);
  const setParentNotice = useUiStore((s) => s.setParentNotice);
  const [usageBytes, setUsageBytes] = useState<number | null>(null);

  const refreshUsage = useCallback(() => {
    void estimateStorageBytes().then(setUsageBytes);
  }, []);

  useEffect(refreshUsage, [refreshUsage]);

  const deleteAll = useCallback(() => {
    requestGate({
      label: 'Delete every worksheet and all drawings? This cannot be undone.',
      onPass: () => {
        void deleteEverything().then(() => {
          setParentNotice('Everything was deleted.');
          refreshUsage();
        });
      },
    });
  }, [requestGate, setParentNotice, refreshUsage]);

  const warn = usageBytes !== null && usageBytes >= STORAGE.WARNING_THRESHOLD_BYTES;

  return (
    <main className="settings">
      <header className="settings__header">
        <button type="button" className="top-button" aria-label="back" onClick={openShelf}>
          <ArrowLeft size={26} aria-hidden />
        </button>
        <h1 className="settings__title">Settings</h1>
      </header>

      <section className="settings__section">
        <h2 className="settings__heading">Storage</h2>
        <p className="settings__body">
          {usageBytes === null
            ? 'Storage usage is not available on this device.'
            : `This app is using about ${formatMegabytes(usageBytes)} on this device.`}
        </p>
        {warn && (
          <p className="settings__warn">
            Storage is getting full. Deleting old worksheets will free space.
          </p>
        )}
        <button type="button" className="settings__danger" onClick={deleteAll}>
          <Trash2 size={20} aria-hidden />
          <span>Delete everything</span>
        </button>
      </section>

      <section className="settings__section">
        <h2 className="settings__heading">Privacy</h2>
        <p className="settings__body">
          Peni Pad keeps everything on this device. It has no accounts, no ads, and no tracking, and
          it collects nothing about your child. Worksheets and drawings never leave the tablet
          unless you export them yourself.
        </p>
      </section>
    </main>
  );
}
