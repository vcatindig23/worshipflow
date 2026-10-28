-- Member availability and blockout windows for service planning.
-- Members may manage their own entries; workspace leaders can review availability
-- for staffing decisions. Scheduling mutations must still revalidate conflicts.

create table if not exists public.member_availability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null,
  title text,
  reason text,
  starts_on date,
  ends_on date,
  weekdays smallint[],
  start_time time,
  end_time time,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_availability_type_check
    check (entry_type in ('blockout', 'recurring')),
  constraint member_availability_title_length
    check (title is null or char_length(title) <= 120),
  constraint member_availability_reason_length
    check (reason is null or char_length(reason) <= 500),
  constraint member_availability_date_range_check
    check (
      (entry_type = 'blockout' and starts_on is not null and ends_on is not null
        and ends_on >= starts_on and weekdays is null)
      or
      (entry_type = 'recurring' and starts_on is null and ends_on is null
        and weekdays is not null and cardinality(weekdays) > 0
        and start_time is not null and end_time is not null
        and start_time < end_time)
    ),
  constraint member_availability_weekdays_check
    check (
      weekdays is null or
      (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
        and cardinality(weekdays) = cardinality(
          array(select distinct weekday from unnest(weekdays) as weekday)
        ))
    )
);

create index if not exists member_availability_org_user_idx
  on public.member_availability (organization_id, user_id, is_active);

create index if not exists member_availability_blockout_dates_idx
  on public.member_availability (organization_id, starts_on, ends_on)
  where entry_type = 'blockout' and is_active;

create index if not exists member_availability_recurring_idx
  on public.member_availability (organization_id, user_id)
  where entry_type = 'recurring' and is_active;

create or replace function public.set_member_availability_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists member_availability_updated_at
  on public.member_availability;

create trigger member_availability_updated_at
before update on public.member_availability
for each row execute function public.set_member_availability_updated_at();

alter table public.member_availability enable row level security;

revoke all on public.member_availability from anon, authenticated;
grant select, insert, update, delete on public.member_availability to authenticated;

drop policy if exists "Members can view organization availability"
  on public.member_availability;
create policy "Members can view organization availability"
on public.member_availability
for select
to authenticated
using ((select private.is_org_member(organization_id)));

drop policy if exists "Members manage their own availability"
  on public.member_availability;
create policy "Members manage their own availability"
on public.member_availability
for all
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
)
with check (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);
