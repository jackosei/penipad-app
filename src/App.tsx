/**
 * App shell: screen routing (shelf, settings, activity) from the UI store, the
 * single parental gate, and the parent notice banner overlay.
 */
import type { JSX } from 'react';
import { useUiStore } from '@/store/ui';
import { Shelf } from '@/components/child/Shelf';
import { ActivityView } from '@/components/child/ActivityView';
import { Settings } from '@/components/parent/Settings';
import { ParentGate } from '@/components/parent/ParentGate';
import { ParentNotice } from '@/components/parent/ParentNotice';

function CurrentScreen(): JSX.Element {
  const screen = useUiStore((s) => s.screen);
  switch (screen.name) {
    case 'shelf':
      return <Shelf />;
    case 'settings':
      return <Settings />;
    case 'activity':
      return <ActivityView key={screen.documentId} documentId={screen.documentId} />;
  }
}

export function App(): JSX.Element {
  const gate = useUiStore((s) => s.gate);
  const closeGate = useUiStore((s) => s.closeGate);

  return (
    <>
      <CurrentScreen />
      {gate && (
        <ParentGate
          label={gate.label}
          onUnlock={() => {
            const { onPass } = gate;
            closeGate();
            onPass();
          }}
          onDismiss={closeGate}
        />
      )}
      <ParentNotice />
    </>
  );
}
