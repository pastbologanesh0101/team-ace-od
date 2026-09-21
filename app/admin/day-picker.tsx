"use client";

import { useRouter } from "next/navigation";

export default function DayPicker({
  days,
  current,
  status,
  from,
  to,
}: {
  days: { key: string; label: string }[];
  current: string;
  status: string;
  from: string;
  to: string;
}) {
  const router = useRouter();

  function go(next: {
    day?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    const params = new URLSearchParams();
    params.set("day", next.day ?? current);
    params.set("status", next.status ?? status);
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    router.push(`/admin?${params.toString()}`);
  }

  // Picking a specific day clears any date range, and vice versa — the two
  // filters are mutually exclusive so the "Day" heading always means one thing.
  function goDay(day: string) {
    go({ day, from: "", to: "" });
  }
  function goRange(next: { from?: string; to?: string }) {
    go({ day: "all", ...next });
  }

  return (
    <div className="toolbar">
      <div className="field">
        <label htmlFor="day">Day</label>
        <select
          id="day"
          value={current}
          onChange={(e) => goDay(e.target.value)}
        >
          <option value="all">All days</option>
          {days.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="from">From date</label>
        <input
          id="from"
          type="date"
          value={from}
          onChange={(e) => goRange({ from: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="to">To date</label>
        <input
          id="to"
          type="date"
          value={to}
          onChange={(e) => goRange({ to: e.target.value })}
        />
      </div>

      {(from || to) && (
        <button
          className="btn ghost sm"
          type="button"
          onClick={() => goRange({ from: "", to: "" })}
        >
          Clear range
        </button>
      )}

      <div className="field">
        <label htmlFor="status">Show</label>
        <select
          id="status"
          value={status}
          onChange={(e) => go({ status: e.target.value })}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <button className="btn ghost" type="button" onClick={() => window.print()}>
        Print / Save PDF
      </button>
    </div>
  );
}
