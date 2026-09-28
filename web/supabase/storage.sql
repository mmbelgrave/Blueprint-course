-- Pictures for the vision board (Step 1, 1.2 "Go deeper").
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again: everything checks whether it already exists.
--
-- What it does:
--   1. Makes a private store ("bucket") called "boards". Private means nobody
--      can open a picture with a plain link; the app asks for a short-lived
--      link each time, and only for the person who owns the picture.
--   2. Adds four rules so each person can only reach their own folder. The
--      folder is named after their account id, so folder = person.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'boards',
  'boards',
  false,
  5242880, -- 5 MB per picture; the app also shrinks pictures before upload
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- "Own folder" = the first part of the path is the person's account id.
drop policy if exists "boards: read own pictures" on storage.objects;
create policy "boards: read own pictures"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "boards: add own pictures" on storage.objects;
create policy "boards: add own pictures"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "boards: replace own pictures" on storage.objects;
create policy "boards: replace own pictures"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "boards: delete own pictures" on storage.objects;
create policy "boards: delete own pictures"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'boards' and (storage.foldername(name))[1] = auth.uid()::text);
