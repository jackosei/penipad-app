/**
 * Subscribe a component to the stickers on a page. Re-reads from the engine on
 * every committed-state change. Off the pointer-to-paint path: it fires on
 * discrete commits (a sticker placed, a stroke committed, undo), never per
 * pointer move.
 */
import { useEffect, useState } from 'react';
import type { InkEngine } from '@/engine';
import type { Sticker } from '@/types/ink';

export function usePageStickers(engine: InkEngine, page: number): readonly Sticker[] {
  const [stickers, setStickers] = useState<readonly Sticker[]>(() => engine.getPageStickers(page));

  useEffect(() => {
    const update = (): void => setStickers(engine.getPageStickers(page));
    update();
    return engine.onChange(update);
  }, [engine, page]);

  return stickers;
}
