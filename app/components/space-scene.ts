// Deep-space backdrop drawn on a 2D canvas.
//
// Stars live in a 3D box in front of the camera and fly slowly toward it;
// each frame they're perspective-projected, so near stars are bigger,
// brighter and move further when the camera shifts. The camera eases toward
// the pointer (parallax), stars near the pointer light up and get joined
// into little constellations, and a click/tap kicks in a short warp jump.

type Star = {
  x: number;
  y: number;
  z: number;
  tint: string; // "r,g,b"
  twinkle: number; // phase
  px: number; // last projected position (for warp streaks)
  py: number;
};

type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

const TINTS = [
  "255,255,255",
  "255,255,255",
  "210,228,255",
  "174,212,255", // matches --accent-strong
  "255,236,214",
  "255,214,190",
];

const DEPTH = 1600; // far plane
const FOV = 420; // focal length in px (scaled by viewport)
const CRUISE = 0.35; // base forward speed, units/ms * 1000
const LINK_RADIUS = 150; // px — stars within this of the pointer get linked

export function mountSpace(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let focal = FOV;
  let lastW = -1;
  let stars: Star[] = [];
  const meteors: Meteor[] = [];
  let nebula: HTMLCanvasElement | null = null;
  let dust: HTMLCanvasElement | null = null;

  // pointer, in px; target vs eased
  const pointer = { x: 0, y: 0, active: false };
  const cam = { x: 0, y: 0 }; // eased offset, -1..1
  const glow = { x: 0, y: 0 };
  let warp = 0; // 0..1 extra speed after a click

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function spawnStar(z = rand(1, DEPTH)): Star {
    // pick a spot on screen (a bit beyond the edges, for parallax) and push
    // it back to depth z — keeps the field evenly spread at every depth
    const sx = rand(-0.65, 0.65) * w;
    const sy = rand(-0.65, 0.65) * h;
    return {
      x: (sx * z) / focal,
      y: (sy * z) / focal,
      z,
      tint: TINTS[(Math.random() * TINTS.length) | 0],
      twinkle: rand(0, Math.PI * 2),
      px: NaN,
      py: NaN,
    };
  }

  function buildNebula() {
    // Painted once to an offscreen canvas slightly larger than the viewport,
    // then panned for parallax — cheap compared to redrawing gradients.
    const c = document.createElement("canvas");
    const nw = Math.ceil(w * 1.3);
    const nh = Math.ceil(h * 1.3);
    c.width = Math.ceil(nw / 2); // half-res: it's all blur anyway
    c.height = Math.ceil(nh / 2);
    const g = c.getContext("2d")!;
    const blobs: [number, number, number, string][] = [
      [0.22, 0.28, 0.55, "70,110,255"],
      [0.78, 0.62, 0.6, "140,70,255"],
      [0.55, 0.18, 0.35, "60,190,255"],
      [0.3, 0.82, 0.45, "40,90,200"],
      [0.9, 0.12, 0.3, "200,90,220"],
    ];
    for (const [bx, by, br, rgb] of blobs) {
      const x = bx * c.width;
      const y = by * c.height;
      const r = br * Math.max(c.width, c.height);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${rgb},0.16)`);
      grad.addColorStop(0.45, `rgba(${rgb},0.06)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
    }
    nebula = c;

    // a dense, static layer of very distant stars behind the moving field
    const d = document.createElement("canvas");
    d.width = Math.ceil(w * 1.1 * dpr);
    d.height = Math.ceil(h * 1.1 * dpr);
    const dg = d.getContext("2d")!;
    const n = Math.round((w * h) / 1400);
    for (let i = 0; i < n; i++) {
      const r = rand(0.25, 0.9) * dpr;
      dg.fillStyle = `rgba(${TINTS[(Math.random() * TINTS.length) | 0]},${rand(0.15, 0.65)})`;
      dg.beginPath();
      dg.arc(rand(0, d.width), rand(0, d.height), r, 0, Math.PI * 2);
      dg.fill();
    }
    dust = d;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    focal = FOV * Math.max(1, Math.min(w, h) / 700);

    // keep the existing field on small resizes (e.g. mobile URL bar
    // showing/hiding) — only reseed when the width actually changes
    if (w !== lastW) {
      const count = Math.round(Math.min(900, Math.max(260, (w * h) / 1900)));
      stars = Array.from({ length: count }, () => spawnStar());
      lastW = w;
    }
    buildNebula();
    if (!pointer.active) {
      pointer.x = glow.x = w / 2;
      pointer.y = glow.y = h / 2;
    }
  }

  function spawnMeteor() {
    const fromLeft = Math.random() < 0.5;
    const speed = rand(0.9, 1.5);
    const angle = rand(0.25, 0.6);
    meteors.push({
      x: fromLeft ? rand(-100, w * 0.5) : rand(w * 0.5, w + 100),
      y: rand(-60, h * 0.35),
      vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
    });
  }

  let last = performance.now();
  let t = 0;
  let nextMeteor = rand(2500, 6000);
  let raf = 0;

  function frame(now: number) {
    const dt = Math.min(50, now - last);
    last = now;
    t += dt;

    // ease camera + cursor glow toward the pointer
    const tx = pointer.active ? (pointer.x / w) * 2 - 1 : Math.sin(t / 9000) * 0.25;
    const ty = pointer.active ? (pointer.y / h) * 2 - 1 : Math.cos(t / 11000) * 0.2;
    const k = 1 - Math.pow(0.0025, dt / 1000);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    const gk = 1 - Math.pow(0.00001, dt / 1000);
    glow.x += (pointer.x - glow.x) * gk;
    glow.y += (pointer.y - glow.y) * gk;
    warp *= Math.pow(0.35, dt / 1000);

    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  function draw(dt: number) {
    const c = ctx!;
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#030405";
    c.fillRect(0, 0, w, h);

    // nebula, panned opposite the camera (far layer → small shift)
    if (nebula) {
      const nx = -w * 0.15 - cam.x * w * 0.05;
      const ny = -h * 0.15 - cam.y * h * 0.05;
      c.drawImage(nebula, nx, ny, w * 1.3, h * 1.3);
    }
    if (dust) {
      const dx = -w * 0.05 - cam.x * w * 0.02;
      const dy = -h * 0.05 - cam.y * h * 0.02;
      c.drawImage(dust, dx, dy, w * 1.1, h * 1.1);
    }

    // soft light that follows the cursor
    if (pointer.active) {
      const r = Math.max(w, h) * 0.35;
      const g = c.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, r);
      g.addColorStop(0, "rgba(140,194,255,0.10)");
      g.addColorStop(0.4, "rgba(110,140,255,0.04)");
      g.addColorStop(1, "rgba(110,140,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }

    c.globalCompositeOperation = "lighter";

    const speed = (CRUISE + warp * 14) * dt;
    const cx = w / 2 - cam.x * w * 0.12;
    const cy = h / 2 - cam.y * h * 0.12;
    const camShiftX = cam.x * 260;
    const camShiftY = cam.y * 260;
    const near: { x: number; y: number; d: number; a: number }[] = [];

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.z -= speed;
      if (s.z < 1) {
        stars[i] = spawnStar(DEPTH);
        continue;
      }

      const scale = focal / s.z;
      const x = cx + (s.x - camShiftX) * scale;
      const y = cy + (s.y - camShiftY) * scale;
      if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
        s.px = NaN;
        if (s.z < DEPTH * 0.2) stars[i] = spawnStar(DEPTH);
        continue;
      }

      const depth = 1 - s.z / DEPTH; // 0 far → 1 near
      const tw = 0.7 + 0.3 * Math.sin(t / 420 + s.twinkle);
      let alpha = Math.min(1, 0.25 + depth * 1.3) * tw;
      let size = 0.55 + depth * depth * 2.4;

      // pointer proximity: brighten + remember for constellation lines
      if (pointer.active) {
        const dx = x - glow.x;
        const dy = y - glow.y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_RADIUS) {
          const f = 1 - d / LINK_RADIUS;
          alpha = Math.min(1, alpha + f * 0.6);
          size += f * 1.2;
          if (depth > 0.25) near.push({ x, y, d, a: f });
        }
      }

      if (warp > 0.05 && !Number.isNaN(s.px)) {
        c.strokeStyle = `rgba(${s.tint},${alpha * Math.min(1, warp * 1.5)})`;
        c.lineWidth = size;
        c.beginPath();
        c.moveTo(s.px, s.py);
        c.lineTo(x, y);
        c.stroke();
      }

      c.fillStyle = `rgba(${s.tint},${alpha})`;
      c.beginPath();
      c.arc(x, y, size, 0, Math.PI * 2);
      c.fill();

      // halo on the brightest, nearest stars
      if (size > 1.9) {
        c.fillStyle = `rgba(${s.tint},${alpha * 0.12})`;
        c.beginPath();
        c.arc(x, y, size * 3.2, 0, Math.PI * 2);
        c.fill();
      }

      s.px = x;
      s.py = y;
    }

    // constellation lines between stars around the pointer
    if (near.length > 1) {
      near.sort((a, b) => a.d - b.d);
      const pts = near.slice(0, 14);
      c.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        c.strokeStyle = `rgba(174,212,255,${p.a * 0.35})`;
        c.beginPath();
        c.moveTo(glow.x, glow.y);
        c.lineTo(p.x, p.y);
        c.stroke();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dd = Math.hypot(p.x - q.x, p.y - q.y);
          if (dd < 90) {
            c.strokeStyle = `rgba(174,212,255,${(1 - dd / 90) * Math.min(p.a, q.a) * 0.5})`;
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(q.x, q.y);
            c.stroke();
          }
        }
      }
    }

    // shooting stars
    nextMeteor -= dt;
    if (nextMeteor <= 0 && !reduced) {
      spawnMeteor();
      nextMeteor = rand(3500, 9000);
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt / 1400;
      if (m.life <= 0) {
        meteors.splice(i, 1);
        continue;
      }
      const tail = 120;
      const len = Math.hypot(m.vx, m.vy);
      const ex = m.x - (m.vx / len) * tail;
      const ey = m.y - (m.vy / len) * tail;
      const g = c.createLinearGradient(m.x, m.y, ex, ey);
      g.addColorStop(0, `rgba(255,255,255,${m.life})`);
      g.addColorStop(1, "rgba(174,212,255,0)");
      c.strokeStyle = g;
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(m.x, m.y);
      c.lineTo(ex, ey);
      c.stroke();
    }

    c.globalCompositeOperation = "source-over";
  }

  const onMove = (e: PointerEvent) => {
    if (!pointer.active) {
      glow.x = e.clientX;
      glow.y = e.clientY;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  };
  const onLeave = () => {
    pointer.active = false;
  };
  const onDown = (e: PointerEvent) => {
    // don't warp when the click is on a form control / button / link
    const el = e.target as HTMLElement | null;
    if (el?.closest("input, textarea, select, button, a, label, table")) return;
    warp = 1;
  };
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (!reduced) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  resize();
  window.addEventListener("resize", resize);

  if (reduced) {
    // one still frame, no motion
    draw(0);
    return () => window.removeEventListener("resize", resize);
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
