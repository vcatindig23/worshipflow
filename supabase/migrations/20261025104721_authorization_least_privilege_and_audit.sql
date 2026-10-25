-- Restrict SQL privileges in addition to RLS. TRUNCATE bypasses row policies.
revoke truncate, references, trigger on all tables in schema public from public, anon, authenticated;
revoke all on all tables in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated;

revoke all on public.organization_members from public, authenticated;
grant select on public.organization_members to authenticated;

revoke all on public.organizations from public, authenticated;
grant select on public.organizations to authenticated;
grant update (name, description, contact_email, contact_phone, address, website, timezone, default_service_name, default_service_day, default_service_time, onboarding_completed_at) on public.organizations to authenticated;

revoke all on public.profiles from public, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, bio, location, website) on public.profiles to authenticated;

revoke all on public.song_versions from public, authenticated;
grant select on public.song_versions to authenticated;

revoke all on public.song_tags from public, authenticated;
grant select on public.song_tags to authenticated;

revoke all on public.tags from public, authenticated;
grant select on public.tags to authenticated;

revoke all on public.songs from public, authenticated;
grant select, delete on public.songs to authenticated;
grant update (status, reference_audio_path, updated_by) on public.songs to authenticated;

revoke all on public.setlist_resources from public, authenticated;
grant select, insert, delete on public.setlist_resources to authenticated;

revoke all on public.service_templates from public, authenticated;
grant select, insert, delete on public.service_templates to authenticated;
grant update (name, description, template_data, updated_by) on public.service_templates to authenticated;

revoke all on public.song_review_threads from public, authenticated;
grant select, insert on public.song_review_threads to authenticated;
grant update (status, updated_by, reviewed_by) on public.song_review_threads to authenticated;

revoke all on public.song_review_comments from public, authenticated;
grant select, insert, delete on public.song_review_comments to authenticated;

revoke all on public.setlist_timeline_items from public, authenticated;
grant select, insert, delete on public.setlist_timeline_items to authenticated;
grant update (position, item_type, title, duration_minutes, notes, song_id, updated_at) on public.setlist_timeline_items to authenticated;

revoke all on public.setlist_preparation_tasks from public, authenticated;
grant select, insert, delete on public.setlist_preparation_tasks to authenticated;
grant update (title, details, is_completed, position, updated_at) on public.setlist_preparation_tasks to authenticated;

revoke all on public.song_user_preferences from public, authenticated;
grant select, insert, delete on public.song_user_preferences to authenticated;
grant update (is_favorite, last_opened_at, open_count, updated_at) on public.song_user_preferences to authenticated;

revoke all on public.setlists from public, authenticated;
grant select, insert, delete on public.setlists to authenticated;
grant update (name, description, status, service_date, service_time, service_notes, announcements, theme, service_type, location, end_time, completed_at, actual_duration_minutes, attendance_count, after_service_notes, rehearsal_date, rehearsal_time, rehearsal_end_time, rehearsal_location, rehearsal_notes, updated_by, updated_at) on public.setlists to authenticated;

-- Updated rows must never move between tenants, even through future SQL/RPC code.
drop trigger if exists setlists_prevent_organization_change on public.setlists;
create trigger setlists_prevent_organization_change before update on public.setlists
for each row execute function private.prevent_organization_change();
drop trigger if exists service_templates_prevent_organization_change on public.service_templates;
create trigger service_templates_prevent_organization_change before update on public.service_templates
for each row execute function private.prevent_organization_change();

-- A catalog editor must not bypass leader-only completion actions via the Data API.
create or replace function private.enforce_service_completion_permission()
returns trigger language plpgsql set search_path = '' as $$
declare v_changed boolean;
begin
  if tg_op = 'INSERT' then
    v_changed := new.completed_at is not null or new.attendance_count is not null
      or new.actual_duration_minutes is not null or new.after_service_notes is not null;
  else
    v_changed := new.completed_at is distinct from old.completed_at
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
revoke all on function private.enforce_service_completion_permission() from public, anon, authenticated;
drop trigger if exists setlists_completion_permission on public.setlists;
create trigger setlists_completion_permission before insert or update on public.setlists
for each row execute function private.enforce_service_completion_permission();

