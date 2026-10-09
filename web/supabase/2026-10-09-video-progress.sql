-- Run this once, in Supabase -> SQL Editor. Running it twice is safe.
--
-- Why it exists on its own: video_progress is in schema.sql but was never
-- created in the live database. Nothing breaks today, because there are no
-- videos yet. The day the first one goes up, "continue where you stopped"
-- and the tick that appears when a video ends would both fail quietly.
--
-- There is a second reason to run it now. schema.sql switches row-level
-- security on for nine tables inside one do-block, and video_progress is the
-- last of the nine. A do-block is a single statement, so with the table
-- missing that block raises "relation does not exist" and every policy in it
-- rolls back together. In other words, schema.sql cannot be re-run cleanly
-- against production until this table exists.
--
-- (Checked on 9 October 2026: the existing policies are fine. Somebody
-- holding the public key reads zero rows from every table.)

-- Where someone had got to in each video (spec 6.4). On the server, not in the
-- browser, so the phone picks up where the laptop stopped.
create table if not exists public.video_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null,
  seconds numeric not null default 0,
  duration numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

-- The same rule as the other tables holding a person's own work: they may
-- read and write their own rows, and nobody else's.
alter table public.video_progress enable row level security;
drop policy if exists "own rows" on public.video_progress;
create policy "own rows" on public.video_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
