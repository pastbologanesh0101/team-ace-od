"use client";

import { useCallback, useEffect, useState } from "react";
import { MEMBERS } from "@/lib/members";

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

type Identity = { name: string; reg_no: string };

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

const NOT_LISTED = "__other__";
const EMPTY_ENTRY = {
  od_date: todayYmd(),
  from_time: "",
  to_time: "",
  reason: "",
};

export default function MemberPanel() {
  const [deviceId, setDeviceId] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  // identity picker state
  const [pick, setPick] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherReg, setOtherReg] = useState("");

  // entry form state
  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const loadList = useCallback(async (device: string) => {
    if (!device) return;
    const res = await fetch(`/api/entries?device=${encodeURIComponent(device)}`);
    if (res.ok) setEntries((await res.json()).entries ?? []);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    try {
      const saved = JSON.parse(localStorage.getItem("ace_identity") ?? "null");
      if (saved?.name && saved?.reg_no) setIdentity(saved);
    } catch {
      /* ignore */
    }
    setReady(true);
    loadList(id);
  }, [loadList]);

  function confirmIdentity(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let next: Identity | null = null;
    if (pick === NOT_LISTED) {
      if (!otherName.trim() || !otherReg.trim()) {
        setError("Enter your name and registration number.");
        return;
      }
      next = {
        name: otherName.trim().toUpperCase(),
        reg_no: otherReg.trim().toUpperCase(),
      };
    } else {
      const m = MEMBERS.find((x) => x.name === pick);
      if (!m) {
        setError("Pick your name from the list.");
        return;
      }
      next = { name: m.name, reg_no: m.regNo };
    }
    try {
      localStorage.setItem("ace_identity", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setIdentity(next);
  }

  function changeIdentity() {
    setIdentity(null);
    setPick("");
    setOtherName("");
    setOtherReg("");
  }

  function setField<K extends keyof typeof entry>(k: K, v: string) {
    setEntry((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identity) return;
    setError("");
    setOk("");
    if (entry.to_time <= entry.from_time) {
      setError("“To time” must be after “From time”.");
      return;
    }
    setBusy(true);

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: identity.name,
        reg_no: identity.reg_no,
        device_id: deviceId,
        ...entry,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Could not save. Try again.");
      return;
    }

    setEntry({ ...EMPTY_ENTRY, od_date: todayYmd() });
    setOk("Entry submitted. It's now pending review.");
    loadList(deviceId);
  }

  if (!ready) return <p className="empty">Loading…</p>;

  // ---------- identity step ----------
  if (!identity) {
    return (
      <form className="card" onSubmit={confirmIdentity}>
        <div className="field">
          <label htmlFor="pick">Who are you?</label>
          <select
            id="pick"
            required
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="" disabled>
              Select your name…
            </option>
            {MEMBERS.map((m) => (
              <option key={m.regNo} value={m.name}>
                {m.name} · {m.regNo}
              </option>
            ))}
            <option value={NOT_LISTED}>My name isn&apos;t listed</option>
          </select>
        </div>

        {pick === NOT_LISTED && (
          <div className="grid2">
            <div className="field">
              <label htmlFor="otherName">Name</label>
              <input
                id="otherName"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="otherReg">Registration number</label>
              <input
                id="otherReg"
                placeholder="25BCE1234"
                value={otherReg}
                onChange={(e) => setOtherReg(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        )}

        <button className="btn primary" type="submit">
          Continue
        </button>
        {error && <p className="msg err">{error}</p>}
        <p className="msg muted">Remembered on this device — you won&apos;t pick again here.</p>
      </form>
    );
  }

  // ---------- entry form ----------
  return (
    <>
      <p className="sub" style={{ marginBottom: 16 }}>
        Submitting as <b>{identity.name}</b> · {identity.reg_no}{" "}
        <button
          type="button"
          className="btn ghost sm"
          style={{ marginLeft: 8 }}
          onClick={changeIdentity}
        >
          Not you?
        </button>
      </p>

      <form className="card" onSubmit={submit}>
        <div className="grid2">
          <div className="field">
            <label htmlFor="od_date">Date</label>
            <input
              id="od_date"
              type="date"
              required
              value={entry.od_date}
              onChange={(e) => setField("od_date", e.target.value)}
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
              value={entry.from_time}
              onChange={(e) => setField("from_time", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="to_time">To time</label>
            <input
              id="to_time"
              type="time"
              required
              value={entry.to_time}
              onChange={(e) => setField("to_time", e.target.value)}
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
            onChange={(e) => setField("reason", e.target.value)}
          />
        </div>

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Submit entry"}
        </button>
        {error && <p className="msg err">{error}</p>}
        {ok && <p className="msg ok">{ok}</p>}
      </form>

      <h2>Your entries (this device)</h2>
      {loadingList ? (
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
