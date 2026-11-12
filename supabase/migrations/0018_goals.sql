-- Goals replace body numbers in onboarding
alter table profiles add column if not exists goals text[] not null default '{}';

-- Body numbers become optional, since new users no longer enter them
alter table profiles alter column height_cm drop not null;
alter table profiles alter column age drop not null;
alter table profiles alter column sex drop not null;
alter table profiles alter column activity drop not null;
alter table profiles alter column pace drop not null;

-- Weigh-ins and calorie numbers leave the main app
update profiles set weigh_reminder = false, hide_numbers = true;