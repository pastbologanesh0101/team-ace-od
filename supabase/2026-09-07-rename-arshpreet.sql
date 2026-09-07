-- ============================================================
-- One-off: rename Arshpreet Dhillon -> full legal name on
-- existing OD entries. The roster (lib/members.ts) is the source
-- of truth for new entries; od_entries.name is a snapshot taken
-- at insert time, so historical rows need this update.
--
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run
-- ============================================================

update public.od_entries
set    name = 'ARSHPREET SUKHDEEP SINGH DHILLON'
where  reg_no = '25BCE0050';
