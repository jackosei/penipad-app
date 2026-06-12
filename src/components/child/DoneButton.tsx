/**
 * The "Done" affordance (F1.12): the green check in the top bar. Tapping it
 * asks first (icon-only KidConfirm with a star), then celebrates: one sticker
 * drops on the page and confetti fires.
 *
 * Bounded by design: at most one sticker per page (idempotent). Confirmed
 * repeat taps re-fire confetti for the joy of it but never spawn a second
 * sticker. Manual, no correctness logic; that arrives with answer zones in
 * Phase 3.
 */
import { useState, type JSX } from 'react';
import { Check, Star } from 'lucide-react';
import type { InkEngine } from '@/engine';
import { createCelebrationSticker } from '@/utils/sticker-placement';
import { KidConfirm } from './KidConfirm';
import { Confetti } from './Confetti';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export type DoneButtonProps = {
  engine: InkEngine;
};

export function DoneButton({ engine }: DoneButtonProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const [burst, setBurst] = useState(0);

  const celebrate = (): void => {
    setConfirming(false);
    // One sticker per page: only place if the page has no celebration yet.
    if (engine.getPageStickers().length === 0) {
      engine.placeSticker(createCelebrationSticker(0));
    }
    if (!prefersReducedMotion()) setBurst((value) => value + 1);
  };

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
          onConfirm={celebrate}
          onCancel={() => setConfirming(false)}
        />
      )}

      {burst > 0 && <Confetti key={burst} />}
    </>
  );
}
