-- Withdrawals, in the shape the legal review of 18 October asks for.
--
-- This replaces yesterday's withdrawal_requests table, which had no room for
-- the name, the time zone, the order number as the person typed it, or the
-- refund deadline. It was empty, and the block below refuses to run if that
-- ever stops being true.
--
-- What the table has to be able to say, months later:
--   who asked, in their own words (email, name, the order number they typed);
--   when, to the minute, in UTC, and on which clock they were reading it;
--   what we matched it to, or that we matched nothing;
--   when the money was due back, and whether it went;
--   when their access ends.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'withdrawal_requests')
     and (select count(*) from public.withdrawal_requests) > 0 then
    raise exception 'withdrawal_requests has rows: move them across by hand before dropping it';
  end if;
end $$;

drop table if exists public.withdrawal_requests;

create table if not exists public.withdrawals (
  id bigint generated always as identity primary key,
  -- The minute the person pressed the button. UTC, always.
  requested_at timestamptz not null default now(),
  -- The clock they were reading, as their browser reported it, so the
  -- confirmation email can state the time they actually saw. No IP address is
  -- stored here, deliberately.
  time_zone text,
  email text not null,
  name text,
  -- What they typed, kept even when it matches nothing.
  order_entered text,
  -- What we found. Null means nobody has matched it yet.
  matched_order_id text,
  -- Null once the account is gone, or when nothing matched. The row stays.
  user_id uuid references auth.users (id) on delete set null,
  entitlement_id bigint references public.entitlements (id) on delete set null,
  product text,
  amount_cents int,
  currency text,
  -- 'received' until the money is back ('refunded') or they changed their mind
  -- ('cancelled').
  status text not null default 'received' check (status in ('received', 'cancelled', 'refunded')),
  -- Fourteen days from the request: the law's deadline for the money.
  refund_deadline timestamptz not null,
  -- Three days from the request, or null when there was no access to end.
  access_ends_at timestamptz,
  refunded_at timestamptz,
  -- The day-seven nudge to Mwata, sent once.
  reminded_at timestamptz,
  -- When the answers were deleted, 30 days after access ended.
  data_deleted_at timestamptz,
  source text not null default 'public' check (source in ('app', 'public')),
  note text
);

create index if not exists withdrawals_open on public.withdrawals (status, requested_at desc);
create index if not exists withdrawals_email on public.withdrawals (lower(email), requested_at desc);
-- One open request per order. A second press finds this one rather than making
-- a duplicate for Mwata to puzzle over.
create unique index if not exists withdrawals_open_order
  on public.withdrawals (matched_order_id) where status = 'received' and matched_order_id is not null;

alter table public.withdrawals enable row level security;

-- People may read their own. Nobody writes from the browser: the public page
-- posts to a server route, because the row has to be written even when there
-- is no session at all.
drop policy if exists "read my own withdrawals" on public.withdrawals;
create policy "read my own withdrawals" on public.withdrawals
  for select using (auth.uid() = user_id);

-- The order record outlives the account (legal review, part 2, point 9).
--
-- "Delete everything" deletes the account, and until now every table went with
-- it, the purchase included. The purchase is the thing a refund argument turns
-- on, so it stays, with the person detached from it.
alter table public.entitlements alter column user_id drop not null;

do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.entitlements'::regclass
     and contype = 'f'
     and conkey = array[(select attnum from pg_attribute
                          where attrelid = 'public.entitlements'::regclass and attname = 'user_id')];
  if c is not null then
    execute format('alter table public.entitlements drop constraint %I', c);
  end if;
  execute 'alter table public.entitlements
             add constraint entitlements_user_id_fkey
             foreign key (user_id) references auth.users (id) on delete set null';
end $$;
