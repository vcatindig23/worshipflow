-- Check the IP window before allocating an identity counter. Blocked callers
-- cannot grow new per-identity rows after exhausting their IP allowance.
create or replace function public.consume_auth_attempt(p_operation text,p_identity text,p_ip text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare identity_limit integer; ip_limit integer; key text; used integer; cap integer;
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
  foreach key in array array['ip:'||p_ip,'identity:'||p_identity] loop
    cap:=case when key like 'identity:%' then identity_limit else ip_limit end;
    insert into private.auth_attempts as a(operation,subject,window_start) values(p_operation,key,now())
    on conflict(operation,subject) do update set
      attempts=case when a.window_start<now()-interval '15 minutes' then 1 else least(a.attempts+1,100000) end,
      window_start=case when a.window_start<now()-interval '15 minutes' then now() else a.window_start end
    returning attempts into used;
    if used>cap then return false; end if;
  end loop;
  return true;
end $$;
