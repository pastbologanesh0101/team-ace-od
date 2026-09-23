// Ground-control HUD drawn over the night scene: lock-on brackets with
// telemetry for each drone and the rover, corner frame + readouts, a slow
// scan line, and a targeting reticle around the mouse.

import type { Target } from "./forest";

const ACCENT = "140,194,255";

export type Hud = {
  draw: (
    c: CanvasRenderingContext2D,
    t: number,
    targets: Target[],
    cursor: { x: number; y: number; focus: number },
    content: { left: number; right: number; top: number; bottom: number } | null,
  ) => void;
};

export function createHud(w: number, h: number): Hud {
  const mono =
    getComputedStyle(document.body).getPropertyValue("--font-mono").trim() ||
    "ui-monospace, Menlo, monospace";
  const small = w < 700;
  const fs = small ? 8.5 : 10;
  const font = `500 ${fs}px ${mono}`;
  // corner readouts only where they won't sit under page content
  const corners = w >= 900;

  function brackets(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    arm: number,
  ) {
    c.beginPath();
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const cx = x + sx * r;
      const cy = y + sy * r;
      c.moveTo(cx, cy - sy * arm);
      c.lineTo(cx, cy);
      c.lineTo(cx - sx * arm, cy);
    }
    c.stroke();
  }

  function lockOn(
    c: CanvasRenderingContext2D,
    tg: Target,
    t: number,
    i: number,
    content: { left: number; right: number; top: number; bottom: number } | null,
  ) {
    if (tg.x < -60 || tg.x > w + 60) return;
    const breathe = 1 + 0.06 * Math.sin(t / 420 + i);
    const r = tg.size * breathe;
    c.strokeStyle = `rgba(${ACCENT},0.75)`;
    c.lineWidth = 1;
    brackets(c, tg.x, tg.y, r, Math.max(5, r * 0.35));

    // centre tick
    c.strokeStyle = `rgba(${ACCENT},0.5)`;
    c.beginPath();
    c.moveTo(tg.x - 3, tg.y);
    c.lineTo(tg.x + 3, tg.y);
    c.moveTo(tg.x, tg.y - 3);
    c.lineTo(tg.x, tg.y + 3);
    c.stroke();

    // leader line up and out to the label (flip side near the right edge)
    const side = tg.x > w - 190 ? -1 : 1;
    const ax = tg.x + side * r;
    const ay = tg.y - r;
    const bx = ax + side * 16;
    const by = ay - 16;
    c.strokeStyle = `rgba(${ACCENT},0.45)`;
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    c.lineTo(bx + side * 10, by);
    c.stroke();

    c.font = font;
    c.textAlign = side > 0 ? "left" : "right";
    c.textBaseline = "middle";
    const lx = bx + side * 14;
    // keep telemetry from fighting the page text: dim it over the content column
    const labelL = side > 0 ? lx : lx - 170;
    const labelR = side > 0 ? lx + 170 : lx;
    const over =
      content &&
      labelR > content.left &&
      labelL < content.right &&
      by + 20 > content.top &&
      by - 10 < content.bottom;
    const k0 = over ? 0.18 : 1;
    tg.lines.forEach((line, k) => {
      c.fillStyle = `rgba(${ACCENT},${(k === 0 ? 0.95 : 0.6) * k0})`;
      c.fillText(line, lx, by + k * (fs + 4));
    });
  }

  function frame(c: CanvasRenderingContext2D, t: number) {
    const m = small ? 10 : 18;
    const arm = small ? 14 : 24;
    c.strokeStyle = `rgba(${ACCENT},0.35)`;
    c.lineWidth = 1;
    c.beginPath();
    for (const [x, y, sx, sy] of [
      [m, m, 1, 1],
      [w - m, m, -1, 1],
      [w - m, h - m, -1, -1],
      [m, h - m, 1, -1],
    ]) {
      c.moveTo(x, y + sy * arm);
      c.lineTo(x, y);
      c.lineTo(x + sx * arm, y);
    }
    c.stroke();

    if (!corners) return;
    c.font = font;
    c.textBaseline = "middle";
    const now = new Date();
    const clock = now.toLocaleTimeString("en-GB", {
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const blink = Math.floor(t / 600) % 2 === 0;

    c.fillStyle = `rgba(${ACCENT},0.55)`;
    c.textAlign = "left";
    c.fillText("TEAM ACE // GROUND CONTROL", m + 10, m + 12);
    c.fillText("12.9692°N  79.1559°E  ·  VIT VELLORE", m + 10, h - m - 12);

    c.textAlign = "right";
    c.fillText(`${clock} IST`, w - m - 10, m + 12);
    c.fillText("LINK ▮▮▮▮▯  ·  UAV 2  ·  UGV 1", w - m - 10, h - m - 12);

    // "REC"-style live dot next to the clock
    if (blink) {
      const tw = c.measureText(`${clock} IST`).width;
      c.fillStyle = "rgba(255,90,90,0.85)";
      c.beginPath();
      c.arc(w - m - 18 - tw, m + 12, 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  function scanLine(c: CanvasRenderingContext2D, t: number) {
    const period = 11000;
    const p = (t % period) / 6500; // sweeps for 6.5s, rests for the rest
    if (p > 1) return;
    const y = p * h;
    const g = c.createLinearGradient(0, y - 60, 0, y);
    g.addColorStop(0, `rgba(${ACCENT},0)`);
    g.addColorStop(1, `rgba(${ACCENT},0.06)`);
    c.fillStyle = g;
    c.fillRect(0, y - 60, w, 60);
    c.fillStyle = `rgba(${ACCENT},0.22)`;
    c.fillRect(0, y, w, 1);
  }

  function reticle(
    c: CanvasRenderingContext2D,
    t: number,
    cur: { x: number; y: number; focus: number },
  ) {
    if (cur.focus < 0.05) return;
    const a = cur.focus;
    const r = 16;
    c.save();
    c.translate(cur.x, cur.y);
    c.strokeStyle = `rgba(${ACCENT},${0.5 * a})`;
    c.lineWidth = 1;
    c.rotate(t / 2400);
    c.setLineDash([6, 5]);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.rotate(-t / 2400);
    c.beginPath();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      c.moveTo(dx * (r + 3), dy * (r + 3));
      c.lineTo(dx * (r + 9), dy * (r + 9));
    }
    c.stroke();
    c.font = font;
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillStyle = `rgba(${ACCENT},${0.55 * a})`;
    const pad = (n: number) => String(Math.round(n)).padStart(4, "0");
    c.fillText(`X ${pad(cur.x)}  Y ${pad(cur.y)}`, r + 14, r + 6);
    c.restore();
  }

  return {
    draw(c, t, targets, cursor, content) {
      c.save();
      c.globalCompositeOperation = "source-over";
      scanLine(c, t);
      targets.forEach((tg, i) => lockOn(c, tg, t, i, content));
      frame(c, t);
      reticle(c, t, cursor);
      c.restore();
    },
  };
}
