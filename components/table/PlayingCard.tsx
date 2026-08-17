import { rankChar, suitOf, SUIT_SYMBOL, SUIT_IS_RED } from "@/lib/engine/cards";
import type { Card } from "@/lib/engine/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<
  Size,
  { box: string; rank: string; suit: string; pip: string }
> = {
  sm: { box: "w-8 h-11 rounded-[5px]", rank: "text-[15px]", suit: "text-[9px]", pip: "text-xl" },
  md: { box: "w-11 h-16 rounded-md", rank: "text-xl", suit: "text-xs", pip: "text-[2rem]" },
  lg: { box: "w-16 h-24 rounded-lg", rank: "text-3xl", suit: "text-lg", pip: "text-5xl" },
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
        <div className="absolute inset-[3px] rounded-[4px] border border-gold-500/45" />
      </div>
    );
  }

  const suit = suitOf(card);
  const red = SUIT_IS_RED[suit];
  const ink = red ? "#c8102e" : "#14161c";
  const rank = rankChar(card);
  const sym = SUIT_SYMBOL[suit];

  return (
    <div
      className={`playing-card ${s.box} shrink-0 relative overflow-hidden ${dimmed ? "opacity-45 saturate-50" : ""}`}
      aria-label={`${rank} of ${suit}`}
      style={{ color: ink }}
    >
      {/* Large colored center suit */}
      <span className={`absolute inset-0 grid place-items-center ${s.pip} leading-none opacity-95`}>
        {sym}
      </span>
      {/* Top-left index: royal rank over colored suit */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-[0.85]">
        <span
          className={`font-semibold ${s.rank} tracking-tight`}
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {rank}
        </span>
        <span className={s.suit}>{sym}</span>
      </div>
    </div>
  );
}
