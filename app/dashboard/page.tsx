import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import EntryForm from "./entry-form";
import { weekLabel, currentWeekKey } from "@/lib/week";

type Entry = {
  id: string;
  name: string;
  reg_no: string;
  od_date: string;
  from_time: string;
  to_time: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function fmtTime(t: string) {
  return t?.slice(0, 5) ?? t;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");
  if (isAdminEmail(user.email)) redirect("/admin");

  const { data } = await supabase
    .from("od_entries")
    .select("*")
    .order("od_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data ?? []) as Entry[];
  const last = entries[0];

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          Team <span>ACE</span> · OD Tracker
        </div>
        <div className="muted" style={{ fontSize: "0.85rem" }}>
          {user.email}
          {"  "}
          <form action="/auth/signout" method="post" style={{ display: "inline" }}>
            <button className="btn ghost sm" type="submit" style={{ marginLeft: 10 }}>
              Sign out
            </button>
          </form>
        </div>
      </div>

      <h1>New OD entry</h1>
      <p className="sub">
        Current week: <b>{weekLabel(currentWeekKey())}</b>. Once you submit an
        entry you can&apos;t edit it — message the management head if something&apos;s
        wrong.
      </p>

      <EntryForm
        defaultName={last?.name ?? ""}
        defaultRegNo={last?.reg_no ?? ""}
      />

      <h2>Your entries</h2>
      {entries.length === 0 ? (
        <p className="empty">Nothing submitted yet.</p>
      ) : (
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">{fmtDate(e.od_date)}</td>
                  <td className="mono">{fmtTime(e.from_time)}</td>
                  <td className="mono">{fmtTime(e.to_time)}</td>
                  <td>{e.reason}</td>
                  <td>
                    <span className={`pill ${e.status}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
