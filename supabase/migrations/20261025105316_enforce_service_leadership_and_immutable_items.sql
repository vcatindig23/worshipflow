-- Align direct Data API writes with leader-only publication/archive/completion actions.
create or replace function private.enforce_service_completion_permission()
returns trigger language plpgsql set search_path = '' as $$
declare v_changed boolean;
begin
  if tg_op = 'INSERT' then
    v_changed := new.status <> 'draft' or new.completed_at is not null or new.attendance_count is not null
      or new.actual_duration_minutes is not null or new.after_service_notes is not null;
  else
    v_changed := new.status is distinct from old.status
      or new.completed_at is distinct from old.completed_at
      or new.attendance_count is distinct from old.attendance_count
      or new.actual_duration_minutes is distinct from old.actual_duration_minutes
      or new.after_service_notes is distinct from old.after_service_notes;
  end if;
  if v_changed and (select auth.uid()) is not null
     and not private.has_org_role(new.organization_id, array['admin','worship_leader']::text[]) then
    raise exception 'SERVICE_LEADER_REQUIRED' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Legacy service order records cannot rewrite ownership/parent identity via direct UPDATE.
revoke update on public.service_items from public, authenticated;
grant update (item_type, title, duration_minutes, assigned_user_id, song_id, notes, position, updated_by, updated_at)
on public.service_items to authenticated;

-- Preflight found no invalid existing paths; validate historical as well as future rows.
alter table public.songs validate constraint songs_reference_audio_tenant_check;
alter table public.setlist_resources validate constraint setlist_resource_tenant_path_check;
