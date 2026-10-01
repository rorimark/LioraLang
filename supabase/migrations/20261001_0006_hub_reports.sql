-- Reports on Hub decks.
--
-- Anyone signed in with a confirmed email can report a public deck once,
-- with a reason. A deck reported by three different people is hidden from
-- the Hub at once, until someone looks at it. The owner still sees it and
-- cannot bring it back by publishing again.
--
-- Moderation happens in the Supabase SQL editor:
--   select * from public.hub_deck_report_summary;            -- what was reported
--   select public.moderate_hub_deck('<deck id>', 'hide');      -- hide it now
--   select public.moderate_hub_deck('<deck id>', 'restore');   -- show it again, reports cleared
--   select public.moderate_hub_deck('<deck id>', 'remove');    -- delete it (its files stay in
--                                                              -- Storage → decks → <owner id>)
-- Neither is reachable from the app.
--
-- Additive and idempotent, like the Hub foundation.

alter table public.hub_decks
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_at timestamptz;

create table if not exists public.hub_deck_reports (
  deck_id uuid not null references public.hub_decks(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('inappropriate', 'spam', 'copyright', 'wrong', 'other')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (deck_id, reporter_id)
);

create index if not exists hub_deck_reports_created_at_idx on public.hub_deck_reports(created_at desc);

-- Nobody reads or writes reports through the API; report_hub_deck does.
alter table public.hub_deck_reports enable row level security;
revoke all on public.hub_deck_reports from anon, authenticated;

-- Hiding is not the owner's to undo: what a request through the API sets
-- on these columns is put back.
create or replace function public.hub_decks_keep_moderation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_hidden := false;
      new.hidden_at := null;
    else
      new.is_hidden := old.is_hidden;
      new.hidden_at := old.hidden_at;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hub_decks_keep_moderation on public.hub_decks;
create trigger hub_decks_keep_moderation
before insert or update on public.hub_decks
for each row execute function public.hub_decks_keep_moderation();

-- A hidden deck, its versions and its file leave the public Hub.
drop policy if exists "hub_decks_public_read" on public.hub_decks;
create policy "hub_decks_public_read"
on public.hub_decks
for select
to anon, authenticated
using (is_published = true and is_hidden = false);

drop policy if exists "hub_deck_versions_public_read" on public.hub_deck_versions;
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
      and d.is_hidden = false
  )
);

drop policy if exists "deck_files_public_select" on storage.objects;
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
      and d.is_hidden = false
  )
);

-- A report: 'reported', 'hidden' (this one was the third), 'own' (people
-- do not report their own decks) or 'missing' (no such public deck).
create or replace function public.report_hub_deck(p_deck_id uuid, p_reason text, p_note text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_reporters integer;
begin
  if v_user is null then
    raise exception 'Sign in to report a deck' using errcode = '28000';
  end if;

  if not exists (select 1 from auth.users where id = v_user and email_confirmed_at is not null) then
    raise exception 'Confirm your email to report a deck' using errcode = '28000';
  end if;

  if p_reason is null or p_reason not in ('inappropriate', 'spam', 'copyright', 'wrong', 'other') then
    raise exception 'Unknown reason' using errcode = '22023';
  end if;

  select owner_id into v_owner
  from public.hub_decks
  where id = p_deck_id and is_published = true and is_hidden = false;

  if v_owner is null then
    return 'missing';
  end if;

  if v_owner = v_user then
    return 'own';
  end if;

  insert into public.hub_deck_reports (deck_id, reporter_id, reason, note)
  values (p_deck_id, v_user, p_reason, left(coalesce(btrim(p_note), ''), 500))
  on conflict (deck_id, reporter_id)
  do update set reason = excluded.reason, note = excluded.note, created_at = now();

  select count(*) into v_reporters from public.hub_deck_reports where deck_id = p_deck_id;

  if v_reporters >= 3 then
    update public.hub_decks set is_hidden = true, hidden_at = now() where id = p_deck_id;
    return 'hidden';
  end if;

  return 'reported';
end;
$$;

revoke all on function public.report_hub_deck(uuid, text, text) from public, anon;
grant execute on function public.report_hub_deck(uuid, text, text) to authenticated;

-- For the person who looks after the Hub, from the SQL editor only.
create or replace view public.hub_deck_report_summary
with (security_invoker = true)
as
select
  d.id,
  d.title,
  d.slug,
  d.owner_id,
  d.is_hidden,
  d.hidden_at,
  count(*) as reports,
  array_agg(distinct r.reason) as reasons,
  array_remove(array_agg(nullif(r.note, '') order by r.created_at desc), null) as notes,
  max(r.created_at) as last_report_at
from public.hub_decks d
join public.hub_deck_reports r on r.deck_id = d.id
group by d.id
order by d.is_hidden desc, count(*) desc, max(r.created_at) desc;

revoke all on public.hub_deck_report_summary from anon, authenticated;

create or replace function public.moderate_hub_deck(p_deck_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_action = 'hide' then
    update public.hub_decks set is_hidden = true, hidden_at = now() where id = p_deck_id;
  elsif p_action = 'restore' then
    update public.hub_decks set is_hidden = false, hidden_at = null where id = p_deck_id;
    delete from public.hub_deck_reports where deck_id = p_deck_id;
  elsif p_action = 'remove' then
    delete from public.hub_decks where id = p_deck_id;
  else
    raise exception 'Unknown action: hide, restore or remove' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.moderate_hub_deck(uuid, text) from public, anon, authenticated;
