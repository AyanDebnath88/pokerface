import { rankChar, suitOf, SUIT_SYMBOL, SUIT_IS_RED } from "@/lib/engine/cards";
import type { Card } from "@/lib/engine/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; rank: string; suit: string; pad: string }> = {
  sm: { box: "w-9 h-[3.1rem] rounded-[6px]", rank: "text-base", suit: "text-2xl", pad: "top-0.5 left-1" },
  md: { box: "w-12 h-[4.4rem] rounded-lg", rank: "text-xl", suit: "text-[2.1rem]", pad: "top-0.5 left-1.5" },
  lg: { box: "w-[4.6rem] h-[6.4rem] rounded-xl", rank: "text-3xl", suit: "text-[3.4rem]", pad: "top-1 left-2" },
};

export function PlayingCard({
  card,
  faceDown = false,
  size = "md",
  dimmed = false,
  glow = false,
}: {
  card?: Card;
  faceDown?: boolean;
  size?: Size;
  dimmed?: boolean;
  glow?: boolean;
}) {
  const s = SIZES[size];
  const glowCls = glow ? "ring-2 ring-win shadow-[0_0_18px_-2px_var(--win)]" : "";

  if (faceDown || !card) {
    return (
      <div className={`card-back ${s.box} shrink-0 relative overflow-hidden ${glowCls}`} aria-label="face-down card">
        <div className="absolute inset-[3px] rounded-[5px] border border-gold-500/45" />
      </div>
    );
  }

  const suit = suitOf(card);
  const red = SUIT_IS_RED[suit];
  const ink = red ? "#d21f3c" : "#141619";
  const rank = rankChar(card);
  const sym = SUIT_SYMBOL[suit];

  return (
    <div
      className={`playing-card ${s.box} shrink-0 relative overflow-hidden ${glowCls} ${dimmed ? "opacity-45 saturate-50" : ""}`}
      aria-label={`${rank} of ${suit}`}
      style={{ color: ink }}
    >
      <div className={`absolute ${s.pad} flex flex-col items-center leading-[0.82] font-sans`}>
        <span className={`font-bold ${s.rank} tracking-tighter`}>{rank}</span>
        <span className={`${s.suit} -mt-0.5 leading-none`}>{sym}</span>
      </div>
    </div>
  );
}
