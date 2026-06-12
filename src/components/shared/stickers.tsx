/**
 * Sticker artwork, rendered as a colored badge with a white Lucide glyph.
 * The badge form gives every sticker a consistent, crisp, high-quality look
 * regardless of the underlying glyph. Decorative (aria-hidden): a pre-reader
 * recognizes them by sight, not label.
 */
import type { JSX } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Flower2, Heart, Rainbow, Smile, Star, ThumbsUp } from 'lucide-react';
import type { StickerId } from '@/types/ink';

type Badge = { Icon: LucideIcon; bg: string; fg: string };

const STICKER_BADGES: Record<StickerId, Badge> = {
  star: { Icon: Star, bg: '#FFC92A', fg: '#3A4356' },
  heart: { Icon: Heart, bg: '#FF6B9D', fg: '#ffffff' },
  smile: { Icon: Smile, bg: '#FFA502', fg: '#ffffff' },
  thumb: { Icon: ThumbsUp, bg: '#2ED573', fg: '#ffffff' },
  flower: { Icon: Flower2, bg: '#A55EEA', fg: '#ffffff' },
  rainbow: { Icon: Rainbow, bg: '#1E90FF', fg: '#ffffff' },
};

export function StickerArt({
  id,
  className,
}: {
  id: StickerId;
  className?: string | undefined;
}): JSX.Element {
  const { Icon, bg, fg } = STICKER_BADGES[id];
  return (
    <span
      className={`sticker-badge${className ? ` ${className}` : ''}`}
      style={{ backgroundColor: bg }}
    >
      <Icon className="sticker-badge__glyph" color={fg} fill={fg === '#ffffff' ? 'none' : fg} />
    </span>
  );
}
