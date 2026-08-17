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
      x: 50 + 48 * Math.cos(angle),
      y: 50 + 45 * Math.sin(angle),
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
        {/* Felt — a lit island (narrower than the seat ring so pods clear it) */}
        <div className="felt absolute top-[15%] bottom-[15%] left-[26%] right-[26%] rounded-[46%]">
          <div className="absolute inset-0 grid place-items-center">
            <div className="font-display text-sm tracking-[0.4em] text-gold-500/12 uppercase translate-y-16">
              PokerFace
            </div>
          </div>
        </div>

        {/* Table meta — small chip above the pot */}
        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-[27%] z-10">
          <div className="rounded-full px-3 py-1 text-[11px] text-parchment/80 flex items-center gap-1.5 bg-black/25 backdrop-blur-sm">
            <span className="text-gold-300/90 font-medium">{VARIANT_LABEL[view.variant]}</span>
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
