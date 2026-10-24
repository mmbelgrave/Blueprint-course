-- A consent record outlives the account it belonged to (lawyer, 24 October).
--
-- The privacy page now says: "A record that you gave or withdrew consent, with
-- only the date and the wording version, is kept for 3 years after your last
-- choice or after you delete your account." Until today the opposite was true:
-- the rows pointed at auth.users with "on delete cascade", so deleting an
-- account took the proof with it.
--
-- The column stays, and keeps the id it had. Nothing can be read from it once
-- the account is gone: it is a number that no longer names anybody, next to a
-- date and a version of some words. The daily sweep deletes those rows three
-- years after the last choice, the same three years it already applies to
-- consents that ended while the account lived.
--
-- Run this in the Supabase SQL editor. It can be run twice without harm.

alter table public.consents drop constraint if exists consents_user_id_fkey;

-- Proof it worked: this should return no rows.
-- select conname from pg_constraint
--  where conrelid = 'public.consents'::regclass and contype = 'f';
