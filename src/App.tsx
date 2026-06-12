/**
 * App shell: two-screen routing (shelf, activity) from the UI store, plus
 * the parent notice banner overlay.
 */
import type { JSX } from 'react';
import { useUiStore } from '@/store/ui';
import { Shelf } from '@/components/child/Shelf';
import { ActivityView } from '@/components/child/ActivityView';
import { ParentNotice } from '@/components/parent/ParentNotice';

export function App(): JSX.Element {
  const screen = useUiStore((s) => s.screen);

  return (
    <>
      {screen.name === 'shelf' ? (
        <Shelf />
      ) : (
        <ActivityView key={screen.documentId} documentId={screen.documentId} />
      )}
      <ParentNotice />
    </>
  );
}
