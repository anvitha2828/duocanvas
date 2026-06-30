-- Run once in Supabase SQL editor after schema.sql and room_members.sql.

-- Human-readable canvas name, editable by anyone in the room.
alter table public.rooms
  add column if not exists name text not null default 'Untitled Canvas';

-- Display name of the member so the header can show who's in the room.
alter table public.room_members
  add column if not exists display_name text;

-- Allow renaming the canvas.
create policy "anyone can update a room" on public.rooms
  for update using (true) with check (true);
