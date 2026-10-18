-- Withdrawing from the contract (Terms §9).
--
-- One row per request. The money is still refunded by hand in Lemon Squeezy,
-- so this table is what makes sure none is forgotten: it is the list Mwata
-- works from, and the record that the request happened at a particular minute,
-- which is what the law asks us to confirm.
--
-- Access is not ended here. The entitlement's own `ended_at` is set to three
-- working days after the request, and the access rules already refuse a
-- purchase whose end has passed. This table only remembers why.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

create table if not exists public.withdrawal_requests (
  id bigint generated always as identity primary key,
  -- Null when somebody withdrew from the public page without signing in.
  user_id uuid references auth.users (id) on delete set null,
  entitlement_id bigint references public.entitlements (id) on delete set null,
  order_id text,
  email text not null,
  amount_cents int,
  currency text,
  -- The minute the person pressed Confirm, which is what the email states.
  requested_at timestamptz not null default now(),
  -- Three working days later: when their access stops.
  access_ends_at timestamptz not null,
  -- 'requested' until the money is back, then 'refunded' from the webhook.
  status text not null default 'requested' check (status in ('requested', 'refunded', 'cancelled')),
  refunded_at timestamptz,
  -- Where it came from: the app, or the public page.
  source text not null default 'app' check (source in ('app', 'public')),
  note text
);

-- One open request per order. A second press of the button finds this one
-- rather than making a duplicate for Mwata to puzzle over.
create unique index if not exists withdrawal_open_order
  on public.withdrawal_requests (order_id) where status = 'requested' and order_id is not null;
create index if not exists withdrawal_by_status on public.withdrawal_requests (status, requested_at desc);

alter table public.withdrawal_requests enable row level security;

-- A person may see their own request. Only the server writes one, because a
-- request has to be checked against the order before it means anything.
drop policy if exists "read my own withdrawal" on public.withdrawal_requests;
create policy "read my own withdrawal" on public.withdrawal_requests for select to authenticated
  using (user_id = (select auth.uid()));

-- Entitlements already carry `ended_at`; from now on it is also used to say
-- when a withdrawal takes effect, so the access layer needs nothing new.
comment on column public.entitlements.ended_at is
  'When this purchase stops opening anything: the refund moment, or three working days after a withdrawal request.';
