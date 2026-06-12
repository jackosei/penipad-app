/**
 * Reactive undo/redo availability for the active page. Subscribes to engine
 * commits/undo/redo/clear/load so the top-bar buttons enable and disable
 * correctly. Off the pointer-to-paint path: fires on discrete history events,
 * never per pointer move.
 */
import { useEffect, useState } from 'react';
import type { InkEngine } from '@/engine';

export type HistoryState = { canUndo: boolean; canRedo: boolean };

export function useHistoryState(engine: InkEngine, page: number): HistoryState {
  const [state, setState] = useState<HistoryState>(() => ({
    canUndo: engine.canUndo(page),
    canRedo: engine.canRedo(page),
  }));

  useEffect(() => {
    const update = (): void =>
      setState({ canUndo: engine.canUndo(page), canRedo: engine.canRedo(page) });
    update();
    return engine.onChange(update);
  }, [engine, page]);

  return state;
}
