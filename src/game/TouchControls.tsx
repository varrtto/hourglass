"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { InputController } from "./input";
import { useGameStore } from "./store";

type Dir = "left" | "right" | "up" | "down";
type Control = "dpad" | "jump" | "run" | "fire" | "pause" | "reset" | "menu";

const EMPTY_DIRS = {
  left: false,
  right: false,
  up: false,
  down: false,
};

export function TouchControls({
  input,
  rotated,
}: {
  input: InputController;
  rotated: boolean;
}) {
  const setScreen = useGameStore((s) => s.setScreen);
  const paused = useGameStore((s) => s.paused);
  const playtest = useGameStore((s) => s.playtestFromBuilder);
  const rootRef = useRef<HTMLDivElement>(null);
  const dpadRef = useRef<HTMLDivElement>(null);
  const bindsRef = useRef(new Map<number, Control>());
  const rotatedRef = useRef(rotated);

  const [dirs, setDirs] = useState(EMPTY_DIRS);
  const [jumpHeld, setJumpHeld] = useState(false);
  const [runHeld, setRunHeld] = useState(false);
  const [fireHeld, setFireHeld] = useState(false);

  useEffect(() => {
    rotatedRef.current = rotated;
  }, [rotated]);

  const leave = useCallback(() => {
    input.clearTouch();
    if (playtest) {
      useGameStore.getState().setScreen("builder");
      return;
    }
    setScreen("menu");
  }, [input, playtest, setScreen]);

  const applyDpad = useCallback(
    (clientX: number, clientY: number) => {
      const el = dpadRef.current;
      if (!el) return EMPTY_DIRS;
      const r = el.getBoundingClientRect();
      let dx = clientX - (r.left + r.width / 2);
      let dy = clientY - (r.top + r.height / 2);
      // Parent uses CSS rotate-90 for portrait phones; map screen deltas
      // back into the control's local axes so ▲ still means up.
      if (rotatedRef.current) {
        const localX = dy;
        const localY = -dx;
        dx = localX;
        dy = localY;
      }
      const dead = Math.min(r.width, r.height) * 0.16;
      const next = {
        left: dx < -dead,
        right: dx > dead,
        up: dy < -dead,
        down: dy > dead,
      };
      input.setTouch("left", next.left);
      input.setTouch("right", next.right);
      input.setTouch("up", next.up);
      input.setTouch("down", next.down);
      setDirs(next);
      return next;
    },
    [input],
  );

  const clearDpad = useCallback(() => {
    input.setTouch("left", false);
    input.setTouch("right", false);
    input.setTouch("up", false);
    input.setTouch("down", false);
    setDirs(EMPTY_DIRS);
  }, [input]);

  const syncHolds = useCallback(() => {
    let jump = false;
    let run = false;
    let fire = false;
    let dpad = false;
    for (const kind of bindsRef.current.values()) {
      if (kind === "jump") jump = true;
      if (kind === "run") run = true;
      if (kind === "fire") fire = true;
      if (kind === "dpad") dpad = true;
    }
    input.setTouch("jump", jump);
    input.setTouch("run", run);
    input.setTouch("use", fire);
    setJumpHeld(jump);
    setRunHeld(run);
    setFireHeld(fire);
    if (!dpad) clearDpad();
  }, [clearDpad, input]);

  useEffect(() => {
    const binds = bindsRef.current;

    const controlFromPoint = (x: number, y: number): Control | null => {
      const root = rootRef.current;
      if (!root) return null;
      for (const el of document.elementsFromPoint(x, y)) {
        if (!(el instanceof Element) || !root.contains(el)) continue;
        const hit = el.closest("[data-touch]");
        if (hit instanceof HTMLElement && root.contains(hit)) {
          return (hit.dataset.touch as Control | undefined) ?? null;
        }
      }
      return null;
    };

    const pressMeta = (kind: Control) => {
      if (kind === "pause") {
        useGameStore.getState().setPaused(!useGameStore.getState().paused);
      } else if (kind === "reset") {
        input.pressReset();
      } else if (kind === "menu") {
        leave();
      }
    };

    const downAt = (id: number, x: number, y: number) => {
      if (binds.has(id)) return false;
      const kind = controlFromPoint(x, y);
      if (!kind) return false;
      binds.set(id, kind);
      if (kind === "dpad") {
        applyDpad(x, y);
      } else if (kind === "jump") {
        input.setTouch("jump", true);
        setJumpHeld(true);
      } else if (kind === "run") {
        input.setTouch("run", true);
        setRunHeld(true);
      } else if (kind === "fire") {
        input.setTouch("use", true);
        setFireHeld(true);
      } else {
        pressMeta(kind);
      }
      return true;
    };

    const moveAt = (id: number, x: number, y: number) => {
      if (binds.get(id) !== "dpad") return;
      applyDpad(x, y);
    };

    const upAt = (id: number) => {
      if (!binds.delete(id)) return;
      syncHolds();
    };

    const onTouchStart = (e: TouchEvent) => {
      let ours = false;
      for (const t of e.changedTouches) {
        if (downAt(t.identifier, t.clientX, t.clientY)) ours = true;
      }
      if (ours) e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (binds.size === 0) return;
      let ours = false;
      for (const t of e.changedTouches) {
        if (!binds.has(t.identifier)) continue;
        ours = true;
        moveAt(t.identifier, t.clientX, t.clientY);
      }
      if (ours) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      let ours = false;
      for (const t of e.changedTouches) {
        if (!binds.has(t.identifier)) continue;
        ours = true;
        upAt(t.identifier);
      }
      if (ours) e.preventDefault();
    };

    // Mouse / pen only — Android Chrome also emits pointer events for touches;
    // handling both would double-fire and drop holds.
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (downAt(e.pointerId, e.clientX, e.clientY)) e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!binds.has(e.pointerId)) return;
      moveAt(e.pointerId, e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (binds.has(e.pointerId)) {
        e.preventDefault();
        upAt(e.pointerId);
      }
    };

    const opts: AddEventListenerOptions = { capture: true, passive: false };
    window.addEventListener("touchstart", onTouchStart, opts);
    window.addEventListener("touchmove", onTouchMove, opts);
    window.addEventListener("touchend", onTouchEnd, opts);
    window.addEventListener("touchcancel", onTouchEnd, opts);
    window.addEventListener("pointerdown", onPointerDown, opts);
    window.addEventListener("pointermove", onPointerMove, opts);
    window.addEventListener("pointerup", onPointerUp, opts);
    window.addEventListener("pointercancel", onPointerUp, opts);
    return () => {
      window.removeEventListener("touchstart", onTouchStart, opts);
      window.removeEventListener("touchmove", onTouchMove, opts);
      window.removeEventListener("touchend", onTouchEnd, opts);
      window.removeEventListener("touchcancel", onTouchEnd, opts);
      window.removeEventListener("pointerdown", onPointerDown, opts);
      window.removeEventListener("pointermove", onPointerMove, opts);
      window.removeEventListener("pointerup", onPointerUp, opts);
      window.removeEventListener("pointercancel", onPointerUp, opts);
      binds.clear();
      input.clearTouch();
    };
  }, [applyDpad, input, leave, syncHolds]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-20 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="pointer-events-auto absolute top-3 right-3 flex gap-2"
        style={{
          marginTop: "env(safe-area-inset-top)",
          marginRight: "env(safe-area-inset-right)",
        }}
      >
        <MetaButton touch="pause" label={paused ? "Resume" : "Pause"} />
        <MetaButton touch="reset" label="Reset" />
        <MetaButton touch="menu" label={playtest ? "Editor" : "Menu"} />
      </div>

      <div
        className="pointer-events-auto absolute bottom-3 left-3"
        style={{
          marginBottom: "env(safe-area-inset-bottom)",
          marginLeft: "env(safe-area-inset-left)",
        }}
      >
        <div
          ref={dpadRef}
          data-touch="dpad"
          role="group"
          aria-label="Move"
          className="relative size-40 touch-none"
        >
          <PadFace dir="up" className="top-0 left-1/2 -translate-x-1/2" lit={dirs.up}>
            ▲
          </PadFace>
          <PadFace
            dir="down"
            className="bottom-0 left-1/2 -translate-x-1/2"
            lit={dirs.down}
          >
            ▼
          </PadFace>
          <PadFace dir="left" className="top-1/2 left-0 -translate-y-1/2" lit={dirs.left}>
            ◀
          </PadFace>
          <PadFace
            dir="right"
            className="top-1/2 right-0 -translate-y-1/2"
            lit={dirs.right}
          >
            ▶
          </PadFace>
        </div>
      </div>

      <div
        className="pointer-events-auto absolute right-3 bottom-3 flex items-end gap-3"
        style={{
          marginBottom: "env(safe-area-inset-bottom)",
          marginRight: "env(safe-area-inset-right)",
        }}
      >
        <ActionButton
          touch="fire"
          label="Fire"
          lit={fireHeld}
          className="size-14"
        />
        <ActionButton touch="run" label="Run" lit={runHeld} className="size-16" />
        <ActionButton
          touch="jump"
          label="Jump"
          lit={jumpHeld}
          className="size-[4.75rem]"
        />
      </div>
    </div>
  );
}

