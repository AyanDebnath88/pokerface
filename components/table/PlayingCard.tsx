import { rankChar, suitOf, SUIT_SYMBOL, SUIT_IS_RED } from "@/lib/engine/cards";
import type { Card } from "@/lib/engine/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<
  Size,
  { box: string; rank: string; suit: string; watermark: string }
> = {
  sm: { box: "w-8 h-11 rounded-md", rank: "text-sm", suit: "text-[9px]", watermark: "text-lg" },
  md: { box: "w-11 h-16 rounded-lg", rank: "text-xl", suit: "text-xs", watermark: "text-3xl" },
  lg: { box: "w-16 h-24 rounded-xl", rank: "text-3xl", suit: "text-base", watermark: "text-5xl" },
};

export function PlayingCard({
  card,
  faceDown = false,
  size = "md",
  dimmed = false,
}: {
  card?: Card;
  faceDown?: boolean;
  size?: Size;
  dimmed?: boolean;
}) {
  const s = SIZES[size];

  if (faceDown || !card) {
    return (
      <div className={`card-back ${s.box} shrink-0 relative overflow-hidden`} aria-label="face-down card">
        <div className="absolute inset-[3px] rounded-[4px] border border-gold-500/20" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-gold-500/35 text-sm leading-none">♠</span>
        </div>
      </div>
    );
  }

  const suit = suitOf(card);
  const red = SUIT_IS_RED[suit];
  const ink = red ? "#c02b38" : "#1a1c22";
  const rank = rankChar(card);
  const sym = SUIT_SYMBOL[suit];

  return (
    <div
      className={`playing-card ${s.box} shrink-0 relative overflow-hidden ${dimmed ? "opacity-45 saturate-50" : ""}`}
      aria-label={`${rank} of ${suit}`}
      style={{ color: ink }}
    >
      {/* Soft center watermark */}
      <span
        className={`absolute right-1 bottom-0.5 ${s.watermark} leading-none opacity-15 select-none`}
      >
        {sym}
      </span>
      {/* Top-left index: rank over suit */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span className={`font-semibold ${s.rank} tracking-tight`}>{rank}</span>
        <span className={`${s.suit} -mt-px`}>{sym}</span>
      </div>
    </div>
  );
}
