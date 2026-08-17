import { formatChips } from "@/lib/game/view";

// A small stack of chips with an amount label, used for bets in front of seats
// and the central pot.
export function ChipStack({
  amount,
  label,
}: {
  amount: number;
  label?: string;
}) {
  if (amount <= 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-5 h-5">
        <span className="absolute inset-0 rounded-full bg-[var(--chip-red)] border border-white/40 shadow-md translate-y-[-3px]" />
        <span className="absolute inset-0 rounded-full bg-[var(--chip-blue)] border border-white/40 shadow-md translate-y-[-1.5px]" />
        <span className="absolute inset-0 rounded-full bg-[var(--chip-black)] border border-gold-500/50 shadow-md" />
      </div>
      <span className="text-xs font-medium text-gold-100 tabular-nums">
        {label ?? formatChips(amount)}
      </span>
    </div>
  );
}
