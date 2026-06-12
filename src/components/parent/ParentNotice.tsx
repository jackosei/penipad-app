/**
 * A dismissible parent-zone banner for problems that need an adult (failed
 * import, storage trouble). Plain language, one line, no exclamation points.
 */
import type { JSX } from 'react';
import { useUiStore } from '@/store/ui';

export function ParentNotice(): JSX.Element | null {
  const notice = useUiStore((s) => s.parentNotice);
  const setParentNotice = useUiStore((s) => s.setParentNotice);

  if (!notice) return null;

  return (
    <div className="parent-notice" role="status">
      <span className="parent-notice__text">{notice}</span>
      <button
        type="button"
        className="parent-notice__dismiss"
        aria-label="dismiss"
        onClick={() => setParentNotice(null)}
      >
        OK
      </button>
    </div>
  );
}
