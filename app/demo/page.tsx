"use client";

import { useState } from "react";
import Link from "next/link";
import { PokerTable } from "@/components/table/PokerTable";
import { ActionBar } from "@/components/table/ActionBar";
import type { TableView } from "@/lib/game/view";
import type { LegalActions } from "@/lib/engine/betting";

const demoView: TableView = {
  code: "DEMO",
  variant: "nlhe",
  smallBlind: 25,
  bigBlind: 50,
  street: "flop",
  board: ["Ah", "Kd", "7s"],
  pot: 640,
  seats: [
    {
      seatIndex: 0,
      playerId: "you",
      name: "You",
      avatarColor: "#e6c65c",
      stack: 2450,
      committed: 0,
      holeCards: ["As", "Kh"],
      folded: false,
      allIn: false,
      sittingOut: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      vipTier: "gold",
      lastAction: "Check",
    },
    {
      seatIndex: 1,
      playerId: "p1",
      name: "Marco",
      avatarColor: "#2f6fed",
      stack: 3120,
      committed: 150,
      cardCount: 2,
      folded: false,
      allIn: false,
      sittingOut: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      lastAction: "Bet 150",
    },
    {
      seatIndex: 2,
      playerId: "p2",
      name: "Priya",
      avatarColor: "#1f9d57",
      stack: 1875,
      committed: 0,
      cardCount: 2,
      folded: true,
      allIn: false,
      sittingOut: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      lastAction: "Fold",
    },
    {
      seatIndex: 3,
      playerId: "p3",
      name: "Dealer Sam",
      avatarColor: "#d13b3b",
      stack: 5010,
      committed: 0,
      cardCount: 2,
      folded: false,
      allIn: false,
      sittingOut: false,
      isDealer: true,
      isSmallBlind: false,
      isBigBlind: false,
    },
    {
      seatIndex: 4,
      playerId: "p4",
      name: "Ines",
      avatarColor: "#9b5de5",
      stack: 940,
      committed: 25,
      cardCount: 2,
      folded: false,
      allIn: false,
      sittingOut: false,
      isDealer: false,
      isSmallBlind: true,
      isBigBlind: false,
      vipTier: "black",
    },
    {
      seatIndex: 5,
      playerId: "p5",
      name: "Theo",
      avatarColor: "#f2994a",
      stack: 2600,
      committed: 50,
      cardCount: 2,
      folded: false,
      allIn: false,
      sittingOut: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: true,
    },
  ],
  activeSeatIndex: 0,
  handNumber: 42,
};

const demoLegal: LegalActions = {
  canFold: true,
  canCheck: false,
  canCall: true,
  callAmount: 150,
  canBet: false,
  minBet: 50,
  canRaise: true,
  minRaiseTo: 300,
  maxTo: 2450,
};

// Showdown variant: river dealt, You win with two pair, cards revealed.
const showdownView: TableView = {
  ...demoView,
  street: "showdown",
  board: ["Ah", "Kd", "7s", "2c", "9h"],
  pot: 0,
  activeSeatIndex: null,
  seats: demoView.seats.map((s) => {
    if (s.seatIndex === 0)
      return { ...s, committed: 0, lastAction: undefined, won: 640, winningHand: "Two Pair", holeCards: ["As", "Kh"] };
    if (s.seatIndex === 1)
      return { ...s, committed: 0, lastAction: undefined, holeCards: ["Qd", "Jc"], cardCount: undefined };
    return { ...s, committed: 0, lastAction: undefined };
  }),
};

export default function DemoPage() {
  const [mode, setMode] = useState<"action" | "showdown">("action");
  const view = mode === "action" ? demoView : showdownView;

  return (
    <main className="flex-1 flex flex-col poker-room">
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-wide text-gilt">
          PokerFace
        </Link>
        <div className="glass rounded-full p-1 flex text-xs">
          {(["action", "showdown"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1.5 capitalize transition ${
                mode === m ? "btn-gold" : "text-parchment hover:text-gold-100"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-4 pb-10">
        <PokerTable view={view} viewerSeatIndex={0} showAllCards={mode === "showdown"} />
        {mode === "action" ? (
          <ActionBar legal={demoLegal} bigBlind={demoView.bigBlind} />
        ) : (
          <div className="glass rounded-xl px-6 py-3 text-sm text-win">
            You win 640 with Two Pair
          </div>
        )}
        <p className="text-xs text-muted text-center max-w-md">
          Concept preview of the &ldquo;Onyx Club&rdquo; table. Toggle between a
          live decision and a showdown. Real-time multiplayer is wired and ready
          for Supabase.
        </p>
      </section>
    </main>
  );
}