function PadFace({
  dir,
  className,
  children,
  lit,
}: {
  dir: Dir;
  className: string;
  children: ReactNode;
  lit: boolean;
}) {
  return (
    <div
      aria-hidden
      data-dir={dir}
      className={`pointer-events-none absolute flex size-12 items-center justify-center rounded-md border font-mono text-sm backdrop-blur-sm ${
        lit
          ? "border-amber-200/80 bg-amber-200/25 text-amber-50"
          : "border-amber-200/30 bg-black/55 text-amber-100/80"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function ActionButton({
  touch,
  label,
  lit,
  className,
}: {
  touch: Control;
  label: string;
  lit: boolean;
  className: string;
}) {
  return (
    <button
      type="button"
      data-touch={touch}
      tabIndex={-1}
      aria-label={label}
      aria-pressed={lit}
      className={`touch-none rounded-full border font-display text-[11px] tracking-[0.18em] text-amber-50 uppercase shadow-[0_0_16px_rgba(0,0,0,0.45)] backdrop-blur-sm ${
        lit
          ? "border-amber-200/80 bg-amber-200/25"
          : "border-amber-200/40 bg-black/60"
      } ${className}`}
    >
      {label}
    </button>
  );
}

function MetaButton({ touch, label }: { touch: Control; label: string }) {
  return (
    <button
      type="button"
      data-touch={touch}
      tabIndex={-1}
      className="touch-none rounded-sm border border-amber-200/30 bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-wide text-amber-100/85 backdrop-blur-sm"
    >
      {label}
    </button>
  );
}
