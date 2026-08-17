import { rankChar, suitOf, SUIT_SYMBOL, SUIT_IS_RED } from "@/lib/engine/cards";
import type { Card } from "@/lib/engine/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "w-8 h-11 text-sm rounded-md",
  md: "w-12 h-16 text-lg rounded-lg",
  lg: "w-16 h-24 text-2xl rounded-xl",
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
  const sizeClass = SIZES[size];

  if (faceDown || !card) {
    return (
      <div
        className={`card-back ${sizeClass} shrink-0`}
        aria-label="face-down card"
      >
        <div className="w-full h-full grid place-items-center">
          <span className="text-gold-500/40 font-display text-xs">♣</span>
        </div>
      </div>
    );
  }

  const suit = suitOf(card);
  const red = SUIT_IS_RED[suit];
  const color = red ? "text-[#c02a35]" : "text-[#14161c]";

  return (
    <div
      className={`playing-card ${sizeClass} shrink-0 relative flex flex-col justify-between p-1 leading-none ${
        dimmed ? "opacity-45 saturate-50" : ""
      }`}
      aria-label={`${rankChar(card)} of ${suit}`}
    >
      <span className={`font-semibold ${color}`}>{rankChar(card)}</span>
      <span className={`self-center text-[1.4em] ${color}`}>
        {SUIT_SYMBOL[suit]}
      </span>
      <span className={`font-semibold self-end rotate-180 ${color}`}>
        {rankChar(card)}
      </span>
    </div>
  );
}
