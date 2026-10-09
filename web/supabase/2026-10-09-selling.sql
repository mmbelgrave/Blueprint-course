-- Run this once, in Supabase -> SQL Editor, before the webhook can do anything.
-- Everything here is also in schema.sql; this file is just the new part, so it
-- can be pasted without reading past what is already there. Running it twice
-- is safe.

-- Every webhook Lemon Squeezy sends, whether it worked or not (spec 6.1). A
-- payment that opens nothing must be visible somewhere, or the first anyone
-- hears of it is the buyer asking where their course is. Nobody but the
-- server may read it: it holds other people's email addresses.
create table if not exists public.webhook_events (
  id bigint generated always as identity primary key,
  source text not null default 'lemonsqueezy',
  event text not null,
  order_id text,
  email text,
  test_mode boolean not null default false,
  -- 'opened', 'closed', 'ignored', 'failed'
  outcome text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists webhook_events_recent on public.webhook_events (created_at desc);

alter table public.webhook_events enable row level security;
-- No policy on purpose: row-level security with no policy shuts everyone out,
-- and the service role, which the webhook and Admin use, is not subject to it.

-- "I bought it, but I cannot get in" (spec 6.1). Somebody who paid with one
-- address and signed in with another proves the paying address with a code,
-- and the purchase MOVES to the account they are signed in with. The code is
-- stored as a hash, like a password, because this row can give away a course.
create table if not exists public.purchase_claims (
  id bigint generated always as identity primary key,
  email text not null,
  code_hash text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists purchase_claims_open on public.purchase_claims (user_id, created_at desc);

alter table public.purchase_claims enable row level security;
-- No policy, deliberately: only the server may read or write these.
