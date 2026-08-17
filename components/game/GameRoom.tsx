"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ensureSession, getSupabase } from "@/lib/auth-client";
import type { GameConfig } from "@/lib/game/config";
import type { StoredGameState } from "@/lib/game/state";
import { projectTable, type PlayerRow } from "@/lib/game/project";
import { legalFor, actingUserId } from "@/lib/game/reducer";
import type { Card } from "@/lib/engine/types";
import {
  ensureProfile,
  joinGame,
  sitDown,
  rebuy,
  startNextHand,
  act,
  setPaused,
  timeoutCheck,
  sendChat,
} from "@/app/actions/game";
import { PokerTable } from "@/components/table/PokerTable";
import { ActionBar } from "@/components/table/ActionBar";
import { SitModal } from "./SitModal";
import { Overlay } from "./Overlay";
import { TopNav } from "@/components/ui/TopNav";
import { SidePanel, type LogRow, type ChatRow } from "./SidePanel";

interface LastResult {
  winnings?: Record<string, number>;
  shown?: Record<string, string>;
  shownCards?: Record<string, Card[]>;
  board?: Card[];
}
interface GameRow {
  id: string;
  config: GameConfig;
  state: StoredGameState & { lastResult?: LastResult };
  version: number;
  status: string;
  host_id: string;
  current_hand_id: string | null;
  hand_no: number;
  acting_deadline: string | null;
  name: string | null;
}

