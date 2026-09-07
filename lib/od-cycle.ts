/**
 * Server-side helpers for the per-member OD budget cycle. Backed by
 * the `member_cycles` table (reg_no -> cycle_start). No row means the
 * member has never been reset, so every entry counts.
 */
import { budgetFor, type Budget } from "@/lib/od-budget";
import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

/** The member's current cycle start, or null if they've never been reset. */
export async function loadCycleStart(
  db: Db,
  regNo: string,
): Promise<string | null> {
  const { data } = await db
    .from("member_cycles")
    .select("cycle_start")
    .eq("reg_no", regNo)
    .maybeSingle();
  return data?.cycle_start ?? null;
}

/** One member's OD budget for their current cycle. */
export async function loadMemberBudget(db: Db, regNo: string): Promise<Budget> {
  const [entries, cycleStart] = await Promise.all([
    db
      .from("od_entries")
      .select("from_time,to_time,status,created_at")
      .eq("reg_no", regNo),
    loadCycleStart(db, regNo),
  ]);
  return budgetFor(entries.data ?? [], cycleStart);
}

/** Start a fresh 14-day cycle for the member as of now. */
export async function resetCycle(db: Db, regNo: string) {
  const now = new Date().toISOString();
  return db
    .from("member_cycles")
    .upsert(
      { reg_no: regNo, cycle_start: now, updated_at: now },
      { onConflict: "reg_no" },
    );
}
