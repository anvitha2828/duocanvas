-- Run this once in the Supabase SQL editor, after schema.sql.

-- Tracks which devices (userId) have created or joined which rooms, so the
-- app can later show "your previous canvases" and let a device delete rooms
-- it touched. Same access model as the rest of the schema: anyone who knows
-- a room id can record membership, no login required.
create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists room_members_user_id_idx on public.room_members (user_id);

alter table public.room_members enable row level security;

create policy "anyone can view room membership" on public.room_members
  for select using (true);

create policy "anyone can record room membership" on public.room_members
  for insert with check (true);
