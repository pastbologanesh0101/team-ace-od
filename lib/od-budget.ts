/**
 * OD budget. Every member gets 14 full days of On-Duty, counted as
 * 14 x 24 = 336 hours. Only APPROVED entries are spent; pending ones
 * are shown alongside but don't reduce the balance until approved.
 *
 * This module is pure (no server-only imports) so it is safe to use
 * from client components too.
 */

export const BUDGET_DAYS = 14;
export const HOURS_PER_DAY = 24;
export const BUDGET_HOURS = BUDGET_DAYS * HOURS_PER_DAY; // 336

/** Small tolerance so floating-point sums don't trip the cap check. */
export const EPSILON = 1e-6;

/** Minutes past midnight for a "HH:MM" or "HH:MM:SS" string. */
function minutesOf(t: string): number {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}

/** Length of one OD entry in hours (to_time is always after from_time). */
export function entryHours(from_time: string, to_time: string): number {
  return (minutesOf(to_time) - minutesOf(from_time)) / 60;
}

type Row = { from_time: string; to_time: string; status: string };

/** Sum entry hours for rows of the given status. */
export function sumHours(rows: Row[], status: "approved" | "pending"): number {
  return rows
    .filter((r) => r.status === status)
    .reduce((total, r) => total + entryHours(r.from_time, r.to_time), 0);
}

export type Budget = {
  approvedHours: number;
  pendingHours: number;
  remainingHours: number; // clamped at 0
  overBy: number; // hours past the cap, else 0
};

export function budgetFor(rows: Row[]): Budget {
  const approvedHours = sumHours(rows, "approved");
  const pendingHours = sumHours(rows, "pending");
  return {
    approvedHours,
    pendingHours,
    remainingHours: Math.max(0, BUDGET_HOURS - approvedHours),
    overBy: Math.max(0, approvedHours - BUDGET_HOURS),
  };
}

/** Compact "2d 6h" / "18h" / "0h" label for a span of hours. */
export function fmtDur(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  const d = Math.floor(rounded / HOURS_PER_DAY);
  const h = Math.round((rounded - d * HOURS_PER_DAY) * 10) / 10;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}
