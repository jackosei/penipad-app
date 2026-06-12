/**
 * Sponge: wipe the page clean and start over (F1.4 "clear page with confirm").
 * Destroys visible work, so it always asks first via the icon-only KidConfirm;
 * the engine clear is mirrored to persistence by autosave. Undo cannot bring a
 * wiped page back (the redo/undo history clears with it), which is exactly why
 * the confirm exists.
 */
import { useState, type JSX } from 'react';
import { BrushCleaning } from 'lucide-react';
import type { InkEngine } from '@/engine';
import { KidConfirm } from './KidConfirm';

export type WipeButtonProps = {
  engine: InkEngine;
};

export function WipeButton({ engine }: WipeButtonProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);

  const wipe = (): void => {
    setConfirming(false);
    engine.clearPage();
  };

  return (
    <>
      <button
        type="button"
        className="tool-button"
        aria-label="wipe page"
        onClick={() => setConfirming(true)}
      >
        <BrushCleaning size={28} aria-hidden />
      </button>

      {confirming && (
        <KidConfirm
          label="wipe this page clean?"
          subject={<BrushCleaning size={64} aria-hidden />}
          onConfirm={wipe}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
