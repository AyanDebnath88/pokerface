import type { Card, GameVariant, Street } from "./types";
import { type Pot, buildSidePots, awardPots, type Contribution } from "./pots";
import { evaluateHand } from "./evaluator";
import { shuffledDeck } from "./shuffle";

export interface SeatState {
  playerId: string;
  stack: number; // chips behind
  committed: number; // chips in for the current street
  totalCommitted: number; // chips in for the whole hand
  holeCards: Card[];
  folded: boolean;
  allIn: boolean;
  hasActed: boolean; // acted since the last bet/raise this street
}

export interface HandConfig {
  variant: GameVariant;
  /** Players in seat order who are dealt into this hand (stacks > 0). */
  players: { playerId: string; stack: number }[];
  buttonIndex: number; // index into players
  smallBlind: number;
  bigBlind: number;
  /** Optional ante posted by every player into the pot before the deal. */
  ante?: number;
  /** UTG posts a live 2×BB straddle; action starts left of the straddle. */
  straddle?: boolean;
  /** Run the board N times when all-in with the board incomplete (default 1). */
  runItTwiceTimes?: number;
  /** Optional pre-shuffled deck for deterministic tests. */
  deck?: Card[];
}

export interface HandResult {
  winnings: Map<string, number>; // playerId -> chips won
  pots: Pot[];
  /** playerId -> comparable hand score, for those who reached showdown. */
  scores: Map<string, number>;
  wentToShowdown: boolean;
  /** Boards used, when the hand was run more than once. */
  runs?: { board: Card[] }[];
}

export interface HandState {
  variant: GameVariant;
  seats: SeatState[];
  buttonIndex: number;
  smallBlind: number;
  bigBlind: number;
  board: Card[];
  deck: Card[];
  street: Street;
  toAct: number | null; // index into seats, or null when the hand is over
  currentBet: number; // highest committed on this street
  minRaise: number; // minimum legal raise increment
  runItTwiceTimes: number; // 1 = normal; >1 runs the board N times when all-in
  status: "betting" | "complete";
  result?: HandResult;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  minBet: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxTo: number; // max total this street (bet or raise ceiling)
}

// ---------------------------------------------------------------------------

function activeSeats(s: HandState): SeatState[] {
  return s.seats.filter((p) => !p.folded);
}

function totalPot(s: HandState): number {
  return s.seats.reduce((sum, p) => sum + p.totalCommitted, 0);
}

/** Next seat index (clockwise) that can still act, or null if none. */
function nextActor(s: HandState, from: number): number | null {
  const n = s.seats.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    const p = s.seats[idx];
    if (!p.folded && !p.allIn) return idx;
  }
  return null;
}

function firstActorFromButton(s: HandState): number | null {
  // First eligible seat left of the button.
  return nextActor(s, s.buttonIndex);
}

/** Deal `n` cards off the top of the deck (mutates deck). */
function draw(s: HandState, n: number): Card[] {
  return s.deck.splice(0, n);
}

// ---------------------------------------------------------------------------

