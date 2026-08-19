"use client";

import { useGameStore } from "../store";

export function DebugHud() {
  const debug = useGameStore((s) => s.debug);
  const show = useGameStore((s) => s.showDebug);
  const paused = useGameStore((s) => s.paused);
  if (!show) return null;

  return (
    <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] leading-4 text-amber-100/90">
      <div className="rounded bg-black/60 px-2 py-1.5 backdrop-blur-sm">
        <div>state {debug.state}</div>
        <div>
          pos {debug.x.toFixed(2)}, {debug.y.toFixed(2)}
        </div>
        <div>
          tile {debug.tileX}, {debug.tileY}
        </div>
        <div>stories {debug.storiesFallen.toFixed(2)}</div>
        <div>facing {debug.facing > 0 ? "R" : "L"}</div>
        <div>ground {debug.grounded ? "yes" : "no"}</div>
        <div>
          in
          {debug.left ? " L" : ""}
          {debug.right ? " R" : ""}
          {debug.up ? " U" : ""}
          {debug.down ? " D" : ""}
          {debug.run ? " RUN" : ""}
          {debug.jump ? " JMP" : ""}
          {debug.jumpPressed ? " EDGE" : ""}
        </div>
        {paused ? <div className="text-amber-400">paused</div> : null}
      </div>
    </div>
  );
}

export function ControlsHint() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 w-[min(720px,92vw)] -translate-x-1/2 text-center font-mono text-[10px] leading-4 text-amber-100/70">
      Arrows / WASD move · Shift run · Space / J jump · Down crouch / air-tuck /
      hang-drop · Up climb · Up+Jump grab ledge above · Edge + Down+Jump climb
      down · R reset · P pause · Esc menu
    </div>
  );
}
