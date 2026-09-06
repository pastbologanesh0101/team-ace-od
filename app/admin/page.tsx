import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEMBERS } from "@/lib/members";
import { weekKeyWindow, weekLabel, weekRange } from "@/lib/week";
import AdminTable, { type AdminEntry } from "./admin-table";
import WeekPicker from "./week-picker";
import ResetPin from "./reset-pin";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; status?: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const weekKey = sp.week ?? "all"; // default: show everything
  const statusFilter = sp.status ?? "all";

  const db = createAdminClient();
  let query = db
    .from("od_entries")
    .select("*")
    .order("od_date", { ascending: true })
    .order("name", { ascending: true });

  if (weekKey !== "all") {
    const { start, end } = weekRange(weekKey);
    query = query.gte("od_date", start).lte("od_date", end);
  }
  if (statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data } = await query;
  const entries = (data ?? []) as AdminEntry[];

  // grand total (all weeks, all statuses) for the "more elsewhere" hint
  const { count: grandTotal } = await db
    .from("od_entries")
    .select("id", { count: "exact", head: true });

  const { data: pinRows } = await db.from("member_pins").select("reg_no");
  const withPin = new Set((pinRows ?? []).map((r) => r.reg_no));
  const roster = MEMBERS.map((m) => ({
    name: m.name,
    regNo: m.regNo,
    hasPin: withPin.has(m.regNo),
  }));

  const counts = {
    total: entries.length,
    pending: entries.filter((e) => e.status === "pending").length,
    approved: entries.filter((e) => e.status === "approved").length,
    rejected: entries.filter((e) => e.status === "rejected").length,
  };

  const heading = weekKey === "all" ? "All OD entries" : `Week of ${weekLabel(weekKey)}`;
  const elsewhere =
    weekKey !== "all" && statusFilter === "all" && (grandTotal ?? 0) > counts.total
      ? (grandTotal ?? 0) - counts.total
      : 0;

  return (
    <div className="wrap wide">
      <div className="topbar no-print">
        <div className="brand">
          Team <span>ACE</span> · OD Admin
        </div>
        <form action="/api/logout" method="post">
          <button className="btn ghost sm" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <h1>{heading}</h1>
      <p className="sub no-print">
        Approve or reject each entry, then use <b>Print / Save PDF</b> for the
        list to submit. The printed sheet shows approved entries only
        {weekKey === "all" ? "" : " for the selected week"}.
      </p>

      <div className="no-print">
        <WeekPicker
          weeks={weekKeyWindow(8, 16).map((k) => ({ key: k, label: weekLabel(k) }))}
          current={weekKey}
          status={statusFilter}
        />
        {elsewhere > 0 && (
          <p className="msg muted">
            {elsewhere} more{" "}
            {elsewhere === 1 ? "entry is" : "entries are"} in other weeks — pick{" "}
            <b>All weeks</b> to see everything.
          </p>
        )}
      </div>

      <div className="count-strip">
        <span>
          <b>{counts.total}</b> shown
        </span>
        <span className="pill pending">{counts.pending} pending</span>
        <span className="pill approved">{counts.approved} approved</span>
        <span className="pill rejected">{counts.rejected} rejected</span>
      </div>

      <AdminTable entries={entries} weekLabel={heading} />

      <div className="no-print">
        <ResetPin roster={roster} />
      </div>
    </div>
  );
}
