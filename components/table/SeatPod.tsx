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
      <div className="rounded-xl px-3 py-2.5 w-24 sm:w-28 text-center bg-black/30 border border-white/5">
        <span className="text-[9px] sm:text-[10px] tracking-widest text-muted uppercase">Open</span>
      </div>
    );
  }

  const won = !!seat.won;
  const podTone = won
    ? "border-win/70 shadow-[0_0_26px_-6px_var(--win)]"
    : active
      ? "border-gold-400 shadow-[0_0_22px_-6px_var(--gold-400)]"
      : "border-white/8";

  const cardCount = seat.cardCount ?? (seat.holeCards?.length ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, transform: "scale(0.92)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative flex flex-col items-center"
    >
      {/* Hole cards peeking over the pod */}
      <div className="flex gap-0.5 mb-[-8px] z-10 relative">
        {seat.holeCards && showHoleCards
          ? seat.holeCards.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, transform: "translateY(-8px) scale(0.85)" }}
                animate={
                  seat.folded
                    ? { opacity: 0.5, transform: "translateY(6px) scale(0.92) rotate(-4deg)" }
                    : { opacity: 1, transform: "translateY(0px) scale(1) rotate(0deg)" }
                }
                transition={{ delay: seat.folded ? 0 : i * 0.08, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <PlayingCard card={c} size="sm" dimmed={seat.folded} glow={won} />
              </motion.div>
            ))
          : Array.from({ length: cardCount }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, transform: "translateY(-8px) scale(0.85)" }}
                animate={
                  seat.folded
                    ? { opacity: 0.45, transform: "translateY(6px) scale(0.92) rotate(-4deg)" }
                    : { opacity: 1, transform: "translateY(0px) scale(1) rotate(0deg)" }
                }
                transition={{ delay: seat.folded ? 0 : i * 0.08, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                <PlayingCard faceDown size="sm" dimmed={seat.folded} />
              </motion.div>
            ))}
        {seat.folded && (
          <span className="absolute inset-0 grid place-items-center text-[9px] font-semibold tracking-widest text-white/70 uppercase pointer-events-none">
            Fold
          </span>
        )}
      </div>

      {/* Live hand-strength readout (viewer only, not at win) */}
      {seat.handRank && !seat.folded && !won && (
        <div className="hand-rank-pill rounded-md px-1.5 py-0.5 text-[8px] font-medium tracking-wide mb-[-4px] z-20 relative whitespace-nowrap">
          {seat.handRank}
        </div>
      )}

      {/* Solid pod */}
      <div
        className={`rounded-lg pt-2 pb-1 px-2 w-[4.25rem] sm:w-[6.5rem] text-center bg-onyx-800/95 backdrop-blur-sm border ${podTone} ${
          seat.folded ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-center gap-1.5 justify-center">
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full grid place-items-center text-[9px] sm:text-[10px] font-semibold text-onyx-950 shrink-0"
            style={{ background: seat.avatarColor ?? "var(--gold-400)" }}
          >
            {initials(seat.name)}
          </div>
          <div className="text-left leading-tight min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-cream truncate max-w-[2.75rem] sm:max-w-[5rem]">
              {seat.name}
            </div>
            <div className="text-[10px] sm:text-[11px] text-gold-300 tabular-nums leading-tight">
              {formatChips(seat.stack)}
            </div>
          </div>
        </div>

        {!won && seat.lastAction ? (
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-muted">
            {seat.allIn ? "All-in" : seat.lastAction}
          </div>
        ) : null}
      </div>

      {/* Winnings badge */}
      {won ? (
        <motion.div
          initial={{ opacity: 0, transform: "translateY(6px) scale(0.85)" }}
          animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="absolute -top-3 -right-1 z-40 btn-gold rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums whitespace-nowrap"
        >
          +{seat.won!.toLocaleString("en-US")}
        </motion.div>
      ) : null}

      {/* Dealer / blind markers */}
      <div className="absolute -right-2 top-7 flex flex-col gap-0.5">
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
