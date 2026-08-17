import { describe, it, expect } from "vitest";
import {
  startHand,
  applyAction,
  getLegalActions,
  type HandState,
  type HandConfig,
} from "./betting";

// Deterministic deck: 3 players get AA / KK / QQ, board 2c 7s 9d 3h 4c.
// Deal order is round-robin from seat 0, then a burn before each street.
const FIXED_DECK = [
  "Ah", "Kh", "Qh", // round 1: a, b, c
  "Ad", "Kd", "Qd", // round 2: a, b, c
  "Ts", // burn
  "2c", "7s", "9d", // flop
  "9s", // burn
  "3h", // turn
  "8s", // burn
  "4c", // river
];

const baseConfig = (over: Partial<HandConfig> = {}): HandConfig => ({
  variant: "nlhe",
  players: [
    { playerId: "a", stack: 1000 },
    { playerId: "b", stack: 1000 },
    { playerId: "c", stack: 1000 },
  ],
  buttonIndex: 0,
  smallBlind: 5,
  bigBlind: 10,
  deck: FIXED_DECK,
  ...over,
});

const actor = (s: HandState) => s.seats[s.toAct!].playerId;
const stackOf = (s: HandState, id: string) =>
  s.seats.find((p) => p.playerId === id)!.stack;

describe("startHand", () => {
  it("posts blinds and sets first to act (UTG) in a 3-handed game", () => {
    const s = startHand(baseConfig());
    // button = a(0); SB = b(1)=5; BB = c(2)=10; UTG = a(0).
    expect(stackOf(s, "b")).toBe(995);
    expect(stackOf(s, "c")).toBe(990);
    expect(s.currentBet).toBe(10);
    expect(actor(s)).toBe("a");
    expect(s.seats[0].holeCards).toEqual(["Ah", "Ad"]);
  });

  it("treats the button as the small blind heads-up", () => {
    const s = startHand(
      baseConfig({
        players: [
          { playerId: "a", stack: 1000 },
          { playerId: "b", stack: 1000 },
        ],
      }),
    );
    // Heads-up: button a = SB, b = BB, and a acts first preflop.
    expect(stackOf(s, "a")).toBe(995);
    expect(stackOf(s, "b")).toBe(990);
    expect(actor(s)).toBe("a");
  });
});

describe("legal actions", () => {
  it("UTG faces the big blind: can call or raise, not check", () => {
    const s = startHand(baseConfig());
    const la = getLegalActions(s);
    expect(la.canCheck).toBe(false);
    expect(la.canCall).toBe(true);
    expect(la.callAmount).toBe(10);
    expect(la.canRaise).toBe(true);
    expect(la.minRaiseTo).toBe(20);
  });

  it("rejects a raise below the minimum", () => {
    const s = startHand(baseConfig());
    expect(() => applyAction(s, "a", { type: "raise", to: 15 })).toThrow();
  });

  it("rejects checking when facing a bet", () => {
    const s = startHand(baseConfig());
    expect(() => applyAction(s, "a", { type: "check" })).toThrow();
  });

  it("rejects action from a player out of turn", () => {
    const s = startHand(baseConfig());
    expect(() => applyAction(s, "b", { type: "call" })).toThrow();
  });
});

describe("a hand that folds around to the big blind", () => {
  it("awards the pot without a showdown", () => {
    let s = startHand(baseConfig());
    s = applyAction(s, "a", { type: "fold" });
    s = applyAction(s, "b", { type: "fold" }); // SB folds
    // Only c (BB) remains.
    expect(s.status).toBe("complete");
    expect(s.result!.wentToShowdown).toBe(false);
    // Pot = 5 (SB) + 10 (BB) = 15; c committed 10, wins 15 → net +5.
    expect(stackOf(s, "c")).toBe(1005);
    expect(stackOf(s, "a")).toBe(1000);
    expect(stackOf(s, "b")).toBe(995);
  });
});

describe("a full hand checked down to showdown", () => {
  it("pays the best hand and conserves chips", () => {
    let s = startHand(baseConfig());
    // Preflop: a calls, b calls, c checks option.
    s = applyAction(s, "a", { type: "call" });
    s = applyAction(s, "b", { type: "call" });
    s = applyAction(s, "c", { type: "check" });
    expect(s.street).toBe("flop");
    // Flop, turn, river: check around each time (b first, left of button).
    for (const street of ["flop", "turn", "river"] as const) {
      expect(s.street).toBe(street);
      s = applyAction(s, "b", { type: "check" });
      s = applyAction(s, "c", { type: "check" });
      s = applyAction(s, "a", { type: "check" });
    }
    expect(s.status).toBe("complete");
    expect(s.result!.wentToShowdown).toBe(true);
    // Pot 30 → a (AA) wins. a: -10 +30 = 1020.
    expect(stackOf(s, "a")).toBe(1020);
    expect(stackOf(s, "b")).toBe(990);
    expect(stackOf(s, "c")).toBe(990);
    expect(
      stackOf(s, "a") + stackOf(s, "b") + stackOf(s, "c"),
    ).toBe(3000);
  });
});

