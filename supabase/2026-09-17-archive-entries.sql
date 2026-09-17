-- ============================================================
-- Let the admin delete processed entries from the working list after
-- printing them, one by one or in a batch, without actually erasing
-- them: a deleted entry is hidden from the admin view (and from the
-- "Day" quick-pick list) but still counts toward the member's 14-day
-- OD budget and still appears in the member's own history.
--
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run (IF NOT EXISTS guards).
-- ============================================================

alter table public.od_entries
  add column if not exists archived_at timestamptz;

create index if not exists od_entries_archived_at_idx
  on public.od_entries (archived_at);
