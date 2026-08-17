import type { Card, Rank, Suit } from "./types";

export const SUITS: Suit[] = ["s", "h", "d", "c"];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const RANK_TO_CHAR: Record<Rank, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

const CHAR_TO_RANK: Record<string, Rank> = Object.fromEntries(
  (Object.entries(RANK_TO_CHAR) as [string, string][]).map(([r, c]) => [
    c,
    Number(r) as Rank,
  ]),
) as Record<string, Rank>;

export const SUIT_SYMBOL: Record<Suit, string> = {
  s: "♠", // ♠
  h: "♥", // ♥
  d: "♦", // ♦
  c: "♣", // ♣
};

export const SUIT_IS_RED: Record<Suit, boolean> = {
  s: false,
  h: true,
  d: true,
  c: false,
};

export function makeCard(rank: Rank, suit: Suit): Card {
  return `${RANK_TO_CHAR[rank]}${suit}`;
}

export function rankOf(card: Card): Rank {
  return CHAR_TO_RANK[card.slice(0, -1)];
}

export function suitOf(card: Card): Suit {
  return card.slice(-1) as Suit;
}

export function rankChar(card: Card): string {
  return card.slice(0, -1);
}

/** A fresh, ordered 52-card deck. */
export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push(makeCard(r, s));
    }
  }
  return deck;
}
