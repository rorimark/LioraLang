-- How much of today's suggestion allowance is left, for the person asking.
--
-- The allowance lives in one function now, so what is counted and what is
-- shown cannot drift apart. word_suggestion_allowance() reads only the
-- caller's own row; the table still has no policies.

create or replace function public.word_suggestion_daily_allowance()
returns integer
language sql
immutable
as $$
  select 300;
$$;

create or replace function public.consume_word_suggestion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
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

  return used_today <= public.word_suggestion_daily_allowance();
end;
$$;

-- Today's allowance, what is used and left, and when it starts again
-- (midnight UTC).
create or replace function public.word_suggestion_allowance()
returns table (allowance integer, used integer, remaining integer, resets_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowance integer := public.word_suggestion_daily_allowance();
  v_used integer := 0;
  v_today date := (now() at time zone 'utc')::date;
begin
  if auth.uid() is null then
    return;
  end if;

  select u.used into v_used
  from public.word_suggestion_usage u
  where u.user_id = auth.uid() and u.day = v_today;

  v_used := least(coalesce(v_used, 0), v_allowance);

  return query
  select v_allowance, v_used, v_allowance - v_used, ((v_today + 1)::timestamp at time zone 'utc');
end;
$$;

revoke all on function public.word_suggestion_daily_allowance() from public, anon;
grant execute on function public.word_suggestion_daily_allowance() to authenticated;
revoke all on function public.consume_word_suggestion() from public, anon;
grant execute on function public.consume_word_suggestion() to authenticated;
revoke all on function public.word_suggestion_allowance() from public, anon;
grant execute on function public.word_suggestion_allowance() to authenticated;
