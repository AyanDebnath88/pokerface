"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PokerTable } from "@/components/table/PokerTable";
import { TopNav } from "@/components/ui/TopNav";
import type { SeatView, TableView } from "@/lib/game/view";
import type { Card } from "@/lib/engine/types";

// ---- seat builder ---------------------------------------------------------
type SeatOpts = Partial<SeatView> & { name: string; color: string };
function seat(i: number, o: SeatOpts): SeatView {
  return {
    seatIndex: i,
    playerId: `p${i}`,
    name: o.name,
    avatarColor: o.color,
    stack: o.stack ?? 5000,
    committed: 0,
    holeCards: o.holeCards,
    cardCount: o.cardCount,
    folded: o.folded ?? false,
    allIn: false,
    sittingOut: false,
    isDealer: o.isDealer ?? false,
    isSmallBlind: o.isSmallBlind ?? false,
    isBigBlind: o.isBigBlind ?? false,
    vipTier: o.vipTier ?? null,
    lastAction: o.lastAction,
    won: o.won,
    handRank: o.handRank,
  };
}

const COL = { you: "#e6c65c", rex: "#2f6fed", mia: "#d13b3b", ivy: "#1f9d57" };

// Build the 4 seats for a given step. `you`, `rex`, `mia`, `ivy` override.
function table(
  board: Card[],
  pot: number,
  over: {
    you?: SeatOpts;
    rex?: SeatOpts;
    mia?: SeatOpts;
    ivy?: SeatOpts;
    active?: number | null;
    showAll?: boolean;
  },
): { view: TableView; showAll: boolean } {
  const view: TableView = {
    code: "DEMO",
    variant: "nlhe",
    smallBlind: 25,
    bigBlind: 50,
    street: board.length === 0 ? "preflop" : board.length === 3 ? "flop" : board.length === 4 ? "turn" : "river",
    board,
    pot,
    activeSeatIndex: over.active ?? null,
    seats: [
      seat(0, { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", ...over.you }),
      seat(1, { name: "Rex", color: COL.rex, isBigBlind: true, ...over.rex }),
      seat(2, { name: "Mia", color: COL.mia, ...over.mia }),
      seat(3, { name: "Ivy", color: COL.ivy, isDealer: true, ...over.ivy }),
    ],
    handNumber: 1,
  };
  return { view, showAll: over.showAll ?? false };
}

const YOU: Card[] = ["As", "Ad"];
const BACK2 = { cardCount: 2 };

// ---- scripted hand --------------------------------------------------------
type Frame = { caption: string; hold: number; view: TableView; showAll: boolean };

const FRAMES: Frame[] = [
  { caption: "New hand — 4 players", hold: 1300, ...table([], 0, {}) },
  {
    caption: "Dealing hole cards…",
    hold: 1500,
    ...table([], 75, {
      you: { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", holeCards: YOU },
      rex: { name: "Rex", color: COL.rex, isBigBlind: true, ...BACK2 },
      mia: { name: "Mia", color: COL.mia, ...BACK2 },
      ivy: { name: "Ivy", color: COL.ivy, isDealer: true, ...BACK2 },
    }),
  },
  {
    caption: "Flop",
    hold: 1600,
    ...table(["Ah", "7d", "2c"], 200, {
      you: { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", holeCards: YOU, handRank: "Trips (A)" },
      rex: { name: "Rex", color: COL.rex, isBigBlind: true, ...BACK2 },
      mia: { name: "Mia", color: COL.mia, ...BACK2 },
      ivy: { name: "Ivy", color: COL.ivy, isDealer: true, ...BACK2 },
      active: 2,
    }),
  },
  {
    caption: "Mia bets 100",
    hold: 1400,
    ...table(["Ah", "7d", "2c"], 300, {
      you: { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", holeCards: YOU, handRank: "Trips (A)" },
      rex: { name: "Rex", color: COL.rex, isBigBlind: true, ...BACK2 },
      mia: { name: "Mia", color: COL.mia, ...BACK2, lastAction: "Bet 100" },
      ivy: { name: "Ivy", color: COL.ivy, isDealer: true, ...BACK2 },
      active: 1,
    }),
  },
  {
    caption: "Rex folds",
    hold: 1700,
    ...table(["Ah", "7d", "2c"], 300, {
      you: { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", holeCards: YOU, handRank: "Trips (A)" },
      rex: { name: "Rex", color: COL.rex, isBigBlind: true, ...BACK2, folded: true, lastAction: "Fold" },
      mia: { name: "Mia", color: COL.mia, ...BACK2, lastAction: "Bet 100" },
      ivy: { name: "Ivy", color: COL.ivy, isDealer: true, ...BACK2 },
    }),
  },
  {
    caption: "Turn",
    hold: 1500,
    ...table(["Ah", "7d", "2c", "Ks"], 500, {
      you: { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", holeCards: YOU, handRank: "Trips (A)" },
      rex: { name: "Rex", color: COL.rex, isBigBlind: true, ...BACK2, folded: true, lastAction: "Fold" },
      mia: { name: "Mia", color: COL.mia, ...BACK2 },
      ivy: { name: "Ivy", color: COL.ivy, isDealer: true, ...BACK2 },
    }),
  },
  {
    caption: "River",
    hold: 1500,
    ...table(["Ah", "7d", "2c", "Ks", "3h"], 700, {
      you: { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", holeCards: YOU, handRank: "Trips (A)" },
      rex: { name: "Rex", color: COL.rex, isBigBlind: true, ...BACK2, folded: true, lastAction: "Fold" },
      mia: { name: "Mia", color: COL.mia, ...BACK2 },
      ivy: { name: "Ivy", color: COL.ivy, isDealer: true, ...BACK2 },
    }),
  },
  {
    caption: "Showdown — You win 700 with three aces",
    hold: 3400,
    ...table(["Ah", "7d", "2c", "Ks", "3h"], 0, {
      you: { name: "You", color: COL.you, isSmallBlind: true, vipTier: "gold", holeCards: YOU, won: 700 },
      rex: { name: "Rex", color: COL.rex, isBigBlind: true, ...BACK2, folded: true, lastAction: "Fold" },
      mia: { name: "Mia", color: COL.mia, holeCards: ["Kh", "Kd"] },
      ivy: { name: "Ivy", color: COL.ivy, isDealer: true, holeCards: ["9s", "9h"] },
      showAll: true,
    }),
  },
];

export default function DemoPage() {
  const [i, setI] = useState(0);
  const frame = FRAMES[i];

  useEffect(() => {
    const t = setTimeout(() => setI((n) => (n + 1) % FRAMES.length), frame.hold);
    return () => clearTimeout(t);
  }, [i, frame.hold]);

  return (
    <main className="flex-1 flex flex-col poker-room">
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-wide text-gilt">
          PokerFace
        </Link>
        <TopNav />
      </header>

      <section className="flex-1 flex flex-col items-center justify-center gap-5 px-4 pb-10">
        <PokerTable view={frame.view} viewerSeatIndex={0} showAllCards={frame.showAll} />
        <div className="glass rounded-full px-5 py-2 text-sm text-gold-100 min-h-[2.5rem] flex items-center">
          {frame.caption}
        </div>
        <button
          onClick={() => setI(0)}
          className="btn-ghost rounded-full px-5 py-1.5 text-xs"
        >
          Replay hand
        </button>
      </section>
    </main>
  );
}
