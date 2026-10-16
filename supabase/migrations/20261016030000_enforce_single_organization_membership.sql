-- Enforce the one-church-per-account onboarding rule at the database layer.
-- Invitation acceptance already rejects a second organization; this closes the
-- direct create_organization RPC path that could bypass the onboarding page.

create unique index if not exists organization_members_one_org_per_user_idx
  on public.organization_members (user_id);

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_name text;
  v_base_slug text;
  v_slug text;
  v_organization_id uuid;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.user_id = v_user_id
  ) then
    raise exception 'ACCOUNT_ALREADY_BELONGS_TO_CHURCH'
      using errcode = '23505';
  end if;

  v_name := trim(coalesce(p_name, ''));

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters';
  end if;

  v_base_slug := trim(
    both '-'
    from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')
  );

  if char_length(v_base_slug) < 2 then
    raise exception 'Organization name must contain usable letters or numbers';
  end if;

  v_slug := v_base_slug;

  loop
    begin
      insert into public.organizations (
        name,
        slug,
        created_by
      )
      values (
        v_name,
        v_slug,
        v_user_id
      )
      returning id into v_organization_id;

      exit;
    exception
      when unique_violation then
        v_slug := v_base_slug || '-' ||
          substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    end;
  end loop;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    v_organization_id,
    v_user_id,
    'admin'
  );

  return v_organization_id;
end;
$function$;

notify pgrst, 'reload schema';
