"use client";

import { useRouter } from "next/navigation";

export default function DayPicker({
  days,
  current,
  status,
}: {
  days: { key: string; label: string }[];
  current: string;
  status: string;
}) {
  const router = useRouter();

  function go(next: { day?: string; status?: string }) {
    const params = new URLSearchParams();
    params.set("day", next.day ?? current);
    params.set("status", next.status ?? status);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <div className="toolbar">
      <div className="field">
        <label htmlFor="day">Day</label>
        <select
          id="day"
          value={current}
          onChange={(e) => go({ day: e.target.value })}
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
        <label htmlFor="status">Show</label>
        <select
          id="status"
          value={status}
          onChange={(e) => go({ status: e.target.value })}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <button className="btn ghost" type="button" onClick={() => window.print()}>
        Print / Save PDF
      </button>
    </div>
  );
}
