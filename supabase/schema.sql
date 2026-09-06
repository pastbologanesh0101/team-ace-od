-- ============================================================
-- Team ACE — OD Tracker schema
-- Paste this into: Supabase dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists public.od_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null,
  reg_no      text not null,
  od_date     date not null,
  from_time   time not null,
  to_time     time not null,
  reason      text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists od_entries_user_id_idx on public.od_entries (user_id);
create index if not exists od_entries_od_date_idx  on public.od_entries (od_date);

-- Row-Level Security ------------------------------------------
alter table public.od_entries enable row level security;

-- A member may insert rows only for themselves.
drop policy if exists "members insert own" on public.od_entries;
create policy "members insert own"
  on public.od_entries for insert
  to authenticated
  with check (user_id = auth.uid());

-- A member may read only their own rows.
drop policy if exists "members read own" on public.od_entries;
create policy "members read own"
  on public.od_entries for select
  to authenticated
  using (user_id = auth.uid());

-- No update / delete policy for members  => they cannot edit or
-- delete once submitted. Admin actions run server-side with the
-- service_role key, which bypasses RLS.
