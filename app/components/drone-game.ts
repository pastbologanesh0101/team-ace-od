// "Fly the drone" mini-game: a quadcopter you steer with WASD / arrow keys
// over the whole page, collecting signal beacons against the clock.
// Pure canvas 2D on a fixed full-screen overlay; React (DroneGame.tsx) only
// handles the start/end UI and the touch pad.

export type GameInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  // analog stick (touch joystick), -1..1 each axis; 0 when not in use
  joyX: number;
  joyY: number;
};

type Beacon = { x: number; y: number; gold: boolean; born: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; rgb: string };
type Popup = { x: number; y: number; text: string; life: number };

const ROUND_MS = 40000;
const ACCENT = "140,194,255";
const GOLD = "255,210,110";

export function mountGame(
  canvas: HTMLCanvasElement,
  input: GameInput,
  onEnd: (score: number) => void,
): () => void {
  const ctx = canvas.getContext("2d")!;
  const mono =
    getComputedStyle(document.body).getPropertyValue("--font-mono").trim() ||
    "ui-monospace, Menlo, monospace";

  let w = 0;
  let h = 0;
  let floor = 0; // treeline — flying below this is a crash
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    floor = h * 0.8;
  }
  resize();

  const drone = { x: w / 2, y: h * 0.45, vx: 0, vy: 0, tilt: 0 };
  const scale = Math.max(0.8, Math.min(1.4, Math.min(w, h) / 650));
  let beacon: Beacon = spawnBeacon(0);
  const sparks: Spark[] = [];
  const popups: Popup[] = [];
  let score = 0;
  let combo = 0;
  let lastPickup = -Infinity;
  let crashFlash = 0;
  let shake = 0;
  let t = 0;
  const COUNTDOWN = 2400;
  let ended = false;

  function spawnBeacon(now: number): Beacon {
    let x = 0;
    let y = 0;
    for (let i = 0; i < 20; i++) {
      x = 60 + Math.random() * (w - 120);
      y = 90 + Math.random() * (floor - 170);
      if (Math.hypot(x - drone.x, y - drone.y) > Math.min(w, h) * 0.3) break;
    }
    return { x, y, gold: Math.random() < 0.18, born: now };
  }

  function burst(x: number, y: number, rgb: string, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random());
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, rgb });
    }
  }

  function update(dt: number) {
    const playing = t > COUNTDOWN && !ended;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const ax = playing
      ? clamp((input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joyX)
      : 0;
    const ay = playing
      ? clamp((input.down ? 1 : 0) - (input.up ? 1 : 0) + input.joyY)
      : 0;
    const accel = 0.0016 * (input.boost ? 1.8 : 1) * scale;
    const max = 0.62 * (input.boost ? 1.6 : 1) * scale;

    drone.vx += ax * accel * dt;
    drone.vy += ay * accel * dt;
    // air drag: glides to a hover when you let go
    const drag = Math.pow(0.08, dt / 1000);
    drone.vx *= drag;
    drone.vy *= drag;
    const sp = Math.hypot(drone.vx, drone.vy);
    if (sp > max) {
      drone.vx *= max / sp;
      drone.vy *= max / sp;
    }
    drone.x += drone.vx * dt;
    drone.y += drone.vy * dt;
    drone.tilt += (drone.vx * 0.9 - drone.tilt) * Math.min(1, dt / 120);

    // walls: soft bounce
    const m = 30 * scale;
    if (drone.x < m) (drone.x = m), (drone.vx = Math.abs(drone.vx) * 0.5);
    if (drone.x > w - m) (drone.x = w - m), (drone.vx = -Math.abs(drone.vx) * 0.5);
    if (drone.y < m) (drone.y = m), (drone.vy = Math.abs(drone.vy) * 0.5);
    // treeline: crash + bounce back up
    if (drone.y > floor) {
      drone.y = floor;
      drone.vy = -0.55 * scale;
      drone.vx *= 0.4;
      if (crashFlash <= 0) {
        crashFlash = 1;
        shake = 1;
        combo = 0;
        burst(drone.x, drone.y + 12, "255,120,90", 22, 0.35);
        popups.push({ x: drone.x, y: drone.y - 30, text: "CRASH", life: 1 });
      }
    }
    crashFlash = Math.max(0, crashFlash - dt / 600);
    shake = Math.max(0, shake - dt / 350);

    // pickups
    if (playing && Math.hypot(drone.x - beacon.x, drone.y - beacon.y) < 34 * scale) {
      combo = t - lastPickup < 1800 ? combo + 1 : 1;
      lastPickup = t;
      const pts = (beacon.gold ? 3 : 1) * Math.min(combo, 4);
      score += pts;
      burst(beacon.x, beacon.y, beacon.gold ? GOLD : ACCENT, 26, 0.3);
      popups.push({
        x: beacon.x,
        y: beacon.y - 26,
        text: combo > 1 ? `+${pts}  x${Math.min(combo, 4)}` : `+${pts}`,
        life: 1,
      });
      beacon = spawnBeacon(t);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 0.0006 * dt;
      s.life -= dt / 700;
      if (s.life <= 0) sparks.splice(i, 1);
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      popups[i].y -= dt * 0.04;
      popups[i].life -= dt / 900;
      if (popups[i].life <= 0) popups.splice(i, 1);
    }
    // rotor wash
    if (Math.random() < dt / 30) {
      sparks.push({
        x: drone.x + (Math.random() - 0.5) * 30 * scale,
        y: drone.y + 14 * scale,
        vx: (Math.random() - 0.5) * 0.05 - drone.vx * 0.2,
        vy: 0.12 + Math.random() * 0.08,
        life: 0.6,
        rgb: ACCENT,
      });
    }

    if (playing && t - COUNTDOWN >= ROUND_MS) {
      ended = true;
      onEnd(score);
    }
  }

  function glow(x: number, y: number, rgb: string, a: number, r: number) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawBeacon() {
    const b = beacon;
    const rgb = b.gold ? GOLD : ACCENT;
    const age = t - b.born;
    const pop = Math.min(1, age / 300);
    const pulse = 1 + 0.12 * Math.sin(t / 180);
    const r = 16 * scale * pop * pulse;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(b.x, b.y, rgb, 0.5, r * 3);
    ctx.restore();
    ctx.strokeStyle = `rgba(${rgb},0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // expanding ping ring
    const ping = (t % 1200) / 1200;
    ctx.strokeStyle = `rgba(${rgb},${0.6 * (1 - ping)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + ping * 30 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(${rgb},0.95)`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `500 ${10 * scale}px ${mono}`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${rgb},0.7)`;
    ctx.fillText(b.gold ? "PRIORITY ×3" : "SIGNAL", b.x, b.y + r + 16 * scale);

    // off-course helper: a faint line from the drone to the beacon
    ctx.strokeStyle = `rgba(${rgb},0.12)`;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(drone.x, drone.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawDrone() {
    const s = scale * 1.5;
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(Math.max(-0.45, Math.min(0.45, drone.tilt * 0.9)));
    ctx.scale(s, s);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    glow(0, 8, ACCENT, 0.25, 30);
    ctx.restore();

    ctx.strokeStyle = "#2a3550";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.lineTo(26, -2);
    ctx.stroke();
    ctx.fillStyle = "#1a2438";
    ctx.beginPath();
    ctx.roundRect(-12, -7, 24, 12, 4);
    ctx.fill();
    ctx.strokeStyle = `rgba(${ACCENT},0.8)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-12, -7, 24, 12, 4);
    ctx.stroke();
    ctx.strokeStyle = "#2a3550";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, 5);
    ctx.lineTo(-10, 12);
    ctx.moveTo(7, 5);
    ctx.lineTo(10, 12);
    ctx.stroke();
    for (const mx of [-26, 26]) {
      ctx.fillStyle = "#2a3550";
      ctx.fillRect(mx - 3, -7, 6, 6);
      ctx.fillStyle = `rgba(190,215,255,${0.35 + 0.2 * Math.sin(t / 14 + mx)})`;
      ctx.beginPath();
      ctx.ellipse(mx, -8, 15, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    glow(-26, -3, "255,60,60", 0.95, 8);
    glow(26, -3, "60,255,120", 0.95, 8);
    if (t % 1000 < 80) glow(0, 6, "255,255,255", 1, 18);
    glow(4, 0, ACCENT, 0.9, 5); // camera eye
    ctx.restore();

    ctx.font = `500 ${10 * scale}px ${mono}`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${ACCENT},0.75)`;
    ctx.fillText("ACE-UAV · YOU", drone.x, drone.y - 30 * scale);
  }

  function drawHud() {
    const left = Math.max(0, ROUND_MS - Math.max(0, t - COUNTDOWN));
    const fs = Math.round(12 * Math.min(1.2, scale));
    ctx.font = `600 ${fs}px ${mono}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${ACCENT},0.9)`;
    const secs = (left / 1000).toFixed(1).padStart(4, "0");
    const hudY = h < 600 ? 60 : 26;
    ctx.fillText(`SCORE ${String(score).padStart(3, "0")}   ·   T-${secs}s`, w / 2, hudY);
    if (combo > 1 && t - lastPickup < 1800) {
      ctx.fillStyle = `rgba(${GOLD},0.9)`;
      ctx.fillText(`COMBO x${Math.min(combo, 4)}`, w / 2, hudY + fs + 8);
    }
    // time bar
    const bw = Math.min(320, w * 0.6);
    ctx.fillStyle = `rgba(${ACCENT},0.15)`;
    ctx.fillRect(w / 2 - bw / 2, hudY - 8, bw, 2);
    ctx.fillStyle = left < 8000 ? "rgba(255,120,90,0.9)" : `rgba(${ACCENT},0.8)`;
    ctx.fillRect(w / 2 - bw / 2, hudY - 8, (bw * left) / ROUND_MS, 2);
    ctx.textBaseline = "alphabetic";

    // treeline warning
    ctx.strokeStyle = `rgba(255,120,90,${0.12 + crashFlash * 0.5})`;
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(0, floor + 18 * scale);
    ctx.lineTo(w, floor + 18 * scale);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCountdown() {
    if (t > COUNTDOWN + 500) return;
    const n = Math.ceil((COUNTDOWN - t) / 800);
    const label = t < COUNTDOWN ? String(Math.max(1, n)) : "GO";
    const phase = t < COUNTDOWN ? ((COUNTDOWN - t) % 800) / 800 : 1 - (t - COUNTDOWN) / 500;
    ctx.font = `600 ${Math.round(64 * scale)}px ${mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(${ACCENT},${Math.max(0, phase)})`;
    ctx.fillText(label, w / 2, h * 0.3);
    ctx.textBaseline = "alphabetic";
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
    }
    if (crashFlash > 0) {
      ctx.fillStyle = `rgba(255,80,60,${crashFlash * 0.12})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (!ended) drawBeacon();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of sparks) {
      ctx.fillStyle = `rgba(${s.rgb},${s.life})`;
      ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
    }
    ctx.restore();
    drawDrone();
    ctx.font = `600 ${Math.round(13 * scale)}px ${mono}`;
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.fillStyle = p.text === "CRASH" ? `rgba(255,120,90,${p.life})` : `rgba(${GOLD},${p.life})`;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
    if (!ended) {
      drawHud();
      drawCountdown();
    }
  }

  const KEYS: Record<string, "up" | "down" | "left" | "right" | "boost"> = {
    KeyW: "up",
    ArrowUp: "up",
    KeyS: "down",
    ArrowDown: "down",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
    Space: "boost",
    ShiftLeft: "boost",
    ShiftRight: "boost",
  };
  const onKey = (e: KeyboardEvent) => {
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault(); // no page scrolling / typing while flying
    input[k] = e.type === "keydown";
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  window.addEventListener("resize", resize);

  let last = performance.now();
  let raf = requestAnimationFrame(function loop(now) {
    const dt = Math.min(40, now - last);
    last = now;
    t += dt;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", onKey);
    window.removeEventListener("resize", resize);
    input.up = input.down = input.left = input.right = input.boost = false;
    input.joyX = input.joyY = 0;
  };
}
