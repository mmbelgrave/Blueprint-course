-- The comparison (spec 6.8, slice 2). One table, for the pages a person keeps
-- private for good: 2.3 what stopped you before, 2.4 beliefs, 3.1 what money
-- means to you. A row means "my partner never sees this one", and it stays
-- until the person who wrote it takes the row away again.
--
-- Everything else the comparison needs is already there: whether somebody has
-- written a page is read from `answers`, and the one agreed answer on 5.1 and
-- 3.4.2 is an ordinary shared answer.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

create table if not exists public.private_pages (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  since timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.private_pages enable row level security;

-- Only ever your own: nobody else may read which pages you are holding back,
-- let alone change the list.
drop policy if exists "read my private pages" on public.private_pages;
create policy "read my private pages" on public.private_pages for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "keep a page private" on public.private_pages;
create policy "keep a page private" on public.private_pages for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "stop keeping a page private" on public.private_pages;
create policy "stop keeping a page private" on public.private_pages for delete to authenticated
  using (user_id = auth.uid());
