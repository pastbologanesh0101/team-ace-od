"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminEntry = {
  id: string;
  email: string;
  name: string;
  reg_no: string;
  od_date: string;
  from_time: string;
  to_time: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
};

function fmtTime(t: string) {
  return t?.slice(0, 5) ?? t;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function AdminTable({
  entries,
  weekLabel,
}: {
  entries: AdminEntry[];
  weekLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function review(id: string, status: "approved" | "rejected" | "pending") {
    setBusy(id);
    setError("");
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Update failed.");
      return;
    }
    router.refresh();
  }

  const approved = entries.filter((e) => e.status === "approved");

  return (
    <>
      {/* -------- screen: full review table -------- */}
      <div className="screen-only">
        {entries.length === 0 ? (
          <p className="empty">No entries for this week.</p>
        ) : (
          <div className="card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Reg No</th>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="no-print">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="nowrap">{e.name}</td>
                    <td className="mono nowrap">{e.reg_no}</td>
                    <td className="nowrap">{fmtDate(e.od_date)}</td>
                    <td className="mono">{fmtTime(e.from_time)}</td>
                    <td className="mono">{fmtTime(e.to_time)}</td>
                    <td>{e.reason}</td>
                    <td>
                      <span className={`pill ${e.status}`}>{e.status}</span>
                    </td>
                    <td className="no-print">
                      <div className="row-actions">
                        {e.status !== "approved" && (
                          <button
                            className="btn ok sm"
                            disabled={busy === e.id}
                            onClick={() => review(e.id, "approved")}
                          >
                            Approve
                          </button>
                        )}
                        {e.status !== "rejected" && (
                          <button
                            className="btn bad sm"
                            disabled={busy === e.id}
                            onClick={() => review(e.id, "rejected")}
                          >
                            Reject
                          </button>
                        )}
                        {e.status !== "pending" && (
                          <button
                            className="btn ghost sm"
                            disabled={busy === e.id}
                            onClick={() => review(e.id, "pending")}
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="msg err">{error}</p>}
      </div>

      {/* -------- print: approved submission sheet -------- */}
      <div className="print-only">
        <h2>Team ACE — Approved OD list</h2>
        <p>Week: {weekLabel}</p>
        <p>Total approved: {approved.length}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Reg No</th>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {approved.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                <td>{e.name}</td>
                <td>{e.reg_no}</td>
                <td>{fmtDate(e.od_date)}</td>
                <td>{fmtTime(e.from_time)}</td>
                <td>{fmtTime(e.to_time)}</td>
                <td>{e.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
