"use client";

import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { InputController } from "./input";
import { useGameStore } from "./store";

type Dir = "left" | "right" | "up" | "down";

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

  const leave = useCallback(() => {
    input.clearTouch();
    if (playtest) {
      useGameStore.getState().setScreen("builder");
      return;
    }
    setScreen("menu");
  }, [input, playtest, setScreen]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <div
        className="pointer-events-auto absolute top-3 right-3 flex gap-2"
        style={{
          marginTop: "env(safe-area-inset-top)",
          marginRight: "env(safe-area-inset-right)",
        }}
      >
        <MetaButton
          label={paused ? "Resume" : "Pause"}
          onPress={() =>
            useGameStore.getState().setPaused(!useGameStore.getState().paused)
          }
        />
        <MetaButton label="Reset" onPress={() => input.pressReset()} />
        <MetaButton label={playtest ? "Editor" : "Menu"} onPress={leave} />
      </div>

      <div
        className="pointer-events-auto absolute bottom-3 left-3"
        style={{
          marginBottom: "env(safe-area-inset-bottom)",
          marginLeft: "env(safe-area-inset-left)",
        }}
      >
        <DPad input={input} rotated={rotated} />
      </div>

      <div
        className="pointer-events-auto absolute right-3 bottom-3 flex items-end gap-3"
        style={{
          marginBottom: "env(safe-area-inset-bottom)",
          marginRight: "env(safe-area-inset-right)",
        }}
      >
        <HoldButton
          label="Run"
          className="size-16"
          onHold={(down) => input.setTouch("run", down)}
        />
        <HoldButton
          label="Jump"
          className="size-[4.75rem]"
          onHold={(down) => input.setTouch("jump", down)}
        />
      </div>
    </div>
  );
}

function DPad({
  input,
  rotated,
}: {
  input: InputController;
  rotated: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const held = useRef(new Set<number>());
  const [active, setActive] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const clearDirs = useCallback(() => {
    input.setTouch("left", false);
    input.setTouch("right", false);
    input.setTouch("up", false);
    input.setTouch("down", false);
    setActive({ left: false, right: false, up: false, down: false });
  }, [input]);

  const apply = useCallback(
    (clientX: number, clientY: number) => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let dx = clientX - (r.left + r.width / 2);
      let dy = clientY - (r.top + r.height / 2);
      if (rotated) {
        const lx = dy;
        const ly = -dx;
        dx = lx;
        dy = ly;
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
      setActive(next);
    },
    [input, rotated],
  );

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    held.current.add(e.pointerId);
    e.currentTarget.setPointerCapture(e.pointerId);
    apply(e.clientX, e.clientY);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!held.current.has(e.pointerId)) return;
    apply(e.clientX, e.clientY);
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    held.current.delete(e.pointerId);
    if (held.current.size === 0) clearDirs();
  };

  return (
    <div
      ref={root}
      role="group"
      aria-label="Move"
      className="relative size-36 touch-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <PadFace dir="up" className="top-0 left-1/2 -translate-x-1/2" lit={active.up}>
        ▲
      </PadFace>
      <PadFace dir="down" className="bottom-0 left-1/2 -translate-x-1/2" lit={active.down}>
        ▼
      </PadFace>
      <PadFace dir="left" className="top-1/2 left-0 -translate-y-1/2" lit={active.left}>
        ◀
      </PadFace>
      <PadFace dir="right" className="top-1/2 right-0 -translate-y-1/2" lit={active.right}>
        ▶
      </PadFace>
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

function HoldButton({
  label,
  onHold,
  className,
}: {
  label: string;
  onHold: (down: boolean) => void;
  className: string;
}) {
  const pointers = useRef(new Set<number>());

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pointers.current.add(e.pointerId);
    e.currentTarget.setPointerCapture(e.pointerId);
    onHold(true);
  };

  const up = (e: PointerEvent<HTMLButtonElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) onHold(false);
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={`touch-none rounded-full border border-amber-200/40 bg-black/60 font-display text-[11px] tracking-[0.18em] text-amber-50 uppercase shadow-[0_0_16px_rgba(0,0,0,0.45)] backdrop-blur-sm active:border-amber-200/80 active:bg-amber-200/25 ${className}`}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

function MetaButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      className="touch-none rounded-sm border border-amber-200/30 bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-wide text-amber-100/85 backdrop-blur-sm active:border-amber-200/70 active:bg-amber-200/20"
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
