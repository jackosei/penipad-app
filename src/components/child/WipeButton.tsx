/**
 * Wipe the page clean and start over (F1.4 "clear page with confirm"). The
 * trash can is the one glyph children reliably read as "throw away". Destroys
 * visible work, so it always asks first via the icon-only KidConfirm; the
 * engine clear is mirrored to persistence by autosave. Undo cannot bring a
 * wiped page back (the redo/undo history clears with it), which is exactly
 * why the confirm exists.
 */
import { useState, type JSX } from 'react';
import { Trash2 } from 'lucide-react';
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
        className="top-button"
        aria-label="wipe page"
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={26} aria-hidden />
      </button>

      {confirming && (
        <KidConfirm
          label="wipe this page clean?"
          subject={<Trash2 size={64} aria-hidden />}
          onConfirm={wipe}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
