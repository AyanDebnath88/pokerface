"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeConfig, type GameConfig } from "@/lib/game/config";
import type { StoredGameState } from "@/lib/game/state";
import {
  dealHand,
  act as reduceAct,
  actingUserId,
  legalFor,
  nextButtonSeat,
  type SeatedPlayer,
  type GameEvent,
} from "@/lib/game/reducer";
import type { HandState, EngineAction } from "@/lib/engine/betting";
import type { Card } from "@/lib/engine/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

function genCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

/** Public copy safe for JSON (drops the engine's Map-bearing result). */
function sanitize(hand: HandState): HandState {
  return { ...hand, result: undefined };
}

type Row = Record<string, unknown>;

async function loadGame(code: string) {
  const svc = createServiceClient();
  const { data: game, error } = await svc
    .from("games")
    .select("*")
    .eq("code", code)
    .single();
  if (error || !game) throw new Error("Table not found");
  return game as Row & {
    id: string;
    config: GameConfig;
    state: StoredGameState;
    version: number;
    hand_no: number;
    button_seat: number | null;
    current_hand_id: string | null;
    status: string;
  };
}

async function nameMap(gameId: string): Promise<Record<string, string>> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("game_players")
    .select("user_id,name")
    .eq("game_id", gameId);
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[(r as Row).user_id as string] = (r as Row).name as string;
  return map;
}

async function writeEvents(
  gameId: string,
  handId: string | null,
  handNo: number,
  events: GameEvent[],
  names: Record<string, string>,
) {
  if (events.length === 0) return;
  const svc = createServiceClient();
  const base = Date.now();
  const rows = events.map((e, i) => {
    const common = { game_id: gameId, hand_id: handId, hand_no: handNo, seq: base + i };
    switch (e.kind) {
      case "blind":
        return { ...common, user_id: e.userId, name: names[e.userId], type: "blind", amount: e.amount, detail: { blind: e.blind } };
      case "deal-hole":
        return { ...common, type: "deal", detail: { what: "hole" } };
      case "action":
        return { ...common, user_id: e.userId, name: names[e.userId], street: e.street, type: e.type, amount: e.amount ?? null };
      case "board":
        return { ...common, type: "board", street: e.street, detail: { board: e.board, newCards: e.newCards } };
      case "win":
        return { ...common, user_id: e.userId, name: names[e.userId], type: "win", amount: e.amount, detail: { showdown: e.showdown, hand: e.hand ?? null } };
      case "uncalled-return":
        return { ...common, user_id: e.userId, name: names[e.userId], type: "uncalled", amount: e.amount };
    }
  });
  await svc.from("hand_actions").insert(rows);
}

