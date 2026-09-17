import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEMBERS } from "@/lib/members";
import AdminTable, { type AdminEntry } from "./admin-table";
import BudgetTable from "./budget-table";
import DayPicker from "./day-picker";
import ResetPin from "./reset-pin";
import SetPrior from "./set-prior";

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
  searchParams: Promise<{
    day?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const day = sp.day ?? "all"; // default: every day
  const statusFilter = sp.status ?? "all"; // all | pending | approved | cleared
  const view = statusFilter === "cleared" ? "archived" : "active";
  // a date range only applies when no single day is picked
  const from = day === "all" ? sp.from ?? "" : "";
  const to = day === "all" ? sp.to ?? "" : "";

  const db = createAdminClient();

  // Rejected entries are hidden from the admin — only pending + approved.
  // every distinct OD date (of a visible, uncleared entry), newest first —
  // feeds the "Day" quick-pick, so a day cleared out entirely drops off it
  const { data: dateRows } = await db
    .from("od_entries")
    .select("od_date")
    .neq("status", "rejected")
    .is("archived_at", null)
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

  query =
    view === "archived"
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null);

  if (day !== "all") {
    query = query.eq("od_date", day);
  } else {
    if (from) query = query.gte("od_date", from);
    if (to) query = query.lte("od_date", to);
  }
  if (statusFilter === "pending" || statusFilter === "approved") {
    query = query.eq("status", statusFilter);
  }

  const { data, error: queryError } = await query;
  const entries = (data ?? []) as AdminEntry[];

  const { count: grandTotal } = await db
    .from("od_entries")
    .select("id", { count: "exact", head: true })
    .neq("status", "rejected")
    .is("archived_at", null);

  // Every non-rejected entry, all dates — for the per-member OD budget.
  const { data: budgetRows } = await db
    .from("od_entries")
    .select("reg_no,from_time,to_time,status,created_at")
    .neq("status", "rejected");
  const { data: cycleRows } = await db
    .from("member_cycles")
    .select("reg_no,cycle_start,prior_hours,unlimited");
  const priorByReg = new Map(
    (cycleRows ?? []).map((c) => [c.reg_no, Number(c.prior_hours ?? 0)]),
  );
  const unlimitedByReg = new Map(
    (cycleRows ?? []).map((c) => [c.reg_no, Boolean(c.unlimited)]),
  );

  const { data: pinRows } = await db.from("member_pins").select("reg_no");
  const withPin = new Set((pinRows ?? []).map((r) => r.reg_no));
  const roster = MEMBERS.map((m) => ({
    name: m.name,
    regNo: m.regNo,
    hasPin: withPin.has(m.regNo),
  }));
  const priorRoster = MEMBERS.map((m) => ({
    name: m.name,
    regNo: m.regNo,
    priorHours: priorByReg.get(m.regNo) ?? 0,
    unlimited: unlimitedByReg.get(m.regNo) ?? false,
  }));

  const counts = {
    total: entries.length,
    pending: entries.filter((e) => e.status === "pending").length,
    approved: entries.filter((e) => e.status === "approved").length,
  };

  function fmtRangeBound(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const heading =
    view === "archived"
      ? "Cleared entries"
      : day !== "all"
        ? fmtFullDate(day)
        : from || to
          ? `${from ? fmtRangeBound(from) : "…"} – ${to ? fmtRangeBound(to) : "…"}`
          : "All OD entries";
  const elsewhere =
    view === "active" &&
    day !== "all" &&
    statusFilter === "all" &&
    (grandTotal ?? 0) > counts.total
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
      {queryError && (
        <p className="msg err no-print">
          Couldn&apos;t load entries: {queryError.message}. If this mentions a
          missing column, the database migration hasn&apos;t been run yet —
          see <span className="mono">supabase/*.sql</span> in the repo.
        </p>
      )}
      <p className="sub no-print">
        {view === "archived" ? (
          <>
            Entries cleared off the working list. They still count toward
            each member&apos;s OD budget — restore one if it was cleared by
            mistake.
          </>
        ) : (
          <>
            Approve or reject each entry, then use <b>Print / Save PDF</b>{" "}
            for the list to submit. Once you&apos;ve printed a batch, select
            and <b>Clear</b> those entries so they don&apos;t show up again
            next time.
          </>
        )}
      </p>

      <div className="no-print">
        <DayPicker
          days={days}
          current={day}
          status={statusFilter}
          from={from}
          to={to}
        />
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
        {view === "active" ? (
          <>
            <span className="pill pending">{counts.pending} pending</span>
            <span className="pill approved">{counts.approved} approved</span>
          </>
        ) : (
          <span className="pill rejected">cleared</span>
        )}
      </div>

      <AdminTable entries={entries} view={view} />

      <BudgetTable rows={budgetRows ?? []} cycles={cycleRows ?? []} />

      <div className="no-print">
        <SetPrior roster={priorRoster} />
        <ResetPin roster={roster} />
      </div>
    </div>
  );
}
