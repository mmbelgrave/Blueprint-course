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
                           'ai_profile','part_results','feedback']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- usage_log: people may read their own usage, but only the server writes it.
alter table public.usage_log enable row level security;
drop policy if exists "read own usage" on public.usage_log;
create policy "read own usage" on public.usage_log for select to authenticated
  using (user_id = (select auth.uid()));
