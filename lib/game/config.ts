import type { GameVariant } from "@/lib/engine/types";

// Full game configuration surface, mirroring PokerNow's "Game Configurations".
// Core fields are enforced by the engine now; advanced flags are stored and
// surfaced in the UI, implemented incrementally.

export interface BlindLevel {
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  durationMin?: number | null; // null = no timer (∞)
}

export interface GameConfig {
  variant: GameVariant;
  blindLevels: BlindLevel[]; // level 0 used first; multi-level = tournament clock
  startingStack: number;
  maxSeats: number; // 2..10

  // Timing
  decisionSeconds: number | null; // null = no limit
  timeBankSeconds: number | null;
  handsToFillTimeBank: number;

  // Flow
  autoStartNextHand: boolean;
  showdownPresentationMs: number; // 3000 | 6000 | 9000
  dealToAwayPlayers: boolean;
  revealAllWhenNoAction: boolean;

  // Money / entry
  allowRebuy: boolean;
  useCents: boolean;

  // Table features
  rabbitHunting: boolean;
  runItTwice: "off" | "ask" | "always";
  allowStraddleUTG: boolean;
  bombPot: boolean;
  doubleBoard: "off" | "bombPot" | "always";
  bounty72: number | null; // 7-2 bounty amount, null = off
  nitGame: boolean;

  // Social
  spectatorMode: boolean;
  allowGuestChat: boolean;
  autoTrimExcessBets: boolean;

  // Cosmetic
  theme: "onyx" | "emerald" | "royal";
}

export const DEFAULT_CONFIG: GameConfig = {
  variant: "nlhe",
  blindLevels: [{ smallBlind: 25, bigBlind: 50, ante: 0, durationMin: null }],
  startingStack: 2500,
  maxSeats: 9,

  decisionSeconds: 30,
  timeBankSeconds: 30,
  handsToFillTimeBank: 10,

  autoStartNextHand: true,
  showdownPresentationMs: 6000,
  dealToAwayPlayers: false,
  revealAllWhenNoAction: true,

  allowRebuy: true,
  useCents: false,

  rabbitHunting: true,
  runItTwice: "off",
  allowStraddleUTG: false,
  bombPot: false,
  doubleBoard: "off",
  bounty72: null,
  nitGame: false,

  spectatorMode: false,
  allowGuestChat: true,
  autoTrimExcessBets: false,

  theme: "onyx",
};

export function activeBlinds(config: GameConfig): BlindLevel {
  return config.blindLevels[0] ?? DEFAULT_CONFIG.blindLevels[0];
}

/** Merge a partial config from the client onto the defaults (server-side). */
export function normalizeConfig(input: Partial<GameConfig>): GameConfig {
  return {
    ...DEFAULT_CONFIG,
    ...input,
    blindLevels:
      input.blindLevels && input.blindLevels.length > 0
        ? input.blindLevels
        : DEFAULT_CONFIG.blindLevels,
  };
}
