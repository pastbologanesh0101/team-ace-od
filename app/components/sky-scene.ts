// Aurora night sky drawn on a 2D canvas, above the forest (forest.ts).
//
// Northern-lights curtains are built from thin vertical light strips laid
// along a few slowly-undulating ribbons. They're drawn into a low-res
// offscreen canvas and scaled up, which gives the soft glow for free. The
// curtains bend and brighten toward the pointer, the whole scene steers with
// the pointer (or phone tilt) for parallax, and a click sends a bright surge
// rippling out through the lights.

import { createForest, type Forest } from "./forest";

type Ribbon = {
  base: number; // resting height, fraction of h
  amp: number; // wave amplitude, fraction of h
  f1: number; // wave frequencies (per css px)
  f2: number;
  s1: number; // wave speeds (per ms)
  s2: number;
  height: number; // curtain height, fraction of h
  phase: number;
  strip: HTMLCanvasElement;
  alpha: number;
  parallax: number;
};

const RES = 3; // aurora buffer is 1/RES of the viewport
const COL = 1; // strip width in buffer px

function makeStrip(stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, 1, 256);
  return c;
}

export function mountSky(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  let w = 0;
  let h = 0;
  let dpr = 1;
  let forest: Forest | null = null;
  const buf = document.createElement("canvas");
  const bctx = buf.getContext("2d")!;

  // curtains: bright green lower edge, fading up through teal to violet
  const green = makeStrip([
    [0, "rgba(140,90,255,0)"],
    [0.35, "rgba(120,110,255,0.18)"],
    [0.62, "rgba(60,220,210,0.45)"],
    [0.8, "rgba(120,255,190,0.95)"],
    [0.86, "rgba(200,255,225,1)"],
    [1, "rgba(80,255,170,0)"],
  ]);
  const teal = makeStrip([
    [0, "rgba(90,120,255,0)"],
    [0.4, "rgba(80,140,255,0.2)"],
    [0.7, "rgba(80,210,255,0.6)"],
    [0.82, "rgba(170,235,255,0.9)"],
    [1, "rgba(80,200,255,0)"],
  ]);
  const violet = makeStrip([
    [0, "rgba(200,90,255,0)"],
    [0.5, "rgba(170,90,255,0.25)"],
    [0.78, "rgba(120,160,255,0.55)"],
    [1, "rgba(120,160,255,0)"],
  ]);

  const ribbons: Ribbon[] = [
    { base: 0.2, amp: 0.05, f1: 0.0042, f2: 0.011, s1: 0.00018, s2: 0.00031, height: 0.26, phase: rand(0, 9), strip: violet, alpha: 0.5, parallax: 0.015 },
    { base: 0.3, amp: 0.07, f1: 0.0031, f2: 0.0085, s1: 0.00022, s2: 0.00027, height: 0.3, phase: rand(0, 9), strip: green, alpha: 0.75, parallax: 0.03 },
    { base: 0.4, amp: 0.05, f1: 0.0048, f2: 0.013, s1: -0.00016, s2: 0.00035, height: 0.2, phase: rand(0, 9), strip: teal, alpha: 0.45, parallax: 0.045 },
  ];

  const pointer = { x: 0, y: 0, active: false };
  // phone tilt, -1..1 on each axis, relative to a slowly-adapting "resting"
  // pose so it works however the phone is being held
  const tilt = { x: 0, y: 0, active: false, baseX: NaN, baseY: NaN };
  const cam = { x: 0, y: 0 }; // eased offset, -1..1
  const glow = { x: 0, y: 0 };
  let focus = 0; // 0..1, how present the pointer is (fades in/out)
  const surge = { x: 0, age: Infinity }; // click ripple

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    buf.width = Math.ceil(w / RES);
    buf.height = Math.ceil(h / RES);
    forest = createForest(w, h, dpr);
    if (!pointer.active) {
      pointer.x = glow.x = w / 2;
      pointer.y = glow.y = h * 0.3;
    }
  }

  let last = performance.now();
  let t = rand(0, 60000);
  let raf = 0;

  function frame(now: number) {
    const dt = Math.min(50, now - last);
    last = now;
    t += dt;

    // ease camera + cursor glow toward the pointer
    const tx = pointer.active
      ? (pointer.x / w) * 2 - 1
      : tilt.active
        ? tilt.x
        : Math.sin(t / 9000) * 0.25;
    const ty = pointer.active
      ? (pointer.y / h) * 2 - 1
      : tilt.active
        ? tilt.y
        : Math.cos(t / 11000) * 0.2;
    const k = 1 - Math.pow(0.0025, dt / 1000);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    const gk = 1 - Math.pow(0.002, dt / 1000);
    glow.x += (pointer.x - glow.x) * gk;
    glow.y += (pointer.y - glow.y) * gk;
    focus += ((pointer.active ? 1 : 0) - focus) * (1 - Math.pow(0.05, dt / 1000));
    surge.age += dt;

    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  function drawAurora() {
    const bw = buf.width;
    const bh = buf.height;
    bctx.globalCompositeOperation = "source-over";
    bctx.clearRect(0, 0, bw, bh);
    bctx.globalCompositeOperation = "lighter";

    const sigma = w * 0.13;
    const ripR = surge.age * 0.9; // px the surge ring has travelled
    const ripOn = Math.max(0, 1 - surge.age / 2600);

    for (const r of ribbons) {
      const shift = -cam.x * w * r.parallax;
      const lift = -cam.y * h * r.parallax * 0.6;
      for (let bx = -COL; bx < bw + COL; bx += COL) {
        const x = bx * RES - shift; // css px, in ribbon space
        let y =
          h * r.base +
          lift +
          h * r.amp * (Math.sin(x * r.f1 + t * r.s1 + r.phase) +
            0.5 * Math.sin(x * r.f2 - t * r.s2 + r.phase * 2));

        // folds / rays: fine vertical structure that shimmers sideways
        const rays =
          0.55 +
          0.45 *
            Math.sin(x * 0.045 + t * 0.0011 + r.phase) *
            Math.sin(x * 0.013 - t * 0.0006);
        // broad brightness envelope drifting along the ribbon
        const env =
          0.18 +
          0.82 *
            Math.pow(
              0.5 +
                0.5 *
                  Math.sin(x * 0.0021 + t * 0.00012 + r.phase * 3) *
                  Math.cos(x * 0.0009 - t * 0.00007 + r.phase),
              1.6,
            );

        let a = r.alpha * rays * env;
        let hh = h * r.height * (0.75 + 0.25 * Math.sin(x * 0.006 + t * 0.0004 + r.phase));

        // pointer: pull the curtain toward it and light it up
        if (focus > 0.01) {
          const dx = bx * RES - glow.x;
          const g = Math.exp(-(dx * dx) / (2 * sigma * sigma)) * focus;
          y += Math.max(-h * 0.12, Math.min(h * 0.12, (glow.y - y) * 0.35)) * g;
          a *= 1 + 0.9 * g;
          hh *= 1 + 0.25 * g;
        }
        // click: a bright band racing outward from where you clicked
        if (ripOn > 0) {
          const d = Math.abs(bx * RES - surge.x) - ripR;
          a *= 1 + 2.2 * ripOn * Math.exp(-(d * d) / (2 * 90 * 90));
        }

        if (a < 0.01) continue;
        bctx.globalAlpha = Math.min(1, a);
        bctx.drawImage(r.strip, bx, (y - hh) / RES, COL, hh / RES);
      }
    }
    bctx.globalAlpha = 1;
  }

  function draw(dt: number) {
    const c = ctx!;
    c.globalCompositeOperation = "source-over";

    // night sky: deep blue-green overhead, a touch lighter toward the horizon
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#020409");
    sky.addColorStop(0.45, "#041019");
    sky.addColorStop(0.75, "#07182a");
    sky.addColorStop(1, "#030508");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    // faint green airglow low in the sky, under the curtains
    const air = c.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, w * 0.7);
    air.addColorStop(0, "rgba(60,200,160,0.10)");
    air.addColorStop(1, "rgba(60,200,160,0)");
    c.fillStyle = air;
    c.fillRect(0, 0, w, h);

    drawAurora();
    c.globalCompositeOperation = "lighter";
    c.imageSmoothingEnabled = true;
    c.drawImage(buf, 0, 0, w, h);

    // soft light that follows the cursor
    if (focus > 0.01) {
      const r = Math.max(w, h) * 0.3;
      const g = c.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, r);
      g.addColorStop(0, `rgba(120,255,210,${0.07 * focus})`);
      g.addColorStop(1, "rgba(120,255,210,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }

    c.globalCompositeOperation = "source-over";
    forest?.draw(c, t, dt, cam);
  }

  const onMove = (e: PointerEvent) => {
    // touch drags are scrolls, not steering — phones steer by tilt instead
    if (e.pointerType === "touch") return;
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
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    // map to screen axes for the current orientation
    const angle = screen.orientation?.angle ?? 0;
    let x = e.gamma;
    let y = e.beta;
    if (angle === 90) [x, y] = [e.beta, -e.gamma];
    else if (angle === 270 || angle === -90) [x, y] = [-e.beta, e.gamma];

    if (Number.isNaN(tilt.baseX)) {
      tilt.baseX = x;
      tilt.baseY = y;
    }
    tilt.baseX += (x - tilt.baseX) * 0.005;
    tilt.baseY += (y - tilt.baseY) * 0.005;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    tilt.x = clamp((x - tilt.baseX) / 25);
    tilt.y = clamp((y - tilt.baseY) / 25);
    tilt.active = true;
  };
  // iOS only hands out motion data after a permission prompt, which must be
  // triggered from a tap — ask once, on the first touch anywhere.
  type IOSOrientation = typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  const DOE = (window as { DeviceOrientationEvent?: IOSOrientation })
    .DeviceOrientationEvent;
  const needsPermission = typeof DOE?.requestPermission === "function";
  let asked = false;
  const askTilt = () => {
    if (asked || !needsPermission) return;
    asked = true;
    window.removeEventListener("touchend", askTilt);
    DOE!.requestPermission!()
      .then((r) => {
        if (r === "granted") window.addEventListener("deviceorientation", onTilt);
      })
      .catch(() => {});
  };

  const onDown = (e: PointerEvent) => {
    // no surge when the click is on a form control / button / link
    const el = e.target as HTMLElement | null;
    if (el?.closest("input, textarea, select, button, a, label, table")) return;
    surge.x = e.clientX;
    surge.age = 0;
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
  if (needsPermission) {
    window.addEventListener("touchend", askTilt, { passive: true });
  } else if (DOE) {
    window.addEventListener("deviceorientation", onTilt);
  }
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("deviceorientation", onTilt);
    window.removeEventListener("touchend", askTilt);
  };
}
