-- Session validity is checked independently of JWT signature/expiry. Revoked JWTs
-- and password-only JWTs for MFA accounts must not retain Data API access.
create or replace function private.account_session_state()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'active', exists (
      select 1 from auth.sessions s join auth.users u on u.id=s.user_id
      where s.id::text=(select auth.jwt()->>'session_id') and s.user_id=(select auth.uid())
        and s.created_at > now()-interval '30 days'
        and (s.not_after is null or s.not_after>now())
        and (u.banned_until is null or u.banned_until<=now()) and u.deleted_at is null
    ),
    'verified', exists(select 1 from auth.users u where u.id=(select auth.uid()) and u.email_confirmed_at is not null),
    'mfaRequired', coalesce((select auth.jwt()->>'aal'),'aal1') <> 'aal2'
      and exists(select 1 from auth.mfa_factors f where f.user_id=(select auth.uid()) and f.status='verified')
  );
$$;
revoke all on function private.account_session_state() from public, anon;
grant execute on function private.account_session_state() to authenticated;

create or replace function private.has_active_account_session()
returns boolean language sql stable security definer set search_path = '' as $$
  select (s->>'active')::boolean and (s->>'verified')::boolean and not (s->>'mfaRequired')::boolean
  from (select private.account_session_state() as s) q;
$$;
revoke all on function private.has_active_account_session() from public, anon;
grant execute on function private.has_active_account_session() to authenticated;

-- Existing SECURITY DEFINER RPCs bypass RLS. Add the same guard inside each one.
do $$
declare f record; definition text;
begin
  for f in select p.oid, p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    join pg_language l on l.oid=p.prolang
    where n.nspname='public' and p.prosecdef and l.lanname='plpgsql'
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
  loop
    if position('private.has_active_account_session()' in f.prosrc)=0 then
      definition := pg_get_functiondef(f.oid);
      definition := regexp_replace(definition, E'\\mbegin\\M', E'begin\n  if not private.has_active_account_session() then raise exception ''ACTIVE_VERIFIED_SESSION_REQUIRED'' using errcode = ''42501''; end if;', 'i');
      execute definition;
    end if;
  end loop;
end $$;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('create policy active_account_session on public.%I as restrictive for all to authenticated using ((select private.has_active_account_session())) with check ((select private.has_active_account_session()))',t.tablename);
  end loop;
end $$;
create policy active_account_session on storage.objects as restrictive for all to authenticated
using ((select private.has_active_account_session())) with check ((select private.has_active_account_session()));

create function public.get_account_session_state()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.account_session_state();
$$;
revoke all on function public.get_account_session_state() from public, anon;
grant execute on function public.get_account_session_state() to authenticated;