/** Begin a new hand: post blinds, deal hole cards, set first to act. */
export function startHand(config: HandConfig): HandState {
  const dealt = config.players.filter((p) => p.stack > 0);
  if (dealt.length < 2) {
    throw new Error("Need at least 2 players with chips to start a hand");
  }

  const seats: SeatState[] = dealt.map((p) => ({
    playerId: p.playerId,
    stack: p.stack,
    committed: 0,
    totalCommitted: 0,
    holeCards: [],
    folded: false,
    allIn: false,
    hasActed: false,
  }));

  const state: HandState = {
    variant: config.variant,
    seats,
    buttonIndex: config.buttonIndex % seats.length,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    board: [],
    deck: config.deck ? config.deck.slice() : shuffledDeck(),
    street: "preflop",
    toAct: null,
    currentBet: 0,
    minRaise: config.bigBlind,
    runItTwiceTimes: Math.max(1, config.runItTwiceTimes ?? 1),
    status: "betting",
  };

  // Antes (dead money — counted toward the pot, not the current bet).
  if (config.ante && config.ante > 0) {
    for (const seat of seats) postAnte(seat, config.ante);
  }

  // Blinds. Heads-up: button is the small blind.
  const n = seats.length;
  const sbIndex =
    n === 2 ? state.buttonIndex : (state.buttonIndex + 1) % n;
  const bbIndex =
    n === 2 ? (state.buttonIndex + 1) % n : (state.buttonIndex + 2) % n;

  postBlind(state, sbIndex, config.smallBlind);
  postBlind(state, bbIndex, config.bigBlind);
  state.currentBet = config.bigBlind;
  state.minRaise = config.bigBlind;

  // Optional UTG straddle: a live 2×BB blind, first to act becomes its left.
  let firstToActFrom = bbIndex;
  if (config.straddle && n > 2) {
    const straddleIdx = (bbIndex + 1) % n;
    const straddleAmount = config.bigBlind * 2;
    postBlind(state, straddleIdx, straddleAmount);
    state.currentBet = straddleAmount;
    state.minRaise = config.bigBlind;
    firstToActFrom = straddleIdx;
  }

  // Deal hole cards (2 for hold'em, 4 for Omaha).
  const holeCount = config.variant === "plo" ? 4 : 2;
  for (let r = 0; r < holeCount; r++) {
    for (const seat of seats) seat.holeCards.push(...draw(state, 1));
  }

  // First to act preflop: left of the big blind (or the straddle).
  state.toAct = nextActor(state, firstToActFrom);
  return state;
}

function postAnte(seat: SeatState, amount: number) {
  const put = Math.min(amount, seat.stack);
  seat.stack -= put;
  seat.totalCommitted += put; // pot only, does not count toward the call
  if (seat.stack === 0) seat.allIn = true;
}

function postBlind(s: HandState, idx: number, amount: number) {
  const seat = s.seats[idx];
  const put = Math.min(amount, seat.stack);
  seat.stack -= put;
  seat.committed += put;
  seat.totalCommitted += put;
  if (seat.stack === 0) seat.allIn = true;
}

// ---------------------------------------------------------------------------

export function getLegalActions(s: HandState): LegalActions {
  const none: LegalActions = {
    canFold: false,
    canCheck: false,
    canCall: false,
    callAmount: 0,
    canBet: false,
    minBet: 0,
    canRaise: false,
    minRaiseTo: 0,
    maxTo: 0,
  };
  if (s.status !== "betting" || s.toAct === null) return none;

  const seat = s.seats[s.toAct];
  const toCall = s.currentBet - seat.committed;
  const maxTotalThisStreet = seat.committed + seat.stack; // shove ceiling

  // Pot-limit ceiling for PLO; no-limit is the whole stack.
  let maxTo = maxTotalThisStreet;
  if (s.variant === "plo") {
    const potAfterCall = totalPot(s) + toCall;
    const plMax = s.currentBet + potAfterCall;
    maxTo = Math.min(maxTotalThisStreet, plMax);
  }

  const facingBet = toCall > 0;

  return {
    canFold: true,
    canCheck: !facingBet,
    canCall: facingBet && seat.stack > 0,
    callAmount: Math.min(toCall, seat.stack),
    canBet: !facingBet && seat.stack > 0,
    minBet: Math.min(s.bigBlind, maxTotalThisStreet),
    canRaise: facingBet && seat.stack > toCall,
    minRaiseTo: Math.min(s.currentBet + s.minRaise, maxTotalThisStreet),
    maxTo,
  };
}

// ---------------------------------------------------------------------------

export type EngineAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  /** `to` is the TOTAL amount committed this street after the bet/raise. */
  | { type: "bet"; to: number }
  | { type: "raise"; to: number };

