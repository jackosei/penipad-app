import { describe, expect, it } from 'vitest';
import { makeMathChallenge } from './math-challenge';

/** Deterministic RNG so the challenge shape is asserted without flakiness. */
function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe('makeMathChallenge', () => {
  it('produces a correct single-digit addition', () => {
    for (let seed = 1; seed < 200; seed++) {
      const c = makeMathChallenge(seededRandom(seed));
      expect(c.a + c.b).toBe(c.answer);
      expect(c.a).toBeGreaterThanOrEqual(2);
      expect(c.a).toBeLessThanOrEqual(9);
      expect(c.b).toBeGreaterThanOrEqual(2);
      expect(c.b).toBeLessThanOrEqual(9);
    }
  });

  it('offers four distinct positive options that include the answer', () => {
    for (let seed = 1; seed < 200; seed++) {
      const c = makeMathChallenge(seededRandom(seed));
      expect(c.options).toHaveLength(4);
      expect(new Set(c.options).size).toBe(4);
      expect(c.options).toContain(c.answer);
      for (const option of c.options) {
        expect(option).toBeGreaterThan(0);
      }
    }
  });
});
