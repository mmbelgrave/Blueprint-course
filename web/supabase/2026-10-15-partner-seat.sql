-- The partner seat (spec 6.8, agreed 15 October). One purchase may invite one
-- partner. Each person keeps their own account, answers, AI partner and notes;
-- the pages a household answers together are stored once, on the buyer's rows.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

create table if not exists public.partner_seats (
  -- One seat per buyer, so the buyer is the key.
  buyer_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  -- Filled the first time the invited person signs in.
  partner_id uuid references auth.users (id) on delete set null,
  status text not null default 'invited' check (status in ('invited', 'active', 'ended')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  ended_at timestamptz,
  -- Why it ended, for the admin view: 'refund', 'request', 'account_deleted'.
  ended_reason text
);

-- An address can hold one open seat, and a person can be the partner of one
-- household. Both are what makes "no swapping" true rather than a promise.
create unique index if not exists partner_seats_email
  on public.partner_seats (lower(email)) where status <> 'ended';
create unique index if not exists partner_seats_partner
  on public.partner_seats (partner_id) where partner_id is not null and status = 'active';

-- Who last wrote a shared answer, for the line that says so. Null means the
-- owner, which is every answer written before the seat existed.
alter table public.answers add column if not exists changed_by uuid references auth.users (id) on delete set null;

-- Reading the seat: both people may see their own household's seat. Only the
-- server writes it (an invitation, a partner joining, a refund).
alter table public.partner_seats enable row level security;
drop policy if exists "read my own seat" on public.partner_seats;
create policy "read my own seat" on public.partner_seats for select to authenticated
  using (buyer_id = auth.uid() or partner_id = auth.uid());

-- The shared answers themselves are read and written through the server, which
-- checks the household and that the page really is a shared one. The policies
-- on "answers" therefore stay as they are: your own rows, and nobody else's.
--
-- Worth saying plainly, because it is the whole safety story: a partner who
-- asks Supabase directly for the buyer's answers still gets nothing.
