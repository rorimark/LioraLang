begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'user-library-decks',
  'user-library-decks',
  false,
  52428800,
  array['application/json', 'application/octet-stream', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "user_library_decks_storage_select_own" on storage.objects;
drop policy if exists "user_library_decks_storage_insert_own" on storage.objects;
drop policy if exists "user_library_decks_storage_update_own" on storage.objects;
drop policy if exists "user_library_decks_storage_delete_own" on storage.objects;

create policy "user_library_decks_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'user-library-decks'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "user_library_decks_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'user-library-decks'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "user_library_decks_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'user-library-decks'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'user-library-decks'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "user_library_decks_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'user-library-decks'
  and auth.uid()::text = (storage.foldername(name))[1]
);

commit;
