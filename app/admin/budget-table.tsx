import { MEMBERS } from "@/lib/members";
import {
  BUDGET_DAYS,
  BUDGET_HOURS,
  HOURS_PER_DAY,
  budgetFor,
  fmtDur,
} from "@/lib/od-budget";
import ResetCycle from "./reset-cycle";

type EntryRow = {
  reg_no: string;
  from_time: string;
  to_time: string;
  status: string;
  created_at: string;
};
type CycleRow = { reg_no: string; cycle_start: string };

/**
 * Per-member OD usage against the 14-day cap, for each member's
 * current budget cycle. Only approved OD is spent; pending is shown
 * for context. A member over the cap is locked out of sign-in until
 * the admin resets them.
 */
export default function BudgetTable({
  rows,
  cycles,
}: {
  rows: EntryRow[];
  cycles: CycleRow[];
}) {
  const cycleStart = new Map(cycles.map((c) => [c.reg_no, c.cycle_start]));

  const list = MEMBERS.map((m) => {
    const mine = rows.filter((r) => r.reg_no === m.regNo);
    const b = budgetFor(mine, cycleStart.get(m.regNo) ?? null);
    return {
      name: m.name,
      regNo: m.regNo,
      budget: b,
      low: !b.locked && b.remainingHours < HOURS_PER_DAY, // under a day left
      pct: Math.min(100, (b.approvedHours / BUDGET_HOURS) * 100),
    };
  }).sort(
    (a, b) =>
      a.budget.remainingHours - b.budget.remainingHours ||
      a.name.localeCompare(b.name),
  );

  const lockedCount = list.filter((m) => m.budget.locked).length;

  return (
    <div className="no-print budget-admin">
      <h2>OD budget · {BUDGET_DAYS} days each</h2>
      {lockedCount > 0 && (
        <p className="msg err">
          {lockedCount} member{lockedCount === 1 ? "" : "s"} over the limit —
          sign-in blocked until you reset them.
        </p>
      )}
      <div className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Reg No</th>
              <th>Approved</th>
              <th>Pending</th>
              <th>Left</th>
              <th className="budget-col">Used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr
                key={m.regNo}
                className={m.budget.locked ? "over" : m.low ? "low" : ""}
              >
                <td className="nowrap">{m.name}</td>
                <td className="mono nowrap">{m.regNo}</td>
                <td className="mono">{fmtDur(m.budget.approvedHours)}</td>
                <td className="mono">
                  {m.budget.pendingHours > 0
                    ? fmtDur(m.budget.pendingHours)
                    : "—"}
                </td>
                <td className="mono nowrap">
                  {m.budget.locked ? (
                    <span className="pill rejected">
                      locked · over {fmtDur(m.budget.overBy)}
                    </span>
                  ) : (
                    fmtDur(m.budget.remainingHours)
                  )}
                </td>
                <td className="budget-col">
                  <span className="budget-bar sm">
                    <span
                      className="budget-fill"
                      style={{ width: `${m.pct}%` }}
                    />
                  </span>
                </td>
                <td className="nowrap">
                  {m.budget.locked && (
                    <ResetCycle regNo={m.regNo} name={m.name} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
