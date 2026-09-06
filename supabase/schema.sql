-- ============================================================
-- Team ACE — OD Tracker schema  (passcode model, no Supabase Auth)
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: it drops and recreates the table.
-- ============================================================

drop table if exists public.od_entries cascade;

create table public.od_entries (
  id          uuid primary key default gen_random_uuid(),
  device_id   text,                       -- random id from the member's browser
  name        text not null,
  reg_no      text not null,
  od_date     date not null,
  from_time   time not null,
  to_time     time not null,
  reason      text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index od_entries_od_date_idx on public.od_entries (od_date);
create index od_entries_device_idx  on public.od_entries (device_id);

-- Lock the table to server-side access only. The app talks to the DB
-- with the Supabase SECRET key (bypasses RLS); the publishable key
-- gets nothing. No policies = anon/publishable key is fully denied.
alter table public.od_entries enable row level security;
