import { describe, it, expect } from "vitest";
import { dealHand, act, legalFor, actingUserId, nextButtonSeat } from "./reducer";
import { DEFAULT_CONFIG } from "./config";
import type { Card } from "@/lib/engine/types";
import type { EngineAction } from "@/lib/engine/betting";

const config = { ...DEFAULT_CONFIG, blindLevels: [{ smallBlind: 5, bigBlind: 10 }] };

const seated = [
  { userId: "u0", seatIndex: 0, stack: 1000 },
  { userId: "u1", seatIndex: 3, stack: 1000 },
  { userId: "u2", seatIndex: 5, stack: 1000 },
];

describe("nextButtonSeat", () => {
  it("advances to the next occupied seat and wraps", () => {
    expect(nextButtonSeat(seated, null)).toBe(0);
    expect(nextButtonSeat(seated, 0)).toBe(3);
    expect(nextButtonSeat(seated, 3)).toBe(5);
    expect(nextButtonSeat(seated, 5)).toBe(0);
  });
});

describe("dealHand", () => {
  it("keeps hole cards + deck out of the public hand", () => {
    const d = dealHand(config, seated, 0);
    expect(d.publicHand.deck).toHaveLength(0);
    for (const s of d.publicHand.seats) expect(s.holeCards).toHaveLength(0);
    // Secret deck + per-player hole rows exist.
    expect(d.deck.length).toBeGreaterThan(0);
    expect(d.holeCards).toHaveLength(3);
    for (const row of d.holeCards) expect(row.cards).toHaveLength(2);
    // Blinds posted.
    expect(d.events.filter((e) => e.kind === "blind")).toHaveLength(2);
  });
});

describe("full hand via DB round-trip (strip → rehydrate each action)", () => {
  it("plays check/call down to completion and conserves chips", () => {
    const d = dealHand(config, seated, 0);
    const holeByPlayer: Record<string, Card[]> = {};
    for (const row of d.holeCards) holeByPlayer[row.userId] = row.cards;

    let publicHand = d.publicHand;
    let deck = d.deck;
    let guard = 0;

    while (publicHand.status === "betting" && guard++ < 200) {
      const uid = actingUserId(publicHand)!;
      const legal = legalFor(publicHand);
      const action: EngineAction = legal.canCheck
        ? { type: "check" }
        : { type: "call" };
      const r = act(config, publicHand, deck, holeByPlayer, uid, action);
      publicHand = r.publicHand; // stripped — mimics reading back from DB
      deck = r.deck;
      if (r.complete) {
        expect(r.winnings).toBeDefined();
        const total = publicHand.seats.reduce((sum, s) => sum + s.stack, 0);
        expect(total).toBe(3000);
      }
    }
    expect(publicHand.status).toBe("complete");
    expect(publicHand.board).toHaveLength(5);
  });

  it("ends without showdown when everyone folds to one player", () => {
    const d = dealHand(config, seated, 0);
    const holeByPlayer: Record<string, Card[]> = {};
    for (const row of d.holeCards) holeByPlayer[row.userId] = row.cards;

    let publicHand = d.publicHand;
    let deck = d.deck;

    // UTG folds, next folds → last remaining wins.
    let uid = actingUserId(publicHand)!;
    let r = act(config, publicHand, deck, holeByPlayer, uid, { type: "fold" });
    publicHand = r.publicHand;
    deck = r.deck;

    uid = actingUserId(publicHand)!;
    r = act(config, publicHand, deck, holeByPlayer, uid, { type: "fold" });

    expect(r.complete).toBe(true);
    const winEvents = r.events.filter((e) => e.kind === "win");
    expect(winEvents).toHaveLength(1);
    const total = r.publicHand.seats.reduce((s, x) => s + x.stack, 0);
    expect(total).toBe(3000);
  });
});
