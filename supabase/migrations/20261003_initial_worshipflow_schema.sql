alter table public.organizations
add column if not exists description text,
add column if not exists contact_email text,
add column if not exists contact_phone text,
add column if not exists address text,
add column if not exists website text,
add column if not exists timezone text not null default 'Asia/Manila',
add column if not exists default_service_name text not null default 'Sunday Worship',
add column if not exists default_service_day smallint not null default 0,
add column if not exists default_service_time time not null default '09:00',
add column if not exists onboarding_completed_at timestamptz;

alter table public.organizations
add constraint organizations_description_length
check (
  description is null
  or char_length(description) <= 1000
);

alter table public.organizations
add constraint organizations_contact_email_length
check (
  contact_email is null
  or char_length(contact_email) <= 254
);

alter table public.organizations
add constraint organizations_contact_phone_length
check (
  contact_phone is null
  or char_length(contact_phone) <= 50
);

alter table public.organizations
add constraint organizations_address_length
check (
  address is null
  or char_length(address) <= 500
);

alter table public.organizations
add constraint organizations_website_length
check (
  website is null
  or char_length(website) <= 500
);

alter table public.organizations
add constraint organizations_timezone_length
check (
  char_length(trim(timezone)) between 1 and 100
);

alter table public.organizations
add constraint organizations_default_service_name_length
check (
  char_length(trim(default_service_name)) between 1 and 120
);

alter table public.organizations
add constraint organizations_default_service_day_check
check (
  default_service_day between 0 and 6
);