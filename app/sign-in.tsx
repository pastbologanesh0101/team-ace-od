"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignIn() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const supabase = createClient();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });

    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("code");
      setInfo(`We emailed a 6-digit code to ${email.trim().toLowerCase()}.`);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }

    // Session cookie is set — hard-navigate so the server routes us to
    // /admin or /dashboard.
    window.location.href = "/";
  }

  if (step === "code") {
    return (
      <form className="card" onSubmit={verify}>
        {info && <p className="msg ok" style={{ marginTop: 0 }}>{info}</p>}
        <div className="field">
          <label htmlFor="code">6-digit code</label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{ letterSpacing: "0.3em", fontSize: "1.1rem" }}
          />
        </div>
        <button className="btn primary" type="submit" disabled={busy || code.length !== 6}>
          {busy ? "Verifying…" : "Verify & sign in"}
        </button>
        <button
          type="button"
          className="btn ghost sm"
          style={{ marginLeft: 10 }}
          disabled={busy}
          onClick={() => {
            setStep("email");
            setCode("");
            setError("");
            setInfo("");
          }}
        >
          Use a different email
        </button>
        {error && <p className="msg err">{error}</p>}
      </form>
    );
  }

  return (
    <form className="card" onSubmit={sendCode}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@vitstudent.ac.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Email me a code"}
      </button>
      {error && <p className="msg err">{error}</p>}
    </form>
  );
}
