-- Run this once in the Supabase SQL editor, after schema.sql.

-- Lets a device delete a room it created/joined from the history screen.
-- strokes and room_members both cascade-delete via their foreign keys, so
-- this single delete cleans up everything. Same access model as the rest
-- of the schema: anyone holding the room id can delete it (no login).
create policy "anyone can delete a room" on public.rooms
  for delete using (true);
