drop policy if exists "Reminder deliveries are internal"
  on public.setlist_reminder_deliveries;
create policy "Reminder deliveries are internal"
  on public.setlist_reminder_deliveries
  for all to authenticated
  using (false)
  with check (false);
