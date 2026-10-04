create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null,
  code_hash text not null unique,
  status text not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  constraint organization_invitations_role_check check (
    role in (
      'worship_leader',
      'song_editor',
      'team_member',
      'viewer'
    )
  ),
  constraint organization_invitations_status_check check (
    status in (
      'pending',
      'accepted',
      'revoked',
      'expired'
    )
  )
);

create index if not exists organization_invitations_organization_id_idx
  on public.organization_invitations(organization_id);

create index if not exists organization_invitations_email_idx
  on public.organization_invitations(lower(email));

create index if not exists organization_invitations_status_idx
  on public.organization_invitations(status);

create unique index if not exists organization_invitations_pending_email_idx
  on public.organization_invitations(
    organization_id,
    lower(email)
  )
  where status = 'pending';

alter table public.organization_invitations enable row level security;

revoke all on table public.organization_invitations from anon, authenticated;

grant select on table public.organization_invitations to authenticated;

drop policy if exists "Administrators can view organization invitations"
  on public.organization_invitations;

create policy "Administrators can view organization invitations"
on public.organization_invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = organization_invitations.organization_id
      and om.user_id = (select auth.uid())
      and om.role = 'admin'
  )
);

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_code_hash text
)
returns table (
  invitation_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  if (auth.uid() is null) then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  v_email := lower(trim(p_email));

  if v_email = '' then
    raise exception 'EMAIL_REQUIRED';
  end if;

  if p_role not in (
    'worship_leader',
    'song_editor',
    'team_member',
    'viewer'
  ) then
    raise exception 'INVALID_ROLE';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.role = 'admin'
  ) then
    raise exception 'ADMINISTRATOR_REQUIRED';
  end if;

  if exists (
    select 1
    from public.organization_members om
    join auth.users u
      on u.id = om.user_id
    where om.organization_id = p_organization_id
      and lower(coalesce(u.email, '')) = v_email
  ) then
    raise exception 'USER_ALREADY_MEMBER';
  end if;

  delete from public.organization_invitations
  where organization_id = p_organization_id
    and lower(email) = v_email
    and status = 'pending'
    and expires_at < now();

  insert into public.organization_invitations (
    organization_id,
    email,
    role,
    code_hash,
    invited_by
  )
  values (
    p_organization_id,
    v_email,
    p_role,
    p_code_hash,
    (select auth.uid())
  )
  returning id, organization_invitations.expires_at
  into v_invitation_id, v_expires_at;

  return query
  select v_invitation_id, v_expires_at;
end;
$$;

create or replace function public.accept_organization_invitation(
  p_code_hash text
)
returns table (
  organization_id uuid,
  role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.organization_invitations%rowtype;
  v_email text;
  v_existing_organization uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  v_email := lower(
    trim(
      coalesce(
        (select auth.jwt() ->> 'email'),
        ''
      )
    )
  );

  select *
  into v_invitation
  from public.organization_invitations oi
  where oi.code_hash = p_code_hash
  for update;

  if not found then
    raise exception 'INVALID_INVITATION';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'INVITATION_NOT_ACTIVE';
  end if;

  if v_invitation.expires_at < now() then
    update public.organization_invitations
    set status = 'expired'
    where id = v_invitation.id;

    raise exception 'INVITATION_EXPIRED';
  end if;

  if v_email = '' or lower(v_invitation.email) <> v_email then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  select om.organization_id
  into v_existing_organization
  from public.organization_members om
  where om.user_id = (select auth.uid())
  order by om.created_at
  limit 1;

  if v_existing_organization is not null then
    if v_existing_organization = v_invitation.organization_id then
      update public.organization_invitations
      set
        status = 'accepted',
        accepted_by = (select auth.uid()),
        accepted_at = now()
      where id = v_invitation.id;

      return query
      select
        v_invitation.organization_id,
        v_invitation.role;

      return;
    end if;

    raise exception 'ACCOUNT_ALREADY_BELONGS_TO_CHURCH';
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    v_invitation.organization_id,
    (select auth.uid()),
    v_invitation.role
  );

  update public.organization_invitations
  set
    status = 'accepted',
    accepted_by = (select auth.uid()),
    accepted_at = now()
  where id = v_invitation.id;

  return query
  select
    v_invitation.organization_id,
    v_invitation.role;
end;
$$;

create or replace function public.revoke_organization_invitation(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select organization_id
  into v_organization_id
  from public.organization_invitations
  where id = p_invitation_id
    and status = 'pending';

  if v_organization_id is null then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = (select auth.uid())
      and role = 'admin'
  ) then
    raise exception 'ADMINISTRATOR_REQUIRED';
  end if;

  update public.organization_invitations
  set status = 'revoked'
  where id = p_invitation_id;
end;
$$;

create or replace function public.update_organization_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
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

  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
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
$$;

create or replace function public.remove_organization_member(
  p_organization_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
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
$$;

revoke execute on function public.create_organization_invitation(
  uuid,
  text,
  text,
  text
) from public, anon, authenticated;

revoke execute on function public.accept_organization_invitation(
  text
) from public, anon, authenticated;

revoke execute on function public.revoke_organization_invitation(
  uuid
) from public, anon, authenticated;

revoke execute on function public.update_organization_member_role(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

revoke execute on function public.remove_organization_member(
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.create_organization_invitation(
  uuid,
  text,
  text,
  text
) to authenticated;

grant execute on function public.accept_organization_invitation(
  text
) to authenticated;

grant execute on function public.revoke_organization_invitation(
  uuid
) to authenticated;

grant execute on function public.update_organization_member_role(
  uuid,
  uuid,
  text
) to authenticated;

grant execute on function public.remove_organization_member(
  uuid,
  uuid
) to authenticated;