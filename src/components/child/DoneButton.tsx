/**
 * The "Done!" affordance (F1.12): a big star the child taps to celebrate.
 * Places a sticker on the page (persisted via autosave) and fires a confetti
 * burst. Icon-only, 56px+ target. Manual, no correctness logic; that arrives
 * with answer zones in Phase 3.
 */
import { useState, type JSX } from 'react';
import type { InkEngine } from '@/engine';
import { createCelebrationSticker } from '@/utils/sticker-placement';
import { DoneStar } from '@/components/shared/stickers';
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
    engine.placeSticker(createCelebrationSticker(engine.getPageStickers().length));
    if (!prefersReducedMotion()) setBurst((value) => value + 1);
  };

  return (
    <>
      <button type="button" className="done-button" aria-label="done" onClick={celebrate}>
        <DoneStar />
      </button>
      {burst > 0 && <Confetti key={burst} />}
    </>
  );
}
