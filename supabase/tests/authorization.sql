-- Run as the database owner, never through the public Data API. All fixtures roll back.
-- No existing users, memberships, content, or credentials are read or modified.
begin;
do $$
declare
  admin_a uuid := gen_random_uuid(); editor_a uuid := gen_random_uuid(); member_a uuid := gen_random_uuid(); viewer_a uuid := gen_random_uuid();
  admin_b uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  org_a uuid := gen_random_uuid(); org_b uuid := gen_random_uuid();
  song_a uuid := gen_random_uuid(); song_b uuid := gen_random_uuid(); service_a uuid := gen_random_uuid(); service_b uuid := gen_random_uuid();
  uid uuid; n integer; denied boolean; checks integer := 0;
begin
  foreach uid in array array[admin_a,editor_a,member_a,viewer_a,admin_b,outsider] loop
    insert into auth.users(id,email,aud,role,raw_user_meta_data)
    values(uid, 'authorization-'||uid::text||'@example.invalid','authenticated','authenticated','{"full_name":"Authorization test fixture"}'::jsonb);
  end loop;
  insert into public.organizations(id,name,slug,created_by)
  values(org_a,'Authorization fixture A','auth-fixture-'||org_a::text,admin_a),
        (org_b,'Authorization fixture B','auth-fixture-'||org_b::text,admin_b);
  insert into public.organization_members(organization_id,user_id,role)
  values(org_a,admin_a,'admin'),(org_a,editor_a,'song_editor'),(org_a,member_a,'team_member'),(org_a,viewer_a,'viewer'),(org_b,admin_b,'admin');
  insert into public.songs(id,organization_id,title,chordpro_source,created_by,updated_by)
  values(song_a,org_a,'Authorization test A','[G]A',admin_a,admin_a),(song_b,org_b,'Authorization test B','[C]B',admin_b,admin_b);
  insert into public.setlists(id,organization_id,name,created_by,updated_by)
  values(service_a,org_a,'Authorization service A',admin_a,admin_a),(service_b,org_b,'Authorization service B',admin_b,admin_b);

  -- Inspect dangerous privileges; never actually execute TRUNCATE against any table.
  if exists(select 1 from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relkind='r'
    and (has_table_privilege('authenticated',c.oid,'TRUNCATE') or has_table_privilege('authenticated',c.oid,'TRIGGER') or has_table_privilege('authenticated',c.oid,'REFERENCES'))) then
    raise exception 'Unexpected DDL privilege for authenticated'; end if;
  if has_table_privilege('authenticated','public.organization_members','UPDATE') or has_column_privilege('authenticated','public.organization_members','role','UPDATE') then
    raise exception 'Direct role updates must be unavailable'; end if;
  if has_column_privilege('authenticated','public.service_items','created_by','UPDATE') then
    raise exception 'Legacy service item ownership is mutable';end if;
  checks := checks + 3;

  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_a,'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text,true);
  perform set_config('request.jwt.claim.sub',member_a::text,true);
  execute 'set local role authenticated';
  select count(*) into n from public.songs where id=song_a;
  if n<>1 then raise exception 'Members must read their own tenant'; end if;
  select count(*) into n from public.songs where id=song_b;
  if n<>0 then raise exception 'Cross-tenant song read'; end if;
  select count(*) into n from public.profiles where id=admin_b;
  if n<>0 then raise exception 'Cross-tenant profile read'; end if;
  select count(*) into n from public.organizations where id=org_b;
  if n<>0 then raise exception 'Cross-tenant organization read'; end if;
  checks := checks+4;
  denied := false;
  begin
    update public.songs set status='archived' where id=song_a;
    get diagnostics n = row_count; denied := n=0;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Member edited catalog'; end if;
  denied := false;
  begin perform public.update_organization_member_role(org_a,member_a,'admin');
  exception when others then if sqlerrm like '%ADMINISTRATOR_REQUIRED%' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'Member self-promoted using spoofed metadata'; end if;
  denied := false;
  begin update public.organization_members set role='admin' where user_id=member_a;
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Member changed role directly'; end if;
  denied := false;
  begin perform public.remove_organization_member(org_a,admin_a);
  exception when others then if sqlerrm like '%ADMINISTRATOR_REQUIRED%' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'Member removed an administrator'; end if;
  select count(*) into n from public.permission_audit_log where organization_id=org_a;
  if n<>0 then raise exception 'Non-admin read sensitive permission history'; end if;
  checks:=checks+5;

  -- A viewer can read shared planning, but cannot modify it.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',viewer_a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',viewer_a::text,true);
  denied:=false;
  begin update public.setlists set name='Unauthorized' where id=service_a;
    get diagnostics n=row_count;denied:=n=0;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Viewer changed a service';end if;
  checks:=checks+1;

  -- The editor can edit planning, cannot complete services or cross the tenant boundary.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',editor_a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',editor_a::text,true);
  update public.setlists set name='Authorized editor update' where id=service_a;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Editor lost planning permission'; end if;
  update public.setlists set name='Unauthorized cross-tenant update' where id=service_b;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Cross-tenant update'; end if;
  denied:=false;
  begin update public.setlists set completed_at=now() where id=service_a;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Editor bypassed leader completion rule';end if;
  denied:=false;
  begin insert into public.setlists(organization_id,name,created_by,updated_by,completed_at)
    values(org_a,'Pre-completed bypass',editor_a,editor_a,now());
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Editor created a pre-completed service';end if;
  denied:=false;
  begin update public.songs set reference_audio_path=org_b::text||'/test.mp3' where id=song_a;
  exception when check_violation then denied:=true;end;
  if not denied then raise exception 'Cross-tenant audio reference';end if;
  denied:=false;
  begin update public.songs set created_by=admin_b where id=song_a;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Editor forged ownership';end if;
  denied:=false;
  begin update public.setlists set status='published' where id=service_a;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Editor bypassed publication rule';end if;
  denied:=false;
  begin insert into public.setlists(organization_id,name,status,created_by,updated_by)
    values(org_a,'Pre-published bypass','published',editor_a,editor_a);
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Editor created a published service';end if;
  checks:=checks+8;

  -- Existing approved RPC writes, preferences and member self-service still work.
  perform public.update_song_with_version(song_a,'Authorized chart',null,100,'4/4',0,'[G]Updated',null,'G');
  perform public.record_song_open(song_a);
  select count(*) into n from public.song_user_preferences where song_id=song_a and user_id=editor_a and open_count=1;
  if n<>1 then raise exception 'Preference update regression';end if;
  perform public.update_own_team_positions(org_a,array['drummer']);
  select count(*) into n from public.organization_members where user_id=editor_a and role='song_editor' and team_positions=array['drummer'];
  if n<>1 then raise exception 'Self-service changed access role';end if;
  checks:=checks+3;

  -- A tenant administrator may promote a teammate, but never a member of another tenant.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',admin_a::text,true);
  perform public.update_organization_member_role(org_a,member_a,'song_editor');
  select count(*) into n from public.permission_audit_log where organization_id=org_a and actor_id=admin_a and target_id=member_a
    and action='member.role_changed' and before_values->>'role'='team_member' and after_values->>'role'='song_editor';
  if n<>1 then raise exception 'Permission change audit missing or spoofed';end if;
  select count(*) into n from public.permission_audit_log where organization_id=org_b;
  if n<>0 then raise exception 'Cross-tenant audit read';end if;
  denied:=false;
  begin perform public.update_organization_member_role(org_b,admin_b,'viewer');
  exception when others then if sqlerrm like '%ADMINISTRATOR_REQUIRED%' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'Admin changed another tenant membership';end if;
  denied:=false;
  begin delete from public.permission_audit_log where organization_id=org_a;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Admin erased permission history';end if;
  denied:=false;
  begin perform public.update_organization_member_role(org_a,admin_a,'viewer');
  exception when others then if sqlerrm like '%LAST_ADMIN_CANNOT_BE_DEMOTED%' then denied:=true;else raise;end if;end;
  if not denied then raise exception 'Last administrator was demoted';end if;
  update public.setlists set status='published',completed_at=now(),attendance_count=10 where id=service_a;
  get diagnostics n=row_count;if n<>1 then raise exception 'Leader completion regression';end if;
  checks:=checks+6;

  -- A signed-in account with no membership has no tenant access.
  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  select count(*) into n from public.songs where id in (song_a,song_b);
  if n<>0 then raise exception 'Outsider read shared songs';end if;
  checks:=checks+1;
  execute 'reset role';

  -- Anonymous callers cannot invoke administrative functions or read app records.
  perform set_config('request.jwt.claims','{}',true);
  perform set_config('request.jwt.claim.sub','',true);
  execute 'set local role anon';
  denied:=false;
  begin perform public.update_organization_member_role(org_a,member_a,'admin');
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Anonymous administrative RPC';end if;
  denied:=false;
  begin perform id from public.songs where id=song_a;
  exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Anonymous data access';end if;
  checks:=checks+2;
  execute 'reset role';
  if checks <> 33 then raise exception 'Unexpected authorization test count: %',checks;end if;
end;
$$;
rollback;
select '33 database authorization checks passed; all fixtures rolled back' as result;
