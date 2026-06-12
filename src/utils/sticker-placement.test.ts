import { describe, expect, it } from 'vitest';
import { createCelebrationSticker } from './sticker-placement';
import { isStickerId } from '@/engine';

/** Deterministic RNG so placement is reproducible in tests. */
function fixedRandom(value: number): () => number {
  return () => value;
}

describe('createCelebrationSticker', () => {
  it('produces a valid sticker mark in normalized bounds', () => {
    const sticker = createCelebrationSticker(0, fixedRandom(0.5));
    expect(sticker.kind).toBe('sticker');
    expect(isStickerId(sticker.sticker)).toBe(true);
    expect(sticker.x).toBeGreaterThanOrEqual(0);
    expect(sticker.x).toBeLessThanOrEqual(1);
    expect(sticker.y).toBeGreaterThanOrEqual(0);
    expect(sticker.y).toBeLessThanOrEqual(1);
    expect(sticker.size).toBeGreaterThan(0);
  });

  it('cycles through the four corners as the count grows', () => {
    const corners = [0, 1, 2, 3, 4].map((n) => {
      const s = createCelebrationSticker(n, fixedRandom(0.5));
      return `${s.x.toFixed(2)},${s.y.toFixed(2)}`;
    });
    // Corner 4 wraps back to corner 0.
    expect(corners[4]).toBe(corners[0]);
    expect(new Set(corners.slice(0, 4)).size).toBe(4);
  });

  it('keeps jittered positions inside the page', () => {
    for (const r of [0, 0.999]) {
      const s = createCelebrationSticker(0, fixedRandom(r));
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1);
    }
  });
});
