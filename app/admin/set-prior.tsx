"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDur, parseDur } from "@/lib/od-budget";

type Row = { name: string; regNo: string; priorHours: number };

/** Admin panel: set each member's carried-over OD (used before this app). */
export default function SetPrior({ roster }: { roster: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  function valueFor(r: Row) {
    return draft[r.regNo] ?? (r.priorHours > 0 ? fmtDur(r.priorHours) : "");
  }

  async function save(r: Row) {
    const raw = valueFor(r).trim();
    const hours = parseDur(raw);
    if (hours === null || hours < 0) {
      setMsg(`Couldn't read “${raw}” for ${r.name}. Try e.g. "2d 6h" or "30:00".`);
      return;
    }
    setBusy(r.regNo);
    setMsg("");
    const res = await fetch("/api/admin/set-prior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo: r.regNo, hours }),
    });
    setBusy(null);
    if (res.ok) {
      setMsg(`${r.name}: prior OD set to ${fmtDur(hours)}.`);
      setDraft((d) => {
        const next = { ...d };
        delete next[r.regNo];
        return next;
      });
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setMsg(b.error ?? "Save failed.");
    }
  }

  return (
    <section style={{ marginTop: 28 }}>
      <button
        className="btn ghost sm"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide" : "Set prior OD (carried over)"}
      </button>

      {open && (
        <div className="card table-scroll" style={{ marginTop: 14 }}>
          <p className="sub" style={{ marginBottom: 16 }}>
            OD each member used <b>before this app</b>. It adds on top of their
            in-app approved OD toward the 14-day cap. Formats: <code>2d 6h</code>,{" "}
            <code>3d</code>, <code>30:00</code> (h:mm), or a plain number of
            hours.
          </p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Reg No</th>
                <th>Prior OD used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.regNo}>
                  <td className="nowrap">{r.name}</td>
                  <td className="mono">{r.regNo}</td>
                  <td>
                    <input
                      value={valueFor(r)}
                      placeholder="0h"
                      style={{ maxWidth: 140 }}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [r.regNo]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save(r);
                      }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn ok sm"
                      disabled={busy === r.regNo}
                      onClick={() => save(r)}
                    >
                      {busy === r.regNo ? "…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {msg && <p className="msg ok">{msg}</p>}
    </section>
  );
}
