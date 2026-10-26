-- Run as database owner. Synthetic accounts and every change are rolled back.
begin;
do $$
declare
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid();
  org uuid:=gen_random_uuid(); song uuid:=gen_random_uuid(); service uuid:=gen_random_uuid(); factor uuid:=gen_random_uuid();
  n integer; denied boolean; state jsonb; i integer;
begin
  insert into auth.users(id,email,email_confirmed_at,aud,role,raw_user_meta_data)
  values(a,'account-fixture-'||a::text||'@example.invalid',now(),'authenticated','authenticated','{}'),
        (b,'account-fixture-'||b::text||'@example.invalid',now(),'authenticated','authenticated','{}');
  insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,a,now(),now());
  insert into public.organizations(id,name,slug,created_by) values(org,'Account fixture','account-'||org::text,a);
  insert into public.organization_members(organization_id,user_id,role) values(org,a,'admin');
  insert into public.songs(id,organization_id,title,chordpro_source,created_by,updated_by) values(song,org,'Account fixture','[G]Test',a,a);
  insert into public.setlists(id,organization_id,name,created_by,updated_by) values(service,org,'Account fixture',a,a);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',sid,'aal','aal1')::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  select public.get_account_session_state() into state;
  if not (state->>'active')::boolean or not (state->>'verified')::boolean or (state->>'mfaRequired')::boolean then raise exception 'Valid session rejected'; end if;
  select count(*) into n from public.songs where id=song;
  if n<>1 then raise exception 'Valid account cannot read its song'; end if;
  execute 'reset role';

  -- JWT session IDs cannot identify another user or a missing/revoked session.
  update auth.sessions set user_id=b where id=sid;
  execute 'set local role authenticated';
  select count(*) into n from public.songs where id=song;
  if n<>0 then raise exception 'Cross-user session accepted'; end if;
  execute 'reset role';
  update auth.sessions set user_id=a,created_at=now()-interval '31 days' where id=sid;
  execute 'set local role authenticated';
  if private.has_active_account_session() then raise exception 'Expired session accepted'; end if;
  execute 'reset role';
  update auth.sessions set created_at=now(),not_after=now()-interval '1 minute' where id=sid;
  execute 'set local role authenticated';
  if private.has_active_account_session() then raise exception 'Provider-expired session accepted'; end if;
  execute 'reset role';
  update auth.sessions set not_after=null where id=sid;
  update auth.users set email_confirmed_at=null where id=a;
  execute 'set local role authenticated';
  select count(*) into n from public.songs where id=song;
  if n<>0 then raise exception 'Unverified email bypassed RLS'; end if;
  denied:=false;
  begin perform public.toggle_song_favorite(song); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Unverified email bypassed definer RPC'; end if;
  execute 'reset role';
  update auth.users set email_confirmed_at=now() where id=a;

  -- Enabling MFA immediately blocks earlier password-only tokens at both APIs.
  insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,created_at,updated_at,secret)
  values(factor,a,'Account fixture','totp','verified',now(),now(),'fixture-not-used-by-auth');
  execute 'set local role authenticated';
  select public.get_account_session_state() into state;
  if not (state->>'mfaRequired')::boolean then raise exception 'MFA challenge not required'; end if;
  select count(*) into n from public.songs where id=song;
  if n<>0 then raise exception 'Password-only token bypassed MFA RLS'; end if;
  denied:=false;
  begin perform public.toggle_song_favorite(song); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Password-only token bypassed MFA RPC'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id',sid,'aal','aal2')::text,true);
  select count(*) into n from public.songs where id=song;
  if n<>1 then raise exception 'Verified MFA token rejected'; end if;
  execute 'reset role';
  delete from auth.sessions where id=sid;
  execute 'set local role authenticated';
  select count(*) into n from public.songs where id=song;
  if n<>0 then raise exception 'Revoked JWT retained RLS access'; end if;
  denied:=false;
  begin perform public.toggle_song_favorite(song); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Revoked JWT retained RPC access'; end if;
  execute 'reset role';

  -- Public callers cannot write or reset shared rate-limit counters.
  if has_function_privilege('anon','public.consume_auth_attempt(text,text,text)','EXECUTE')
    or has_function_privilege('authenticated','public.consume_auth_attempt(text,text,text)','EXECUTE') then raise exception 'Limiter is publicly writable'; end if;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  for i in 1..3 loop
    if not public.consume_auth_attempt('recovery',repeat('a',64),repeat('b',64)) then raise exception 'Limiter rejected allowed request'; end if;
  end loop;
  if public.consume_auth_attempt('recovery',repeat('a',64),repeat('b',64)) then raise exception 'Recovery limit not enforced'; end if;
  update private.auth_attempts set window_start=now()-interval '16 minutes'
  where operation='recovery' and subject in ('identity:'||repeat('a',64),'ip:'||repeat('b',64));
  if not public.consume_auth_attempt('recovery',repeat('a',64),repeat('b',64)) then raise exception 'Limiter did not recover after its window'; end if;
  if public.consume_auth_attempt('unknown',repeat('a',64),repeat('b',64)) then raise exception 'Unknown limiter operation accepted'; end if;
  for i in 1..15 loop
    perform public.consume_auth_attempt('recovery',repeat(lpad(to_hex(i),2,'0'),32),repeat('c',64));
  end loop;
  if public.consume_auth_attempt('recovery',repeat('d',64),repeat('c',64)) then raise exception 'IP limit not enforced'; end if;
  if exists(select 1 from private.auth_attempts where operation='recovery' and subject='identity:'||repeat('d',64)) then raise exception 'Blocked IP allocated a new identity counter'; end if;

  -- Removing uploaded audio/resources must not leave broken shared references.
  update public.songs set reference_audio_path=org::text||'/account-fixture.mp3' where id=song;
  insert into public.setlist_resources(organization_id,setlist_id,storage_path,display_name,created_by)
  values(org,service,org::text||'/account-fixture.mp3','Account fixture',a);
  perform public.clear_account_upload_references('workspace-files',array[org::text||'/account-fixture.mp3']);
  if exists(select 1 from public.songs where id=song and reference_audio_path is not null)
    or exists(select 1 from public.setlist_resources where setlist_id=service) then raise exception 'Deleted upload references retained'; end if;
  if has_function_privilege('authenticated','public.clear_account_upload_references(text,text[])','EXECUTE') then raise exception 'Cleanup RPC is publicly writable'; end if;

  -- The last administrator is protected even when Auth Admin deletes directly.
  if public.account_deletion_preflight(a) then raise exception 'Last admin passed preflight'; end if;
  denied:=false;
  begin delete from auth.users where id=a; exception when check_violation then denied:=true; end;
  if not denied then raise exception 'Last admin deletion bypassed database guard'; end if;
  insert into public.organization_members(organization_id,user_id,role) values(org,b,'admin');
  if not public.account_deletion_preflight(a) then raise exception 'Eligible account deletion blocked'; end if;
  delete from auth.users where id=a;
  if exists(select 1 from public.profiles where id=a) or exists(select 1 from public.organization_members where user_id=a) then raise exception 'Personal account rows retained'; end if;
  if not exists(select 1 from public.setlists where id=service and created_by is null and updated_by is null) then raise exception 'Shared service deletion or attribution regression'; end if;
  if not exists(select 1 from public.songs where id=song and created_by is null and updated_by is null) then raise exception 'Shared song deletion or attribution regression'; end if;
end $$;
select 'Account security checks passed' as result;
rollback;
