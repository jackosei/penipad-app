/**
 * Top-bar undo/redo pair. Icon-only, 56px+ targets. Buttons disable when there
 * is nothing to undo or redo, so a child gets clear feedback. Operates on the
 * active page via the engine; reactive availability comes from useHistoryState.
 */
import type { JSX } from 'react';
import { Redo2, Undo2 } from 'lucide-react';
import type { InkEngine } from '@/engine';
import { useHistoryState } from '@/hooks/use-history-state';

export type HistoryControlsProps = {
  engine: InkEngine;
  page: number;
};

export function HistoryControls({ engine, page }: HistoryControlsProps): JSX.Element {
  const { canUndo, canRedo } = useHistoryState(engine, page);

  return (
    <>
      <button
        type="button"
        className="top-button"
        aria-label="undo"
        disabled={!canUndo}
        onClick={() => engine.undo()}
      >
        <Undo2 size={26} aria-hidden />
      </button>
      <button
        type="button"
        className="top-button"
        aria-label="redo"
        disabled={!canRedo}
        onClick={() => engine.redo()}
      >
        <Redo2 size={26} aria-hidden />
      </button>
    </>
  );
}
