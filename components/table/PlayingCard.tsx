import { rankChar, suitOf, SUIT_SYMBOL, SUIT_IS_RED } from "@/lib/engine/cards";
import type { Card } from "@/lib/engine/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; rank: string; corner: string; pip: string }> = {
  sm: { box: "w-8 h-11 rounded-md", rank: "text-[13px]", corner: "text-[8px]", pip: "text-lg" },
  md: { box: "w-11 h-16 rounded-lg", rank: "text-lg", corner: "text-[11px]", pip: "text-2xl" },
  lg: { box: "w-16 h-24 rounded-xl", rank: "text-2xl", corner: "text-sm", pip: "text-4xl" },
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
        <div className="absolute inset-[3px] rounded-[4px] border border-gold-500/30" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-gold-300/60 text-sm leading-none">♠</span>
        </div>
      </div>
    );
  }

  const suit = suitOf(card);
  const red = SUIT_IS_RED[suit];
  const ink = red ? "#c8102e" : "#101216";
  const rank = rankChar(card);
  const sym = SUIT_SYMBOL[suit];

  return (
    <div
      className={`playing-card ${s.box} shrink-0 relative overflow-hidden ${dimmed ? "opacity-45 saturate-50" : ""}`}
      aria-label={`${rank} of ${suit}`}
      style={{ color: ink }}
    >
      {/* Colored center pip */}
      <span className={`absolute inset-0 grid place-items-center ${s.pip} leading-none`}>{sym}</span>
      {/* Top-left index: royal rank over colored suit */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span
          className={`font-semibold ${s.rank} tracking-tight`}
          style={{ fontFamily: "var(--font-card), Georgia, serif" }}
        >
          {rank}
        </span>
        <span className={`${s.corner} -mt-px`}>{sym}</span>
      </div>
    </div>
  );
}
