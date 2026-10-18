-- What each person agreed to, and when (legal review of 18 October, part 1).
--
-- This table is the proof. It is append-only on purpose: a tick that is
-- switched off does not change the row that recorded the tick, it adds a row
-- saying it was switched off, with its own minute. Read downwards and you have
-- the history; read the newest row of a kind and you have the present state.
--
-- Three kinds:
--   ai              the one the AI partner needs. Without a granted row at the
--                   current wording version, the server refuses every AI call.
--   ai_special      explicit consent for special categories of data (health,
--                   beliefs, and the rest). Optional. The AI works without it.
--   founder_access  Mwata may read this person's answers and AI notes.
--
-- `wording_version` is the version of the text the person actually read. Change
-- the text, bump the version in src/lib/consent.ts, and everybody is asked
-- again rather than being held to words they never saw.
--
-- No IP addresses are stored here. The user id and the minute are the record.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

create table if not exists public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('ai', 'ai_special', 'founder_access')),
  -- True for a tick, false for an untick. Both are records worth keeping.
  granted boolean not null,
  wording_version text not null,
  -- Where the person was standing: the consent screen in the AI panel, or the
  -- ticks in Settings.
  source text not null default 'app' check (source in ('app', 'settings')),
  recorded_at timestamptz not null default now()
);

create index if not exists consents_mine on public.consents (user_id, kind, recorded_at desc);

-- Append-only, enforced by the database rather than by good intentions.
-- Deletes are left alone so that deleting an account still works: the rows go
-- with the person they belong to.
create or replace function public.consents_append_only() returns trigger
  language plpgsql as $$
begin
  raise exception 'consents are append-only: add a new row instead of changing this one';
end;
$$;

drop trigger if exists consents_no_update on public.consents;
create trigger consents_no_update before update on public.consents
  for each row execute function public.consents_append_only();

alter table public.consents enable row level security;

-- Everybody may read their own history. Nobody may write from the browser:
-- every row is written by a server route with the service key, so a tick in
-- the browser cannot invent a consent that was never given.
drop policy if exists "read my own consents" on public.consents;
create policy "read my own consents" on public.consents
  for select using (auth.uid() = user_id);
