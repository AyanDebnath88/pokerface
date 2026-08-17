"use client";

import { motion } from "motion/react";
import type { Card } from "@/lib/engine/types";
import { formatChips } from "@/lib/game/view";
import { PlayingCard } from "./PlayingCard";

export function CommunityBoard({
  board,
  pot,
}: {
  board: Card[];
  pot: number;
}) {
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
              key={i}
              initial={{ opacity: 0, y: -14, rotateY: 90 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
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
