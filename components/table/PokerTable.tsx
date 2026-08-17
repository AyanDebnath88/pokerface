"use client";

import type { TableView } from "@/lib/game/view";
import { VARIANT_LABEL, formatChips } from "@/lib/game/view";
import { SeatPod } from "./SeatPod";
import { CommunityBoard } from "./CommunityBoard";

// Seat positions (%) around an ellipse. Index 0 = bottom (viewer). Radii are
// larger than the felt so pods sit in the dark ring around the lit table.
function seatPositions(count: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.PI / 2 + (i / count) * Math.PI * 2;
    out.push({
      x: 50 + 47 * Math.cos(angle),
      y: 50 + 44 * Math.sin(angle),
    });
  }
  return out;
}

export function PokerTable({
  view,
  viewerSeatIndex,
  showAllCards = false,
}: {
  view: TableView;
  viewerSeatIndex?: number;
  showAllCards?: boolean;
}) {
  const positions = seatPositions(view.seats.length);

  return (
    <div className="w-full px-10 sm:px-16 lg:px-20">
      <div className="relative w-full max-w-4xl mx-auto aspect-[10/11] sm:aspect-[16/11]">
        {/* Felt — a wide lit table, seats sit around its rail */}
        <div className="felt absolute top-[11%] bottom-[11%] left-[15%] right-[15%] rounded-[46%]">
          <div className="absolute inset-0 grid place-items-center">
            <div className="font-display text-base tracking-[0.4em] text-gold-500/12 uppercase translate-y-20">
              PokerFace
            </div>
          </div>
        </div>

        {/* Stakes chip, top-left corner of the room */}
        <div className="hidden sm:block absolute left-3 top-1 z-10">
          <div className="rounded-full px-3 py-1 text-[11px] text-parchment/70 flex items-center gap-1.5">
            <span className="text-gold-300/80 font-medium">{VARIANT_LABEL[view.variant]}</span>
            <span className="text-muted">·</span>
            <span className="tabular-nums">{formatChips(view.smallBlind)}/{formatChips(view.bigBlind)}</span>
          </div>
        </div>

        {/* Center board + pot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <CommunityBoard board={view.board} pot={view.pot} />
        </div>

        {/* Seats */}
        {view.seats.map((seat, i) => (
          <div
            key={i}
            className="absolute z-30"
            style={{
              left: `${positions[i].x}%`,
              top: `${positions[i].y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <SeatPod
              seat={seat}
              active={view.activeSeatIndex === i}
              showHoleCards={showAllCards || viewerSeatIndex === i}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
