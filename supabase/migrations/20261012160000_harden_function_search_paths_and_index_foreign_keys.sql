-- Harden trigger-function name resolution and cover foreign keys with indexes.
-- This migration does not alter or delete application data.

alter function public.set_updated_at()
  set search_path = '';

alter function private.prevent_organization_change()
  set search_path = '';

create index if not exists notifications_organization_id_fk_idx
  on public.notifications (organization_id);
create index if not exists notifications_setlist_id_fk_idx
  on public.notifications (setlist_id);
create index if not exists organization_activity_actor_id_fk_idx
  on public.organization_activity (actor_id);
create index if not exists organization_invitations_accepted_by_fk_idx
  on public.organization_invitations (accepted_by);
create index if not exists organization_invitations_invited_by_fk_idx
  on public.organization_invitations (invited_by);
create index if not exists organizations_created_by_fk_idx
  on public.organizations (created_by);
create index if not exists service_items_created_by_fk_idx
  on public.service_items (created_by);
create index if not exists service_items_updated_by_fk_idx
  on public.service_items (updated_by);
create index if not exists service_templates_created_by_fk_idx
  on public.service_templates (created_by);
create index if not exists service_templates_updated_by_fk_idx
  on public.service_templates (updated_by);
create index if not exists setlist_resources_created_by_fk_idx
  on public.setlist_resources (created_by);
create index if not exists setlist_team_assignments_assigned_by_fk_idx
  on public.setlist_team_assignments (assigned_by);
create index if not exists setlist_timeline_items_created_by_fk_idx
  on public.setlist_timeline_items (created_by);
create index if not exists setlist_timeline_items_song_id_fk_idx
  on public.setlist_timeline_items (song_id);
create index if not exists setlists_created_by_fk_idx
  on public.setlists (created_by);
create index if not exists setlists_updated_by_fk_idx
  on public.setlists (updated_by);
create index if not exists song_versions_created_by_fk_idx
  on public.song_versions (created_by);
create index if not exists song_versions_organization_id_fk_idx
  on public.song_versions (organization_id);
create index if not exists songs_created_by_fk_idx
  on public.songs (created_by);
create index if not exists songs_updated_by_fk_idx
  on public.songs (updated_by);
create index if not exists tags_created_by_fk_idx
  on public.tags (created_by);
create index if not exists team_chat_messages_pinned_by_fk_idx
  on public.team_chat_messages (pinned_by);
create index if not exists team_chat_messages_user_id_fk_idx
  on public.team_chat_messages (user_id);

notify pgrst, 'reload schema';
