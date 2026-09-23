"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mountGame, type GameInput } from "./drone-game";
import Joystick from "./Joystick";
import Leaderboard from "./Leaderboard";

const BEST_KEY = "ace-drone-best";

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * "Fly the drone" button + full-screen mini-game (see drone-game.ts).
 * While flying, the page content fades back and the keyboard drives the
 * drone; Esc lands. Touch devices get a thumb-stick + boost button.
 */
export default function DroneGame() {
  const [mode, setMode] = useState<"idle" | "flying" | "done">("idle");
  const [result, setResult] = useState({ score: 0, best: 0, record: false });
  const [run, setRun] = useState(0); // bump to restart
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useRef<GameInput>({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    joyX: 0,
    joyY: 0,
  });

  const land = useCallback(() => setMode("idle"), []);

  const takeOff = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    setRun((r) => r + 1);
    setMode("flying");
  };

  // page chrome fades back while a round is on
  useEffect(() => {
    const el = document.documentElement;
    if (mode === "idle") el.removeAttribute("data-flying");
    else el.setAttribute("data-flying", "");
    return () => el.removeAttribute("data-flying");
  }, [mode]);

  useEffect(() => {
    if (mode === "idle") return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") land();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [mode, land]);

  useEffect(() => {
    if (mode !== "flying" || !canvasRef.current) return;
    return mountGame(canvasRef.current, input.current, (score) => {
      const prev = readBest();
      const record = score > prev;
      if (record) {
        try {
          localStorage.setItem(BEST_KEY, String(score));
        } catch {}
      }
      setResult({ score, best: Math.max(prev, score), record });
      setMode("done");
    });
    // `run` restarts the round on "Fly again"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode === "flying", run]);

  const pad = (k: "up" | "down" | "left" | "right" | "boost") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      input.current[k] = true;
    },
    onPointerUp: () => (input.current[k] = false),
    onPointerLeave: () => (input.current[k] = false),
    onPointerCancel: () => (input.current[k] = false),
  });

  return (
    <>
      <button type="button" className="fly-btn" onClick={takeOff}>
        <span className="fly-icon" aria-hidden="true">
          ✣
        </span>
        Fly the drone
        <span className="fly-keys" aria-hidden="true">
          W A S D
        </span>
      </button>

      {/* portalled to <body>: the page content (.wrap) fades while flying */}
      {mode !== "idle" &&
        createPortal(
          <div className="game-layer">
            <canvas
              ref={canvasRef}
              className="game-canvas"
              aria-hidden="true"
            />

            {mode === "flying" && (
              <>
                <div className="game-hint">
                  WASD / ARROWS to fly · SPACE boost · ESC land
                </div>
                <button type="button" className="game-land" onClick={land}>
                  Land ✕
                </button>
                <div className="game-pad">
                  <Joystick input={input.current} />
                  <button
                    type="button"
                    className="boost"
                    aria-hidden="true"
                    {...pad("boost")}
                  >
                    BOOST
                  </button>
                </div>
              </>
            )}

            {mode === "done" && (
              <div
                className="game-over"
                role="dialog"
                aria-label="Flight results"
              >
                <div className="game-over-kicker">Mission complete</div>
                <div className="game-over-score">{result.score}</div>
                <div className="game-over-sub">
                  {result.record ? "New best score!" : `Best ${result.best}`}
                </div>
                <Leaderboard key={run} score={result.score} />
                <div className="game-over-actions">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={takeOff}
                  >
                    Fly again
                  </button>
                  <button type="button" className="btn ghost" onClick={land}>
                    Land
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
