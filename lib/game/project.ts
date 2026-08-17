import type { StoredGameState } from "./state";
import type { GameConfig } from "./config";
import { activeBlinds } from "./config";
import type { SeatView, TableView } from "./view";
import type { SeatState } from "@/lib/engine/betting";
import type { Card } from "@/lib/engine/types";

export interface PlayerRow {
  user_id: string;
  seat_index: number | null;
  name: string;
  avatar_color: string | null;
  stack: number;
  status: string;
  is_host: boolean;
  vip_tier?: string | null;
  buy_in_total?: number;
  buy_out_total?: number;
}

/**
 * Build the render-ready TableView from authoritative public state + player
 * rows. During a hand, per-seat figures come from the hand snapshot; between
 * hands they come from game_players. Hole cards are filled only for the viewer
 * (from their own RLS-protected row) or for everyone at showdown.
 */
export function projectTable(
  code: string,
  config: GameConfig,
  state: StoredGameState,
  players: PlayerRow[],
  opts: {
    viewerId?: string;
    myHoleCards?: Card[];
    shown?: Record<string, Card[]>;
    winnings?: Record<string, number>;
    shownDesc?: Record<string, string>;
  } = {},
): TableView {
  const blinds = activeBlinds(config);
  const hand = state.hand;
  const bySeat = new Map<number, PlayerRow>();
  for (const p of players)
    if (p.seat_index !== null) bySeat.set(p.seat_index, p);

  // Engine seat lookup by userId for the live hand.
  const handSeatByUser = new Map<string, SeatState>();
  if (hand) for (const s of hand.seats) handSeatByUser.set(s.playerId, s);

  const n = hand ? hand.seats.length : 0;
  const sbUser =
    hand && n === 2 ? hand.seats[hand.buttonIndex]?.playerId : undefined;

  const seats: SeatView[] = [];
  for (let i = 0; i < config.maxSeats; i++) {
    const p = bySeat.get(i);
    if (!p) {
      seats.push(emptySeat(i));
      continue;
    }
    const hs = handSeatByUser.get(p.user_id);
    const isButton = hand ? hand.seats[hand.buttonIndex]?.playerId === p.user_id : false;

    let holeCards: Card[] | undefined;
    let cardCount: number | undefined;
    if (hs) {
      cardCount = config.variant === "plo" ? 4 : 2;
      if (opts.viewerId === p.user_id && opts.myHoleCards)
        holeCards = opts.myHoleCards;
      else if (opts.shown && opts.shown[p.user_id])
        holeCards = opts.shown[p.user_id];
    }

    seats.push({
      seatIndex: i,
      playerId: p.user_id,
      name: p.name,
      avatarColor: p.avatar_color ?? "#e6c65c",
      stack: hs ? hs.stack : p.stack,
      committed: hs ? hs.committed : 0,
      holeCards,
      cardCount: holeCards ? undefined : hs && !hs.folded ? cardCount : hs ? cardCount : 0,
      folded: hs ? hs.folded : false,
      allIn: hs ? hs.allIn : false,
      sittingOut: p.status === "sitting_out" || p.status === "away",
      isDealer: isButton,
      isSmallBlind: sbUser ? sbUser === p.user_id : false,
      isBigBlind: false,
      vipTier: (p.vip_tier as SeatView["vipTier"]) ?? null,
      won: opts.winnings?.[p.user_id],
      winningHand: opts.shownDesc?.[p.user_id],
    });
  }

  const pot = hand
    ? hand.seats.reduce((sum, s) => sum + s.totalCommitted, 0)
    : 0;

  const activeSeatIndex =
    hand && hand.status === "betting" && hand.toAct !== null
      ? state.seatIndexByPlayer[hand.seats[hand.toAct].playerId] ?? null
      : null;

  return {
    code,
    variant: config.variant,
    smallBlind: blinds.smallBlind,
    bigBlind: blinds.bigBlind,
    street: hand ? hand.street : "preflop",
    board: hand ? hand.board : [],
    pot,
    seats,
    activeSeatIndex,
    handNumber: state.handNo,
  };
}

function emptySeat(i: number): SeatView {
  return {
    seatIndex: i,
    playerId: null,
    name: "",
    stack: 0,
    committed: 0,
    folded: false,
    allIn: false,
    sittingOut: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
  };
}