-- These reference paths are private tenant-scoped Storage objects, never arbitrary paths.
alter table public.songs add constraint songs_reference_audio_tenant_check
check (reference_audio_path is null or
  (split_part(reference_audio_path, '/', 1) = organization_id::text
   and array_length(string_to_array(reference_audio_path, '/'), 1) = 2)) not valid;
alter table public.setlist_resources add constraint setlist_resource_tenant_path_check
check (split_part(storage_path, '/', 1) = organization_id::text
  and array_length(string_to_array(storage_path, '/'), 1) = 2) not valid;

-- Append-only permission history, visible to administrators of the affected tenant.
create table public.permission_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_id uuid,
  before_values jsonb,
  after_values jsonb,
  created_at timestamptz not null default now()
);
alter table public.permission_audit_log enable row level security;
revoke all on public.permission_audit_log from public, anon, authenticated;
grant select on public.permission_audit_log to authenticated;
create index permission_audit_log_org_created_idx on public.permission_audit_log(organization_id, created_at desc);
create policy "Administrators can read tenant permission audit"
on public.permission_audit_log for select to authenticated
using ((select private.has_org_role(organization_id, array['admin']::text[])));

create or replace function private.audit_permission_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb; v_after jsonb; v_row jsonb; v_action text; v_target uuid;
begin
  if tg_op <> 'INSERT' then v_before := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_after := to_jsonb(new); end if;
  v_row := coalesce(v_after, v_before);
  if tg_table_name = 'organization_members' then
    if tg_op = 'UPDATE' and v_before->'role' is not distinct from v_after->'role'
      and v_before->'team_positions' is not distinct from v_after->'team_positions' then return null; end if;
    v_target := (v_row->>'user_id')::uuid;
    v_action := case when tg_op = 'INSERT' then 'member.added' when tg_op = 'DELETE' then 'member.removed'
      when v_before->'role' is distinct from v_after->'role' then 'member.role_changed' else 'member.positions_changed' end;
    if v_before is not null then v_before := jsonb_build_object('role',v_before->'role','team_positions',v_before->'team_positions'); end if;
    if v_after is not null then v_after := jsonb_build_object('role',v_after->'role','team_positions',v_after->'team_positions'); end if;
  elsif tg_table_name = 'organization_invitations' then
    if tg_op = 'UPDATE' and v_before->'status' is not distinct from v_after->'status'
      and v_before->'role' is not distinct from v_after->'role' then return null; end if;
    v_target := (v_row->>'id')::uuid;
    v_action := 'invitation.' || case when tg_op = 'INSERT' then 'created' when tg_op = 'DELETE' then 'removed' else coalesce(v_after->>'status','changed') end;
    if v_before is not null then v_before := jsonb_build_object('role',v_before->'role','status',v_before->'status'); end if;
    if v_after is not null then v_after := jsonb_build_object('role',v_after->'role','status',v_after->'status'); end if;
  else raise exception 'Unsupported permission audit source'; end if;
  insert into public.permission_audit_log(organization_id, actor_id, action, target_id, before_values, after_values)
  values ((v_row->>'organization_id')::uuid, (select auth.uid()), v_action, v_target, v_before, v_after);
  return null;
end;
$$;
revoke all on function private.audit_permission_change() from public, anon, authenticated;
create trigger organization_members_permission_audit after insert or update or delete on public.organization_members
for each row execute function private.audit_permission_change();
create trigger organization_invitations_permission_audit after insert or update or delete on public.organization_invitations
for each row execute function private.audit_permission_change();

-- A trigger function is not an RPC entry point.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
