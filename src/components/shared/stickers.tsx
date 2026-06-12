/**
 * Sticker artwork: one bright, filled SVG per StickerId, plus a star icon for
 * the Done button. Stickers are decorative (aria-hidden); they carry meaning
 * by sight, not by label, so a pre-reader recognizes them.
 */
import type { JSX } from 'react';
import type { StickerId } from '@/types/ink';

type StickerArtProps = { className?: string | undefined };

function StarArt({ className }: StickerArtProps): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path
        d="M24 3l5.6 11.9 13 1.9-9.4 9.2 2.2 13L24 38.8 12.6 40l2.2-13L5.4 16.8l13-1.9z"
        fill="#FFC92A"
        stroke="#E0A800"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartArt({ className }: StickerArtProps): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path
        d="M24 42S5 30 5 17.5A9.5 9.5 0 0 1 24 13a9.5 9.5 0 0 1 19 4.5C43 30 24 42 24 42z"
        fill="#FF6B9D"
        stroke="#E14B7E"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmileArt({ className }: StickerArtProps): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <circle cx="24" cy="24" r="20" fill="#FFC92A" stroke="#E0A800" strokeWidth="2" />
      <circle cx="17" cy="20" r="2.6" fill="#3A4356" />
      <circle cx="31" cy="20" r="2.6" fill="#3A4356" />
      <path
        d="M15 28a9 9 0 0 0 18 0"
        fill="none"
        stroke="#3A4356"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThumbArt({ className }: StickerArtProps): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <path
        d="M14 21h-4a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h4zM14 21l7-13a4 4 0 0 1 4 2v8h11a3 3 0 0 1 3 3.4l-2 12a3 3 0 0 1-3 2.6H14z"
        fill="#2ED573"
        stroke="#1FAE5B"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlowerArt({ className }: StickerArtProps): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <g fill="#A55EEA">
        <circle cx="24" cy="10" r="7" />
        <circle cx="24" cy="38" r="7" />
        <circle cx="10" cy="24" r="7" />
        <circle cx="38" cy="24" r="7" />
      </g>
      <circle cx="24" cy="24" r="8" fill="#FFC92A" stroke="#E0A800" strokeWidth="2" />
    </svg>
  );
}

function RainbowArt({ className }: StickerArtProps): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden focusable="false">
      <g fill="none" strokeLinecap="round">
        <path d="M6 38a18 18 0 0 1 36 0" stroke="#FF4757" strokeWidth="4" />
        <path d="M11 38a13 13 0 0 1 26 0" stroke="#FFA502" strokeWidth="4" />
        <path d="M16 38a8 8 0 0 1 16 0" stroke="#2ED573" strokeWidth="4" />
      </g>
    </svg>
  );
}

const STICKER_ART: Record<StickerId, (props: StickerArtProps) => JSX.Element> = {
  star: StarArt,
  heart: HeartArt,
  smile: SmileArt,
  thumb: ThumbArt,
  flower: FlowerArt,
  rainbow: RainbowArt,
};

export function StickerArt({
  id,
  className,
}: {
  id: StickerId;
  className?: string | undefined;
}): JSX.Element {
  const Art = STICKER_ART[id];
  return <Art className={className} />;
}

/** The Done button glyph: a single bold star. */
export function DoneStar({ size = 34 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        d="M24 3l5.6 11.9 13 1.9-9.4 9.2 2.2 13L24 38.8 12.6 40l2.2-13L5.4 16.8l13-1.9z"
        fill="currentColor"
      />
    </svg>
  );
}
