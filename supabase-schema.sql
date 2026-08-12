-- Ban Rai Village Multiplayer schema
-- Run this SQL in Supabase SQL Editor.
create table if not exists public.players (
  id uuid primary key,
  room_code text not null default 'BANRAI-01',
  name text not null check (char_length(name) between 1 and 18),
  avatar text not null default '🧑‍🌾',
  x real not null default 470,
  y real not null default 430,
  level integer not null default 1,
  xp integer not null default 0,
  coins integer not null default 100,
  updated_at timestamptz not null default now()
);

create index if not exists players_room_code_idx on public.players(room_code);

alter table public.players enable row level security;

-- Prototype classroom access: anonymous students can read/write players.
-- For a production deployment, add teacher authentication and tighter policies.
drop policy if exists "players_select" on public.players;
drop policy if exists "players_insert" on public.players;
drop policy if exists "players_update" on public.players;
drop policy if exists "players_delete" on public.players;

create policy "players_select" on public.players for select to anon using (true);
create policy "players_insert" on public.players for insert to anon with check (true);
create policy "players_update" on public.players for update to anon using (true) with check (true);
create policy "players_delete" on public.players for delete to anon using (true);

-- Enable Realtime for the players table.
alter publication supabase_realtime add table public.players;
