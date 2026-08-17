"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ensureSession } from "@/lib/auth-client";
import { joinGame } from "@/app/actions/game";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canJoin = code.trim().length >= 4 && name.trim().length >= 1;

  async function join() {
    if (!canJoin) return;
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      await joinGame({ code: code.trim(), name: name.trim() });
      router.push(`/game/${code.trim()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-wide text-gilt">
          PokerFace
        </Link>
        <Link href="/create" className="btn-ghost rounded-lg px-4 py-2 text-sm">
          Create a table
        </Link>
      </header>

      <section className="flex-1 grid place-items-center px-6">
        <div className="glass-strong rounded-3xl p-8 w-full max-w-md text-center rise-in">
          <h1 className="font-display text-3xl text-cream mb-1">
            Join a table
          </h1>
          <p className="text-sm text-parchment/60 mb-7">
            Enter the code your host shared.
          </p>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="TABLE CODE"
            maxLength={8}
            className="w-full glass rounded-xl px-4 py-4 text-center text-2xl font-display tracking-[0.4em] text-gold-100 placeholder:text-muted placeholder:tracking-normal placeholder:text-base outline-none focus:ring-1 focus:ring-gold-500/50 mb-3"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full glass rounded-xl px-4 py-3 text-center text-cream placeholder:text-muted outline-none focus:ring-1 focus:ring-gold-500/50 mb-5"
          />

          {error && (
            <div className="text-sm text-danger mb-3">{error}</div>
          )}
          <button
            onClick={join}
            disabled={!canJoin || busy}
            className="btn-gold rounded-xl px-6 py-4 text-base w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Taking your seat…" : "Take my seat"}
          </button>

          <p className="text-xs text-muted mt-5">
            No account needed. Sign in later to keep your stats.
          </p>
        </div>
      </section>
    </main>
  );
}
