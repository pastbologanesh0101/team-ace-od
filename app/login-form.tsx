"use client";

import { useState } from "react";

type Step = "reg" | "pin" | "admin";

export default function LoginForm() {
  const [step, setStep] = useState<Step>("reg");
  const [reg, setReg] = useState("");
  const [name, setName] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function lookupReg(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(
      `/api/member-status?regNo=${encodeURIComponent(reg.trim())}`,
    );
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Could not check that number.");
      return;
    }
    setName(body.name);
    setHasPin(body.hasPin);
    setStep("pin");
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "member", regNo: reg.trim(), pin }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(body.error ?? "Could not sign in.");
      return;
    }
    window.location.href = "/";
  }

  async function submitAdmin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "admin", passcode }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(body.error ?? "Could not sign in.");
      return;
    }
    window.location.href = "/";
  }

  // ---------- admin ----------
  if (step === "admin") {
    return (
      <form className="card step" key="admin" onSubmit={submitAdmin}>
        <div className="field">
          <label htmlFor="passcode">Admin passcode</label>
          <input
            id="passcode"
            type="password"
            required
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </div>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Sign in as admin"}
        </button>
        <button
          type="button"
          className="btn ghost sm"
          style={{ marginLeft: 10 }}
          onClick={() => {
            setStep("reg");
            setError("");
          }}
        >
          Back
        </button>
        {error && <p className="msg err">{error}</p>}
      </form>
    );
  }

  // ---------- member: PIN ----------
  if (step === "pin") {
    return (
      <form className="card step" key="pin" onSubmit={submitPin}>
        <p className="sub" style={{ marginBottom: 16 }}>
          Signing in as <b>{name}</b> · {reg.trim().toUpperCase()}
        </p>
        <div className="field">
          <label htmlFor="pin">
            {hasPin ? "Your PIN" : "Create a PIN (4–8 digits, remember it)"}
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]*"
            maxLength={8}
            required
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            style={{ letterSpacing: "0.3em" }}
          />
        </div>
        <button
          className="btn primary"
          type="submit"
          disabled={busy || pin.length < 4}
        >
          {busy ? "…" : hasPin ? "Sign in" : "Set PIN & sign in"}
        </button>
        <button
          type="button"
          className="btn ghost sm"
          style={{ marginLeft: 10 }}
          onClick={() => {
            setStep("reg");
            setPin("");
            setError("");
          }}
        >
          Back
        </button>
        {error && <p className="msg err">{error}</p>}
        {!hasPin && (
          <p className="msg muted">
            First time here — the PIN you set now is what you&apos;ll use from
            then on. Forgot it later? Ask the management head to reset it.
          </p>
        )}
      </form>
    );
  }

  // ---------- member: reg number ----------
  return (
    <form className="card step" key="reg" onSubmit={lookupReg}>
      <div className="field">
        <label htmlFor="reg">Registration number</label>
        <input
          id="reg"
          required
          autoFocus
          autoCapitalize="characters"
          placeholder="25BCE1234"
          value={reg}
          onChange={(e) => setReg(e.target.value.toUpperCase())}
        />
      </div>
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Checking…" : "Continue"}
      </button>
      <button
        type="button"
        className="btn ghost sm"
        style={{ marginLeft: 10 }}
        onClick={() => {
          setStep("admin");
          setError("");
        }}
      >
        Admin sign in
      </button>
      {error && <p className="msg err">{error}</p>}
    </form>
  );
}
