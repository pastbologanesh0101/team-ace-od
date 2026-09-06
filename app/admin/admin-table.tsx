"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminEntry = {
  id: string;
  name: string;
  reg_no: string;
  od_date: string;
  from_time: string;
  to_time: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
};

function fmtTime(t: string) {
  return t?.slice(0, 5) ?? t;
}
function fmtDateShort(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
function fmtDMY(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const ROWS_PER_SHEET = 8;

export default function AdminTable({ entries }: { entries: AdminEntry[] }) {
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

  // split approved entries into sheets of 8 (the official form has 8 rows)
  const sheets: (AdminEntry | null)[][] = [];
  for (let i = 0; i < Math.max(approved.length, 1); i += ROWS_PER_SHEET) {
    const chunk: (AdminEntry | null)[] = approved.slice(i, i + ROWS_PER_SHEET);
    while (chunk.length < ROWS_PER_SHEET) chunk.push(null);
    sheets.push(chunk);
  }

  return (
    <>
      {/* -------- screen: full review table -------- */}
      <div className="screen-only">
        {entries.length === 0 ? (
          <p className="empty">No entries here yet.</p>
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
                    <td className="nowrap">{fmtDateShort(e.od_date)}</td>
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
        {approved.length === 0 && entries.length > 0 && (
          <p className="msg muted no-print">
            Nothing approved yet — the printed form fills in only approved entries.
          </p>
        )}
      </div>

      {/* -------- print: official Team ACE On-Duty form -------- */}
      <div className="print-only">
        {sheets.map((rows, s) => (
          <section className="od-sheet" key={s}>
            <header className="od-head">
              <img className="od-vit" src="/vit-logo.png" alt="VIT" />
              <img className="od-ace" src="/ace-logo.png" alt="ACE" />
            </header>

            <h1 className="od-title">TEAM ACE: ON-DUTY (OD)</h1>
            <p className="od-subtitle">On Duty Record</p>

            <div className="od-refs">
              <p>
                REF NUMBER: <span className="od-fill" />
              </p>
              <p>
                SCHOOL: <span className="od-fill" />
              </p>
            </div>

            <table className="od-table">
              <thead>
                <tr>
                  <th className="od-sr">Sr No</th>
                  <th>Name</th>
                  <th>Reg Number</th>
                  <th>Date(DD/MM/YYYY)</th>
                  <th>Start time</th>
                  <th>End Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={i}>
                    <td className="od-sr">{i + 1}</td>
                    <td>{e?.name ?? ""}</td>
                    <td>{e?.reg_no ?? ""}</td>
                    <td>{e ? fmtDMY(e.od_date) : ""}</td>
                    <td>{e ? fmtTime(e.from_time) : ""}</td>
                    <td>{e ? fmtTime(e.to_time) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="od-h">DUTY DETAILS</h3>
            <table className="od-details">
              <tbody>
                {[
                  "EVENT DETAILS",
                  "EVENT AUTHORITY",
                  "EVENT NAME",
                  "EVENT VENUE",
                  "WORK DETAILS",
                  "SPECIAL INSTRUCTIONS",
                ].map((label) => (
                  <tr key={label}>
                    <td className="od-lbl">{label}</td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="od-h">AUTHORIZATION</h3>
            <div className="od-sign">
              <div>
                <div className="od-sigline" />
                <p>
                  <b>Team Captain</b>
                </p>
                <p>
                  <b>DATE:</b>
                  <span className="od-fill od-fill-sm" />
                </p>
              </div>
              <div>
                <div className="od-sigline" />
                <p>
                  <b>Faculty Co-ordinator/ HOD(SCOPE)</b>
                </p>
                <p>
                  <b>DATE:</b>
                  <span className="od-fill od-fill-sm" />
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
