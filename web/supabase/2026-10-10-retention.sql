-- Run this once, in Supabase -> SQL Editor. Running it twice is safe.
--
-- The privacy note promises: "If you don't sign in for 24 months, you're
-- emailed, and the account is deleted if there's no reply within 30 days."
-- This table is the memory of the first half — who was written to, and when.
-- Without it the job would either email somebody every night or never delete
-- anything.
--
-- The row is deleted when somebody signs in again, so coming back really does
-- tear the notice up rather than leaving it to fire later.

create table if not exists public.retention_notice (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  warned_at timestamptz not null default now()
);

-- Nobody reads this but the job, which uses the service-role key. Row-level
-- security is on with no policy at all: that is a closed door, not an
-- oversight. A person holding the public key sees nothing here.
alter table public.retention_notice enable row level security;
drop policy if exists "own rows" on public.retention_notice;
