-- Cover the composite timeline foreign keys with matching indexes.
create index if not exists setlist_timeline_items_setlist_org_fk_idx
  on public.setlist_timeline_items (setlist_id, organization_id);

create index if not exists setlist_timeline_items_setlist_song_fk_idx
  on public.setlist_timeline_items (setlist_id, song_id);
