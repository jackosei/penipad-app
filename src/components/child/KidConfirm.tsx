/**
 * Child-zone confirmation: icon-only, no text (pre-reader rule). A card shows
 * a large picture of what is about to happen and two big buttons: a green
 * check (yes) and a red X (no). Tapping the backdrop also cancels, and the
 * destructive/affirming action is never the easiest tap (X comes first).
 *
 * Used to confirm wiping a page clean (F1.4 "clear page with confirm") and
 * finishing a page (Done), both of which a stray tap should not trigger.
 */
import type { JSX, ReactNode } from 'react';
import { Check, X } from 'lucide-react';

export type KidConfirmProps = {
  /** Large pictogram of the action being confirmed (e.g. the wipe brush). */
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
        <div className="kid-confirm__subject" aria-hidden>
          {subject}
        </div>
        <div className="kid-confirm__choices">
          <button type="button" className="kid-confirm__no" aria-label="no" onClick={onCancel}>
            <X size={34} aria-hidden />
          </button>
          <button type="button" className="kid-confirm__yes" aria-label="yes" onClick={onConfirm}>
            <Check size={34} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
