-- Block B of the lawyer's review (24 October 2026). Three small changes.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

-- 1. The sensitive-details consent (item B1).
--
-- A fourth kind of tick: "if I choose to write such details, I agree that the
-- app stores them with my answers". It is not the AI tick and has its own
-- wording version, so changing one never touches the other. The older kinds
-- stay in the list because their rows are still there and still have to be
-- readable.
alter table public.consents drop constraint if exists consents_kind_check;

alter table public.consents
  add constraint consents_kind_check
  check (kind in ('ai', 'ai_special', 'founder_access', 'updates', 'sensitive'));

-- 2. The one reminder before a quiet account is deleted (item B5).
--
-- The first letter goes after two quiet years; this column is the memory of
-- the short reminder seven days before the deletion, so it is sent once and
-- not every night of that week.
alter table public.retention_notice add column if not exists reminded_at timestamptz;

-- 3. A partner seat that has ended (item B4d).
--
-- When the buyer's access ends, the partner has to be told at once, with the
-- date and a way to download their own answers, and their personal answers
-- are deleted thirty days later. The seat row itself cannot hold that: it
-- belongs to the buyer and goes with the buyer's account. So the ending is
-- recorded here, against the partner, and the daily sweep works from it.
--
-- No content, and no reference to the buyer's account: an email address, a
-- date, and the two minutes that say what has been done about it.
create table if not exists public.partner_endings (
  id bigint generated always as identity primary key,
  partner_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  reason text,
  ended_at timestamptz not null default now(),
  -- When the partner was told. Null means the letter still has to go.
  notified_at timestamptz,
  -- When their personal answers were deleted, thirty days after the ending.
  data_deleted_at timestamptz
);

create index if not exists partner_endings_partner on public.partner_endings (partner_id, ended_at desc);

-- Nobody reads this but the server, with the service key. Row-level security
-- on with no policy is a closed door, not an oversight.
alter table public.partner_endings enable row level security;

-- Proof it worked:
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'consents_kind_check';
-- select column_name from information_schema.columns where table_name = 'retention_notice';
-- select count(*) from public.partner_endings;
