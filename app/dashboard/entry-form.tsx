"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function todayYmd() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function EntryForm({
  defaultName,
  defaultRegNo,
}: {
  defaultName: string;
  defaultRegNo: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: defaultName,
    reg_no: defaultRegNo,
    od_date: todayYmd(),
    from_time: "",
    to_time: "",
    reason: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.to_time <= form.from_time) {
      setStatus("error");
      setError("“To time” must be after “From time”.");
      return;
    }
    setStatus("saving");
    setError("");

    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setStatus("error");
      setError(body.error ?? "Could not save. Try again.");
      return;
    }

    setForm((f) => ({
      ...f,
      from_time: "",
      to_time: "",
      reason: "",
      od_date: todayYmd(),
    }));
    setStatus("idle");
    router.refresh();
  }

  return (
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

      <button className="btn primary" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : "Submit entry"}
      </button>
      {status === "error" && <p className="msg err">{error}</p>}
    </form>
  );
}
