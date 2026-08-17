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
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <div className="text-center">
        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-gold-300/70">
          Pot
        </div>
        <div className="font-display text-2xl sm:text-3xl text-gilt tabular-nums leading-tight">
          {pot > 0 ? formatChips(pot) : "—"}
        </div>
      </div>
      <div className="flex gap-1 sm:gap-2 scale-[0.72] sm:scale-100 origin-top">
        {Array.from({ length: 5 }).map((_, i) => {
          const card = board[i];
          return card ? (
            <motion.div
              key={card}
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-10px) scale(0.94)" }}
              animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
              transition={{ delay: reduce ? 0 : i * 0.045, duration: 0.28, ease: EASE_OUT }}
            >
              <PlayingCard card={card} size="md" />
            </motion.div>
          ) : (
            <div
              key={i}
              className="w-12 h-16 rounded-lg border border-dashed border-gold-500/20 bg-white/[0.02]"
            />
          );
        })}
      </div>
    </div>
  );
}
