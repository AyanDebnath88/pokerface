import type { HandState } from "@/lib/engine/betting";
import type { Card } from "@/lib/engine/types";

// Stored authoritative game state. The PUBLIC copy (games.state) never carries
// the deck or hole cards; those live in game_secrets / hand_hole_cards.

export interface StoredGameState {
  status: "lobby" | "running" | "paused" | "ended";
  handNo: number;
  buttonSeat: number | null;
  /** Engine hand with deck + hole cards stripped out. Null between hands. */
  hand: HandState | null;
  /** playerId (user id) -> table seat_index, for the current hand. */
  seatIndexByPlayer: Record<string, number>;
}

/** Return a copy of a hand with all secret fields blanked (for public store). */
export function stripSecret(hand: HandState): HandState {
  return {
    ...hand,
    deck: [],
    seats: hand.seats.map((s) => ({ ...s, holeCards: [] })),
    result: hand.result,
  };
}

/** Rebuild a full engine hand from its public copy + secret deck + hole cards. */
export function rehydrate(
  publicHand: HandState,
  deck: Card[],
  holeByPlayer: Record<string, Card[]>,
): HandState {
  return {
    ...publicHand,
    deck: deck.slice(),
    seats: publicHand.seats.map((s) => ({
      ...s,
      holeCards: (holeByPlayer[s.playerId] ?? []).slice(),
    })),
    result: undefined,
  };
}
