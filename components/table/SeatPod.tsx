"use client";

import { motion } from "motion/react";
import type { SeatView } from "@/lib/game/view";
import { formatChips } from "@/lib/game/view";
import { PlayingCard } from "./PlayingCard";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SeatPod({
  seat,
  active,
  showHoleCards,
}: {
  seat: SeatView;
  active: boolean;
  showHoleCards: boolean;
}) {
  if (!seat.playerId) {
    return (
      <div className="glass rounded-xl px-2 py-2.5 w-[4.75rem] sm:w-28 text-center opacity-50">
        <span className="text-[9px] sm:text-[10px] tracking-widest text-muted uppercase">
          Open
        </span>
      </div>
    );
  }

  const vipRing =
    seat.vipTier === "gold"
      ? "ring-gilt"
      : seat.vipTier === "black"
        ? "shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
        : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative flex flex-col items-center"
    >
      {/* Hole cards above the pod */}
      <div className="flex gap-1 mb-[-10px] z-10">
        {(seat.holeCards && showHoleCards
          ? seat.holeCards.map((c, i) => (
              <PlayingCard key={i} card={c} size="sm" dimmed={seat.folded} />
            ))
          : Array.from({ length: seat.cardCount ?? 0 }).map((_, i) => (
              <PlayingCard key={i} faceDown size="sm" dimmed={seat.folded} />
            )))}
      </div>

      <div
        className={`glass-strong rounded-xl py-1.5 px-2 sm:px-2.5 w-[4.75rem] sm:w-28 text-center ${
          seat.won
            ? "ring-2 ring-win/70 shadow-[0_0_26px_-6px_var(--win)]"
            : active
              ? "seat-active"
              : vipRing
        } ${seat.folded ? "opacity-50" : ""}`}
      >
        <div className="flex items-center gap-1.5 justify-center">
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full grid place-items-center text-[9px] sm:text-[10px] font-semibold text-onyx-950 shrink-0"
            style={{ background: seat.avatarColor ?? "var(--gold-400)" }}
          >
            {initials(seat.name)}
          </div>
          <div className="text-left leading-tight min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-cream truncate max-w-[2.75rem] sm:max-w-[4.25rem]">
              {seat.name}
            </div>
            <div className="text-[10px] sm:text-[11px] text-gold-300 tabular-nums leading-tight">
              {formatChips(seat.stack)}
            </div>
          </div>
        </div>

        {seat.won ? (
          <div className="mt-1.5 text-[10px] uppercase tracking-wider text-win truncate">
            {seat.winningHand ?? "Winner"}
          </div>
        ) : seat.lastAction ? (
          <div className="mt-1.5 text-[10px] uppercase tracking-wider text-muted">
            {seat.allIn ? "All-in" : seat.lastAction}
          </div>
        ) : null}
      </div>

      {/* Winnings badge */}
      {seat.won ? (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 btn-gold rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums whitespace-nowrap"
        >
          +{seat.won.toLocaleString("en-US")}
        </motion.div>
      ) : null}

      {/* Dealer / blind buttons */}
      <div className="absolute -right-2 top-6 flex flex-col gap-0.5">
        {seat.isDealer && <Marker label="D" tone="gold" />}
        {seat.isSmallBlind && <Marker label="SB" tone="dark" />}
        {seat.isBigBlind && <Marker label="BB" tone="dark" />}
      </div>
    </motion.div>
  );
}

function Marker({ label, tone }: { label: string; tone: "gold" | "dark" }) {
  return (
    <span
      className={`grid place-items-center rounded-full text-[9px] font-bold w-5 h-5 ${
        tone === "gold"
          ? "bg-gold-400 text-onyx-950"
          : "bg-onyx-700 text-gold-200 border border-gold-500/40"
      }`}
    >
      {label}
    </span>
  );
}
