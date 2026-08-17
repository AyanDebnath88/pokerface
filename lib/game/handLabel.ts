import { evaluateHand } from "@/lib/engine/evaluator";
import { HandCategory, type Rank } from "@/lib/engine/types";
import type { Card, GameVariant } from "@/lib/engine/types";

const RANK_LABEL: Record<number, string> = {
  14: "A", 13: "K", 12: "Q", 11: "J", 10: "10",
  9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2",
};

const r = (x: Rank) => RANK_LABEL[x] ?? String(x);

/**
 * A PokerNow-style label of the viewer's current best hand, e.g.
 * "Two Pair (8,5)", "Pair (K)", "Flush (A)". Returns null before the flop or
 * when the player has no hole cards.
 */
export function describeHand(
  variant: GameVariant,
  hole: Card[] | undefined,
  board: Card[],
): string | null {
  if (!hole || hole.length === 0 || board.length < 3) return null;

  const hv = evaluateHand(variant, hole, board);
  const t = hv.tiebreakers;

  switch (hv.category) {
    case HandCategory.StraightFlush:
      return `Straight Flush (${r(t[0])})`;
    case HandCategory.FourOfAKind:
      return `Quads (${r(t[0])})`;
    case HandCategory.FullHouse:
      return `Full House (${r(t[0])},${r(t[1])})`;
    case HandCategory.Flush:
      return `Flush (${r(t[0])})`;
    case HandCategory.Straight:
      return `Straight (${r(t[0])})`;
    case HandCategory.ThreeOfAKind:
      return `Trips (${r(t[0])})`;
    case HandCategory.TwoPair:
      return `Two Pair (${r(t[0])},${r(t[1])})`;
    case HandCategory.Pair:
      return `Pair (${r(t[0])})`;
    default:
      return `High Card (${r(t[0])})`;
  }
}
