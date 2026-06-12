/**
 * The "Done" affordance (F1.12): a big green button in the tray. Tapping it
 * marks the page complete: it drops one celebration sticker and fires confetti.
 *
 * Bounded by design: at most one sticker per page (idempotent). Repeated taps
 * re-fire the confetti for the joy of it but never spawn a second sticker, so
 * the page can't be flooded. Manual, no correctness logic; that arrives with
 * answer zones in Phase 3.
 */
import { useState, type JSX } from 'react';
import { Check } from 'lucide-react';
import type { InkEngine } from '@/engine';
import { createCelebrationSticker } from '@/utils/sticker-placement';
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
  const [burst, setBurst] = useState(0);

  const celebrate = (): void => {
    // One sticker per page: only place if the page has no celebration yet.
    if (engine.getPageStickers().length === 0) {
      engine.placeSticker(createCelebrationSticker(0));
    }
    if (!prefersReducedMotion()) setBurst((value) => value + 1);
  };

  return (
    <>
      <button type="button" className="done-button" aria-label="done" onClick={celebrate}>
        <Check size={32} aria-hidden />
      </button>
      {burst > 0 && <Confetti key={burst} />}
    </>
  );
}
