/**
 * The "Done" affordance (F1.12): the green check in the top bar. Tapping it
 * asks first (icon-only KidConfirm with a star); confirming hands off to the
 * drawing screen, which runs the celebration (sticker + CompletionCard). The
 * button itself owns only the confirm step.
 */
import { useState, type JSX } from 'react';
import { Check, Star } from 'lucide-react';
import { KidConfirm } from './KidConfirm';

export type DoneButtonProps = {
  onConfirm: () => void;
};

export function DoneButton({ onConfirm }: DoneButtonProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        className="top-button top-button--done"
        aria-label="done"
        onClick={() => setConfirming(true)}
      >
        <Check size={26} aria-hidden />
      </button>

      {confirming && (
        <KidConfirm
          label="finished with this page?"
          subject={<Star size={64} aria-hidden fill="#FFC92A" color="#E0A800" />}
          onConfirm={() => {
            setConfirming(false);
            onConfirm();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
