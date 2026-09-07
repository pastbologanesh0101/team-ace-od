"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Reset one member to a fresh 14-day OD cycle. */
export default function ResetCycle({
  regNo,
  name,
}: {
  regNo: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function reset() {
    if (
      !window.confirm(
        `Reset ${name} to a fresh 14 days of OD? Their past entries stay on ` +
          `record but stop counting, and their sign-in is unblocked.`,
      )
    )
      return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/reset-cycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setErr(b.error ?? "Reset failed.");
    }
  }

  return (
    <>
      <button
        className="btn ok sm"
        type="button"
        disabled={busy}
        onClick={reset}
      >
        {busy ? "…" : "Reset OD"}
      </button>
      {err && <span className="msg err"> {err}</span>}
    </>
  );
}
