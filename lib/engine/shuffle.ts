import type { Card } from "./types";
import { freshDeck } from "./cards";

/**
 * Cryptographically-seeded Fisher-Yates shuffle.
 *
 * Uses Web Crypto (available in Node 18+, Edge, and browsers) to draw
 * unbiased random integers via rejection sampling, so the shuffle is not
 * predictable and every permutation is equally likely.
 */
export function shuffle<T>(input: readonly T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Returns a fresh, cryptographically shuffled 52-card deck. */
export function shuffledDeck(): Card[] {
  return shuffle(freshDeck());
}

/** Unbiased random integer in [0, max) using rejection sampling. */
function randomInt(max: number): number {
  if (max <= 0) throw new Error("max must be > 0");
  if (max === 1) return 0;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}
