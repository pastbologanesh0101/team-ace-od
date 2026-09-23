"use client";

import { useRef, useState } from "react";
import type { GameInput } from "./drone-game";

const RADIUS = 52; // how far the knob can travel from centre, px
const DEADZONE = 0.12;

/**
 * Analog thumb-stick for touch devices. Writes -1..1 into input.joyX/joyY
 * (push further = fly faster); springs back to centre on release.
 */
export default function Joystick({ input }: { input: GameInput }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false); // ref, not state: moves can land before a re-render
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });

  const move = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    const nx = dx / RADIUS;
    const ny = dy / RADIUS;
    const mag = Math.hypot(nx, ny);
    input.joyX = mag < DEADZONE ? 0 : nx;
    input.joyY = mag < DEADZONE ? 0 : ny;
    setKnob({ x: dx, y: dy, active: true });
  };

  const release = () => {
    dragging.current = false;
    input.joyX = 0;
    input.joyY = 0;
    setKnob({ x: 0, y: 0, active: false });
  };

  return (
    <div
      ref={baseRef}
      className={`joystick${knob.active ? " active" : ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        try {
          // keep tracking the thumb even if it slides off the stick
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        move(e);
      }}
      onPointerMove={(e) => dragging.current && move(e)}
      onPointerUp={release}
      onPointerCancel={release}
      aria-hidden="true"
    >
      <span className="joystick-ring" />
      <span
        className="joystick-knob"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
