"use client";

import { useMemo, useState } from "react";
import type { PlayerRow } from "@/lib/game/project";
import { formatChips } from "@/lib/game/view";
import { rankChar, suitOf, SUIT_SYMBOL, SUIT_IS_RED } from "@/lib/engine/cards";
import type { Card } from "@/lib/engine/types";

export interface LogRow {
  id: number;
  name: string | null;
  type: string;
  amount: number | null;
  street: string | null;
  detail: { board?: Card[]; newCards?: Card[]; blind?: string; showdown?: boolean; hand?: string } | null;
  hand_no: number | null;
  user_id: string | null;
}
export interface ChatRow {
  id: number;
  name: string | null;
  body: string;
  kind: string;
  user_id: string | null;
}

type Tab = "chat" | "log" | "ledger";

export function SidePanel({
  players,
  log,
  chat,
  lastResult,
  onSend,
}: {
  code: string;
  players: PlayerRow[];
  log: LogRow[];
  chat: ChatRow[];
  viewerId: string;
  lastResult?: { winnings?: Record<string, number> };
  onSend: (body: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("log");
  const [draft, setDraft] = useState("");

  return (
    <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-gold-500/10 flex flex-col min-h-0 max-h-[45vh] lg:max-h-none">
      <div className="flex">
        {(["log", "ledger", "chat"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs uppercase tracking-widest ${
              tab === t ? "text-gold-200 border-b-2 border-gold-400" : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {tab === "log" && <LogView log={log} />}
        {tab === "ledger" && <LedgerView players={players} />}
        {tab === "chat" && <ChatView chat={chat} />}
      </div>

      {tab === "chat" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) {
              onSend(draft.trim());
              setDraft("");
            }
          }}
          className="p-2 border-t border-gold-500/10 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            className="flex-1 glass rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted outline-none"
          />
          <button className="btn-gold rounded-lg px-4 text-sm">Send</button>
        </form>
      )}
    </aside>
  );
}

function CardText({ card }: { card: Card }) {
  const red = SUIT_IS_RED[suitOf(card)];
  return (
    <span className={red ? "text-[#e8737b]" : "text-parchment"}>
      {rankChar(card)}{SUIT_SYMBOL[suitOf(card)]}
    </span>
  );
}

function LogLine({ row }: { row: LogRow }) {
  const name = <span className="text-gold-200">{row.name}</span>;
  switch (row.type) {
    case "blind":
      return <>{name} posts {row.detail?.blind === "sb" ? "SB" : "BB"} {formatChips(row.amount ?? 0)}</>;
    case "deal":
      return <span className="text-muted">— hand #{row.hand_no} dealt —</span>;
    case "fold":
      return <><span className="text-danger/80">{row.name}</span> folds</>;
    case "check":
      return <>{name} checks</>;
    case "call":
      return <>{name} calls {formatChips(row.amount ?? 0)}</>;
    case "bet":
      return <>{name} bets {formatChips(row.amount ?? 0)}</>;
    case "raise":
      return <>{name} raises to {formatChips(row.amount ?? 0)}</>;
    case "board": {
      const label = (row.street ?? "").replace(/^\w/, (c) => c.toUpperCase());
      return (
        <span>
          <span className="text-gold-300">{label}:</span>{" "}
          {(row.detail?.board ?? []).map((c, i) => (
            <span key={i}> <CardText card={c} /></span>
          ))}
        </span>
      );
    }
    case "win":
      return <><span className="text-win">{row.name} collected {formatChips(row.amount ?? 0)} from pot</span></>;
    default:
      return <span className="text-muted">{row.type}</span>;
  }
}

function LogView({ log }: { log: LogRow[] }) {
  if (log.length === 0) return <Empty label="No hands played yet." />;
  return (
    <div className="flex flex-col gap-1 text-sm">
      {log.map((row) => (
        <div key={row.id} className="text-parchment/80 leading-snug">
          <LogLine row={row} />
        </div>
      ))}
    </div>
  );
}

function LedgerView({ players }: { players: PlayerRow[] }) {
  const rows = useMemo(
    () =>
      players
        .filter((p) => (p.buy_in_total ?? 0) > 0 || p.seat_index !== null)
        .map((p) => {
          const buyIn = p.buy_in_total ?? 0;
          const buyOut = p.buy_out_total ?? 0;
          const net = p.stack + buyOut - buyIn;
          return { name: p.name, buyIn, stack: p.stack, net };
        }),
    [players],
  );
  const total = rows.reduce(
    (a, r) => ({ buyIn: a.buyIn + r.buyIn, stack: a.stack + r.stack }),
    { buyIn: 0, stack: 0 },
  );
  if (rows.length === 0) return <Empty label="No buy-ins yet." />;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[10px] uppercase tracking-widest text-muted">
          <th className="text-left py-1">Player</th>
          <th className="text-right">Buy-in</th>
          <th className="text-right">Stack</th>
          <th className="text-right">Net</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-gold-500/10">
            <td className="py-1.5 text-cream">{r.name}</td>
            <td className="text-right tabular-nums text-parchment/70">{formatChips(r.buyIn)}</td>
            <td className="text-right tabular-nums text-parchment/70">{formatChips(r.stack)}</td>
            <td className={`text-right tabular-nums ${r.net >= 0 ? "text-win" : "text-danger"}`}>
              {r.net >= 0 ? "+" : ""}{formatChips(r.net)}
            </td>
          </tr>
        ))}
        <tr className="border-t border-gold-500/20 text-[10px] uppercase tracking-widest text-muted">
          <td className="py-1.5">Table total</td>
          <td className="text-right tabular-nums">{formatChips(total.buyIn)}</td>
          <td className="text-right tabular-nums">{formatChips(total.stack)}</td>
          <td />
        </tr>
      </tbody>
    </table>
  );
}

function ChatView({ chat }: { chat: ChatRow[] }) {
  if (chat.length === 0) return <Empty label="Say hello 👋" />;
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {chat.map((m) => (
        <div key={m.id} className="leading-snug">
          <span className="text-gold-200">{m.name}</span>{" "}
          <span className="text-parchment/80">{m.body}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center text-xs text-muted py-8">{label}</div>;
}
