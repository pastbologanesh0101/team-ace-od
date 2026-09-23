"use client";

import { useEffect, useRef } from "react";
import { mountSpace } from "./space-scene";

/**
 * Interactive deep-space backdrop (see space-scene.ts): a 3D starfield that
 * steers with the pointer, twinkles, drifts through nebulae and throws the
 * odd shooting star. Plain canvas 2D — no WebGL, no extra dependencies.
 * Hidden in print; renders a single still frame under prefers-reduced-motion.
 */
export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountSpace(canvas);
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="space-bg" />;
}
