-- A daily allowance of word suggestions per person.
--
-- The suggest-word Edge Function calls consume_word_suggestion() with the
-- person's own token before it asks Gemini. Each call counts one; past the
-- allowance it answers false and the function says so instead of asking.
-- The table has no policies: nothing reads or writes it except the
-- function below.

create table if not exists public.word_suggestion_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used integer not null default 0,
  primary key (user_id, day)
);

alter table public.word_suggestion_usage enable row level security;

create or replace function public.consume_word_suggestion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_allowance constant integer := 300;
  used_today integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into public.word_suggestion_usage (user_id, day, used)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set used = public.word_suggestion_usage.used + 1
  returning used into used_today;

  return used_today <= daily_allowance;
end;
$$;

revoke all on function public.consume_word_suggestion() from public;
revoke all on function public.consume_word_suggestion() from anon;
grant execute on function public.consume_word_suggestion() to authenticated;

-- Past days are only history; the index lets them be cleared by date.
create index if not exists word_suggestion_usage_day_idx on public.word_suggestion_usage (day);
