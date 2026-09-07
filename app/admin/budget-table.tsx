import { MEMBERS } from "@/lib/members";
import {
  BUDGET_DAYS,
  BUDGET_HOURS,
  EPSILON,
  HOURS_PER_DAY,
  entryHours,
  fmtDur,
} from "@/lib/od-budget";

type Row = {
  reg_no: string;
  from_time: string;
  to_time: string;
  status: string;
};

/**
 * Per-member OD usage against the 14-day cap. Only approved OD is
 * spent; pending is shown for context. Rows are every non-rejected
 * entry across all dates.
 */
export default function BudgetTable({ rows }: { rows: Row[] }) {
  const tally = new Map<string, { approved: number; pending: number }>();
  for (const m of MEMBERS) tally.set(m.regNo, { approved: 0, pending: 0 });

  for (const r of rows) {
    const acc = tally.get(r.reg_no);
    if (!acc) continue; // entry from someone no longer on the roster
    const h = entryHours(r.from_time, r.to_time);
    if (r.status === "approved") acc.approved += h;
    else if (r.status === "pending") acc.pending += h;
  }

  const list = MEMBERS.map((m) => {
    const acc = tally.get(m.regNo)!;
    const remaining = Math.max(0, BUDGET_HOURS - acc.approved);
    const over = acc.approved > BUDGET_HOURS + EPSILON;
    return {
      name: m.name,
      regNo: m.regNo,
      approved: acc.approved,
      pending: acc.pending,
      remaining,
      over,
      low: !over && remaining < HOURS_PER_DAY, // under a day left
      pct: Math.min(100, (acc.approved / BUDGET_HOURS) * 100),
    };
  }).sort((a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name));

  return (
    <div className="no-print budget-admin">
      <h2>OD budget · {BUDGET_DAYS} days each</h2>
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
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.regNo} className={m.over ? "over" : m.low ? "low" : ""}>
                <td className="nowrap">{m.name}</td>
                <td className="mono nowrap">{m.regNo}</td>
                <td className="mono">{fmtDur(m.approved)}</td>
                <td className="mono">
                  {m.pending > 0 ? fmtDur(m.pending) : "—"}
                </td>
                <td className="mono nowrap">
                  {m.over
                    ? `over by ${fmtDur(m.approved - BUDGET_HOURS)}`
                    : fmtDur(m.remaining)}
                </td>
                <td className="budget-col">
                  <span className="budget-bar sm">
                    <span
                      className="budget-fill"
                      style={{ width: `${m.pct}%` }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
