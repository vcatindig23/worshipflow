-- Serialize administrator membership changes per organization so two
-- concurrent requests cannot both pass the "last admin" check on stale state.

create or replace function public.remove_organization_member(
  p_organization_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  perform 1
  from public.organizations
  where id = p_organization_id
  for update;

  if not found then
    raise exception 'ORGANIZATION_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
      and role = 'admin'
  ) then
    raise exception 'ADMINISTRATOR_REQUIRED';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'CANNOT_REMOVE_SELF';
  end if;

  select role
  into v_target_role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_user_id;

  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  if v_target_role = 'admin' then
    if not exists (
      select 1
      from public.organization_members
      where organization_id = p_organization_id
        and role = 'admin'
        and user_id <> p_user_id
    ) then
      raise exception 'LAST_ADMIN_CANNOT_BE_REMOVED';
    end if;
  end if;

  delete from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_user_id;
end;
$function$;

create or replace function public.update_organization_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current_role text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  perform 1
  from public.organizations
  where id = p_organization_id
  for update;

  if not found then
    raise exception 'ORGANIZATION_NOT_FOUND';
  end if;

  if p_role not in (
    'admin',
    'worship_leader',
    'song_editor',
    'team_member',
    'viewer'
  ) then
    raise exception 'INVALID_ROLE';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
      and role = 'admin'
  ) then
    raise exception 'ADMINISTRATOR_REQUIRED';
  end if;

  select role
  into v_current_role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = p_user_id;

  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  if p_user_id = (select auth.uid())
     and p_role <> 'admin' then
    if not exists (
      select 1
      from public.organization_members
      where organization_id = p_organization_id
        and role = 'admin'
        and user_id <> (select auth.uid())
    ) then
      raise exception 'LAST_ADMIN_CANNOT_BE_DEMOTED';
    end if;
  end if;

  update public.organization_members
  set role = p_role
  where organization_id = p_organization_id
    and user_id = p_user_id;
end;
$function$;

notify pgrst, 'reload schema';
