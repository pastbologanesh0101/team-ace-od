"use client";

import { useEffect, useRef } from "react";
import { mountSky } from "./sky-scene";

/**
 * Interactive night backdrop (see sky-scene.ts + forest.ts): aurora curtains
 * that bend toward the pointer over a parallax pine forest, with a rover and
 * patrolling drones. Plain canvas 2D — no WebGL, no extra dependencies.
 * Hidden in print; renders a single still frame under prefers-reduced-motion.
 */
export default function SkyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountSky(canvas);
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="sky-bg" />;
}
