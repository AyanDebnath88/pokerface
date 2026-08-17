import { rankChar, suitOf, SUIT_SYMBOL, SUIT_IS_RED } from "@/lib/engine/cards";
import type { Card } from "@/lib/engine/types";

type Size = "sm" | "md" | "lg";

const SIZES: Record<
  Size,
  { box: string; index: string; suit: string; pip: string; corner: boolean }
> = {
  sm: { box: "w-8 h-11 rounded-[5px]", index: "text-[11px]", suit: "text-[8px]", pip: "text-base", corner: false },
  md: { box: "w-12 h-[4.2rem] rounded-lg", index: "text-base", suit: "text-[11px]", pip: "text-3xl", corner: true },
  lg: { box: "w-16 h-24 rounded-xl", index: "text-xl", suit: "text-sm", pip: "text-5xl", corner: true },
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
        <div className="absolute inset-1 rounded-[3px] border border-gold-500/25" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-gold-500/40 text-xs leading-none">♠</span>
        </div>
      </div>
    );
  }

  const suit = suitOf(card);
  const red = SUIT_IS_RED[suit];
  const color = red ? "text-[#c8323c]" : "text-[#16181f]";
  const rank = rankChar(card);
  const sym = SUIT_SYMBOL[suit];

  const Index = ({ rotated = false }: { rotated?: boolean }) => (
    <div className={`flex flex-col items-center leading-none ${color} ${rotated ? "rotate-180" : ""}`}>
      <span className={`font-semibold ${s.index} tracking-tight`}>{rank}</span>
      <span className={`${s.suit} -mt-0.5`}>{sym}</span>
    </div>
  );

  return (
    <div
      className={`playing-card ${s.box} shrink-0 relative overflow-hidden ${dimmed ? "opacity-45 saturate-50" : ""}`}
      aria-label={`${rank} of ${suit}`}
    >
      {/* Center pip */}
      <div className={`absolute inset-0 grid place-items-center ${color} opacity-90`}>
        <span className={`${s.pip} leading-none`}>{sym}</span>
      </div>
      {/* Top-left index */}
      <div className="absolute top-1 left-1">
        <Index />
      </div>
      {/* Bottom-right mirrored index (larger cards only) */}
      {s.corner && (
        <div className="absolute bottom-1 right-1">
          <Index rotated />
        </div>
      )}
    </div>
  );
}
