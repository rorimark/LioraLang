begin;

create extension if not exists pgcrypto;

-- Profiles
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '')
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select
  u.id,
  nullif(trim(coalesce(u.raw_user_meta_data->>'display_name', '')), '')
from auth.users u
on conflict (id) do update
set display_name = coalesce(excluded.display_name, public.profiles.display_name);

-- Hub tables
drop table if exists public.hub_deck_versions cascade;
drop table if exists public.hub_decks cascade;

create table public.hub_decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  source_language text not null,
  target_languages text[] not null default '{}',
  tags text[] not null default '{}',
  words_count integer not null default 0,
  downloads_count integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hub_decks_owner_id_idx
  on public.hub_decks(owner_id);

create index if not exists hub_decks_created_at_idx
  on public.hub_decks(created_at desc);

create index if not exists hub_decks_is_published_idx
  on public.hub_decks(is_published);

drop trigger if exists hub_decks_touch_updated_at on public.hub_decks;
create trigger hub_decks_touch_updated_at
before update on public.hub_decks
for each row execute procedure public.touch_updated_at();

create table public.hub_deck_versions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.hub_decks(id) on delete cascade,
  version integer not null,
  file_path text not null,
  file_format text not null,
  file_size_bytes bigint not null,
  checksum_sha256 text,
  words_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (deck_id, version)
);

create index if not exists hub_deck_versions_deck_id_idx
  on public.hub_deck_versions(deck_id);

create index if not exists hub_deck_versions_deck_id_version_idx
  on public.hub_deck_versions(deck_id, version desc);

-- Download counter RPC
drop function if exists public.increment_hub_deck_downloads(uuid);

create function public.increment_hub_deck_downloads(p_deck_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value integer;
begin
  update public.hub_decks
  set downloads_count = downloads_count + 1
  where id = p_deck_id
    and is_published = true
  returning downloads_count into next_value;

  return coalesce(next_value, 0);
end;
$$;

revoke all on function public.increment_hub_deck_downloads(uuid) from public;
grant execute on function public.increment_hub_deck_downloads(uuid) to anon, authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.hub_decks enable row level security;
alter table public.hub_deck_versions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "hub_decks_public_read" on public.hub_decks;
drop policy if exists "hub_decks_owner_read" on public.hub_decks;
drop policy if exists "hub_decks_owner_insert" on public.hub_decks;
drop policy if exists "hub_decks_owner_update" on public.hub_decks;
drop policy if exists "hub_decks_owner_delete" on public.hub_decks;

create policy "hub_decks_public_read"
on public.hub_decks
for select
to anon, authenticated
using (is_published = true);

create policy "hub_decks_owner_read"
on public.hub_decks
for select
to authenticated
using (owner_id = auth.uid());

create policy "hub_decks_owner_insert"
on public.hub_decks
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "hub_decks_owner_update"
on public.hub_decks
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "hub_decks_owner_delete"
on public.hub_decks
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "hub_deck_versions_public_read" on public.hub_deck_versions;
drop policy if exists "hub_deck_versions_owner_read" on public.hub_deck_versions;
drop policy if exists "hub_deck_versions_owner_insert" on public.hub_deck_versions;
drop policy if exists "hub_deck_versions_owner_delete" on public.hub_deck_versions;

create policy "hub_deck_versions_public_read"
on public.hub_deck_versions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.hub_decks d
    where d.id = deck_id
      and d.is_published = true
  )
);

create policy "hub_deck_versions_owner_read"
on public.hub_deck_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.hub_decks d
    where d.id = deck_id
      and d.owner_id = auth.uid()
  )
);

create policy "hub_deck_versions_owner_insert"
on public.hub_deck_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.hub_decks d
    where d.id = deck_id
      and d.owner_id = auth.uid()
  )
);

create policy "hub_deck_versions_owner_delete"
on public.hub_deck_versions
for delete
to authenticated
using (
  exists (
    select 1
    from public.hub_decks d
    where d.id = deck_id
      and d.owner_id = auth.uid()
  )
);

-- Storage bucket and policies
insert into storage.buckets (id, name, public)
values ('decks', 'decks', false)
on conflict (id) do nothing;

drop policy if exists "deck_files_owner_insert" on storage.objects;
drop policy if exists "deck_files_owner_select" on storage.objects;
drop policy if exists "deck_files_owner_delete" on storage.objects;
drop policy if exists "deck_files_public_select" on storage.objects;

create policy "deck_files_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'decks'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "deck_files_owner_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'decks'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "deck_files_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'decks'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "deck_files_public_select"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'decks'
  and exists (
    select 1
    from public.hub_deck_versions v
    join public.hub_decks d on d.id = v.deck_id
    where v.file_path = name
      and d.is_published = true
  )
);

commit;
