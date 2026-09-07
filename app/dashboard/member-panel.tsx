"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BUDGET_DAYS,
  BUDGET_HOURS,
  EPSILON,
  fmtDur,
  type Budget,
} from "@/lib/od-budget";

type Entry = {
  id: string;
  od_date: string;
  from_time: string;
  to_time: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function todayYmd() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
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

const EMPTY = { od_date: todayYmd(), from_time: "", to_time: "", reason: "" };

export default function MemberPanel() {
  const [entry, setEntry] = useState(EMPTY);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/entries");
    if (res.ok) {
      const body = await res.json();
      setEntries(body.entries ?? []);
      setBudget(body.budget ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof typeof entry>(k: K, v: string) {
    setEntry((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (entry.to_time <= entry.from_time) {
      setError("“To time” must be after “From time”.");
      return;
    }
    if (budget) {
      const [fh, fm] = entry.from_time.split(":").map(Number);
      const [th, tm] = entry.to_time.split(":").map(Number);
      const hrs = (th * 60 + tm - (fh * 60 + fm)) / 60;
      if (budget.approvedHours + hrs > BUDGET_HOURS + EPSILON) {
        setError(
          `This would put you over the ${BUDGET_DAYS}-day OD limit — you have ` +
            `${fmtDur(budget.remainingHours)} of approved OD left. ` +
            `Contact the management head.`,
        );
        return;
      }
    }
    setBusy(true);
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Could not save. Try again.");
      return;
    }
    setEntry({ ...EMPTY, od_date: todayYmd() });
    setOk("Entry submitted. It's now pending review.");
    load();
  }

  const overBudget = budget != null && budget.remainingHours <= EPSILON;

  return (
    <>
      {budget && (
        <div className="card budget">
          <div className="budget-head">
            <span className="budget-label">OD budget</span>
            <span className="budget-figure">
              <b>{fmtDur(budget.remainingHours)}</b> left of {BUDGET_DAYS} days
            </span>
          </div>
          <div className="budget-bar">
            <div
              className="budget-fill"
              style={{
                width: `${Math.min(
                  100,
                  (budget.approvedHours / BUDGET_HOURS) * 100,
                )}%`,
              }}
            />
          </div>
          <p className="budget-note">
            {fmtDur(budget.approvedHours)} approved
            {budget.pendingHours > 0 && (
              <> · {fmtDur(budget.pendingHours)} pending</>
            )}
            {overBudget && <> · limit reached</>}
          </p>
        </div>
      )}

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="od_date">Date</label>
          <input
            id="od_date"
            type="date"
            required
            value={entry.od_date}
            onChange={(e) => set("od_date", e.target.value)}
          />
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="from_time">From time</label>
            <input
              id="from_time"
              type="time"
              required
              value={entry.from_time}
              onChange={(e) => set("from_time", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="to_time">To time</label>
            <input
              id="to_time"
              type="time"
              required
              value={entry.to_time}
              onChange={(e) => set("to_time", e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="reason">Reason</label>
          <textarea
            id="reason"
            required
            placeholder="What team work is this OD for?"
            value={entry.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        </div>

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Submit entry"}
        </button>
        {error && <p className="msg err">{error}</p>}
        {ok && <p className="msg ok">{ok}</p>}
      </form>

      <h2>Your entries</h2>
      {loading ? (
        <p className="empty">Loading…</p>
      ) : entries.length === 0 ? (
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
    </>
  );
}
