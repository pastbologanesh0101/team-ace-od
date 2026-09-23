// Night-forest foreground for the space backdrop: pine ridges in three
// parallax layers, a moon, drifting fog, fireflies, a rover crawling through
// a clearing and a couple of drones patrolling overhead (one sweeping a
// searchlight over the treetops). Everything is procedural — no images.

const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Layer = {
  canvas: HTMLCanvasElement;
  top: number; // screen y of the layer canvas' top edge
  width: number; // css px
  height: number;
  parallax: number; // how far it shifts with the camera (fraction of w)
  ground: (x: number) => number; // ground line in layer coords
};

type Drone = {
  x: number;
  baseY: number;
  vx: number;
  scale: number;
  phase: number;
  searchlight: boolean;
  sx: number; // last drawn screen position (for the HUD)
  sy: number;
  y: number; // current height (eases between patrol and a lock-on)
  lock: number; // 0..1, how locked-on to a focused field it is
};

type Firefly = { x: number; y: number; phase: number; speed: number };

/** Something the HUD can lock on to, in screen px. */
export type Target = {
  id: string;
  x: number;
  y: number;
  size: number; // half-size of the lock box
  lines: string[];
};

/** A page element for the searchlight drone to light up, in screen px. */
export type FocusRect = { x: number; y: number; w: number; h: number };

export type Forest = {
  targets: () => Target[];
  /** Point the searchlight drone at a form field (null = back to patrol). */
  setFocus: (r: FocusRect | null) => void;
  /** The locked-on beam + pool; drawn last so it stays bright when dimmed. */
  drawSpotlight: (c: CanvasRenderingContext2D) => void;
  draw: (
    c: CanvasRenderingContext2D,
    t: number,
    dt: number,
    cam: { x: number; y: number },
  ) => void;
};

function pine(g: CanvasRenderingContext2D, x: number, y: number, hgt: number) {
  const wdt = hgt * rand(0.26, 0.36);
  const tiers = Math.round(rand(5, 8));
  const right: [number, number][] = [];
  for (let i = 1; i <= tiers; i++) {
    const f = i / tiers;
    const yy = y - hgt + hgt * f * 0.9;
    const ww = (wdt / 2) * f * rand(0.85, 1.15);
    right.push([x + ww, yy]);
    if (i < tiers) right.push([x + ww * 0.42, yy - hgt * 0.02]);
  }
  g.beginPath();
  g.moveTo(x, y - hgt);
  for (const [px, py] of right) g.lineTo(px, py);
  g.lineTo(x + wdt * 0.06, y - hgt * 0.1);
  g.lineTo(x + wdt * 0.06, y + 2);
  g.lineTo(x - wdt * 0.06, y + 2);
  g.lineTo(x - wdt * 0.06, y - hgt * 0.1);
  for (let i = right.length - 1; i >= 0; i--) {
    const [px, py] = right[i];
    g.lineTo(2 * x - px + rand(-1, 1), py);
  }
  g.closePath();
  g.fill();
}

function buildLayer(
  w: number,
  h: number,
  dpr: number,
  opts: {
    top: number; // fraction of h
    parallax: number;
    color: string;
    ground: (x: number, H: number, W: number) => number;
    trees: number;
    minH: number;
    maxH: number;
    edgeBias?: boolean; // cluster trees at the sides, keep the middle open
    haze?: string; // rgba of a mist band hugging the ground line
  },
): Layer {
  const width = Math.ceil(w * (1 + opts.parallax * 2) + 40);
  const top = Math.round(h * opts.top);
  const height = h - top + 20;
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(width * dpr);
  cv.height = Math.ceil(height * dpr);
  const g = cv.getContext("2d")!;
  g.scale(dpr, dpr);
  const ground = (x: number) => opts.ground(x, height, width);

  g.fillStyle = opts.color;
  // trees first, so the ground fill covers their trunks
  for (let i = 0; i < opts.trees; i++) {
    let x: number;
    if (opts.edgeBias) {
      const u = Math.pow(Math.random(), 1.7) * width * 0.34;
      x = Math.random() < 0.5 ? u : width - u;
    } else {
      x = rand(0, width);
    }
    pine(g, x, ground(x) + 4, rand(opts.minH, opts.maxH));
  }
  g.beginPath();
  g.moveTo(0, height);
  for (let x = 0; x <= width; x += 6) g.lineTo(x, ground(x));
  g.lineTo(width, height);
  g.closePath();
  g.fill();

  if (opts.haze) {
    const gy = ground(width / 2);
    // a thin band of mist along the ground line that fades out both ways
    const grad = g.createLinearGradient(0, gy - height * 0.2, 0, gy + height * 0.25);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, opts.haze);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = grad;
    g.fillRect(0, 0, width, height);
    g.globalCompositeOperation = "source-over";
  }

  return { canvas: cv, top, width, height, parallax: opts.parallax, ground };
}

