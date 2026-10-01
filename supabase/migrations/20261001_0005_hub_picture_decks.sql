-- Picture decks in the Hub.
--
-- A deck may have pictures on one side instead of a language. The Hub
-- lists decks by their languages, so it records which side is pictures:
-- '' for none, 'source' or 'target'. The languages columns then hold only
-- the sides that are words.
--
-- Packages carry their pictures, so they are larger than word lists: the
-- bucket takes what the app allows to be published (50 MB).
--
-- Additive and idempotent, like the Hub foundation.

alter table public.hub_decks
  add column if not exists picture_side text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'hub_decks_picture_side_check'
      and conrelid = 'public.hub_decks'::regclass
  ) then
    alter table public.hub_decks
      add constraint hub_decks_picture_side_check
      check (picture_side in ('', 'source', 'target'));
  end if;
end
$$;

update storage.buckets
set file_size_limit = 52428800
where id = 'decks'
  and coalesce(file_size_limit, 0) < 52428800;
