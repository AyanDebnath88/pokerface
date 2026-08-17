// Core poker types shared by the engine and the UI.

export type Suit = "s" | "h" | "d" | "c";

/** Rank as a number: 2-10 face value, J=11, Q=12, K=13, A=14. */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

/** A card is encoded as a two/three char code, e.g. "As", "Td", "9c". */
export type Card = string;

export type GameVariant = "nlhe" | "plo";

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type ActionType =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "all-in";

export interface PlayerAction {
  type: ActionType;
  /** Total chips the player is putting in on THIS action (the delta), for bet/raise/call. */
  amount?: number;
}

/** Ranking category of a made 5-card hand, higher is better. */
export enum HandCategory {
  HighCard = 1,
  Pair,
  TwoPair,
  ThreeOfAKind,
  Straight,
  Flush,
  FullHouse,
  FourOfAKind,
  StraightFlush,
}

export const HAND_CATEGORY_NAMES: Record<HandCategory, string> = {
  [HandCategory.HighCard]: "High Card",
  [HandCategory.Pair]: "Pair",
  [HandCategory.TwoPair]: "Two Pair",
  [HandCategory.ThreeOfAKind]: "Three of a Kind",
  [HandCategory.Straight]: "Straight",
  [HandCategory.Flush]: "Flush",
  [HandCategory.FullHouse]: "Full House",
  [HandCategory.FourOfAKind]: "Four of a Kind",
  [HandCategory.StraightFlush]: "Straight Flush",
};

/**
 * A fully evaluated hand. `score` is a single comparable number:
 * higher beats lower, equal is a tie (chop). `tiebreakers` are the
 * ordered rank values used to build the score, kept for display/debug.
 */
export interface HandValue {
  category: HandCategory;
  tiebreakers: Rank[];
  score: number;
  /** The 5 cards that make the best hand. */
  cards: Card[];
}
