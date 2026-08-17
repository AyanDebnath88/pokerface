"use client";

import { useState } from "react";
import type { LegalActions } from "@/lib/engine/betting";
import { formatChips } from "@/lib/game/view";

// Presentational action bar. `onAction` is wired to a server action in the
// real game; the demo passes a no-op.
export function ActionBar({
  legal,
  bigBlind,
  onAction,
  disabled,
}: {
  legal: LegalActions;
  bigBlind: number;
  onAction?: (a: { type: string; to?: number }) => void;
  disabled?: boolean;
}) {
  const raiseFloor = legal.canBet ? legal.minBet : legal.minRaiseTo;
  const [amount, setAmount] = useState(raiseFloor);

  const act = (type: string, to?: number) => onAction?.({ type, to });
  const clamp = (v: number) =>
    Math.max(raiseFloor, Math.min(legal.maxTo, Math.round(v)));

  return (
    <div className="glass-strong rounded-xl p-2 flex flex-col gap-2 w-full max-w-lg">
      {(legal.canBet || legal.canRaise) && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={raiseFloor}
            max={legal.maxTo}
            step={bigBlind}
            value={amount}
            disabled={disabled}
            onChange={(e) => setAmount(clamp(Number(e.target.value)))}
            className="flex-1 accent-[var(--gold-500)]"
          />
          <div className="glass rounded-md px-2 py-1 text-xs tabular-nums text-gold-100 min-w-16 text-center">
            {formatChips(amount)}
          </div>
          <div className="flex gap-1">
            {[
              { label: "Min", v: () => raiseFloor },
              { label: "½", v: () => clamp(legal.maxTo * 0.5) },
              { label: "¾", v: () => clamp(legal.maxTo * 0.75) },
              { label: "Pot", v: () => legal.maxTo },
              { label: "Max", v: () => legal.maxTo },
            ].map((b) => (
              <button
                key={b.label}
                disabled={disabled}
                onClick={() => setAmount(b.v())}
                className="btn-ghost rounded-md px-2 py-1 text-[11px]"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        {legal.canFold && (
          <button
            disabled={disabled}
            onClick={() => act("fold")}
            className="btn-ghost rounded-lg px-4 py-2 flex-1 text-sm font-medium text-danger/90 border-danger/30"
          >
            Fold
          </button>
        )}
        {legal.canCheck ? (
          <button
            disabled={disabled}
            onClick={() => act("check")}
            className="btn-ghost rounded-lg px-4 py-2 flex-1 text-sm font-medium"
          >
            Check
          </button>
        ) : (
          legal.canCall && (
            <button
              disabled={disabled}
              onClick={() => act("call")}
              className="btn-ghost rounded-lg px-4 py-2 flex-1 text-sm font-medium"
            >
              Call {formatChips(legal.callAmount)}
            </button>
          )
        )}
        {(legal.canBet || legal.canRaise) && (
          <button
            disabled={disabled}
            onClick={() =>
              act(legal.canBet ? "bet" : "raise", amount)
            }
            className="btn-gold rounded-lg px-4 py-2 flex-1 text-sm"
          >
            {legal.canBet ? "Bet" : "Raise to"} {formatChips(amount)}
          </button>
        )}
      </div>
    </div>
  );
}
