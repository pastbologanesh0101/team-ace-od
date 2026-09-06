"use client";

import { useState } from "react";

export default function PasscodeForm() {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setBusy(false);
      setError(b.error ?? "Could not sign in.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <label htmlFor="passcode">Passcode</label>
        <input
          id="passcode"
          type="password"
          required
          autoComplete="off"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
        />
      </div>
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Checking…" : "Continue"}
      </button>
      {error && <p className="msg err">{error}</p>}
    </form>
  );
}
