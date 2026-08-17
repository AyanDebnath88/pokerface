"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/Segmented";
import type { GameVariant } from "@/lib/engine/types";
import { formatChips } from "@/lib/game/view";
import { ensureSession } from "@/lib/auth-client";
import { createGame } from "@/app/actions/game";

const STAKES = [
  { sb: 5, bb: 10 },
  { sb: 25, bb: 50 },
  { sb: 50, bb: 100 },
  { sb: 100, bb: 200 },
];
const STACKS = [1000, 2500, 5000, 10000];
const TIMERS = [15, 30, 45, 60];

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState("");
  const [variant, setVariant] = useState<GameVariant>("nlhe");
  const [stakeIdx, setStakeIdx] = useState<number | "custom">(1);
  const [customSb, setCustomSb] = useState(1);
  const [customBb, setCustomBb] = useState(2);
  const [stack, setStack] = useState(2500);
  const [timer, setTimer] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake =
    stakeIdx === "custom"
      ? { sb: Math.max(1, customSb), bb: Math.max(2, customBb) }
      : STAKES[stakeIdx];

  async function create() {
    if (!hostName.trim()) {
      setError("Enter your name first");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ensureSession();
      const { code } = await createGame({
        name: name.trim() || undefined,
        hostName: hostName.trim(),
        config: {
          variant,
          blindLevels: [{ smallBlind: stake.sb, bigBlind: stake.bb }],
          startingStack: stack,
          decisionSeconds: timer,
        },
      });
      router.push(`/game/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-wide text-gilt">
          PokerFace
        </Link>
        <Link href="/join" className="btn-ghost rounded-lg px-4 py-2 text-sm">
          Join with code
        </Link>
      </header>

      <section className="flex-1 grid place-items-center px-6 py-8">
        <div className="glass-strong rounded-3xl p-8 w-full max-w-lg rise-in">
          <h1 className="font-display text-3xl text-cream mb-1">
            Create a table
          </h1>
          <p className="text-sm text-parchment/60 mb-7">
            Set the stakes, share the link, deal in.
          </p>

          <div className="flex flex-col gap-6">
            <Field label="Your name">
              <input
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Ace"
                className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-muted outline-none focus:ring-1 focus:ring-gold-500/50"
              />
            </Field>

            <Field label="Table name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Friday Night Club"
                className="w-full glass rounded-xl px-4 py-3 text-cream placeholder:text-muted outline-none focus:ring-1 focus:ring-gold-500/50"
              />
            </Field>

            <Field label="Game">
              <Segmented
                value={variant}
                onChange={setVariant}
                options={[
                  { value: "nlhe", label: "No-Limit Hold'em", hint: "2 cards" },
                  { value: "plo", label: "Pot-Limit Omaha", hint: "4 cards" },
                ]}
              />
            </Field>

            <Field label="Blinds">
              <div className="grid grid-cols-5 gap-2">
                {STAKES.map((s, i) => (
                  <Chip
                    key={i}
                    active={i === stakeIdx}
                    onClick={() => setStakeIdx(i)}
                  >
                    {s.sb}/{s.bb}
                  </Chip>
                ))}
                <Chip active={stakeIdx === "custom"} onClick={() => setStakeIdx("custom")}>
                  Custom
                </Chip>
              </div>
              {stakeIdx === "custom" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="glass rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted">SB</span>
                    <input
                      type="number"
                      min={1}
                      value={customSb}
                      onChange={(e) => setCustomSb(Number(e.target.value))}
                      className="w-full bg-transparent text-cream tabular-nums outline-none text-right"
                    />
                  </label>
                  <label className="glass rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted">BB</span>
                    <input
                      type="number"
                      min={2}
                      value={customBb}
                      onChange={(e) => setCustomBb(Number(e.target.value))}
                      className="w-full bg-transparent text-cream tabular-nums outline-none text-right"
                    />
                  </label>
                </div>
              )}
            </Field>

            <Field label="Starting stack">
              <div className="grid grid-cols-4 gap-2">
                {STACKS.map((s) => (
                  <Chip key={s} active={s === stack} onClick={() => setStack(s)}>
                    {formatChips(s)}
                  </Chip>
                ))}
              </div>
              <div className="text-[11px] text-muted mt-1.5">
                {(stack / stake.bb).toFixed(0)} big blinds
              </div>
            </Field>

            <Field label="Action timer">
              <div className="grid grid-cols-4 gap-2">
                {TIMERS.map((t) => (
                  <Chip key={t} active={t === timer} onClick={() => setTimer(t)}>
                    {t}s
                  </Chip>
                ))}
              </div>
            </Field>

            {error && (
              <div className="text-sm text-danger text-center">{error}</div>
            )}
            <button
              onClick={create}
              disabled={submitting}
              className="btn-gold rounded-xl px-6 py-4 text-base mt-1 disabled:opacity-50"
            >
              {submitting ? "Dealing you in…" : "Create table"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-gold-300/70 mb-2 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-2.5 text-sm tabular-nums transition ${
        active
          ? "btn-gold"
          : "glass text-parchment hover:text-gold-100"
      }`}
    >
      {children}
    </button>
  );
}
