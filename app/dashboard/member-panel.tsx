"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = {
  id: string;
  name: string;
  reg_no: string;
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

function getDeviceId(): string {
  try {
    let id = localStorage.getItem("ace_device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ace_device", id);
    }
    return id;
  } catch {
    return "";
  }
}

const EMPTY = {
  name: "",
  reg_no: "",
  od_date: todayYmd(),
  from_time: "",
  to_time: "",
  reason: "",
};

export default function MemberPanel() {
  const [deviceId, setDeviceId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async (device: string) => {
    if (!device) return;
    const res = await fetch(`/api/entries?device=${encodeURIComponent(device)}`);
    if (res.ok) {
      const body = await res.json();
      setEntries(body.entries ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    let profile = { name: "", reg_no: "" };
    try {
      profile = JSON.parse(localStorage.getItem("ace_profile") ?? "{}");
    } catch {
      /* ignore */
    }
    setForm((f) => ({
      ...f,
      name: profile.name ?? "",
      reg_no: profile.reg_no ?? "",
    }));
    load(id);
  }, [load]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (form.to_time <= form.from_time) {
      setError("“To time” must be after “From time”.");
      return;
    }
    setBusy(true);

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, device_id: deviceId }),
    });
    setBusy(false);

    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Could not save. Try again.");
      return;
    }

    try {
      localStorage.setItem(
        "ace_profile",
        JSON.stringify({ name: form.name, reg_no: form.reg_no }),
      );
    } catch {
      /* ignore */
    }

    setForm((f) => ({
      ...f,
      from_time: "",
      to_time: "",
      reason: "",
      od_date: todayYmd(),
    }));
    setOk("Entry submitted. It's now pending review.");
    load(deviceId);
  }

  return (
    <>
      <form className="card" onSubmit={submit}>
        <div className="grid2">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="reg_no">Registration number</label>
            <input
              id="reg_no"
              required
              placeholder="21BCE1234"
              value={form.reg_no}
              onChange={(e) => set("reg_no", e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="od_date">Date</label>
            <input
              id="od_date"
              type="date"
              required
              value={form.od_date}
              onChange={(e) => set("od_date", e.target.value)}
            />
          </div>
          <div />
        </div>

        <div className="grid2">
          <div className="field">
            <label htmlFor="from_time">From time</label>
            <input
              id="from_time"
              type="time"
              required
              value={form.from_time}
              onChange={(e) => set("from_time", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="to_time">To time</label>
            <input
              id="to_time"
              type="time"
              required
              value={form.to_time}
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
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        </div>

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Submit entry"}
        </button>
        {error && <p className="msg err">{error}</p>}
        {ok && <p className="msg ok">{ok}</p>}
      </form>

      <h2>Your entries (this device)</h2>
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
