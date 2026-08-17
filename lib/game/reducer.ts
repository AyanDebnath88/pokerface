import {
  startHand,
  applyAction,
  getLegalActions,
  type HandState,
  type EngineAction,
  type LegalActions,
} from "@/lib/engine/betting";
import { shuffledDeck } from "@/lib/engine/shuffle";
import { evaluateHand } from "@/lib/engine/evaluator";
import { HAND_CATEGORY_NAMES } from "@/lib/engine/types";
import type { Card } from "@/lib/engine/types";
import { activeBlinds, type GameConfig } from "./config";
import { stripSecret, rehydrate } from "./state";

export interface SeatedPlayer {
  userId: string;
  seatIndex: number;
  stack: number;
}

export interface HoleRow {
  userId: string;
  seatIndex: number;
  cards: Card[];
}

// Structured log events; persistence attaches display names.
export type GameEvent =
  | { kind: "blind"; userId: string; amount: number; blind: "sb" | "bb" }
  | { kind: "deal-hole" }
  | { kind: "action"; userId: string; type: string; amount?: number; street: string }
  | { kind: "board"; street: string; board: Card[]; newCards: Card[] }
  | { kind: "win"; userId: string; amount: number; showdown: boolean; hand?: string }
  | { kind: "uncalled-return"; userId: string; amount: number };

export interface DealResult {
  publicHand: HandState;
  deck: Card[];
  holeCards: HoleRow[];
  events: GameEvent[];
  seatIndexByPlayer: Record<string, number>;
}

export interface ActResult {
  publicHand: HandState;
  deck: Card[];
  events: GameEvent[];
  complete: boolean;
  /** userId -> chips won, when the hand ended. */
  winnings?: Record<string, number>;
  /** userId -> shown hand description, at showdown. */
  shown?: Record<string, string>;
  /** userId -> revealed hole cards, at showdown. */
  shownCards?: Record<string, Card[]>;
  /** The full would-be board when a hand ends early (rabbit hunting). */
  rabbitBoard?: Card[];
  /** Boards used when the hand ran more than once. */
  runs?: { board: Card[] }[];
}

/** Pick the next button seat: first occupied seat strictly after `prev`. */
export function nextButtonSeat(
  seats: SeatedPlayer[],
  prev: number | null,
): number {
  const occupied = seats.map((s) => s.seatIndex).sort((a, b) => a - b);
  if (occupied.length === 0) return 0;
  if (prev === null) return occupied[0];
  for (const s of occupied) if (s > prev) return s;
  return occupied[0];
}

/** Deal a fresh hand. Returns the public hand + secret deck + hole rows. */
export function dealHand(
  config: GameConfig,
  seated: SeatedPlayer[],
  buttonSeat: number,
): DealResult {
  const ordered = [...seated].sort((a, b) => a.seatIndex - b.seatIndex);
  const players = ordered.map((s) => ({ playerId: s.userId, stack: s.stack }));
  const buttonIndex = Math.max(
    0,
    ordered.findIndex((s) => s.seatIndex === buttonSeat),
  );
  const blinds = activeBlinds(config);

  const hand = startHand({
    variant: config.variant,
    players,
    buttonIndex,
    smallBlind: blinds.smallBlind,
    bigBlind: blinds.bigBlind,
    ante: blinds.ante,
    runItTwiceTimes: config.runItTwice === "always" ? 2 : 1,
    deck: shuffledDeck(),
  });

  const seatIndexByPlayer: Record<string, number> = {};
  for (const s of ordered) seatIndexByPlayer[s.userId] = s.seatIndex;

  const holeCards: HoleRow[] = hand.seats.map((s) => ({
    userId: s.playerId,
    seatIndex: seatIndexByPlayer[s.playerId],
    cards: s.holeCards.slice(),
  }));

  // Blind events (heads-up: button is SB).
  const n = hand.seats.length;
  const sbIdx = n === 2 ? buttonIndex : (buttonIndex + 1) % n;
  const bbIdx = n === 2 ? (buttonIndex + 1) % n : (buttonIndex + 2) % n;
  const events: GameEvent[] = [
    { kind: "blind", userId: hand.seats[sbIdx].playerId, amount: blinds.smallBlind, blind: "sb" },
    { kind: "blind", userId: hand.seats[bbIdx].playerId, amount: blinds.bigBlind, blind: "bb" },
    { kind: "deal-hole" },
  ];

  return {
    publicHand: stripSecret(hand),
    deck: hand.deck,
    holeCards,
    events,
    seatIndexByPlayer,
  };
}

/** Legal actions for whoever is to act on the given public hand. */
export function legalFor(publicHand: HandState): LegalActions {
  return getLegalActions(publicHand);
}

export function actingUserId(publicHand: HandState): string | null {
  if (publicHand.status !== "betting" || publicHand.toAct === null) return null;
  return publicHand.seats[publicHand.toAct].playerId;
}

/** Apply a validated action, returning new public state + events. */
export function act(
  config: GameConfig,
  publicHand: HandState,
  deck: Card[],
  holeByPlayer: Record<string, Card[]>,
  actorUserId: string,
  action: EngineAction,
): ActResult {
  const before = rehydrate(publicHand, deck, holeByPlayer);
  const prevBoardLen = before.board.length;
  const prevStreet = before.street;

  const after = applyAction(before, actorUserId, action);

  const events: GameEvent[] = [
    {
      kind: "action",
      userId: actorUserId,
      type: action.type,
      amount: "to" in action ? action.to : undefined,
      street: prevStreet,
    },
  ];

  // Board reveal event(s).
  if (after.board.length > prevBoardLen) {
    events.push({
      kind: "board",
      street: after.street,
      board: after.board.slice(),
      newCards: after.board.slice(prevBoardLen),
    });
  }

  const result: ActResult = {
    publicHand: stripSecret(after),
    deck: after.deck,
    events,
    complete: after.status === "complete",
  };

  if (after.status === "complete" && after.result) {
    const winnings: Record<string, number> = {};
    const shown: Record<string, string> = {};
    for (const [uid, amt] of after.result.winnings) {
      winnings[uid] = amt;
      events.push({
        kind: "win",
        userId: uid,
        amount: amt,
        showdown: after.result.wentToShowdown,
      });
    }
    const shownCards: Record<string, Card[]> = {};
    if (after.result.wentToShowdown) {
      for (const seat of after.seats) {
        if (!seat.folded) {
          const cards = holeByPlayer[seat.playerId] ?? seat.holeCards;
          const hv = evaluateHand(config.variant, cards, after.board);
          shown[seat.playerId] = HAND_CATEGORY_NAMES[hv.category];
          shownCards[seat.playerId] = cards.slice();
        }
      }
    }
    result.winnings = winnings;
    result.shown = shown;
    result.shownCards = shownCards;

    if (after.result.runs && after.result.runs.length > 1) {
      result.runs = after.result.runs;
    }

    // Rabbit hunting: reveal the board that would have come if the hand
    // ended before the river. Purely informational.
    if (config.rabbitHunting && after.board.length < 5 && !result.runs) {
      const need = 5 - after.board.length;
      result.rabbitBoard = [...after.board, ...after.deck.slice(0, need)];
    }
  }

  return result;
}
