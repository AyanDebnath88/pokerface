# PokerFace — setup

Free multiplayer poker (PokerNow-style) with the "Onyx Club" VIP look.
Stack: Next.js 16 + Tailwind v4 + Supabase (Postgres + Auth + Realtime).

## 1. Create a Supabase project

1. Go to <https://supabase.com> → New project. Pick a region near your players.
2. Wait for it to provision.

## 2. Enable anonymous sign-ins (required for guest join)

Supabase Dashboard → **Authentication → Sign In / Providers → Anonymous
Sign-ins → Enable**. This is what lets guests join by link and still get a
real `auth.uid()` (so the card-secrecy rules work for them too).

## 3. Run the database migration

Dashboard → **SQL Editor** → paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run.

This creates all tables, Row Level Security policies (hole cards + deck are
never readable by other players), and adds the tables to the Realtime
publication.

## 4. Add environment keys

Dashboard → **Settings → API**. Copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`  (server-only, never exposed)

Create `.env.local` in the project root (copy from `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 5. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000> → **Create a table** → share the link → friends
**Join with code**. Open a second browser/incognito window to test multiplayer.

## 6. Tests

```bash
npm test
```

Runs the engine + game-reducer suites (hand evaluation, side pots, betting
state machine, and the full public/secret state round-trip).

## Deploying (later)

- **Vercel**: import the repo, add the same three env vars in Project Settings →
  Environment Variables, deploy.
- Point your custom domain at the Vercel project when ready.
- The action-clock backstop for disconnected players uses `pg_cron` (optional);
  the client already triggers timeouts on expiry, so this is a later hardening
  step, not required to play.

## What works today

Create/join rooms, guest + anonymous auth, sit down + buy-in, deal hands,
full betting (fold/check/call/bet/raise/all-in) with side pots, showdown with
card reveal, dealer rotation, action clock, auto-start next hand, pause,
session log, ledger, and chat — all synced in real time.

## Not yet wired (planned)

Run-it-twice, straddles, antes/blind levels clock, bomb pots, rabbit hunting,
rebuy UI, spectator toggle, account upgrade from guest, sound design, and the
replayer. The config already carries these fields; they light up incrementally.
