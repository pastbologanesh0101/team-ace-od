import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { weekLabel, currentWeekKey } from "@/lib/week";
import MemberPanel from "./member-panel";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await currentSession();
  if (!session) redirect("/");
  if (session.role === "admin") redirect("/admin");

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          <span>OD</span> Tracker
        </div>
        <form action="/api/logout" method="post">
          <button className="btn ghost sm" type="submit">
            Sign out
          </button>
        </form>
      </div>

      <h1>New OD entry</h1>
      <p className="sub">
        {session.name} · {session.regNo} &nbsp;·&nbsp; current week:{" "}
        <b>{weekLabel(currentWeekKey())}</b>. Once you submit an entry you can&apos;t
        edit it — message the management head if something is wrong.
      </p>

      <MemberPanel />
    </div>
  );
}
