import type { Card, Rank } from "./types";
import { HandCategory, type HandValue } from "./types";
import { rankOf, suitOf } from "./cards";

/**
 * Evaluate exactly five cards into a comparable HandValue.
 * Higher `score` wins; equal `score` is a tie (chop).
 */
export function evaluate5(cards: Card[]): HandValue {
  if (cards.length !== 5) {
    throw new Error(`evaluate5 needs exactly 5 cards, got ${cards.length}`);
  }

  const ranks = cards.map(rankOf).sort((a, b) => b - a) as Rank[];
  const suits = cards.map(suitOf);

  const isFlush = suits.every((s) => s === suits[0]);
  const straightHigh = straightHighCard(ranks);

  // Count occurrences per rank.
  const counts = new Map<Rank, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Sort by (count desc, rank desc) so pairs/trips lead.
  const grouped = [...counts.entries()].sort((a, b) =>
    b[1] - a[1] !== 0 ? b[1] - a[1] : b[0] - a[0],
  );
  const pattern = grouped.map((g) => g[1]).join(""); // e.g. "32", "221", "11111"
  const byGroup = grouped.map((g) => g[0]) as Rank[];

  let category: HandCategory;
  let tiebreakers: Rank[];

  if (isFlush && straightHigh) {
    category = HandCategory.StraightFlush;
    tiebreakers = [straightHigh];
  } else if (pattern === "41") {
    category = HandCategory.FourOfAKind;
    tiebreakers = byGroup; // [quad, kicker]
  } else if (pattern === "32") {
    category = HandCategory.FullHouse;
    tiebreakers = byGroup; // [trips, pair]
  } else if (isFlush) {
    category = HandCategory.Flush;
    tiebreakers = ranks; // 5 desc
  } else if (straightHigh) {
    category = HandCategory.Straight;
    tiebreakers = [straightHigh];
  } else if (pattern === "311") {
    category = HandCategory.ThreeOfAKind;
    tiebreakers = byGroup; // [trips, k, k]
  } else if (pattern === "221") {
    category = HandCategory.TwoPair;
    tiebreakers = byGroup; // [highPair, lowPair, kicker]
  } else if (pattern === "2111") {
    category = HandCategory.Pair;
    tiebreakers = byGroup; // [pair, k, k, k]
  } else {
    category = HandCategory.HighCard;
    tiebreakers = ranks; // 5 desc
  }

  return {
    category,
    tiebreakers,
    score: computeScore(category, tiebreakers),
    cards: cards.slice(),
  };
}

/**
 * Highest card of a straight, or 0 if the five ranks are not a straight.
 * Handles the wheel (A-2-3-4-5) as a 5-high straight.
 */
function straightHighCard(ranksDesc: Rank[]): 0 | Rank {
  const uniq = [...new Set(ranksDesc)];
  if (uniq.length !== 5) return 0;
  // Normal straight: consecutive descending.
  if (uniq[0] - uniq[4] === 4) return uniq[0];
  // Wheel: A,5,4,3,2 -> treat as 5-high.
  if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) return 5 as Rank;
  return 0;
}

/** Pack category + up to 5 tiebreakers into one comparable integer. */
function computeScore(category: HandCategory, tiebreakers: Rank[]): number {
  let score = category;
  for (let i = 0; i < 5; i++) {
    score = score * 16 + (tiebreakers[i] ?? 0);
  }
  return score;
}

/** Every k-sized combination of the input array. */
export function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];
  const recurse = (start: number) => {
    if (combo.length === k) {
      result.push(combo.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      recurse(i + 1);
      combo.pop();
    }
  };
  recurse(0);
  return result;
}

/** Best 5-card hand from 7 cards (Texas Hold'em). */
export function bestOfSeven(cards: Card[]): HandValue {
  let best: HandValue | null = null;
  for (const five of combinations(cards, 5)) {
    const hv = evaluate5(five);
    if (!best || hv.score > best.score) best = hv;
  }
  return best!;
}

/**
 * Best 5-card hand using EXACTLY two hole cards and three board cards
 * (Omaha rule). `hole` has 4 cards, `board` has up to 5.
 */
export function bestOmaha(hole: Card[], board: Card[]): HandValue {
  let best: HandValue | null = null;
  for (const twoHole of combinations(hole, 2)) {
    for (const threeBoard of combinations(board, 3)) {
      const hv = evaluate5([...twoHole, ...threeBoard]);
      if (!best || hv.score > best.score) best = hv;
    }
  }
  return best!;
}

/**
 * Evaluate a player's best hand given the variant, their hole cards, and
 * the community board.
 */
export function evaluateHand(
  variant: "nlhe" | "plo",
  hole: Card[],
  board: Card[],
): HandValue {
  if (variant === "plo") return bestOmaha(hole, board);
  return bestOfSeven([...hole, ...board]);
}
