/**
 * OD budget. Every member gets 14 full days of On-Duty, counted as
 * 14 x 24 = 336 hours. Only APPROVED entries are spent; pending ones
 * are shown alongside but don't reduce the balance until approved.
 *
 * A member has a budget *cycle*: when the admin resets them, only
 * entries created on/after that reset count. No cycle start = every
 * entry counts. On top of in-app OD sits `priorHours` — OD the member
 * had already used before this app, carried over by the admin. Used
 * OD = priorHours + in-app approved. Once that passes the cap the
 * member is "locked" and can't sign in until the admin resets them
 * (see lib/od-cycle.ts).
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

type Row = {
  from_time: string;
  to_time: string;
  status: string;
  created_at?: string;
};

/** Rows that fall inside the member's current budget cycle. */
function inCycle(rows: Row[], cycleStart?: string | null): Row[] {
  if (!cycleStart) return rows;
  return rows.filter((r) => !r.created_at || r.created_at >= cycleStart);
}

/** Sum entry hours for cycle rows of the given status. */
export function sumHours(
  rows: Row[],
  status: "approved" | "pending",
  cycleStart?: string | null,
): number {
  return inCycle(rows, cycleStart)
    .filter((r) => r.status === status)
    .reduce((total, r) => total + entryHours(r.from_time, r.to_time), 0);
}

export type Budget = {
  approvedHours: number; // total used: prior + in-app approved
  approvedInApp: number; // just the in-app approved part
  priorHours: number; // carried over from before this app
  pendingHours: number;
  remainingHours: number; // clamped at 0; Infinity when unlimited
  overBy: number; // hours past the cap, else 0
  locked: boolean; // used OD has passed the cap (never when unlimited)
  unlimited: boolean; // member has no OD cap
};

export function budgetFor(
  rows: Row[],
  cycleStart?: string | null,
  priorHours = 0,
  unlimited = false,
): Budget {
  const prior = Math.max(0, priorHours || 0);
  const approvedInApp = sumHours(rows, "approved", cycleStart);
  const approvedHours = approvedInApp + prior;
  const pendingHours = sumHours(rows, "pending", cycleStart);
  const overBy = unlimited ? 0 : Math.max(0, approvedHours - BUDGET_HOURS);
  return {
    approvedHours,
    approvedInApp,
    priorHours: prior,
    pendingHours,
    remainingHours: unlimited
      ? Infinity
      : Math.max(0, BUDGET_HOURS - approvedHours),
    overBy,
    locked: !unlimited && overBy > EPSILON,
    unlimited,
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

/**
 * Parse a human duration into hours. Accepts "2d 6h", "2d", "6h",
 * "1 day 30 mins", "30:45" (h:mm), "30:45:00" (h:mm:ss) or a plain
 * number (read as hours). Returns null if nothing parses; "" -> 0.
 */
export function parseDur(input: string): number | null {
  let s = input.trim().toLowerCase();
  if (!s) return 0;
  s = s
    .replace(/days?/g, "d")
    .replace(/hours?|hrs?/g, "h")
    .replace(/minutes?|mins?/g, "m")
    .replace(/\s+/g, " ")
    .trim();

  // clock form: H:MM or H:MM:SS
  const clock = s.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (clock) {
    return (
      Number(clock[1]) +
      Number(clock[2]) / 60 +
      (clock[3] ? Number(clock[3]) / 3600 : 0)
    );
  }

  // Nd Mh Km (each part optional, but at least one present)
  const dhm = s.match(
    /^(?:(\d+(?:\.\d+)?)\s*d)?\s*(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m)?$/,
  );
  if (dhm && (dhm[1] || dhm[2] || dhm[3])) {
    return (
      Number(dhm[1] || 0) * HOURS_PER_DAY +
      Number(dhm[2] || 0) +
      Number(dhm[3] || 0) / 60
    );
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}
