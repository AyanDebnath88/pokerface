// View-model types the UI renders. The server projects authoritative game
// state into these (public fields for everyone; hole cards only for the owner).

import type { Card, GameVariant, Street } from "@/lib/engine/types";

export interface SeatView {
  seatIndex: number;
  playerId: string | null; // null = empty seat
  name: string;
  avatarColor?: string;
  stack: number;
  committed: number; // chips in front this street
  holeCards?: Card[]; // present only for the viewer, or at showdown
  cardCount?: number; // number of hole cards when hidden
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  vipTier?: "gold" | "black" | null;
  lastAction?: string;
  won?: number; // chips won this hand (showdown highlight)
  winningHand?: string; // e.g. "Two Pair"
}

export interface TableView {
  code: string;
  variant: GameVariant;
  smallBlind: number;
  bigBlind: number;
  street: Street;
  board: Card[];
  pot: number;
  sidePots?: number[];
  seats: SeatView[];
  activeSeatIndex: number | null; // whose turn
  actingDeadline?: number | null; // epoch ms
  handNumber?: number;
}

export const VARIANT_LABEL: Record<GameVariant, string> = {
  nlhe: "No-Limit Hold'em",
  plo: "Pot-Limit Omaha",
};

export function formatChips(n: number): string {
  return n.toLocaleString("en-US");
}