-- The limiter is callable only with the server secret key. Counters contain
-- SHA-256 digests, never email addresses or IPs, and are removed after 24 hours.
create table private.auth_attempts (
  operation text not null, subject text not null, window_start timestamptz not null,
  attempts integer not null default 1, primary key(operation,subject)
);
alter table private.auth_attempts enable row level security;
revoke all on private.auth_attempts from public, anon, authenticated;
create index auth_attempts_expiry on private.auth_attempts(window_start);
create function public.consume_auth_attempt(p_operation text,p_identity text,p_ip text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare identity_limit integer; ip_limit integer; allowed boolean:=true; key text; used integer; cap integer;
begin
  if (select auth.role()) is distinct from 'service_role' then raise insufficient_privilege; end if;
  if p_identity !~ '^[a-f0-9]{64}$' or p_ip !~ '^[a-f0-9]{64}$' then return false; end if;
  case p_operation
    when 'login' then identity_limit:=10; ip_limit:=50;
    when 'signup' then identity_limit:=3; ip_limit:=15;
    when 'recovery' then identity_limit:=3; ip_limit:=15;
    when 'sensitive' then identity_limit:=5; ip_limit:=25;
    when 'mfa' then identity_limit:=10; ip_limit:=40;
    else return false;
  end case;
  delete from private.auth_attempts where window_start<now()-interval '24 hours';
  foreach key in array array['identity:'||p_identity,'ip:'||p_ip] loop
    cap:=case when key like 'identity:%' then identity_limit else ip_limit end;
    insert into private.auth_attempts as a(operation,subject,window_start) values(p_operation,key,now())
    on conflict(operation,subject) do update set
      attempts=case when a.window_start<now()-interval '15 minutes' then 1 else least(a.attempts+1,100000) end,
      window_start=case when a.window_start<now()-interval '15 minutes' then now() else a.window_start end
    returning attempts into used;
    allowed:=allowed and used<=cap;
  end loop;
  return allowed;
end $$;
revoke all on function public.consume_auth_attempt(text,text,text) from public, anon, authenticated;
grant execute on function public.consume_auth_attempt(text,text,text) to service_role;

-- Retain shared church content with cleared attribution when its author leaves.
do $$
declare c record; column_name text;
begin
  for c in select conrelid::regclass as tab, conname, conkey from pg_constraint
    where contype='f' and confrelid='auth.users'::regclass and confdeltype='r'
      and connamespace='public'::regnamespace
  loop
    select a.attname into column_name from pg_attribute a where a.attrelid=c.tab and a.attnum=c.conkey[1];
    execute format('alter table %s alter column %I drop not null',c.tab,column_name);
    execute format('alter table %s drop constraint %I',c.tab,c.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references auth.users(id) on delete set null',c.tab,c.conname,column_name);
  end loop;
end $$;

create function private.prevent_last_admin_account_deletion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare org_id uuid;
begin
  for org_id in select organization_id from public.organization_members where user_id=old.id and role='admin' order by organization_id loop
    perform 1 from public.organizations where id=org_id for update;
    if not exists(select 1 from public.organization_members where organization_id=org_id and user_id<>old.id and role='admin') then
      raise exception 'LAST_ADMINISTRATOR' using errcode='23514';
    end if;
  end loop;
  return old;
end $$;
revoke all on function private.prevent_last_admin_account_deletion() from public, anon, authenticated;
create trigger prevent_last_admin_account_deletion before delete on auth.users
for each row execute function private.prevent_last_admin_account_deletion();

-- Preflight checks happen before Storage removal. The Auth trigger above repeats
-- the last-admin check atomically at deletion, including concurrent requests.
create function public.account_deletion_preflight(p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.role())='service_role' and not exists(
   select 1 from public.organization_members m where m.user_id=p_user_id and m.role='admin'
   and not exists(select 1 from public.organization_members other where other.organization_id=m.organization_id and other.user_id<>p_user_id and other.role='admin')
 );
$$;
create function public.list_account_uploads(p_user_id uuid)
returns table(bucket_id text,name text) language sql stable security definer set search_path='' as $$
 select o.bucket_id,o.name from storage.objects o
 where (select auth.role())='service_role' and (o.owner_id=p_user_id::text or o.owner=p_user_id
   or (o.bucket_id='profile-avatars' and split_part(o.name,'/',1)=p_user_id::text))
 order by o.bucket_id,o.name limit 200;
$$;
revoke all on function public.account_deletion_preflight(uuid),public.list_account_uploads(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_preflight(uuid),public.list_account_uploads(uuid) to service_role;

-- Account deletion can cascade while a stale request claim still names the
-- deleted actor. Preserve history without inserting a dangling user reference.
do $$
declare definition text;
begin
  select pg_get_functiondef('private.log_organization_activity()'::regprocedure) into definition;
  definition:=replace(definition,'if v_actor_id is null then','if v_actor_id is null or not exists(select 1 from auth.users where id=v_actor_id) then');
  execute definition;
end $$;
do $$
declare definition text;
begin
  select pg_get_functiondef('private.audit_permission_change()'::regprocedure) into definition;
  definition:=replace(definition,'(select auth.uid()), v_action','(select id from auth.users where id=(select auth.uid())), v_action');
  execute definition;
end $$;
