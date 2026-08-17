"use client";

import { useState } from "react";
import { formatChips } from "@/lib/game/view";
import { Overlay } from "./Overlay";

export function SitModal({
  seat,
  min,
  defaultBuyIn,
  onConfirm,
  onClose,
  title = "Buy in",
  confirmVerb = "Sit with",
  subtitle,
}: {
  seat: number;
  min: number;
  defaultBuyIn: number;
  onConfirm: (buyIn: number) => void;
  onClose: () => void;
  title?: string;
  confirmVerb?: string;
  subtitle?: string;
}) {
  const [buyIn, setBuyIn] = useState(defaultBuyIn);
  const max = Math.max(defaultBuyIn * 4, min * 10);

  return (
    <Overlay>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-2xl text-cream">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-cream text-lg">×</button>
        </div>
        <p className="text-sm text-parchment/60 mb-5">{subtitle ?? `Seat ${seat + 1}`}</p>

        <div className="text-center font-display text-3xl text-gilt mb-4 tabular-nums">
          {formatChips(buyIn)}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={min}
          value={buyIn}
          onChange={(e) => setBuyIn(Number(e.target.value))}
          className="w-full accent-[var(--gold-500)] mb-5"
        />
        <button onClick={() => onConfirm(buyIn)} className="btn-gold rounded-xl px-6 py-3 w-full">
          {confirmVerb} {formatChips(buyIn)}
        </button>
      </div>
    </Overlay>
  );
}
