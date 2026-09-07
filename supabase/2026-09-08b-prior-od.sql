-- ============================================================
-- Carry-over OD. `prior_hours` = OD a member had already used
-- before this app existed. It counts on top of in-app approved OD
-- toward the 14-day (336 h) cap, so "used so far" = prior_hours +
-- approved-in-app, and a member is locked once that passes 336 h.
--
-- Also drop cycle_start's NOT NULL / default so a row can carry
-- prior_hours without starting a new cycle (null cycle_start =
-- every in-app entry still counts).
--
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run.
-- ============================================================

alter table public.member_cycles
  alter column cycle_start drop default,
  alter column cycle_start drop not null;

alter table public.member_cycles
  add column if not exists prior_hours numeric not null default 0;
