"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { name: string; regNo: string; hasPin: boolean };

export default function ResetPin({ roster }: { roster: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function reset(regNo: string, name: string) {
    if (!window.confirm(`Reset ${name}'s PIN? They'll set a new one next login.`))
      return;
    setBusy(regNo);
    setMsg("");
    const res = await fetch("/api/admin/reset-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo }),
    });
    setBusy(null);
    if (res.ok) {
      setMsg(`${name}'s PIN was cleared.`);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setMsg(b.error ?? "Reset failed.");
    }
  }

  return (
    <section style={{ marginTop: 48 }}>
      <button
        className="btn ghost sm"
        type="button"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide" : "Manage member PINs"}
      </button>

      {open && (
        <div className="card table-scroll" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Reg No</th>
                <th>PIN set?</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.regNo}>
                  <td className="nowrap">{r.name}</td>
                  <td className="mono">{r.regNo}</td>
                  <td>{r.hasPin ? "yes" : "—"}</td>
                  <td>
                    <button
                      className="btn bad sm"
                      disabled={!r.hasPin || busy === r.regNo}
                      onClick={() => reset(r.regNo, r.name)}
                    >
                      Reset PIN
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
