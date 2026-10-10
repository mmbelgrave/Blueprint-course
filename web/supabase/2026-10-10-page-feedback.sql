-- Run this once, in Supabase -> SQL Editor. Running it twice is safe.
--
-- "Was this page clear?" (spec 6.7). The part feedback — stars and a comment
-- at the end of a part — stays as it is. This is the smaller question, on
-- every exercise page, so that when somebody gets stuck Mwata learns which
-- page did it rather than which part.
--
-- One row per person per page, not one per answer: somebody who presses "not
-- quite", reads it again and then presses "yes" has changed their mind, and
-- the second answer is the true one.

create table if not exists public.page_feedback (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  clear boolean not null,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- Reading it the way Mwata reads it: the pages that trip people up, newest
-- first. Small table, but the index costs nothing and the admin page asks
-- this question every time it loads.
create index if not exists page_feedback_not_clear
  on public.page_feedback (exercise_id)
  where clear = false;

-- The same rule as every other table holding a person's own work: they may
-- read and write their own rows, and nobody else's. Admin reads it with the
-- service-role key, which row-level security does not apply to.
alter table public.page_feedback enable row level security;
drop policy if exists "own rows" on public.page_feedback;
create policy "own rows" on public.page_feedback for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