/** Optimistic-concurrency commit of new public state. Throws on conflict. */
async function commitState(
  gameId: string,
  expectedVersion: number,
  patch: Row,
) {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("games")
    .update({ ...patch, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq("id", gameId)
    .eq("version", expectedVersion)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("CONFLICT"); // someone else moved first; client resyncs
  }
}

async function seatedPlayers(gameId: string): Promise<SeatedPlayer[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("game_players")
    .select("user_id,seat_index,stack,status")
    .eq("game_id", gameId)
    .eq("status", "seated")
    .not("seat_index", "is", null);
  return (data ?? [])
    .filter((r) => ((r as Row).stack as number) > 0)
    .map((r) => ({
      userId: (r as Row).user_id as string,
      seatIndex: (r as Row).seat_index as number,
      stack: (r as Row).stack as number,
    }));
}

// ---------------------------------------------------------------------------
// Profile / identity
// ---------------------------------------------------------------------------

export async function ensureProfile(name: string, avatarColor?: string) {
  const user = await requireUser();
  const svc = createServiceClient();
  await svc.from("profiles").upsert(
    {
      id: user.id,
      display_name: name,
      avatar_color: avatarColor ?? "#e6c65c",
      is_guest: user.is_anonymous ?? true,
    },
    { onConflict: "id" },
  );
  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Room lifecycle
// ---------------------------------------------------------------------------

export async function createGame(input: {
  name?: string;
  hostName: string;
  avatarColor?: string;
  config: Partial<GameConfig>;
}) {
  const user = await requireUser();
  const svc = createServiceClient();
  const config = normalizeConfig(input.config);

  await ensureProfile(input.hostName, input.avatarColor);

  let code = genCode();
  // Retry a couple of times on the (unlikely) code collision.
  for (let i = 0; i < 3; i++) {
    const { count } = await svc
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("code", code);
    if (!count) break;
    code = genCode();
  }

  const initialState: StoredGameState = {
    status: "lobby",
    handNo: 0,
    buttonSeat: null,
    hand: null,
    seatIndexByPlayer: {},
  };

  const { data: game, error } = await svc
    .from("games")
    .insert({
      code,
      name: input.name ?? null,
      host_id: user.id,
      config,
      status: "lobby",
      state: initialState,
      version: 0,
    })
    .select("id")
    .single();
  if (error) throw error;

  const gameId = (game as Row).id as string;
  await svc.from("game_secrets").insert({ game_id: gameId, deck: [] });
  await svc.from("game_players").insert({
    game_id: gameId,
    user_id: user.id,
    name: input.hostName,
    avatar_color: input.avatarColor ?? "#e6c65c",
    is_host: true,
    status: "waiting",
    seat_index: null,
    stack: 0,
  });

  return { code };
}

export async function joinGame(input: {
  code: string;
  name: string;
  avatarColor?: string;
}) {
  const user = await requireUser();
  const svc = createServiceClient();
  const game = await loadGame(input.code);
  await ensureProfile(input.name, input.avatarColor);

  // Insert membership if absent; never clobber an existing seat/stack.
  const { data: existing } = await svc
    .from("game_players")
    .select("user_id")
    .eq("game_id", game.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await svc.from("game_players").insert({
      game_id: game.id,
      user_id: user.id,
      name: input.name,
      avatar_color: input.avatarColor ?? "#e6c65c",
      status: "waiting",
      seat_index: null,
      stack: 0,
    });
  }
  return { code: input.code };
}

export async function sitDown(input: {
  code: string;
  seatIndex: number;
  buyIn: number;
}) {
  const user = await requireUser();
  const svc = createServiceClient();
  const game = await loadGame(input.code);

  if (input.seatIndex < 0 || input.seatIndex >= game.config.maxSeats)
    throw new Error("Invalid seat");

  const { data: taken } = await svc
    .from("game_players")
    .select("user_id")
    .eq("game_id", game.id)
    .eq("seat_index", input.seatIndex)
    .maybeSingle();
  if (taken && (taken as Row).user_id !== user.id)
    throw new Error("Seat taken");

  await svc
    .from("game_players")
    .update({
      seat_index: input.seatIndex,
      stack: input.buyIn,
      buy_in_total: input.buyIn,
      status: "seated",
    })
    .eq("game_id", game.id)
    .eq("user_id", user.id);

  return { ok: true };
}

export async function leaveSeat(input: { code: string }) {
  const user = await requireUser();
  const svc = createServiceClient();
  const game = await loadGame(input.code);
  await svc
    .from("game_players")
    .update({ seat_index: null, status: "left", buy_out_total: 0 })
    .eq("game_id", game.id)
    .eq("user_id", user.id);
  return { ok: true };
}

export async function setPaused(input: { code: string; paused: boolean }) {
  const user = await requireUser();
  const game = await loadGame(input.code);
  if (game.host_id !== user.id) throw new Error("Only the host can pause");
  const state = game.state;
  state.status = input.paused ? "paused" : "running";
  await commitState(game.id, game.version, {
    status: input.paused ? "paused" : "running",
    state,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Gameplay
// ---------------------------------------------------------------------------

export async function sendChat(input: { code: string; body: string }) {
  const user = await requireUser();
  const svc = createServiceClient();
  const game = await loadGame(input.code);
  const body = input.body.trim().slice(0, 400);
  if (!body) return { ok: false };

  const { data: me } = await svc
    .from("game_players")
    .select("name,is_host")
    .eq("game_id", game.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Join the table to chat");

  const isGuest = user.is_anonymous ?? true;
  if (isGuest && !game.config.allowGuestChat && !(me as Row).is_host)
    throw new Error("Guests can't chat at this table");

  await svc.from("chat_messages").insert({
    game_id: game.id,
    user_id: user.id,
    name: (me as Row).name,
    body,
    kind: "chat",
  });
  return { ok: true };
}

export async function startNextHand(input: { code: string }) {
  const user = await requireUser();
  const svc = createServiceClient();
  const game = await loadGame(input.code);

  // Host, or any player when auto-start is on.
  if (game.host_id !== user.id && !game.config.autoStartNextHand)
    throw new Error("Only the host can start the hand");

  const seated = await seatedPlayers(game.id);
  if (seated.length < 2) throw new Error("Need at least 2 seated players");

  const buttonSeat = nextButtonSeat(seated, game.button_seat);
  const deal = dealHand(game.config, seated, buttonSeat);
  const handNo = game.hand_no + 1;

  const { data: handRow, error: handErr } = await svc
    .from("hands")
    .insert({
      game_id: game.id,
      hand_no: handNo,
      variant: game.config.variant,
      board: [],
      street: deal.publicHand.street,
    })
    .select("id")
    .single();
  if (handErr) throw handErr;
  const handId = (handRow as Row).id as string;

  const newState: StoredGameState = {
    status: "running",
    handNo,
    buttonSeat,
    hand: sanitize(deal.publicHand),
    seatIndexByPlayer: deal.seatIndexByPlayer,
  };
  const deadline = game.config.decisionSeconds
    ? new Date(Date.now() + game.config.decisionSeconds * 1000).toISOString()
    : null;

  await commitState(game.id, game.version, {
    status: "running",
    state: newState,
    button_seat: buttonSeat,
    hand_no: handNo,
    current_hand_id: handId,
    acting_deadline: deadline,
  });

  await svc.from("game_secrets").update({ deck: deal.deck }).eq("game_id", game.id);
  await svc.from("hand_hole_cards").insert(
    deal.holeCards.map((h) => ({
      hand_id: handId,
      game_id: game.id,
      user_id: h.userId,
      seat_index: h.seatIndex,
      cards: h.cards,
    })),
  );

  await writeEvents(game.id, handId, handNo, deal.events, await nameMap(game.id));
  return { ok: true };
}

export async function act(input: { code: string; action: EngineAction }) {
  const user = await requireUser();
  return applyActionInternal(input.code, user.id, input.action, false);
}

/** Force the acting player to time out (auto check/fold) if the clock expired. */
export async function timeoutCheck(input: { code: string }) {
  const svc = createServiceClient();
  const game = await loadGame(input.code);
  if (game.status !== "running" || !game.state.hand) return { ok: false };
  if (!game.acting_deadline || new Date(game.acting_deadline as string) > new Date())
    return { ok: false };

  const uid = actingUserId(game.state.hand);
  if (!uid) return { ok: false };
  const legal = legalFor(game.state.hand);
  const action: EngineAction = legal.canCheck ? { type: "check" } : { type: "fold" };
  return applyActionInternal(input.code, uid, action, true);
}

async function applyActionInternal(
  code: string,
  actorUserId: string,
  action: EngineAction,
  systemForced: boolean,
) {
  const svc = createServiceClient();
  const game = await loadGame(code);
  const state = game.state;
  if (game.status !== "running" || !state.hand || state.hand.status !== "betting")
    throw new Error("No hand in progress");

  const expected = actingUserId(state.hand);
  if (expected !== actorUserId) {
    if (!systemForced) throw new Error("Not your turn");
    return { ok: false };
  }

  // Load secrets.
  const { data: secret } = await svc
    .from("game_secrets")
    .select("deck")
    .eq("game_id", game.id)
    .single();
  const deck = ((secret as Row)?.deck as Card[]) ?? [];

  const { data: holeRows } = await svc
    .from("hand_hole_cards")
    .select("user_id,cards")
    .eq("hand_id", game.current_hand_id!);
  const holeByPlayer: Record<string, Card[]> = {};
  for (const r of holeRows ?? [])
    holeByPlayer[(r as Row).user_id as string] = (r as Row).cards as Card[];

  const r = reduceAct(game.config, state.hand, deck, holeByPlayer, actorUserId, action);

  const newState: StoredGameState = { ...state, hand: sanitize(r.publicHand) };
  const stillBetting = r.publicHand.status === "betting";
  const deadline =
    stillBetting && game.config.decisionSeconds
      ? new Date(Date.now() + game.config.decisionSeconds * 1000).toISOString()
      : null;

  if (r.complete) {
    (newState as StoredGameState & { lastResult?: unknown }).lastResult = {
      winnings: r.winnings,
      shown: r.shown,
      shownCards: r.shownCards,
      board: r.publicHand.board,
    };
  }

  await commitState(game.id, game.version, {
    state: newState,
    acting_deadline: deadline,
  });
  await svc.from("game_secrets").update({ deck: r.deck }).eq("game_id", game.id);

  const names = await nameMap(game.id);
  await writeEvents(game.id, game.current_hand_id, state.handNo, r.events, names);

  if (r.complete) {
    // Settle stacks back to game_players; record winners + hand result.
    const seatStack = r.publicHand.seats;
    for (const seat of seatStack) {
      await svc
        .from("game_players")
        .update({ stack: seat.stack })
        .eq("game_id", game.id)
        .eq("user_id", seat.playerId);
    }
    await svc
      .from("hands")
      .update({
        board: r.publicHand.board,
        street: "showdown",
        result: { winnings: r.winnings, shown: r.shown, shownCards: r.shownCards },
        ended_at: new Date().toISOString(),
      })
      .eq("id", game.current_hand_id!);
  }

  return { ok: true, complete: r.complete };
}
