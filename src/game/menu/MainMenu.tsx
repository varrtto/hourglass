"use client";

import { useCallback, useEffect, useState } from "react";
import { enterPlayViewport } from "../playViewport";
import { type AppScreen, useGameStore } from "../store";
import { MenuBackdrop } from "./MenuBackdrop";

const ITEMS: { screen: AppScreen; label: string }[] = [
  { screen: "play", label: "Start new game" },
  { screen: "gym", label: "Practice Gym" },
  { screen: "builder", label: "Map Builder" },
  { screen: "scoreboard", label: "Scoreboard" },
  { screen: "config", label: "Config" },
  { screen: "credits", label: "Credits" },
  { screen: "exited", label: "Exit" },
];

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const muted = useGameStore((s) => s.muted);
  const [selected, setSelected] = useState(0);

  const activate = useCallback(
    (index: number) => {
      const item = ITEMS[index];
      if (!item) return;
      if (item.screen === "play" || item.screen === "gym") {
        useGameStore.getState().setPlaytestFromBuilder(false);
        void enterPlayViewport();
      }
      setScreen(item.screen);
      if (item.screen === "exited") {
        window.close();
      }
    },
    [setScreen],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSelected((i) => (i + 1) % ITEMS.length);
      } else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        setSelected((i) => (i - 1 + ITEMS.length) % ITEMS.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activate, selected]);

  return (
    <MenuBackdrop>
      <div className="flex h-full flex-col justify-center px-8 sm:px-16 lg:px-24">
        <p className="font-display text-[11px] tracking-[0.45em] text-amber-200/70 uppercase">
          A kinematic palace
        </p>
        <h1 className="font-display mt-2 text-5xl font-semibold tracking-[0.18em] text-amber-50 sm:text-7xl">
          HOURGLASS
        </h1>
        <div className="mt-4 h-px w-48 bg-gradient-to-r from-amber-200/80 to-transparent" />

        <nav className="mt-12 flex max-w-md flex-col gap-1" aria-label="Main menu">
          {ITEMS.map((item, index) => {
            const active = index === selected;
            return (
              <button
                key={item.screen}
                type="button"
                onMouseEnter={() => setSelected(index)}
                onClick={() => activate(index)}
                className={`flex items-center gap-3 py-2.5 text-left transition ${
                  active
                    ? "text-amber-50"
                    : "text-amber-100/65 hover:text-amber-50"
                }`}
              >
                <span
                  aria-hidden
                  className={`font-display w-5 text-lg text-amber-400 transition ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                >
                  ▸
                </span>
                <span className="font-display text-xl tracking-wide sm:text-2xl">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <p className="font-mono mt-16 text-[11px] tracking-wide text-amber-100/45">
          Arrows / WASD select · Enter confirm · M {muted ? "unmute" : "mute"}
        </p>
      </div>
    </MenuBackdrop>
  );
}

export function ExitScreen() {
  const setScreen = useGameStore((s) => s.setScreen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        setScreen("menu");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  return (
    <MenuBackdrop dim>
      <div className="flex h-full flex-col items-start justify-center px-8 sm:px-16 lg:px-24">
        <h1 className="font-display text-4xl tracking-[0.2em] text-amber-50/90 sm:text-5xl">
          The hourglass stills
        </h1>
        <p className="mt-4 max-w-md font-mono text-sm text-amber-100/60">
          The sands rest. Return when you are ready to run the palace again.
        </p>
        <button
          type="button"
          onClick={() => setScreen("menu")}
          className="font-display mt-10 text-lg tracking-wide text-amber-200/80 transition hover:text-amber-50"
        >
          ▸ Return to menu
        </button>
      </div>
    </MenuBackdrop>
  );
}