export function applyAction(
  state: HandState,
  playerId: string,
  action: EngineAction,
): HandState {
  const s = clone(state);
  if (s.status !== "betting" || s.toAct === null) {
    throw new Error("No action expected right now");
  }
  const seat = s.seats[s.toAct];
  if (seat.playerId !== playerId) {
    throw new Error(`Not ${playerId}'s turn`);
  }
  const legal = getLegalActions(s);

  switch (action.type) {
    case "fold": {
      seat.folded = true;
      seat.hasActed = true;
      break;
    }
    case "check": {
      if (!legal.canCheck) throw new Error("Cannot check facing a bet");
      seat.hasActed = true;
      break;
    }
    case "call": {
      if (!legal.canCall) throw new Error("Nothing to call");
      commit(seat, legal.callAmount);
      seat.hasActed = true;
      break;
    }
    case "bet":
    case "raise": {
      const isBet = action.type === "bet";
      if (isBet && !legal.canBet) throw new Error("Cannot bet");
      if (!isBet && !legal.canRaise) throw new Error("Cannot raise");

      const to = action.to;
      const isAllIn = to === legal.maxTo && legal.maxTo === seat.committed + seat.stack;
      const floor = isBet ? legal.minBet : legal.minRaiseTo;
      if (to > legal.maxTo) throw new Error("Amount exceeds the maximum");
      if (to < floor && !isAllIn) {
        throw new Error("Amount below the minimum");
      }

      const raiseIncrement = to - s.currentBet;
      commit(seat, to - seat.committed);
      // A full-size raise reopens the action; a short all-in does not.
      const fullRaise = raiseIncrement >= s.minRaise;
      s.currentBet = Math.max(s.currentBet, to);
      if (fullRaise) {
        s.minRaise = raiseIncrement;
        for (const p of s.seats) {
          if (!p.folded && !p.allIn && p !== seat) p.hasActed = false;
        }
      }
      seat.hasActed = true;
      break;
    }
  }

  advance(s);
  return s;
}

function commit(seat: SeatState, amount: number) {
  const put = Math.min(amount, seat.stack);
  seat.stack -= put;
  seat.committed += put;
  seat.totalCommitted += put;
  if (seat.stack === 0) seat.allIn = true;
}

/** Progress the hand: next actor, next street, or showdown. */
function advance(s: HandState) {
  // Everyone folded but one → hand ends immediately, no showdown.
  if (activeSeats(s).length === 1) {
    endHand(s, false);
    return;
  }

  // If the round isn't over and someone can still act, pass the turn.
  if (!roundComplete(s)) {
    const next = nextActor(s, s.toAct!);
    if (next !== null) {
      s.toAct = next;
      return;
    }
    // else: nobody left to act (all remaining all-in) → run it out.
  }

  // All-in run-out with the board incomplete and >1 player contesting:
  // optionally run the remaining board multiple times.
  if (
    s.runItTwiceTimes > 1 &&
    playersAbleToAct(s) <= 1 &&
    activeSeats(s).length >= 2 &&
    s.street !== "river"
  ) {
    endHandMultiRun(s, s.runItTwiceTimes);
    return;
  }

  // Betting round finished. Deal streets until either a live betting round
  // is possible again (≥2 players can act) or we reach showdown.
  while (true) {
    if (s.street === "river") {
      endHand(s, true);
      return;
    }
    dealNextStreet(s);
    if (playersAbleToAct(s) >= 2) {
      openBettingRound(s);
      return;
    }
    // ≤1 can act → keep dealing the rest of the board automatically.
  }
}

/** Reset per-street state and set the first player to act. */
function openBettingRound(s: HandState) {
  for (const p of s.seats) {
    p.committed = 0;
    p.hasActed = false;
  }
  s.currentBet = 0;
  s.minRaise = s.bigBlind;
  s.toAct = firstActorFromButton(s);
}

function dealNextStreet(s: HandState) {
  for (const p of s.seats) p.committed = 0;
  s.currentBet = 0;
  s.minRaise = s.bigBlind;

  switch (s.street) {
    case "preflop":
      draw(s, 1); // burn
      s.board.push(...draw(s, 3));
      s.street = "flop";
      break;
    case "flop":
      draw(s, 1);
      s.board.push(...draw(s, 1));
      s.street = "turn";
      break;
    case "turn":
      draw(s, 1);
      s.board.push(...draw(s, 1));
      s.street = "river";
      break;
  }
}