export function createForest(
  w: number,
  h: number,
  dpr: number,
  lite = false,
): Forest {
  const unit = Math.max(0.55, Math.min(1.15, Math.min(w, h) / 850));
  const treeH = Math.min(h, 900) * unit;

  const far = buildLayer(w, h, dpr, {
    top: 0.5,
    parallax: 0.02,
    color: "#0b1528",
    ground: (x, H) =>
      H * 0.34 +
      Math.sin(x / 260) * H * 0.07 +
      Math.sin(x / 97 + 1.3) * H * 0.025,
    trees: Math.round(w / 9),
    minH: treeH * 0.04,
    maxH: treeH * 0.09,
    haze: "rgba(60,90,150,0.18)",
  });
  const mid = buildLayer(w, h, dpr, {
    top: 0.62,
    parallax: 0.045,
    color: "#060b17",
    ground: (x, H) =>
      H * 0.62 + Math.sin(x / 340 + 2) * H * 0.05 + Math.sin(x / 120) * H * 0.015,
    trees: Math.round(w / 14),
    minH: treeH * 0.09,
    maxH: treeH * 0.19,
    edgeBias: true,
    haze: "rgba(40,60,110,0.12)",
  });
  const near = buildLayer(w, h, dpr, {
    top: 0.45,
    parallax: 0.08,
    color: "#020307",
    ground: (x, H, W) => {
      // rises at the sides, dips open in the middle
      const e = Math.abs(x / W - 0.5) * 2;
      return H * (0.97 - Math.pow(e, 3) * 0.12);
    },
    trees: Math.round(w / 55) + 4,
    minH: treeH * 0.3,
    maxH: treeH * 0.52,
    edgeBias: true,
  });

  // ---- rover: lives in the mid layer's coordinate space ----
  const rover = {
    x: rand(mid.width * 0.35, mid.width * 0.65),
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: 0.018 * unit, // px per ms
    size: 1.05 * unit,
    wheel: 0,
    pause: 0,
    sx: 0, // last drawn screen position (for the HUD)
    sy: 0,
    lidar: 0, // ms since the last LiDAR pulse
  };

  // ---- drones ----
  const drones: Drone[] = [
    {
      x: rand(0, w),
      baseY: h * rand(0.12, 0.2),
      vx: 0.03 * unit,
      scale: 1.1 * unit,
      phase: rand(0, 6),
      searchlight: true,
      sx: 0,
      sy: 0,
      y: 0,
      lock: 0,
    },
    {
      x: rand(0, w),
      baseY: h * rand(0.06, 0.1),
      vx: -0.018 * unit,
      scale: 0.6 * unit,
      phase: rand(0, 6),
      searchlight: false,
      sx: 0,
      sy: 0,
      y: 0,
      lock: 0,
    },
  ];

  for (const d of drones) d.y = d.baseY;
  let focus: FocusRect | null = null;

  const fireflies: Firefly[] = Array.from(
    { length: Math.round(Math.min(lite ? 14 : 40, w / 30)) },
    () => ({
      x: rand(0, w),
      y: rand(h * 0.72, h * 0.98),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.3, 1),
    }),
  );

  const moon = {
    x: w * 0.8,
    y: h * 0.17,
    r: Math.max(18, Math.min(w, h) * 0.045),
  };

  function layerX(L: Layer, cam: { x: number }) {
    return -(L.width - w) / 2 - cam.x * w * L.parallax;
  }
  function layerY(L: Layer, cam: { y: number }) {
    return L.top - cam.y * h * L.parallax * 0.4;
  }
  function blit(c: CanvasRenderingContext2D, L: Layer, cam: { x: number; y: number }) {
    c.drawImage(L.canvas, layerX(L, cam), layerY(L, cam), L.width, L.height);
  }

  function drawMoon(c: CanvasRenderingContext2D, cam: { x: number; y: number }) {
    const x = moon.x - cam.x * w * 0.01;
    const y = moon.y - cam.y * h * 0.01;
    const halo = c.createRadialGradient(x, y, moon.r, x, y, moon.r * 7);
    halo.addColorStop(0, "rgba(190,215,255,0.16)");
    halo.addColorStop(1, "rgba(190,215,255,0)");
    c.fillStyle = halo;
    c.fillRect(x - moon.r * 7, y - moon.r * 7, moon.r * 14, moon.r * 14);
    const body = c.createRadialGradient(
      x - moon.r * 0.35,
      y - moon.r * 0.35,
      moon.r * 0.1,
      x,
      y,
      moon.r,
    );
    body.addColorStop(0, "#f2f6ff");
    body.addColorStop(1, "#aebbd4");
    c.fillStyle = body;
    c.beginPath();
    c.arc(x, y, moon.r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(120,135,165,0.35)";
    for (const [dx, dy, rr] of [
      [-0.3, -0.1, 0.22],
      [0.25, 0.3, 0.15],
      [0.1, -0.4, 0.1],
      [-0.1, 0.45, 0.08],
    ]) {
      c.beginPath();
      c.arc(x + dx * moon.r, y + dy * moon.r, rr * moon.r, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawFog(c: CanvasRenderingContext2D, t: number, y0: number, alpha: number) {
    for (let i = 0; i < 3; i++) {
      const x = ((t * (0.004 + i * 0.002) + i * w * 0.4) % (w * 1.6)) - w * 0.3;
      const y = y0 + i * h * 0.03;
      const r = w * 0.45;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(120,150,200,${alpha})`);
      g.addColorStop(1, "rgba(120,150,200,0)");
      c.save();
      c.translate(x, y);
      c.scale(1, 0.18);
      c.translate(-x, -y);
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
      c.restore();
    }
  }

  function drawDrone(c: CanvasRenderingContext2D, d: Drone, t: number, dt: number) {
    const bob = Math.sin(t / 1400 + d.phase) * 14 * d.scale;
    const tgt = d.searchlight ? focus : null;
    let lean = Math.sign(d.vx) * 0.08;
    if (tgt) {
      // fly over and hover a little above the focused field
      const tx = tgt.x + tgt.w / 2 + Math.sin(t / 1300) * 18;
      const ty = Math.max(48, Math.min(h * 0.6, tgt.y - 170));
      const k = 1 - Math.pow(0.03, dt / 1000);
      lean = Math.max(-0.25, Math.min(0.25, (tx - d.x) * 0.004));
      d.x += (tx - d.x) * k;
      d.y += (ty - d.y) * k;
      d.lock = Math.min(1, d.lock + dt / 700);
    } else {
      d.x += d.vx * dt;
      const margin = 120 * d.scale;
      if (d.vx > 0 && d.x > w + margin) d.x = -margin;
      if (d.vx < 0 && d.x < -margin) d.x = w + margin;
      d.y += (d.baseY - d.y) * (1 - Math.pow(0.1, dt / 1000));
      d.lock = Math.max(0, d.lock - dt / 400);
    }
    const x = d.x;
    const y = d.y + bob * (1 - d.lock * 0.7);
    d.sx = x;
    d.sy = y;
    const s = d.scale;
    const tiltA = lean + Math.sin(t / 900 + d.phase) * 0.03;

    // searchlight sweeping the treetops (fades out while locked on a field)
    if (d.searchlight && d.lock < 0.99) {
      const sweep = Math.sin(t / 2600 + d.phase) * 0.45;
      const len = h - y;
      const spread = len * 0.22;
      const ex = x + Math.tan(sweep) * len;
      c.save();
      c.globalCompositeOperation = "lighter";
      const fade = 1 - d.lock;
      c.globalAlpha = fade;
      const g = c.createLinearGradient(x, y, ex, h);
      g.addColorStop(0, "rgba(190,220,255,0.10)");
      g.addColorStop(0.6, "rgba(190,220,255,0.05)");
      g.addColorStop(1, "rgba(190,220,255,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - 3 * s, y + 6 * s);
      c.lineTo(x + 3 * s, y + 6 * s);
      c.lineTo(ex + spread, h);
      c.lineTo(ex - spread, h);
      c.closePath();
      c.fill();
      // pool of light where the beam hits the forest
      const px = x + Math.tan(sweep) * (h * 0.82 - y);
      const py = h * 0.82;
      const pr = spread * 0.9;
      const pool = c.createRadialGradient(px, py, 0, px, py, pr);
      pool.addColorStop(0, "rgba(200,225,255,0.16)");
      pool.addColorStop(1, "rgba(200,225,255,0)");
      c.fillStyle = pool;
      c.save();
      c.translate(px, py);
      c.scale(1, 0.3);
      c.translate(-px, -py);
      c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      c.restore();
      c.restore();
    }

    c.save();
    c.translate(x, y);
    c.rotate(tiltA);
    c.scale(s, s);

    // arms + body
    c.strokeStyle = "#1a2233";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-26, -2);
    c.lineTo(26, -2);
    c.stroke();
    c.fillStyle = "#121a28";
    c.beginPath();
    c.roundRect(-11, -6, 22, 10, 4);
    c.fill();
    // landing legs
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-7, 4);
    c.lineTo(-10, 11);
    c.moveTo(7, 4);
    c.lineTo(10, 11);
    c.stroke();
    // motors + spinning rotor blur
    for (const mx of [-26, 26]) {
      c.fillStyle = "#1a2233";
      c.fillRect(mx - 2.5, -6, 5, 5);
      const flick = 0.25 + 0.15 * Math.sin(t / 16 + mx);
      c.fillStyle = `rgba(170,200,240,${flick})`;
      c.beginPath();
      c.ellipse(mx, -7, 14, 1.8, 0, 0, Math.PI * 2);
      c.fill();
    }
    // rim light from the moon
    c.strokeStyle = "rgba(140,194,255,0.45)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-10, -6);
    c.lineTo(10, -6);
    c.stroke();

    // nav lights: red port, green starboard, white strobe double-blink
    c.globalCompositeOperation = "lighter";
    const light = (lx: number, ly: number, rgb: string, a: number, r: number) => {
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g;
      c.fillRect(lx - r, ly - r, r * 2, r * 2);
    };
    light(-26, -3, "255,60,60", 0.9, 7);
    light(26, -3, "60,255,120", 0.9, 7);
    const ph = (t + d.phase * 1000) % 1600;
    if (ph < 70 || (ph > 180 && ph < 250)) light(0, 5, "255,255,255", 1, 16);
    light(0, 3, "140,194,255", 0.5, 6);
    c.restore();
  }

  function drawRover(c: CanvasRenderingContext2D, t: number, dt: number, ox: number, oy: number) {
    const R = rover;
    // occasionally stop to "scan", then carry on (and turn at the edges)
    if (R.pause > 0) {
      R.pause -= dt;
    } else {
      R.x += R.dir * R.speed * dt;
      R.wheel += (R.dir * R.speed * dt) / 9;
      if (Math.random() < dt / 14000) R.pause = rand(1800, 4000);
    }
    const lo = mid.width * 0.2;
    const hi = mid.width * 0.8;
    if (R.x < lo) R.dir = 1;
    if (R.x > hi) R.dir = -1;

    const s = R.size;
    const gx = ox + R.x;
    const back = mid.ground(R.x - R.dir * 26 * s);
    const front = mid.ground(R.x + R.dir * 26 * s);
    const gy = oy + (back + front) / 2;
    R.sx = gx;
    R.sy = gy - 32 * s;

    // LiDAR: a ring pulsing out across the ground every few seconds
    R.lidar += dt;
    if (R.lidar > 3200) R.lidar = 0;
    const lp = R.lidar / 3200;
    c.save();
    c.globalCompositeOperation = "lighter";
    c.strokeStyle = `rgba(140,194,255,${0.35 * (1 - lp)})`;
    c.lineWidth = 1;
    c.setLineDash([3, 5]);
    c.beginPath();
    c.ellipse(gx, gy, 20 + lp * 260 * s, (20 + lp * 260 * s) * 0.14, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    const slope = Math.atan2(front - back, 52 * s) * R.dir;

    c.save();
    c.translate(gx, gy);
    c.rotate(slope);
    c.scale(R.dir * s, s);

    const hull = "#070b14";
    const rim = "rgba(140,194,255,0.5)";

    // headlight beam (drawn first so the rover sits on top of it)
    c.save();
    c.globalCompositeOperation = "lighter";
    const beam = c.createLinearGradient(36, -24, 190, -2);
    beam.addColorStop(0, "rgba(220,235,255,0.35)");
    beam.addColorStop(1, "rgba(220,235,255,0)");
    c.fillStyle = beam;
    c.beginPath();
    c.moveTo(36, -26);
    c.lineTo(190, -40);
    c.lineTo(190, 4);
    c.lineTo(36, -21);
    c.closePath();
    c.fill();
    c.restore();

    // rocker-bogie + wheels
    c.strokeStyle = hull;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-28, -9);
    c.lineTo(-12, -22);
    c.lineTo(4, -9);
    c.moveTo(-12, -22);
    c.lineTo(14, -22);
    c.lineTo(28, -9);
    c.stroke();
    for (const wx of [-28, 0, 28]) {
      c.fillStyle = hull;
      c.beginPath();
      c.arc(wx, -9, 9, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(140,194,255,0.35)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(wx, -9, 9, Math.PI * 1.05, Math.PI * 1.7);
      c.stroke();
      // spokes
      c.strokeStyle = "rgba(90,120,170,0.5)";
      for (let k = 0; k < 3; k++) {
        const a = R.wheel + (k * Math.PI) / 3;
        c.beginPath();
        c.moveTo(wx + Math.cos(a) * 7, -9 + Math.sin(a) * 7);
        c.lineTo(wx - Math.cos(a) * 7, -9 - Math.sin(a) * 7);
        c.stroke();
      }
    }

    // body + solar deck
    c.fillStyle = hull;
    c.beginPath();
    c.roundRect(-30, -36, 64, 14, 3);
    c.fill();
    c.fillStyle = "#0d1526";
    c.fillRect(-36, -40, 62, 4);
    c.strokeStyle = rim;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-36, -40);
    c.lineTo(26, -40);
    c.stroke();

    // mast + camera head (pans while paused)
    const pan = R.pause > 0 ? Math.sin(t / 500) * 0.5 : 0;
    c.fillStyle = hull;
    c.fillRect(22, -66, 3, 28);
    c.save();
    c.translate(23.5, -68);
    c.rotate(pan);
    c.beginPath();
    c.roundRect(-8, -5, 18, 9, 2);
    c.fill();
    c.strokeStyle = rim;
    c.beginPath();
    c.moveTo(-8, -5);
    c.lineTo(10, -5);
    c.stroke();
    c.globalCompositeOperation = "lighter";
    const lens = c.createRadialGradient(9, 0, 0, 9, 0, 7);
    lens.addColorStop(0, "rgba(140,194,255,0.95)");
    lens.addColorStop(1, "rgba(140,194,255,0)");
    c.fillStyle = lens;
    c.fillRect(2, -7, 14, 14);
    c.restore();

    // antenna whip + dish
    c.strokeStyle = hull;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-24, -40);
    c.lineTo(-30, -70);
    c.stroke();
    c.fillStyle = hull;
    c.beginPath();
    c.ellipse(-12, -46, 7, 3.5, -0.4, 0, Math.PI * 2);
    c.fill();

    // blinking status LED + headlamp
    c.globalCompositeOperation = "lighter";
    const blink = Math.sin(t / 380) > 0.6 ? 1 : 0.25;
    const dot = (x: number, y: number, rgb: string, a: number, r: number) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    };
    dot(-30, -70, "255,80,80", blink, 6);
    dot(34, -29, "235,245,255", 0.95, 8);
    c.restore();
  }

  function drawFireflies(c: CanvasRenderingContext2D, t: number, dt: number) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const f of fireflies) {
      f.phase += dt * 0.0006 * f.speed;
      const x = f.x + Math.sin(f.phase * 1.3) * 30;
      const y = f.y + Math.cos(f.phase) * 16;
      const a = Math.max(0, Math.sin(t / (500 + f.speed * 700) + f.phase * 3));
      if (a < 0.05) continue;
      const g = c.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, `rgba(215,255,150,${a * 0.9})`);
      g.addColorStop(1, "rgba(215,255,150,0)");
      c.fillStyle = g;
      c.fillRect(x - 7, y - 7, 14, 14);
    }
    c.restore();
  }

  function drawSpotlight(c: CanvasRenderingContext2D) {
    const d = drones[0];
    if (!focus || d.lock < 0.01) return;
    const a = d.lock;
    const s = d.scale;
    const cx = focus.x + focus.w / 2;
    const cy = focus.y + focus.h / 2;
    const rx = focus.w / 2 + 26;
    const ry = focus.h / 2 + 18;
    const ox = d.sx;
    const oy = d.sy + 6 * s;

    c.save();
    c.globalCompositeOperation = "lighter";
    // cone: narrow at the drone, as wide as the field where it lands
    const beam = c.createLinearGradient(ox, oy, cx, cy);
    beam.addColorStop(0, `rgba(200,225,255,${0.2 * a})`);
    beam.addColorStop(0.75, `rgba(200,225,255,${0.07 * a})`);
    beam.addColorStop(1, "rgba(200,225,255,0)"); // hand over to the pool
    c.fillStyle = beam;
    c.beginPath();
    c.moveTo(ox - 3 * s, oy);
    c.lineTo(ox + 3 * s, oy);
    c.lineTo(cx + rx, cy);
    c.lineTo(cx - rx, cy);
    c.closePath();
    c.fill();
    // pool of light on the field itself
    c.translate(cx, cy);
    c.scale(1, ry / rx);
    const pool = c.createRadialGradient(0, 0, 0, 0, 0, rx * 1.15);
    pool.addColorStop(0, `rgba(200,225,255,${0.24 * a})`);
    pool.addColorStop(0.6, `rgba(170,205,255,${0.12 * a})`);
    pool.addColorStop(1, "rgba(170,205,255,0)");
    c.fillStyle = pool;
    c.beginPath();
    c.arc(0, 0, rx * 1.15, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  return {
    setFocus(r) {
      focus = r;
    },
    drawSpotlight,
    targets() {
      const alt = (d: Drone) => Math.round(((h - d.sy) / h) * 140);
      const spd = (d: Drone) => (Math.abs(d.vx) * 400).toFixed(1);
      const out: Target[] = drones.map((d, i) => ({
        id: `UAV-0${i + 1}`,
        x: d.sx,
        y: d.sy,
        size: 34 * d.scale,
        lines: [
          `UAV-0${i + 1}`,
          d.lock > 0.5 ? "LOCK ▸ INPUT" : `ALT ${alt(d)}M  SPD ${spd(d)}M/S`,
        ],
      }));
      out.push({
        id: "ACE-R1",
        x: rover.sx,
        y: rover.sy,
        size: 46 * rover.size,
        lines: [
          "ACE-R1 · UGV",
          rover.pause > 0
            ? "SCANNING ▸ LIDAR"
            : `HDG ${rover.dir > 0 ? "090" : "270"}  SPD 0.4M/S`,
        ],
      });
      return out;
    },
    // back to front: moon, far ridge, distant drone, mid forest + rover,
    // near drone (its searchlight falls behind the front trees), front trees
    draw(c, t, dt, cam) {
      c.save();
      c.globalCompositeOperation = "source-over";
      drawMoon(c, cam);
      blit(c, far, cam);
      drawFog(c, t, h * 0.7, 0.045);
      drawDrone(c, drones[1], t, dt);
      blit(c, mid, cam);
      drawRover(c, t, dt, layerX(mid, cam), layerY(mid, cam));
      drawDrone(c, drones[0], t, dt);
      drawFog(c, t * 1.3 + 5000, h * 0.9, 0.035);
      blit(c, near, cam);
      drawFireflies(c, t, dt);
      c.restore();
    },
  };
}
