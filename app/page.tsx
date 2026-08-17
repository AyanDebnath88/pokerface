import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Top bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="font-display text-xl tracking-wide text-gilt">
          PokerFace
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/demo" className="text-parchment hover:text-gold-200 transition">
            View the table
          </Link>
          <Link
            href="/join"
            className="btn-ghost rounded-lg px-4 py-2 text-sm"
          >
            Join with code
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 grid place-items-center px-6">
        <div className="max-w-3xl text-center rise-in">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-xs tracking-widest uppercase text-gold-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            Free · Invite-only · Play money
          </div>

          <h1 className="font-display text-6xl sm:text-7xl leading-[1.05] mb-6">
            <span className="text-cream">The private</span>{" "}
            <span className="text-gilt">poker club</span>
            <br />
            <span className="text-cream">for you and your friends</span>
          </h1>

          <p className="text-lg text-parchment/80 max-w-xl mx-auto mb-10">
            Spin up a table in seconds, share one link, and deal in.
            No-Limit Hold&apos;em and Pot-Limit Omaha, wrapped in a
            high-roller lounge — no download, no sign-up required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/create"
              className="btn-gold rounded-xl px-8 py-4 text-base w-full sm:w-auto"
            >
              Create a table
            </Link>
            <Link
              href="/demo"
              className="btn-ghost rounded-xl px-8 py-4 text-base w-full sm:w-auto"
            >
              Take a seat at the demo
            </Link>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="w-full max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-4">
        {[
          {
            title: "One link, everyone's in",
            body: "Guests join instantly by name. Sign in for a persistent profile, lifetime stats, and VIP perks.",
          },
          {
            title: "Real poker, done right",
            body: "Server-authoritative dealing, side pots, and showdowns. Your hole cards never leave the vault.",
          },
          {
            title: "A table worth sitting at",
            body: "Onyx felt, brushed-gold chips, and cinematic animations. Poker that finally looks the part.",
          },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg text-gold-200 mb-2">
              {f.title}
            </h3>
            <p className="text-sm text-parchment/70 leading-relaxed">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      <footer className="w-full max-w-6xl mx-auto px-6 py-8 text-center text-xs text-muted">
        PokerFace · Play-money only. For entertainment, not gambling.
      </footer>
    </main>
  );
}
