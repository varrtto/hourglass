"use client";

import { useCallback, useEffect, useState } from "react";
import { useGameStore } from "../store";
import { MenuBackdrop } from "./MenuBackdrop";

const ITEMS = ["volume", "mute", "back"] as const;
type ConfigItem = (typeof ITEMS)[number];

export function Config() {
  const setScreen = useGameStore((s) => s.setScreen);
  const muted = useGameStore((s) => s.muted);
  const setMuted = useGameStore((s) => s.setMuted);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const percent = Math.round(musicVolume * 100);
  const [selected, setSelected] = useState(0);

  const activate = useCallback(
    (index: number) => {
      const item: ConfigItem | undefined = ITEMS[index];
      if (item === "mute") {
        useGameStore.getState().setMuted(!useGameStore.getState().muted);
      } else if (item === "back") {
        setScreen("menu");
      }
    },
    [setScreen],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        setScreen("menu");
        return;
      }
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSelected((i) => (i + 1) % ITEMS.length);
        return;
      }
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        setSelected((i) => (i - 1 + ITEMS.length) % ITEMS.length);
        return;
      }
      const item = ITEMS[selected];
      if (item === "volume" && (e.key === "ArrowLeft" || e.key.toLowerCase() === "a")) {
        e.preventDefault();
        const vol = useGameStore.getState().musicVolume;
        useGameStore.getState().setMusicVolume(vol - 0.05);
        return;
      }
      if (item === "volume" && (e.key === "ArrowRight" || e.key.toLowerCase() === "d")) {
        e.preventDefault();
        const vol = useGameStore.getState().musicVolume;
        useGameStore.getState().setMusicVolume(vol + 0.05);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activate, selected, setScreen]);

  return (
    <MenuBackdrop>
      <div className="flex h-full flex-col justify-center px-8 sm:px-16 lg:px-24">
        <p className="font-display text-[11px] tracking-[0.45em] text-amber-200/70 uppercase">
          The hourglass turns
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-[0.18em] text-amber-50 sm:text-6xl">
          CONFIG
        </h1>
        <div className="mt-4 h-px w-48 bg-gradient-to-r from-amber-200/80 to-transparent" />

        <nav className="mt-12 flex max-w-md flex-col gap-1" aria-label="Config">
          <div
            onMouseEnter={() => setSelected(0)}
            className={`flex flex-col gap-3 py-2.5 text-left transition ${
              selected === 0 ? "text-amber-50" : "text-amber-100/65"
            }`}
          >
            <span className="flex items-center gap-3">
              <Marker active={selected === 0} />
              <span className="font-display text-xl tracking-wide">
                Music volume
                <span className="font-mono ml-3 text-sm text-amber-200/70">
                  {percent}%
                </span>
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={percent}
              tabIndex={-1}
              onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
              onPointerDown={() => setSelected(0)}
              className="ml-8 h-2 w-full cursor-pointer appearance-none rounded-full bg-amber-950 accent-amber-300"
            />
          </div>

          <button
            type="button"
            onMouseEnter={() => setSelected(1)}
            onClick={() => setMuted(!muted)}
            className={`flex items-center gap-3 py-2.5 text-left transition ${
              selected === 1
                ? "text-amber-50"
                : "text-amber-100/65 hover:text-amber-50"
            }`}
          >
            <Marker active={selected === 1} />
            <span className="font-display text-xl tracking-wide">
              Music {muted ? "muted" : "on"}
            </span>
          </button>

          <button
            type="button"
            onMouseEnter={() => setSelected(2)}
            onClick={() => setScreen("menu")}
            className={`flex items-center gap-3 py-2.5 text-left transition ${
              selected === 2
                ? "text-amber-50"
                : "text-amber-100/65 hover:text-amber-50"
            }`}
          >
            <Marker active={selected === 2} />
            <span className="font-display text-xl tracking-wide">Back</span>
          </button>
        </nav>

        <p className="font-mono mt-16 text-[11px] tracking-wide text-amber-100/45">
          Arrows / WASD select · Left / Right volume · Enter confirm · Esc return
        </p>
      </div>
    </MenuBackdrop>
  );
}

function Marker({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`font-display w-5 text-lg text-amber-400 transition ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      ▸
    </span>
  );
}
