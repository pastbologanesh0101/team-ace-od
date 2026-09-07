-- ============================================================
-- OD budget cycles. Each member gets 14 full days (336 h) of OD.
-- Once a member's APPROVED OD passes that, their login is blocked
-- until the admin "resets" them: cycle_start jumps to now() and only
-- approved entries created on/after that moment count toward the next
-- 14 days. Past entries stay in od_entries for the record.
--
-- No row for a member  ->  every approved entry counts.
--
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run (does not touch existing data).
-- ============================================================

create table if not exists public.member_cycles (
  reg_no      text primary key,
  cycle_start timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Server-side access only, same as the other tables: the app uses the
-- Supabase SECRET key (bypasses RLS); the publishable key is denied.
alter table public.member_cycles enable row level security;
