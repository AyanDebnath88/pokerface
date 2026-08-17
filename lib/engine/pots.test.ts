import { describe, it, expect } from "vitest";
import { buildSidePots, awardPots } from "./pots";

describe("buildSidePots", () => {
  it("single pot when everyone matches", () => {
    const pots = buildSidePots([
      { playerId: "a", amount: 100, folded: false },
      { playerId: "b", amount: 100, folded: false },
      { playerId: "c", amount: 100, folded: false },
    ]);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligible.sort()).toEqual(["a", "b", "c"]);
  });

  it("creates a side pot when a short stack is all-in", () => {
    // a all-in for 50; b and c continue to 200.
    const pots = buildSidePots([
      { playerId: "a", amount: 50, folded: false },
      { playerId: "b", amount: 200, folded: false },
      { playerId: "c", amount: 200, folded: false },
    ]);
    // Main pot: 50*3 = 150 (a,b,c). Side pot: 150*2 = 300 (b,c).
    expect(pots).toHaveLength(2);
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligible.sort()).toEqual(["a", "b", "c"]);
    expect(pots[1].amount).toBe(300);
    expect(pots[1].eligible.sort()).toEqual(["b", "c"]);
  });

  it("includes folded players' dead money but not their eligibility", () => {
    const pots = buildSidePots([
      { playerId: "a", amount: 100, folded: true },
      { playerId: "b", amount: 100, folded: false },
      { playerId: "c", amount: 100, folded: false },
    ]);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligible.sort()).toEqual(["b", "c"]);
  });
});

describe("awardPots", () => {
  it("awards the whole pot to the best hand", () => {
    const pots = buildSidePots([
      { playerId: "a", amount: 100, folded: false },
      { playerId: "b", amount: 100, folded: false },
    ]);
    const scores = new Map([
      ["a", 500],
      ["b", 200],
    ]);
    const w = awardPots(pots, scores, ["a", "b"]);
    expect(w.get("a")).toBe(200);
    expect(w.get("b")).toBeUndefined();
  });

  it("splits a tied pot and hands odd chip to first in order", () => {
    const pots = buildSidePots([
      { playerId: "a", amount: 101, folded: false },
      { playerId: "b", amount: 100, folded: false },
    ]);
    // amounts: main 100*2=200 both, side 1 (a only)
    const scores = new Map([
      ["a", 500],
      ["b", 500],
    ]);
    const w = awardPots(pots, scores, ["b", "a"]);
    // 200 splits 100/100; the lone extra chip (side pot) goes to a.
    expect(w.get("a")).toBe(101);
    expect(w.get("b")).toBe(100);
  });

  it("side pot goes to the best remaining when short stack loses main", () => {
    const pots = buildSidePots([
      { playerId: "a", amount: 50, folded: false }, // all-in
      { playerId: "b", amount: 200, folded: false },
      { playerId: "c", amount: 200, folded: false },
    ]);
    const scores = new Map([
      ["a", 900], // best hand overall
      ["b", 500],
      ["c", 300],
    ]);
    const w = awardPots(pots, scores, ["a", "b", "c"]);
    // a wins main (150). b wins side (300). c gets nothing.
    expect(w.get("a")).toBe(150);
    expect(w.get("b")).toBe(300);
    expect(w.get("c")).toBeUndefined();
  });
});
