-- A reason, when somebody wants to give one.
--
-- Inside the first 14 days the law is clear: no reason, and we must not ask
-- for one. Afterwards it is our own 30-day guarantee, and the terms say the
-- quiet part out loud: "If you like, tell us in a line or two what did not
-- work for you... The refund does not depend on it."
--
-- So the box only appears outside those 14 days, it is optional there, and
-- this is where what they write is kept. Nothing else about a withdrawal
-- changes because of it.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm, and
-- the app works whether or not it has been run: a reason is simply not stored
-- until the column exists.

alter table public.withdrawals add column if not exists reason text;

comment on column public.withdrawals.reason is
  'What they said did not work, in their own words. Only asked after the 14 days, always optional, never a condition of the refund.';
