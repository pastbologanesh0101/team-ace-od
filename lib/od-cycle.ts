/**
 * Server-side helpers for the per-member OD budget cycle. Backed by
 * the `member_cycles` table: reg_no -> { cycle_start, prior_hours }.
 * No row means never reset and no carry-over, so every entry counts
 * and prior_hours is 0.
 */
import { budgetFor, type Budget } from "@/lib/od-budget";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

export type CycleInfo = {
  cycleStart: string | null;
  priorHours: number;
  unlimited: boolean;
};

/** The member's cycle start, carried-over OD hours, and cap exemption. */
export async function loadCycleInfo(db: Db, regNo: string): Promise<CycleInfo> {
  const { data } = await db
    .from("member_cycles")
    .select("cycle_start,prior_hours,unlimited")
    .eq("reg_no", regNo)
    .maybeSingle();
  return {
    cycleStart: data?.cycle_start ?? null,
    priorHours: Number(data?.prior_hours ?? 0),
    unlimited: Boolean(data?.unlimited),
  };
}

/** One member's OD budget for their current cycle. */
export async function loadMemberBudget(db: Db, regNo: string): Promise<Budget> {
  const [entries, info] = await Promise.all([
    db
      .from("od_entries")
      .select("from_time,to_time,status,created_at")
      .eq("reg_no", regNo),
    loadCycleInfo(db, regNo),
  ]);
  return budgetFor(
    entries.data ?? [],
    info.cycleStart,
    info.priorHours,
    info.unlimited,
  );
}

/** Start a fresh 14-day cycle now and clear any carry-over. */
export async function resetCycle(db: Db, regNo: string) {
  const now = new Date().toISOString();
  return db.from("member_cycles").upsert(
    { reg_no: regNo, cycle_start: now, prior_hours: 0, updated_at: now },
    { onConflict: "reg_no" },
  );
}

/** Set the member's carried-over OD (hours used before this app). */
export async function setPriorHours(db: Db, regNo: string, hours: number) {
  const now = new Date().toISOString();
  return db.from("member_cycles").upsert(
    { reg_no: regNo, prior_hours: hours, updated_at: now },
    { onConflict: "reg_no" },
  );
}

/** Exempt (or re-cap) a member from the 14-day OD limit. */
export async function setUnlimited(db: Db, regNo: string, unlimited: boolean) {
  const now = new Date().toISOString();
  return db.from("member_cycles").upsert(
    { reg_no: regNo, unlimited, updated_at: now },
    { onConflict: "reg_no" },
  );
}
