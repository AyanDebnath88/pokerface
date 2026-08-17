-- PokerFace initial schema.
-- Authority model: all game mutations run server-side with the service role
-- (which bypasses RLS). Clients read with the anon/authenticated key, limited
-- by the RLS policies below. Secrets (deck, hole cards) live in tables the
-- client role can never SELECT.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (guest or registered).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  handle        text unique,               -- public @handle
  avatar_color  text default '#e6c65c',
  is_guest      boolean not null default true,
  vip_tier      text,                       -- null | 'gold' | 'black'
  stats         jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- games: room + authoritative PUBLIC state snapshot.
-- `state` holds the projected public game state (no hole cards, no deck).
-- `version` drives optimistic concurrency for the action pipeline.
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  name             text,
  host_id          uuid references auth.users on delete set null,
  config           jsonb not null,
  status           text not null default 'lobby',   -- lobby|running|paused|ended
  button_seat      int,
  hand_no          int not null default 0,
  current_hand_id  uuid,
  state            jsonb,                            -- public projection
  version          int not null default 0,
  acting_deadline  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists games_code_idx on public.games (code);

-- Secret per-game state (deck + rng). NO client-readable policy → denied.
create table if not exists public.game_secrets (
  game_id  uuid primary key references public.games on delete cascade,
  deck     jsonb not null default '[]'
);

-- ---------------------------------------------------------------------------
-- game_players: membership, seat, stack, ledger figures.
-- ---------------------------------------------------------------------------
create table if not exists public.game_players (
  game_id       uuid not null references public.games on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  seat_index    int,                                 -- null = unseated/spectator
  name          text not null,
  avatar_color  text default '#e6c65c',
  stack         int not null default 0,
  buy_in_total  int not null default 0,
  buy_out_total int not null default 0,
  status        text not null default 'seated',      -- seated|sitting_out|away|waiting|left
  is_host       boolean not null default false,
  wins          int not null default 0,
  joined_at     timestamptz not null default now(),
  primary key (game_id, user_id)
);
create unique index if not exists game_players_seat_uniq
  on public.game_players (game_id, seat_index)
  where seat_index is not null;

-- ---------------------------------------------------------------------------
-- hands: per-hand record for history / replay.
-- ---------------------------------------------------------------------------
create table if not exists public.hands (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games on delete cascade,
  hand_no     int not null,
  variant     text not null,
  board       jsonb not null default '[]',
  street      text,
  pots        jsonb,
  result      jsonb,                                 -- winners, shown cards
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index if not exists hands_game_idx on public.hands (game_id, hand_no);

-- Private hole cards, one row per player per hand. RLS: owner-only SELECT.
create table if not exists public.hand_hole_cards (
  hand_id     uuid not null references public.hands on delete cascade,
  game_id     uuid not null references public.games on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  seat_index  int not null,
  cards       jsonb not null,
  primary key (hand_id, user_id)
);

-- Action log (drives the session log + replayer).
create table if not exists public.hand_actions (
  id          bigint generated always as identity primary key,
  game_id     uuid not null references public.games on delete cascade,
  hand_id     uuid references public.hands on delete cascade,
  hand_no     int,
  seq         int not null,
  user_id     uuid,
  seat_index  int,
  name        text,
  street      text,
  type        text not null,                         -- fold|check|call|bet|raise|blind|deal|win|system
  amount      int,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists hand_actions_game_idx on public.hand_actions (game_id, id);

-- Chat + emotes.
create table if not exists public.chat_messages (
  id          bigint generated always as identity primary key,
  game_id     uuid not null references public.games on delete cascade,
  user_id     uuid,
  name        text,
  body        text not null,
  kind        text not null default 'chat',          -- chat|emote|system
  created_at  timestamptz not null default now()
);
create index if not exists chat_game_idx on public.chat_messages (game_id, id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.games            enable row level security;
alter table public.game_secrets     enable row level security;
alter table public.game_players     enable row level security;
alter table public.hands            enable row level security;
alter table public.hand_hole_cards  enable row level security;
alter table public.hand_actions     enable row level security;
alter table public.chat_messages    enable row level security;

-- profiles: anyone authed can read basic profiles; you manage your own.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_upsert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid());

-- games / players / hands / actions / chat: readable by any authed client.
-- All writes go through the service role (bypasses RLS); no client write policy.
create policy games_select on public.games
  for select to authenticated using (true);
create policy game_players_select on public.game_players
  for select to authenticated using (true);
create policy hands_select on public.hands
  for select to authenticated using (true);
create policy hand_actions_select on public.hand_actions
  for select to authenticated using (true);
create policy chat_select on public.chat_messages
  for select to authenticated using (true);

-- game_secrets: no policy → clients can never read the deck.

-- hand_hole_cards: you can only ever read YOUR OWN cards.
create policy hole_cards_select on public.hand_hole_cards
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: broadcast state changes to subscribed clients (RLS still applies,
-- so hole cards only reach their owner).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.hands;
alter publication supabase_realtime add table public.hand_actions;
alter publication supabase_realtime add table public.hand_hole_cards;
alter publication supabase_realtime add table public.chat_messages;
