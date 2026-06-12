/**
 * Sticker registry and guards for the PageMark union. Framework-agnostic:
 * stickers are persisted marks; their visuals live in the React layer.
 */
import type { PageMark, Sticker, StickerId, Stroke } from '@/types/ink';

/** Every sticker id. Source of truth for iteration and validation. */
export const STICKER_IDS = [
  'star',
  'heart',
  'smile',
  'thumb',
  'flower',
  'rainbow',
] as const satisfies readonly StickerId[];

/** Type guard for untrusted input (e.g. a value read back from IndexedDB). */
export function isStickerId(value: unknown): value is StickerId {
  return typeof value === 'string' && (STICKER_IDS as readonly string[]).includes(value);
}

/** Narrow a page mark to a sticker. */
export function isSticker(mark: PageMark): mark is Sticker {
  return mark.kind === 'sticker';
}

/** Narrow a page mark to a stroke (anything that is not a sticker). */
export function isStroke(mark: PageMark): mark is Stroke {
  return mark.kind !== 'sticker';
}
