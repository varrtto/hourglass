"use client";

import { useEffect } from "react";
import { useGameStore } from "../store";
import { MenuBackdrop } from "./MenuBackdrop";

export function Config() {
  const setScreen = useGameStore((s) => s.setScreen);
  const muted = useGameStore((s) => s.muted);
  const setMuted = useGameStore((s) => s.setMuted);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const percent = Math.round(musicVolume * 100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === "Backspace") {
        e.preventDefault();
        setScreen("menu");
        return;
      }
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        e.preventDefault();
        const vol = useGameStore.getState().musicVolume;
        useGameStore.getState().setMusicVolume(vol - 0.05);
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        e.preventDefault();
        const vol = useGameStore.getState().musicVolume;
        useGameStore.getState().setMusicVolume(vol + 0.05);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

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

        <div className="mt-12 flex max-w-md flex-col gap-8">
          <label className="flex flex-col gap-3">
            <span className="font-display text-xl tracking-wide text-amber-50">
              Music volume
              <span className="font-mono ml-3 text-sm text-amber-200/70">
                {percent}%
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={percent}
              onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-amber-950 accent-amber-300"
            />
          </label>

          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="font-display w-fit text-left text-xl tracking-wide text-amber-100/80 transition hover:text-amber-50"
          >
            ▸ Music {muted ? "muted" : "on"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setScreen("menu")}
          className="font-display mt-12 w-fit text-lg tracking-wide text-amber-200/80 transition hover:text-amber-50"
        >
          ▸ Back
        </button>
        <p className="font-mono mt-6 text-[11px] tracking-wide text-amber-100/45">
          Left / Right volume · M mute · Esc return
        </p>
      </div>
    </MenuBackdrop>
  );
}