export function GameRoom({ code }: { code: string }) {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [myHole, setMyHole] = useState<Card[] | undefined>();
  const [log, setLog] = useState<LogRow[]>([]);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sitSeat, setSitSeat] = useState<number | null>(null);
  const [rebuyOpen, setRebuyOpen] = useState(false);
  const [needName, setNeedName] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timedOut = useRef<string | null>(null);
  const autoStarted = useRef<string | null>(null);

  // ---- fetching ----------------------------------------------------------
  const fetchGame = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.from("games").select("*").eq("code", code).maybeSingle();
    if (data) setGame(data as unknown as GameRow);
    return data as unknown as GameRow | null;
  }, [supabase, code]);

  const fetchPlayers = useCallback(
    async (gameId: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("game_players")
        .select("user_id,seat_index,name,avatar_color,stack,status,is_host,buy_in_total,buy_out_total")
        .eq("game_id", gameId)
        .order("seat_index", { nullsFirst: false });
      setPlayers((data ?? []) as unknown as PlayerRow[]);
    },
    [supabase],
  );

  const fetchHole = useCallback(
    async (handId: string | null) => {
      if (!supabase) return;
      if (!handId) return setMyHole(undefined);
      const { data } = await supabase
        .from("hand_hole_cards")
        .select("cards")
        .eq("hand_id", handId)
        .maybeSingle();
      setMyHole(data ? ((data as { cards: Card[] }).cards) : undefined);
    },
    [supabase],
  );

  const fetchLog = useCallback(
    async (gameId: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("hand_actions")
        .select("id,name,type,amount,street,detail,hand_no,user_id")
        .eq("game_id", gameId)
        .order("id", { ascending: false })
        .limit(120);
      setLog((data ?? []) as unknown as LogRow[]);
    },
    [supabase],
  );

  const fetchChat = useCallback(
    async (gameId: string) => {
      if (!supabase) return;
      const { data } = await supabase
        .from("chat_messages")
        .select("id,name,body,kind,user_id")
        .eq("game_id", gameId)
        .order("id", { ascending: true })
        .limit(200);
      setChat((data ?? []) as unknown as ChatRow[]);
    },
    [supabase],
  );

  // ---- bootstrap + realtime ---------------------------------------------
  useEffect(() => {
    if (!supabase) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      try {
        const uid = await ensureSession();
        setViewerId(uid);
        const g = await fetchGame();
        if (!g) {
          setError("Table not found");
          return;
        }
        await Promise.all([
          fetchPlayers(g.id),
          fetchHole(g.current_hand_id),
          fetchLog(g.id),
          fetchChat(g.id),
        ]);

        channel = supabase
          .channel(`game:${g.id}:${Math.random().toString(36).slice(2)}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${g.id}` }, async () => {
            const ng = await fetchGame();
            if (ng) await fetchHole(ng.current_hand_id);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${g.id}` }, () => fetchPlayers(g.id))
          .on("postgres_changes", { event: "*", schema: "public", table: "hand_actions", filter: `game_id=eq.${g.id}` }, () => fetchLog(g.id))
          .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `game_id=eq.${g.id}` }, () => fetchChat(g.id))
          .on("postgres_changes", { event: "*", schema: "public", table: "hand_hole_cards", filter: `game_id=eq.${g.id}` }, async () => {
            const cur = await fetchGame();
            if (cur) fetchHole(cur.current_hand_id);
          })
          .subscribe();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Am I a member? If not, prompt for a name to join.
  useEffect(() => {
    if (!viewerId || !game) return;
    setNeedName(!players.some((p) => p.user_id === viewerId));
  }, [viewerId, game, players]);

  // ---- action clock ------------------------------------------------------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!game || game.status !== "running" || !game.acting_deadline) return;
    const deadline = new Date(game.acting_deadline).getTime();
    if (now >= deadline && timedOut.current !== game.acting_deadline) {
      timedOut.current = game.acting_deadline;
      timeoutCheck({ code }).catch(() => {});
    }
  }, [now, game, code]);

  // ---- auto-start next hand ----------------------------------------------
  useEffect(() => {
    if (!game) return;
    const hand = game.state.hand;
    const done = hand && hand.status === "complete";
    const key = `${game.hand_no}`;
    if (
      done &&
      game.config.autoStartNextHand &&
      autoStarted.current !== key &&
      players.filter((p) => p.seat_index !== null && p.stack > 0 && p.status === "seated").length >= 2
    ) {
      autoStarted.current = key;
      const delay = game.config.showdownPresentationMs ?? 4000;
      const id = setTimeout(() => startNextHand({ code }).catch(() => {}), delay);
      return () => clearTimeout(id);
    }
  }, [game, players, code]);

  if (!supabase) {
    return (
      <Centered>
        <div className="glass-strong rounded-2xl p-8 text-center max-w-md">
          <div className="font-display text-2xl text-cream mb-2">Almost there</div>
          <p className="text-sm text-parchment/70">
            Add your Supabase keys to <code className="text-gold-300">.env.local</code> and
            run the migration to bring tables online. See <code className="text-gold-300">SETUP.md</code>.
          </p>
        </div>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <div className="glass-strong rounded-2xl p-8 text-center">
          <div className="font-display text-2xl text-cream mb-2">{error}</div>
          <Link href="/" className="text-gold-300 text-sm">Back home</Link>
        </div>
      </Centered>
    );
  }
  if (!game || !viewerId) return <Centered><Spinner /></Centered>;

  const handComplete = game.state.hand?.status === "complete";
  const shownCards = handComplete ? game.state.lastResult?.shownCards : undefined;

  const view = projectTable(code, game.config, game.state, players, {
    viewerId,
    myHoleCards: myHole,
    shown: shownCards,
    winnings: handComplete ? game.state.lastResult?.winnings : undefined,
    shownDesc: handComplete ? game.state.lastResult?.shown : undefined,
  });

  const hand = game.state.hand;
  const myTurn =
    game.status === "running" &&
    hand?.status === "betting" &&
    actingUserId(hand) === viewerId;
  const legal = myTurn && hand ? legalFor(hand) : null;

  const me = players.find((p) => p.user_id === viewerId);
  const iAmSeated = !!me && me.seat_index !== null;
  const isHost = game.host_id === viewerId;
  const seatedCount = players.filter(
    (p) => p.seat_index !== null && p.stack > 0 && p.status === "seated",
  ).length;
  const canDeal =
    (isHost || game.config.autoStartNextHand) &&
    seatedCount >= 2 &&
    (!hand || hand.status === "complete");

  const deadline = game.acting_deadline ? new Date(game.acting_deadline).getTime() : null;
  const secondsLeft =
    deadline && myTurn ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  async function onSit(seat: number, buyIn: number) {
    try {
      await sitDown({ code, seatIndex: seat, buyIn });
      setSitSeat(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sit");
    }
  }

  async function doAct(a: { type: string; to?: number }) {
    const map: Record<string, unknown> = a.to !== undefined ? { type: a.type, to: a.to } : { type: a.type };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await act({ code, action: map as any });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <main className="flex-1 flex flex-col lg:flex-row min-h-0 poker-room">
      {/* Left: table */}
      <div className="flex-1 flex flex-col min-h-0">
        <RoomHeader code={code} name={game.name} status={game.status} isHost={isHost} onPause={() => setPaused({ code, paused: game.status !== "paused" })} />

        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-2 py-4">
          <div className="relative w-full">
            <PokerTable view={view} viewerSeatIndex={me?.seat_index ?? undefined} showAllCards={!!shownCards} />
            {game.status === "paused" && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="glass-strong rounded-xl px-6 py-3 text-gold-200 font-display text-lg">
                  Host paused the game
                </div>
              </div>
            )}
            {/* Empty-seat sit buttons for a seated-less member */}
            {!iAmSeated && !needName && (
              <SeatPicker maxSeats={game.config.maxSeats} taken={players.map((p) => p.seat_index).filter((s): s is number => s !== null)} onPick={setSitSeat} />
            )}
          </div>

          {/* Action zone */}
          <div className="w-full max-w-xl px-4">
            {myTurn && legal ? (
              <div className="flex flex-col items-center gap-2">
                {secondsLeft !== null && (
                  <div className="text-xs text-gold-300">Your action · {secondsLeft}s</div>
                )}
                <ActionBar legal={legal} bigBlind={view.bigBlind} onAction={doAct} />
              </div>
            ) : canDeal ? (
              <div className="flex justify-center">
                <button onClick={() => startNextHand({ code })} className="btn-gold rounded-full px-10 py-3">
                  {game.hand_no === 0 ? "Deal first hand" : "Deal next hand"}
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-muted">
                {seatedCount < 2 ? "Waiting for players to sit down…" : "Waiting for the next action…"}
              </div>
            )}
            {iAmSeated && game.config.allowRebuy && !myTurn && (
              <div className="text-center mt-2">
                <button
                  onClick={() => setRebuyOpen(true)}
                  className="text-xs text-gold-300/80 hover:text-gold-200 underline underline-offset-2"
                >
                  + Add chips
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: chat + log */}
      <SidePanel
        code={code}
        players={players}
        log={log}
        chat={chat}
        viewerId={viewerId}
        lastResult={game.state.lastResult}
        onSend={(body) => sendChat({ code, body }).catch(() => {})}
      />

      {sitSeat !== null && (
        <SitModal
          seat={sitSeat}
          min={view.bigBlind * 20}
          defaultBuyIn={game.config.startingStack}
          onConfirm={(v) => onSit(sitSeat, v)}
          onClose={() => setSitSeat(null)}
        />
      )}

      {rebuyOpen && (
        <SitModal
          seat={me?.seat_index ?? 0}
          min={view.bigBlind * 10}
          defaultBuyIn={game.config.startingStack}
          title="Add chips"
          confirmVerb="Add"
          subtitle="Top up your stack"
          onConfirm={async (v) => {
            try {
              await rebuy({ code, amount: v });
              setRebuyOpen(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not add chips");
            }
          }}
          onClose={() => setRebuyOpen(false)}
        />
      )}

      {needName && (
        <NameOverlay
          onJoin={async (name) => {
            await ensureProfile(name);
            await joinGame({ code, name });
            setNeedName(false);
          }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------

function RoomHeader({ code, name, status, isHost, onPause }: { code: string; name: string | null; status: string; isHost: boolean; onPause: () => void }) {
  const [copied, setCopied] = useState(false);
  const share = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/game/${code}` : "";
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-gold-500/10">
      <Link href="/" className="font-display text-lg text-gilt">PokerFace</Link>
      <div className="flex items-center gap-2">
        {name && <span className="text-sm text-parchment/70 hidden sm:block">{name}</span>}
        <button onClick={share} className="btn-ghost rounded-lg px-3 py-1.5 text-xs">
          {copied ? "Link copied" : `Share · ${code}`}
        </button>
        {isHost && (
          <button onClick={onPause} className="btn-ghost rounded-lg px-3 py-1.5 text-xs">
            {status === "paused" ? "Resume" : "Pause"}
          </button>
        )}
        <TopNav />
      </div>
    </header>
  );
}

function SeatPicker({ maxSeats, taken, onPick }: { maxSeats: number; taken: number[]; onPick: (s: number) => void }) {
  const open = Array.from({ length: maxSeats }, (_, i) => i).filter((i) => !taken.includes(i));
  if (open.length === 0) return null;
  return (
    <div className="absolute left-1/2 bottom-2 -translate-x-1/2 z-40 glass-strong rounded-xl px-4 py-2 flex items-center gap-2">
      <span className="text-xs text-gold-200">Take a seat:</span>
      {open.slice(0, 9).map((i) => (
        <button key={i} onClick={() => onPick(i)} className="btn-ghost rounded-md w-8 h-8 text-xs">
          {i + 1}
        </button>
      ))}
    </div>
  );
}

function NameOverlay({ onJoin }: { onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Overlay>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm text-center">
        <h2 className="font-display text-2xl text-cream mb-4">Join the table</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full glass rounded-xl px-4 py-3 text-center text-cream placeholder:text-muted outline-none focus:ring-1 focus:ring-gold-500/50 mb-4"
        />
        <button
          disabled={!name.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onJoin(name.trim());
            } finally {
              setBusy(false);
            }
          }}
          className="btn-gold rounded-xl px-6 py-3 w-full disabled:opacity-40"
        >
          Enter
        </button>
      </div>
    </Overlay>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 grid place-items-center px-4">{children}</main>;
}
function Spinner() {
  return <div className="w-8 h-8 rounded-full border-2 border-gold-500/30 border-t-gold-400 animate-spin" />;
}
