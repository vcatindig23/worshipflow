-- Add covering indexes for foreign keys flagged by Supabase's performance advisor.
-- These indexes support joins and parent-row updates/deletes without changing data.
CREATE INDEX IF NOT EXISTS setlist_announcement_ack_user_id_idx
  ON public.setlist_announcement_acknowledgments (user_id);

CREATE INDEX IF NOT EXISTS setlist_assignment_swap_assignment_setlist_idx
  ON public.setlist_assignment_swap_requests (assignment_id, setlist_id);

CREATE INDEX IF NOT EXISTS setlist_assignment_swap_organization_id_idx
  ON public.setlist_assignment_swap_requests (organization_id);

CREATE INDEX IF NOT EXISTS setlist_assignment_swap_reviewed_by_idx
  ON public.setlist_assignment_swap_requests (reviewed_by);

CREATE INDEX IF NOT EXISTS setlist_preparation_tasks_created_by_idx
  ON public.setlist_preparation_tasks (created_by);

CREATE INDEX IF NOT EXISTS setlist_preparation_tasks_setlist_org_idx
  ON public.setlist_preparation_tasks (setlist_id, organization_id);

CREATE INDEX IF NOT EXISTS setlist_reminder_deliveries_user_id_idx
  ON public.setlist_reminder_deliveries (user_id);
