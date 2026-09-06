"use client";

import { useRouter } from "next/navigation";

export default function WeekPicker({
  weeks,
  current,
  status,
}: {
  weeks: { key: string; label: string }[];
  current: string;
  status: string;
}) {
  const router = useRouter();

  function go(next: { week?: string; status?: string }) {
    const params = new URLSearchParams();
    params.set("week", next.week ?? current);
    params.set("status", next.status ?? status);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <div className="toolbar">
      <div className="field">
        <label htmlFor="week">Week</label>
        <select
          id="week"
          value={current}
          onChange={(e) => go({ week: e.target.value })}
        >
          <option value="all">All weeks</option>
          {weeks.map((w) => (
            <option key={w.key} value={w.key}>
              {w.label}
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
