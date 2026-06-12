/**
 * Where a celebration sticker lands (F1.12). Pure function so it is testable
 * and deterministic under an injected RNG. Stickers cycle through the four
 * page corners with a little jitter and tilt, so repeated "Done" taps fan out
 * instead of stacking exactly.
 */
import { clamp01, STICKER_IDS } from '@/engine';
import type { Sticker, StickerId } from '@/types/ink';

const CORNERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.86, y: 0.14 },
  { x: 0.14, y: 0.14 },
  { x: 0.86, y: 0.86 },
  { x: 0.14, y: 0.86 },
];

const STICKER_SIZE = 0.16;
const JITTER = 0.06;
const MAX_TILT = 24;

export function createCelebrationSticker(
  existingCount: number,
  random: () => number = Math.random,
): Sticker {
  const corner = CORNERS[existingCount % CORNERS.length] ?? { x: 0.5, y: 0.5 };
  const id: StickerId = STICKER_IDS[Math.floor(random() * STICKER_IDS.length)] ?? 'star';
  const jitter = (n: number): number => clamp01(n + (random() - 0.5) * JITTER);
  return {
    kind: 'sticker',
    sticker: id,
    x: jitter(corner.x),
    y: jitter(corner.y),
    size: STICKER_SIZE,
    rotation: (random() - 0.5) * 2 * MAX_TILT,
  };
}
