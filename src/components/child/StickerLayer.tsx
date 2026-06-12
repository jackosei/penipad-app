/**
 * Overlay that draws placed stickers on top of the canvas stack. Stickers live
 * in the DOM (crisp at any scale) rather than on the ink canvas; the layer is
 * pointer-transparent so drawing on the canvas beneath is unaffected.
 */
import type { JSX } from 'react';
import type { InkEngine } from '@/engine';
import { usePageStickers } from '@/hooks/use-page-stickers';
import { StickerArt } from '@/components/shared/stickers';

export type StickerLayerProps = {
  engine: InkEngine;
  page: number;
};

export function StickerLayer({ engine, page }: StickerLayerProps): JSX.Element {
  const stickers = usePageStickers(engine, page);

  return (
    <div className="sticker-layer" aria-hidden>
      {stickers.map((sticker, index) => (
        <span
          key={`${sticker.sticker}-${sticker.x.toFixed(3)}-${sticker.y.toFixed(3)}-${index}`}
          className="sticker-layer__item"
          style={{
            left: `${sticker.x * 100}%`,
            top: `${sticker.y * 100}%`,
            width: `${sticker.size * 100}%`,
            transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
          }}
        >
          <StickerArt id={sticker.sticker} className="sticker-layer__art" />
        </span>
      ))}
    </div>
  );
}
