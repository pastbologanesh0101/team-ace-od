-- ============================================================
-- Drone game leaderboard: each member's best score per week.
-- The week is keyed by its Monday (IST) as YYYY-MM-DD. The all-time
-- record is just the highest row across every week.
--
-- Paste into: Supabase dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run (IF NOT EXISTS guards).
-- ============================================================

create table if not exists public.game_scores (
  reg_no     text        not null,
  week       text        not null,
  score      integer     not null check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (reg_no, week)
);

create index if not exists game_scores_week_score_idx
  on public.game_scores (week, score desc);

-- server-only access via the secret key, like the other tables
alter table public.game_scores enable row level security;
