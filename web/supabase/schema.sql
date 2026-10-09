-- The Blueprint — Step 1 app. Database schema (Supabase / Postgres).
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: it only creates what does not exist yet.
--
-- Security model: row-level security (RLS) on every table. A signed-in person
-- can only read and write their own rows. Admin access happens only in
-- server-side code with the service role key (never in the browser).

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  language text not null default 'en',
  currency text not null default 'EUR',
  consent_ai boolean not null default false,
  consent_founder_access boolean not null default false,
  created_at timestamptz not null default now()
);

-- Where someone came from, and whether they want to hear about new things
-- (spec 6.2). Added 8 October; existing accounts simply have no answer.
alter table public.profiles add column if not exists came_from text;
alter table public.profiles add column if not exists wants_updates boolean not null default false;

create table if not exists public.answers (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  field_id text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id, field_id)
);

create table if not exists public.exercise_status (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'done')),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table if not exists public.conversations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  helper_type text,
  created_at timestamptz not null default now()
);
create index if not exists conversations_user_exercise
  on public.conversations (user_id, exercise_id, created_at);

create table if not exists public.ai_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.part_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  part_id text not null,
  ai_draft text,
  final_text text,
  updated_at timestamptz not null default now(),
  primary key (user_id, part_id)
);

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  part_id text not null,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  page text,
  question text not null,
  reply_by text not null default 'email' check (reply_by in ('email', 'whatsapp')),
  whatsapp text,
  created_at timestamptz not null default now()
);
create index if not exists questions_user on public.questions (user_id, created_at desc);

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

-- What a person owns (spec 6.1). Written only by the server: a webhook from
-- Lemon Squeezy, or Mwata granting it by hand. A person may read their own.
create table if not exists public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product text not null,
  status text not null default 'active' check (status in ('active', 'refunded', 'revoked')),
  source text not null default 'lemonsqueezy' check (source in ('lemonsqueezy', 'granted')),
  order_id text,
  variant_id text,
  amount_cents int,
  currency text,
  test_mode boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
-- The same order never counts twice, however often Lemon Squeezy sends it.
create unique index if not exists entitlements_order on public.entitlements (order_id)
  where order_id is not null;
create index if not exists entitlements_user on public.entitlements (user_id, status);

create table if not exists public.usage_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  request_type text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  created_at timestamptz not null default now()
);

-- Row-level security: owners only.
do $$
declare t text;
begin
  foreach t in array array['profiles','answers','exercise_status','conversations',
                           'ai_profile','part_results','feedback','questions','video_progress']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- entitlements: people may see what they own; only the server gives or ends it.
alter table public.entitlements enable row level security;
drop policy if exists "read own entitlements" on public.entitlements;
create policy "read own entitlements" on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()));

-- usage_log: people may read their own usage, but only the server writes it.
alter table public.usage_log enable row level security;
drop policy if exists "read own usage" on public.usage_log;
create policy "read own usage" on public.usage_log for select to authenticated
  using (user_id = (select auth.uid()));

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
  -- The address they paid with.
  email text not null,
  code_hash text not null,
  -- The account the purchase would move to.
  user_id uuid not null references auth.users (id) on delete cascade,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists purchase_claims_open on public.purchase_claims (user_id, created_at desc);

alter table public.purchase_claims enable row level security;
-- No policy, deliberately: only the server may read or write these. A person
-- reading their own row would be reading the hash of their own code, which is
-- no use to them and every use to somebody who should not have it.
