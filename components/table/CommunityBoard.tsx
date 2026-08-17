"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Card } from "@/lib/engine/types";
import { formatChips } from "@/lib/game/view";
import { PlayingCard } from "./PlayingCard";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function CommunityBoard({
  board,
  pot,
}: {
  board: Card[];
  pot: number;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      {/* Pot pill */}
      <div className="rounded-full px-5 py-1.5 bg-black/35 backdrop-blur-sm border border-gold-500/20 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-gold-300/70">Pot</span>
        <span className="font-display text-lg text-gilt tabular-nums leading-none">
          {pot > 0 ? formatChips(pot) : "—"}
        </span>
      </div>

      {/* Board */}
      <div className="flex gap-1.5 scale-[0.78] sm:scale-100 origin-top">
        {Array.from({ length: 5 }).map((_, i) => {
          const card = board[i];
          return card ? (
            <motion.div
              key={card}
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-10px) scale(0.94)" }}
              animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
              transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.28, ease: EASE_OUT }}
            >
              <PlayingCard card={card} size="md" />
            </motion.div>
          ) : (
            <div
              key={i}
              className="w-12 h-[4.4rem] rounded-lg border border-dashed border-white/10 bg-white/[0.015]"
            />
          );
        })}
      </div>
    </div>
  );
}
