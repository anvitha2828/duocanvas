-- Run this once in the Supabase SQL editor, after schema.sql.
-- Lets anyone in a room clear that room's strokes (used by the "Clear" button).

create policy "anyone can clear strokes" on public.strokes
  for delete using (true);
