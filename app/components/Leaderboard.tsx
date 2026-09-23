"use client";

import { useEffect, useState } from "react";

const PILOT_KEY = "ace-drone-pilot";

type Board = {
  week: string;
  top: { rank: number; name: string; score: number; me: boolean }[];
  mine: { rank: number; score: number } | null;
  record: { name: string; score: number } | null;
  pilot?: string;
};

function readPilot(): string {
  try {
    return localStorage.getItem(PILOT_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Weekly leaderboard on the game-over panel. The first time, the player
 * enters their reg number to post; after that it's remembered in this
 * browser and every round posts itself (the server keeps the best).
 */
export default function Leaderboard({ score }: { score: number }) {
  const [pilot, setPilot] = useState(readPilot);
  const [reg, setReg] = useState("");
  const [data, setData] = useState<Board | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(regNo: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/game-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo, score }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Couldn't post your score.");
      return false;
    }
    setData(body);
    return true;
  }

  useEffect(() => {
    if (pilot) {
      post(pilot);
    } else {
      fetch("/api/game-scores")
        .then((r) => r.json())
        .then((b) => !b.error && setData(b))
        .catch(() => {});
    }
    // one post per finished round
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const regNo = reg.trim().toUpperCase();
    if (await post(regNo)) {
      try {
        localStorage.setItem(PILOT_KEY, regNo);
      } catch {}
      setPilot(regNo);
    }
  }

  function switchPilot() {
    try {
      localStorage.removeItem(PILOT_KEY);
    } catch {}
    setPilot("");
    setReg("");
  }

  const mineOffBoard = data?.mine && data.mine.rank > data.top.length;

  return (
    <div className="lb">
      <div className="lb-head">
        <span>This week&apos;s top pilots</span>
        {data?.record && (
          <span className="lb-record" title="All-time record">
            ★ {data.record.score} · {data.record.name}
          </span>
        )}
      </div>

      {data && data.top.length === 0 && (
        <p className="lb-empty">No flights yet this week. Take the top spot.</p>
      )}

      {data && data.top.length > 0 && (
        <ol className="lb-list">
          {data.top.map((r) => (
            <li key={r.rank} className={r.me ? "me" : undefined}>
              <span className="lb-rank">{r.rank}</span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-score">{r.score}</span>
            </li>
          ))}
          {mineOffBoard && data.mine && (
            <li className="me">
              <span className="lb-rank">{data.mine.rank}</span>
              <span className="lb-name">You</span>
              <span className="lb-score">{data.mine.score}</span>
            </li>
          )}
        </ol>
      )}

      {pilot ? (
        <p className="lb-foot">
          {busy
            ? "Posting…"
            : data?.pilot
              ? `Flying as ${data.pilot}`
              : ""}{" "}
          <button type="button" className="lb-link" onClick={switchPilot}>
            not you?
          </button>
        </p>
      ) : (
        <form className="lb-join" onSubmit={join}>
          <input
            aria-label="Registration number"
            placeholder="Reg no to post score"
            autoCapitalize="characters"
            required
            value={reg}
            onChange={(e) => setReg(e.target.value.toUpperCase())}
          />
          <button className="btn sm" type="submit" disabled={busy}>
            {busy ? "…" : "Post"}
          </button>
        </form>
      )}

      {error && <p className="lb-err">{error}</p>}
    </div>
  );
}
