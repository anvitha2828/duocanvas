-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.strokes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id text not null,
  points jsonb not null,
  color text not null default '#000000',
  width numeric not null default 4,
  created_at timestamptz not null default now()
);

create index if not exists strokes_room_id_idx on public.strokes (room_id);

alter table public.rooms enable row level security;
alter table public.strokes enable row level security;

-- Anyone who knows a room's id can read/join it and draw on it (the room id
-- itself, an unguessable uuid, is the "access control"). No login required.
create policy "anyone can view a room" on public.rooms
  for select using (true);

create policy "anyone can create a room" on public.rooms
  for insert with check (true);

create policy "anyone can view strokes" on public.strokes
  for select using (true);

create policy "anyone can add a stroke" on public.strokes
  for insert with check (true);

-- Push every new stroke to everyone subscribed to the room in real time.
alter publication supabase_realtime add table public.strokes;
