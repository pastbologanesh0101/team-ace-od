-- ============================================================
-- Team ACE — OD Tracker schema
-- Login = registration number + personal PIN. No email / Supabase Auth.
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: it drops and recreates both tables.
-- ============================================================

drop table if exists public.od_entries cascade;
drop table if exists public.member_pins cascade;
drop table if exists public.member_cycles cascade;

-- One PIN per member (set on first login, resettable by admin).
create table public.member_pins (
  reg_no     text primary key,
  pin_hash   text not null,           -- scrypt: "<saltHex>:<hashHex>"
  updated_at timestamptz not null default now()
);

-- OD budget cycle per member. 14 full days (336 h) each; only approved
-- entries created on/after cycle_start count. No row = every entry
-- counts. Admin "resets" a member by setting cycle_start = now().
create table public.member_cycles (
  reg_no      text primary key,
  cycle_start timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.od_entries (
  id          uuid primary key default gen_random_uuid(),
  reg_no      text not null,          -- taken from the session, not the form
  name        text not null,
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
create index od_entries_reg_no_idx  on public.od_entries (reg_no);

-- Server-side access only. The app uses the Supabase SECRET key
-- (bypasses RLS); the publishable key is fully denied (no policies).
alter table public.od_entries    enable row level security;
alter table public.member_pins   enable row level security;
alter table public.member_cycles enable row level security;
