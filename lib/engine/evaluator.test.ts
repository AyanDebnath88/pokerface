import { describe, it, expect } from "vitest";
import { evaluate5, bestOfSeven, bestOmaha, evaluateHand } from "./evaluator";
import { HandCategory } from "./types";

const cat = (cards: string[]) => evaluate5(cards).category;

describe("evaluate5 — categories", () => {
  it("ranks a royal/straight flush", () => {
    expect(cat(["Ts", "Js", "Qs", "Ks", "As"])).toBe(HandCategory.StraightFlush);
  });
  it("ranks four of a kind", () => {
    expect(cat(["9s", "9h", "9d", "9c", "2s"])).toBe(HandCategory.FourOfAKind);
  });
  it("ranks a full house", () => {
    expect(cat(["9s", "9h", "9d", "2c", "2s"])).toBe(HandCategory.FullHouse);
  });
  it("ranks a flush", () => {
    expect(cat(["2s", "5s", "9s", "Js", "Ks"])).toBe(HandCategory.Flush);
  });
  it("ranks a straight", () => {
    expect(cat(["4s", "5h", "6d", "7c", "8s"])).toBe(HandCategory.Straight);
  });
  it("ranks the wheel (A-2-3-4-5) as a straight", () => {
    expect(cat(["As", "2h", "3d", "4c", "5s"])).toBe(HandCategory.Straight);
  });
  it("ranks three of a kind", () => {
    expect(cat(["9s", "9h", "9d", "Jc", "2s"])).toBe(HandCategory.ThreeOfAKind);
  });
  it("ranks two pair", () => {
    expect(cat(["9s", "9h", "2d", "2c", "As"])).toBe(HandCategory.TwoPair);
  });
  it("ranks a pair", () => {
    expect(cat(["9s", "9h", "2d", "5c", "As"])).toBe(HandCategory.Pair);
  });
  it("ranks high card", () => {
    expect(cat(["9s", "7h", "2d", "5c", "As"])).toBe(HandCategory.HighCard);
  });
});

describe("evaluate5 — comparisons", () => {
  it("straight flush beats four of a kind", () => {
    const sf = evaluate5(["5s", "6s", "7s", "8s", "9s"]).score;
    const quads = evaluate5(["As", "Ah", "Ad", "Ac", "Ks"]).score;
    expect(sf).toBeGreaterThan(quads);
  });
  it("higher two pair wins by top pair", () => {
    const a = evaluate5(["As", "Ah", "2d", "2c", "5s"]).score;
    const b = evaluate5(["Ks", "Kh", "Qd", "Qc", "5s"]).score;
    expect(a).toBeGreaterThan(b);
  });
  it("kicker breaks a tied pair", () => {
    const a = evaluate5(["As", "Ah", "Kd", "3c", "2s"]).score;
    const b = evaluate5(["Ad", "Ac", "Qd", "3d", "2h"]).score;
    expect(a).toBeGreaterThan(b);
  });
  it("the wheel loses to a six-high straight", () => {
    const wheel = evaluate5(["As", "2h", "3d", "4c", "5s"]).score;
    const six = evaluate5(["2s", "3h", "4d", "5c", "6s"]).score;
    expect(six).toBeGreaterThan(wheel);
  });
  it("identical hands tie", () => {
    const a = evaluate5(["As", "Kh", "Qd", "Jc", "9s"]).score;
    const b = evaluate5(["Ad", "Kc", "Qh", "Js", "9d"]).score;
    expect(a).toBe(b);
  });
});

describe("bestOfSeven (Hold'em)", () => {
  it("finds the flush among 7 cards", () => {
    const hv = bestOfSeven(["As", "Ks", "2s", "7s", "9s", "3h", "4d"]);
    expect(hv.category).toBe(HandCategory.Flush);
  });
  it("finds a full house using the board", () => {
    const hv = bestOfSeven(["As", "Ah", "Ks", "Kh", "Kd", "2c", "3d"]);
    expect(hv.category).toBe(HandCategory.FullHouse);
  });
});

describe("bestOmaha (must use exactly 2 hole + 3 board)", () => {
  it("does NOT make a flush with a single suited hole card", () => {
    // Board is four spades; hole has only one spade → no flush in Omaha.
    const hole = ["As", "Kh", "Qd", "Jc"];
    const board = ["2s", "5s", "9s", "Ts", "3h"];
    const hv = bestOmaha(hole, board);
    expect(hv.category).not.toBe(HandCategory.Flush);
  });
  it("DOES make a flush with two suited hole cards", () => {
    const hole = ["As", "Ks", "Qd", "Jc"];
    const board = ["2s", "5s", "9s", "Th", "3h"];
    const hv = bestOmaha(hole, board);
    expect(hv.category).toBe(HandCategory.Flush);
  });
  it("evaluateHand routes plo through the Omaha rule", () => {
    const hole = ["As", "Kh", "Qd", "Jc"];
    const board = ["2s", "5s", "9s", "Ts", "3h"];
    expect(evaluateHand("plo", hole, board).category).not.toBe(
      HandCategory.Flush,
    );
  });
});
