import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEMBERS } from "@/lib/members";
import AdminTable, { type AdminEntry } from "./admin-table";
import BudgetTable from "./budget-table";
import DayPicker from "./day-picker";
import ResetPin from "./reset-pin";

export const dynamic = "force-dynamic";

function fmtFullDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function fmtDayOption(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; status?: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const day = sp.day ?? "all"; // default: every day
  const statusFilter = sp.status ?? "all";

  const db = createAdminClient();

  // Rejected entries are hidden from the admin — only pending + approved.
  // every distinct OD date (of a visible entry), newest first
  const { data: dateRows } = await db
    .from("od_entries")
    .select("od_date")
    .neq("status", "rejected")
    .order("od_date", { ascending: false });
  const days = Array.from(new Set((dateRows ?? []).map((r) => r.od_date))).map(
    (d) => ({ key: d, label: fmtDayOption(d) }),
  );

  let query = db
    .from("od_entries")
    .select("*")
    .neq("status", "rejected")
    .order("od_date", { ascending: true })
    .order("name", { ascending: true });

  if (day !== "all") query = query.eq("od_date", day);
  if (statusFilter === "pending" || statusFilter === "approved") {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  const entries = (data ?? []) as AdminEntry[];

  const { count: grandTotal } = await db
    .from("od_entries")
    .select("id", { count: "exact", head: true })
    .neq("status", "rejected");

  // Every non-rejected entry, all dates — for the per-member OD budget.
  const { data: budgetRows } = await db
    .from("od_entries")
    .select("reg_no,from_time,to_time,status")
    .neq("status", "rejected");

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
  };

  const heading = day === "all" ? "All OD entries" : fmtFullDate(day);
  const elsewhere =
    day !== "all" && statusFilter === "all" && (grandTotal ?? 0) > counts.total
      ? (grandTotal ?? 0) - counts.total
      : 0;

  return (
    <div className="wrap wide">
      <div className="topbar no-print">
        <div className="brand">
          <span>OD</span> Admin
        </div>
        <form action="/api/logout" method="post">
          <button className="btn ghost sm" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <h1 className="no-print">{heading}</h1>
      <p className="sub no-print">
        Approve or reject each entry, then use <b>Print / Save PDF</b> for the
        list to submit. The printed form fills in approved entries only
        {day === "all" ? "" : " for the selected day"}.
      </p>

      <div className="no-print">
        <DayPicker days={days} current={day} status={statusFilter} />
        {elsewhere > 0 && (
          <p className="msg muted">
            {elsewhere} more{" "}
            {elsewhere === 1 ? "entry is" : "entries are"} on other days — pick{" "}
            <b>All days</b> to see everything.
          </p>
        )}
      </div>

      <div className="count-strip no-print">
        <span>
          <b>{counts.total}</b> shown
        </span>
        <span className="pill pending">{counts.pending} pending</span>
        <span className="pill approved">{counts.approved} approved</span>
      </div>

      <AdminTable entries={entries} />

      <BudgetTable rows={budgetRows ?? []} />

      <div className="no-print">
        <ResetPin roster={roster} />
      </div>
    </div>
  );
}
