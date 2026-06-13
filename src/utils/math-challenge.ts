/**
 * The maths-challenge half of the parental gate (Phase 1, UI-only barrier).
 * A single-digit addition: trivial for an adult, unsolvable for a 3-8 year old
 * who cannot yet read the prompt or add. Pure and seedable so the gate flow is
 * deterministically testable.
 *
 * This is a UX barrier, not a security boundary (real security is auth + RLS
 * from Phase 2). It only needs to stop a child, not a determined adult.
 */

export type MathChallenge = {
  a: number;
  b: number;
  answer: number;
  /** The answer plus distractors, shuffled. The child taps one. */
  options: number[];
};

const MIN_OPERAND = 2;
const OPERAND_SPREAD = 8; // operands land in [2, 9]
const OPTION_COUNT = 4;

function randomInt(random: () => number, min: number, spread: number): number {
  return min + Math.floor(random() * spread);
}

/** Build the option set: the answer plus nearby distinct distractors. */
function buildOptions(answer: number, random: () => number): number[] {
  const options = new Set<number>([answer]);
  while (options.size < OPTION_COUNT) {
    const delta = randomInt(random, 1, 5) * (random() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate > 0) options.add(candidate);
  }
  return shuffle([...options], random);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i];
    const b = result[j];
    if (a !== undefined && b !== undefined) {
      result[i] = b;
      result[j] = a;
    }
  }
  return result;
}

export function makeMathChallenge(random: () => number = Math.random): MathChallenge {
  const a = randomInt(random, MIN_OPERAND, OPERAND_SPREAD);
  const b = randomInt(random, MIN_OPERAND, OPERAND_SPREAD);
  const answer = a + b;
  return { a, b, answer, options: buildOptions(answer, random) };
}
