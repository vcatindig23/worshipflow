alter table public.setlist_timeline_items
  drop constraint if exists setlist_timeline_item_type_check;

alter table public.setlist_timeline_items
  add constraint setlist_timeline_item_type_check
  check (
    item_type in (
      'opening',
      'welcome',
      'song',
      'prayer',
      'offering',
      'announcements',
      'message',
      'communion',
      'closing',
      'break',
      'transition',
      'other'
    )
  );
