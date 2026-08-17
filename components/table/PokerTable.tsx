"use client";

import type { TableView } from "@/lib/game/view";
import { VARIANT_LABEL, formatChips } from "@/lib/game/view";
import { SeatPod } from "./SeatPod";
import { CommunityBoard } from "./CommunityBoard";
import { ChipStack } from "./ChipStack";

// Seat positions (%) around an ellipse. Index 0 = bottom (viewer).
// Radii kept modest so 160px-wide pods stay inside the container.
function seatPositions(count: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.PI / 2 + (i / count) * Math.PI * 2;
    out.push({
      x: 50 + 45 * Math.cos(angle),
      y: 50 + 46 * Math.sin(angle),
    });
  }
  return out;
}

// Bet chips sit between a seat and the center: same angle, smaller radius.
function betPosition(x: number, y: number) {
  return { x: 50 + (x - 50) * 0.72, y: 50 + (y - 50) * 0.72 };
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
    <div className="w-full px-16 sm:px-24">
      <div className="relative w-full max-w-5xl mx-auto aspect-[16/12]">
        {/* Felt */}
        <div className="felt absolute inset-[13%] rounded-[46%] overflow-hidden">
        </div>

        {/* Table meta — centered in the empty top band */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[26%] z-10">
          <div className="glass rounded-full px-4 py-1.5 text-xs text-parchment flex items-center gap-2">
            <span className="text-gold-300 font-medium">
              {VARIANT_LABEL[view.variant]}
            </span>
            <span className="text-muted">·</span>
            <span className="tabular-nums">
              {formatChips(view.smallBlind)}/{formatChips(view.bigBlind)}
            </span>
          </div>
        </div>

        {/* Center board + pot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <CommunityBoard board={view.board} pot={view.pot} />
        </div>

        {/* Bet chips */}
        {view.seats.map((seat, i) => {
          if (!seat.playerId || seat.committed <= 0) return null;
          const bp = betPosition(positions[i].x, positions[i].y);
          return (
            <div
              key={`bet-${i}`}
              className="absolute z-20"
              style={{ left: `${bp.x}%`, top: `${bp.y}%`, transform: "translate(-50%,-50%)" }}
            >
              <ChipStack amount={seat.committed} />
            </div>
          );
        })}

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