describe("all-in short stack producing a side pot", () => {
  it("splits main and side pots by eligibility and hand strength", () => {
    let s = startHand(
      baseConfig({
        players: [
          { playerId: "a", stack: 100 }, // short — will be all-in
          { playerId: "b", stack: 1000 },
          { playerId: "c", stack: 1000 },
        ],
      }),
    );
    // Preflop: a shoves 100, b calls, c calls.
    s = applyAction(s, "a", { type: "raise", to: 100 });
    expect(s.seats[0].allIn).toBe(true);
    s = applyAction(s, "b", { type: "call" });
    s = applyAction(s, "c", { type: "call" });
    expect(s.street).toBe("flop");
    // Flop: b bets 200, c calls.
    s = applyAction(s, "b", { type: "bet", to: 200 });
    s = applyAction(s, "c", { type: "call" });
    // Turn: b bets 200, c calls.
    s = applyAction(s, "b", { type: "bet", to: 200 });
    s = applyAction(s, "c", { type: "call" });
    // River: check, check.
    s = applyAction(s, "b", { type: "check" });
    s = applyAction(s, "c", { type: "check" });

    expect(s.status).toBe("complete");
    // Contributions: a=100, b=500, c=500.
    // Main pot 300 (a,b,c) → a (AA) wins. Side pot 800 (b,c) → b (KK) wins.
    expect(stackOf(s, "a")).toBe(300); // 0 + 300
    expect(stackOf(s, "b")).toBe(1300); // 1000 - 500 + 800
    expect(stackOf(s, "c")).toBe(500); // 1000 - 500
    expect(
      stackOf(s, "a") + stackOf(s, "b") + stackOf(s, "c"),
    ).toBe(2100);
  });
});

describe("antes", () => {
  it("posts an ante from every player into the pot without affecting the call", () => {
    const s = startHand(baseConfig({ ante: 2 }));
    // a = UTG (ante only), b = SB (ante + 5), c = BB (ante + 10).
    expect(stackOf(s, "a")).toBe(998);
    expect(stackOf(s, "b")).toBe(993);
    expect(stackOf(s, "c")).toBe(988);
    // Antes don't count toward the current bet.
    expect(s.currentBet).toBe(10);
    const la = getLegalActions(s);
    expect(la.callAmount).toBe(10);
    expect(actor(s)).toBe("a");
  });

  it("adds antes to the pot at showdown and conserves chips", () => {
    let s = startHand(baseConfig({ ante: 2 }));
    s = applyAction(s, "a", { type: "fold" });
    s = applyAction(s, "b", { type: "fold" });
    // c wins SB+BB+3 antes = 5 + 10 + 6 = 21.
    expect(stackOf(s, "c")).toBe(1009);
    expect(stackOf(s, "a") + stackOf(s, "b") + stackOf(s, "c")).toBe(3000);
  });
});

describe("UTG straddle", () => {
  it("posts a 2x BB straddle and moves first action to its left", () => {
    const s = startHand(baseConfig({ straddle: true }));
    // button a(0); SB b(1)=5; BB c(2)=10; straddle a(0)=20; first to act b(1).
    expect(stackOf(s, "a")).toBe(980);
    expect(stackOf(s, "b")).toBe(995);
    expect(stackOf(s, "c")).toBe(990);
    expect(s.currentBet).toBe(20);
    expect(actor(s)).toBe("b");
    expect(getLegalActions(s).callAmount).toBe(15);
  });
});

describe("run it twice", () => {
  it("splits the pot across two boards when heads-up all-in", () => {
    // Heads-up all-in preflop, board run twice.
    // a = AA, b = KK. Run 1 board misses; run 2 board pairs b's kings.
    const deck = [
      "Ah", "Kh", // round 1: a, b
      "Ad", "Kd", // round 2: a, b
      "2c", "7s", "9d", "3h", "4s", // run 1 board → a (AA) wins
      "Kc", "2h", "5s", "6d", "8c", // run 2 board → b (set of kings) wins
    ];
    let s = startHand({
      variant: "nlhe",
      players: [
        { playerId: "a", stack: 1000 },
        { playerId: "b", stack: 1000 },
      ],
      buttonIndex: 0,
      smallBlind: 5,
      bigBlind: 10,
      runItTwiceTimes: 2,
      deck,
    });
    // a (button/SB) shoves, b calls all-in.
    s = applyAction(s, "a", { type: "raise", to: 1000 });
    s = applyAction(s, "b", { type: "call" });

    expect(s.status).toBe("complete");
    expect(s.result!.runs).toHaveLength(2);
    // Pot 2000 split: a wins run 1 (1000), b wins run 2 (1000).
    expect(stackOf(s, "a")).toBe(1000);
    expect(stackOf(s, "b")).toBe(1000);
    expect(s.result!.winnings.get("a")).toBe(1000);
    expect(s.result!.winnings.get("b")).toBe(1000);
  });
});

describe("pot-limit Omaha betting cap", () => {
  it("caps a pot-sized raise correctly preflop", () => {
    const s = startHand(
      baseConfig({
        variant: "plo",
        // PLO needs 4 hole cards each; give a fuller deck.
        deck: [
          "Ah", "Kh", "Qh",
          "Ad", "Kd", "Qd",
          "As", "Ks", "Qs",
          "Ac", "Kc", "Qc",
          "Ts", "2c", "7s", "9d", "9s", "3h", "8s", "4c",
        ],
      }),
    );
    // Pot after blinds = 15. UTG (a) faces 10. Pot-limit max raise-to =
    // currentBet(10) + potAfterCall(15 + 10) = 35.
    const la = getLegalActions(s);
    expect(la.maxTo).toBe(35);
    expect(() => applyAction(s, "a", { type: "raise", to: 36 })).toThrow();
    const ok = applyAction(s, "a", { type: "raise", to: 35 });
    expect(ok.currentBet).toBe(35);
  });
});
