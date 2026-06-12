/**
 * Child-zone confirmation, icon-only and pre-reader safe.
 *
 * Field-tested design: symmetrical yes/no buttons confuse young children, who
 * read symbols as actions (a red X next to a sponge reads as "X erases my
 * work"). So the choice is asymmetric, the pattern used across well-tested
 * kids' apps: one BIG green button that pictures the action itself ("tap the
 * picture to make it happen"), and a small, muted X in the card corner that
 * reads as "close this popup", not as an action.
 */
import type { JSX, ReactNode } from 'react';
import { X } from 'lucide-react';

export type KidConfirmProps = {
  /** Pictogram of the action, rendered inside the big confirm button. */
  subject: ReactNode;
  /** Accessible name for the dialog (not rendered as visible text). */
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function KidConfirm({ subject, label, onConfirm, onCancel }: KidConfirmProps): JSX.Element {
  return (
    <div className="kid-confirm" role="dialog" aria-modal="true" aria-label={label}>
      <div className="kid-confirm__backdrop" aria-hidden onClick={onCancel} />
      <div className="kid-confirm__card">
        <button type="button" className="kid-confirm__dismiss" aria-label="no" onClick={onCancel}>
          <X size={24} aria-hidden />
        </button>
        <button type="button" className="kid-confirm__action" aria-label="yes" onClick={onConfirm}>
          {subject}
        </button>
      </div>
    </div>
  );
}