function roundComplete(s: HandState): boolean {
  const live = s.seats.filter((p) => !p.folded);
  return live.every(
    (p) => p.allIn || (p.hasActed && p.committed === s.currentBet),
  );
}

function playersAbleToAct(s: HandState): number {
  return s.seats.filter((p) => !p.folded && !p.allIn).length;
}

// ---------------------------------------------------------------------------

function endHand(s: HandState, showdown: boolean) {
  const contributions: Contribution[] = s.seats.map((p) => ({
    playerId: p.playerId,
    amount: p.totalCommitted,
    folded: p.folded,
  }));
  const pots = buildSidePots(contributions);

  const scores = new Map<string, number>();
  if (showdown) {
    for (const p of s.seats) {
      if (!p.folded) {
        scores.set(
          p.playerId,
          evaluateHand(s.variant, p.holeCards, s.board).score,
        );
      }
    }
  } else {
    // Sole survivor takes it; give them a max score.
    const winner = s.seats.find((p) => !p.folded)!;
    scores.set(winner.playerId, 1);
  }

  // Odd-chip order: seat order starting left of the button.
  const order: string[] = [];
  const n = s.seats.length;
  for (let i = 1; i <= n; i++) {
    order.push(s.seats[(s.buttonIndex + i) % n].playerId);
  }

  const winnings = awardPots(pots, scores, order);

  // Pay out.
  for (const p of s.seats) {
    const won = winnings.get(p.playerId) ?? 0;
    p.stack += won;
  }

  s.status = "complete";
  s.toAct = null;
  s.result = { winnings, pots, scores, wentToShowdown: showdown };
}

/** Odd-chip-safe split of a pot amount into the i-th of `times` runs. */
function splitAmount(amount: number, times: number, i: number): number {
  return Math.floor(amount / times) + (i < amount % times ? 1 : 0);
}

/**
 * Settle an all-in hand by running the remaining board `times` times, splitting
 * every pot evenly across the runs. Chip-conserving (odd chips distributed).
 */
function endHandMultiRun(s: HandState, times: number) {
  const contributions: Contribution[] = s.seats.map((p) => ({
    playerId: p.playerId,
    amount: p.totalCommitted,
    folded: p.folded,
  }));
  const pots = buildSidePots(contributions);

  // Odd-chip order: seat order starting left of the button.
  const order: string[] = [];
  const n = s.seats.length;
  for (let i = 1; i <= n; i++) {
    order.push(s.seats[(s.buttonIndex + i) % n].playerId);
  }

  const need = 5 - s.board.length;
  const winnings = new Map<string, number>();
  const add = (id: string, v: number) =>
    winnings.set(id, (winnings.get(id) ?? 0) + v);

  const runs: { board: Card[] }[] = [];
  let ptr = 0;
  let run0Scores = new Map<string, number>();

  for (let i = 0; i < times; i++) {
    const board = [...s.board, ...s.deck.slice(ptr, ptr + need)];
    ptr += need;
    runs.push({ board });

    const scores = new Map<string, number>();
    for (const p of s.seats) {
      if (!p.folded) {
        scores.set(p.playerId, evaluateHand(s.variant, p.holeCards, board).score);
      }
    }
    if (i === 0) run0Scores = scores;

    const potsForRun = pots.map((p) => ({
      amount: splitAmount(p.amount, times, i),
      eligible: p.eligible,
    }));
    const runWin = awardPots(potsForRun, scores, order);
    for (const [id, v] of runWin) add(id, v);
  }

  for (const p of s.seats) p.stack += winnings.get(p.playerId) ?? 0;

  s.board = runs[0].board;
  s.street = "showdown";
  s.status = "complete";
  s.toAct = null;
  s.result = { winnings, pots, scores: run0Scores, wentToShowdown: true, runs };
}

// ---------------------------------------------------------------------------

function clone(s: HandState): HandState {
  return {
    ...s,
    seats: s.seats.map((p) => ({ ...p, holeCards: p.holeCards.slice() })),
    board: s.board.slice(),
    deck: s.deck.slice(),
    result: undefined,
  };
}
