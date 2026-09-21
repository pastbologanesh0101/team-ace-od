"use client";

import { useEffect, useState } from "react";
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

  // Local, always-controlled copies of the two date fields. Typing only
  // updates this local state; the URL (and therefore the actual filter)
  // only changes on blur/Enter. This also works around native date inputs
  // not reliably firing onChange until the field is fully committed —
  // blur always fires, so it's the one thing we can depend on.
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);
  useEffect(() => setFromInput(from), [from]);
  useEffect(() => setToInput(to), [to]);

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
  function clearRange() {
    setFromInput("");
    setToInput("");
    goRange({ from: "", to: "" });
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
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          onBlur={() => goRange({ from: fromInput })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="to">To date</label>
        <input
          id="to"
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          onBlur={() => goRange({ to: toInput })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      {(from || to) && (
        <button className="btn ghost sm" type="button" onClick={clearRange}>
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
