-- Extend member profiles with social-style profile details and safe self-service worship positions.
alter table public.profiles
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists website text;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_bio_length'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length
      check (bio is null or char_length(bio) <= 500);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_location_length'
  ) then
    alter table public.profiles
      add constraint profiles_location_length
      check (location is null or char_length(location) <= 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_website_length'
  ) then
    alter table public.profiles
      add constraint profiles_website_length
      check (website is null or char_length(website) <= 250);
  end if;
end;
$constraints$;

create or replace function public.update_own_team_positions(
  p_organization_id uuid,
  p_team_positions text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if p_organization_id is null then
    raise exception 'ORGANIZATION_REQUIRED';
  end if;

  if p_team_positions is null
    or cardinality(p_team_positions) > 10
    or not (p_team_positions <@ array[
      'worship_leader',
      'singer',
      'lead_guitarist',
      'rhythm_guitarist',
      'acoustic_guitarist',
      'electric_guitarist',
      'bassist',
      'keyboardist',
      'pianist',
      'drummer',
      'percussionist',
      'violinist',
      'cellist',
      'sound_engineer',
      'audio_visual',
      'choir_member',
      'other'
    ]::text[])
  then
    raise exception 'INVALID_TEAM_POSITIONS';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
  ) then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  update public.organization_members om
  set team_positions = array(
    select distinct position
    from unnest(p_team_positions) as positions(position)
    order by position
  )
  where om.organization_id = p_organization_id
    and om.user_id = (select auth.uid());

  if not found then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;
end;
$function$;

revoke execute on function public.update_own_team_positions(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.update_own_team_positions(uuid, text[])
  to authenticated;

notify pgrst, 'reload schema';
