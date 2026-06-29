-- Run this once in the Supabase SQL editor, after schema.sql.

-- Auto-expire rooms (and their strokes, via the foreign key's
-- "on delete cascade") 24 hours after creation.
-- pg_cron must be enabled first: Dashboard -> Database -> Extensions -> pg_cron.
create extension if not exists pg_cron;

select cron.schedule(
  'delete-expired-rooms',
  '*/15 * * * *',
  $$ delete from public.rooms where created_at < now() - interval '24 hours'; $$
);
