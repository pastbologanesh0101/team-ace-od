"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { mountSky, type Sky } from "./sky-scene";

/**
 * Interactive night backdrop (see sky-scene.ts + forest.ts): aurora curtains
 * that bend toward the pointer over a parallax pine forest, with a rover and
 * patrolling drones. Plain canvas 2D — no WebGL, no extra dependencies.
 * Hidden in print; renders a single still frame under prefers-reduced-motion.
 *
 * The sign-in page gets the full show; working pages (dashboard, admin) get
 * a calm version — dimmed, no HUD — so it doesn't pull focus from the data.
 */
export default function SkyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<Sky | null>(null);
  const calm = usePathname() !== "/";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sky = mountSky(canvas, { calm });
    skyRef.current = sky;
    return () => {
      sky.dispose();
      skyRef.current = null;
    };
    // mount once; route changes go through setOptions below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    skyRef.current?.setOptions({ calm });
  }, [calm]);

  return <canvas ref={canvasRef} aria-hidden="true" className="sky-bg" />;
}
