-- The updates box is a consent, so it is recorded like one (lawyer, 24 October).
--
-- The consents table already holds the AI ticks. The box under the email field
-- ("Also send me an occasional email when something new is ready") is the same
-- kind of thing: a yes or a no, with the words the person read and the minute
-- they read them. It gets its own kind and its own wording version, so
-- changing the AI wording never touches it and the other way round.
--
-- The table's check constraint has to learn the new kind, and `founder_access`
-- stays in the list: nobody is asked for it any more, but the rows that
-- recorded it are still there and still have to be readable.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

alter table public.consents drop constraint if exists consents_kind_check;

alter table public.consents
  add constraint consents_kind_check
  check (kind in ('ai', 'ai_special', 'founder_access', 'updates'));

-- Proof it worked: this should return the new definition, with 'updates' in it.
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'consents_kind_check';
